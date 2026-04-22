import { Router } from 'express';
import pool from '../db';
import { AppError } from '../middleware/errorHandler';
import { calcBill } from '../services/pricing';
import { getTrend, getBreakdown, getCompare, getKpi } from '../services/analytics';

const router = Router();

// GET /api/analytics/trend?granularity=month&range=12
router.get('/trend', async (req, res, next) => {
  try {
    const granularity = (req.query.granularity as string) === 'week' ? 'week' : 'month';
    const range = Math.min(Number(req.query.range) || 12, 52);
    res.json(await getTrend(granularity, range));
  } catch (err) { next(err); }
});

// GET /api/analytics/breakdown?month=2025-03
router.get('/breakdown', async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month) throw new AppError('VALIDATION_ERROR', '缺少 month 參數（格式：YYYY-MM）');
    res.json(await getBreakdown(month as string));
  } catch (err) { next(err); }
});

// GET /api/analytics/compare?type=mom&month=2025-03
router.get('/compare', async (req, res, next) => {
  try {
    const { type, month } = req.query;
    if (!month) throw new AppError('VALIDATION_ERROR', '缺少 month 參數');
    if (type !== 'mom' && type !== 'yoy') throw new AppError('VALIDATION_ERROR', 'type 須為 mom 或 yoy');
    res.json(await getCompare(type, month as string));
  } catch (err) { next(err); }
});

// GET /api/analytics/kpi?year=2025
router.get('/kpi', async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const { rows } = await pool.query(
      `SELECT value FROM settings WHERE key = 'co2_factor'`
    );
    const co2Factor = rows.length ? Number(rows[0].value.kg_per_kwh) : 0.495;
    res.json(await getKpi(year, co2Factor));
  } catch (err) { next(err); }
});

// GET /api/analytics/estimate?kwh=150&periodStart=2025-06-01&periodEnd=2025-06-30
router.get('/estimate', (req, res, next) => {
  try {
    const { kwh, periodStart, periodEnd } = req.query;
    if (!kwh || !periodStart || !periodEnd)
      throw new AppError('VALIDATION_ERROR', '缺少 kwh / periodStart / periodEnd 參數');
    res.json(calcBill(Number(kwh), new Date(periodStart as string), new Date(periodEnd as string)));
  } catch (err) { next(err); }
});

export default router;
