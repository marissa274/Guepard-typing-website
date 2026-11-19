/** @jest-environment node */
import {afterEach, beforeEach, expect, test} from '@jest/globals';
import {isAllowedOrigin} from '../src/server/request-origin';

const publicOrigin = 'https://guepard-typing-website-production.up.railway.app';
const originalEnv = {...process.env};
/** Next declares NODE_ENV read-only; the tests need to switch it on the current env object. */
function setNodeEnv(value: string) {
  const env: Record<string, string | undefined> = process.env;
  env.NODE_ENV = value;
}
function request(origin: string | undefined, extra: Record<string, string> = {}): Request {
  const headers = {...extra, ...(origin === undefined ? {} : {origin})};
  return new Request('http://localhost:5173/api/auth', {headers});
}
beforeEach(() => {
  setNodeEnv('production');
  delete process.env.APP_URL;
  process.env.RAILWAY_PUBLIC_DOMAIN = new URL(publicOrigin).host;
});
afterEach(() => {process.env = {...originalEnv};});

test('Railway HTTPS origin is accepted behind an internal HTTP address', () => {
  expect(isAllowedOrigin(request(publicOrigin))).toBe(true);
});
test('foreign origins, null origins and local addresses remain blocked in production', () => {
  for (const origin of ['https://attacker.example', 'null', 'http://localhost:5173']) {
    expect(isAllowedOrigin(request(origin))).toBe(false);
  }
});
test('forwarded request headers cannot authorize a foreign origin', () => {
  expect(isAllowedOrigin(request('https://attacker.example', {
    'x-forwarded-host': 'attacker.example', 'x-forwarded-proto': 'https'
  }))).toBe(false);
});
test('APP_URL accepts a configured custom domain and rejects lookalikes', () => {
  process.env.APP_URL = 'https://custom.example/';
  expect(isAllowedOrigin(request('https://custom.example'))).toBe(true);
  expect(isAllowedOrigin(request('https://custom.example.attacker.example'))).toBe(false);
  expect(isAllowedOrigin(request(publicOrigin))).toBe(true);
});
test('invalid public URL configuration fails closed', () => {
  delete process.env.RAILWAY_PUBLIC_DOMAIN;
  process.env.APP_URL = 'not a URL';
  expect(isAllowedOrigin(request('http://localhost:5173'))).toBe(false);
});
test('local development accepts the exact local origin, including its port', () => {
  delete process.env.RAILWAY_PUBLIC_DOMAIN;
  setNodeEnv('development');
  expect(isAllowedOrigin(request('http://localhost:5173'))).toBe(true);
  expect(isAllowedOrigin(request('http://localhost:3000'))).toBe(false);
});
test('requests without an Origin preserve existing behavior', () => {
  expect(isAllowedOrigin(request(undefined))).toBe(true);
});
