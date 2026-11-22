import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { app, carrier, other, staff, now, date, valid, times, login, get, post, patch, book, available, setNow, setCarrier, setStaff, setupScenarios } from './helpers/scenarios.js';

setupScenarios();

describe('bookings API and double booking', () => {
  test('creates a reference and ignores forged owner/status fields', async () => {
    const result = await book({ ...valid, carrier_user_id: 3, status: 'cancelled' }).expect(201);
    expect(result.body).toMatchObject({ id: expect.any(Number), booking_reference: expect.any(String), slot_id: 1, status: 'active' });
    const mine = await get('/bookings/my').expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0]).toMatchObject({ id: result.body.id, carrier_name: valid.carrierName, truck_registration: valid.truckRegistration });
    expect((await get('/bookings/my', other)).body).toEqual([]);
  });
  test.each([{ slotId: -1 }, { slotId: 1.5 }, { carrierName: '' }, { carrierName: 'x'.repeat(256) }, { truckRegistration: '' }, { truckRegistration: 'x'.repeat(51) }, { contactEmail: 'bad' }])('rejects invalid booking %j', async fields => {
    await book({ ...valid, ...fields }).expect(400);
    expect((await get('/bookings/my')).body).toEqual([]);
  });
  test('rejects missing and closed slots', async () => {
    await book({ ...valid, slotId: 99999 }).expect(404);
    await book({ ...valid, slotId: 3 }).expect(409);
  });
  test('sequential duplicate booking returns 409', async () => {
    await book().expect(201);
    await book(valid, other).expect(409);
  });
  test('concurrent carriers get exactly one booking and one 409', async () => {
    const results = await Promise.all([book(), book(valid, other)]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    const schedule = await get(`/staff/schedule?date=${date}`, staff).expect(200);
    expect(schedule.body.filter(s => s.booking_id !== null)).toHaveLength(1);
  });
});
