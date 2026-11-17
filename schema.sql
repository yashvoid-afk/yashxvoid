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
);
