/*
  # Extend BONDA schema for Presence relationship data

  1. Modified Tables
    - `pets`
      - `breed` (text) — breed selection from onboarding
      - `personality` (text) — owner-written personality description
      - `owner_message` (text) — message from owner to pet
      - `memory_seeds` (int) — count of memory seeds accumulated
      - `anima_awakened` (boolean) — legacy flag; superseded by `presence_awakened` in a later migration (kept for backwards compatibility, no data loss)
      - `collar_connected` (boolean) — collar connection status
      - `together_time_minutes` (int) — cumulative together time in minutes
      - `interaction_count` (int) — cumulative interaction count

  2. New Tables
    - `relationship_setup`
      - `id` (uuid, pk)
      - `pet_id` (uuid, fk → pets)
      - `user_id` (uuid, fk → auth.users)
      - `first_met_date` (date)
      - `first_impression` (text)
      - `usual_activities` (text)
      - `unforgettable_memory` (text)
      - `message_to_pet` (text)
      - `created_at` (timestamptz)

  3. Security
    - RLS enabled on relationship_setup
    - Users can only access their own relationship_setup records
*/

-- Extend pets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'breed') THEN
    ALTER TABLE pets ADD COLUMN breed text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'personality') THEN
    ALTER TABLE pets ADD COLUMN personality text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'owner_message') THEN
    ALTER TABLE pets ADD COLUMN owner_message text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'memory_seeds') THEN
    ALTER TABLE pets ADD COLUMN memory_seeds int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'anima_awakened') THEN
    ALTER TABLE pets ADD COLUMN anima_awakened boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'collar_connected') THEN
    ALTER TABLE pets ADD COLUMN collar_connected boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'together_time_minutes') THEN
    ALTER TABLE pets ADD COLUMN together_time_minutes int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'interaction_count') THEN
    ALTER TABLE pets ADD COLUMN interaction_count int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- relationship_setup table
CREATE TABLE IF NOT EXISTS relationship_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_met_date date,
  first_impression text DEFAULT '',
  usual_activities text DEFAULT '',
  unforgettable_memory text DEFAULT '',
  message_to_pet text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE relationship_setup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own relationship setup"
  ON relationship_setup FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own relationship setup"
  ON relationship_setup FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relationship setup"
  ON relationship_setup FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS relationship_setup_pet_id_idx ON relationship_setup(pet_id);
CREATE INDEX IF NOT EXISTS relationship_setup_user_id_idx ON relationship_setup(user_id);
