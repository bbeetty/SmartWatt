import 'dotenv/config';
import app from './app';
import { runMigrations } from './db';

const PORT = process.env.PORT ?? 4000;

async function start() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`[api] running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
