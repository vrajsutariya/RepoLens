import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env relative to this config file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Also load any root .env as fallback
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};

export const isGeminiConfigured = () => Boolean(config.geminiApiKey && config.geminiApiKey.trim().length > 0);
export const isMongoConfigured = () => Boolean(config.mongoUri && config.mongoUri.trim().length > 0);

export default config;
