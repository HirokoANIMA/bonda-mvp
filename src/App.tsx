import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Heart, Image, User } from 'lucide-react';
import { useBondaStore } from './lib/store';
import { useI18n } from './lib/i18n';
import en from './lib/i18n/en.json';
import HomeScreen from './screens/HomeScreen';
import CareScreen from './screens/CareScreen';
import PresenceScreen from './screens/PresenceScreen';
import MemoriesScreen from './screens/MemoriesScreen';
import ProfileScreen from './screens/ProfileScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import LanguageScreen from './screens/LanguageScreen';
import LandingScreen from './screens/LandingScreen';

type Tab = 'home' | 'care' | 'presence' | 'memories' | 'profile';
type TranslationKey = keyof typeof en;

const NAV_TABS: { tab: Tab; icon: typeof Home; key: TranslationKey }[] = [
  { tab: 'home',      icon: Home,  key: 'nav.home' },
  { tab: 'care',      icon: Heart, key: 'nav.care' },
  { tab: 'memories',  icon: Image, key: 'nav.memories' },
  { tab: 'profile',   icon: User,  key: 'nav.profile' },
];

// ── Paw icon SVG ────────────────────────────────────────────────────────────
// Single paw: one central pad + four small toe beans, all soft rounded shapes.
function PawSvg({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {/* Central pad */}
      <ellipse cx="12" cy="14.5" rx="4.4" ry="3.6" fill={color} opacity="1" />
      {/* Toe beans */}
      <ellipse cx="7.2"  cy="10.2" rx="1.8" ry="2.1" fill={color} />
      <ellipse cx="10.3" cy="8.4"  rx="1.7" ry="2.0" fill={color} />
      <ellipse cx="13.7" cy="8.4"  rx="1.7" ry="2.0" fill={color} />
      <ellipse cx="16.8" cy="10.2" rx="1.8" ry="2.1" fill={color} />
    </svg>
  );
}

// ── Paw nav button with particles + glow ────────────────────────────────────
interface PawNavIconProps {
  isActive: boolean;
  label: string;
  onClick: () => void;
}

interface TapParticle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  life: number; size: number;
}

function PawNavIcon({ isActive, label, onClick }: PawNavIconProps) {
  const [particles, setParticles] = useState<TapParticle[]>([]);
  const [glowPulse, setGlowPulse] = useState(false);
  const nextId = useRef(0);
  const containerRef = useRef<HTMLButtonElement>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spawnParticles = useCallback(() => {
    const btn = containerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ox = rect.width / 2;
    const oy = rect.height / 2 - 4;
    const spawned: TapParticle[] = Array.from({ length: 10 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.4;
      return {
        id: nextId.current++,
        x: ox, y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 2 + Math.random() * 2.5,
      };
    });
    setParticles(p => [...p, ...spawned]);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = (now - start) / 700;
      if (progress >= 1) {
        setParticles(p => p.filter(pt => !spawned.find(s => s.id === pt.id)));
        return;
      }
      setParticles(p => p.map(pt => {
        const s = spawned.find(n => n.id === pt.id);
        if (!s) return pt;
        return { ...pt, x: s.x + s.vx * progress * 40, y: s.y + s.vy * progress * 40, life: 1 - progress };
      }));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const handleClick = useCallback(() => {
    spawnParticles();
    setGlowPulse(true);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setGlowPulse(false), 600);
    onClick();
  }, [onClick, spawnParticles]);

  const pawColor = isActive ? '#b8922a' : 'rgba(168,158,148,0.60)';

  return (
    <button
      ref={containerRef}
      onClick={handleClick}
      className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl relative overflow-visible"
      style={{ position: 'relative' }}
    >
      {/* Tap particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            background: isActive ? 'rgba(200,160,60,0.75)' : 'rgba(168,158,148,0.55)',
            opacity: p.life,
            transform: `scale(${0.5 + p.life * 0.5})`,
          }}
        />
      ))}

      {/* Glow pulse ring behind icon */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 36, height: 36,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -62%)',
          background: isActive
            ? 'radial-gradient(circle, rgba(200,160,60,0.28) 0%, transparent 70%)'
            : 'transparent',
          opacity: glowPulse ? 1 : isActive ? 0.7 : 0,
          transition: glowPulse ? 'opacity 0.08s ease' : 'opacity 0.6s ease',
          animation: isActive && !glowPulse ? 'pawGlow 3s ease-in-out infinite' : 'none',
        }}
      />

      {/* Icon wrapper — breathing scale when active */}
      <div
        style={{
          animation: isActive ? 'pawBreathe 3s ease-in-out infinite' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: isActive && glowPulse ? 'drop-shadow(0 0 5px rgba(200,160,60,0.7))' : 'none',
          transition: 'filter 0.3s ease',
        }}
      >
        <PawSvg size={20} color={pawColor} />
      </div>

      <span
        className="text-[10px] font-medium transition-all"
        style={{ color: isActive ? '#78694a' : 'rgba(120,113,108,0.55)' }}
      >
        {label}
      </span>
    </button>
  );
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-warm-50 transition-opacity duration-700"
      style={{ animation: 'splashFade 2s ease-in-out forwards' }}
    >
      <img
        src="/Ver16_Pitch_BONDA.png"
        alt="BONDA"
        className="h-12 w-auto object-contain"
        style={{ mixBlendMode: 'multiply', animation: 'splashRise 1.2s ease-out forwards' }}
      />
    </div>
  );
}

const LANDING_SEEN_KEY = 'bonda_landing_seen';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'home';
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace('#', '');
    if (params.get('tab') === 'memories' || hash === 'memories' || hash === 'trust-layer') return 'memories';
    return 'home';
  });
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace('#', '');
    const wantsTrust = params.get('openTrustLayer') === '1' || hash === 'trust-layer';
    if (wantsTrust) {
      const scroll = () => document.getElementById('solana-trust-layer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(scroll, 400);
      setTimeout(scroll, 1200);
    }
  }, []);
  const [landingSeen, setLandingSeen] = useState(() => localStorage.getItem(LANDING_SEEN_KEY) === '1');
  const store = useBondaStore();
  const { langChosen, chooseLang, t } = useI18n();

  const dismissLanding = useCallback(() => {
    localStorage.setItem(LANDING_SEEN_KEY, '1');
    setLandingSeen(true);
  }, []);

  const handleLoadBaobao = useCallback(() => {
    store.loadBaobaoDemo();
    localStorage.setItem(LANDING_SEEN_KEY, '1');
    setLandingSeen(true);
  }, [store]);

  const handleStartOver = useCallback(() => {
    store.startOver();
    localStorage.removeItem(LANDING_SEEN_KEY);
    setLandingSeen(false);
    setActiveTab('home');
  }, [store]);

  const handleCreateOwn = useCallback(() => {
    // Keep landing dismissed, clear profile state so onboarding shows next.
    store.startOver();
    localStorage.setItem(LANDING_SEEN_KEY, '1');
    setLandingSeen(true);
    setActiveTab('home');
  }, [store]);

  const showLanding = !landingSeen;
  const showLanguageScreen = landingSeen && !langChosen;
  const showOnboarding = landingSeen && langChosen && !store.onboardingComplete;

  return (
    <div className="min-h-screen bg-warm-300 flex items-start justify-center">
      {splash && <SplashScreen onDone={() => setSplash(false)} />}

      {/* Mobile frame */}
      <div className="w-full max-w-md min-h-screen bg-warm-50 relative flex flex-col shadow-xl">

        {showLanding ? (
          /* ── Landing / marketing ── */
          <div className="flex-1 flex flex-col">
            <LandingScreen onStart={dismissLanding} onLoadBaobao={handleLoadBaobao} />
          </div>
        ) : showLanguageScreen ? (
          /* ── Language selection — must fill full viewport height ── */
          <div className="flex-1 flex flex-col">
            <LanguageScreen onSelect={chooseLang} />
          </div>
        ) : showOnboarding ? (
          /* ── Onboarding ── */
          <div className="flex-1 overflow-y-auto">
            <OnboardingScreen
              onComplete={(petData) => {
                store.completeOnboarding({
                  name: petData.name,
                  species: petData.species,
                  breed: petData.breed,
                  photoUrl: petData.photoUrl,
                  age: petData.age,
                  description: petData.description,
                });
              }}
            />
          </div>
        ) : (
          <>
            {/* ── Main app ── */}
            <div className="flex-1 overflow-y-auto pb-20">
              {activeTab === 'home'      && <HomeScreen store={store} onOpenTrustLayer={() => setActiveTab('memories')} onViewBaobaoDemo={() => { store.loadBaobaoDemo(); setActiveTab('home'); }} />}
              {activeTab === 'care'      && <CareScreen store={store} />}
              {activeTab === 'presence'  && <PresenceScreen store={store} onOpenTrustLayer={() => setActiveTab('memories')} />}
              {activeTab === 'memories'  && <MemoriesScreen store={store} />}
              {activeTab === 'profile'   && <ProfileScreen store={store} onOpenTrustLayer={() => setActiveTab('memories')} onStartOver={handleStartOver} onCreateOwn={handleCreateOwn} onReloadDemo={() => { store.loadBaobaoDemo(); setActiveTab('home'); }} />}
            </div>

            {/* ── Bottom Navigation ── */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-warm-100/95 backdrop-blur-xl border-t border-warm-400 z-40">
              <div className="flex items-center justify-around px-2 py-2 pb-safe">
                {/* Home */}
                {(['home', 'care'] as const).map(tab => {
                  const { icon: Icon, key } = NAV_TABS.find(n => n.tab === tab)!;
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all ${
                        isActive ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      <div className={`relative transition-all ${isActive ? 'scale-110' : ''}`}>
                        <Icon
                          size={20}
                          className={isActive ? 'fill-stone-800 stroke-stone-800' : ''}
                          strokeWidth={isActive ? 2 : 1.5}
                        />
                        {tab === 'home' && store.todayLove > 0 && !isActive && (
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-sage-400 rounded-full" />
                        )}
                      </div>
                      <span className={`text-[10px] font-medium transition-all ${isActive ? 'text-stone-800' : 'text-stone-400'}`}>
                        {t(key)}
                      </span>
                    </button>
                  );
                })}

                {/* Presence — custom paw icon */}
                <PawNavIcon
                  isActive={activeTab === 'presence'}
                  label={t('nav.presence')}
                  onClick={() => setActiveTab('presence')}
                />

                {/* Memories + Profile */}
                {(['memories', 'profile'] as const).map(tab => {
                  const { icon: Icon, key } = NAV_TABS.find(n => n.tab === tab)!;
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all ${
                        isActive ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      <div className={`relative transition-all ${isActive ? 'scale-110' : ''}`}>
                        <Icon
                          size={20}
                          className={isActive ? 'fill-stone-800 stroke-stone-800' : ''}
                          strokeWidth={isActive ? 2 : 1.5}
                        />
                      </div>
                      <span className={`text-[10px] font-medium transition-all ${isActive ? 'text-stone-800' : 'text-stone-400'}`}>
                        {t(key)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
