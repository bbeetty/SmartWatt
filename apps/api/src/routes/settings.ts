import { Router } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings ORDER BY key');
    const result = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/', async (req, res, next) => {
  try {
    const updates = req.body as Record<string, unknown>;
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, JSON.stringify(value)]
      );
    }
    const { rows } = await pool.query('SELECT key, value FROM settings ORDER BY key');
    res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
  } catch (err) { next(err); }
});

export default router;
