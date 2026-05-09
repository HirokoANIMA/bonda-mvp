/**
 * BONDA — Solana trust layer (REAL devnet + Phantom wallet).
 *
 * Anchors compact metadata + a SHA-256 hash on Solana devnet using the
 * official Memo Program. Private memory content (text, photo, voice) stays
 * off-chain. Only: { kind, capsule_id, hash, ts } is committed.
 *
 * NEVER targets mainnet. All RPC + explorer URLs are devnet.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import type { Verification, VerificationKind } from './solana';
import { sha256Hex } from './solana';

// Ensure Buffer is available for @solana/web3.js in the browser.
if (typeof window !== 'undefined' && !(window as unknown as { Buffer?: typeof Buffer }).Buffer) {
  (window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
);

// Phantom provider shape — enough to sign and connect.
interface PhantomPublicKey { toString(): string; toBytes(): Uint8Array }
interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: PhantomPublicKey | null;
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PhantomPublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (tx: Transaction) => Promise<{ signature: string; publicKey?: PhantomPublicKey }>;
  on?: (event: string, handler: (args: unknown) => void) => void;
}

export function getPhantom(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } };
  if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
  if (w.solana?.isPhantom) return w.solana;
  return null;
}

export function isPhantomInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { solana?: { isPhantom?: boolean }; phantom?: { solana?: { isPhantom?: boolean } } };
  return !!(w.phantom?.solana?.isPhantom || w.solana?.isPhantom);
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Build a Phantom "browse" deeplink so mobile users can open BONDA
 * inside Phantom's in-app browser (where the provider is injected).
 *
 * Format: https://phantom.app/ul/browse/{encodedTarget}?ref={encodedRef}
 */
export function buildPhantomBrowseUrl(): string {
  if (typeof window === 'undefined') return 'https://phantom.app/';
  const base = `${window.location.origin}${window.location.pathname}`;
  const targetRaw = `${base}?tab=memories&openTrustLayer=1`;
  const target = encodeURIComponent(targetRaw);
  const ref = encodeURIComponent(window.location.origin);
  return `https://phantom.app/ul/browse/${target}?ref=${ref}`;
}

export function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } };
  if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
  if (w.solana?.isPhantom) return w.solana;
  return null;
}

export function detectEnvironmentLabel(): 'Phantom Browser' | 'Safari' | 'Desktop' {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'Desktop';
  const ua = navigator.userAgent;
  const w = window as unknown as { phantom?: unknown; solana?: { isPhantom?: boolean } };
  const isPhantomInApp = !!w.phantom || !!w.solana?.isPhantom;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  if (isPhantomInApp && isMobile) return 'Phantom Browser';
  if (isMobile) return 'Safari';
  return 'Desktop';
}

let cachedConnection: Connection | null = null;
export function getDevnetConnection(): Connection {
  if (!cachedConnection) {
    cachedConnection = new Connection(DEVNET_RPC || clusterApiUrl('devnet'), 'confirmed');
  }
  return cachedConnection;
}

export async function connectPhantom(): Promise<string> {
  const p = getPhantom();
  if (!p) throw new Error('Phantom wallet not found. Install Phantom and refresh.');
  const res = await p.connect();
  return res.publicKey.toString();
}

export async function disconnectPhantom(): Promise<void> {
  const p = getPhantom();
  if (!p) return;
  try { await p.disconnect(); } catch { /* noop */ }
}

export async function getDevnetBalanceSol(pubkey: string): Promise<number> {
  const conn = getDevnetConnection();
  const lamports = await conn.getBalance(new PublicKey(pubkey), 'confirmed');
  return lamports / LAMPORTS_PER_SOL;
}

export async function requestDevnetAirdrop(pubkey: string, sol = 1): Promise<string> {
  const conn = getDevnetConnection();
  const sig = await conn.requestAirdrop(new PublicKey(pubkey), sol * LAMPORTS_PER_SOL);
  const bh = await conn.getLatestBlockhash('confirmed');
  await conn.confirmTransaction({ signature: sig, ...bh }, 'confirmed');
  return sig;
}

export function devnetExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

function buildMemoInstruction(memo: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, 'utf8'),
  });
}

export interface AnchorOptions {
  kind: VerificationKind;
  payload: string;           // source text to hash — stays off-chain
  profile: string;           // bond profile name (e.g. pet name)
  capsuleId?: string | null;
  label?: string;
}

export interface AnchorResult extends Verification {
  status: 'confirmed';
  network: 'devnet';
}

/**
 * Anchor a relationship record on Solana devnet via the Memo Program.
 * Signs with Phantom, broadcasts, confirms, and returns a Verification.
 *
 * Throws if: Phantom missing, user rejects, insufficient SOL, RPC error.
 */
export async function anchorOnDevnet(opts: AnchorOptions): Promise<AnchorResult> {
  const p = getPhantom();
  if (!p) throw new Error('Phantom wallet not found. Install Phantom to anchor on devnet.');

  const connectRes = await p.connect();
  const owner = connectRes.publicKey;
  const ownerPubkey = new PublicKey(owner.toString());

  const content_hash = await sha256Hex(opts.payload);

  const memoObj = {
    app: 'BONDA',
    type: opts.kind,
    profile: opts.profile,
    hash: content_hash,
    timestamp: new Date().toISOString(),
  };
  const memoStr = JSON.stringify(memoObj);

  const conn = getDevnetConnection();
  const tx = new Transaction();
  tx.add(buildMemoInstruction(memoStr, ownerPubkey));

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = ownerPubkey;

  // Prefer Phantom's signAndSendTransaction flow where available.
  let signature: string;
  if (typeof p.signAndSendTransaction === 'function') {
    const res = await p.signAndSendTransaction(tx);
    signature = res.signature;
  } else {
    const signed = await p.signTransaction(tx);
    const raw = signed.serialize();
    signature = await conn.sendRawTransaction(raw, { skipPreflight: false });
  }
  await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

  return {
    id: crypto.randomUUID(),
    kind: opts.kind,
    network: 'devnet',
    tx_signature: signature,
    owner_pubkey: ownerPubkey.toString(),
    content_hash,
    explorer_url: devnetExplorerUrl(signature),
    status: 'confirmed',
    created_at: new Date().toISOString(),
    capsule_id: opts.capsuleId ?? null,
    label: opts.label ?? opts.kind,
  };
}
