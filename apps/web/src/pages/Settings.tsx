import { useEffect } from 'react'
import {
  Card, Col, Row, Typography, Form, InputNumber, Button, Table, message, Divider,
} from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, RATE_TABLE } from '../api/settings'

const { Title, Text } = Typography

const tierColumns = [
  { title: '用電區間', dataIndex: 'range' },
  {
    title: '費率 (NT$/度)',
    dataIndex: 'rate',
    align: 'right' as const,
    render: (v: number) => v.toFixed(2),
  },
]

export default function Settings() {
  const qc = useQueryClient()
  const [msgApi, ctxHolder] = message.useMessage()
  const [form] = Form.useForm<{ kg_per_kwh: number }>()

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  useEffect(() => {
    if (data) {
      form.setFieldsValue({ kg_per_kwh: data.co2_factor.kg_per_kwh })
    }
  }, [data, form])

  const updateMut = useMutation({
    mutationFn: (kg_per_kwh: number) =>
      settingsApi.update({ co2_factor: { kg_per_kwh } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      msgApi.success('設定已儲存')
    },
    onError: (e: Error) => msgApi.error(e.message),
  })

  async function handleSave() {
    const { kg_per_kwh } = await form.validateFields()
    updateMut.mutate(kg_per_kwh)
  }

  return (
    <>
      {ctxHolder}
      <Title level={4}>設定</Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title="CO₂ 排放係數">
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              預設值為台電 2023 年公告值。調整後將影響 Dashboard 碳排計算。
            </Text>
            <Form form={form} layout="vertical">
              <Form.Item
                name="kg_per_kwh"
                label="每度電碳排量"
                rules={[
                  { required: true, message: '請輸入係數' },
                  { type: 'number', min: 0.001, max: 2, message: '係數須介於 0.001–2' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  step={0.001}
                  precision={3}
                  addonAfter="kg CO₂e / kWh"
                />
              </Form.Item>
              <Button
                type="primary"
                onClick={handleSave}
                loading={updateMut.isPending}
              >
                儲存
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="台電住宅累進費率（2025，僅供參考）">
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              費率由後端 <Text code>services/pricing.ts</Text> 定義，如需更新請修改程式碼。
            </Text>
            <Divider>{RATE_TABLE.summer.label}</Divider>
            <Table
              size="small"
              rowKey="range"
              dataSource={RATE_TABLE.summer.tiers}
              columns={tierColumns}
              pagination={false}
            />
            <Divider style={{ marginTop: 16 }}>{RATE_TABLE.nonSummer.label}</Divider>
            <Table
              size="small"
              rowKey="range"
              dataSource={RATE_TABLE.nonSummer.tiers}
              columns={tierColumns}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}
