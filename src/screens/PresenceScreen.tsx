import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Heart, Zap, Star, Wifi, Phone, Glasses, Box, Users } from 'lucide-react';
import PresenceField from '../components/PresenceField';
import type { TouchPoint } from '../components/PresenceField';
import BondaCoin from '../components/BondaCoin';
import PresenceMetrics from '../components/PresenceMetrics';
import TrustEntry from '../components/TrustEntry';
import type { useBondaStore } from '../lib/store';
import { useI18n } from '../lib/i18n';
import { derivePresenceProfile } from '../lib/presenceProfile';

type Store = ReturnType<typeof useBondaStore>;
interface Props { store: Store; onOpenTrustLayer?: () => void; }

const UNLOCK_THRESHOLDS = [50, 150, 300, 500] as const;
const BASE_OPACITIES    = [0.60, 0.40, 0.30, 0.20] as const;
const DEMO_HOLD_MS      = 4000; // how long demo stays visible
const DEMO_FADE_OUT_MS  = 900;  // how long it fades back

interface MeetingMethod {
  labelKey: string;
  subKey: string;
  icon: typeof Phone;
  threshold: number;
  baseOpacity: number;
  baseBlur: number;
}

const METHODS: MeetingMethod[] = [
  { labelKey: 'presence.meet.phone.label',  subKey: 'presence.meet.phone.sub',  icon: Phone,   threshold: UNLOCK_THRESHOLDS[0], baseOpacity: BASE_OPACITIES[0], baseBlur: 0   },
  { labelKey: 'presence.meet.ar.label',     subKey: 'presence.meet.ar.sub',     icon: Glasses, threshold: UNLOCK_THRESHOLDS[1], baseOpacity: BASE_OPACITIES[1], baseBlur: 0.8 },
  { labelKey: 'presence.meet.vr.label',     subKey: 'presence.meet.vr.sub',     icon: Box,     threshold: UNLOCK_THRESHOLDS[2], baseOpacity: BASE_OPACITIES[2], baseBlur: 1.6 },
  { labelKey: 'presence.meet.person.label', subKey: 'presence.meet.person.sub', icon: Users,   threshold: UNLOCK_THRESHOLDS[3], baseOpacity: BASE_OPACITIES[3], baseBlur: 2.4 },
];

const LOCKED_KEYS = [
  'presence.meet.locked.0',
  'presence.meet.locked.1',
  'presence.meet.locked.2',
  'presence.meet.locked.3',
] as const;

// ── Tap-burst particles ────────────────────────────────────────────────────

interface BurstParticle {
  id: number; x: number; y: number;
  vx: number; vy: number; life: number; size: number;
}

function useParticleBurst() {
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const nextId = useRef(0);
  const burst = useCallback((x: number, y: number) => {
    const spawned: BurstParticle[] = Array.from({ length: 14 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.0;
      return { id: nextId.current++, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, size: 2 + Math.random() * 3.5 };
    });
    setParticles(p => [...p, ...spawned]);
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 850;
      if (t >= 1) { setParticles(p => p.filter(x => !spawned.find(s => s.id === x.id))); return; }
      setParticles(p => p.map(pt => {
        const s = spawned.find(n => n.id === pt.id);
        if (!s) return pt;
        return { ...pt, x: s.x + s.vx * t * 55, y: s.y + s.vy * t * 55, life: 1 - t };
      }));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);
  return { particles, burst };
}

// ── Meeting card ───────────────────────────────────────────────────────────

// ── Online meet interaction panel ──────────────────────────────────────────

interface OnlineMeetProps {
  visible: boolean; // controlled by demoFade > 0.5
  onTouchChange: (tp: TouchPoint | null) => void;
  onSpeak: () => void;
}

function OnlineMeetExpanded({ visible, onTouchChange, onSpeak }: OnlineMeetProps) {
  const { t } = useI18n();
  const [touchHeld, setTouchHeld] = useState(false);
  const [speakActive, setSpeakActive] = useState(false);
  const touchIntensityRef = useRef(0);
  const touchRafRef = useRef<number>(0);
  const touchBtnRef = useRef<HTMLButtonElement>(null);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ramp intensity up while held, then decay
  const beginTouch = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setTouchHeld(true);
    const btn = touchBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const nx = 0.5; // always canvas center-ish; touch point is the particle field center
    const ny = 0.5;
    cancelAnimationFrame(touchRafRef.current);
    const start = performance.now();
    const ramp = (now: number) => {
      const age = (now - start) / 1200;
      touchIntensityRef.current = Math.min(1, age);
      onTouchChange({ nx, ny, intensity: touchIntensityRef.current });
      if (touchIntensityRef.current < 1) touchRafRef.current = requestAnimationFrame(ramp);
    };
    touchRafRef.current = requestAnimationFrame(ramp);
    // suppress unused rect warning
    void rect;
  }, [onTouchChange]);

  const endTouch = useCallback(() => {
    setTouchHeld(false);
    cancelAnimationFrame(touchRafRef.current);
    // Decay intensity to 0
    const decayFrom = touchIntensityRef.current;
    const decayStart = performance.now();
    const decay = (now: number) => {
      const t = Math.min(1, (now - decayStart) / 500);
      const val = decayFrom * (1 - t * t);
      touchIntensityRef.current = val;
      onTouchChange(val > 0.01 ? { nx: 0.5, ny: 0.5, intensity: val } : null);
      if (val > 0.01) touchRafRef.current = requestAnimationFrame(decay);
      else onTouchChange(null);
    };
    touchRafRef.current = requestAnimationFrame(decay);
  }, [onTouchChange]);

  const handleSpeak = useCallback(() => {
    setSpeakActive(true);
    onSpeak();
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => setSpeakActive(false), 1800);
  }, [onSpeak]);

  return (
    <div
      style={{
        maxHeight: visible ? '120px' : '0px',
        opacity: visible ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 700ms cubic-bezier(0.4,0,0.2,1), opacity 500ms ease',
      }}
    >
      {/* Inner separator */}
      <div className="mx-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,184,160,0.22), transparent)' }} />

      <div className="flex gap-3 px-5 py-4">
        {/* Touch button */}
        <button
          ref={touchBtnRef}
          onMouseDown={beginTouch}
          onMouseUp={endTouch}
          onMouseLeave={endTouch}
          onTouchStart={beginTouch}
          onTouchEnd={endTouch}
          onTouchCancel={endTouch}
          className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all duration-300 select-none"
          style={{
            background: touchHeld
              ? 'linear-gradient(135deg, rgba(253,230,138,0.18) 0%, rgba(168,184,160,0.10) 100%)'
              : 'rgba(168,184,160,0.06)',
            border: `1px solid rgba(168,184,160,${touchHeld ? 0.32 : 0.14})`,
            boxShadow: touchHeld ? '0 4px 20px rgba(253,230,138,0.18)' : 'none',
            transform: touchHeld ? 'scale(0.97)' : 'scale(1)',
          }}
        >
          {/* Hand icon — SVG to avoid game-feel of lucide */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            style={{ opacity: touchHeld ? 0.9 : 0.5, transition: 'opacity 300ms ease' }}>
            <path d="M18 11V8.5a1.5 1.5 0 0 0-3 0V11M15 9.5V7a1.5 1.5 0 0 0-3 0v4M12 8V5.5a1.5 1.5 0 0 0-3 0V12l-2-2a1.5 1.5 0 0 0-2 2.2l3 4.3A6 6 0 0 0 14 20h1a5 5 0 0 0 5-5v-4a1.5 1.5 0 0 0-3 0"
              stroke={touchHeld ? 'rgba(160,130,60,0.8)' : 'rgba(90,102,84,0.7)'}
              strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-center">
            <p className="text-[11px] font-medium leading-tight"
              style={{ color: touchHeld ? '#6b5a2a' : 'rgba(68,64,60,0.65)' }}>
              {t('presence.meet.touch.label')}
            </p>
            <p className="text-[9px] font-light leading-tight mt-0.5"
              style={{ color: 'rgba(120,113,108,0.50)' }}>
              {t('presence.meet.touch.sub')}
            </p>
          </div>
        </button>

        {/* Speak button */}
        <button
          onClick={handleSpeak}
          className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all duration-300 select-none"
          style={{
            background: speakActive
              ? 'linear-gradient(135deg, rgba(168,184,160,0.14) 0%, rgba(168,184,160,0.07) 100%)'
              : 'rgba(168,184,160,0.06)',
            border: `1px solid rgba(168,184,160,${speakActive ? 0.28 : 0.14})`,
            boxShadow: speakActive ? '0 4px 18px rgba(168,184,160,0.18)' : 'none',
            transform: speakActive ? 'scale(0.97)' : 'scale(1)',
          }}
        >
          {/* Sound-wave icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            style={{ opacity: speakActive ? 0.9 : 0.5, transition: 'opacity 300ms ease' }}>
            <path d="M12 5v14M8 8v8M16 8v8M4 10v4M20 10v4"
              stroke={speakActive ? 'rgba(80,100,75,0.8)' : 'rgba(90,102,84,0.7)'}
              strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div className="text-center">
            <p className="text-[11px] font-medium leading-tight"
              style={{ color: speakActive ? '#3c5038' : 'rgba(68,64,60,0.65)' }}>
              {t('presence.meet.speak.label')}
            </p>
            <p className="text-[9px] font-light leading-tight mt-0.5"
              style={{ color: 'rgba(120,113,108,0.50)' }}>
              {t('presence.meet.speak.sub')}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

interface CardProps {
  method: MeetingMethod;
  loveScore: number;
  index: number;
  demoFade: number;   // 0–1, 1 = fully demo-revealed
  justActivated: boolean;
  onTouchChange?: (tp: TouchPoint | null) => void;
  onSpeak?: () => void;
  onMeetOnline?: () => void;
}

function MeetingCard({ method, loveScore, index, demoFade, justActivated, onTouchChange, onSpeak, onMeetOnline }: CardProps) {
  const { t } = useI18n();
  const { particles, burst } = useParticleBurst();
  const [glowing, setGlowing] = useState(false);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgIdx = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const progress = Math.min(1, loveScore / method.threshold);
  const isNative = loveScore >= method.threshold;

  // Interpolate locked→revealed using demoFade
  const baseOpacity = isNative ? 1 : method.baseOpacity + (1 - method.baseOpacity) * progress;
  const effectiveOpacity = baseOpacity + (1 - baseOpacity) * demoFade;
  const effectiveBlur = isNative ? 0 : method.baseBlur * (1 - progress) * (1 - demoFade);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) burst(e.clientX - rect.left, e.clientY - rect.top);
    setGlowing(true);
    setTimeout(() => setGlowing(false), 600);

    // Phone card when revealed: trigger meet-online sequence
    if (index === 0 && (isNative || demoFade > 0.5) && onMeetOnline) {
      onMeetOnline();
      return;
    }

    if (isNative || demoFade > 0.5) return;
    const key = LOCKED_KEYS[msgIdx.current % LOCKED_KEYS.length];
    msgIdx.current++;
    setFlashMsg(t(key));
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setFlashMsg(null), 1800);
  };

  const Icon = method.icon;
  const revealed = isNative || demoFade > 0;

  return (
    <div
      ref={cardRef}
      onClick={handleTap}
      className={justActivated && !isNative ? 'animate-card-in' : ''}
      style={{
        opacity: effectiveOpacity,
        filter: effectiveBlur > 0 ? `blur(${effectiveBlur}px)` : undefined,
        transition: justActivated ? 'none' : 'opacity 0.9s ease, filter 0.9s ease',
        cursor: (isNative || demoFade > 0.5) ? 'default' : 'pointer',
        animationDelay: justActivated ? `${index * 60}ms` : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Tap burst particles */}
      {particles.map(p => (
        <div key={p.id} className="absolute pointer-events-none rounded-full"
          style={{ left: p.x - p.size / 2, top: p.y - p.size / 2, width: p.size, height: p.size,
            background: 'rgba(168,184,160,0.75)', opacity: p.life, transform: `scale(${p.life})` }}
        />
      ))}

      {/* Tap glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(168,184,160,0.40) 0%, transparent 70%)',
          opacity: glowing ? 1 : 0, transition: 'opacity 0.12s ease' }}
      />

      {/* Demo glow overlay */}
      {demoFade > 0 && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 40% 50%, rgba(253,230,138,0.18) 0%, rgba(168,184,160,0.10) 55%, transparent 80%)',
            opacity: demoFade }}
        />
      )}

      {/* Progress glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(168,184,160,0.18) 0%, transparent 60%)',
          opacity: progress }}
      />

      <div className="flex items-center gap-4 px-5 py-4">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500"
          style={{
            background: revealed ? `rgba(168,184,160,${0.14 + demoFade * 0.12})` : `rgba(168,184,160,${0.06 + progress * 0.08})`,
            boxShadow: (glowing || demoFade > 0.4) ? `0 0 ${14 + demoFade * 12}px rgba(168,184,160,${0.30 + demoFade * 0.25})` : 'none',
          }}
        >
          <Icon size={16}
            style={{ color: revealed ? '#5a6654' : `rgba(90,102,84,${0.45 + progress * 0.55})` }}
            strokeWidth={1.5}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium leading-snug"
            style={{ color: revealed ? '#3c3836' : `rgba(60,56,54,${0.55 + progress * 0.45})` }}
          >
            {t(method.labelKey)}
          </p>
          <p className="text-[11px] font-light leading-relaxed mt-0.5"
            style={{ color: revealed ? 'rgba(120,113,108,0.85)' : `rgba(120,113,108,${0.45 + progress * 0.40})` }}
          >
            {t(method.subKey)}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-10 flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="h-px rounded-full w-full"
            style={{ background: `linear-gradient(90deg, transparent, rgba(168,184,160,${0.18 + progress * 0.45 + demoFade * 0.25}))` }}
          />
          <div className="h-px rounded-full transition-all duration-700"
            style={{ width: `${revealed ? 100 : progress * 100}%`, background: `rgba(168,184,160,${0.5 + demoFade * 0.3})` }}
          />
        </div>
      </div>

      {/* Locked tap flash */}
      {flashMsg && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fadeIn">
          <p className="text-[12px] font-light text-stone-500 tracking-wide"
            style={{ textShadow: '0 0 14px rgba(255,255,255,0.95)' }}>
            {flashMsg}
          </p>
        </div>
      )}

      {/* Online meet interactions — only on first card */}
      {index === 0 && onTouchChange && onSpeak && (
        <OnlineMeetExpanded
          visible={demoFade > 0.5}
          onTouchChange={onTouchChange}
          onSpeak={onSpeak}
        />
      )}

      {/* Row divider */}
      {index < METHODS.length - 1 && (
        <div className="mx-5 h-px"
          style={{ background: `linear-gradient(90deg, transparent, rgba(168,184,160,${0.10 + progress * 0.08 + demoFade * 0.12}), transparent)` }}
        />
      )}
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function PresenceScreen({ store, onOpenTrustLayer }: Props) {
  const { t } = useI18n();
  const { pet, logs, presenceStage, afterMemories } = store;

  const profile = useMemo(() => derivePresenceProfile(
    pet.name,
    pet.species,
    pet.love_score,
    logs,
    afterMemories,
    !!pet.photo_url,
  ), [pet.name, pet.species, pet.love_score, logs, afterMemories, pet.photo_url]);

  // Hold progress: 0 = idle, >0 = pressing, driven up by PresenceField
  const [holdProgress, setHoldProgress] = useState(0);

  // Online interaction state
  const [touchPoint, setTouchPoint] = useState<TouchPoint | null>(null);
  const [speakFlickerAt, setSpeakFlickerAt] = useState(0);

  const handleSpeak = useCallback(() => {
    setSpeakFlickerAt(Date.now());
  }, []);

  // Demo state
  const [demoMode, setDemoMode] = useState(false);
  const [demoFade, setDemoFade] = useState(0);       // 0→1 fade-in, 1→0 fade-out
  const [justActivated, setJustActivated] = useState(false);
  const demoFadeRaf = useRef<number>(0);
  const demoHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Meet-online state: 0=idle, 1=gathering (particles), 2=breathing (photo), 3=message
  const [meetOnlineStage, setMeetOnlineStage] = useState<0 | 1 | 2 | 3>(0);
  const [meetOnlineActive, setMeetOnlineActive] = useState(false);
  const [meetResponseMsg, setMeetResponseMsg] = useState('');
  const [meetMsgVisible, setMeetMsgVisible] = useState(false);
  const meetTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Pick a response message deterministically per session
  const responseKeyRef = useRef(Math.floor(Math.random() * 3));

  const activateMeetOnline = useCallback(() => {
    // Clear any running meet timers
    meetTimersRef.current.forEach(clearTimeout);
    meetTimersRef.current = [];

    setMeetOnlineStage(1);
    setMeetOnlineActive(true);
    setMeetMsgVisible(false);

    // Stage 2: photo breathes after 1.4s
    meetTimersRef.current.push(setTimeout(() => setMeetOnlineStage(2), 1400));

    // Stage 3: message appears after 3.2s
    meetTimersRef.current.push(setTimeout(() => {
      setMeetOnlineStage(3);
      setMeetMsgVisible(true);
    }, 3200));

    // Wind down after 7s
    meetTimersRef.current.push(setTimeout(() => {
      setMeetMsgVisible(false);
      meetTimersRef.current.push(setTimeout(() => {
        setMeetOnlineActive(false);
        setMeetOnlineStage(0);
      }, 1200));
    }, 7000));
  }, []);

  // Hint text: 'idle' | 'holding' | 'active'
  const hintState = demoMode ? 'active' : holdProgress > 0.01 ? 'holding' : 'idle';

  const activateDemo = useCallback(() => {
    if (demoMode) return;
    setDemoMode(true);
    setJustActivated(true);
    setTimeout(() => setJustActivated(false), 1200);

    // Fade in
    cancelAnimationFrame(demoFadeRaf.current);
    const fadeInStart = performance.now();
    const fadeIn = (now: number) => {
      const f = Math.min(1, (now - fadeInStart) / 500);
      setDemoFade(f);
      if (f < 1) demoFadeRaf.current = requestAnimationFrame(fadeIn);
    };
    demoFadeRaf.current = requestAnimationFrame(fadeIn);

    // Hold then fade out
    if (demoHoldTimer.current) clearTimeout(demoHoldTimer.current);
    demoHoldTimer.current = setTimeout(() => {
      cancelAnimationFrame(demoFadeRaf.current);
      const fadeOutStart = performance.now();
      const fadeOut = (now: number) => {
        const f = Math.max(0, 1 - (now - fadeOutStart) / DEMO_FADE_OUT_MS);
        setDemoFade(f);
        if (f > 0) {
          demoFadeRaf.current = requestAnimationFrame(fadeOut);
        } else {
          setDemoMode(false);
          setDemoFade(0);
        }
      };
      demoFadeRaf.current = requestAnimationFrame(fadeOut);
    }, DEMO_HOLD_MS);
  }, [demoMode]);

  // Set response message on mount (stable for this session)
  useEffect(() => {
    setMeetResponseMsg(t(`presence.meet.response.${responseKeyRef.current}` as Parameters<typeof t>[0]));
  }, [t]);

  // Cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(demoFadeRaf.current);
    if (demoHoldTimer.current) clearTimeout(demoHoldTimer.current);
    meetTimersRef.current.forEach(clearTimeout);
  }, []);

  const stageText = {
    care:         { headline: t('presence.headline.care'),         body: t('presence.body.care'),         whisper: t('presence.whisper.care') },
    relationship: { headline: t('presence.headline.relationship'), body: t('presence.body.relationship'), whisper: t('presence.whisper.relationship') },
    presence:     { headline: t('presence.headline.presence'),     body: t('presence.body.presence'),     whisper: t('presence.whisper.presence') },
  } as const;
  const text = stageText[presenceStage];

  const weeklyLove = logs
    .filter(l => Date.now() - new Date(l.created_at).getTime() < 7 * 24 * 60 * 60 * 1000)
    .reduce((s, l) => s + l.love_value, 0);

  const topAction = Object.entries(
    logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.action_type] = (acc[l.action_type] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  // Hold progress: 0–0.25 stage1, 0.25–1 stage2
  const stage2 = Math.max(0, Math.min(1, (holdProgress - 0.25) / 0.75));

  // Connection energy drives visual linkage: hold, demo, or meet all contribute
  const meetEnergy = meetOnlineActive ? (meetOnlineStage >= 2 ? 1 : 0.6) : 0;
  const connectionEnergy = Math.max(demoFade, stage2 * 0.7 + (holdProgress > 0.01 ? 0.2 : 0), meetEnergy);

  return (
    <div className="flex flex-col min-h-full bg-warm-50">

      {/* Header */}
      <div className="px-6 pt-14 pb-2">
        <p className="text-[10px] text-stone-300 uppercase tracking-[0.2em] font-medium mb-1">{t('presence.badge')}</p>
        <h1 className="text-2xl font-bold text-stone-800 leading-snug">{text.headline}</h1>
      </div>

      {/* Presence field */}
      <div className="relative px-2 py-2">
        <PresenceField
          loveScore={pet.love_score}
          presenceStage={presenceStage}
          profile={profile}
          holdProgress={holdProgress}
          demoMode={demoMode}
          onDemoActivate={activateDemo}
          onHoldChange={setHoldProgress}
          touchPoint={touchPoint}
          speakFlickerAt={speakFlickerAt}
          petPhotoUrl={pet.photo_url ?? undefined}
          meetOnlineActive={meetOnlineActive}
        />

        {/* Hint text layer — overlaid on canvas */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none w-full flex justify-center">
          {/* Idle */}
          <p className="text-[11px] font-light tracking-[0.22em] uppercase text-center transition-all duration-300 absolute"
            style={{
              color: 'rgba(120,113,108,0.5)',
              opacity: hintState === 'idle' ? 1 : 0,
              transform: hintState === 'idle' ? 'translateY(0)' : 'translateY(4px)',
            }}
          >
            {t('presence.connect.idle')}
          </p>

          {/* Holding — "Connection forming" */}
          <p className="text-[11px] font-light tracking-[0.18em] text-center transition-all duration-200 absolute"
            style={{
              color: `rgba(90,102,84,${0.6 + stage2 * 0.4})`,
              opacity: hintState === 'holding' ? 1 : 0,
              transform: hintState === 'holding' ? 'translateY(0)' : 'translateY(4px)',
              textShadow: stage2 > 0.3 ? `0 0 14px rgba(253,230,138,${stage2 * 0.55})` : 'none',
              letterSpacing: '0.04em',
            }}
          >
            {t('presence.connect.forming')}
          </p>

          {/* Active — "Presence is responding" */}
          <p className="text-[11px] font-light tracking-[0.18em] text-center transition-all duration-400 absolute"
            style={{
              color: `rgba(90,102,84,${0.55 + demoFade * 0.35})`,
              opacity: hintState === 'active' ? demoFade * 0.9 : 0,
              transform: hintState === 'active' ? 'translateY(0)' : 'translateY(-4px)',
              textShadow: demoFade > 0.5 ? `0 0 16px rgba(253,230,138,0.45)` : 'none',
              letterSpacing: '0.04em',
            }}
          >
            {t('presence.connect.responding')}
          </p>
        </div>

        {/* Meet-online response message — fades in at stage 3, no chat UI */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            opacity: meetMsgVisible ? 1 : 0,
            transform: meetMsgVisible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 1.4s ease, transform 1.4s ease',
          }}
        >
          <p
            className="text-[14px] font-light text-center whitespace-nowrap"
            style={{
              color: 'rgba(80,70,55,0.75)',
              letterSpacing: '0.03em',
              textShadow: '0 0 20px rgba(253,230,138,0.55), 0 0 40px rgba(255,253,247,0.9)',
            }}
          >
            {meetResponseMsg}
          </p>
        </div>
      </div>

      {/* ── Visual bridge: glow flows downward from canvas into meeting section ── */}
      <div className="relative -mt-2 mb-0 pointer-events-none" style={{ height: 40 }}>
        {/* Vertical flow channel */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 0,
            width: 1,
            height: '100%',
            background: `linear-gradient(180deg, rgba(168,184,160,${connectionEnergy * 0.5}) 0%, rgba(253,230,138,${connectionEnergy * 0.35}) 50%, rgba(168,184,160,${connectionEnergy * 0.15}) 100%)`,
            transition: 'opacity 0.5s ease',
            opacity: connectionEnergy > 0.02 ? 1 : 0,
          }}
        />
        {/* Traveling dot — animates down the channel during hold/demo */}
        {connectionEnergy > 0.08 && (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: 4,
              height: 4,
              background: `rgba(253,230,138,${connectionEnergy * 0.9})`,
              boxShadow: `0 0 6px rgba(253,230,138,${connectionEnergy * 0.7})`,
              animation: 'flowDown 1.2s ease-in infinite',
              opacity: connectionEnergy,
            }}
          />
        )}
      </div>

      {/* Meeting methods — directly below presence field */}
      <div className="mx-5 mb-5">
        {/* Section label — brightens with connection energy */}
        <p
          className="text-[10px] uppercase tracking-[0.2em] font-medium mb-3 px-1 transition-all duration-500"
          style={{
            color: connectionEnergy > 0.05
              ? `rgba(90,102,84,${0.45 + connectionEnergy * 0.45})`
              : 'rgba(168,180,160,0.55)',
          }}
        >
          {t('presence.meet.heading')}
        </p>

        {/* Outer container — glows when connection energy is present */}
        <div
          className={justActivated ? 'animate-presence-burst' : ''}
          style={{
            borderRadius: '1rem',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(250,248,245,0.65) 0%, rgba(244,242,238,0.45) 100%)',
            border: `1px solid rgba(168,184,160,${0.16 + connectionEnergy * 0.22})`,
            boxShadow: connectionEnergy > 0.05
              ? `0 0 ${connectionEnergy * 40}px rgba(253,230,138,${connectionEnergy * 0.13}), 0 0 ${connectionEnergy * 18}px rgba(168,184,160,${connectionEnergy * 0.16}), inset 0 1px 0 rgba(253,230,138,${connectionEnergy * 0.18})`
              : 'none',
            transition: 'box-shadow 0.6s ease, border-color 0.6s ease',
          }}
        >
          {/* Top-edge glow — the "arrival" of energy flowing down from canvas */}
          <div
            className="pointer-events-none"
            style={{
              height: 24,
              background: `linear-gradient(180deg, rgba(253,230,138,${connectionEnergy * 0.14}) 0%, transparent 100%)`,
              opacity: connectionEnergy > 0.05 ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}
          />

          {METHODS.map((method, i) => (
            <MeetingCard
              key={method.labelKey}
              method={method}
              loveScore={pet.love_score}
              index={i}
              demoFade={demoFade}
              justActivated={justActivated}
              onTouchChange={i === 0 ? setTouchPoint : undefined}
              onSpeak={i === 0 ? handleSpeak : undefined}
              onMeetOnline={i === 0 ? activateMeetOnline : undefined}
            />
          ))}
        </div>
      </div>

      {/* Soft divider */}
      <div className="mx-6 mb-6 h-px bg-gradient-to-r from-transparent via-warm-400 to-transparent" />

      {/* Narrative body */}
      <div className="px-7 pb-4">
        <p className="text-stone-500 text-[15px] leading-[1.75] font-light text-center">
          {text.body}
        </p>
      </div>

      {/* Stats */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCell icon={<Heart size={13} className="text-rose-300 fill-rose-200" />} value={pet.love_score.toLocaleString()} label={t('presence.stat.love')} />
          <StatCell icon={<Zap size={13} className="text-amber-400" />} value={`+${weeklyLove}`} label={t('presence.stat.week')} />
          <StatCell icon={<Star size={13} className="text-sage-400" />} value={logs.length.toString()} label={t('presence.stat.moments')} />
        </div>
      </div>

      {/* Presence metrics — generated from relationship signals */}
      <PresenceMetrics petName={pet.name} />

      {/* BONDA Coin */}
      <BondaCoin store={store} />

      {/* Most given care */}
      {topAction && (
        <div className="mx-5 mb-5 rounded-2xl bg-warm-200 border border-warm-400 px-4 py-3.5">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium mb-2">{t('presence.mostGiven')}</p>
          <p className="text-sm text-stone-600 font-light leading-relaxed">
            {t('presence.mostGiven.sentence', {
              action: topAction[0],
              name: pet.name,
              count: String(topAction[1]),
            })}
          </p>
        </div>
      )}

      {onOpenTrustLayer && (
        <TrustEntry label="Generated from relationship memories" onOpen={onOpenTrustLayer} />
      )}

      {/* Device row */}
      <div className="mx-5 mb-10 flex items-center gap-3 rounded-2xl bg-warm-200 border border-warm-400 px-4 py-3">
        <div className="w-7 h-7 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
          <Wifi size={13} className="text-sage-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-stone-600">{t('presence.collar.title')}</p>
          <p className="text-[10px] text-stone-400 font-light">{t('presence.collar.body')}</p>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse flex-shrink-0" />
      </div>

    </div>
  );
}

function StatCell({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-warm-200 rounded-2xl border border-warm-400 px-3 py-3.5 flex flex-col items-center gap-1.5">
      {icon}
      <p className="text-lg font-bold text-stone-800 leading-none">{value}</p>
      <p className="text-[9px] text-stone-400 uppercase tracking-widest font-medium">{label}</p>
    </div>
  );
}
