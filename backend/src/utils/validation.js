import { DateTime } from 'luxon';
import { requireThat } from './errors.js';
export function id(value) {
  requireThat(/^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647, 400, 'Invalid ID');
  return Number(value);
}
export function text(value, name, max) {
  requireThat(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, 400, `Invalid ${name}`);
  return value.trim();
}
export function email(value) {
  const result = text(value, 'email', 255);
  requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result), 400, 'Invalid email'); return result;
}
export function dateRange(value) {
  requireThat(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 400, 'Date must be YYYY-MM-DD');
  const start = DateTime.fromISO(value, { zone: 'Europe/Warsaw' });
  requireThat(start.isValid, 400, 'Invalid date');
  return [start.toUTC().toSQL({ includeOffset: false }), start.plus({ days: 1 }).toUTC().toSQL({ includeOffset: false })];
}
export function slotTimes(body) {
  const parse = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(value) ? DateTime.fromISO(value, { setZone: true }) : DateTime.invalid('format');
  const start = parse(body.startTime), end = parse(body.endTime);
  requireThat(start.isValid && end.isValid && end.toMillis() - start.toMillis() === 3600000, 400, 'Provide offset timestamps for a 60-minute slot');
  requireThat(start.toMillis() > Date.now(), 409, 'Slot must be in the future');
  return [start.toUTC().toSQL({ includeOffset: false }), end.toUTC().toSQL({ includeOffset: false })];
}
