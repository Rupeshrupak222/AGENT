import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

interface EnvCheck {
  key: string;
  required: boolean;
  description: string;
  condition?: (env: Record<string, string | undefined>) => boolean;
}

const ENV_CHECKS: EnvCheck[] = [
  { key: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
  { key: 'REDIS_HOST', required: true, description: 'Redis host for Bull queues' },
  { key: 'JWT_SECRET', required: true, description: 'JWT signing secret' },
  { key: 'JWT_REFRESH_SECRET', required: true, description: 'JWT refresh token secret' },

  {
    key: 'TWILIO_ACCOUNT_SID',
    required: false,
    description: 'Twilio Account SID (required for telephony)',
    condition: (env) => env.TELEPHONY_PROVIDER === 'twilio',
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    required: false,
    description: 'Twilio Auth Token (required for telephony)',
    condition: (env) => env.TELEPHONY_PROVIDER === 'twilio',
  },
  { key: 'GROQ_API_KEY', required: false, description: 'Groq API key for AI agent brain' },
  { key: 'GEMINI_API_KEY', required: false, description: 'Gemini API key for post-call analysis' },
  { key: 'DEEPGRAM_API_KEY', required: false, description: 'Deepgram API key for STT' },
];

export function validateEnvironment(): { valid: boolean; warnings: string[]; errors: string[] } {
  const env = process.env as Record<string, string | undefined>;
  const warnings: string[] = [];
  const errors: string[] = [];
  let valid = true;

  for (const check of ENV_CHECKS) {
    const value = env[check.key];

    if (check.condition && !check.condition(env)) {
      continue;
    }

    if (check.required && (!value || value.trim().length === 0)) {
      errors.push(`MISSING_REQUIRED: ${check.key} — ${check.description}`);
      valid = false;
    } else if (!check.required && (!value || value.trim().length === 0)) {
      warnings.push(`NOT_CONFIGURED: ${check.key} — ${check.description}`);
    }
  }

  const nodeEnv = env.NODE_ENV;
  if (nodeEnv === 'production') {
    const jwtSecret = env.JWT_SECRET;
    if (jwtSecret && jwtSecret.includes('change-in-production')) {
      warnings.push('INSECURE: JWT_SECRET contains default dev value — change for production');
    }
    const refreshSecret = env.JWT_REFRESH_SECRET;
    if (refreshSecret && refreshSecret.includes('change-in-production')) {
      warnings.push('INSECURE: JWT_REFRESH_SECRET contains default dev value — change for production');
    }
  }

  if (errors.length > 0) {
    logger.error('Environment validation FAILED:');
    for (const e of errors) {
      logger.error(`  ✗ ${e}`);
    }
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      logger.warn(`  ⚠ ${w}`);
    }
  }

  if (valid) {
    logger.log('Environment validation passed');
  }

  return { valid, warnings, errors };
}
