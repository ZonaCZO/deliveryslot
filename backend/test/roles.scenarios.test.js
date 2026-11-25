import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { app, carrier, other, staff, now, date, valid, times, login, get, post, patch, book, available, setNow, setCarrier, setStaff, setupScenarios } from './helpers/scenarios.js';

setupScenarios();

describe('role checks', () => {
  test.each([
    ['get', '/staff/schedule?date=2030-06-11'], ['post', '/staff/slots'],
    ['patch', '/staff/slots/1/close'], ['patch', '/staff/slots/1/reopen'],
  ])('carrier cannot call %s %s', async (method, path) => {
    await request(app)[method](path).set('Authorization', `Bearer ${carrier}`).expect(403);
  });
  test.each([['post', '/bookings'], ['get', '/bookings/my'], ['patch', '/bookings/1/cancel']])('staff cannot call carrier API %s %s', async (method, path) => {
    await request(app)[method](path).set('Authorization', `Bearer ${staff}`).expect(403);
  });
  test.each([['get', '/warehouses'], ['get', '/slots?date=2030-06-11'], ['post', '/bookings'], ['get', '/bookings/my'], ['patch', '/bookings/1/cancel'], ['get', '/staff/schedule?date=2030-06-11']])('unauthenticated %s %s returns 401', async (method, path) => {
    await request(app)[method](path).expect(401);
  });
});
