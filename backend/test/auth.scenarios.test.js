import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { app, carrier, other, staff, now, date, valid, times, login, get, post, patch, book, available, setNow, setCarrier, setStaff, setupScenarios } from './helpers/scenarios.js';

setupScenarios();

describe('auth API', () => {
  test('login and /me expose the correct identity without passwords', async () => {
    const result = await get('/auth/me').expect(200);
    expect(result.body).toEqual({ id: 1, email: 'carrier@test.com', role: 'carrier' });
    const result2 = await login('staff@test.com', 'StaffDemo123!').expect(200);
    expect(result2.body.user.password).toBeUndefined();
    expect(result2.body.user.password_hash).toBeUndefined();
    expect(result2.body.token).toMatch(/^[a-f0-9]{64}$/);
  });
  test.each([{}, { email: 'bad', password: 'test' }, { email: 'carrier@test.com' }, { email: 'carrier@test.com', password: 123 }])('rejects invalid login body %j', async body => {
    await request(app).post('/auth/login').send(body).expect(400);
  });
  test.each(['garbage', '0'.repeat(64)])('rejects invalid token %s', async token => {
    await get('/auth/me', token).expect(401);
  });
  test('logout revokes only the current session', async () => {
    await post('/auth/logout', {}).expect(204);
    await get('/auth/me').expect(401);
    await get('/auth/me', other).expect(200);
  });
  test('expired session returns 401', async () => {
    setNow(now + 28801 * 1000);
    await get('/auth/me').expect(401);
  });
  test('login rate limiting blocks excessive attempts', async () => {
    for (let i = 0; i < 27; i++) await request(app).post('/auth/login').send({}).expect(400);
    await request(app).post('/auth/login').send({}).expect(429);
  });
});
