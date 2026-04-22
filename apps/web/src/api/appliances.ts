import client from './client'

export interface Appliance {
  id: number
  name: string
  category: string | null
  watt: number
  location: string | null
  created_at: string
}

export interface AppliancePayload {
  name: string
  category?: string
  watt: number
  location?: string
}

export const appliancesApi = {
  list: () => client.get<Appliance[]>('/appliances').then((r) => r.data),
  create: (data: AppliancePayload) => client.post<Appliance>('/appliances', data).then((r) => r.data),
  update: (id: number, data: Partial<AppliancePayload>) =>
    client.put<Appliance>(`/appliances/${id}`, data).then((r) => r.data),
  remove: (id: number) => client.delete(`/appliances/${id}`),
}

export const CATEGORIES = ['冷氣', '冰箱', '洗衣機', '熱水器', '照明', '電視', '電腦', '其他']
