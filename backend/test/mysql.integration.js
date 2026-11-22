import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createPool } from '../src/db/pool.js';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/utils/passwords.js';

test('MySQL: concurrent booking, cancellation, ownership, time and staff rules', { skip: process.env.RUN_MYSQL_TESTS !== '1' }, async () => {
  const pool = createPool();
  const userIds = [], slotIds = [];
  const suffix = randomUUID();
  try {
    const password_hash = await hashPassword('integration-password');
    for (const role of ['carrier', 'carrier', 'warehouse_staff']) {
      const [result] = await pool.execute('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [`${userIds.length}-${suffix}@test.com`, password_hash, role]);
      userIds.push(result.insertId);
    }
    // Far-future dedicated fixtures; no truncation or changes to seed data.
    for (const [start, end, status] of [
      ['2098-06-01 08:00:00', '2098-06-01 09:00:00', 'open'],
      ['2098-06-01 09:00:00', '2098-06-01 10:00:00', 'closed'],
      ['2000-06-01 08:00:00', '2000-06-01 09:00:00', 'open'],
    ]) {
      const [result] = await pool.execute('INSERT INTO delivery_slots (start_time_utc, end_time_utc, status) VALUES (?, ?, ?)', [start, end, status]);
      slotIds.push(result.insertId);
    }
    const app = createApp(pool);
    const tokens = [];
    for (let i = 0; i < 3; i++) {
      const login = await request(app).post('/auth/login').send({ email: `${i}-${suffix}@test.com`, password: 'integration-password' }).expect(200);
      tokens.push(`Bearer ${login.body.token}`);
    }
    const body = slotId => ({ slotId, carrierName: 'Integration', truckRegistration: 'TEST123', contactEmail: 'test@example.com' });
    const book = (slotId, token = tokens[0]) => request(app).post('/bookings').set('Authorization', token).send(body(slotId));
    const results = await Promise.all([book(slotIds[0]), book(slotIds[0])]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    const bookingId = results.find(r => r.status === 201).body.id;
    const [[count]] = await pool.execute("SELECT COUNT(*) AS total FROM bookings WHERE slot_id=? AND status='active'", [slotIds[0]]);
    assert.equal(count.total, 1);
    await book(slotIds[1]).expect(409);
    await book(slotIds[2]).expect(409);
    await request(app).patch(`/bookings/${bookingId}/cancel`).set('Authorization', tokens[1]).expect(403);
    const other = await request(app).get('/bookings/my').set('Authorization', tokens[1]).expect(200);
    assert.equal(other.body.length, 0);
    await request(app).patch(`/staff/slots/${slotIds[0]}/close`).set('Authorization', tokens[2]).expect(409);
    await request(app).patch(`/bookings/${bookingId}/cancel`).set('Authorization', tokens[0]).expect(200);
    await request(app).patch(`/bookings/${bookingId}/cancel`).set('Authorization', tokens[0]).expect(409);
    const rebooked = await book(slotIds[0]).expect(201);
    // Move only our fixture to the past to verify cancellation cutoff.
    await pool.execute("UPDATE delivery_slots SET start_time_utc='2000-06-02 08:00:00', end_time_utc='2000-06-02 09:00:00' WHERE id=?", [slotIds[0]]);
    await request(app).patch(`/bookings/${rebooked.body.id}/cancel`).set('Authorization', tokens[0]).expect(409);
    await request(app).patch(`/staff/slots/${slotIds[1]}/reopen`).set('Authorization', tokens[2]).expect(200);
    await request(app).patch(`/staff/slots/${slotIds[1]}/close`).set('Authorization', tokens[2]).expect(200);
    const available = await request(app).get('/slots?date=2098-06-01').set('Authorization', tokens[0]).expect(200);
    assert.equal(available.body.some(s => slotIds.includes(s.id)), false);
    const schedule = await request(app).get('/staff/schedule?date=2000-06-02').set('Authorization', tokens[2]).expect(200);
    assert.equal(schedule.body.find(s => s.id === slotIds[0]).booking_id, rebooked.body.id);
    await request(app).post('/staff/slots').set('Authorization', tokens[2]).send({ startTime: '2098-06-01T09:30:00Z', endTime: '2098-06-01T10:30:00Z' }).expect(409);
  } finally {
    for (const id of userIds) await pool.execute('DELETE FROM bookings WHERE carrier_user_id=?', [id]);
    for (const id of slotIds) await pool.execute('DELETE FROM delivery_slots WHERE id=?', [id]);
    for (const id of userIds) await pool.execute('DELETE FROM users WHERE id=?', [id]);
    await pool.end();
  }
});
