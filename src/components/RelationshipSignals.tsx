import { Watch, Bluetooth, Footprints, Heart, Hand, Mic, Sparkles } from 'lucide-react';

interface Props {
  petName: string;
  onTurnIntoPresence?: () => void;
  compact?: boolean;
}

interface SignalEvent {
  icon: typeof Heart;
  title: string;
  body: string;
  tone: 'warm' | 'sage' | 'sand';
  minsAgo: number;
}

const EVENTS: SignalEvent[] = [
  { icon: Hand,       title: 'Hug detected',    body: 'Collar proximity + owner heartbeat softened',    tone: 'warm', minsAgo: 3 },
  { icon: Heart,      title: 'Gentle petting',  body: '6 minutes of calm contact',                      tone: 'warm', minsAgo: 22 },
  { icon: Footprints, title: 'Walk together',   body: '1,842 steps · 18 minutes',                       tone: 'sage', minsAgo: 180 },
  { icon: Sparkles,   title: 'Leaning in',      body: 'Baobao stayed close after you reached out',      tone: 'sand', minsAgo: 280 },
  { icon: Mic,        title: 'Voice memory',    body: 'Your voice was added to Baobao\u2019s Presence', tone: 'sand', minsAgo: 440 },
];

const toneStyle: Record<SignalEvent['tone'], { bg: string; ring: string; ic: string }> = {
  warm: { bg: 'rgba(240,180,140,0.18)', ring: 'rgba(240,180,140,0.35)', ic: 'rgba(180,104,60,0.95)' },
  sage: { bg: 'rgba(170,200,170,0.20)', ring: 'rgba(170,200,170,0.38)', ic: 'rgba(90,130,90,0.95)' },
  sand: { bg: 'rgba(220,200,160,0.22)', ring: 'rgba(220,200,160,0.40)', ic: 'rgba(150,120,70,0.95)' },
};

function ago(mins: number, now: Date) {
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RelationshipSignals({ petName, onTurnIntoPresence, compact = false }: Props) {
  const now = new Date();
  const events = compact ? EVENTS.slice(0, 3) : EVENTS;

  return (
    <section className="mx-5 mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] font-medium text-stone-400">
            Relationship Signals
          </p>
          <p className="text-[11px] text-stone-500 font-light mt-0.5">
            Demo simulated · Future device integration
          </p>
        </div>
      </div>

      {/* Devices */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <DeviceCard
          icon={<Bluetooth size={14} />}
          title="BONDA Collar"
          status="Demo connected"
          detail={`Near ${petName} · warm`}
        />
        <DeviceCard
          icon={<Watch size={14} />}
          title="Owner Apple Watch"
          status="Demo connected"
          detail="Resting HR 68 · calm"
        />
      </div>

      <p className="text-[10px] text-stone-400 font-light mb-2 px-1">
        Simulated wearable signals — not a live device integration.
      </p>

      {/* Events feed */}
      <div className="rounded-2xl overflow-hidden border border-warm-400"
        style={{ background: 'linear-gradient(180deg, #fbf4e6 0%, #f5e9d0 100%)' }}>
        <div className="divide-y" style={{ borderColor: 'rgba(201,166,110,0.18)' }}>
          {events.map((ev, i) => {
            const Icon = ev.icon;
            const tone = toneStyle[ev.tone];
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: tone.bg, border: `1px solid ${tone.ring}`, color: tone.ic }}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-stone-700 truncate">{ev.title}</p>
                    <span className="text-[10px] text-stone-400 flex-shrink-0">{ago(ev.minsAgo, now)}</span>
                  </div>
                  <p className="text-[11.5px] text-stone-500 font-light leading-[1.6] mt-0.5">
                    {ev.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {onTurnIntoPresence && (
          <button
            onClick={onTurnIntoPresence}
            className="w-full px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'linear-gradient(135deg, #3c2a16, #5a3d1e)',
              color: '#f5e6c7',
            }}>
            <Sparkles size={13} />
            Turn this moment into Presence
          </button>
        )}
      </div>
    </section>
  );
}

function DeviceCard({ icon, title, status, detail }: { icon: React.ReactNode; title: string; status: string; detail: string }) {
  return (
    <div className="rounded-2xl px-3 py-3 border"
      style={{ background: 'rgba(255,248,232,0.8)', borderColor: 'rgba(201,166,110,0.22)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(201,166,110,0.14)', color: 'rgba(120,82,40,0.92)' }}>
          {icon}
        </span>
        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(140,180,140,0.18)', color: 'rgba(80,120,80,0.95)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(90,150,90,0.95)' }} />
          {status}
        </span>
      </div>
      <p className="text-[12.5px] font-semibold text-stone-700 leading-tight">{title}</p>
      <p className="text-[10.5px] text-stone-500 font-light mt-0.5">{detail}</p>
    </div>
  );
}
