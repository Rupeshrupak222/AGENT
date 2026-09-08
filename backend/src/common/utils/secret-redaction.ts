const SENSITIVE_PATTERNS = [
  /password/gi,
  /secret/gi,
  /token/gi,
  /api[_-]?key/gi,
  /auth[_-]?token/gi,
  /access[_-]?key/gi,
  /credentials?/gi,
  /jwt[_-]?secret/gi,
  /refresh[_-]?secret/gi,
];

const SENSITIVE_KEY_NAMES = new Set([
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authToken',
  'auth_token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'jwtSecret',
  'jwt_secret',
  'twilioAuthToken',
  'TWILIO_AUTH_TOKEN',
  'DEEPGRAM_API_KEY',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'R2_SECRET_ACCESS_KEY',
  'EXOTEL_API_TOKEN',
  'RAZORPAY_KEY_SECRET',
]);

const MASKED = '***REDACTED***';

export function redactSecrets(obj: any, depth = 0): any {
  if (depth > 10) return obj;
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return obj;
  }

  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSecrets(item, depth + 1));
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_NAMES.has(key)) {
      redacted[key] = MASKED;
    } else if (typeof value === 'string' && SENSITIVE_PATTERNS.some((p) => p.test(key))) {
      redacted[key] = MASKED;
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSecrets(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function redactString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  let result = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0;
  }
  result = result.replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, '$1' + MASKED);
  result = result.replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic ' + MASKED);
  return result;
}
