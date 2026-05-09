import { useEffect, useRef, useState, useCallback } from 'react';
import type { useBondaStore } from '../lib/store';
import { useI18n } from '../lib/i18n';

// ── Interaction canvas — tap glow + particle attraction ───────────────────────

interface TapCanvasProps {
  active: boolean;        // tap or press active
  intensity: number;      // 0 = tap, 1 = long press
  size: number;
}

function TapCanvas({ active, intensity, size }: TapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const stateRef  = useRef({ active, intensity });

  useEffect(() => { stateRef.current = { active, intensity }; }, [active, intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    type P = { angle: number; dist: number; targetDist: number; size: number; alpha: number };
    const count = 18;
    const particles: P[] = Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2 + Math.random() * 0.3,
      dist: 52 + Math.random() * 24,
      targetDist: 52 + Math.random() * 24,
      size: 1.2 + Math.random() * 1.4,
      alpha: 0.18 + Math.random() * 0.20,
    }));

    let glowPhase = 0;
    let glowActive = false;
    let glowT = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const { active: a, intensity: iv } = stateRef.current;

      // Track glow trigger on active change
      if (a && !glowActive) { glowActive = true; glowT = 0; }
      if (!a) glowActive = false;

      glowPhase += 0.018;
      glowT = Math.min(1, glowT + 0.05);

      // Attraction force: pull particles toward coin when active
      const attractTarget = a ? (12 + iv * 20) : 0;
      for (const p of particles) {
        const naturalDist = p.targetDist;
        const desired = naturalDist - attractTarget;
        p.dist += (desired - p.dist) * 0.06;
        p.angle += (0.004 + iv * 0.003);
      }

      // Draw particles — subtly shimmer
      for (const p of particles) {
        const x = cx + Math.cos(p.angle) * p.dist;
        const y = cy + Math.sin(p.angle) * p.dist;
        const shimmer = 0.5 + 0.5 * Math.sin(glowPhase * 2.4 + p.angle * 3);
        const alpha = p.alpha * (a ? (0.6 + iv * 0.4 + shimmer * 0.25) : (0.22 + shimmer * 0.10));
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.size * 2.8);
        g.addColorStop(0, `rgba(253,215,65,${alpha})`);
        g.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.beginPath(); ctx.arc(x, y, p.size * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253,230,100,${alpha * 0.9})`; ctx.fill();
      }

      // Glow pulse from center — expands on tap
      if (a || glowT < 1) {
        const glowRadius = (W * 0.35) + (a ? iv * W * 0.12 : 0);
        const glowAlpha = a
          ? (0.10 + iv * 0.18 + 0.06 * Math.sin(glowPhase))
          : (0.12 * (1 - glowT));
        const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
        gg.addColorStop(0,   `rgba(253,220,80,${glowAlpha})`);
        gg.addColorStop(0.5, `rgba(253,180,60,${glowAlpha * 0.35})`);
        gg.addColorStop(1,   'rgba(253,180,60,0)');
        ctx.beginPath(); ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gg; ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // run once — reads state via refs

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="absolute pointer-events-none"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    />
  );
}

type Store = ReturnType<typeof useBondaStore>;

// ── Symbol derivation ─────────────────────────────────────────────────────────

function deriveCoinSymbol(name: string): string {
  const clean = name.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (clean.length <= 4) return clean || 'BOND';
  const consonants = clean.replace(/[AEIOU]/g, '');
  if (consonants.length >= 3) return consonants.slice(0, 3);
  return clean.slice(0, 3);
}

// ── Formation state ───────────────────────────────────────────────────────────

type FormationStage = 'not_formed' | 'forming' | 'ready' | 'minted';

function getFormationStage(
  loveScore: number,
  presenceProgress: number,
  memoryCount: number,
  photoCount: number,
  coinMinted: boolean,
): FormationStage {
  if (coinMinted) return 'minted';
  if (loveScore >= 200 && presenceProgress >= 30 && memoryCount >= 5 && photoCount >= 3) return 'ready';
  if (loveScore > 0 || memoryCount > 0) return 'forming';
  return 'not_formed';
}

function getProofStatus(stage: FormationStage, t: (k: string) => string): string {
  if (stage === 'minted') return t('coin.proof.verified');
  if (stage === 'ready') return t('coin.proof.ready');
  if (stage === 'forming') return t('coin.proof.forming');
  return t('coin.proof.growing');
}

function getMintStatus(stage: FormationStage, t: (k: string) => string): string {
  if (stage === 'minted') return t('coin.mint.minted');
  if (stage === 'ready') return t('coin.mint.ready');
  if (stage === 'forming') return t('coin.mint.forming');
  return t('coin.mint.not_formed');
}

// ── Coin face SVG ─────────────────────────────────────────────────────────────

interface CoinFaceProps {
  petName: string;
  symbol: string;
  stage: FormationStage;
  minting: boolean;
  tapActive?: boolean;       // single tap pressed
  pressIntensity?: number;   // 0–1 long press progress
  size?: number;
}

function CoinFace({ petName, symbol, stage, minting, tapActive = false, pressIntensity = 0, size = 96 }: CoinFaceProps) {
  const opacity = stage === 'not_formed' ? 0.35 : stage === 'forming' ? 0.62 : 1;
  const blur = stage === 'not_formed' ? 'blur(1.5px)' : stage === 'forming' ? 'blur(0.5px)' : 'none';

  const mintScale = minting ? 1.18 : 1;
  // tap: tilt 22deg; long press adds up to 12 more deg; release smoothly returns to 0
  const rotateDeg = tapActive ? (22 + pressIntensity * 12) : 0;
  const transform = `scale(${mintScale}) rotate(${rotateDeg}deg)`;
  const transition = tapActive
    ? 'transform 0.55s cubic-bezier(0.34, 1.28, 0.64, 1), opacity 1.2s ease, filter 1.2s ease'
    : 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 1.2s ease, filter 1.2s ease';

  // Edge highlight brightens under press
  const rimAlpha = 0.22 + (tapActive ? 0.28 + pressIntensity * 0.20 : 0);
  // Name visibility increases on press
  const nameFill = tapActive
    ? `rgba(92,50,10,${0.65 + pressIntensity * 0.28})`
    : 'rgba(92,50,10,0.65)';

  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        opacity,
        filter: blur,
        transform,
        transition,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden>
        <defs>
          <radialGradient id="coinGrad" cx="38%" cy="32%" r="65%">
            <stop offset="0%"   stopColor="#fef3c7" />
            <stop offset="40%"  stopColor="#fcd34d" />
            <stop offset="75%"  stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </radialGradient>
          <radialGradient id="coinShine" cx="35%" cy="28%" r="50%">
            <stop offset="0%"  stopColor={`rgba(255,255,255,${0.55 + (tapActive ? 0.22 + pressIntensity * 0.15 : 0)})`} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="coinInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(254,243,199,0.22)" />
            <stop offset="100%" stopColor="rgba(146,64,14,0.12)" />
          </radialGradient>
          <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0" dy={tapActive ? 5 + pressIntensity * 4 : 3}
              stdDeviation={tapActive ? 8 + pressIntensity * 4 : 5}
              floodColor="#92400e"
              floodOpacity={tapActive ? 0.38 + pressIntensity * 0.14 : 0.28}
            />
          </filter>
        </defs>

        <circle cx="48" cy="48" r="46" fill="url(#coinGrad)" filter="url(#coinShadow)" />
        {/* Edge highlight — brightens on press */}
        <circle cx="48" cy="48" r="45.5" fill="none"
          stroke={`rgba(255,248,200,${rimAlpha})`} strokeWidth="1.5" />
        <circle cx="48" cy="48" r="43" fill="none"
          stroke={`rgba(255,255,255,${0.14 + (tapActive ? 0.14 : 0)})`} strokeWidth="1" />
        <circle cx="48" cy="48" r="41" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5" />
        <circle cx="48" cy="48" r="38" fill="url(#coinInner)" />
        <circle cx="48" cy="48" r="46" fill="url(#coinShine)" />

        {/* Paw — engraved */}
        <g opacity="0.55" transform="translate(48,38) scale(0.72)">
          <ellipse cx="0" cy="7" rx="5.5" ry="4.5" fill="rgba(92,50,10,0.55)" />
          <ellipse cx="-6.5" cy="0"  rx="2.2" ry="2.7" fill="rgba(92,50,10,0.55)" />
          <ellipse cx="-2.2" cy="-2.2" rx="2.1" ry="2.5" fill="rgba(92,50,10,0.55)" />
          <ellipse cx=" 2.2" cy="-2.2" rx="2.1" ry="2.5" fill="rgba(92,50,10,0.55)" />
          <ellipse cx=" 6.5" cy="0"  rx="2.2" ry="2.7" fill="rgba(92,50,10,0.55)" />
        </g>

        <text x="48" y="64" textAnchor="middle" fontSize="8" fontWeight="600" letterSpacing="1.5"
          fill={nameFill}
          style={{ fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase',
            transition: 'fill 0.4s ease' }}>
          {petName.length > 8 ? petName.slice(0, 8) : petName}
        </text>
        <text x="48" y="76" textAnchor="middle" fontSize="6" fontWeight="400" letterSpacing="2"
          fill="rgba(120,70,15,0.50)"
          style={{ fontFamily: 'system-ui, sans-serif' }}>
          {symbol}
        </text>

        {stage === 'minted' && (
          <circle cx="48" cy="48" r="44" fill="none"
            stroke="rgba(253,230,138,0.65)" strokeWidth="1.5"
            strokeDasharray="4 3"
            style={{ animation: 'coinVerifiedRing 8s linear infinite' }}
          />
        )}
      </svg>
    </div>
  );
}

// ── Mint particle canvas ──────────────────────────────────────────────────────

function MintCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { cancelAnimationFrame(animRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; maxLife: number; delay: number };
    const particles: P[] = [];
    const start = performance.now();

    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 2.2;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        r: 1 + Math.random() * 2.5,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
        delay: Math.random() * 0.5,
      });
    }

    const draw = (ts: number) => {
      const elapsed = (ts - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      let allDone = true;
      for (const p of particles) {
        const age = elapsed - p.delay;
        if (age < 0) { allDone = false; continue; }
        const t = age / p.maxLife;
        if (t >= 1) continue;
        allDone = false;
        p.x += p.vx * 0.9;
        p.y += p.vy * 0.9;
        p.vy += 0.02;
        const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
        g.addColorStop(0, `rgba(253,220,80,${alpha * 0.8})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253,220,80,${alpha})`; ctx.fill();
      }
      if (!allDone) animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas ref={canvasRef} width={240} height={240}
      className="absolute pointer-events-none"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: active ? 1 : 0 }}
    />
  );
}

// ── Value option row ──────────────────────────────────────────────────────────

interface ValueOptionProps {
  icon: React.ReactNode;
  label: string;
  body: string;
  cta: string;
  tag?: string;          // optional soft pill e.g. "Partial only"
  delay?: number;        // stagger entrance
  visible: boolean;
}

function ValueOption({ icon, label, body, cta, tag, delay = 0, visible }: ValueOptionProps) {
  const [tapped, setTapped] = useState(false);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      <div
        className="rounded-2xl px-4 py-4"
        style={{
          background: 'rgba(255,253,248,0.70)',
          border: '1px solid rgba(200,180,120,0.18)',
        }}
      >
        {/* Icon + label row */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(200,168,80,0.12)' }}
          >
            {icon}
          </div>
          <p className="text-[13px] font-medium" style={{ color: 'rgba(55,48,35,0.88)' }}>
            {label}
          </p>
          {tag && (
            <span
              className="ml-auto text-[9px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(168,140,60,0.12)',
                color: 'rgba(140,108,40,0.75)',
                letterSpacing: '0.06em',
              }}
            >
              {tag}
            </span>
          )}
        </div>

        {/* Body */}
        <p className="text-[12px] font-light leading-[1.75] mb-3" style={{ color: 'rgba(90,80,62,0.65)' }}>
          {body}
        </p>

        {/* CTA — text link style, never a filled button */}
        <button
          onClick={() => { setTapped(true); setTimeout(() => setTapped(false), 1200); }}
          className="text-[11px] font-medium transition-all duration-300"
          style={{
            color: tapped ? 'rgba(160,128,50,0.55)' : 'rgba(160,128,50,0.80)',
            letterSpacing: '0.04em',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            textDecorationColor: tapped ? 'rgba(160,128,50,0.25)' : 'rgba(160,128,50,0.40)',
          }}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

// ── Formation bar ─────────────────────────────────────────────────────────────

function FormationBar({ loveScore, presenceProgress, memoryCount, photoCount }: {
  loveScore: number; presenceProgress: number; memoryCount: number; photoCount: number;
}) {
  const checks = [
    { prog: Math.min(1, loveScore / 200) },
    { prog: Math.min(1, presenceProgress / 30) },
    { prog: Math.min(1, memoryCount / 5) },
    { prog: Math.min(1, photoCount / 3) },
  ];
  const overall = checks.reduce((s, c) => s + c.prog, 0) / checks.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] uppercase tracking-[0.18em] font-medium" style={{ color: 'rgba(140,120,70,0.55)' }}>
          Formation
        </span>
        <span className="text-[9px] font-medium" style={{ color: 'rgba(140,120,70,0.70)' }}>
          {Math.round(overall * 100)}%
        </span>
      </div>
      <div className="h-px rounded-full" style={{ background: 'rgba(200,168,88,0.15)' }}>
        <div
          className="h-px rounded-full transition-all duration-1000"
          style={{
            width: `${overall * 100}%`,
            background: `linear-gradient(90deg, rgba(200,168,88,0.5), rgba(253,220,80,${0.5 + overall * 0.45}))`,
          }}
        />
      </div>
    </div>
  );
}

// ── Data cell ─────────────────────────────────────────────────────────────────

function DataCell({ label, value, labelColor, valueColor, highlight = false }: {
  label: string; value: string; labelColor: string; valueColor: string; highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.15em] font-medium mb-0.5" style={{ color: labelColor }}>
        {label}
      </p>
      <p className="text-[12px] font-medium leading-snug" style={{
        color: highlight ? 'rgba(160,128,40,0.90)' : valueColor,
        textShadow: highlight ? '0 0 12px rgba(253,220,80,0.35)' : 'none',
      }}>
        {value}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { store: Store; }

export default function BondaCoin({ store }: Props) {
  const { t } = useI18n();
  const { pet, logs, presenceProgress, afterMemories, coinMinted, mintCoin } = store;

  const [minting, setMinting] = useState(false);
  const [mintDone, setMintDone] = useState(false);
  const [showMintOverlay, setShowMintOverlay] = useState(false);
  const [valueExpanded, setValueExpanded] = useState(false);

  // Tap / long-press interaction state
  const [tapActive, setTapActive] = useState(false);
  const [pressIntensity, setPressIntensity] = useState(0);
  const pressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressStartRef = useRef<number>(0);

  const startPress = useCallback(() => {
    setTapActive(true);
    setPressIntensity(0);
    pressStartRef.current = performance.now();
    if (pressTimerRef.current) clearInterval(pressTimerRef.current);
    pressTimerRef.current = setInterval(() => {
      const elapsed = (performance.now() - pressStartRef.current) / 1000;
      setPressIntensity(Math.min(1, elapsed / 1.2)); // ramp over 1.2s
    }, 30);
  }, []);

  const endPress = useCallback(() => {
    if (pressTimerRef.current) { clearInterval(pressTimerRef.current); pressTimerRef.current = null; }
    setTapActive(false);
    setPressIntensity(0);
  }, []);

  // Clean up on unmount
  useEffect(() => () => { if (pressTimerRef.current) clearInterval(pressTimerRef.current); }, []);

  const photoCount = logs.filter(l => l.action_type === 'photo').length;
  const memoryCount = afterMemories.length;
  const symbol = deriveCoinSymbol(pet.name);
  const coinName = `${pet.name} Coin`;

  const stage = getFormationStage(pet.love_score, presenceProgress, memoryCount, photoCount, coinMinted);
  const proofStatus = getProofStatus(stage, (k) => t(k as Parameters<typeof t>[0]));
  const mintStatus = getMintStatus(stage, (k) => t(k as Parameters<typeof t>[0]));
  const canMint = stage === 'ready';
  const showValueSection = stage === 'minted';

  const handleMint = useCallback(() => {
    if (!canMint || minting) return;
    setMinting(true);
    setShowMintOverlay(true);
    setTimeout(() => {
      mintCoin();
      setMinting(false);
      setMintDone(true);
    }, 2200);
  }, [canMint, minting, mintCoin]);

  const handleDismissOverlay = useCallback(() => {
    if (!mintDone) return;
    setShowMintOverlay(false);
    // Expand value section after dismissal
    setTimeout(() => setValueExpanded(true), 600);
  }, [mintDone]);

  // Auto-expand if already minted on mount
  useEffect(() => {
    if (coinMinted) setValueExpanded(true);
  }, [coinMinted]);

  const labelColor = 'rgba(100,90,78,0.55)';
  const valueColor = 'rgba(55,48,38,0.85)';

  return (
    <>
      {/* ── Coin card ─────────────────────────────────────────────────────── */}
      <div
        className="mx-5 mb-2 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,253,248,0.97) 0%, rgba(253,246,225,0.85) 60%, rgba(250,241,210,0.75) 100%)',
          border: `1px solid rgba(200,168,88,${stage === 'minted' ? 0.45 : 0.20})`,
          boxShadow: stage === 'minted'
            ? '0 0 28px rgba(253,220,80,0.18), 0 2px 12px rgba(180,140,40,0.12)'
            : '0 1px 8px rgba(168,148,100,0.08)',
          transition: 'box-shadow 1.5s ease, border-color 1.5s ease',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: 'rgba(168,140,60,0.70)' }}>
              {t('coin.badge')}
            </p>
            <p className="text-[12px] font-light mt-0.5" style={{ color: 'rgba(100,88,68,0.60)' }}>
              {t('coin.subtitle')}
            </p>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: stage === 'minted'
                ? 'rgba(200,170,60,0.9)'
                : stage === 'ready'
                ? 'rgba(140,190,140,0.8)'
                : stage === 'forming'
                ? 'rgba(200,170,100,0.5)'
                : 'rgba(168,158,148,0.35)',
              animation: stage !== 'not_formed' ? 'pawBreathe 2.5s ease-in-out infinite' : 'none',
              boxShadow: stage === 'minted' ? '0 0 8px rgba(200,170,60,0.6)' : 'none',
            }}
          />
        </div>

        {/* Main row */}
        <div className="px-5 pb-4 flex items-start gap-4">
          <div
            className="relative flex-shrink-0 select-none"
            style={{ width: 96, height: 96, cursor: 'pointer' }}
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            onTouchCancel={endPress}
          >
            {/* Subtle ambient particles always orbit; glow + attraction on press */}
            <TapCanvas active={tapActive} intensity={pressIntensity} size={180} />
            <CoinFace
              petName={pet.name}
              symbol={symbol}
              stage={stage}
              minting={minting}
              tapActive={tapActive}
              pressIntensity={pressIntensity}
              size={96}
            />
            {stage === 'minted' && (
              <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                background: `radial-gradient(circle, rgba(253,220,80,${tapActive ? 0.32 + pressIntensity * 0.18 : 0.22}) 0%, transparent 70%)`,
                animation: 'pawGlow 3s ease-in-out infinite',
                transition: 'background 0.3s ease',
              }} />
            )}
          </div>

          <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-3 gap-y-2.5">
            <DataCell label={t('coin.label.name')} value={coinName} labelColor={labelColor} valueColor={valueColor} />
            <DataCell label={t('coin.label.symbol')} value={symbol} labelColor={labelColor} valueColor={valueColor} />
            <DataCell label={t('coin.label.score')} value={pet.love_score.toLocaleString()} labelColor={labelColor} valueColor={valueColor} />
            <DataCell label={t('coin.label.deposits')} value={String(memoryCount)} labelColor={labelColor} valueColor={valueColor} />
            <DataCell label={t('coin.label.proof')} value={proofStatus} labelColor={labelColor} valueColor={valueColor} highlight={stage === 'minted'} />
            <DataCell label={t('coin.label.mint')} value={mintStatus} labelColor={labelColor} valueColor={valueColor} highlight={stage !== 'not_formed'} />
          </div>
        </div>

        {/* Formation bar */}
        {stage !== 'minted' && (
          <div className="px-5 pb-3">
            <FormationBar loveScore={pet.love_score} presenceProgress={presenceProgress} memoryCount={memoryCount} photoCount={photoCount} />
          </div>
        )}

        {/* Mint button */}
        {canMint && !coinMinted && (
          <div className="px-5 pb-5">
            <button
              onClick={handleMint}
              disabled={minting}
              className="w-full py-3.5 rounded-2xl text-sm font-medium tracking-wide transition-all duration-500 select-none"
              style={{
                background: minting
                  ? 'rgba(200,168,88,0.30)'
                  : 'linear-gradient(135deg, rgba(180,145,50,0.90) 0%, rgba(140,108,28,0.95) 100%)',
                color: minting ? 'rgba(120,90,30,0.55)' : 'rgba(255,252,235,0.97)',
                boxShadow: minting ? 'none' : '0 4px 18px rgba(160,128,40,0.30)',
              }}
            >
              {minting ? '…' : t('coin.cta').replace('{{name}}', pet.name)}
            </button>
          </div>
        )}

        {/* Verified footer */}
        {stage === 'minted' && (
          <div className="px-5 pb-4 text-center" style={{ borderTop: '1px solid rgba(200,168,88,0.15)' }}>
            <p className="text-[12px] font-light pt-3" style={{ color: 'rgba(140,108,50,0.75)', letterSpacing: '0.02em' }}>
              {t('coin.minted.headline')}
            </p>
          </div>
        )}
      </div>

      {/* ── Value transformation section ───────────────────────────────────── */}
      {showValueSection && (
        <div
          className="mx-5 mb-5"
          style={{
            opacity: valueExpanded ? 1 : 0,
            transform: valueExpanded ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.9s ease, transform 0.9s ease',
            pointerEvents: valueExpanded ? 'auto' : 'none',
          }}
        >
          {/* Section header */}
          <div className="px-1 mb-4">
            <p
              className="text-[10px] uppercase tracking-[0.2em] font-medium mb-2"
              style={{ color: 'rgba(168,140,60,0.65)' }}
            >
              {t('coin.value.heading')}
            </p>
            <p
              className="text-[14px] font-light leading-[1.85]"
              style={{ color: 'rgba(70,60,45,0.72)', whiteSpace: 'pre-line' }}
            >
              {t('coin.value.body')}
            </p>
          </div>

          {/* Three options */}
          <div className="space-y-2.5">
            {/* Donation */}
            <ValueOption
              visible={valueExpanded}
              delay={0}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(160,128,50,0.70)">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              }
              label={t('coin.value.donation.label')}
              body={t('coin.value.donation.body')}
              cta={t('coin.value.donation.cta')}
            />

            {/* Social utility */}
            <ValueOption
              visible={valueExpanded}
              delay={80}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(160,128,50,0.70)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
                </svg>
              }
              label={t('coin.value.utility.label')}
              body={t('coin.value.utility.body')}
              cta={t('coin.value.utility.cta')}
            />

            {/* Partial conversion */}
            <ValueOption
              visible={valueExpanded}
              delay={160}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(160,128,50,0.70)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
              label={t('coin.value.convert.label')}
              body={t('coin.value.convert.body')}
              cta={t('coin.value.convert.cta')}
              tag={t('coin.value.convert.limit')}
            />
          </div>

          {/* Legal-tone notice — small, quiet, honest */}
          <p
            className="text-[10px] font-light leading-[1.7] mt-4 px-1"
            style={{ color: 'rgba(140,120,80,0.45)' }}
          >
            {t('coin.value.notice')}
          </p>
        </div>
      )}

      {/* ── Mint overlay ───────────────────────────────────────────────────── */}
      {showMintOverlay && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background: 'rgba(250,246,230,0.95)',
            backdropFilter: 'blur(8px)',
            cursor: mintDone ? 'pointer' : 'default',
          }}
          onClick={handleDismissOverlay}
        >
          <div className="relative">
            <MintCanvas active={minting || mintDone} />
            <div style={{ position: 'relative', zIndex: 10 }}>
              <CoinFace petName={pet.name} symbol={symbol} stage={mintDone ? 'minted' : 'ready'} minting={minting} size={130} />
            </div>
          </div>

          <div
            className="mt-8 text-center px-8"
            style={{
              opacity: mintDone ? 1 : 0,
              transform: mintDone ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.9s ease 0.3s, transform 0.9s ease 0.3s',
            }}
          >
            <p className="text-[20px] font-light" style={{ color: 'rgba(55,45,28,0.85)', lineHeight: 1.5, letterSpacing: '0.01em' }}>
              {t('coin.minted.headline')}
            </p>
            <p className="text-[13px] font-light mt-2" style={{ color: 'rgba(120,100,60,0.60)' }}>
              {t('coin.minted.sub')}
            </p>
            <p className="text-[11px] mt-6" style={{ color: 'rgba(140,120,80,0.45)', letterSpacing: '0.06em' }}>
              {coinName} · {symbol}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
