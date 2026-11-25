import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { app, carrier, other, staff, now, date, valid, times, login, get, post, patch, book, available, setNow, setCarrier, setStaff, setupScenarios } from './helpers/scenarios.js';

setupScenarios();

describe('warehouses API', () => {
  test('lists and retrieves the single warehouse', async () => {
    const list = await get('/warehouses').expect(200);
    const detail = await get('/warehouses/1').expect(200);
    expect(list.body).toEqual([detail.body]);
    expect(detail.body).toMatchObject({ id: 1, timeZone: 'Europe/Warsaw', bays: 1 });
  });
  test.each([['/warehouses/2', 404], ['/warehouses/no', 400]])('handles %s with %i', async (path, code) => {
    await get(path).expect(code);
  });
});
