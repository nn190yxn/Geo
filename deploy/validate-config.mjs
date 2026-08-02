import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envFile = resolve(process.argv[2] ?? 'deploy/compose.env.example');
const values = parseEnv(readFileSync(envFile, 'utf8'));
const required = [
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'DATABASE_URL',
  'GEO_WEB_PORT',
  'GEO_API_PORT',
  'GEO_WEB_ORIGIN',
  'GEO_PUBLIC_API_URL'
];

for (const key of required) {
  if (!values[key]) throw new Error(`${key} is required in ${envFile}`);
}

const databaseUrl = new URL(values.DATABASE_URL);
const webOrigin = new URL(values.GEO_WEB_ORIGIN);
const publicApiUrl = new URL(values.GEO_PUBLIC_API_URL);

assert(databaseUrl.protocol === 'postgresql:', 'DATABASE_URL must use postgresql://');
assert(databaseUrl.hostname === 'database', 'DATABASE_URL host must match the Compose database service');
assert(decodeURIComponent(databaseUrl.username) === values.POSTGRES_USER, 'DATABASE_URL user must match POSTGRES_USER');
assert(decodeURIComponent(databaseUrl.password) === values.POSTGRES_PASSWORD, 'DATABASE_URL password must match POSTGRES_PASSWORD');
assert(databaseUrl.pathname === `/${values.POSTGRES_DB}`, 'DATABASE_URL database must match POSTGRES_DB');
assert(portOf(webOrigin) === values.GEO_WEB_PORT, 'GEO_WEB_ORIGIN port must match GEO_WEB_PORT');
assert(portOf(publicApiUrl) === values.GEO_API_PORT, 'GEO_PUBLIC_API_URL port must match GEO_API_PORT');
assert(publicApiUrl.pathname.replace(/\/$/, '') === '/api/v1', 'GEO_PUBLIC_API_URL must end with /api/v1');

console.log(`Packaging configuration is valid: ${envFile}`);

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator < 1) throw new Error(`Invalid environment line: ${line}`);
        return [line.slice(0, separator), line.slice(separator + 1)];
      })
  );
}

function portOf(url) {
  if (url.port) return url.port;
  return url.protocol === 'https:' ? '443' : '80';
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
