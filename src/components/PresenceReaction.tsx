import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n';

interface Props {
  petName: string;
  petPhotoUrl?: string;
  body: string;
  onDone: () => void;
}

interface Particle {
  id: number;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  hue: number;
}

// Deterministic response pools, no-fail fallback to English messages
const RESPONSES_EN = ['I remember.', "I'm here."];
const RESPONSES_JA = ['受け取ったよ', '覚えてる'];

export default function PresenceReaction({ petName, petPhotoUrl, body, onDone }: Props) {
  const { lang } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [message] = useState(() => {
    const pool = lang === 'ja' ? RESPONSES_JA : RESPONSES_EN;
    return pool[Math.floor(Math.random() * pool.length)];
  });

  // Trigger stages
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 280);  // particle density grows
    const t2 = setTimeout(() => setStage(2), 1800); // photo emerges
    const t3 = setTimeout(() => setStage(3), 3200); // message appears
    const t4 = setTimeout(() => onDone(), 6400);
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [onDone]);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: Particle[] = Array.from({ length: 110 }, (_, i) => ({
      id: i,
      angle: Math.random() * Math.PI * 2,
      radius: 40 + Math.random() * 140,
      speed: 0.3 + Math.random() * 0.8,
      size: 0.6 + Math.random() * 2.2,
      hue: Math.random(),
    }));

    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / 1000;
      const r = canvas.getBoundingClientRect();
      const cx = r.width / 2;
      const cy = r.height / 2;
      ctx.clearRect(0, 0, r.width, r.height);

      const growth = Math.min(1, elapsed / 2.8);

      // Central glow density
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160 + growth * 40);
      glow.addColorStop(0, `rgba(253,230,138,${0.12 + growth * 0.26})`);
      glow.addColorStop(0.4, `rgba(200,170,90,${0.06 + growth * 0.14})`);
      glow.addColorStop(1, 'rgba(168,184,160,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, r.width, r.height);

      for (const p of particles) {
        // Pull particles toward center as stage grows
        const pull = 0.94 - growth * 0.12;
        p.radius *= pull;
        if (p.radius < 14) p.radius = 40 + Math.random() * 120;
        p.angle += p.speed * 0.012 * (1 + growth * 0.6);

        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius;

        // Color shifts from sage → warm amber as bond deepens
        const shift = growth;
        const rCh = Math.floor(168 + shift * 65);
        const gCh = Math.floor(184 + shift * -14);
        const bCh = Math.floor(160 + shift * -30);
        const alpha = 0.35 + growth * 0.45 - (p.radius / 240);

        ctx.beginPath();
        ctx.arc(x, y, p.size * (0.8 + growth * 0.8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rCh},${gCh},${bCh},${Math.max(0.08, alpha)})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(250,244,230,0.98) 0%, rgba(244,238,220,0.99) 70%)',
        animation: 'fadeIn 0.6s ease',
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Photo emergence */}
      {petPhotoUrl && (
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            width: 180,
            height: 180,
            opacity: stage >= 2 ? (stage === 3 ? 0.70 : 0.55) : 0,
            filter: `blur(${stage >= 3 ? 6 : 14}px)`,
            transform: `scale(${stage >= 2 ? 1 : 0.9})`,
            transition: 'opacity 1.6s ease, filter 1.6s ease, transform 1.6s ease',
            boxShadow: '0 0 80px rgba(253,230,138,0.35)',
          }}
        >
          <img src={petPhotoUrl} alt={petName} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Soft received indicator */}
      <div
        className="absolute pointer-events-none"
        style={{
          opacity: stage === 0 ? 1 : 0,
          transition: 'opacity 0.9s ease',
          color: 'rgba(120,100,60,0.55)',
          fontSize: 11,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          top: '38%',
        }}
      >
        {lang === 'ja' ? 'きおくが届いています' : 'memory arriving'}
      </div>

      {/* Response message */}
      <div
        className="absolute"
        style={{
          bottom: '28%',
          opacity: stage >= 3 ? 1 : 0,
          transform: stage >= 3 ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 1.2s ease, transform 1.2s ease',
          textShadow: '0 0 24px rgba(253,230,138,0.6), 0 0 40px rgba(255,250,235,0.9)',
        }}
      >
        <p
          className="text-[22px] font-light text-center"
          style={{ color: 'rgba(70,55,30,0.85)', letterSpacing: '0.04em' }}
        >
          {message}
        </p>
      </div>

      {/* Subtle echo of what they wrote */}
      <div
        className="absolute px-8 text-center"
        style={{
          bottom: '18%',
          opacity: stage >= 3 ? 0.55 : 0,
          transition: 'opacity 1.4s ease',
          maxWidth: 340,
        }}
      >
        <p
          className="text-[11px] font-light leading-relaxed"
          style={{ color: 'rgba(120,100,70,0.70)', letterSpacing: '0.02em' }}
        >
          {body.length > 72 ? body.slice(0, 72) + '…' : body}
        </p>
      </div>
    </div>
  );
}
