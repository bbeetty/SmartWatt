import { useState } from 'react'
import {
  Button, Table, Space, Popconfirm, Typography, Modal,
  Form, DatePicker, InputNumber, Select, message, Tag,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { usageApi } from '../api/usage'
import { appliancesApi } from '../api/appliances'
import type { DailyUsage, UsagePayload } from '../api/usage'

const { Title } = Typography
const { RangePicker } = DatePicker

interface FormValues {
  usage_date: Dayjs
  appliance_id?: number | null
  hours?: number | null
  kwh: number
}

export default function DailyUsagePage() {
  const qc = useQueryClient()
  const [msgApi, ctxHolder] = message.useMessage()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DailyUsage | null>(null)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [form] = Form.useForm<FormValues>()

  const queryParams = dateRange
    ? { from: dateRange[0].format('YYYY-MM-DD'), to: dateRange[1].format('YYYY-MM-DD') }
    : undefined

  const { data = [], isLoading } = useQuery({
    queryKey: ['usage', queryParams],
    queryFn: () => usageApi.list(queryParams),
  })

  const { data: appliances = [] } = useQuery({
    queryKey: ['appliances'],
    queryFn: appliancesApi.list,
  })

  const createMut = useMutation({
    mutationFn: usageApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usage'] }); closeModal() },
    onError: (e: Error) => msgApi.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UsagePayload> }) =>
      usageApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usage'] }); closeModal() },
    onError: (e: Error) => msgApi.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: usageApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usage'] }),
    onError: (e: Error) => msgApi.error(e.message),
  })

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  function openEdit(u: DailyUsage) {
    setEditing(u)
    form.setFieldsValue({
      usage_date: dayjs(u.usage_date),
      appliance_id: u.appliance_id ?? null,
      hours: u.hours != null ? Number(u.hours) : null,
      kwh: Number(u.kwh),
    })
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
    form.resetFields()
  }

  // 選家電 + 輸入時數時自動帶出 kwh 預設值
  function handleHoursOrApplianceChange() {
    const applianceId = form.getFieldValue('appliance_id')
    const hours = form.getFieldValue('hours')
    if (applianceId && hours != null) {
      const appliance = appliances.find((a) => a.id === applianceId)
      if (appliance) {
        const estimated = Math.round((appliance.watt * hours / 1000) * 1000) / 1000
        form.setFieldValue('kwh', estimated)
      }
    }
  }

  async function handleSubmit() {
    const values = await form.validateFields()
    const payload: UsagePayload = {
      usage_date: values.usage_date.format('YYYY-MM-DD'),
      appliance_id: values.appliance_id ?? null,
      hours: values.hours ?? null,
      kwh: values.kwh,
    }
    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const columns = [
    {
      title: '日期',
      dataIndex: 'usage_date',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '家電',
      key: 'appliance',
      render: (_: unknown, r: DailyUsage) =>
        r.appliance_name
          ? <Tag color="blue">{r.appliance_name}</Tag>
          : <Tag color="default">整戶總量</Tag>,
    },
    {
      title: '使用時數',
      dataIndex: 'hours',
      render: (v: string | null) => v != null ? `${Number(v)} 小時` : '—',
      align: 'right' as const,
    },
    {
      title: '用電量 (kWh)',
      dataIndex: 'kwh',
      render: (v: string) => Number(v).toFixed(3),
      align: 'right' as const,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, r: DailyUsage) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title="確定刪除此筆紀錄？"
            onConfirm={() => deleteMut.mutate(r.id)}
            okText="刪除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <>
      {ctxHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>每日用電紀錄</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增紀錄
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <RangePicker
          format="YYYY-MM-DD"
          placeholder={['開始日期', '結束日期']}
          onChange={(val) => setDateRange(val as [Dayjs, Dayjs] | null)}
        />
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 15 }}
      />

      <Modal
        title={editing ? '編輯用電紀錄' : '新增用電紀錄'}
        open={open}
        onOk={handleSubmit}
        onCancel={closeModal}
        okText={editing ? '儲存' : '新增'}
        cancelText="取消"
        confirmLoading={isSaving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="usage_date"
            label="日期"
            rules={[{ required: true, message: '請選擇日期' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="appliance_id" label="家電（留空表示整戶總量）">
            <Select
              allowClear
              placeholder="整戶總量"
              onChange={handleHoursOrApplianceChange}
              options={appliances.map((a) => ({
                value: a.id,
                label: `${a.name}（${a.watt} W）`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="hours"
            label="使用時數（選填，填入後自動計算 kWh）"
            rules={[{ type: 'number', min: 0, max: 24, message: '時數須介於 0–24' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={24}
              step={0.5}
              addonAfter="小時"
              onChange={handleHoursOrApplianceChange}
            />
          </Form.Item>

          <Form.Item
            name="kwh"
            label="用電量"
            rules={[
              { required: true, message: '請輸入用電量' },
              { type: 'number', min: 0, message: '用電量不能為負數' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={0.001} precision={3} addonAfter="kWh" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
