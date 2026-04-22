import express from 'express';
import cors from 'cors';
import billsRouter from './routes/bills';
import appliancesRouter from './routes/appliances';
import usageRouter from './routes/usage';
import settingsRouter from './routes/settings';
import analyticsRouter from './routes/analytics';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/api/bills', billsRouter);
app.use('/api/appliances', appliancesRouter);
app.use('/api/usage', usageRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/analytics', analyticsRouter);

app.use(errorHandler);

export default app;
