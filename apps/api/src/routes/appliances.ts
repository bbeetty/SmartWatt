import { Router } from 'express';
import pool from '../db';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const params: unknown[] = [];
    let where = '';
    if (category) {
      where = 'WHERE category = $1';
      params.push(category);
    }
    const { rows } = await pool.query(
      `SELECT * FROM appliances ${where} ORDER BY name ASC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM appliances WHERE id = $1', [req.params.id]);
    if (!rows.length) throw new AppError('NOT_FOUND', '找不到此家電', 404);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, category, watt, location } = req.body;
    if (!name || watt == null) throw new AppError('VALIDATION_ERROR', '名稱與功率為必填');
    if (Number(watt) <= 0) throw new AppError('VALIDATION_ERROR', '功率必須大於 0', 400, { field: 'watt' });

    const { rows } = await pool.query(
      `INSERT INTO appliances (name, category, watt, location)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, category ?? null, watt, location ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, category, watt, location } = req.body;
    const { rows: existing } = await pool.query('SELECT id FROM appliances WHERE id = $1', [req.params.id]);
    if (!existing.length) throw new AppError('NOT_FOUND', '找不到此家電', 404);

    if (watt != null && Number(watt) <= 0)
      throw new AppError('VALIDATION_ERROR', '功率必須大於 0', 400, { field: 'watt' });

    const { rows } = await pool.query(
      `UPDATE appliances SET
        name     = COALESCE($1, name),
        category = COALESCE($2, category),
        watt     = COALESCE($3, watt),
        location = COALESCE($4, location)
       WHERE id = $5 RETURNING *`,
      [name ?? null, category ?? null, watt ?? null, location ?? null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM appliances WHERE id = $1', [req.params.id]);
    if (!rowCount) throw new AppError('NOT_FOUND', '找不到此家電', 404);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
