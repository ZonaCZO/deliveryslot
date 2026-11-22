import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { verifyPassword } from '../utils/passwords.js';
import { id, text, email, dateRange, slotTimes } from '../utils/validation.js';
import { requireThat } from '../utils/errors.js';
import { role } from '../middleware/auth.js';
export function apiRouter(pool, service, auth) {
  const router = Router();
  router.post('/auth/login', rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }), async (req, res) => {
    const address = email(req.body.email);
    requireThat(typeof req.body.password === 'string' && req.body.password.length > 0 && req.body.password.length <= 1024, 400, 'Invalid password');
    const password = req.body.password;
    const [[user]] = await pool.execute('SELECT id, email, role, password_hash FROM users WHERE email=?', [address]);
    const valid = await verifyPassword(password, user?.password_hash);
    requireThat(valid && user, 401, 'Invalid email or password');
    const { password_hash, ...safeUser } = user;
    res.json({ token: auth.issue(user), tokenType: 'Bearer', user: safeUser });
  });
  router.use(auth.middleware);
  router.post('/auth/logout', (req, res) => { auth.revoke(req.token); res.sendStatus(204); });
  router.get('/auth/me', (req, res) => res.json(req.user));
  // Sprint 1 has one warehouse and one bay; do not invent a database table.
  const warehouse = { id: 1, name: 'DockPoint', timeZone: 'Europe/Warsaw', bays: 1 };
  router.get('/warehouses', (req, res) => res.json([warehouse]));
  router.get('/warehouses/:id', (req, res) => {
    requireThat(id(req.params.id) === warehouse.id, 404, 'Warehouse not found');
    res.json(warehouse);
  });
  router.get('/slots', async (req, res) => res.json(await service.available(dateRange(req.query.date))));
  router.post('/bookings', role('carrier'), async (req, res) => {
    const data = { slotId: id(req.body.slotId), carrierName: text(req.body.carrierName, 'carrierName', 255),
      truckRegistration: text(req.body.truckRegistration, 'truckRegistration', 50), contactEmail: email(req.body.contactEmail) };
    res.status(201).json(await service.book(req.user.id, data));
  });
  router.get('/bookings/my', role('carrier'), async (req, res) => res.json(await service.own(req.user.id)));
  router.patch('/bookings/:id/cancel', role('carrier'), async (req, res) => res.json(await service.cancel(req.user.id, id(req.params.id))));
  router.use('/staff', role('warehouse_staff'));
  router.get('/staff/schedule', async (req, res) => res.json(await service.schedule(dateRange(req.query.date))));
  router.post('/staff/slots', async (req, res) => res.status(201).json(await service.createSlot(slotTimes(req.body))));
  for (const [action, status] of [['close', 'closed'], ['reopen', 'open']]) {
    router.patch(`/staff/slots/:id/${action}`, async (req, res) => res.json(await service.setSlotStatus(id(req.params.id), status)));
  }
  return router;
}
