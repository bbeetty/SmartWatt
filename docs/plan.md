# SmartWatt — Architecture Plan（架構設計）

> SDD Stage 2 · `plan.md` — 回答「怎麼實作」。聚焦系統結構、資料模型、API 契約、關鍵演算法與部署。

## 1. System Architecture

```
┌────────────┐   HTTPS   ┌─────────────────────────┐
│  Browser   │──────────▶│  Vercel CDN / Edge      │
└────────────┘           │   (apps/web 靜態檔)     │
                         └────────────┬────────────┘
                                      │  /api/*
                                      ▼
                         ┌─────────────────────────┐
                         │  Vercel Serverless      │
                         │  Function (apps/api)    │
                         │  Express via            │
                         │  serverless-http        │
                         └────────────┬────────────┘
                                      │  pg pool
                                      ▼
                         ┌─────────────────────────┐
                         │  Vercel Postgres        │
                         └─────────────────────────┘
```

- `apps/web`：Vite 產生靜態檔，Vercel 以 CDN 服務。
- `apps/api`：單一 Express App，透過 `serverless-http` 包裝成 Vercel function（`apps/api/api/index.ts` 為 entry），本機開發時以 `server.ts` 啟動 http server。
- DB 連線字串來自環境變數 `POSTGRES_URL`（Vercel Postgres 自動注入）。

## 2. Data Model（PostgreSQL）

```sql
-- 家電清單
CREATE TABLE appliances (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  category    VARCHAR(40),
  watt        INTEGER      NOT NULL CHECK (watt > 0),
  location    VARCHAR(40),
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- 每月帳單 / 電表讀數
CREATE TABLE bills (
  id            SERIAL PRIMARY KEY,
  period_start  DATE         NOT NULL,
  period_end    DATE         NOT NULL,
  meter_start   INTEGER      NOT NULL,
  meter_end     INTEGER      NOT NULL,
  kwh_used      INTEGER      GENERATED ALWAYS AS (meter_end - meter_start) STORED,
  amount_twd    NUMERIC(10,2) NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ  DEFAULT now(),
  CHECK (period_end > period_start),
  CHECK (meter_end >= meter_start)
);
CREATE UNIQUE INDEX uq_bills_period ON bills(period_start, period_end);

-- 每日用電紀錄
CREATE TABLE daily_usages (
  id            SERIAL PRIMARY KEY,
  usage_date    DATE         NOT NULL,
  appliance_id  INTEGER      REFERENCES appliances(id) ON DELETE CASCADE,
  hours         NUMERIC(5,2) CHECK (hours IS NULL OR hours BETWEEN 0 AND 24),
  kwh           NUMERIC(8,3) NOT NULL CHECK (kwh >= 0),
  created_at    TIMESTAMPTZ  DEFAULT now()
);
CREATE INDEX ix_daily_usages_date ON daily_usages(usage_date);
CREATE INDEX ix_daily_usages_appliance ON daily_usages(appliance_id);

-- 全域設定（co2 係數等）
CREATE TABLE settings (
  key    VARCHAR(40) PRIMARY KEY,
  value  JSONB        NOT NULL
);
INSERT INTO settings(key, value)
VALUES ('co2_factor', '{"kg_per_kwh": 0.495}')
ON CONFLICT (key) DO NOTHING;
```

**設計說明**：
- `bills.kwh_used` 為 generated column，確保「帳單度數」等於電表差額，避免資料漂移。
- `daily_usages.appliance_id` 為 NULL 表示「整戶當日總量」；非 NULL 表示「某家電當日使用紀錄」。分析時分別處理。
- `daily_usages.hours` 可為 NULL；若有值，前端可用 `watt × hours / 1000` 帶出 `kwh` 預設，使用者仍可覆寫。

## 3. REST API

Base path：`/api`，所有請求與回應皆為 JSON（`Content-Type: application/json`）。

### 3.1 Resources

| Method | Path | 說明 |
|--------|------|------|
| GET | `/bills` | 列出帳單（`?year=YYYY` 可選） |
| POST | `/bills` | 建立帳單 |
| GET | `/bills/:id` | 取得單筆 |
| PUT | `/bills/:id` | 更新 |
| DELETE | `/bills/:id` | 刪除 |
| GET | `/appliances` | 列出家電 |
| POST | `/appliances` | 新增 |
| PUT | `/appliances/:id` | 更新 |
| DELETE | `/appliances/:id` | 刪除 |
| GET | `/usage` | 列出每日用電（`?from=YYYY-MM-DD&to=YYYY-MM-DD&applianceId=`） |
| POST | `/usage` | 新增 |
| PUT | `/usage/:id` | 更新 |
| DELETE | `/usage/:id` | 刪除 |
| GET | `/settings` | 取得全域設定 |
| PUT | `/settings` | 更新（部分 merge） |

### 3.2 Analytics

| Method | Path | Query Params | 回應 |
|--------|------|--------------|------|
| GET | `/analytics/trend` | `granularity=month\|week`、`range=12` | `[{ bucket, kwh, amount }]` |
| GET | `/analytics/breakdown` | `month=YYYY-MM` | `[{ applianceId, name, kwh, percent }]` |
| GET | `/analytics/compare` | `type=mom\|yoy`、`month=YYYY-MM` | `{ current, previous, deltaPercent }` |
| GET | `/analytics/kpi` | `year=YYYY` | `{ ytdKwh, ytdAmount, ytdCo2Kg, avgDailyKwh }` |

### 3.3 Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "period_end must be after period_start",
    "details": { "field": "period_end" }
  }
}
```

- `4xx` 用於請求驗證失敗（code: `VALIDATION_ERROR`、`NOT_FOUND`、`CONFLICT`）
- `5xx` 用於伺服器錯誤（code: `INTERNAL_ERROR`）

## 4. Pricing Algorithm（台電住宅累進）

模組位置：`apps/api/src/services/pricing.ts`

```ts
calcBill(kwh: number, periodStart: Date, periodEnd: Date): {
  amount: number;
  breakdown: { tier: string; kwh: number; rate: number; subtotal: number }[];
}
```

**演算法**：

1. 判斷夏月/非夏月：若 `periodStart` 或 `periodEnd` 落在 6/1–9/30，整期視為夏月（簡化處理，台電實務則依日數比例，MVP 不做）。
2. 依級距累進計算：
   - **級距**：0–120 / 121–330 / 331–500 / 501–700 / 701–1000 / 1001+ 度
   - **夏月費率（NT$/度）**：1.68 / 2.45 / 3.70 / 5.04 / 6.24 / 8.46
   - **非夏月費率（NT$/度）**：1.68 / 2.16 / 3.03 / 4.14 / 5.00 / 6.24
3. 費率與級距以模組常數定義（便於台電公告更新時調整）。
4. 回傳總金額與每級距明細，方便前端顯示計價過程。

> 費率以 2025 年台電公告值為基準；變動時只需修改常數。

## 5. Frontend Architecture

### 5.1 Routing

| Path | Page | 說明 |
|------|------|------|
| `/` | `Dashboard` | 4 × KPI 卡 + 折線圖 + 圓餅圖 + 長條圖 |
| `/bills` | `Bills` | 帳單 CRUD（Table + Modal Form） |
| `/appliances` | `Appliances` | 家電 CRUD |
| `/usage` | `DailyUsage` | 每日用電登記（支援批次新增） |
| `/settings` | `Settings` | CO₂ 係數、費率表檢視 |

### 5.2 Layout & 共用模組

- `components/Layout.tsx`：AntD `Layout` + `Sider` 選單（繁中）
- `api/client.ts`：axios instance，`baseURL = '/api'`、攔截器統一錯誤處理
- `hooks/useResource.ts`：共用的 CRUD hook（可搭配 `@tanstack/react-query`，非必須）

### 5.3 Charts

使用 `@ant-design/plots`：
- `Line` → 趨勢折線
- `Pie` → 家電佔比
- `Column` → 同期比較

## 6. Deployment

### 6.1 Vercel 設定

`vercel.json`（已建立於 repo root）：

```json
{
  "buildCommand": "turbo run build --filter=web",
  "outputDirectory": "apps/web/dist",
  "installCommand": "pnpm install",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/apps/api/api/index" }
  ]
}
```

### 6.2 環境變數

| Name | 說明 |
|------|------|
| `POSTGRES_URL` | Vercel Postgres 連線字串（自動注入） |
| `NODE_ENV` | `production` / `development` |

### 6.3 本機開發

```bash
pnpm install
pnpm dev
# web → http://localhost:5173
# api → http://localhost:4000
```

`apps/api` 啟動時執行 migration runner（讀取 `src/migrations/*.sql`，對 `public.schema_migrations` 表記錄已執行版本）。

## 7. Testing Strategy

| 層級 | 工具 | 重點 |
|------|------|------|
| 後端單元 | Jest | `pricing.ts` 各級距邊界（0、120、330、500、700、1000、1500 度）、夏/非夏月切換 |
| 後端整合 | Jest + supertest | Resources CRUD、analytics 聚合 SQL（用 in-memory pg 或 Testcontainers） |
| 前端 | Vitest + React Testing Library | 各頁 smoke test、KPI 數字格式化、圖表 props 傳遞 |
| E2E | （先略） | 留待後續 Phase |

## 8. 風險與待辦

- **夏月跨期計費**：目前採「整期視為夏月」簡化；若需精準跟台電帳一致，須改為按日切分計算。
- **Vercel Function 冷啟動**：首次呼叫有延遲；可考慮 analytics 端點加上短期 CDN cache。
- **Migration 鎖**：serverless 環境每個 instance 都可能觸發 migration runner；需以 `pg_advisory_lock` 避免並發衝突。
