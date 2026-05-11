import { Sparkles, Shield, Mic, Image as ImageIcon, MessageCircle, Footprints, HeartHandshake, Heart, ArrowRight } from 'lucide-react';

interface Props {
  onStart: () => void;
  onLoadBaobao: () => void;
}

const BONDA_LOGO = '/Ver16_Pitch_BONDA.png';
const BAOBAO_HERO = '/baobao-demo.jpg';

const SIGNAL_CHIPS: { icon: typeof Heart; label: string }[] = [
  { icon: ImageIcon,     label: 'Photos' },
  { icon: Mic,           label: 'Voice' },
  { icon: Heart,         label: 'Care' },
  { icon: Footprints,    label: 'Walks' },
  { icon: HeartHandshake,label: 'Hugs' },
  { icon: MessageCircle, label: 'Memories' },
  { icon: Shield,        label: 'Solana proof' },
];

export default function LandingScreen({ onStart, onLoadBaobao }: Props) {
  return (
    <div
      className="min-h-screen w-full overflow-y-auto"
      style={{
        background:
          'radial-gradient(ellipse at 50% -10%, #fbf2dc 0%, #f5e7c6 38%, #e9d5ad 100%)',
      }}
    >
      {/* Header — official BONDA logo + devnet badge */}
      <div className="px-6 pt-10 pb-1 flex items-center justify-between">
        <img
          src={BONDA_LOGO}
          alt="BONDA"
          className="h-6 w-auto object-contain"
          style={{ mixBlendMode: 'multiply' }}
        />
        <span
          className="text-[9px] uppercase tracking-[0.22em] font-medium px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(80,60,30,0.08)', color: 'rgba(80,60,30,0.65)' }}
        >
          Solana · Devnet Demo
        </span>
      </div>

      {/* Baobao hero card */}
      <div className="px-6 pt-6">
        <div
          className="relative w-full rounded-[28px] overflow-hidden"
          style={{
            boxShadow: '0 20px 46px -18px rgba(120,82,32,0.38)',
            border: '1px solid rgba(255,240,200,0.7)',
          }}
        >
          <div className="aspect-[5/4] w-full relative">
            <img
              src={BAOBAO_HERO}
              alt="Baobao"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 30%' }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(40,24,6,0) 40%, rgba(40,24,6,0.14) 72%, rgba(40,24,6,0.55) 100%)',
              }}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <p
              className="text-[11px] uppercase tracking-[0.24em] font-medium"
              style={{ color: 'rgba(255,240,210,0.78)' }}
            >
              Baobao
            </p>
            <p
              className="text-[13.5px] font-light italic leading-snug mt-0.5"
              style={{ color: 'rgba(255,248,230,0.95)' }}
            >
              Baobao&rsquo;s Presence begins with care.
            </p>
          </div>
        </div>
      </div>

      {/* Emotional hero copy */}
      <div className="px-6 pt-7 pb-6">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-medium mb-4"
          style={{ color: 'rgba(120,90,40,0.68)' }}
        >
          Relationship-to-Presence OS
        </p>

        <h1
          className="text-[26px] leading-[1.2] font-light tracking-tight"
          style={{ color: 'rgba(50,36,18,0.94)' }}
        >
          Some moments are too small to post,
          <br />
          <span style={{ fontWeight: 500 }}>but too precious to lose.</span>
        </h1>

        <p
          className="mt-4 text-[14px] leading-[1.7] font-light"
          style={{ color: 'rgba(80,62,36,0.82)' }}
        >
          BONDA turns love, care, voice, and memories into Presence.
        </p>

        <div
          className="mt-5 pl-4"
          style={{ borderLeft: '2px solid rgba(201,166,110,0.45)' }}
        >
          <p
            className="text-[13.5px] leading-[1.65] font-light"
            style={{ color: 'rgba(60,42,18,0.86)' }}
          >
            Most AI starts with prompts.
            <br />
            <span style={{ fontWeight: 500 }}>BONDA starts with relationships.</span>
          </p>
          <p
            className="mt-2 text-[12.5px] font-light italic"
            style={{ color: 'rgba(120,90,40,0.78)' }}
          >
            The relationship is the interface.
          </p>
        </div>

        {/* Signal chips */}
        <div className="mt-6 flex flex-wrap gap-1.5">
          {SIGNAL_CHIPS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,252,240,0.7)',
                border: '1px solid rgba(201,166,110,0.32)',
                color: 'rgba(80,58,26,0.88)',
              }}
            >
              <Icon size={11} style={{ color: 'rgba(150,110,50,0.9)' }} />
              <span className="text-[11px] font-medium tracking-wide">{label}</span>
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onLoadBaobao}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #f5d78e 0%, #c49a4a 100%)',
              color: 'rgba(55,40,18,0.95)',
              boxShadow: '0 12px 32px -8px rgba(200,150,60,0.42)',
              border: '1px solid rgba(255,240,180,0.7)',
            }}
          >
            <Sparkles size={15} />
            <span className="text-[14px] font-semibold tracking-wide">
              Load Baobao demo profile
            </span>
          </button>
          <button
            onClick={onStart}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(255,252,240,0.82)',
              border: '1px solid rgba(120,90,40,0.28)',
              color: 'rgba(60,42,16,0.92)',
            }}
          >
            <span className="text-[13px] font-semibold tracking-wide">
              Create your own BONDA
            </span>
            <ArrowRight size={15} />
          </button>
          <p
            className="text-[11.5px] font-light leading-relaxed text-center mt-1"
            style={{ color: 'rgba(110,85,45,0.74)' }}
          >
            Start with Baobao&rsquo;s demo, or create a Presence for someone you love.
          </p>
        </div>
      </div>

      {/* Demo flow — softer */}
      <div className="px-6 pb-8">
        <p
          className="text-[10px] uppercase tracking-[0.24em] font-medium mb-4"
          style={{ color: 'rgba(120,90,40,0.6)' }}
        >
          Demo flow
        </p>
        <div className="space-y-2">
          {[
            { n: '01', label: 'Create a bond profile',   sub: 'Name them. A photo. How they made you feel.' },
            { n: '02', label: 'Add a text memory',       sub: 'Guided prompts help you put words to what mattered.' },
            { n: '03', label: 'Add a photo memory',      sub: 'Visual moments become part of their Presence.' },
            { n: '04', label: 'Record a voice memory',   sub: 'Your voice. Their name. Kept as a private capsule.' },
            { n: '05', label: 'Awaken Presence',         sub: 'Relationship data becomes an interactive AI Presence.' },
            { n: '06', label: 'Talk with them',          sub: 'Chat interaction shaped by your memories.' },
            { n: '07', label: 'Share a moment',          sub: 'A Daily Bond Card you can post to a Story.' },
            { n: '08', label: 'Verify on Solana',        sub: 'Provenance & ownership anchored on devnet.' },
          ].map((step) => (
            <div
              key={step.n}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: 'rgba(255,252,240,0.55)',
                border: '1px solid rgba(201,166,110,0.22)',
              }}
            >
              <span
                className="text-[10px] font-mono font-semibold tracking-widest flex-shrink-0 mt-0.5"
                style={{ color: 'rgba(150,115,55,0.7)' }}
              >
                {step.n}
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-medium" style={{ color: 'rgba(55,40,18,0.92)' }}>
                  {step.label}
                </p>
                <p
                  className="text-[11px] font-light mt-0.5 leading-[1.6]"
                  style={{ color: 'rgba(100,80,50,0.68)' }}
                >
                  {step.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust layer — calm foot */}
      <div
        className="mx-6 mb-12 p-5 rounded-2xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(30,22,10,0.9) 0%, rgba(50,36,14,0.94) 100%)',
          border: '1px solid rgba(255,220,150,0.18)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} style={{ color: 'rgba(253,220,140,0.9)' }} />
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: 'rgba(253,220,140,0.9)' }}
          >
            Solana trust layer
          </p>
        </div>
        <p
          className="text-[13px] font-light leading-[1.75]"
          style={{ color: 'rgba(255,240,210,0.85)' }}
        >
          Relationship verification, memory capsule provenance, consent, and ownership are anchored
          on Solana. Private memories stay off-chain; only hashes go on-chain.
        </p>
        <p className="mt-3 text-[10px] font-light" style={{ color: 'rgba(255,220,160,0.55)' }}>
          Current build: devnet + mock signatures. No mainnet transactions are created.
        </p>
      </div>
    </div>
  );
}
