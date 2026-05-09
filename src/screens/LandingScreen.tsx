import { useI18n } from '../lib/i18n';
import { Sparkles, Shield, Mic, Image as ImageIcon, MessageCircle, ArrowRight } from 'lucide-react';

interface Props {
  onStart: () => void;
  onLoadBaobao: () => void;
}

export default function LandingScreen({ onStart, onLoadBaobao }: Props) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen w-full overflow-y-auto" style={{
      background: 'radial-gradient(ellipse at 50% 0%, #f8efdd 0%, #f4e8d0 35%, #e8d9b8 100%)',
    }}>
      {/* Header */}
      <div className="px-7 pt-12 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f5d78e, #caa254)' }}>
            <Sparkles size={14} className="text-stone-800" />
          </div>
          <span className="text-[13px] font-semibold tracking-[0.24em] text-stone-800">BONDA</span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.22em] font-medium px-2 py-1 rounded-full"
          style={{ background: 'rgba(80,60,30,0.08)', color: 'rgba(80,60,30,0.62)' }}>
          Solana · Devnet Demo
        </span>
      </div>

      {/* Hero */}
      <div className="px-7 pt-10 pb-8">
        <p className="text-[11px] uppercase tracking-[0.28em] font-medium mb-3"
          style={{ color: 'rgba(120,90,40,0.68)' }}>
          Relationship-to-Presence OS
        </p>
        <h1 className="text-[34px] leading-[1.15] font-light tracking-tight"
          style={{ color: 'rgba(50,36,18,0.92)' }}>
          Most AI starts with prompts.<br />
          <span style={{ fontWeight: 500 }}>BONDA starts with relationships.</span>
        </h1>
        <p className="mt-6 text-[15px] leading-[1.75] font-light" style={{ color: 'rgba(80,62,36,0.78)' }}>
          AI generates responses. BONDA generates <em>Presence</em>. Your photos, stories,
          voice memories, daily care, and emotional bonds become an interactive AI Presence —
          for the pet you love, or the person you've lost.
        </p>
        <p className="mt-3 text-[13px] font-light italic" style={{ color: 'rgba(120,90,40,0.7)' }}>
          The relationship is the interface.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={onStart}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #f5d78e 0%, #c49a4a 100%)',
              color: 'rgba(55,40,18,0.95)',
              boxShadow: '0 10px 30px rgba(200,150,60,0.32)',
              border: '1px solid rgba(255,240,180,0.7)',
            }}
          >
            <span className="text-[14px] font-semibold tracking-wide">{t('landing.cta.start')}</span>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onLoadBaobao}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(255,252,240,0.65)',
              border: '1px solid rgba(120,90,40,0.25)',
              color: 'rgba(80,60,30,0.85)',
            }}
          >
            <Sparkles size={14} />
            <span className="text-[13px] font-medium">{t('landing.cta.sample')}</span>
          </button>
        </div>
      </div>

      {/* Flow */}
      <div className="px-7 pb-8">
        <p className="text-[10px] uppercase tracking-[0.24em] font-medium mb-4"
          style={{ color: 'rgba(120,90,40,0.6)' }}>
          Demo flow
        </p>
        <div className="space-y-3">
          {[
            { n: '01', label: 'Create a bond profile', sub: 'Name them. A photo. How they made you feel.' },
            { n: '02', label: 'Add a text memory', sub: 'Guided prompts help you put words to what mattered.' },
            { n: '03', label: 'Add a photo memory', sub: 'Visual moments become part of their Presence.' },
            { n: '04', label: 'Record a voice memory', sub: 'Your voice. Their name. Kept as a private capsule.' },
            { n: '05', label: 'Awaken Presence', sub: 'Relationship data becomes an interactive AI Presence.' },
            { n: '06', label: 'Talk with them', sub: 'Chat interaction shaped by your memories.' },
            { n: '07', label: 'Share a moment', sub: 'A Daily Bond Card you can post to a Story.' },
            { n: '08', label: 'Verify on Solana', sub: 'Provenance & ownership anchored on devnet.' },
          ].map((step, i) => (
            <div key={step.n} className="flex items-start gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: i === 0 ? 'rgba(255,252,240,0.72)' : 'rgba(255,252,240,0.45)',
                border: '1px solid rgba(120,90,40,0.15)',
              }}>
              <span className="text-[10px] font-mono font-semibold tracking-widest flex-shrink-0 mt-0.5"
                style={{ color: 'rgba(150,115,55,0.75)' }}>{step.n}</span>
              <div className="flex-1">
                <p className="text-[13px] font-medium" style={{ color: 'rgba(55,40,18,0.92)' }}>{step.label}</p>
                <p className="text-[11px] font-light mt-0.5 leading-[1.6]" style={{ color: 'rgba(100,80,50,0.65)' }}>{step.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capability row */}
      <div className="px-7 pb-8">
        <p className="text-[10px] uppercase tracking-[0.24em] font-medium mb-4"
          style={{ color: 'rgba(120,90,40,0.6)' }}>
          What BONDA understands
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: ImageIcon, label: 'Photos' },
            { icon: MessageCircle, label: 'Stories' },
            { icon: Mic, label: 'Voice memories' },
            { icon: Sparkles, label: 'Daily care' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{ background: 'rgba(255,252,240,0.55)', border: '1px solid rgba(120,90,40,0.15)' }}>
              <Icon size={16} style={{ color: 'rgba(120,90,40,0.75)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'rgba(60,44,20,0.88)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust layer */}
      <div className="mx-7 mb-12 p-5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30,22,10,0.88) 0%, rgba(50,36,14,0.92) 100%)',
          border: '1px solid rgba(255,220,150,0.18)',
        }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} style={{ color: 'rgba(253,220,140,0.9)' }} />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: 'rgba(253,220,140,0.9)' }}>Solana trust layer</p>
        </div>
        <p className="text-[13px] font-light leading-[1.75]" style={{ color: 'rgba(255,240,210,0.85)' }}>
          Relationship verification, memory capsule provenance, consent, and ownership are anchored on
          Solana. Private memories stay off-chain; only hashes go on-chain.
        </p>
        <p className="mt-3 text-[10px] font-light" style={{ color: 'rgba(255,220,160,0.55)' }}>
          Current build: devnet + mock signatures. No mainnet transactions are created.
        </p>
      </div>
    </div>
  );
}
