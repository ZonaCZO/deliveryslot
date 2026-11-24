## Frontend/backend integration (24 November 2026)

The carrier UI now uses the Express API for login/logout, warehouse metadata,
available slots, booking creation, own bookings and cancellation. Warehouse staff
can log in and view the schedule. Existing CSS and desktop layout are preserved.
The original Sprint 1 prototype notes below are historical; the previous statement
that the frontend is not connected no longer applies on this integration branch.

### Local run (two terminals)

From the repository root:

```powershell
# Terminal 1
cd backend
npm ci
npm start
```

```powershell
# Terminal 2
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). Vite forwards /api
requests to http://127.0.0.1:3000; this also works if Vite chooses another frontend
port. Ensure the backend uses port 3000, or update the proxy target.

JSON demo accounts:
- carrier@test.com / CarrierDemo123!
- carrier2@test.com / CarrierDemo123!
- staff@test.com / StaffDemo123!

Choose tomorrow or the following day for demo slots (Europe/Warsaw).
The API controls slot IDs, booking references, validation and ownership. Statuses
active/cancelled are displayed as Confirmed/Cancelled. Only currently available
slots are shown to carriers; staff schedules include closed/booked slots.

Bearer tokens stay in frontend memory. Refreshing the browser requires sign-in
again, after which bookings are fetched from the server. JSON bookings survive
browser refresh, but reset when the backend restarts. MySQL code is unchanged.
Staff slot creation/closing/reopening endpoints remain available through the API;
this integration adds the staff schedule view, not staff management forms.

For deployment, configure a reverse proxy for /api or set VITE_API_URL to the API
origin before building and configure backend FRONTEND_ORIGIN accordingly. The Vite
development proxy is not part of the production build.

### Verification

- npm run lint and npm run build in frontend passed.
- All 89 backend Jest tests in 11 suites passed.
- Browser verified carrier login, server slots, booking/reference, My Bookings,
  profile counts, cancellation/restored slot, sign-out and staff schedule.
- Real MySQL integration has not been tested in this step.

---


# DSBS — Delivery Slot Booking System

## Frontend Development

**Developer:** Anastasiya Marozava  
**Role:** Frontend Developer  
**Sprint:** Sprint 1

## Project Overview

The Delivery Slot Booking System (DSBS) is a web application designed to simplify delivery scheduling between transport companies and warehouses.

Carriers can select a warehouse, view available delivery slots, and book a suitable delivery time.

## Technologies

- React
- JavaScript
- HTML5
- CSS3
- Vite
- Git and GitHub

## Implemented Features

### Login UI
- Demo login form
- Sign-out functionality

### Delivery Slot Selection
- Warehouse selection
- Delivery date selection
- Display of available and booked slots
- Europe/Warsaw time zone
- Disabled past and unavailable slots

### Booking Management
- Booking form with required fields
- Booking confirmation with a unique reference
- My Bookings list
- Booking cancellation
- Release of cancelled slots for rebooking

### My Profile
- Personal dashboard
- Account information (demo)
- Total and confirmed bookings statistics
- Navigation between pages

## How to Run

Requirements: Node.js and npm.

From the repository root, run:

    cd frontend
    npm install
    npm run dev

Open the local URL shown in the terminal (usually http://localhost:5173).

## Testing

The following features have been manually verified:

- Selecting warehouse and delivery date
- Booking an available slot
- Displaying booking confirmation
- Preventing repeated booking in the local demo
- Cancelling a booking
- Making a cancelled slot available again
- Displaying bookings and profile statistics

## Current Limitations

- Login is a demonstration interface.
- Delivery slots use static demo data.
- Bookings are stored in React state and reset after page refresh.
- Backend API integration is not yet implemented.
- Cross-user double-booking prevention requires backend validation.
- Automated frontend tests are not yet implemented.

## Next Steps

- Connect frontend to backend APIs
- Add API error handling
- Implement persistent booking storage
- Improve responsive UI/UX
- Add automated frontend testing

## GitHub

**Branch:** anastasiya/frontend

**Pull Request #3:**  
https://github.com/ZonaCZO/deliveryslot/pull/3

## Project Status

Sprint 1 frontend prototype completed and submitted for team review.

The application currently demonstrates the carrier booking workflow using local demo data.
