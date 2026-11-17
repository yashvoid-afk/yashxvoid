const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT) || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

const roomRates = { haveli: 14500, maharani: 22000, sheesh: 31500 };
const roomNames = { haveli: 'The Haveli Room', maharani: 'The Maharani Suite', sheesh: 'The Sheesh Mahal' };

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireAdmin(req, res, next) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    return res.status(503).send('Admin access is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.');
  }
  const header = req.get('authorization') || '';
  const match = header.match(/^Basic\s+(.+)$/i);
  if (!match) {
    res.set('WWW-Authenticate', 'Basic realm="Pratyaksh bookings", charset="UTF-8"');
    return res.status(401).send('Authentication required.');
  }
  let supplied;
  try {
    supplied = Buffer.from(match[1], 'base64').toString('utf8');
  } catch {
    return res.status(401).send('Authentication required.');
  }
  const separator = supplied.indexOf(':');
  const user = separator >= 0 ? supplied.slice(0, separator) : '';
  const pass = separator >= 0 ? supplied.slice(separator + 1) : '';
  if (!safeEqual(user, username) || !safeEqual(pass, password)) {
    res.set('WWW-Authenticate', 'Basic realm="Pratyaksh bookings", charset="UTF-8"');
    return res.status(401).send('Authentication required.');
  }
  next();
}

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
  const validDate = (date, value) => date instanceof Date && !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value || '') && date.toISOString().slice(0, 10) === value;
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim() : '';
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (!cleanName || cleanName.length > 120 || !emailLooksValid || cleanEmail.length > 254 || !cleanPhone || cleanPhone.length > 40 ||
      !roomRates[room] || !validDate(arrival, checkIn) || !validDate(departure, checkOut) || arrival < today || departure <= arrival ||
      !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 8) {
    return res.status(400).json({ error: 'Please check your details, dates, room and guest count.' });
  }

  const nights = Math.round((departure - arrival) / 86400000);
  const totalInr = roomRates[room] * nights;

  try {
    const result = await pool.query(
      `INSERT INTO bookings (guest_name, email, phone, room_type, check_in, check_out, guests, nights, total_inr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [cleanName, cleanEmail, cleanPhone, room, checkIn, checkOut, guestCount, nights, totalInr]
    );
    res.status(201).json({ message: 'Your request has been received.', bookingId: result.rows[0].id });
  } catch (error) {
    console.error('Booking could not be saved:', error.message);
    res.status(503).json({ error: 'We could not save your request right now. Please try again shortly.' });
  }
});

app.get('/admin', requireAdmin, (_req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 100;
  try {
    const result = await pool.query(
      `SELECT id, guest_name, email, phone, room_type, check_in, check_out, guests, nights, total_inr, created_at
       FROM bookings ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM bookings');
    res.set('Cache-Control', 'no-store');
    res.json({ bookings: result.rows.map((row) => ({ ...row, room_name: roomNames[row.room_type] })), total: countResult.rows[0].total });
  } catch (error) {
    console.error('Admin bookings could not be loaded:', error.message);
    res.status(503).json({ error: 'Bookings are temporarily unavailable.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
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
