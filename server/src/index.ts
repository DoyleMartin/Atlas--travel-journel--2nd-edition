import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = Number(process.env.PORT) || 5000;

await connectDB();

const server = app.listen(PORT, () => console.log(`Atlas server listening on port ${PORT}`));

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close();
  await mongoose.connection.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
