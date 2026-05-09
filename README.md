# BONDA

**Relationship-to-Presence OS for pets and loved ones.**

> Most AI starts with prompts. BONDA starts with relationships.
> AI generates responses. BONDA generates Presence.
> The relationship is the interface.

BONDA turns the small, repeated acts of care you give to someone you love — text memories, photos, voice, daily care logs — into a living Presence you can return to. The relationship itself is the input. What emerges is something you can visit, talk to, and anchor on-chain.

Built for the Colosseum hackathon.

## Demo mode — Relationship Signals

BONDA demo mode simulates relationship signals from a future BONDA Collar and owner Apple Watch. These signals include hug, petting, walk, voice, and care moments. In the current MVP, these are simulated to demonstrate the Relationship-to-Presence OS vision.

Labels used throughout the UI to stay honest:

- "Demo connected"
- "Simulated wearable signals"
- "Future device integration"

No real Apple Watch HealthKit integration or real collar hardware is connected in this build.

## Demo flow

1. **Landing** — BONDA positioning + "Load Baobao demo" to preload a rich sample profile.
2. **Language** — English / 日本語.
3. **Bond profile** — Onboard a pet: species, breed, photo, name, age, one-line description.
4. **Home** — Daily love accumulates as you log care.
5. **Text memory** — Write into the bond from the Memories page.
6. **Photo memory** — Add a photo and watch it become part of the Presence field.
7. **Voice memory** — Record your voice speaking to them (demo stores audio locally).
8. **Presence reaction** — Every memory saved triggers a visual Presence reaction: particles, glow, response whispers ("I remember." / "覚えてる").
9. **Presence chat** — Talk to the Presence. Replies are grounded in the memories you gave.
10. **Daily Bond Card** — A shareable 1080×1920 card visualizing today's bond, exportable to Instagram Stories.
11. **Solana verification** — Anchor bond profile, memory capsule hash, and share moment on Solana devnet (mocked signatures, real-shaped explorer links).

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Icons:** lucide-react
- **Persistence:** Supabase (Postgres + RLS) + local demo state in `localStorage`
- **Voice:** MediaRecorder Web API
- **Hashing:** Web Crypto SHA-256 for content capsules
- **Card export:** HTML Canvas 2D + Web Share API
- **Chain:** Solana devnet-shaped, mocked for the demo (see below)

## Current status & what's mocked

This is a hackathon build. Several pieces are deliberately mocked and clearly labeled in the UI:

- **Solana verifications** — devnet + deterministic mock signatures. No mainnet transactions are ever created. Explorer links point to devnet.
- **Presence LLM** — replies are generated locally by template + keyword matching over the user's own memories. Labeled "Demo · Grounded in your memories (LLM mocked)".
- **Voice memories** — stored as local base64 data URLs for the demo; transcription/embedding is not wired up.
- **BONDA collar** — UI stubs. Labeled "近日対応予定 / coming soon".

Everything that the user writes, records, or photographs stays off-chain. Only the content hash is conceptually anchored.

## Setup

```bash
cp .env.example .env
# fill in your Supabase url + anon key
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Database

Supabase migrations live in `supabase/migrations/`. They create:

- `pets`, `care_logs`, `bond_memories`, `narrative_memories`
- `memory_capsules` (text/photo/voice/care envelopes with content hash)
- `presence_messages` (chat history)
- `solana_verifications` (devnet anchors)

Every table has Row Level Security enabled and per-user-id policies for select / insert / update / delete. No `USING (true)` policies.
