import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createJsonBackend } from '../src/services/json-delivery.js';
import { hashPassword, verifyPassword } from '../src/utils/passwords.js';
import { dateRange } from '../src/utils/validation.js';
test('passwords verify securely and reject placeholder seed hashes', async () => {
  const hash = await hashPassword('correct');
  assert.equal(await verifyPassword('correct', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
  assert.equal(await verifyPassword('correct', 'TEST_HASH_NOT_FOR_LOGIN'), false);
});
test('Warsaw date validation includes daylight saving transitions', () => {
  const [start, end] = dateRange('2026-03-29');
  assert.equal((Date.parse(end + 'Z') - Date.parse(start + 'Z')) / 3600000, 23);
  assert.throws(() => dateRange('2026-02-30'));
});
test('missing authentication and invalid login do not expose accounts', async () => {
  const app = createApp(null, await createJsonBackend());
  await request(app).get('/slots?date=2026-12-03').expect(401);
  const wrong = await request(app).post('/auth/login').send({ email: 'carrier@test.com', password: 'wrong' }).expect(401);
  const missing = await request(app).post('/auth/login').send({ email: 'unknown@test.com', password: 'wrong' }).expect(401);
  assert.deepEqual(wrong.body, missing.body);
  await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{').expect(400);
});

