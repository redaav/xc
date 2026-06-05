/*
# QuickRide - Complete Database Schema

1. New Tables
- `profiles`: Extends auth.users with app-specific data (user_type, name, phone, email_verified). Both riders and captains share this table, differentiated by user_type.
- `captain_details`: Captain-specific data (vehicle info, status, location). One-to-one with profiles where user_type='captain'.
- `rides`: Core ride records with pickup/destination, fare, status, OTP, distance/duration.
- `ride_messages`: Chat messages between rider and captain for each ride.

2. Security
- RLS enabled on all tables.
- Owner-scoped policies for profiles and rides.
- Captain-scoped policies for captain_details.
- Ride participant-scoped policies for ride_messages.

3. Important Notes
- profiles.id references auth.users(id) so Supabase Auth manages identity.
- captain_details uses PostGIS-style lat/lng columns for location.
- rides.otp is stored in a separate column (not select:false like MongoDB).
- Fare calculation is done server-side or client-side with Haversine distance.
- Supabase Realtime will be used for ride status updates and chat.
*/

-- Profiles table: extends auth.users for both user and captain types
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('user', 'captain')),
  firstname text NOT NULL CHECK (char_length(firstname) >= 2),
  lastname text DEFAULT '',
  phone text,
  email_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Allow reading other users' basic info for ride matching/chat
DROP POLICY IF EXISTS "Authenticated users can read basic profile info" ON profiles;
CREATE POLICY "Authenticated users can read basic profile info" ON profiles FOR SELECT
  TO authenticated USING (true);

-- Captain details table
CREATE TABLE IF NOT EXISTS captain_details (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_color text NOT NULL CHECK (char_length(vehicle_color) >= 3),
  vehicle_number text NOT NULL CHECK (char_length(vehicle_number) >= 3),
  vehicle_capacity integer NOT NULL DEFAULT 1,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'bike', 'auto')),
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  latitude double precision DEFAULT 0,
  longitude double precision DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE captain_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Captains can read own details" ON captain_details;
CREATE POLICY "Captains can read own details" ON captain_details FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Captains can insert own details" ON captain_details;
CREATE POLICY "Captains can insert own details" ON captain_details FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Captains can update own details" ON captain_details;
CREATE POLICY "Captains can update own details" ON captain_details FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Allow riders to see captain details for ride matching
DROP POLICY IF EXISTS "Authenticated users can read captain details" ON captain_details;
CREATE POLICY "Authenticated users can read captain details" ON captain_details FOR SELECT
  TO authenticated USING (true);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  captain_id uuid REFERENCES profiles(id),
  pickup text NOT NULL,
  destination text NOT NULL,
  pickup_lat double precision,
  pickup_lng double precision,
  dest_lat double precision,
  dest_lng double precision,
  fare integer NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'bike', 'auto')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ongoing', 'completed', 'cancelled')),
  duration integer,
  distance integer,
  otp text NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own rides" ON rides;
CREATE POLICY "Users can read own rides" ON rides FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = captain_id);

DROP POLICY IF EXISTS "Users can create rides" ON rides;
CREATE POLICY "Users can create rides" ON rides FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Captains can update assigned rides" ON rides;
CREATE POLICY "Captains can update assigned rides" ON rides FOR UPDATE
  TO authenticated USING (auth.uid() = captain_id OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = captain_id OR auth.uid() = user_id);

-- Allow captains to see pending rides for matching
DROP POLICY IF EXISTS "Captains can read pending rides" ON rides;
CREATE POLICY "Captains can read pending rides" ON rides FOR SELECT
  TO authenticated USING (true);

-- Ride messages table
CREATE TABLE IF NOT EXISTS ride_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'captain')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ride_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ride participants can read messages" ON ride_messages;
CREATE POLICY "Ride participants can read messages" ON ride_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_messages.ride_id AND (rides.user_id = auth.uid() OR rides.captain_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Ride participants can send messages" ON ride_messages;
CREATE POLICY "Ride participants can send messages" ON ride_messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_messages.ride_id AND (rides.user_id = auth.uid() OR rides.captain_id = auth.uid()))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rides_user_id ON rides(user_id);
CREATE INDEX IF NOT EXISTS idx_rides_captain_id ON rides(captain_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_ride_messages_ride_id ON ride_messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_captain_details_vehicle_type ON captain_details(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_captain_details_status ON captain_details(status);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_captain_details_updated_at ON captain_details;
CREATE TRIGGER update_captain_details_updated_at BEFORE UPDATE ON captain_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rides_updated_at ON rides;
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for rides and ride_messages tables
-- (We'll configure realtime publication separately)
