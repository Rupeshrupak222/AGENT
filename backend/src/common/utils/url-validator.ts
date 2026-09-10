/**
 * Shared SSRF-safe URL validation for external provider calls.
 * Blocks private IPs, localhost, and non-HTTPS URLs.
 */
export interface UrlValidationResult {
  isValid: boolean;
  reason?: string;
}

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
];

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  '169.254.169.254',
  '0.0.0.0',
  '127.0.0.1',
  '[::1]',
]);

export function validateExternalUrl(
  urlStr: string,
  allowedHostPatterns?: RegExp[],
): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { isValid: false, reason: 'MALFORMED_URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { isValid: false, reason: 'HTTPS_REQUIRED' };
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost')) {
    return { isValid: false, reason: 'LOCALHOST_BLOCKED' };
  }

  if (isIpLiteral(host)) {
    return { isValid: false, reason: 'IP_LITERAL_BLOCKED' };
  }

  if (allowedHostPatterns && allowedHostPatterns.length > 0) {
    const matches = allowedHostPatterns.some((re) => re.test(host));
    if (!matches) {
      return { isValid: false, reason: 'HOST_NOT_IN_ALLOWLIST' };
    }
  }

  return { isValid: true };
}

export function isIpLiteral(host: string): boolean {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return PRIVATE_IP_RANGES.some((re) => re.test(host));
  }
  if (/^\[?[0-9a-f:]+\]?$/.test(host) && host.includes(':')) {
    return true;
  }
  if (/^[a-z0-9\-]+\.internal$/i.test(host)) {
    return true;
  }
  return false;
}
