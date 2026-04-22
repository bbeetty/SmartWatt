import { useState } from 'react'
import { Card, Col, Row, Typography, Statistic, Select, Segmented, Space, Empty, Spin } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Line, Pie, Column } from '@ant-design/plots'
import dayjs from 'dayjs'
import { analyticsApi } from '../api/analytics'

const { Title, Text } = Typography

export default function Dashboard() {
  const [year, setYear] = useState(dayjs().year())
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [trendGranularity, setTrendGranularity] = useState<'month' | 'week'>('month')

  const kpiQuery = useQuery({
    queryKey: ['analytics', 'kpi', year],
    queryFn: () => analyticsApi.getKpi(year),
  })

  const trendQuery = useQuery({
    queryKey: ['analytics', 'trend', trendGranularity],
    queryFn: () => analyticsApi.getTrend(trendGranularity, 12),
  })

  const breakdownQuery = useQuery({
    queryKey: ['analytics', 'breakdown', month],
    queryFn: () => analyticsApi.getBreakdown(month),
  })

  const compareQuery = useQuery({
    queryKey: ['analytics', 'compare', 'mom', month],
    queryFn: () => analyticsApi.getCompare('mom', month),
  })

  const kpis = [
    { label: 'YTD 累計用電', value: kpiQuery.data?.ytdKwh, unit: '度', color: '#1677ff' },
    { label: 'YTD 累計電費', value: kpiQuery.data?.ytdAmount, unit: '元', color: '#faad14' },
    { label: 'YTD 碳排估算', value: kpiQuery.data?.ytdCo2Kg, unit: 'kg CO₂', color: '#52c41a' },
    { label: '日均用電', value: kpiQuery.data?.avgDailyKwh, unit: '度/天', color: '#8c8c8c' },
  ]

  return (
    <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={4} style={{ margin: 0 }}>用電概覽</Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={year}
              onChange={setYear}
              options={[2024, 2025, 2026].map(y => ({ label: `${y} 年`, value: y }))}
              style={{ width: 100 }}
            />
            <Select
              value={month}
              onChange={setMonth}
              options={Array.from({ length: 12 }).map((_, i) => {
                const val = dayjs().year(year).month(i).format('YYYY-MM')
                return { label: dayjs(val).format('YYYY年MM月'), value: val }
              })}
              style={{ width: 140 }}
            />
          </Space>
        </Col>
      </Row>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        {kpis.map((kpi) => (
          <Col xs={12} sm={12} lg={6} key={kpi.label}>
            <Card variant="borderless" loading={kpiQuery.isLoading}>
              <Statistic
                title={kpi.label}
                value={kpi.value ?? 0}
                precision={kpi.unit === '度/天' ? 2 : 0}
                suffix={kpi.unit}
                styles={{ content: { color: kpi.color, fontWeight: 700 } }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Trend Chart */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="用電趨勢"
            extra={
              <Segmented
                options={[{ label: '月', value: 'month' }, { label: '週', value: 'week' }]}
                value={trendGranularity}
                onChange={(v) => setTrendGranularity(v as any)}
              />
            }
          >
            {trendQuery.isLoading ? <Spin /> : (
              trendQuery.data?.length ? (
                <Line
                  data={trendQuery.data}
                  xField="bucket"
                  yField="kwh"
                  smooth
                  point={{ size: 5, shape: 'diamond' }}
                  label={{ style: { fill: '#aaa' } }}
                  height={300}
                />
              ) : <Empty />
            )}
          </Card>
        </Col>

        {/* Breakdown Chart */}
        <Col xs={24} lg={8}>
          <Card title="家電用電佔比">
            {breakdownQuery.isLoading ? <Spin /> : (
              breakdownQuery.data?.length ? (
                <Pie
                  data={breakdownQuery.data}
                  angleField="kwh"
                  colorField="name"
                  radius={0.8}
                  innerRadius={0.6}
                  label={{
                    text: (d: { kwh: number }, _i: number, data: { kwh: number }[]) => {
                      const total = data.reduce((s, r) => s + r.kwh, 0)
                      return total > 0 ? `${((d.kwh / total) * 100).toFixed(1)}%` : ''
                    },
                    position: 'inside',
                  }}
                  interactions={[{ type: 'element-active' }]}
                  height={300}
                />
              ) : <Empty description="本月無家電紀錄" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Comparison */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="同期比較 (MoM)">
            {compareQuery.isLoading ? <Spin /> : (
              compareQuery.data ? (
                <Row gutter={48} align="middle">
                  <Col span={16}>
                    <Column
                      data={[
                        { type: '本月', value: compareQuery.data.current.kwh },
                        { type: '上月', value: compareQuery.data.previous.kwh },
                      ]}
                      xField="type"
                      yField="value"
                      seriesField="type"
                      height={250}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="用電增減"
                      value={Math.abs(compareQuery.data.deltaPercent ?? 0)}
                      precision={1}
                      prefix={compareQuery.data.deltaPercent && compareQuery.data.deltaPercent > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      suffix="%"
                      styles={{ content: { color: (compareQuery.data.deltaPercent ?? 0) > 0 ? '#ff4d4f' : '#52c41a' } }}
                    />
                    <Text type="secondary">
                      相較於 {compareQuery.data.prevMonth}，
                      {compareQuery.data.deltaKwh > 0 ? '增加' : '省下'} {Math.abs(compareQuery.data.deltaKwh)} 度
                    </Text>
                  </Col>
                </Row>
              ) : <Empty />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
