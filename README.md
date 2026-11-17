# DockPoint — Delivery Slot Booking System

A web application that allows carriers to book delivery time slots
and warehouse staff to manage the delivery schedule.

## Product Goal

Help carriers and warehouse staff coordinate delivery arrival times
through a shared booking system, with the aim of reducing queues
and preventing conflicting bookings.

## Target Users

- Carriers who need to book and manage delivery appointments.
- Warehouse staff who manage available slots and incoming deliveries.

## Planned MVP Features

- View available delivery slots by date.
- Book a slot with double-booking prevention.
- View the delivery schedule as warehouse staff.
- View own bookings as a carrier.
- Cancel a booking.
- Create delivery slots as warehouse staff.
- Close and reopen available slots.

## MVP Scope and Business Rules

- One warehouse with one unloading bay.
- Each slot lasts 60 minutes and accommodates one truck.
- Times are displayed in the Europe/Warsaw time zone.
- Bookings require a carrier name, truck registration number,
  and valid contact email.
- Only future, available slots can be booked.
- Carriers can cancel their own bookings before the slot starts.
- Pre-created accounts are used for the initial demonstration.

## Out of Scope

- Online payments.
- GPS tracking.
- Route planning.
- Warehouse inventory management.
- Integration with external warehouse systems.
- Multiple warehouses.
- Self-service account registration.

## Team

- Anastasiya Marozava — Frontend
- Irina Staric — QA
- Nikita Prokhorov — Backend
- Mykhail Buniak — DevOps/Databases

## Project Links

- Repository: [URL](https://github.com/ZonaCZO/deliveryslot)
- Trello board: [URL](https://trello.com/invite/b/6ad4fd1622cfd410847b6c0d/ATTI6f0ae6f2e006473732fef36d8efb8941A5F9BD49/deliveruslot)
- Living project report: [add report URL]

## Technology Stack

- Backend: Node.js + Express
- Frontend:
- DevOps: MySQL
- DevOps: GitHub Actions (CI/CD), Docker (planned)
- Project Management: Trello

## Setup and Run Instructions

To be added and verified against the running project.

This section will include:
- Required software and versions.
- Dependency installation commands.
- Any required environment configuration.
- Commands to start the application.
- The local address used to open the application.

## Running Tests

To be added once the first automated test is available.

## Task Workflow

Backlog → To Do → In Progress → Review → Done

User stories and acceptance criteria are maintained on the Trello board.
