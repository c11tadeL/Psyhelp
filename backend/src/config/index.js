const { z } = require('zod');

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  PSYHELP_APP_DB_URL: z.string().url(),
  PSYHELP_DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
  PSYHELP_DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
  PSYHELP_DB_IDLE_TIMEOUT: z.coerce.number().int().min(1000).default(30000),

  // Encryption 
  PSYHELP_ENCRYPTION_KEY: z.string().min(32),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Bcrypt
  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),
});

let config;

try {
  config = ConfigSchema.parse(process.env);
} catch (err) {
  console.error('❌ Invalid environment configuration:');
  if (err.issues) {
    for (const issue of err.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
  } else {
    console.error(err);
  }
  process.exit(1);
}

config.isDev = config.NODE_ENV === 'development';
config.isProd = config.NODE_ENV === 'production';
config.isTest = config.NODE_ENV === 'test';

module.exports = config;
