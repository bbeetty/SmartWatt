import { useState } from 'react'
import {
  Button, Table, Space, Popconfirm, Typography, Modal,
  Form, Input, InputNumber, Select, Tag, message,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appliancesApi, CATEGORIES } from '../api/appliances'
import type { Appliance, AppliancePayload } from '../api/appliances'

const { Title } = Typography

const CATEGORY_COLORS: Record<string, string> = {
  '冷氣': 'blue', '冰箱': 'cyan', '洗衣機': 'geekblue',
  '熱水器': 'volcano', '照明': 'gold', '電視': 'purple',
  '電腦': 'green', '其他': 'default',
}

export default function Appliances() {
  const qc = useQueryClient()
  const [msgApi, ctxHolder] = message.useMessage()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Appliance | null>(null)
  const [form] = Form.useForm<AppliancePayload>()

  const { data = [], isLoading } = useQuery({
    queryKey: ['appliances'],
    queryFn: appliancesApi.list,
  })

  const createMut = useMutation({
    mutationFn: appliancesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appliances'] }); closeModal() },
    onError: (e: Error) => msgApi.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AppliancePayload> }) =>
      appliancesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appliances'] }); closeModal() },
    onError: (e: Error) => msgApi.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: appliancesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appliances'] }),
    onError: (e: Error) => msgApi.error(e.message),
  })

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  function openEdit(a: Appliance) {
    setEditing(a)
    form.setFieldsValue({
      name: a.name,
      category: a.category ?? undefined,
      watt: a.watt,
      location: a.location ?? undefined,
    })
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
    form.resetFields()
  }

  async function handleSubmit() {
    const values = await form.validateFields()
    if (editing) {
      updateMut.mutate({ id: editing.id, data: values })
    } else {
      createMut.mutate(values)
    }
  }

  const columns = [
    {
      title: '名稱',
      dataIndex: 'name',
    },
    {
      title: '類別',
      dataIndex: 'category',
      render: (v: string | null) =>
        v ? <Tag color={CATEGORY_COLORS[v] ?? 'default'}>{v}</Tag> : '—',
    },
    {
      title: '額定功率',
      dataIndex: 'watt',
      render: (v: number) => `${v} W`,
      align: 'right' as const,
    },
    {
      title: '放置位置',
      dataIndex: 'location',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, r: Appliance) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title="確定刪除此家電？刪除後相關用電紀錄也會一併刪除。"
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
        <Title level={4} style={{ margin: 0 }}>家電管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增家電
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editing ? '編輯家電' : '新增家電'}
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
            name="name"
            label="名稱"
            rules={[{ required: true, message: '請輸入家電名稱' }]}
          >
            <Input maxLength={80} />
          </Form.Item>

          <Form.Item name="category" label="類別">
            <Select allowClear placeholder="請選擇類別">
              {CATEGORIES.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="watt"
            label="額定功率"
            rules={[
              { required: true, message: '請輸入功率' },
              { type: 'number', min: 1, message: '功率必須大於 0' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={1} addonAfter="W" />
          </Form.Item>

          <Form.Item name="location" label="放置位置">
            <Input maxLength={40} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
