import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Behind Vercel/Railway proxies: needed for correct client IPs (rate limiting) and secure cookies
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({ ok: dbConnected, db: dbConnected ? 'connected' : 'disconnected' });
});

// Feature routers are mounted here as each phase is built, e.g.
// app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
