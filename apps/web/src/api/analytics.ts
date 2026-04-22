import client from './client'

export interface KpiData {
  ytdKwh: number
  ytdAmount: number
  ytdCo2Kg: number
  avgDailyKwh: number
}

export interface TrendData {
  bucket: string
  kwh: number
  amount?: number
}

export interface BreakdownData {
  appliance_id: string
  name: string
  kwh: number
  percent: number
}

export interface CompareData {
  month: string
  prevMonth: string
  current: { kwh: number; amount: number }
  previous: { kwh: number; amount: number }
  deltaKwh: number
  deltaPercent: number | null
}

export const analyticsApi = {
  getKpi: (year: number) => client.get<KpiData>('/analytics/kpi', { params: { year } }).then(r => r.data),
  getTrend: (granularity: 'month' | 'week', range: number) => 
    client.get<TrendData[]>('/analytics/trend', { params: { granularity, range } }).then(r => r.data),
  getBreakdown: (month: string) => 
    client.get<BreakdownData[]>('/analytics/breakdown', { params: { month } }).then(r => r.data),
  getCompare: (type: 'mom' | 'yoy', month: string) => 
    client.get<CompareData>('/analytics/compare', { params: { type, month } }).then(r => r.data),
}
