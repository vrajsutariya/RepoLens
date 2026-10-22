import dotenv from 'dotenv';

// Load environment variables immediately before any configuration is accessed
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
