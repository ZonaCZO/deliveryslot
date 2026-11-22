# Backend tests (Jest)

From `backend/`: `npm ci`, then `npm test`.
No running server or MySQL is required for the default suite.
Each API scenario has fresh demo state. Time-sensitive tests use a controlled
clock and refresh sessions when moving beyond their expiry.

| Topic | Tests |
| --- | --- |
| Auth API | Login, /me, wrong password/unknown account, invalid bodies, missing/invalid/expired token, logout, rate limit |
| Warehouses API | List, detail, nonexistent and invalid ID |
| Slots API / availability | Warsaw dates, invalid dates, future/open/unbooked filtering, past/closed slots, availability after booking/cancellation |
| Bookings API | Creation, references, owner isolation, forged owner/status ignored, invalid input and missing slot |
| Double booking | Sequential and concurrent requests, one 201 and one 409, unique DB constraint error translation |
| Cancellation | Owner, foreign owner, missing booking, cutoff exactly at start, repeated cancellation, rebooking |
| Staff | Schedule with contact details/closed slots, create/close/reopen, overlap, adjacent slots, booked/past slots |
| Roles | Carrier denied all staff routes, staff denied carrier routes, unauthenticated access denied |
| Database | MySQL pool configuration, parameterized users/booking queries, scoped reads, commit/rollback, row lock order, advisory locks and connection release |

`npm run test:coverage` generates coverage/lcov-report/index.html and checks
minimum coverage (95% lines/functions/statements, 85% branches).
Coverage measures executed code, not correctness of real MySQL behavior.

## Real MySQL integration

Use an isolated MySQL 8 test instance initialized with the team's existing schema.
Configure DB_* in `.env` using a test account with SELECT/INSERT/UPDATE/DELETE.
Do not use a shared production database. The suite inserts its own fixtures and
removes only those fixtures, leaving seed data untouched.

PowerShell:

```powershell
$env:RUN_MYSQL_TESTS = '1'
npm run test:integration
Remove-Item Env:RUN_MYSQL_TESTS
```

Without RUN_MYSQL_TESTS=1 the integration suite explicitly reports SKIPPED.
Real tests verify concurrent transactions, ownership, cancellation/rebooking and
the active-booking count in MySQL. Mocked database tests cannot replace this run.
All tests use Jest; existing shared CI workflows are unchanged.
