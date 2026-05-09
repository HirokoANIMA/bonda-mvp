import { useEffect, useRef, useCallback } from 'react';
import type { PresenceProfile } from '../lib/presenceProfile';
import { profileAccent } from '../lib/presenceProfile';

export interface TouchPoint {
  nx: number;
  ny: number;
  intensity: number;
}

interface Props {
  loveScore: number;
  presenceStage: 'care' | 'relationship' | 'presence';
  profile: PresenceProfile;
  holdProgress: number;
  demoMode: boolean;
  onDemoActivate: () => void;
  onHoldChange: (progress: number) => void;
  touchPoint?: TouchPoint | null;
  speakFlickerAt?: number;
  petPhotoUrl?: string;
  meetOnlineActive?: boolean;
}

interface Particle {
  x: number; y: number;
  baseX: number; baseY: number;
  r: number; opacity: number;
  speed: number; angle: number; drift: number;
  birth: number; life: number;
  burstVx: number; burstVy: number; burstT: number;
  hueShift: number;
  orbAngle: number;
  orbRadius: number;
}

const MAX_PARTICLES = 120;
const LONG_PRESS_MS = 2000;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function lifeFraction(p: Particle, now: number): number {
  return Math.min(1, (now - p.birth) / p.life);
}

// ── Photo colour extraction ───────────────────────────────────────────────────

interface PhotoTint { hue: number; sat: number; lit: number; }

function extractPhotoTint(img: HTMLImageElement): PhotoTint {
  try {
    const size = 16;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d')!;
    const s  = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth  - s) / 2;
    const sy = (img.naturalHeight - s) / 2;
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 128) continue;
      if (r > 235 && g > 235 && b > 235) continue;
      rSum += r; gSum += g; bSum += b; count++;
    }
    if (count === 0) return { hue: 40, sat: 40, lit: 65 };
    const r = rSum / count / 255, g = gSum / count / 255, b = bSum / count / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    let h = 0;
    if (delta > 0.001) {
      if (max === r) h = ((g - b) / delta + 6) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
    }
    const l = (max + min) / 2;
    const sat = delta < 0.001 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    return { hue: Math.round(h), sat: Math.round(sat * 100), lit: Math.round(l * 100) };
  } catch {
    return { hue: 40, sat: 40, lit: 65 };
  }
}

// ── Particle factory ──────────────────────────────────────────────────────────

function makeParticle(W: number, H: number, now: number, profile: PresenceProfile): Particle {
  const cx = W / 2; const cy = H / 2;
  const angle = Math.random() * Math.PI * 2;
  const dist  = 20 + Math.pow(Math.random(), 0.6) * W * profile.spreadRadius;
  const bx = cx + Math.cos(angle) * dist;
  const by = cy + Math.sin(angle) * dist;
  return {
    x: bx, y: by, baseX: bx, baseY: by,
    r: 0.8 + Math.random() * 2.2,
    opacity: 0.22 + Math.random() * 0.55,
    speed: (0.3 + Math.random() * 0.6) * profile.speedMult,
    angle, drift: Math.random() * Math.PI * 2,
    birth: now, life: 14 + Math.random() * 18,
    burstVx: 0, burstVy: 0, burstT: -1,
    hueShift: (Math.random() - 0.5) * 30,
    orbAngle: angle, orbRadius: dist,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PresenceField({
  loveScore, presenceStage, profile,
  holdProgress, demoMode, onDemoActivate, onHoldChange,
  touchPoint, speakFlickerAt = 0, petPhotoUrl, meetOnlineActive = false,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const animRef      = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const profileRef   = useRef<PresenceProfile>(profile);

  const scoreRef        = useRef(loveScore);
  const holdRef         = useRef(0);
  const demoRef         = useRef(false);
  const demoFadeRef     = useRef(0);
  const burstTimeRef    = useRef(-1);
  const touchRef        = useRef<TouchPoint | null>(null);
  const speakFlickerRef = useRef(0);
  const petImgRef       = useRef<HTMLImageElement | null>(null);
  const petImgReadyRef  = useRef(false);
  const meetOnlineRef   = useRef(false);
  const photoTintRef    = useRef<PhotoTint | null>(null);

  const pressStartRef = useRef<number | null>(null);
  const holdRafRef    = useRef<number>(0);
  const activatedRef  = useRef(false);

  useEffect(() => { scoreRef.current   = loveScore; },      [loveScore]);
  useEffect(() => { holdRef.current    = holdProgress; },   [holdProgress]);
  useEffect(() => { touchRef.current   = touchPoint ?? null; }, [touchPoint]);
  useEffect(() => { speakFlickerRef.current = speakFlickerAt; }, [speakFlickerAt]);
  useEffect(() => { meetOnlineRef.current   = meetOnlineActive; }, [meetOnlineActive]);
  useEffect(() => { profileRef.current      = profile; },   [profile]);

  // Load photo + extract tint
  useEffect(() => {
    if (!petPhotoUrl) return;
    petImgReadyRef.current = false;
    photoTintRef.current   = null;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      petImgRef.current     = img;
      petImgReadyRef.current = true;
      if (profileRef.current.usePhotoTint) {
        photoTintRef.current = extractPhotoTint(img);
      }
    };
    img.onerror = () => { petImgReadyRef.current = false; };
    img.src = petPhotoUrl;
  }, [petPhotoUrl]);

  // Demo burst
  useEffect(() => {
    const wasDemo = demoRef.current;
    demoRef.current = demoMode;
    if (!wasDemo && demoMode) {
      burstTimeRef.current = performance.now() * 0.001;
      const canvas = canvasRef.current;
      if (canvas) {
        const cx = canvas.width / 2; const cy = canvas.height / 2;
        particlesRef.current.forEach(p => {
          const dx = p.x - cx; const dy = p.y - cy;
          const d  = Math.sqrt(dx*dx + dy*dy) + 0.001;
          const sp = 2.5 + Math.random() * 3;
          p.burstVx = (dx/d)*sp; p.burstVy = (dy/d)*sp;
          p.burstT  = burstTimeRef.current;
        });
      }
    }
    if (!demoMode) demoFadeRef.current = 0;
  }, [demoMode]);

  // Long-press
  const startHoldTick = useCallback(() => {
    activatedRef.current = false;
    const start = performance.now();
    const tick = () => {
      if (pressStartRef.current === null) return;
      const progress = Math.min(1, (performance.now() - start) / LONG_PRESS_MS);
      onHoldChange(progress);
      holdRef.current = progress;
      if (progress < 1) { holdRafRef.current = requestAnimationFrame(tick); }
      else if (!activatedRef.current) {
        activatedRef.current = true;
        onDemoActivate();
        onHoldChange(0);
        pressStartRef.current = null;
      }
    };
    holdRafRef.current = requestAnimationFrame(tick);
  }, [onHoldChange, onDemoActivate]);

  const endHold = useCallback(() => {
    pressStartRef.current = null;
    cancelAnimationFrame(holdRafRef.current);
    const decayFrom  = holdRef.current;
    const decayStart = performance.now();
    const decay = (now: number) => {
      const elapsed = Math.min(1, (now - decayStart) / 400);
      const val = decayFrom * (1 - easeInOut(elapsed));
      onHoldChange(val); holdRef.current = val;
      if (elapsed < 1) holdRafRef.current = requestAnimationFrame(decay);
    };
    holdRafRef.current = requestAnimationFrame(decay);
  }, [onHoldChange]);

  const handlePressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (pressStartRef.current !== null) return;
    pressStartRef.current = performance.now();
    startHoldTick();
  }, [startHoldTick]);

  const handlePressEnd = useCallback(() => {
    if (pressStartRef.current === null) return;
    endHold();
  }, [endHold]);

  // ── Draw loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width; const H = canvas.height;
    const cx = W / 2; const cy = H / 2;

    const offscreen = document.createElement('canvas');
    offscreen.width = W; offscreen.height = H;
    offscreenRef.current = offscreen;
    const octx = offscreen.getContext('2d')!;

    // Seed particles from profile
    const pf0 = profileRef.current;
    particlesRef.current = Array.from(
      { length: Math.max(pf0.particleCount, 8) },
      () => makeParticle(W, H, performance.now() * 0.001 - Math.random() * 20, pf0)
    );

    // ── Colour helpers (read from refs so photo tint is always current) ────
    const getColor = (alpha: number, hueShift = 0): string => {
      const tint = photoTintRef.current;
      const pf   = profileRef.current;
      if (tint && pf.usePhotoTint) {
        const h = (tint.hue + hueShift + 360) % 360;
        return `hsla(${h},${Math.max(20, Math.min(85, tint.sat))}%,${Math.max(45, Math.min(78, tint.lit))}%,${alpha})`;
      }
      return `hsla(${(pf.primaryHue + hueShift + 360) % 360},${pf.primarySat}%,${pf.primaryLit}%,${alpha})`;
    };

    const getAccent = (alpha: number): string => {
      const tint = photoTintRef.current;
      const pf   = profileRef.current;
      if (tint && pf.usePhotoTint) {
        return `hsla(${(tint.hue + 35 + 360) % 360},${Math.max(20, tint.sat - 10)}%,${Math.min(80, tint.lit + 8)}%,${alpha})`;
      }
      return profileAccent(pf, alpha);
    };

    let lastSpawn = 0;
    let smoothDemoFade = 0, smoothMeetFade = 0;
    let photoOffsetX = 0, photoOffsetY = 0;

    const draw = (timestamp: number) => {
      const t    = timestamp * 0.001;
      const pf   = profileRef.current;
      const score  = scoreRef.current;
      const hold   = holdRef.current;
      const inDemo = demoRef.current;
      const burstT = burstTimeRef.current;
      const inMeet = meetOnlineRef.current;
      const tp     = touchRef.current;

      const stage1 = Math.min(1, hold / 0.25);
      const stage2 = Math.max(0, Math.min(1, (hold - 0.25) / 0.75));
      const burstAge    = burstT >= 0 ? t - burstT : -1;
      const burstActive = burstAge >= 0 && burstAge < 1.2;

      smoothDemoFade = lerp(smoothDemoFade, inDemo ? 1 : 0, 0.04);
      demoFadeRef.current = smoothDemoFade;
      smoothMeetFade = lerp(smoothMeetFade, inMeet ? 1 : 0, inMeet ? 0.025 : 0.015);

      if (smoothMeetFade > 0.1 && tp && tp.intensity > 0) {
        photoOffsetX = lerp(photoOffsetX, (tp.nx - 0.5) * W * 0.06 * tp.intensity, 0.04);
        photoOffsetY = lerp(photoOffsetY, (tp.ny - 0.5) * H * 0.06 * tp.intensity, 0.04);
      } else {
        photoOffsetX = lerp(photoOffsetX, 0, 0.03);
        photoOffsetY = lerp(photoOffsetY, 0, 0.03);
      }

      const vitality   = Math.min(1, score / 400);
      const holdBoost  = stage2 * 0.85;
      const demoBoost  = inDemo ? 0.85 : 0;
      const meetBoost  = smoothMeetFade * 0.6;
      const effectiveV = Math.min(1, vitality + holdBoost + demoBoost + meetBoost);

      const minCount    = inDemo || inMeet ? 40 : hold > 0.1 ? Math.floor(8 + stage2 * 30) : 8;
      const targetCount = Math.max(minCount, Math.min(MAX_PARTICLES, pf.particleCount + Math.floor(score * 0.004 * MAX_PARTICLES * 0.5) + 4));
      if (particlesRef.current.length < targetCount && t - lastSpawn > (hold > 0.3 ? 0.08 : 0.35)) {
        particlesRef.current.push(makeParticle(W, H, t, pf));
        lastSpawn = t;
      }

      ctx.clearRect(0, 0, W, H);
      const breath = Math.sin(t * 0.4) * 0.5 + 0.5;

      // Background
      const bgG = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.65);
      bgG.addColorStop(0, 'rgba(255,253,247,1)');
      bgG.addColorStop(0.5, 'rgba(254,249,240,0.7)');
      bgG.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

      // Burst flash
      if (burstActive) {
        const ft = burstAge / 1.2;
        const fr = W * (0.15 + ft * 0.45);
        const fa = (1 - ft) * (1 - ft) * 0.55;
        const fg = ctx.createRadialGradient(cx, cy, fr * 0.3, cx, cy, fr);
        fg.addColorStop(0, getColor(fa * 1.4, 10));
        fg.addColorStop(0.5, getColor(fa * 0.7, 10));
        fg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(cx, cy, fr, 0, Math.PI*2);
        ctx.fillStyle = fg; ctx.fill();
      }

      // Nebula
      const nebulaExpand    = burstActive ? Math.sin(burstAge / 1.2 * Math.PI) * 0.10 : 0;
      const nebulaR = W * (0.18 + effectiveV * 0.24 + breath * 0.03 + stage2 * 0.04 + nebulaExpand + smoothMeetFade * 0.08);
      const nOp = pf.nebulaOpacity;
      const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, nebulaR);
      ng.addColorStop(0,   getColor(nOp * (0.55 + effectiveV * 0.55)));
      ng.addColorStop(0.4, getColor(nOp * (0.25 + effectiveV * 0.45)));
      ng.addColorStop(0.8, getAccent(nOp * (0.10 + effectiveV * 0.22)));
      ng.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, nebulaR, 0, Math.PI*2);
      ctx.fillStyle = ng; ctx.fill();

      // Pulse ring
      if (stage2 > 0.05 || inDemo || smoothMeetFade > 0.05) {
        const pi  = Math.max(inDemo ? (Math.sin(t * 2.2) * 0.5 + 0.5) : stage2, smoothMeetFade * 0.85);
        const pg  = ctx.createRadialGradient(cx, cy, W * (0.30 + pi * 0.10) * 0.65, cx, cy, W * (0.30 + pi * 0.10));
        pg.addColorStop(0, getColor(pi * 0.28 * pf.glowIntensity));
        pg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(cx, cy, W * (0.30 + pi * 0.10), 0, Math.PI*2);
        ctx.fillStyle = pg; ctx.fill();
      }

      // Connections
      const maxDist = pf.connectionDist + effectiveV * 30;
      for (let i = 0; i < particlesRef.current.length; i++) {
        const a = particlesRef.current[i];
        if (lifeFraction(a, t) <= 0 || lifeFraction(a, t) >= 1) continue;
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const b = particlesRef.current[j];
          if (lifeFraction(b, t) <= 0 || lifeFraction(b, t) >= 1) continue;
          const dx = a.x - b.x; const dy = a.y - b.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > maxDist) continue;
          const strength = (1 - dist / maxDist) * Math.min(lifeFraction(a, t), lifeFraction(b, t));
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = getColor(strength * (0.10 + effectiveV * 0.14));
          ctx.lineWidth   = strength * (0.8 + stage2 * 0.6);
          ctx.stroke();
        }
      }

      // Touch glow
      if (tp && tp.intensity > 0) {
        const tx = tp.nx * W; const ty = tp.ny * H;
        const tR = W * (0.12 + tp.intensity * 0.10);
        const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, tR);
        tg.addColorStop(0,   getColor(tp.intensity * 0.38 * pf.glowIntensity));
        tg.addColorStop(0.5, getColor(tp.intensity * 0.14 * pf.glowIntensity));
        tg.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(tx, ty, tR, 0, Math.PI*2);
        ctx.fillStyle = tg; ctx.fill();
      }

      // Speak rings
      const sfAt = speakFlickerRef.current;
      const sfAge = sfAt > 0 ? t - sfAt / 1000 : -1;
      const sfActive = sfAge >= 0 && sfAge < 1.8;
      if (sfActive) {
        for (let ring = 0; ring < 3; ring++) {
          const ra = Math.max(0, sfAge - ring * 0.22);
          const rt = Math.min(1, ra / 1.2);
          const ralpha = (1 - rt) * (1 - rt) * 0.28;
          if (ralpha < 0.005) continue;
          ctx.beginPath(); ctx.arc(cx, cy, W * (0.08 + rt * 0.30), 0, Math.PI*2);
          ctx.strokeStyle = getColor(ralpha);
          ctx.lineWidth = 1.2 * (1 - rt);
          ctx.stroke();
        }
      }

      // Photo
      const touchOp = tp ? tp.intensity * 0.50 : 0;
      const speakOp = sfActive && sfAge < 0.55 ? Math.max(0, Math.sin((sfAge / 0.55) * Math.PI)) * 0.40 : 0;
      const demoOp  = smoothDemoFade * 0.60;
      const meetOp  = smoothMeetFade * 0.65;
      const photoOp = Math.max(touchOp, speakOp, demoOp, meetOp);

      if (photoOp > 0.005 && petImgReadyRef.current && petImgRef.current) {
        const img = petImgRef.current;
        let blur = meetOp >= demoOp && meetOp >= touchOp && meetOp >= speakOp
          ? 6 - smoothMeetFade * 1.5
          : touchOp >= demoOp && touchOp >= speakOp
            ? (tp ? 8 - tp.intensity * 2.5 : 8)
            : speakOp >= demoOp ? 8 : 8 - smoothDemoFade * 2;
        blur = Math.max(4, blur);

        const breathScale = 1
          + (smoothMeetFade > 0.5 ? Math.sin(t * 0.85) * 0.022 : 0)
          + ((touchOp > 0 || demoOp > 0) ? Math.sin(t * 0.55) * 0.012 : 0);

        const photoR = W * 0.32 * breathScale;
        const drawCx = cx + photoOffsetX; const drawCy = cy + photoOffsetY;

        const imgA = img.naturalWidth / img.naturalHeight;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (imgA > 1) { sw = sh; sx = (img.naturalWidth - sw) / 2; }
        else          { sh = sw; sy = (img.naturalHeight - sh) / 2; }

        octx.clearRect(0, 0, W, H);
        octx.save(); octx.filter = `blur(${blur}px)`;
        octx.drawImage(img, sx, sy, sw, sh, drawCx - photoR*1.1, drawCy - photoR*1.1, photoR*2.2, photoR*2.2);
        octx.restore(); octx.filter = 'none';

        const maskR = photoR * 1.05;
        const mask  = octx.createRadialGradient(drawCx, drawCy, photoR * (0.15 + smoothMeetFade * 0.12), drawCx, drawCy, maskR);
        mask.addColorStop(0,    'rgba(0,0,0,1)');
        mask.addColorStop(0.50, `rgba(0,0,0,${0.90 + smoothMeetFade * 0.08})`);
        mask.addColorStop(0.78, 'rgba(0,0,0,0.45)');
        mask.addColorStop(1,    'rgba(0,0,0,0)');
        octx.globalCompositeOperation = 'destination-in';
        octx.beginPath(); octx.arc(drawCx, drawCy, maskR, 0, Math.PI*2);
        octx.fillStyle = mask; octx.fill();
        octx.globalCompositeOperation = 'source-over';

        ctx.globalAlpha = photoOp;
        ctx.drawImage(offscreen, 0, 0);
        ctx.globalAlpha = 1;
      }

      // Particles
      const gatherForce = pf.inwardGravity + stage1 * 0.008 + stage2 * 0.047 + (inDemo ? 0.022 : 0) + smoothMeetFade * 0.035;
      const speedFinal  = pf.speedMult * (inDemo || inMeet ? 1.8 : 1 + stage1 * 0.3 + stage2 * 1.2);

      for (const p of particlesRef.current) {
        const age = lifeFraction(p, t);
        if (age <= 0) continue;

        // Pattern movement
        if (pf.pattern === 'orbital' && !inDemo && !inMeet && stage2 < 0.1) {
          p.orbAngle += 0.004 * pf.speedMult;
          p.baseX = cx + Math.cos(p.orbAngle) * p.orbRadius;
          p.baseY = cy + Math.sin(p.orbAngle) * p.orbRadius;
        } else if (pf.pattern === 'expansive' && gatherForce < 0.01 && !inDemo && !inMeet) {
          const dx = p.baseX - cx; const dy = p.baseY - cy;
          const dist = Math.sqrt(dx*dx + dy*dy) + 0.001;
          if (dist < W * pf.spreadRadius * 0.95) {
            p.baseX += (dx / dist) * 0.001 * pf.speedMult * W;
            p.baseY += (dy / dist) * 0.001 * pf.speedMult * H;
          }
        } else if (gatherForce > 0) {
          p.baseX = lerp(p.baseX, cx, gatherForce);
          p.baseY = lerp(p.baseY, cy, gatherForce);
        }

        if (tp && tp.intensity > 0) {
          const tf = tp.intensity * (0.018 + smoothMeetFade * 0.012);
          p.baseX = lerp(p.baseX, tp.nx * W, tf);
          p.baseY = lerp(p.baseY, tp.ny * H, tf);
        }

        const flickerBoost = sfActive ? Math.max(0, (1 - Math.abs(sfAge - 0.35) / 0.35)) * 0.4 : 0;

        let bx = 0; let by = 0;
        if (p.burstT >= 0 && t - p.burstT < 1.0) {
          const decay = 1 - (t - p.burstT);
          bx = p.burstVx * decay * 22;
          by = p.burstVy * decay * 22;
        }

        const wobbleScale = Math.max(0.1, (1 - stage2 * 0.6) * (1 - smoothMeetFade * 0.5) * pf.wobbleAmp);
        p.x = p.baseX + Math.sin(t * p.speed * speedFinal + p.drift) * 4 * wobbleScale + bx;
        p.y = p.baseY + Math.cos(t * p.speed * speedFinal * 0.7 + p.drift * 1.3) * 3 * wobbleScale + by;

        let alpha = p.opacity * (1 + holdBoost * 0.5 + demoBoost * 0.5 + flickerBoost + smoothMeetFade * 0.55);
        if (age < 0.15)     alpha *= easeInOut(age / 0.15);
        else if (age > 0.75) alpha *= easeInOut((1 - age) / 0.25);
        alpha = Math.min(0.96, alpha) * pf.glowIntensity;

        const rScale = 1 + stage2 * 0.4 + smoothMeetFade * 0.3 + (burstActive ? Math.sin(burstAge / 1.2 * Math.PI) * 0.5 : 0);
        const glowR  = p.r * rScale * (2.5 + effectiveV * 2.0);

        const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        gg.addColorStop(0, getColor(alpha * 0.45, p.hueShift));
        gg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(p.x, p.y, glowR, 0, Math.PI*2);
        ctx.fillStyle = gg; ctx.fill();

        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * rScale, 0, Math.PI*2);
        ctx.fillStyle = getColor(alpha, p.hueShift);
        ctx.fill();
      }

      // Hold arc
      if (hold > 0.01 && !inDemo) {
        const arcR = W * 0.155;
        ctx.beginPath(); ctx.arc(cx, cy, arcR, -Math.PI/2, Math.PI*1.5);
        ctx.strokeStyle = 'rgba(168,184,160,0.10)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, arcR, -Math.PI/2, -Math.PI/2 + hold * Math.PI*2);
        ctx.strokeStyle = getColor(0.35 + stage2 * 0.45);
        ctx.lineWidth = 2 + stage2 * 1.5; ctx.lineCap = 'round'; ctx.stroke();
        const ta = -Math.PI/2 + hold * Math.PI*2;
        ctx.beginPath(); ctx.arc(cx + Math.cos(ta)*arcR, cy + Math.sin(ta)*arcR, 2.5 + stage2*1.5, 0, Math.PI*2);
        ctx.fillStyle = getColor(0.7 + stage2 * 0.3); ctx.fill();
      }

      particlesRef.current = particlesRef.current.filter(p => lifeFraction(p, t) < 1);
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [presenceStage]);

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={340}
      className="w-full max-w-sm mx-auto"
      style={{ imageRendering: 'auto', touchAction: 'none', cursor: 'pointer', userSelect: 'none' }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
    />
  );
}
