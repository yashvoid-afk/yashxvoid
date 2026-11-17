# Pratyaksh Hotel & Spa

A responsive, heritage-inspired Jaipur hotel website, Express booking API, PostgreSQL persistence, and password-protected bookings dashboard.

## Run locally

1. Install Node.js 18+ and PostgreSQL.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env`, set `DATABASE_URL`, and set a unique `ADMIN_USERNAME` and strong `ADMIN_PASSWORD`.
4. Export those variables in your shell (or load them with your preferred environment-file tool), then run `npm start`.
5. Open `http://localhost:3000`.

The app creates the `bookings` table at startup. `schema.sql` is also provided for manual setup. Booking totals are recalculated and validated by the server using its own room-rate table; the browser's displayed total is informational only.

## Guest booking API

`POST /api/bookings` accepts JSON fields `name`, `email`, `phone`, `room`, `checkIn`, `checkOut`, and `guests`. Room keys are `haveli`, `maharani`, and `sheesh`. Successful requests are saved to PostgreSQL and return a booking ID. `GET /api/health` checks service and database availability.

## Admin dashboard

Visit `/admin` and sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The dashboard displays recent booking requests and guest contact details. Its data API is also protected by HTTP Basic authentication and returns at most 200 recent requests. Use HTTPS in production; never commit production credentials. Leave both admin variables unset only if you intend the admin screen to remain unavailable.

## Deploy

### Render

The included `render.yaml` defines a web service and PostgreSQL database. Create a Blueprint from this repository and provide values for `ADMIN_USERNAME` and a long random `ADMIN_PASSWORD` when prompted. Render supplies `DATABASE_URL`. Review the service/database plan and current provider pricing before deploying.

### Railway or Docker

`railway.json` configures the included `Dockerfile` and health check. Set `DATABASE_URL`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` in the service variables. For a database that requires TLS, also set `PGSSLMODE=require`.

To build and run the container yourself:

```sh
docker build -t pratyaksh-hotel .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgres://user:password@host:5432/pratyaksh' \
  -e ADMIN_USERNAME='hotel-admin' \
  -e ADMIN_PASSWORD='use-a-long-random-secret' \
  pratyaksh-hotel
```

## Images

Hotel photography is loaded from Unsplash URLs, and typography uses Google Fonts. An internet connection is needed to load these third-party assets.
