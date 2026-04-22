import { Pool } from 'pg';

const connectionString = process.env.POSTGRES_URL?.replace(/[?&]sslmode=[^&]+/, '') ?? ''

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 3,
  connectionTimeoutMillis: 8_000,
  idleTimeoutMillis: 10_000,
});

const MIGRATIONS: { version: string; sql: string }[] = [
  {
    version: '001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS appliances (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(80)   NOT NULL,
        category    VARCHAR(40),
        watt        INTEGER       NOT NULL CHECK (watt > 0),
        location    VARCHAR(40),
        created_at  TIMESTAMPTZ   DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS bills (
        id            SERIAL        PRIMARY KEY,
        period_start  DATE          NOT NULL,
        period_end    DATE          NOT NULL,
        meter_start   INTEGER       NOT NULL,
        meter_end     INTEGER       NOT NULL,
        kwh_used      INTEGER       GENERATED ALWAYS AS (meter_end - meter_start) STORED,
        amount_twd    NUMERIC(10,2) NOT NULL,
        note          TEXT,
        created_at    TIMESTAMPTZ   DEFAULT now(),
        CHECK (period_end > period_start),
        CHECK (meter_end >= meter_start)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_bills_period ON bills(period_start, period_end);

      CREATE TABLE IF NOT EXISTS daily_usages (
        id            SERIAL        PRIMARY KEY,
        usage_date    DATE          NOT NULL,
        appliance_id  INTEGER       REFERENCES appliances(id) ON DELETE CASCADE,
        hours         NUMERIC(5,2)  CHECK (hours IS NULL OR hours BETWEEN 0 AND 24),
        kwh           NUMERIC(8,3)  NOT NULL CHECK (kwh >= 0),
        created_at    TIMESTAMPTZ   DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS ix_daily_usages_date      ON daily_usages(usage_date);
      CREATE INDEX IF NOT EXISTS ix_daily_usages_appliance ON daily_usages(appliance_id);

      CREATE TABLE IF NOT EXISTS settings (
        key    VARCHAR(40) PRIMARY KEY,
        value  JSONB        NOT NULL
      );
      INSERT INTO settings(key, value)
      VALUES ('co2_factor', '{"kg_per_kwh": 0.495}')
      ON CONFLICT (key) DO NOTHING;
    `,
  },
];

let migrated = false;

export async function runMigrations(): Promise<void> {
  if (migrated) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(7777777)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(40) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    for (const { version, sql } of MIGRATIONS) {
      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );
      if (rows.length > 0) continue;

      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      console.log(`[migration] applied ${version}`);
    }

    await client.query('COMMIT');
    migrated = true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
