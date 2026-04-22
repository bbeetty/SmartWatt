import client from './client'

export interface DailyUsage {
  id: number
  usage_date: string
  appliance_id: number | null
  appliance_name: string | null
  appliance_watt: number | null
  hours: string | null
  kwh: string
  created_at: string
}

export interface UsagePayload {
  usage_date: string
  appliance_id?: number | null
  hours?: number | null
  kwh: number
}

export const usageApi = {
  list: (params?: { from?: string; to?: string; applianceId?: string }) =>
    client.get<DailyUsage[]>('/usage', { params }).then((r) => r.data),
  create: (data: UsagePayload) =>
    client.post<DailyUsage>('/usage', data).then((r) => r.data),
  update: (id: number, data: Partial<UsagePayload>) =>
    client.put<DailyUsage>(`/usage/${id}`, data).then((r) => r.data),
  remove: (id: number) => client.delete(`/usage/${id}`),
}
