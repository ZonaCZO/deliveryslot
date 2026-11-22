import { randomUUID } from 'node:crypto';
import { requireThat, HttpError } from '../utils/errors.js';
export class DeliveryService {
  constructor(pool) { this.pool = pool; }
  async transaction(work) {
    const db = await this.pool.getConnection();
    try {
      await db.beginTransaction(); const result = await work(db); await db.commit(); return result;
    } catch (error) {
      await db.rollback();
      if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Slot already booked');
      throw error;
    } finally { db.release(); }
  }
  async available(range) {
    const [rows] = await this.pool.execute(`SELECT s.* FROM delivery_slots s
      WHERE s.start_time_utc >= ? AND s.start_time_utc < ? AND s.start_time_utc > UTC_TIMESTAMP()
      AND s.status='open' AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id=s.id AND b.status='active') ORDER BY s.start_time_utc`, range);
    return rows;
  }
  async book(userId, data) {
    return this.transaction(async db => {
      const [[slot]] = await db.execute('SELECT *, start_time_utc > UTC_TIMESTAMP() AS future FROM delivery_slots WHERE id=? FOR UPDATE', [data.slotId]);
      requireThat(slot, 404, 'Slot not found');
      requireThat(slot.future && slot.status === 'open', 409, 'Slot unavailable');
      const [[existing]] = await db.execute("SELECT id FROM bookings WHERE slot_id=? AND status='active'", [data.slotId]);
      requireThat(!existing, 409, 'Slot already booked');
      const [result] = await db.execute(`INSERT INTO bookings
        (booking_reference, carrier_user_id, slot_id, carrier_name, truck_registration, contact_email)
        VALUES (?, ?, ?, ?, ?, ?)`, [randomUUID(), userId, data.slotId, data.carrierName, data.truckRegistration, data.contactEmail]);
      const [[booking]] = await db.execute('SELECT id, booking_reference, slot_id, status FROM bookings WHERE id=?', [result.insertId]);
      return booking;
    });
  }
  async own(userId) {
    const [rows] = await this.pool.execute(`SELECT b.id, b.booking_reference, b.slot_id, b.carrier_name,
      b.truck_registration, b.contact_email, b.status, b.created_at, s.start_time_utc, s.end_time_utc
      FROM bookings b JOIN delivery_slots s ON s.id=b.slot_id WHERE b.carrier_user_id=? ORDER BY s.start_time_utc`, [userId]);
    return rows;
  }
  async cancel(userId, bookingId) {
    return this.transaction(async db => {
      const [[target]] = await db.execute('SELECT slot_id FROM bookings WHERE id=?', [bookingId]);
      requireThat(target, 404, 'Booking not found');
      // Same lock order as booking and staff status changes.
      const [[slot]] = await db.execute('SELECT start_time_utc > UTC_TIMESTAMP() AS future FROM delivery_slots WHERE id=? FOR UPDATE', [target.slot_id]);
      const [[booking]] = await db.execute('SELECT * FROM bookings WHERE id=? FOR UPDATE', [bookingId]);
      requireThat(booking.carrier_user_id === userId, 403, 'Booking belongs to another carrier');
      requireThat(booking.status === 'active' && slot.future, 409, 'Booking cannot be cancelled');
      await db.execute("UPDATE bookings SET status='cancelled' WHERE id=?", [bookingId]);
      return { id: bookingId, status: 'cancelled' };
    });
  }
  async schedule(range) {
    const [rows] = await this.pool.execute(`SELECT s.*, b.id AS booking_id, b.booking_reference,
      b.carrier_name, b.truck_registration, b.contact_email FROM delivery_slots s
      LEFT JOIN bookings b ON b.slot_id=s.id AND b.status='active'
      WHERE s.start_time_utc >= ? AND s.start_time_utc < ? ORDER BY s.start_time_utc`, range);
    return rows;
  }
  async createSlot(times) {
    const db = await this.pool.getConnection(); let locked = false;
    try {
      const [[lock]] = await db.execute("SELECT GET_LOCK('dockpoint:create-slot', 5) AS acquired");
      requireThat(lock.acquired === 1, 503, 'Slot management busy; retry'); locked = true;
      const [[overlap]] = await db.execute('SELECT id FROM delivery_slots WHERE start_time_utc < ? AND end_time_utc > ? LIMIT 1', [times[1], times[0]]);
      requireThat(!overlap, 409, 'Slot overlaps an existing slot');
      const [result] = await db.execute('INSERT INTO delivery_slots (start_time_utc, end_time_utc) VALUES (?, ?)', times);
      return { id: result.insertId, status: 'open' };
    } finally {
      try { if (locked) await db.execute("SELECT RELEASE_LOCK('dockpoint:create-slot')"); }
      finally { db.release(); }
    }
  }
  async setSlotStatus(slotId, status) {
    return this.transaction(async db => {
      const [[slot]] = await db.execute('SELECT *, start_time_utc > UTC_TIMESTAMP() AS future FROM delivery_slots WHERE id=? FOR UPDATE', [slotId]);
      requireThat(slot, 404, 'Slot not found'); requireThat(slot.future, 409, 'Slot has already started');
      const [[booking]] = await db.execute("SELECT id FROM bookings WHERE slot_id=? AND status='active'", [slotId]);
      requireThat(!booking, 409, 'Booked slot cannot be changed');
      await db.execute('UPDATE delivery_slots SET status=? WHERE id=?', [status, slotId]);
      return { id: slotId, status };
    });
  }
}
