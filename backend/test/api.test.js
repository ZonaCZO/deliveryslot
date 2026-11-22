import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { hashPassword, verifyPassword } from '../src/utils/passwords.js';
import { dateRange, slotTimes } from '../src/utils/validation.js';

test('password hashing rejects wrong passwords and placeholder seed hashes', async () => {
  const hash = await hashPassword('correct password');
  assert.equal(await verifyPassword('correct password', hash), true);
  assert.equal(await verifyPassword('wrong password', hash), false);
  assert.equal(await verifyPassword('correct password', 'TEST_HASH_NOT_FOR_LOGIN'), false);
});
test('Warsaw date ranges handle daylight saving transitions and invalid dates', () => {
  const range = dateRange('2026-03-29');
  assert.equal((Date.parse(range[1] + 'Z') - Date.parse(range[0] + 'Z')) / 3600000, 23);
  assert.throws(() => dateRange('2026-02-30'));
  assert.throws(() => dateRange(['2026-12-03']));
  assert.throws(() => slotTimes({ startTime: '2026-12-03T08:00:00', endTime: '2026-12-03T09:00:00' }));
});
test('API authentication, role boundaries, validation and logout', async () => {
  const password_hash = await hashPassword('demo-password-123');
  const users = [
    { id: 1, email: 'carrier@test.com', role: 'carrier', password_hash },
    { id: 2, email: 'staff@test.com', role: 'warehouse_staff', password_hash },
  ];
  const pool = { execute: async (sql, params) => {
    const user = sql.includes('WHERE email') ? users.find(u => u.email === params[0]) : users.find(u => u.id === params[0]);
    return [[user].filter(Boolean)];
  } };
  const calls = [];
  const service = {
    available: async range => { calls.push(range); return []; },
    book: async (userId, data) => ({ id: 5, userId, ...data }),
    own: async userId => [{ carrier_user_id: userId }],
    schedule: async () => [],
  };
  const app = createApp(pool, { service });
  await request(app).get('/slots?date=2026-12-03').expect(401);
  const wrong = await request(app).post('/auth/login').send({ email: 'carrier@test.com', password: 'wrong' }).expect(401);
  const unknown = await request(app).post('/auth/login').send({ email: 'unknown@test.com', password: 'wrong' }).expect(401);
  assert.deepEqual(wrong.body, unknown.body);
  const login = async email => (await request(app).post('/auth/login').send({ email, password: 'demo-password-123' }).expect(200)).body;
  const carrier = await login('carrier@test.com');
  assert.equal(carrier.user.password_hash, undefined);
  const bearer = `Bearer ${carrier.token}`;
  await request(app).get('/staff/schedule?date=2026-12-03').set('Authorization', bearer).expect(403);
  await request(app).get('/warehouses').set('Authorization', bearer).expect(200);
  await request(app).get('/warehouses/2').set('Authorization', bearer).expect(404);
  await request(app).get('/slots?date=2026-02-30').set('Authorization', bearer).expect(400);
  await request(app).get('/slots?date=2026-12-03').set('Authorization', bearer).expect(200);
  assert.equal(calls.length, 1);
  await request(app).post('/bookings').set('Authorization', bearer).send({ slotId: -1 }).expect(400);
  const booking = await request(app).post('/bookings').set('Authorization', bearer).send({ slotId: 1, carrierName: 'Demo', truckRegistration: 'WA123', contactEmail: 'demo@test.com', carrier_user_id: 99 }).expect(201);
  assert.equal(booking.body.userId, 1);
  const own = await request(app).get('/bookings/my').set('Authorization', bearer).expect(200);
  assert.equal(own.body[0].carrier_user_id, 1);
  const staff = await login('staff@test.com');
  await request(app).get('/bookings/my').set('Authorization', `Bearer ${staff.token}`).expect(403);
  await request(app).get('/staff/schedule?date=2026-12-03').set('Authorization', `Bearer ${staff.token}`).expect(200);
  await request(app).post('/auth/logout').set('Authorization', bearer).expect(204);
  await request(app).get('/auth/me').set('Authorization', bearer).expect(401);
  await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{').expect(400);
});
