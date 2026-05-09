import { useState } from 'react';
import type { Lang } from '../lib/i18n';

interface Props {
  onSelect: (lang: Lang) => void;
}

export default function LanguageScreen({ onSelect }: Props) {
  const [chosen, setChosen] = useState<Lang | null>(null);

  const handleSelect = (lang: Lang) => {
    if (chosen) return;
    setChosen(lang);
    setTimeout(() => onSelect(lang), 900);
  };

  const fading = chosen !== null;

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at center, #f3e7d8 0%, #fdf9f4 60%, #f8f2ea 100%)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.75s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft ambient secondary glow */}
      <div
        style={{
          position: 'absolute',
          top: '35%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480, height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,215,120,0.07) 0%, transparent 68%)',
          pointerEvents: 'none',
        }}
      />

      {/* BONDA wordmark — floats near top, non-structural */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0, right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <img
          src="/Ver16_Pitch_BONDA.png"
          alt="BONDA"
          style={{ height: 18, width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply', opacity: 0.13 }}
        />
      </div>

      {/* ── Centered content block ── */}
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Title */}
        <p
          style={{
            fontSize: 22,
            fontWeight: 300,
            lineHeight: 1.65,
            letterSpacing: '-0.01em',
            color: 'rgba(50,40,28,0.72)',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Before anything else,<br />
          how would you like<br />
          to begin?
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          <LangButton
            lang="ja"
            emoji="💛"
            label="日本語ではじめる"
            chosen={chosen === 'ja'}
            dimmed={fading && chosen !== 'ja'}
            onSelect={handleSelect}
          />
          <LangButton
            lang="en"
            emoji="🤍"
            label="Begin in English"
            chosen={chosen === 'en'}
            dimmed={fading && chosen !== 'en'}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </div>
  );
}

// ── Language button ───────────────────────────────────────────────────────────

interface LangButtonProps {
  lang: Lang;
  emoji: string;
  label: string;
  chosen: boolean;
  dimmed: boolean;
  onSelect: (lang: Lang) => void;
}

function LangButton({ lang, emoji, label, chosen, dimmed, onSelect }: LangButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={() => onSelect(lang)}
      disabled={chosen || dimmed}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        display: 'block',
        width: '100%',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        cursor: chosen || dimmed ? 'default' : 'pointer',
        opacity: dimmed ? 0.08 : 1,
        transition: 'opacity 0.7s ease',
      }}
    >
      <div
        style={{
          borderRadius: 28,
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: chosen
            ? 'linear-gradient(135deg, #fffcf4 0%, #faf3e4 100%)'
            : pressed
            ? 'linear-gradient(135deg, #fdf9f1 0%, #f8f1e4 100%)'
            : 'linear-gradient(135deg, #fffdf8 0%, #fbf6ed 100%)',
          border: chosen
            ? '1px solid rgba(200,175,100,0.38)'
            : '1px solid rgba(210,195,162,0.28)',
          boxShadow: chosen
            ? '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(180,150,60,0.10)'
            : pressed
            ? '0 4px 12px rgba(0,0,0,0.06)'
            : '0 8px 24px rgba(0,0,0,0.08)',
          transform: chosen ? 'scale(1.03)' : pressed ? 'scale(0.975)' : 'scale(1)',
          animation: !chosen && !pressed && !dimmed
            ? `langBreathe 3.8s ease-in-out infinite`
            : 'none',
          animationDelay: lang === 'en' ? '1.2s' : '0s',
          transition: [
            'transform 0.45s cubic-bezier(0.34,1.4,0.64,1)',
            'box-shadow 0.35s ease',
            'border-color 0.35s ease',
            'background 0.25s ease',
          ].join(', '),
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>

        <span
          style={{
            fontSize: lang === 'ja' ? 17 : 18,
            fontWeight: 400,
            color: chosen ? 'rgba(45,36,22,0.88)' : 'rgba(60,50,34,0.72)',
            letterSpacing: lang === 'ja' ? '0.05em' : '-0.005em',
            lineHeight: 1.3,
            flex: 1,
            textAlign: 'left',
            transition: 'color 0.3s ease',
          }}
        >
          {label}
        </span>

        {/* Selection dot */}
        <div
          style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(180,150,60,0.70)',
            opacity: chosen ? 1 : 0,
            transform: chosen ? 'scale(1)' : 'scale(0)',
            transition: 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      </div>
    </button>
  );
}
