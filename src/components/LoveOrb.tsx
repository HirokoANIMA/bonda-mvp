import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n';

interface Props {
  loveScore: number;
  todayLove: number;
  petName: string;
  presenceStage: 'care' | 'relationship' | 'presence';
}

// Maps love score to a 0–1 vitality value with soft curve
function vitality(score: number): number {
  return Math.min(1, score / 500);
}

// Interpolate between two hex colors
function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${b2})`;
}

export default function LoveOrb({ loveScore, todayLove, petName, presenceStage }: Props) {
  const { t } = useI18n();
  const v = vitality(loveScore);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const prevScoreRef = useRef<number>(loveScore);
  const burstRef = useRef<number>(0);
  const [displayScore, setDisplayScore] = useState(loveScore);

  // Animate score counter when score changes
  useEffect(() => {
    const from = prevScoreRef.current;
    const to = loveScore;
    if (from === to) return;

    burstRef.current = 1.0;
    prevScoreRef.current = to;

    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [loveScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const SIZE = canvas.width;
    const cx = SIZE / 2;
    const cy = SIZE / 2;

    // Stage color palettes: [innerGlow, outerGlow, waveColor]
    const palettes = {
      care:         ['#fde68a', '#fef3c7', '#fcd34d'],
      relationship: ['#6ee7b7', '#d1fae5', '#34d399'],
      presence:     ['#fcd34d', '#ecfdf5', '#6ee7b7'],
    };
    const [inner, outer, wave] = palettes[presenceStage];

    const draw = (timestamp: number) => {
      timeRef.current = timestamp * 0.001;
      const t = timeRef.current;

      // Decay burst
      if (burstRef.current > 0) {
        burstRef.current = Math.max(0, burstRef.current - 0.012);
      }

      const burst = burstRef.current;
      const pulse = Math.sin(t * 1.2) * 0.5 + 0.5;          // 0–1 slow breath
      const pulse2 = Math.sin(t * 2.1 + 1.2) * 0.5 + 0.5;   // offset secondary pulse
      const vBase = 0.3 + v * 0.7;                            // minimum 30% vitality

      ctx.clearRect(0, 0, SIZE, SIZE);

      // ── Outermost ambient halo ──
      const haloR = SIZE * (0.38 + vBase * 0.10 + pulse * 0.04 + burst * 0.08);
      const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      haloGrad.addColorStop(0,   `rgba(255,255,255,0)`);
      haloGrad.addColorStop(0.4, `rgba(255,255,255,0)`);
      haloGrad.addColorStop(0.7, hexToRgba(outer, 0.12 + vBase * 0.08 + burst * 0.10));
      haloGrad.addColorStop(1,   `rgba(255,255,255,0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();

      // ── Wave rings ──
      const numWaves = 3;
      for (let w = 0; w < numWaves; w++) {
        const phase = (w / numWaves) + t * 0.18;
        const frac = ((phase % 1) + 1) % 1;
        const waveR = SIZE * 0.15 * (0.5 + frac * 1.1);
        const opacity = (1 - frac) * (0.10 + vBase * 0.12 + burst * 0.10);
        if (opacity <= 0) continue;
        const wGrad = ctx.createRadialGradient(cx, cy, waveR * 0.7, cx, cy, waveR);
        wGrad.addColorStop(0, hexToRgba(wave, opacity));
        wGrad.addColorStop(1, hexToRgba(wave, 0));
        ctx.beginPath();
        ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
        ctx.fillStyle = wGrad;
        ctx.fill();
      }

      // ── Organic blob shape via perturbed circle ──
      const orbR = SIZE * (0.22 + vBase * 0.07 + pulse * 0.012 + burst * 0.025);
      const blobPoints = 64;
      ctx.beginPath();
      for (let i = 0; i <= blobPoints; i++) {
        const angle = (i / blobPoints) * Math.PI * 2;
        const noiseAmp = 0.018 + vBase * 0.014 + burst * 0.010;
        const n1 = Math.sin(angle * 3 + t * 0.9) * noiseAmp;
        const n2 = Math.sin(angle * 5 - t * 0.6) * noiseAmp * 0.6;
        const n3 = Math.sin(angle * 2 + t * 1.4) * noiseAmp * 0.4;
        const r = orbR * (1 + n1 + n2 + n3);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Orb fill gradient
      const orbGrad = ctx.createRadialGradient(
        cx - orbR * 0.25, cy - orbR * 0.25, orbR * 0.05,
        cx, cy, orbR * 1.1
      );
      const innerOpacity = 0.92 + vBase * 0.08;
      const outerOpacity = 0.55 + vBase * 0.25;
      orbGrad.addColorStop(0,   hexToRgba('#ffffff', innerOpacity));
      orbGrad.addColorStop(0.3, hexToRgba(inner, 0.85));
      orbGrad.addColorStop(0.75, hexToRgba(inner, outerOpacity));
      orbGrad.addColorStop(1,   hexToRgba(outer, 0.3));
      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Orb glow (shadow-like outer glow)
      const glowR = orbR * 1.35;
      const glowGrad = ctx.createRadialGradient(cx, cy, orbR * 0.6, cx, cy, glowR);
      glowGrad.addColorStop(0, hexToRgba(inner, 0.25 + vBase * 0.15 + burst * 0.12));
      glowGrad.addColorStop(1, hexToRgba(inner, 0));
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Specular highlight
      const specR = orbR * 0.32;
      const specGrad = ctx.createRadialGradient(
        cx - orbR * 0.28, cy - orbR * 0.30, 0,
        cx - orbR * 0.28, cy - orbR * 0.30, specR
      );
      specGrad.addColorStop(0, `rgba(255,255,255,${0.55 + pulse2 * 0.08})`);
      specGrad.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.beginPath();
      ctx.arc(cx - orbR * 0.28, cy - orbR * 0.30, specR, 0, Math.PI * 2);
      ctx.fillStyle = specGrad;
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [v, presenceStage]);

  const stageLabel = t(`orb.stage.${presenceStage}`);
  const stageMessage = t(`orb.message.${presenceStage}`);

  return (
    <div className="flex flex-col items-center select-none">
      {/* Canvas orb */}
      <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
        <canvas
          ref={canvasRef}
          width={260}
          height={260}
          className="absolute inset-0"
          style={{ imageRendering: 'auto' }}
        />

        {/* Center text overlay */}
        <div className="relative z-10 flex flex-col items-center gap-0.5 pointer-events-none">
          <p className="text-[11px] text-stone-400 uppercase tracking-[0.18em] font-medium">{t('orb.label.score')}</p>
          <p
            className="text-5xl font-bold text-stone-800 tabular-nums leading-none"
            style={{ textShadow: '0 1px 12px rgba(255,255,255,0.9)' }}
          >
            {displayScore.toLocaleString()}
          </p>
          {todayLove > 0 && (
            <div className="flex items-center gap-1 mt-1.5 bg-white/70 rounded-full px-2.5 py-1 backdrop-blur-sm">
              <span className="text-sage-500 text-xs font-semibold">+{todayLove}</span>
              <span className="text-stone-400 text-[10px]">{t('orb.label.today')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stage badge */}
      <div className="flex flex-col items-center gap-1 -mt-2">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-stone-100 rounded-full px-4 py-1.5 shadow-sm">
          <div className={`w-1.5 h-1.5 rounded-full ${
            presenceStage === 'presence' ? 'bg-amber-400' :
            presenceStage === 'relationship' ? 'bg-sage-400' :
            'bg-amber-300'
          } animate-pulse`} />
          <span className="text-xs font-semibold text-stone-600">{stageLabel}</span>
        </div>
        <p className="text-xs text-stone-400 font-light">{stageMessage}</p>
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
