# SmartWatt — Specification（需求規格）

> SDD Stage 1 · `spec.md` — 回答「要做什麼 / 為了誰」。不涉及實作細節。

## 1. Purpose

SmartWatt 是一款**單一家戶**使用的家庭能源管理 Web App，協助使用者：

- 集中登記用電資訊（電表讀數、帳單、家電、每日用量）
- 透過 Dashboard 視覺化分析用電模式
- 估算電費與碳排，建立節能意識

本專案為**練習用途**，不考慮多使用者、登入授權、繳費流程。

## 2. Actors

| Actor | 說明 |
|-------|------|
| 家戶管理者 | 唯一使用者，負責輸入與檢視所有資料 |

## 3. User Stories

| ID | As a ... | I want to ... | So that ... |
|----|----------|---------------|-------------|
| US-01 | 家戶管理者 | 登記每月電表讀數與帳單金額 | 追蹤繳費歷史並對帳 |
| US-02 | 家戶管理者 | 建立家電清單（名稱、類別、額定功率、放置位置） | 估算每台家電的用電量 |
| US-03 | 家戶管理者 | 登記每日總用電量或每台家電每日使用時數 | 做細粒度的用電分析 |
| US-04 | 家戶管理者 | 在 Dashboard 看到用電趨勢折線圖（月/週粒度） | 掌握用電走勢 |
| US-05 | 家戶管理者 | 在 Dashboard 看到家電用電佔比圓餅圖 | 找出耗電大戶 |
| US-06 | 家戶管理者 | 在 Dashboard 看到同期比較長條圖（MoM、YoY） | 比較本月 vs 上月、今年 vs 去年 |
| US-07 | 家戶管理者 | 在 Dashboard 看到累計電費與碳排 KPI 卡 | 量化節能成效 |
| US-08 | 家戶管理者 | 在設定頁調整 CO₂ 排放係數 | 使用最新公告或自訂係數 |

## 4. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | 帳單 CRUD：起訖日期、電表起訖讀數、金額、備註；同期間不可重複 |
| FR-02 | 家電 CRUD：名稱、類別、額定功率（W）、位置 |
| FR-03 | 每日用電紀錄 CRUD：日期、家電 ID（可為空表整戶總量）、使用時數（可選）、kWh |
| FR-04 | 分析 API：`trend`（折線）、`breakdown`（圓餅）、`compare`（同期）、`kpi`（數字卡） |
| FR-05 | 電費計算採**台電住宅用電累進計價**：區分夏月（6/1–9/30）與非夏月，級距 120 / 330 / 500 / 700 / 1000 度 |
| FR-06 | 碳排量 = `kWh × CO₂ 係數`，預設 `0.495 kg CO₂e/kWh`（台電 2023 公告值），可於設定頁調整 |
| FR-07 | 設定項目持久化儲存於 DB（不使用環境變數） |

## 5. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | UI 採用繁體中文 |
| NFR-02 | RWD：支援手機、平板、桌面斷點 |
| NFR-03 | API p95 回應時間 < 500 ms |
| NFR-04 | 部署於 Vercel：前端靜態 + 後端 serverless function + Vercel Postgres |
| NFR-05 | 版本要求：Node 20、React 18、Ant Design 5、Express 4、pg 8 |
| NFR-06 | 程式語言：前後端皆使用 TypeScript |

## 6. Out of Scope

- 使用者註冊、登入、權限
- 多家戶或共享
- 即時 IoT 感測器整合
- 線上繳費、金流串接
- 原生行動 App（iOS / Android）
- 推播通知、Email 通知

## 7. Open Questions / Assumptions

- **假設**：電表為單向抄錄，不考慮太陽能逆送電。
- **假設**：每月一次抄表；未支援雙月抄表（可於 `pricing.ts` 擴充級距倍數）。
- **Open**：是否預設 seed 示範資料？——預留 seed script，預設不啟用。
