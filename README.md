# Pratyaksh Hotel & Spa

A responsive, heritage-inspired hotel website for Jaipur, with an Express booking API backed by PostgreSQL.

## Run locally

1. Install Node.js 18+ and PostgreSQL.
2. Install dependencies: `npm install`.
3. Set `DATABASE_URL` to a PostgreSQL connection string, for example:
   `postgres://postgres:password@localhost:5432/pratyaksh`
4. Start the website and API: `npm start`.
5. Open `http://localhost:3000`.

The server creates the `bookings` table at startup. `schema.sql` is also provided for manual setup. Booking totals are calculated and validated by the server using its own room-rate table; the browser's displayed total is informational only.

## Booking API

`POST /api/bookings` accepts JSON fields `name`, `email`, `phone`, `room`, `checkIn`, `checkOut`, and `guests`. Room keys are `haveli`, `maharani`, and `sheesh`. Successful requests are saved to PostgreSQL and return a booking ID. `GET /api/health` checks service and database availability.

## Images

Hotel photography is loaded from Unsplash image URLs. An internet connection is needed to load those images and Google Fonts.
