import client from './client'

export interface Settings {
  co2_factor: { kg_per_kwh: number }
}

export const settingsApi = {
  get: () => client.get<Settings>('/settings').then((r) => r.data),
  update: (data: Partial<Settings>) => client.put<Settings>('/settings', data).then((r) => r.data),
}

// 台電住宅累進費率（2025，僅供顯示）
export const RATE_TABLE = {
  summer: {
    label: '夏月（6/1–9/30）',
    tiers: [
      { range: '0–120 度', rate: 1.68 },
      { range: '121–330 度', rate: 2.45 },
      { range: '331–500 度', rate: 3.70 },
      { range: '501–700 度', rate: 5.04 },
      { range: '701–1000 度', rate: 6.24 },
      { range: '1001 度以上', rate: 8.46 },
    ],
  },
  nonSummer: {
    label: '非夏月',
    tiers: [
      { range: '0–120 度', rate: 1.68 },
      { range: '121–330 度', rate: 2.16 },
      { range: '331–500 度', rate: 3.03 },
      { range: '501–700 度', rate: 4.14 },
      { range: '701–1000 度', rate: 5.00 },
      { range: '1001 度以上', rate: 6.24 },
    ],
  },
}
