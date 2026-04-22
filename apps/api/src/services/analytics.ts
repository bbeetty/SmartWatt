import pool from '../db';

export async function getTrend(granularity: 'month' | 'week', range: number) {
  if (granularity === 'month') {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(period_start, 'YYYY-MM') AS bucket,
        kwh_used                         AS kwh,
        amount_twd                       AS amount
      FROM bills
      WHERE period_start >= NOW() - ($1 || ' months')::INTERVAL
      ORDER BY period_start ASC
    `, [range]);
    return rows;
  }

  // weekly: aggregate whole-household daily entries
  const { rows } = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', usage_date), 'YYYY-MM-DD') AS bucket,
      SUM(kwh)                                              AS kwh
    FROM daily_usages
    WHERE appliance_id IS NULL
      AND usage_date >= NOW() - ($1 || ' weeks')::INTERVAL
    GROUP BY DATE_TRUNC('week', usage_date)
    ORDER BY DATE_TRUNC('week', usage_date) ASC
  `, [range]);
  return rows;
}

export async function getBreakdown(month: string) {
  const { rows } = await pool.query(`
    SELECT
      du.appliance_id,
      a.name,
      SUM(du.kwh)::NUMERIC(10,3) AS kwh
    FROM daily_usages du
    JOIN appliances a ON a.id = du.appliance_id
    WHERE du.appliance_id IS NOT NULL
      AND TO_CHAR(du.usage_date, 'YYYY-MM') = $1
    GROUP BY du.appliance_id, a.name
    ORDER BY kwh DESC
  `, [month]);

  const totalKwh = rows.reduce((sum, r) => sum + Number(r.kwh), 0);
  return rows.map(r => ({
    ...r,
    kwh: Number(r.kwh),
    percent: totalKwh > 0 ? Math.round((Number(r.kwh) / totalKwh) * 1000) / 10 : 0,
  }));
}

export async function getCompare(type: 'mom' | 'yoy', month: string) {
  const [year, mon] = month.split('-').map(Number);

  let prevYear = year, prevMon = mon;
  if (type === 'mom') {
    prevMon = mon === 1 ? 12 : mon - 1;
    prevYear = mon === 1 ? year - 1 : year;
  } else {
    prevYear = year - 1;
  }
  const prevMonth = `${prevYear}-${String(prevMon).padStart(2, '0')}`;

  async function fetchMonthKwh(m: string) {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(kwh_used), 0)::INTEGER AS kwh,
             COALESCE(SUM(amount_twd), 0)::NUMERIC(10,2) AS amount
      FROM bills
      WHERE TO_CHAR(period_start, 'YYYY-MM') = $1
    `, [m]);
    return rows[0];
  }

  const [current, previous] = await Promise.all([
    fetchMonthKwh(month),
    fetchMonthKwh(prevMonth),
  ]);

  const deltaKwh = Number(current.kwh) - Number(previous.kwh);
  const deltaPercent = Number(previous.kwh) > 0
    ? Math.round((deltaKwh / Number(previous.kwh)) * 1000) / 10
    : null;

  return {
    month,
    prevMonth,
    current: { kwh: Number(current.kwh), amount: Number(current.amount) },
    previous: { kwh: Number(previous.kwh), amount: Number(previous.amount) },
    deltaKwh,
    deltaPercent,
  };
}

export async function getKpi(year: number, co2Factor: number) {
  const { rows: billRows } = await pool.query(`
    SELECT
      COALESCE(SUM(kwh_used), 0)::INTEGER     AS ytd_kwh,
      COALESCE(SUM(amount_twd), 0)::NUMERIC   AS ytd_amount
    FROM bills
    WHERE EXTRACT(YEAR FROM period_start) = $1
  `, [year]);

  const { rows: dailyRows } = await pool.query(`
    SELECT COALESCE(AVG(kwh), 0)::NUMERIC(8,3) AS avg_daily_kwh
    FROM daily_usages
    WHERE appliance_id IS NULL
      AND EXTRACT(YEAR FROM usage_date) = $1
  `, [year]);

  const ytdKwh = Number(billRows[0].ytd_kwh);
  return {
    ytdKwh,
    ytdAmount: Number(billRows[0].ytd_amount),
    ytdCo2Kg: Math.round(ytdKwh * co2Factor * 10) / 10,
    avgDailyKwh: Number(dailyRows[0].avg_daily_kwh),
  };
}
