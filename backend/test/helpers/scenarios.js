import { beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createJsonBackend } from '../../src/services/json-delivery.js';

export let app, carrier, other, staff, now;
export const setNow = value => { now = value; };
export const setCarrier = value => { carrier = value; };
export const setStaff = value => { staff = value; };
export const date = '2030-06-11';
export const valid = { slotId: 1, carrierName: 'Test Carrier', truckRegistration: 'WA12345', contactEmail: 'carrier@test.com' };
export const times = { startTime: '2030-06-17T12:00:00Z', endTime: '2030-06-17T13:00:00Z' };
export const login = (email, password) => request(app).post('/auth/login').send({ email, password });
export const get = (path, token = carrier) => request(app).get(path).set('Authorization', `Bearer ${token}`);
export const post = (path, body, token = carrier) => request(app).post(path).set('Authorization', `Bearer ${token}`).send(body);
export const patch = (path, token = carrier) => request(app).patch(path).set('Authorization', `Bearer ${token}`);
export const book = (body = valid, token = carrier) => post('/bookings', body, token);
export const available = () => get(`/slots?date=${date}`);
export function setupScenarios() {
beforeEach(async () => {
  now = Date.UTC(2030, 5, 10, 10);
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  app = createApp(null, await createJsonBackend());
  carrier = (await login('carrier@test.com', 'CarrierDemo123!').expect(200)).body.token;
  other = (await login('carrier2@test.com', 'CarrierDemo123!').expect(200)).body.token;
  staff = (await login('staff@test.com', 'StaffDemo123!').expect(200)).body.token;
});
afterEach(() => jest.restoreAllMocks());


}
