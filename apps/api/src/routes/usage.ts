import { Router } from 'express';
import pool from '../db';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { from, to, applianceId } = req.query;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (from) { conditions.push(`usage_date >= $${params.length + 1}`); params.push(from); }
    if (to)   { conditions.push(`usage_date <= $${params.length + 1}`); params.push(to); }
    if (applianceId === 'null') {
      conditions.push('appliance_id IS NULL');
    } else if (applianceId) {
      conditions.push(`appliance_id = $${params.length + 1}`); params.push(applianceId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT du.*, a.name AS appliance_name, a.watt AS appliance_watt
       FROM daily_usages du
       LEFT JOIN appliances a ON a.id = du.appliance_id
       ${where}
       ORDER BY du.usage_date DESC, du.id DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT du.*, a.name AS appliance_name FROM daily_usages du
       LEFT JOIN appliances a ON a.id = du.appliance_id
       WHERE du.id = $1`,
      [req.params.id]
    );
    if (!rows.length) throw new AppError('NOT_FOUND', '找不到此紀錄', 404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { usage_date, appliance_id, hours, kwh } = req.body;
    if (!usage_date || kwh == null) throw new AppError('VALIDATION_ERROR', '日期與用電量為必填');
    if (Number(kwh) < 0) throw new AppError('VALIDATION_ERROR', 'kwh 不能為負數', 400, { field: 'kwh' });
    if (hours != null && (Number(hours) < 0 || Number(hours) > 24))
      throw new AppError('VALIDATION_ERROR', '使用時數須介於 0–24 小時', 400, { field: 'hours' });

    const { rows } = await pool.query(
      `INSERT INTO daily_usages (usage_date, appliance_id, hours, kwh)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [usage_date, appliance_id ?? null, hours ?? null, kwh]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { usage_date, appliance_id, hours, kwh } = req.body;
    const { rows: existing } = await pool.query('SELECT id FROM daily_usages WHERE id = $1', [req.params.id]);
    if (!existing.length) throw new AppError('NOT_FOUND', '找不到此紀錄', 404);

    const { rows } = await pool.query(
      `UPDATE daily_usages SET
        usage_date   = COALESCE($1, usage_date),
        appliance_id = COALESCE($2, appliance_id),
        hours        = COALESCE($3, hours),
        kwh          = COALESCE($4, kwh)
       WHERE id = $5 RETURNING *`,
      [usage_date ?? null, appliance_id ?? null, hours ?? null, kwh ?? null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM daily_usages WHERE id = $1', [req.params.id]);
    if (!rowCount) throw new AppError('NOT_FOUND', '找不到此紀錄', 404);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
