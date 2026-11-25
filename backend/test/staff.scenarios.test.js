import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { app, carrier, other, staff, now, date, valid, times, login, get, post, patch, book, available, setNow, setCarrier, setStaff, setupScenarios } from './helpers/scenarios.js';

setupScenarios();

describe('staff schedule and slot management', () => {
  test('creates, closes and reopens a slot with corresponding carrier availability', async () => {
    const slot = (await post('/staff/slots', times, staff).expect(201)).body;
    const path = `/staff/slots/${slot.id}`;
    expect((await get('/slots?date=2030-06-17')).body.map(s => s.id)).toContain(slot.id);
    expect((await patch(`${path}/close`, staff).expect(200)).body.status).toBe('closed');
    expect((await get('/slots?date=2030-06-17')).body).toEqual([]);
    await book({ ...valid, slotId: slot.id }).expect(409);
    expect((await patch(`${path}/reopen`, staff).expect(200)).body.status).toBe('open');
    const schedule = await get('/staff/schedule?date=2030-06-17', staff).expect(200);
    expect(schedule.body[0]).toMatchObject({ id: slot.id, status: 'open', booking_id: null });
  });
  test('schedule includes closed and booked slots with active booking contact details', async () => {
    const booking = await book().expect(201);
    const schedule = (await get(`/staff/schedule?date=${date}`, staff)).body;
    expect(schedule).toHaveLength(3);
    expect(schedule.find(s => s.id === 3).status).toBe('closed');
    expect(schedule.find(s => s.id === 1)).toMatchObject({ booking_id: booking.body.id, contact_email: valid.contactEmail });
    await patch(`/bookings/${booking.body.id}/cancel`).expect(200);
    expect((await get(`/staff/schedule?date=${date}`, staff)).body.find(s => s.id === 1).booking_id).toBeNull();
  });
  test('rejects duplicate, partial overlap and overlap with a closed slot; allows adjacent slots', async () => {
    await post('/staff/slots', times, staff).expect(201);
    await post('/staff/slots', times, staff).expect(409);
    await post('/staff/slots', { startTime: '2030-06-17T12:30:00Z', endTime: '2030-06-17T13:30:00Z' }, staff).expect(409);
    await post('/staff/slots', { startTime: '2030-06-11T08:00:00Z', endTime: '2030-06-11T09:00:00Z' }, staff).expect(409);
    await post('/staff/slots', { startTime: times.endTime, endTime: '2030-06-17T14:00:00Z' }, staff).expect(201);
  });
  test.each([
    [{}, 400], [{ ...times, endTime: '2030-06-17T12:30:00Z' }, 400],
    [{ ...times, startTime: '2030-06-17T12:00:00' }, 400],
    [{ startTime: '2020-01-01T12:00:00Z', endTime: '2020-01-01T13:00:00Z' }, 409],
  ])('validates slot creation %j', async (body, code) => { await post('/staff/slots', body, staff).expect(code); });
  test('cannot close/reopen booked, past or missing slots', async () => {
    await book().expect(201);
    for (const action of ['close', 'reopen']) {
      await patch(`/staff/slots/1/${action}`, staff).expect(409);
      await patch(`/staff/slots/99999/${action}`, staff).expect(404);
    }
    setNow(Date.UTC(2030, 5, 12, 10));
    setStaff((await login('staff@test.com', 'StaffDemo123!').expect(200)).body.token);
    await patch('/staff/slots/2/close', staff).expect(409);
  });
});
