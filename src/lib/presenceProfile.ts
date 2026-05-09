/**
 * Derives a deterministic, relationship-specific PresenceProfile from all
 * available data about a pet + owner.
 *
 * Nothing here is random per render — the same data always produces the same
 * visual personality. Values evolve as the relationship grows.
 */

import type { CareLog } from './types';
import type { AfterBondaMemory } from './types';

// ── Output type ───────────────────────────────────────────────────────────────

export interface PresenceProfile {
  // Movement feel
  speedMult: number;        // 0.4 → 2.2   — base animation speed multiplier
  wobbleAmp: number;        // 0.4 → 1.8   — how much particles wander
  inwardGravity: number;    // 0.002 → 0.025 — how strongly they gather to centre
  spreadRadius: number;     // 0.18 → 0.46  — fraction of canvas width for spawn ring

  // Density
  particleCount: number;    // 8 → 120      — baseline count regardless of score
  connectionDist: number;   // 30 → 110     — max connection line distance

  // Visual
  primaryHue: number;       // 0 → 360 (HSL)
  primarySat: number;       // 20 → 90
  primaryLit: number;       // 40 → 80
  glowIntensity: number;    // 0.2 → 1.0
  nebulaOpacity: number;    // 0.15 → 0.55

  // Evolution label (for internal logic, not displayed)
  evolutionStage: 'scattered' | 'connected' | 'structured';

  // Movement pattern
  pattern: 'inward' | 'expansive' | 'orbital' | 'drift';

  // Photo-tinted flag — when true, PresenceField should attempt colour extraction
  usePhotoTint: boolean;
}

// ── Personality classification ────────────────────────────────────────────────
// We classify from action_type distributions, without any free-text parsing.

interface Personality {
  affectionate: number;   // 0–1  (touch + groom + sleep)
  active: number;         // 0–1  (walk + play)
  communicative: number;  // 0–1  (talk + memory)
  calm: number;           // 0–1  (feed + sleep + groom)
  photogenic: number;     // 0–1  (photo)
}

function classifyPersonality(logs: CareLog[]): Personality {
  if (logs.length === 0) {
    return { affectionate: 0.5, active: 0.5, communicative: 0.5, calm: 0.5, photogenic: 0.3 };
  }
  const total = logs.length;
  const count = (types: string[]) =>
    logs.filter(l => types.includes(l.action_type)).length / total;

  const affectionate = count(['touch', 'groom', 'sleep']);
  const active       = count(['walk', 'play']);
  const communicative = count(['talk', 'memory']);
  const calm         = count(['feed', 'sleep', 'groom']);
  const photogenic   = count(['photo']);

  return { affectionate, active, communicative, calm, photogenic };
}

// ── Evolution stage from total data depth ────────────────────────────────────

function evolutionStage(
  loveScore: number,
  logCount: number,
  memoryCount: number,
): PresenceProfile['evolutionStage'] {
  const depth = loveScore + logCount * 5 + memoryCount * 20;
  if (depth < 120) return 'scattered';
  if (depth < 600) return 'connected';
  return 'structured';
}

// ── Deterministic hue from pet name ──────────────────────────────────────────
// Same name → same hue always. Varies smoothly with personality overlay.

function nameHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

// ── Main derivation ───────────────────────────────────────────────────────────

export function derivePresenceProfile(
  petName: string,
  species: string,
  loveScore: number,
  logs: CareLog[],
  memories: AfterBondaMemory[],
  hasPhoto: boolean,
): PresenceProfile {
  const p = classifyPersonality(logs);
  const stage = evolutionStage(loveScore, logs.length, memories.length);
  const logCount = logs.length;
  const memCount = memories.length;

  // ── Speed: active pets = faster; calm/affectionate = slower ──────────────
  const speedMult = 0.55
    + p.active        * 1.2    // active → up to +1.2
    - p.affectionate  * 0.3    // affectionate → gentle reduction
    - p.calm          * 0.25;  // calm → slower
  const clampedSpeed = Math.max(0.4, Math.min(2.2, speedMult));

  // ── Wobble: active / communicative → more wandering; calm → tighter ──────
  const wobbleAmp = 0.5
    + p.active        * 0.9
    + p.communicative * 0.4
    - p.calm          * 0.35;
  const clampedWobble = Math.max(0.4, Math.min(1.8, wobbleAmp));

  // ── Gravity / movement pattern ────────────────────────────────────────────
  // affectionate → inward gather; active → expansive; calm → orbital drift
  let pattern: PresenceProfile['pattern'];
  let inwardGravity: number;
  if (p.affectionate >= 0.35) {
    pattern = 'inward';
    inwardGravity = 0.008 + p.affectionate * 0.014;
  } else if (p.active >= 0.35) {
    pattern = 'expansive';
    inwardGravity = 0.002 + (1 - p.active) * 0.005;
  } else if (p.calm >= 0.30) {
    pattern = 'orbital';
    inwardGravity = 0.004 + p.calm * 0.008;
  } else {
    pattern = 'drift';
    inwardGravity = 0.004;
  }
  const clampedGravity = Math.max(0.002, Math.min(0.025, inwardGravity));

  // ── Spread radius: active/communicative → wider; calm → tighter ──────────
  const spreadRadius = 0.22
    + p.active        * 0.16
    + p.communicative * 0.08
    - p.calm          * 0.06
    - p.affectionate  * 0.04;
  const clampedSpread = Math.max(0.18, Math.min(0.46, spreadRadius));

  // ── Particle count: grows with logs + memories, capped at 80 baseline ────
  const baseCount = Math.min(80, 8 + Math.floor(logCount * 0.8) + Math.floor(memCount * 2));
  const particleCount = Math.max(8, baseCount);

  // ── Connection distance: structured stage → longer lines ─────────────────
  const connBase = stage === 'structured' ? 90 : stage === 'connected' ? 65 : 40;
  const connectionDist = connBase + p.communicative * 20;

  // ── Hue ───────────────────────────────────────────────────────────────────
  // Base = name hash; shift toward warm gold for affectionate, cool sage for active
  let hue = nameHue(petName);
  hue = (hue + p.affectionate * 30 - p.active * 20 + 360) % 360;

  // Species override: cats lean cooler, dogs lean warmer, others neutral
  const sp = species.toLowerCase();
  if (sp === 'cat')  hue = (hue + 30) % 360;
  if (sp === 'dog')  hue = (hue - 15 + 360) % 360;

  // Sat: communicative → vivid; calm → muted
  const primarySat = Math.round(35 + p.communicative * 40 - p.calm * 15);
  const clampedSat = Math.max(20, Math.min(90, primarySat));

  // Lit: affectionate → lighter; active → slightly deeper
  const primaryLit = Math.round(68 - p.active * 18 + p.affectionate * 8);
  const clampedLit = Math.max(40, Math.min(80, primaryLit));

  // ── Glow intensity: higher with affectionate + memory depth ──────────────
  const glowIntensity = Math.min(1.0, 0.25 + p.affectionate * 0.5 + memCount * 0.04);

  // ── Nebula opacity: grows with stage + photogenic ─────────────────────────
  const nebulaBase = stage === 'structured' ? 0.40 : stage === 'connected' ? 0.28 : 0.18;
  const nebulaOpacity = Math.min(0.55, nebulaBase + p.photogenic * 0.15);

  return {
    speedMult: clampedSpeed,
    wobbleAmp: clampedWobble,
    inwardGravity: clampedGravity,
    spreadRadius: clampedSpread,
    particleCount,
    connectionDist,
    primaryHue: Math.round(hue),
    primarySat: clampedSat,
    primaryLit: clampedLit,
    glowIntensity,
    nebulaOpacity,
    evolutionStage: stage,
    pattern,
    usePhotoTint: hasPhoto && logCount >= 3,
  };
}

// ── HSL → RGBA helper used by canvas renderers ───────────────────────────────

export function profileColor(
  profile: PresenceProfile,
  alpha: number,
  lightnessShift = 0,
): string {
  const l = Math.min(95, profile.primaryLit + lightnessShift);
  return `hsla(${profile.primaryHue},${profile.primarySat}%,${l}%,${alpha})`;
}

// Accent color — complementary hue offset
export function profileAccent(profile: PresenceProfile, alpha: number): string {
  const hue = (profile.primaryHue + 40) % 360;
  return `hsla(${hue},${Math.max(20, profile.primarySat - 15)}%,${profile.primaryLit + 8}%,${alpha})`;
}
