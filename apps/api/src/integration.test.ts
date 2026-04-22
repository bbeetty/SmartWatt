import 'dotenv/config';
import request from 'supertest';
import app from './app';
import pool from './db';

describe('API Integration Tests', () => {
  // Optional: check health
  test('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  describe('Bills API', () => {
    test('GET /api/bills should return an array', async () => {
      const res = await request(app).get('/api/bills');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Analytics API', () => {
    test('GET /api/analytics/kpi should return KPI data', async () => {
      const res = await request(app).get('/api/analytics/kpi?year=2025');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ytdKwh');
      expect(res.body).toHaveProperty('ytdAmount');
      expect(res.body).toHaveProperty('ytdCo2Kg');
      expect(res.body).toHaveProperty('avgDailyKwh');
    });

    test('GET /api/analytics/trend should return trend data', async () => {
      const res = await request(app).get('/api/analytics/trend?granularity=month&range=12');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  afterAll(async () => {
    await pool.end();
  });
});
