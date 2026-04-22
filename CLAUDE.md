# SmartWatt — Claude 工作規則

## 任務追蹤

每完成一個 tasks.md 裡的任務項目後，**立即更新 `docs/tasks.md`**：
- 將對應任務的 `[ ]` 改為 `[x]`
- 若有需要補充的備註（例如技術決策、與原設計的差異），在該任務下方加一行 `  - ✦ 備註內容`

不需要等使用者提醒，完成即更新。

## 專案背景

- Monorepo：pnpm workspaces + Turborepo
- 前端：`apps/web`（React 18 + Vite + Ant Design 5）
- 後端：`apps/api`（Express 4 + TypeScript）
- 資料庫：**Neon**（PostgreSQL），連線字串在 `apps/api/.env`
- 工作文件：`docs/spec.md`（需求）、`docs/plan.md`（架構）、`docs/tasks.md`（進度）

## 開發習慣

- TypeScript interface 從其他模組 import 時使用 `import type`
- antd Modal 用 `destroyOnHidden`（不用已棄用的 `destroyOnClose`）
- 日期顯示統一用 `dayjs(value).format('YYYY-MM-DD')`
