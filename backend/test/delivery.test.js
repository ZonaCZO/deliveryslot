import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryService } from '../src/services/delivery.js';

function fixture(replies) {
  const events = [];
  const db = {
    beginTransaction: async () => events.push('begin'),
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
    execute: async (sql, params) => {
      events.push({ sql, params });
      assert.ok(replies.length, `Unexpected SQL: ${sql}`);
      const reply = replies.shift();
      if (reply instanceof Error) throw reply;
      return [reply];
    },
  };
  return { service: new DeliveryService({ getConnection: async () => db }), events };
}
const data = { slotId: 7, carrierName: 'Carrier', truckRegistration: 'WA123', contactEmail: 'a@b.com' };

test('booking transaction commits and uses authenticated carrier ID', async () => {
  const { service, events } = fixture([[{ future: 1, status: 'open' }], [], { insertId: 8 }, [{ id: 8 }]]);
  assert.deepEqual(await service.book(3, data), { id: 8 });
  assert.deepEqual(events.slice(-2), ['commit', 'release']);
  const insert = events.find(e => e.sql?.includes('INSERT INTO bookings'));
  assert.equal(insert.params[1], 3);
});
test('booking rejects missing, past, closed and occupied slots with rollback', async () => {
  for (const [replies, status] of [
    [[[]], 404],
    [[[{ future: 0, status: 'open' }]], 409],
    [[[{ future: 1, status: 'closed' }]], 409],
    [[[{ future: 1, status: 'open' }], [{ id: 8 }]], 409],
  ]) {
    const { service, events } = fixture(replies);
    await assert.rejects(service.book(3, data), e => e.status === status);
    assert.deepEqual(events.slice(-2), ['rollback', 'release']);
  }
});
test('database unique constraint violation becomes HTTP 409', async () => {
  const duplicate = Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
  const { service, events } = fixture([[{ future: 1, status: 'open' }], [], duplicate]);
  await assert.rejects(service.book(3, data), e => e.status === 409);
  assert.deepEqual(events.slice(-2), ['rollback', 'release']);
});
test('cancellation enforces ownership, active state and cutoff', async () => {
  for (const [owner, status, future, expected] of [
    [4, 'active', 1, 403], [3, 'cancelled', 1, 409], [3, 'active', 0, 409],
  ]) {
    const { service, events } = fixture([[{ slot_id: 7 }], [{ future }], [{ carrier_user_id: owner, status }]]);
    await assert.rejects(service.cancel(3, 8), e => e.status === expected);
    assert.deepEqual(events.slice(-2), ['rollback', 'release']);
  }
  const { service, events } = fixture([[{ slot_id: 7 }], [{ future: 1 }], [{ carrier_user_id: 3, status: 'active' }], {}]);
  assert.deepEqual(await service.cancel(3, 8), { id: 8, status: 'cancelled' });
  assert.deepEqual(events.slice(-2), ['commit', 'release']);
});
test('staff cannot close booked or past slots', async () => {
  for (const replies of [[[{ future: 0 }]], [[{ future: 1 }], [{ id: 8 }]]]) {
    const { service } = fixture(replies);
    await assert.rejects(service.setSlotStatus(7, 'closed'), e => e.status === 409);
  }
});
