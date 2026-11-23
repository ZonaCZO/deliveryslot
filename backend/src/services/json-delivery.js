import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { hashPassword } from '../utils/passwords.js';
import { requireThat } from '../utils/errors.js';

// Demo fixtures are loaded into memory, never written over the original JSON.
export async function createJsonBackend() {
  const seed = JSON.parse(await readFile(new URL('../../data/demo.json', import.meta.url), 'utf8'));
  const accounts = await Promise.all(seed.users.map(async ({ password, ...user }) => ({ ...user, password_hash: await hashPassword(password) })));
  const slots = seed.slots.map((slot, index) => {
    const start = DateTime.now().setZone('Europe/Warsaw').startOf('day').plus({ days: slot.dayOffset, hours: slot.hour });
    return { id: index + 1, start_time_utc: start.toUTC().toISO(), end_time_utc: start.plus({ hours: 1 }).toUTC().toISO(), status: slot.status };
  });
  const bookings = [];
  let nextSlot = slots.length + 1, nextBooking = 1;
  const active = slotId => bookings.find(b => b.slot_id === slotId && b.status === 'active');
  const future = slot => Date.parse(slot.start_time_utc) > Date.now();
  const findSlot = slotId => {
    const slot = slots.find(s => s.id === slotId);
    requireThat(slot, 404, 'Slot not found'); return slot;
  };
  const millis = value => Date.parse(value.replace(' ', 'T') + 'Z');
  const inRange = (slot, range) => Date.parse(slot.start_time_utc) >= millis(range[0]) && Date.parse(slot.start_time_utc) < millis(range[1]);
  const users = {
    async byEmail(email) { return accounts.find(u => u.email.toLowerCase() === email.toLowerCase()); },
    async byId(id) {
      const user = accounts.find(u => u.id === id);
      if (!user) return undefined;
      const { password_hash, ...safe } = user; return safe;
    },
  };
  // Mutations intentionally have no await between availability checks and writes.
  // This makes concurrent requests atomic in the single demo process.
  const service = {
    async available(range) {
      return slots.filter(s => inRange(s, range) && future(s) && s.status === 'open' && !active(s.id)).sort((a, b) => Date.parse(a.start_time_utc) - Date.parse(b.start_time_utc));
    },
    async book(userId, data) {
      const slot = findSlot(data.slotId);
      requireThat(future(slot) && slot.status === 'open', 409, 'Slot unavailable');
      requireThat(!active(slot.id), 409, 'Slot already booked');
      const booking = { id: nextBooking++, booking_reference: randomUUID(), carrier_user_id: userId,
        slot_id: slot.id, carrier_name: data.carrierName, truck_registration: data.truckRegistration,
        contact_email: data.contactEmail, status: 'active', created_at: new Date().toISOString() };
      bookings.push(booking);
      return { id: booking.id, booking_reference: booking.booking_reference, slot_id: slot.id, status: booking.status };
    },
    async own(userId) {
      return bookings.filter(b => b.carrier_user_id === userId).map(({ carrier_user_id, ...b }) => {
        const slot = findSlot(b.slot_id);
        return { ...b, start_time_utc: slot.start_time_utc, end_time_utc: slot.end_time_utc };
      }).sort((a, b) => Date.parse(a.start_time_utc) - Date.parse(b.start_time_utc));
    },
    async cancel(userId, bookingId) {
      const booking = bookings.find(b => b.id === bookingId);
      requireThat(booking, 404, 'Booking not found');
      requireThat(booking.carrier_user_id === userId, 403, 'Booking belongs to another carrier');
      requireThat(booking.status === 'active' && future(findSlot(booking.slot_id)), 409, 'Booking cannot be cancelled');
      booking.status = 'cancelled'; return { id: bookingId, status: 'cancelled' };
    },
    async schedule(range) {
      return slots.filter(s => inRange(s, range)).map(s => {
        const booking = active(s.id);
        return { ...s, booking_id: booking?.id ?? null, booking_reference: booking?.booking_reference ?? null,
          carrier_name: booking?.carrier_name ?? null, truck_registration: booking?.truck_registration ?? null,
          contact_email: booking?.contact_email ?? null };
      }).sort((a, b) => Date.parse(a.start_time_utc) - Date.parse(b.start_time_utc));
    },
    async createSlot(times) {
      const [start, end] = times.map(millis);
      requireThat(!slots.some(s => Date.parse(s.start_time_utc) < end && Date.parse(s.end_time_utc) > start), 409, 'Slot overlaps an existing slot');
      const slot = { id: nextSlot++, start_time_utc: new Date(start).toISOString(), end_time_utc: new Date(end).toISOString(), status: 'open' };
      slots.push(slot); return { id: slot.id, status: slot.status };
    },
    async setSlotStatus(slotId, status) {
      const slot = findSlot(slotId);
      requireThat(future(slot), 409, 'Slot has already started');
      requireThat(!active(slotId), 409, 'Booked slot cannot be changed');
      slot.status = status; return { id: slotId, status };
    },
  };
  return { mode: 'json', users, service };
}
