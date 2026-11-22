import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPool } from '../src/db/pool.js';
import { DeliveryService } from '../src/services/delivery.js';
(process.env.RUN_MYSQL_TESTS === '1' ? test : test.skip)('MySQL concurrent booking, ownership, cancellation and rebooking', async () => {
  const pool = createPool(), service = new DeliveryService(pool);
  let userId, slotId;
  try {
    const [user] = await pool.execute("INSERT INTO users (email, password_hash, role) VALUES (?, 'TEST_HASH_NOT_FOR_LOGIN', 'carrier')", [`${randomUUID()}@test.com`]);
    userId = user.insertId;
    const [slot] = await pool.execute("INSERT INTO delivery_slots (start_time_utc, end_time_utc) VALUES ('2098-06-01 08:00:00','2098-06-01 09:00:00')");
    slotId = slot.insertId;
    const data = { slotId, carrierName: 'Test', truckRegistration: 'TEST123', contactEmail: 'test@example.com' };
    const results = await Promise.allSettled([service.book(userId, data), service.book(userId, data)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
    const booking = results.find(r => r.status === 'fulfilled').value;
    await assert.rejects(service.cancel(userId + 1, booking.id), e => e.status === 403);
    await service.cancel(userId, booking.id);
    await assert.rejects(service.cancel(userId, booking.id), e => e.status === 409);
    await service.book(userId, data);
    const [[count]] = await pool.execute("SELECT COUNT(*) AS total FROM bookings WHERE slot_id=? AND status='active'", [slotId]);
    assert.equal(count.total, 1);
  } finally {
    if (userId) await pool.execute('DELETE FROM bookings WHERE carrier_user_id=?', [userId]);
    if (slotId) await pool.execute('DELETE FROM delivery_slots WHERE id=?', [slotId]);
    if (userId) await pool.execute('DELETE FROM users WHERE id=?', [userId]);
    await pool.end();
  }
});

