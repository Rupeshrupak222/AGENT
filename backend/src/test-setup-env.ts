// Jest safety net: strip known ambient secret keys from the worker process
// BEFORE any test module is imported. This neutralizes keys that can leak in
// via the Prisma client's schema-relative .env auto-load, the developer
// environment, or dotenv side effects. @nestjs/config's ConfigService.get()
// prefers process.env over an explicitly-provided config object, so any
// residual value would otherwise defeat hermetic specs.
const SENSITIVE_ENV_KEYS = [
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'DEEPGRAM_API_KEY',
  'ELEVENLABS_API_KEY',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'CALCOM_API_KEY',
  'CALCOM_API_URL',
  'CALCOM_EVENT_TYPE_ID',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
];

for (const key of SENSITIVE_ENV_KEYS) {
  delete process.env[key];
}