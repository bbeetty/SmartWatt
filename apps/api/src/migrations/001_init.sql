-- 家電清單
CREATE TABLE IF NOT EXISTS appliances (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80)   NOT NULL,
  category    VARCHAR(40),
  watt        INTEGER       NOT NULL CHECK (watt > 0),
  location    VARCHAR(40),
  created_at  TIMESTAMPTZ   DEFAULT now()
);

-- 每月帳單 / 電表讀數
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

-- 每日用電紀錄
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

-- 全域設定
CREATE TABLE IF NOT EXISTS settings (
  key    VARCHAR(40) PRIMARY KEY,
  value  JSONB        NOT NULL
);
INSERT INTO settings(key, value)
VALUES ('co2_factor', '{"kg_per_kwh": 0.495}')
ON CONFLICT (key) DO NOTHING;
