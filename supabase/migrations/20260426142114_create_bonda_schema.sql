/*
  # BONDA Schema

  ## Overview
  Creates the core data model for BONDA — a system where love is made visible through care actions.

  ## New Tables

  ### `pets`
  Represents the loved one (pet) profile.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `name` (text) — pet's name
  - `species` (text) — e.g. dog, cat
  - `photo_url` (text) — profile photo URL
  - `love_score` (integer) — accumulated love score
  - `created_at` (timestamptz)

  ### `care_logs`
  Each care action taken by the user.
  - `id` (uuid, primary key)
  - `pet_id` (uuid, references pets)
  - `user_id` (uuid, references auth.users)
  - `action_type` (text) — walk, feed, hug, talk, groom, play, memory
  - `love_value` (integer) — love points this action generated
  - `emotional_translation` (text) — AI-generated emotional meaning text
  - `note` (text) — optional user note
  - `photo_url` (text) — optional photo for memory actions
  - `source` (text) — manual or device
  - `created_at` (timestamptz)

  ### `presence_milestones`
  Tracks the growth stages of presence.
  - `id` (uuid, primary key)
  - `pet_id` (uuid, references pets)
  - `stage` (text) — care, relationship, presence
  - `achieved_at` (timestamptz)
  - `description` (text)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
*/

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT '',
  species text NOT NULL DEFAULT 'dog',
  photo_url text DEFAULT '',
  love_score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own pets"
  ON pets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pets"
  ON pets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pets"
  ON pets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pets"
  ON pets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Care logs table
CREATE TABLE IF NOT EXISTS care_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  love_value integer NOT NULL DEFAULT 0,
  emotional_translation text DEFAULT '',
  note text DEFAULT '',
  photo_url text DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own care logs"
  ON care_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own care logs"
  ON care_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own care logs"
  ON care_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own care logs"
  ON care_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Presence milestones table
CREATE TABLE IF NOT EXISTS presence_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  stage text NOT NULL DEFAULT 'care',
  achieved_at timestamptz DEFAULT now(),
  description text DEFAULT ''
);

ALTER TABLE presence_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own milestones"
  ON presence_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets WHERE pets.id = presence_milestones.pet_id AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own milestones"
  ON presence_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pets WHERE pets.id = presence_milestones.pet_id AND pets.user_id = auth.uid()
    )
  );

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS care_logs_pet_id_created_at_idx ON care_logs(pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS care_logs_user_id_idx ON care_logs(user_id);
CREATE INDEX IF NOT EXISTS pets_user_id_idx ON pets(user_id);
