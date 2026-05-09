/*
  # BONDA: Memory Capsules, Voice Memories, Chat, and Solana Verifications

  This migration adds the data structures required for the Colosseum hackathon
  demo flow: turning relationship data (text, photo, voice, care) into an AI
  Presence, and anchoring trust/provenance on Solana (devnet / mock).

  Private memory contents are stored here (Supabase). Only non-sensitive
  metadata (hashes, owner pubkey, capsule id, counts) is intended to go on-chain.

  1. Modified Tables
    - `pets`
      - renames/retires the legacy `anima_awakened` concept to the
        BONDA-native `presence_awakened` flag by adding a new column and
        keeping the old one intact for backwards compatibility (no data loss).

  2. New Tables
    - `memory_capsules`
      - `id` (uuid, pk)
      - `pet_id` (uuid, fk pets)
      - `user_id` (uuid, fk auth.users)
      - `kind` ('text' | 'photo' | 'voice' | 'care' | 'story')
      - `title` (text)
      - `body` (text) — off-chain private memory content
      - `media_url` (text) — off-chain photo/voice URL
      - `duration_ms` (int) — for voice capsules
      - `content_hash` (text) — sha-256 of body + media for provenance
      - `created_at` (timestamptz)

    - `presence_messages`
      - `id` (uuid, pk)
      - `pet_id` (uuid, fk pets)
      - `user_id` (uuid, fk auth.users)
      - `role` ('user' | 'presence')
      - `body` (text)
      - `created_at` (timestamptz)

    - `solana_verifications`
      - `id` (uuid, pk)
      - `pet_id` (uuid, fk pets)
      - `user_id` (uuid, fk auth.users)
      - `capsule_id` (uuid, nullable fk memory_capsules)
      - `kind` ('bond_profile' | 'memory_capsule' | 'share_moment')
      - `network` ('devnet' | 'mock')  — never 'mainnet' in demo
      - `tx_signature` (text)          — devnet or mock signature
      - `owner_pubkey` (text)
      - `content_hash` (text)
      - `explorer_url` (text)
      - `status` ('pending' | 'confirmed' | 'mock')
      - `created_at` (timestamptz)

  3. Security
    - RLS enabled on all new tables
    - Users can only access rows tied to their own user_id
*/

-- ── Add presence_awakened column (BONDA-native naming) ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'presence_awakened'
  ) THEN
    ALTER TABLE pets ADD COLUMN presence_awakened boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── memory_capsules ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_capsules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  media_url text NOT NULL DEFAULT '',
  duration_ms int NOT NULL DEFAULT 0,
  content_hash text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE memory_capsules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own memory capsules"
  ON memory_capsules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory capsules"
  ON memory_capsules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory capsules"
  ON memory_capsules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory capsules"
  ON memory_capsules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS memory_capsules_pet_id_idx ON memory_capsules(pet_id);
CREATE INDEX IF NOT EXISTS memory_capsules_user_id_idx ON memory_capsules(user_id);

-- ── presence_messages ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presence_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  body text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE presence_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own presence messages"
  ON presence_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presence messages"
  ON presence_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own presence messages"
  ON presence_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS presence_messages_pet_id_idx ON presence_messages(pet_id);
CREATE INDEX IF NOT EXISTS presence_messages_user_id_idx ON presence_messages(user_id);

-- ── solana_verifications ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solana_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capsule_id uuid REFERENCES memory_capsules(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'bond_profile',
  network text NOT NULL DEFAULT 'mock',
  tx_signature text NOT NULL DEFAULT '',
  owner_pubkey text NOT NULL DEFAULT '',
  content_hash text NOT NULL DEFAULT '',
  explorer_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'mock',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE solana_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own verifications"
  ON solana_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
  ON solana_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications"
  ON solana_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS solana_verifications_pet_id_idx ON solana_verifications(pet_id);
CREATE INDEX IF NOT EXISTS solana_verifications_user_id_idx ON solana_verifications(user_id);
