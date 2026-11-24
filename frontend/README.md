
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
