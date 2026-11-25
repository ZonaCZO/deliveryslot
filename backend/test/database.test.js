import { describe, test, expect, jest, afterEach } from '@jest/globals';
import { DeliveryService } from '../src/services/delivery.js';
import { mysqlUsers } from '../src/db/users.js';
import { createPool } from '../src/db/pool.js';
import mysql from 'mysql2/promise';

afterEach(() => jest.restoreAllMocks());
function fixture(replies = []) {
  const db = {
    beginTransaction: jest.fn().mockResolvedValue(), commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(), release: jest.fn(),
    execute: jest.fn(async () => {
      if (!replies.length) throw new Error('Unexpected database operation');
      const reply = replies.shift(); if (reply instanceof Error) throw reply; return [reply];
    }),
  };
  const pool = { getConnection: jest.fn().mockResolvedValue(db), execute: db.execute };
  return { db, pool, service: new DeliveryService(pool) };
}
const data = { slotId: 7, carrierName: "O'Brien", truckRegistration: 'WA123', contactEmail: 'a@b.com' };
describe('MySQL connection and user access', () => {
  test('pool uses UTC, bounded connections and configured credentials', () => {
    const spy = jest.spyOn(mysql, 'createPool').mockReturnValue({});
    createPool();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'Z', connectionLimit: 10, queueLimit: 100 }));
  });
  test('user lookup parameterizes email and returns safe user fields by ID', async () => {
    const injection = "' OR 1=1 --";
    const { pool, db } = fixture([[{ id: 1, password_hash: 'hash' }], [{ id: 1, email: 'a@b.com', role: 'carrier' }], []]);
    const users = mysqlUsers(pool);
    expect((await users.byEmail(injection)).id).toBe(1);
    expect(db.execute.mock.calls[0]).toEqual([expect.stringContaining('WHERE email=?'), [injection]]);
    expect(await users.byId(1)).not.toHaveProperty('password_hash');
    expect(await users.byId(999)).toBeUndefined();
  });
});
describe('MySQL transactions and double booking', () => {
  test('booking locks slot, commits and uses the authenticated owner', async () => {
    const { service, db } = fixture([[{ future: 1, status: 'open' }], [], { insertId: 8 }, [{ id: 8, status: 'active' }]]);
    expect(await service.book(3, data)).toEqual({ id: 8, status: 'active' });
    expect(db.execute.mock.calls[0][0]).toContain('FOR UPDATE');
    const insert = db.execute.mock.calls.find(([sql]) => sql.includes('INSERT INTO bookings'));
    expect(insert[0]).not.toContain(data.carrierName);
    expect(insert[1]).toEqual([expect.any(String), 3, 7, data.carrierName, data.truckRegistration, data.contactEmail]);
    expect(db.commit).toHaveBeenCalledTimes(1);
    expect(db.rollback).not.toHaveBeenCalled(); expect(db.release).toHaveBeenCalledTimes(1);
  });
  test.each([
    [[[]], 404], [[[{ future: 0, status: 'open' }]], 409],
    [[[{ future: 1, status: 'closed' }]], 409], [[[{ future: 1, status: 'open' }], [{ id: 5 }]], 409],
  ])('rolls back unavailable booking %#', async (replies, status) => {
    const { service, db } = fixture(replies);
    await expect(service.book(3, data)).rejects.toMatchObject({ status });
    expect(db.rollback).toHaveBeenCalledTimes(1); expect(db.commit).not.toHaveBeenCalled(); expect(db.release).toHaveBeenCalledTimes(1);
  });
  test('unique database constraint conflict becomes 409 and rolls back', async () => {
    const error = Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
    const { service, db } = fixture([[{ future: 1, status: 'open' }], [], error]);
    await expect(service.book(3, data)).rejects.toMatchObject({ status: 409 });
    expect(db.rollback).toHaveBeenCalled(); expect(db.release).toHaveBeenCalled();
  });
  test('unexpected database error rolls back and releases connection', async () => {
    const error = new Error('connection lost');
    const { service, db } = fixture([error]);
    await expect(service.book(3, data)).rejects.toBe(error);
    expect(db.rollback).toHaveBeenCalled(); expect(db.release).toHaveBeenCalled();
  });
});
describe('MySQL cancellation and staff writes', () => {
  test.each([
    [[[]], 404], [[[{ slot_id: 7 }], [{ future: 1 }], [{ carrier_user_id: 4, status: 'active' }]], 403],
    [[[{ slot_id: 7 }], [{ future: 0 }], [{ carrier_user_id: 3, status: 'active' }]], 409],
    [[[{ slot_id: 7 }], [{ future: 1 }], [{ carrier_user_id: 3, status: 'cancelled' }]], 409],
  ])('cancellation refuses missing/foreign/past/cancelled booking %#', async (replies, status) => {
    const { service, db } = fixture(replies);
    await expect(service.cancel(3, 8)).rejects.toMatchObject({ status });
    expect(db.rollback).toHaveBeenCalled(); expect(db.release).toHaveBeenCalled();
  });
  test('cancellation locks slot before booking and commits status update', async () => {
    const { service, db } = fixture([[{ slot_id: 7 }], [{ future: 1 }], [{ carrier_user_id: 3, status: 'active' }], {}]);
    expect(await service.cancel(3, 8)).toEqual({ id: 8, status: 'cancelled' });
    expect(db.execute.mock.calls[1][0]).toContain('delivery_slots');
    expect(db.execute.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(db.execute.mock.calls[2][0]).toContain('FOR UPDATE');
    expect(db.commit).toHaveBeenCalled();
  });
  test.each([[[[]], 404], [[[{ future: 0 }]], 409], [[[{ future: 1 }], [{ id: 8 }]], 409]])('staff status change rejects invalid slot %#', async (replies, status) => {
    const { service } = fixture(replies);
    await expect(service.setSlotStatus(7, 'closed')).rejects.toMatchObject({ status });
  });
  test('staff status update commits', async () => {
    const { service, db } = fixture([[{ future: 1 }], [], {}]);
    expect(await service.setSlotStatus(7, 'closed')).toEqual({ id: 7, status: 'closed' });
    expect(db.execute).toHaveBeenLastCalledWith('UPDATE delivery_slots SET status=? WHERE id=?', ['closed', 7]);
    expect(db.commit).toHaveBeenCalled();
  });
  test('slot creation acquires/releases advisory lock and connection', async () => {
    const { service, db } = fixture([[{ acquired: 1 }], [], { insertId: 9 }, []]);
    expect(await service.createSlot(['2030-06-01 08:00:00', '2030-06-01 09:00:00'])).toEqual({ id: 9, status: 'open' });
    expect(db.execute.mock.calls[0][0]).toContain('GET_LOCK');
    expect(db.execute.mock.calls.at(-1)[0]).toContain('RELEASE_LOCK'); expect(db.release).toHaveBeenCalled();
  });
  test('overlap releases advisory lock without inserting', async () => {
    const { service, db } = fixture([[{ acquired: 1 }], [{ id: 9 }], []]);
    await expect(service.createSlot(['a', 'b'])).rejects.toMatchObject({ status: 409 });
    expect(db.execute.mock.calls.some(([sql]) => sql.includes('INSERT'))).toBe(false);
    expect(db.execute.mock.calls.at(-1)[0]).toContain('RELEASE_LOCK'); expect(db.release).toHaveBeenCalled();
  });
  test('lock timeout returns 503 and releases connection', async () => {
    const { service, db } = fixture([[{ acquired: 0 }]]);
    await expect(service.createSlot(['a', 'b'])).rejects.toMatchObject({ status: 503 });
    expect(db.release).toHaveBeenCalled();
  });
});
describe('MySQL read queries', () => {
  test('available query filters future open unbooked slots within date range', async () => {
    const { service, db } = fixture([[{ id: 1 }]]);
    expect(await service.available(['start', 'end'])).toEqual([{ id: 1 }]);
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toContain('UTC_TIMESTAMP()'); expect(sql).toContain("s.status='open'");
    expect(sql).toContain('NOT EXISTS'); expect(params).toEqual(['start', 'end']);
  });
  test('own bookings are scoped to authenticated owner', async () => {
    const { service, db } = fixture([[]]); await service.own(3);
    expect(db.execute.mock.calls[0]).toEqual([expect.stringContaining('WHERE b.carrier_user_id=?'), [3]]);
  });
  test('schedule includes slots without bookings and only active booking details', async () => {
    const { service, db } = fixture([[]]); await service.schedule(['start', 'end']);
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toContain('LEFT JOIN'); expect(sql).toContain("b.status='active'"); expect(params).toEqual(['start', 'end']);
  });
});
