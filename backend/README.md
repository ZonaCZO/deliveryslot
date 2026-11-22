# DockPoint backend — Sprint 1

## Temporary mode: JSON demo fixtures

Run `npm ci`, then `npm start`. No MySQL account or `.env` is required.
JSON mode is the default (`DATA_MODE=json`). Auth, slots, bookings, cancellation
and staff management work using fixtures from `data/demo.json`.
`GET /health` returns `{ "status": "ok", "database": "json", "persistence": "memory" }`.

Demo login accounts:

| Email | Password | Role |
| --- | --- | --- |
| carrier@test.com | CarrierDemo123! | Carrier |
| carrier2@test.com | CarrierDemo123! | Second carrier |
| staff@test.com | StaffDemo123! | Warehouse staff |

Slots are generated for tomorrow (08:00, 09:00 open; 10:00 closed) and the day
after tomorrow (08:00 open), in Europe/Warsaw. Query those dates through `/slots`.
Mutations live in memory and reset when the server restarts; the fixture JSON
is unchanged. This mode is for a local demo, with one server process.

To reconnect MySQL, set `DATA_MODE=mysql` in `.env` and uncomment/configure DB_*
settings. The existing MySQL services, schema and seed remain unchanged.
The database setup below, integration tests and `user:set` script apply only to MySQL mode.

Node.js 22+ / Express 5 / MySQL 8.0.16+. Run commands from `backend/`.
Uses the existing Mykhail schema unchanged (`users`, `delivery_slots`, `bookings`,
`uq_active_slot`); it does not run migrations or modify seed data on startup.
Database files currently live on `feature/mykhail-github-actions` (PR #2).
Have that schema applied to your development database before running the API.

## Setup

1. Install dependencies: `npm ci`.
2. Copy `.env.example` to `.env` and configure MySQL credentials.
3. Use a database account with SELECT/INSERT/UPDATE on `deliveryslot`.
4. Configure demo accounts. The SQL seed hashes are placeholders and cannot log in.
   In PowerShell:

   ```powershell
   $env:DOCKPOINT_USER_PASSWORD = 'choose-a-demo-password'
   npm run user:set -- carrier@test.com carrier
   npm run user:set -- staff@test.com warehouse_staff
   Remove-Item Env:DOCKPOINT_USER_PASSWORD
   ```

   This explicitly updates those accounts' passwords/roles; use only your development database.
5. `npm start` (or `npm run dev`). API: `http://localhost:3000`.

## API

JSON requests and responses. Errors: `{ "error": "message" }`.
Login returns `{ token, tokenType, user }`; send `Authorization: Bearer <token>`
on every subsequent request. Keep the token in frontend memory and call logout
before discarding it. Passwords use salted scrypt. Login attempts are rate limited.

| Method | Path | Access / input |
| --- | --- | --- |
| GET | `/health` | Public database readiness |
| POST | `/auth/login` | `{email, password}` |
| POST | `/auth/logout` | Authenticated; revokes current session |
| GET | `/auth/me` | Current account |
| GET | `/warehouses` | Authenticated; single warehouse metadata |
| GET | `/warehouses/1` | Authenticated; single warehouse metadata |
| GET | `/slots?date=YYYY-MM-DD` | Authenticated; future open unbooked slots |
| POST | `/bookings` | Carrier; `{slotId, carrierName, truckRegistration, contactEmail}` |
| GET | `/bookings/my` | Carrier; own active and cancelled bookings |
| PATCH | `/bookings/:id/cancel` | Carrier; own active booking before start |
| GET | `/staff/schedule?date=YYYY-MM-DD` | Staff; all slots and active booking details |
| POST | `/staff/slots` | Staff; `{startTime, endTime}` |
| PATCH | `/staff/slots/:id/close` | Staff; future unbooked slot |
| PATCH | `/staff/slots/:id/reopen` | Staff; future unbooked slot |

Dates select a Europe/Warsaw calendar day, including daylight saving transitions.
Creation timestamps require seconds and an explicit offset, e.g.
`2026-12-03T08:00:00Z` and `2026-12-03T09:00:00Z`. Slots last exactly
60 minutes and cannot overlap, including closed slots. Database timestamps use UTC;
response fields follow existing SQL names (`start_time_utc`, `booking_reference`, etc.).
Convert UTC timestamps to Europe/Warsaw for display.

400: invalid input; 401: invalid/missing session; 403: wrong role/owner;
404: missing resource; 409: booked/closed/past slot, overlap or invalid cancellation.
Create operations return 201; logout returns 204.

Slot row locks serialize booking, cancellation and close/reopen. The existing
unique active-slot constraint also prevents double booking by other DB clients.
Slot creation uses a MySQL advisory lock for the single bay; external tools must
honor that lock or perform their own overlap validation.

## Tests

`npm test` runs all Jest API, business logic and mocked MySQL tests without a database. `npm run test:coverage` creates an HTML report at coverage/lcov-report/index.html.

For real database tests, apply the existing schema to a **dedicated test instance**,
configure DB_* environment variables, then:

```powershell
$env:RUN_MYSQL_TESTS = '1'
npm run test:integration
```

Tests create their own users/slots and remove only their fixtures. They verify
concurrent 201/409 responses, database uniqueness, cancellation/rebooking,
ownership, time checks, schedule, availability and staff status changes.
For a future CI backend job: `npm ci`, `npm test`, then set RUN_MYSQL_TESTS=1
and run `npm run test:integration` against a schema-initialized MySQL service.
Existing shared workflows are intentionally unchanged.

## Sprint limitations

One warehouse/bay, matching current schema. Warehouse APIs expose metadata;
warehouse CRUD requires an agreed schema change. No self-registration.
Sessions live in one API process, expire after eight hours by default, and are
invalidated on restart. Use one instance for Sprint 1; shared sessions are needed
before horizontal scaling. Serve through HTTPS outside local development.

