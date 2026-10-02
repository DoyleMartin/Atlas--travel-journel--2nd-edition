import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set. Copy server/.env.example to server/.env and fill it in.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection failed:', (err as Error).message);
    console.error('Check the password in MONGO_URI and that your IP is allowed in Atlas → Network Access.');
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
}
