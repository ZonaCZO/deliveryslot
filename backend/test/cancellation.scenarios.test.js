import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { app, carrier, other, staff, now, date, valid, times, login, get, post, patch, book, available, setNow, setCarrier, setStaff, setupScenarios } from './helpers/scenarios.js';

setupScenarios();

describe('cancellation logic', () => {
  test('rejects another carrier, allows owner, rejects repeated cancellation and permits rebooking', async () => {
    const booking = await book().expect(201);
    const url = `/bookings/${booking.body.id}/cancel`;
    await patch(url, other).expect(403);
    expect((await get('/bookings/my')).body[0].status).toBe('active');
    expect((await patch(url).expect(200)).body.status).toBe('cancelled');
    await patch(url).expect(409);
    expect((await get('/bookings/my')).body[0].status).toBe('cancelled');
    const second = await book(valid, other).expect(201);
    expect(second.body.booking_reference).not.toBe(booking.body.booking_reference);
  });
  test('rejects cancellation exactly when the slot starts', async () => {
    const slot = (await available()).body[0];
    const booking = await book().expect(201);
    setNow(Date.parse(slot.start_time_utc));
    setCarrier((await login('carrier@test.com', 'CarrierDemo123!').expect(200)).body.token);
    await patch(`/bookings/${booking.body.id}/cancel`).expect(409);
  });
  test.each([['no', 400], ['99999', 404]])('handles cancellation id %s', async (id, code) => {
    await patch(`/bookings/${id}/cancel`).expect(code);
  });
});
