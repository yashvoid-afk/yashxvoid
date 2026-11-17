const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT) || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const roomRates = {
  haveli: 14500,
  maharani: 22000,
  sheesh: 31500
};

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { name, email, phone, room, checkIn, checkOut, guests } = req.body || {};
  const guestCount = Number(guests);
  const arrival = new Date(`${checkIn}T00:00:00Z`);
  const departure = new Date(`${checkOut}T00:00:00Z`);
  const validDate = (date, value) => date instanceof Date && !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value || '');

  if (!name?.trim() || !email?.trim() || !phone?.trim() || !roomRates[room] ||
      !validDate(arrival, checkIn) || !validDate(departure, checkOut) || departure <= arrival ||
      !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 8) {
    return res.status(400).json({ error: 'Please check your details, dates, room and guest count.' });
  }

  const nights = Math.round((departure - arrival) / 86400000);
  const totalPaise = roomRates[room] * nights;

  try {
    const result = await pool.query(
      `INSERT INTO bookings (guest_name, email, phone, room_type, check_in, check_out, guests, nights, total_inr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [name.trim(), email.trim(), phone.trim(), room, checkIn, checkOut, guestCount, nights, totalPaise]
    );
    res.status(201).json({ message: 'Your request has been received.', bookingId: result.rows[0].id });
  } catch (error) {
    console.error('Booking could not be saved:', error.message);
    res.status(503).json({ error: 'We could not save your request right now. Please try again shortly.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

async function start() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Set it to your PostgreSQL connection string.');
    process.exit(1);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGSERIAL PRIMARY KEY,
      guest_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      room_type TEXT NOT NULL CHECK (room_type IN ('haveli', 'maharani', 'sheesh')),
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      guests SMALLINT NOT NULL CHECK (guests BETWEEN 1 AND 8),
      nights INTEGER NOT NULL CHECK (nights > 0),
      total_inr INTEGER NOT NULL CHECK (total_inr > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (check_out > check_in)
    )
  `);
  app.listen(port, () => console.log(`Pratyaksh Hotel website listening on port ${port}`));
}

start().catch((error) => {
  console.error('Could not start the booking service:', error.message);
  process.exit(1);
});
