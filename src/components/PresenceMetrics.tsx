interface MetricRow {
  label: string;
  value: number;
  color: string;
}

const METRICS: MetricRow[] = [
  { label: 'Warmth',     value: 12, color: 'rgba(224,154,108,0.95)' },
  { label: 'Trust',      value: 8,  color: 'rgba(150,180,150,0.95)' },
  { label: 'Calm',       value: 6,  color: 'rgba(160,190,210,0.95)' },
  { label: 'Attachment', value: 10, color: 'rgba(210,170,120,0.95)' },
];

interface Props {
  petName: string;
}

export default function PresenceMetrics({ petName }: Props) {
  const max = Math.max(...METRICS.map(m => m.value));
  return (
    <section className="mx-5 mb-6 rounded-3xl p-5"
      style={{
        background: 'linear-gradient(180deg, rgba(30,22,10,0.88) 0%, rgba(48,34,16,0.92) 100%)',
        border: '1px solid rgba(253,220,140,0.18)',
      }}>
      <p className="text-[10px] uppercase tracking-[0.28em] font-medium"
        style={{ color: 'rgba(253,220,140,0.82)' }}>
        Presence Signals
      </p>
      <p className="text-[13px] font-light leading-[1.75] mt-2"
        style={{ color: 'rgba(255,240,210,0.88)' }}>
        {petName}&rsquo;s Presence is not generated from one prompt.
        It grows from repeated care, touch, walks, voice, and memory.
      </p>

      <div className="mt-4 space-y-2.5">
        {METRICS.map(m => (
          <div key={m.label}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11.5px] font-medium" style={{ color: 'rgba(255,240,210,0.92)' }}>
                {m.label}
              </span>
              <span className="text-[11px] font-mono" style={{ color: m.color }}>
                +{m.value}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,240,210,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(m.value / max) * 100}%`, background: m.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10.5px] font-light"
        style={{ color: 'rgba(255,220,160,0.6)' }}>
        Generated from relationship signals · Demo simulated
      </p>
    </section>
  );
}
