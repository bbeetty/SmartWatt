# SmartWatt

家庭能源管理 Web App（練習專案）— 登記家庭用電資訊、呈現分析 Dashboard。

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: React 18 + TypeScript + Vite + Ant Design 5 + `@ant-design/plots`
- **Backend**: Node.js 20 + Express 4 + TypeScript（RESTful API）
- **Database**: Vercel Postgres
- **Deployment**: Vercel（前端靜態 + API serverless function）

## 專案結構

```
SmartWatt/
├── docs/                  # SDD 文件
│   ├── spec.md            # 需求規格
│   ├── plan.md            # 架構設計
│   └── tasks.md           # 工作拆解
└── apps/
    ├── web/               # React 前端（規劃中）
    └── api/               # Express 後端（規劃中）
```

## 開發流程（SDD）

本專案採用 **Spec-Driven Development 精簡版**：

1. `docs/spec.md` — 確認需求
2. `docs/plan.md` — 設計架構
3. `docs/tasks.md` — 依序執行工作項目

## 本機開發

```bash
pnpm install
pnpm dev           # 同時啟動 web (5173) 與 api (4000)
pnpm build         # 建置全部 workspace
pnpm test          # 執行測試
```

> 需事先建立 `.env` 並設定 `POSTGRES_URL`（可用本機 Docker 跑 Postgres 或連 Vercel Postgres dev instance）。

## 部署

Push 至 GitHub 後於 Vercel 匯入專案，自動偵測 `vercel.json`；於專案 Storage 新增 Postgres 即可自動注入 `POSTGRES_URL`。
