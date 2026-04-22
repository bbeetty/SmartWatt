import client from './client'

export interface Bill {
  id: number
  period_start: string
  period_end: string
  meter_start: number
  meter_end: number
  kwh_used: number
  amount_twd: string
  note: string | null
  created_at: string
}

export interface BillPayload {
  period_start: string
  period_end: string
  meter_start: number
  meter_end: number
  amount_twd: number
  note?: string
}

export const billsApi = {
  list: (year?: number) =>
    client.get<Bill[]>('/bills', { params: year ? { year } : undefined }).then((r) => r.data),
  create: (data: BillPayload) =>
    client.post<Bill>('/bills', data).then((r) => r.data),
  update: (id: number, data: Partial<BillPayload>) =>
    client.put<Bill>(`/bills/${id}`, data).then((r) => r.data),
  remove: (id: number) =>
    client.delete(`/bills/${id}`),
}
