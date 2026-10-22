import mongoose from 'mongoose';
import { config, isMongoConfigured } from './env.js';

let dbStatus = 'not_configured';

export const connectDB = async () => {
  if (!isMongoConfigured()) {
    dbStatus = 'not_configured';
    console.info('[Database] MONGODB_URI not provided. Skipping database connection.');
    return;
  }

  try {
    dbStatus = 'connecting';
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    dbStatus = 'connected';
    console.info(`[Database] MongoDB connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    dbStatus = 'disconnected';
    console.error(`[Database] MongoDB connection failed: ${error.message}`);
    // Do not throw here so the server can still run in standalone mode if needed,
    // but dbStatus will accurately reflect disconnection.
  }
};

export const getDBStatus = () => {
  if (!isMongoConfigured()) {
    return 'not_configured';
  }

  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return stateMap[mongoose.connection.readyState] || dbStatus;
};

export default connectDB;
