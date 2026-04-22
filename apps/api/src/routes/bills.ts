import { Router } from 'express';
import pool from '../db';
import { AppError } from '../middleware/errorHandler';
import { calcBill } from '../services/pricing';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { year } = req.query;
    const params: unknown[] = [];
    let where = '';
    if (year) {
      where = 'WHERE EXTRACT(YEAR FROM period_start) = $1 OR EXTRACT(YEAR FROM period_end) = $1';
      params.push(year);
    }
    const { rows } = await pool.query(
      `SELECT * FROM bills ${where} ORDER BY period_start DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bills WHERE id = $1', [req.params.id]);
    if (!rows.length) throw new AppError('NOT_FOUND', '找不到此帳單', 404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { period_start, period_end, meter_start, meter_end, amount_twd, note } = req.body;

    if (!period_start || !period_end || meter_start == null || meter_end == null || amount_twd == null)
      throw new AppError('VALIDATION_ERROR', '缺少必填欄位');
    if (new Date(period_end) <= new Date(period_start))
      throw new AppError('VALIDATION_ERROR', 'period_end 必須晚於 period_start', 400, { field: 'period_end' });
    if (Number(meter_end) < Number(meter_start))
      throw new AppError('VALIDATION_ERROR', 'meter_end 必須 ≥ meter_start', 400, { field: 'meter_end' });

    const { rows: overlap } = await pool.query(
      `SELECT id FROM bills WHERE NOT (period_end < $1 OR period_start > $2)`,
      [period_start, period_end]
    );
    if (overlap.length) throw new AppError('CONFLICT', '計費期間與現有帳單重疊', 409);

    const { rows } = await pool.query(
      `INSERT INTO bills (period_start, period_end, meter_start, meter_end, amount_twd, note)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [period_start, period_end, meter_start, meter_end, amount_twd, note ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { period_start, period_end, meter_start, meter_end, amount_twd, note } = req.body;

    const { rows: existing } = await pool.query('SELECT * FROM bills WHERE id = $1', [id]);
    if (!existing.length) throw new AppError('NOT_FOUND', '找不到此帳單', 404);

    const ps = period_start ?? existing[0].period_start;
    const pe = period_end ?? existing[0].period_end;
    if (new Date(pe) <= new Date(ps))
      throw new AppError('VALIDATION_ERROR', 'period_end 必須晚於 period_start', 400);

    const { rows: overlap } = await pool.query(
      `SELECT id FROM bills WHERE id != $1 AND NOT (period_end < $2 OR period_start > $3)`,
      [id, ps, pe]
    );
    if (overlap.length) throw new AppError('CONFLICT', '計費期間與現有帳單重疊', 409);

    const { rows } = await pool.query(
      `UPDATE bills SET
        period_start = COALESCE($1, period_start),
        period_end   = COALESCE($2, period_end),
        meter_start  = COALESCE($3, meter_start),
        meter_end    = COALESCE($4, meter_end),
        amount_twd   = COALESCE($5, amount_twd),
        note         = COALESCE($6, note)
       WHERE id = $7 RETURNING *`,
      [period_start ?? null, period_end ?? null, meter_start ?? null, meter_end ?? null, amount_twd ?? null, note ?? null, id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM bills WHERE id = $1', [req.params.id]);
    if (!rowCount) throw new AppError('NOT_FOUND', '找不到此帳單', 404);
    res.status(204).send();
  } catch (err) { next(err); }
});

// 台電電費估算（供前端帳單 Modal 即時預覽）
router.get('/estimate', async (req, res, next) => {
  try {
    const { kwh, periodStart, periodEnd } = req.query;
    if (!kwh || !periodStart || !periodEnd)
      throw new AppError('VALIDATION_ERROR', '缺少 kwh / periodStart / periodEnd 參數');
    const result = calcBill(Number(kwh), new Date(periodStart as string), new Date(periodEnd as string));
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
