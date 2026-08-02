const sensitiveFieldNames = new Set([
  'apikey',
  'authorization',
  'authorizationheader',
  'browserprofile',
  'browserprofilepath',
  'clientsecret',
  'cookie',
  'cookies',
  'credentialref',
  'credentialreference',
  'password',
  'profilepath',
  'providerpayload',
  'refreshtoken',
  'sessiontoken',
  'storagestate',
  'token'
]);

export function sanitizePublicResponse<T>(value: T): T {
  return sanitizeValue(value) as T;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitiveField(key))
      .map(([key, entryValue]) => [key, sanitizeValue(entryValue)])
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isSensitiveField(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'hascredential' || normalized === 'credentialrefmasked') {
    return false;
  }

  return sensitiveFieldNames.has(normalized)
    || normalized.includes('cookie')
    || normalized.includes('storagestate')
    || normalized.includes('browserprofile')
    || normalized.includes('authorization')
    || normalized.includes('credential')
    || normalized.endsWith('apikey')
    || normalized.endsWith('password')
    || normalized.endsWith('secret')
    || normalized.endsWith('token');
}
