import { useState } from 'react'
import {
  Button, Table, Space, Popconfirm, Typography, Modal,
  Form, DatePicker, InputNumber, Input, message, Tag,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { billsApi } from '../api/bills'
import type { Bill, BillPayload } from '../api/bills'

const { Title } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

interface FormValues {
  period: [Dayjs, Dayjs]
  meter_start: number
  meter_end: number
  amount_twd: number
  note?: string
}

export default function Bills() {
  const qc = useQueryClient()
  const [msgApi, ctxHolder] = message.useMessage()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [form] = Form.useForm<FormValues>()

  const { data = [], isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => billsApi.list(),
  })

  const createMut = useMutation({
    mutationFn: billsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); closeModal() },
    onError: (e: Error) => msgApi.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BillPayload> }) =>
      billsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); closeModal() },
    onError: (e: Error) => msgApi.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: billsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
    onError: (e: Error) => msgApi.error(e.message),
  })

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  function openEdit(bill: Bill) {
    setEditing(bill)
    form.setFieldsValue({
      period: [dayjs(bill.period_start), dayjs(bill.period_end)],
      meter_start: bill.meter_start,
      meter_end: bill.meter_end,
      amount_twd: Number(bill.amount_twd),
      note: bill.note ?? undefined,
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
    const payload: BillPayload = {
      period_start: values.period[0].format('YYYY-MM-DD'),
      period_end: values.period[1].format('YYYY-MM-DD'),
      meter_start: values.meter_start,
      meter_end: values.meter_end,
      amount_twd: values.amount_twd,
      note: values.note,
    }
    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const isSummer = (start: string) => {
    const m = dayjs(start).month() + 1
    return m >= 6 && m <= 9
  }

  const columns = [
    {
      title: '計費期間',
      key: 'period',
      render: (_: unknown, r: Bill) => (
        <Space>
          <span>{dayjs(r.period_start).format('YYYY-MM-DD')} ~ {dayjs(r.period_end).format('YYYY-MM-DD')}</span>
          {isSummer(r.period_start) && <Tag color="orange">夏月</Tag>}
        </Space>
      ),
    },
    {
      title: '電表讀數',
      key: 'meter',
      render: (_: unknown, r: Bill) =>
        `${r.meter_start} → ${r.meter_end}`,
    },
    {
      title: '用電度數',
      dataIndex: 'kwh_used',
      render: (v: number) => `${v} kWh`,
      align: 'right' as const,
    },
    {
      title: '電費 (NT$)',
      dataIndex: 'amount_twd',
      render: (v: string) => Number(v).toLocaleString(),
      align: 'right' as const,
    },
    {
      title: '備註',
      dataIndex: 'note',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, r: Bill) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(r)}
          />
          <Popconfirm
            title="確定刪除這筆帳單？"
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
        <Title level={4} style={{ margin: 0 }}>帳單管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增帳單
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
        title={editing ? '編輯帳單' : '新增帳單'}
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
            name="period"
            label="計費期間"
            rules={[{ required: true, message: '請選擇計費期間' }]}
          >
            <RangePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="meter_start"
            label="電表起始讀數"
            rules={[{ required: true, message: '請輸入起始讀數' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} addonAfter="度" />
          </Form.Item>

          <Form.Item
            name="meter_end"
            label="電表終止讀數"
            rules={[
              { required: true, message: '請輸入終止讀數' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value == null || value >= getFieldValue('meter_start')) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('終止讀數必須 ≥ 起始讀數'))
                },
              }),
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={0} addonAfter="度" />
          </Form.Item>

          <Form.Item
            name="amount_twd"
            label="繳費金額"
            rules={[{ required: true, message: '請輸入繳費金額' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} prefix="NT$" precision={0} />
          </Form.Item>

          <Form.Item name="note" label="備註">
            <TextArea rows={2} maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
