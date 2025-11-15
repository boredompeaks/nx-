import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please copy .env.example to .env and configure your values');
  process.exit(1);
}

export const env = {
  // Supabase Configuration
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  
  // Application Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Security Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'fallback-encryption-key-32-chars',
  
  // Feature Flags
  ENABLE_REALTIME: process.env.ENABLE_REALTIME !== 'false',
  ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS === 'true',
  ENABLE_WEBRTC: process.env.ENABLE_WEBRTC === 'true',
  
  // Performance Configuration
  MAX_MESSAGE_LENGTH: parseInt(process.env.MAX_MESSAGE_LENGTH || '1000', 10),
  TYPING_TIMEOUT: parseInt(process.env.TYPING_TIMEOUT || '3000', 10),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // WebRTC Configuration
  WEBRTC_ICE_SERVERS: process.env.WEBRTC_ICE_SERVERS || '[{"urls":"stun:stun.l.google.com:19302"}]',
  
  // Validation helpers
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  isTest: () => process.env.NODE_ENV === 'test'
};

// Validate encryption key length
if (env.ENCRYPTION_KEY.length < 32 && env.isProduction()) {
  console.error('ENCRYPTION_KEY must be at least 32 characters in production');
  process.exit(1);
}

export function getEnvConfig() {
  const supabase = {
    url: process.env.SUPABASE_URL || 'https://example.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'sb_test_anon_key',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || 'sb_test_service_key'
  };

  return {
    supabase,
    environment: env.NODE_ENV,
  };
}
