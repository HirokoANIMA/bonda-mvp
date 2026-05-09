import { useEffect, useState } from 'react';
import type { CareLog } from '../lib/types';
import { ACTION_CONFIGS } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  log: CareLog;
  petName: string;
  onDismiss: () => void;
  onScoreCommit: () => void;
}

type Phase = 'hidden' | 'pause' | 'glow' | 'message' | 'score' | 'fading';

export default function LoveFeedback({ log, petName, onDismiss, onScoreCommit }: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('hidden');
  const config = ACTION_CONFIGS.find(c => c.type === log.action_type);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('pause'), 60);
    const t2 = setTimeout(() => setPhase('glow'), 500);
    const t3 = setTimeout(() => setPhase('message'), 1400);
    const t4 = setTimeout(() => { setPhase('score'); onScoreCommit(); }, 2800);
    const t5 = setTimeout(() => setPhase('fading'), 4600);
    const t6 = setTimeout(() => onDismiss(), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); };
  }, []);

  const isVisible = phase !== 'hidden' && phase !== 'fading';
  const isActive = phase === 'glow' || phase === 'message' || phase === 'score';

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center transition-all duration-700 ${
        isActive ? 'bg-stone-900/50' : 'bg-stone-900/0'
      }`}
      style={{ backdropFilter: isVisible ? 'blur(4px)' : 'none' }}
    >
      {/* Sage ambient glow — outermost ring, barely visible */}
      <div
        className={`absolute rounded-full pointer-events-none transition-all`}
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(168,184,160,0.14) 0%, rgba(168,184,160,0.04) 55%, transparent 75%)',
          opacity: isActive ? 1 : 0,
          transform: isActive ? 'scale(1)' : 'scale(0.5)',
          transitionDuration: '1400ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* Amber glow — kept, pairs with sage */}
      <div
        className={`absolute rounded-full pointer-events-none transition-all`}
        style={{
          width: 160,
          height: 160,
          background: 'radial-gradient(circle, rgba(251,191,36,0.28) 0%, rgba(251,191,36,0.05) 60%, transparent 80%)',
          opacity: isActive ? 1 : 0,
          transform: isActive ? 'scale(1)' : 'scale(0)',
          transitionDuration: '900ms',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />

      <div
        className={`relative mx-8 max-w-sm w-full bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-none transition-all ${
          phase === 'pause' ? 'opacity-0 scale-90 translate-y-4'
          : isActive ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-95 -translate-y-2'
        }`}
        style={{
          transitionDuration: phase === 'pause' ? '0ms' : phase === 'glow' ? '800ms' : '500ms',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Shimmer strip — amber blending into sage */}
        <div
          className={`h-1 w-full transition-all duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: 'linear-gradient(90deg, #fbbf24, #a8b8a0, #fbbf24)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2.5s ease-in-out infinite',
          }}
        />

        <div className="px-8 py-8 text-center">
          <div
            className={`text-5xl mb-5 transition-all ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
            style={{ transitionDuration: '600ms', transitionDelay: '100ms' }}
          >
            {config?.icon}
          </div>

          <p
            className={`text-[10px] text-stone-300 uppercase tracking-[0.2em] font-medium mb-4 transition-all duration-500 ${
              phase === 'glow' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {config?.label} · {petName}
          </p>

          <div
            className={`transition-all ${
              phase === 'message' || phase === 'score' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
            style={{ transitionDuration: '700ms', transitionTimingFunction: 'ease-out' }}
          >
            <p className="text-stone-700 text-[17px] leading-[1.65] font-light tracking-tight mb-2">
              {log.emotional_translation}
            </p>
            <p className="text-stone-400 text-sm font-light italic">
              {t('love.moment')}
            </p>
          </div>

          {/* Score — sage tint gradient background, no solid green fill */}
          <div
            className={`mt-6 transition-all ${
              phase === 'score' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90'
            }`}
            style={{ transitionDuration: '600ms', transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(255,251,235,0.95) 0%, rgba(232,240,230,0.9) 100%)',
                border: '1px solid rgba(168,184,160,0.25)',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" />
              <span className="text-sage-700 font-bold text-base">+{log.love_value}</span>
              <span className="text-stone-400 text-xs font-medium">{t('love.unit')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
