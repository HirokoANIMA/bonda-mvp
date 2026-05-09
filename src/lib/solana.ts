/**
 * BONDA — Solana trust layer (devnet + mock).
 *
 * STATUS: MOCKED FOR HACKATHON DEMO.
 *
 * Production plan:
 *   - An owner wallet (Phantom / Solflare) signs a memo transaction containing
 *     the capsule `content_hash` and `kind` on Solana devnet.
 *   - The on-chain record carries ONLY non-sensitive metadata: capsule id,
 *     content hash, owner pubkey, timestamp. Private memory content (text,
 *     photo, voice) never leaves Supabase storage.
 *   - A BONDA on-chain program will attest bond_profile, memory_capsule,
 *     and share_moment events so that relationships are publicly verifiable
 *     without publishing private data.
 *
 * For the MVP demo, this module:
 *   - Returns a deterministic synthetic devnet-style signature.
 *   - Returns a devnet explorer URL (visually real but signature is synthetic).
 *   - Clearly labels everything as NETWORK='devnet' with STATUS='mock'.
 *
 * NEVER emits mainnet transactions.
 */

export type VerificationKind = 'bond_profile' | 'memory_capsule' | 'share_moment' | 'care_signal';
export type VerificationStatus = 'pending' | 'confirmed' | 'mock';
export type VerificationNetwork = 'devnet' | 'mock';

export interface Verification {
  id: string;
  kind: VerificationKind;
  network: VerificationNetwork;
  tx_signature: string;
  owner_pubkey: string;
  content_hash: string;
  explorer_url: string;
  status: VerificationStatus;
  created_at: string;
  capsule_id?: string | null;
  label?: string;
}

// SHA-256 of an arbitrary string using Web Crypto.
export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Base58 alphabet used by Solana signatures / pubkeys.
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function randomBase58(length: number): string {
  let out = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) out += B58[bytes[i] % B58.length];
  return out;
}

// Deterministic base58 string derived from a seed, for stable demo data.
function seededBase58(seed: string, length: number): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 131 + seed.charCodeAt(i)) >>> 0;
  let out = '';
  for (let i = 0; i < length; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out += B58[h % B58.length];
  }
  return out;
}

// Persist a stable owner pubkey for this demo device (not a real wallet).
const OWNER_KEY_LS = 'bonda_demo_owner_pubkey';
export function getDemoOwnerPubkey(): string {
  const existing = localStorage.getItem(OWNER_KEY_LS);
  if (existing) return existing;
  const pk = randomBase58(44);
  localStorage.setItem(OWNER_KEY_LS, pk);
  return pk;
}

export function explorerUrl(signature: string, cluster: VerificationNetwork = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export interface VerifyOptions {
  kind: VerificationKind;
  payload: string;       // content to hash (never sent on-chain)
  label?: string;
  capsuleId?: string | null;
  seed?: string;         // optional stable seed for deterministic signatures
}

/**
 * Verify (mock) — simulates a Solana devnet memo-signing flow.
 *
 * TODO (production):
 *   1) Request user wallet connection (Phantom / Solflare)
 *   2) Build a memo tx containing { kind, content_hash, capsule_id }
 *   3) Sign + send via web3.js to devnet; wait for confirmation
 *   4) Store signature + explorer URL on `solana_verifications`
 */
export async function verifyOnSolana(opts: VerifyOptions): Promise<Verification> {
  const content_hash = await sha256Hex(opts.payload);
  const owner_pubkey = getDemoOwnerPubkey();

  // Simulate latency (network + signing).
  await new Promise(res => setTimeout(res, 1400 + Math.random() * 600));

  const signature = opts.seed
    ? seededBase58(`${opts.seed}-${content_hash}`, 88)
    : randomBase58(88);

  return {
    id: crypto.randomUUID(),
    kind: opts.kind,
    network: 'devnet',
    tx_signature: signature,
    owner_pubkey,
    content_hash,
    explorer_url: explorerUrl(signature, 'devnet'),
    status: 'mock',
    created_at: new Date().toISOString(),
    capsule_id: opts.capsuleId ?? null,
    label: opts.label ?? opts.kind,
  };
}

export function shortPubkey(pk: string): string {
  if (!pk) return '';
  if (pk.length <= 10) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export function shortSig(sig: string): string {
  if (!sig) return '';
  if (sig.length <= 14) return sig;
  return `${sig.slice(0, 6)}…${sig.slice(-6)}`;
}
