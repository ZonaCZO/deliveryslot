import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { app, carrier, other, staff, now, date, valid, times, login, get, post, patch, book, available, setNow, setCarrier, setStaff, setupScenarios } from './helpers/scenarios.js';

setupScenarios();

describe('slots API and availability', () => {
  test('returns only open slots on the requested Warsaw date', async () => {
    const result = await available().expect(200);
    expect(result.body.map(s => s.id)).toEqual([1, 2]);
    expect(result.body.every(s => s.status === 'open')).toBe(true);
    expect((await get('/slots?date=2030-06-12').expect(200)).body.map(s => s.id)).toEqual([4]);
  });
  test.each(['/slots', '/slots?date=bad', '/slots?date=2030-02-30', '/slots?date=2030-06-11&date=2030-06-12'])('rejects invalid date %s', async path => {
    await get(path).expect(400);
  });
  test('past slots disappear and cannot be booked', async () => {
    setNow(Date.UTC(2030, 5, 11, 10));
    setCarrier((await login('carrier@test.com', 'CarrierDemo123!').expect(200)).body.token);
    expect((await available().expect(200)).body).toEqual([]);
    await book().expect(409);
  });
  test('booking removes availability; cancellation restores it', async () => {
    const result = await book().expect(201);
    expect((await available()).body.map(s => s.id)).toEqual([2]);
    await patch(`/bookings/${result.body.id}/cancel`).expect(200);
    expect((await available()).body.map(s => s.id)).toEqual([1, 2]);
  });
});
