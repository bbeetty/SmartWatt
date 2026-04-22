# SmartWatt — Tasks（工作拆解）

> SDD Stage 3 · `tasks.md` — 依 `plan.md` 切成可逐條勾選的實作任務。按 Phase 順序執行。

---

## Phase 0 — Monorepo 骨架

- [x] **T0.1** 初始化 pnpm workspace：建立 `pnpm-workspace.yaml`、root `package.json`、`turbo.json`
- [x] **T0.2** 建立 `.gitignore`、`.editorconfig`、`README.md`
- [x] **T0.3** 建立 `vercel.json`（rewrites + buildCommand）
- [x] **T0.4** 撰寫 SDD 文件：`docs/spec.md`、`docs/plan.md`、`docs/tasks.md`
- [x] **T0.5** 撰寫 UI 設計文件：`docs/design.md`

---

## Phase 0.5 — UI Design 驗收

- [x] **T0.6** 確認各頁 Wireframe 佈局符合 `spec.md` 需求
- [x] **T0.7** 確認 Design Token（色彩、字型）定義於 `docs/design.md`，並準備好 `apps/web/src/theme.ts`
- [x] **T0.8** 確認 RWD 斷點策略（手機 2 欄 / 桌面 4 欄等）
- [x] **T0.9** 確認 Empty State 與 Loading 規格符合所有使用情境

---

## Phase 1 — 後端 `apps/api`

### 1A. 骨架與 DB
- [x] **T1.1** `apps/api/package.json`：Express 4、pg 8、typescript、tsx、serverless-http
- [x] **T1.2** `tsconfig.json`、`src/server.ts`（本機）、`api/index.ts`（Vercel entry）
- [x] **T1.3** `src/db.ts`：pg Pool（讀 `POSTGRES_URL`）；健康檢查 `GET /api/health`
- [x] **T1.4** `src/migrations/001_init.sql` + migration runner（以 `schema_migrations` 表記錄、`pg_advisory_lock` 避免並發）
  - ✦ 資料庫已建立於 **Neon**（非 Vercel Postgres）；Migration 已成功套用

### 1B. Resources CRUD
- [x] **T1.5** `routes/bills.ts`：CRUD + `?year=` 篩選 + 期間不重複檢查
- [x] **T1.6** `routes/appliances.ts`：CRUD
- [x] **T1.7** `routes/usage.ts`：CRUD + `?from&to&applianceId` 篩選
- [x] **T1.8** `routes/settings.ts`：GET / PUT（部分 merge）

### 1C. 業務邏輯與分析
- [x] **T1.9** `services/pricing.ts`：台電累進演算法（夏/非夏、六級距）
- [x] **T1.10** `services/analytics.ts`：trend / breakdown / compare / kpi 查詢組裝
- [x] **T1.11** `routes/analytics.ts`：對外四個分析端點

### 1D. 整合與測試
- [x] **T1.12** 統一錯誤處理 middleware（轉為 `{ error: { code, message } }`）
- [x] **T1.13** Jest 設定 + `services/pricing.test.ts`（各級距邊界）
- [x] **T1.14** supertest 整合測試：bills CRUD + analytics 聚合

---

## Phase 2 — 前端 `apps/web`

### 2A. 骨架
- [x] **T2.1** `apps/web/package.json`：react、react-dom、typescript、vite、antd、@ant-design/plots、axios、react-router-dom
- [x] **T2.2** `vite.config.ts`（dev proxy `/api` → `http://localhost:4000`）、`tsconfig.json`、`index.html`、`src/main.tsx`
- [x] **T2.3** `src/App.tsx`：`BrowserRouter` + 路由定義；`src/components/Layout.tsx`（AntD Sider）
- [x] **T2.4** `src/api/client.ts`：axios instance（baseURL `/api`）+ 錯誤攔截器

### 2B. 管理頁
- [x] **T2.5** `pages/Bills.tsx`：Table + 新增/編輯 Modal（AntD Form）+ 刪除確認
- [x] **T2.6** `pages/Appliances.tsx`：Table + Modal Form
- [x] **T2.7** `pages/DailyUsage.tsx`：日期範圍篩選 + 批次新增 + 自動由 `watt × hours` 帶出 `kwh`
- [x] **T2.8** `pages/Settings.tsx`：CO₂ 係數編輯、費率表顯示（唯讀）

### 2C. Dashboard
- [x] **T2.9** `pages/Dashboard.tsx`：
  - 上排：4 張 `Statistic` KPI 卡（YTD 度數、YTD 電費、YTD 碳排、日均度數）
  - 中排：`Line` 趨勢圖（月/週切換）
  - 下排左：`Pie` 家電佔比
  - 下排右：`Column` 同期比較

### 2D. 收尾
- [x] **T2.10** `locale`：AntD `ConfigProvider` 套用 `zh_TW`
- [ ] **T2.11** RWD 微調（Sider 在小螢幕改為 Drawer）
- [ ] **T2.12** Vitest 設定 + 各頁 smoke test

---

## Phase 3 — 部署

- [ ] **T3.1** 在 Vercel 匯入 repo，確認 Build/Install Command 使用 pnpm
- [x] **T3.2** 資料庫使用 **Neon**（已建立 Project `smartwatt`，Region: Singapore）；`POSTGRES_URL` 已設定於 `apps/api/.env`
- [ ] **T3.3** 將 `POSTGRES_URL` 設定至 Vercel 環境變數，首次部署後呼叫 `/api/health` 確認 DB 連通
- [ ] **T3.4** Smoke test：建立一筆 Bill → Dashboard 出現數字
- [ ] **T3.5** 將 Vercel URL 填回 `README.md`

---

## Definition of Done

- 所有 Phase 0–3 任務勾選完成
- `docs/design.md` Design Checklist 全部打勾
- `pnpm test` 通過
- `pnpm build` 成功輸出 `apps/web/dist` 與 `apps/api/dist`
- Vercel 線上環境 Dashboard 可正常讀取且呼叫 API 無錯誤
