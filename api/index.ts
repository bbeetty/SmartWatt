import serverless from 'serverless-http'
import app from '../apps/api/src/app'
import { runMigrations } from '../apps/api/src/db'

let handler: ReturnType<typeof serverless> | null = null

export default async function (req: Parameters<ReturnType<typeof serverless>>[0], res: Parameters<ReturnType<typeof serverless>>[1]) {
  if (!handler) {
    await runMigrations()
    handler = serverless(app)
  }
  return handler(req, res)
}
