import { useState } from 'react';
import { Bluetooth, Watch, X } from 'lucide-react';
import { DEMO_PET_ID } from '../lib/store';

interface Props {
  petId?: string;
  petName?: string;
}

export default function CollarStatus({ petId, petName }: Props) {
  const isDemo = petId === DEMO_PET_ID;
  const [modal, setModal] = useState<null | 'collar' | 'watch'>(null);

  return (
    <>
      <section className="mx-5 mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[10px] text-stone-400 uppercase tracking-[0.26em] font-medium">
            Devices
          </p>
          <p className="text-[10px] text-stone-400 font-light">
            {isDemo ? 'Demo simulated' : 'Future device integration'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <DeviceCard
            icon={<Bluetooth size={14} />}
            title="BONDA Collar"
            isDemo={isDemo}
            detail={isDemo ? `Near ${petName ?? 'your pet'} · warm` : 'Touch, proximity, calm moments'}
            cta="Buy BONDA Collar"
            onCta={() => setModal('collar')}
          />
          <DeviceCard
            icon={<Watch size={14} />}
            title={isDemo ? 'Owner Apple Watch' : 'Apple Watch'}
            isDemo={isDemo}
            detail={isDemo ? 'Resting HR 68 · calm' : 'Care, walks, heartbeat signals'}
            cta="Connect Apple Watch"
            onCta={() => setModal('watch')}
          />
        </div>

        <p className="text-[10px] text-stone-400 font-light mt-2 px-1">
          {isDemo
            ? 'Simulated wearable signals — not a live device integration.'
            : 'Wearable integrations arrive with the BONDA Collar.'}
        </p>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          style={{ background: 'rgba(30,22,10,0.55)' }}
          onClick={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-3xl p-6 relative"
            style={{ background: 'linear-gradient(180deg, #fbf4e6 0%, #f2e3c4 100%)', border: '1px solid rgba(201,166,110,0.35)' }}
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModal(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(120,82,40,0.08)', color: 'rgba(80,55,28,0.75)' }}>
              <X size={14} />
            </button>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(120,82,40,0.10)', color: 'rgba(100,68,32,0.95)' }}>
              {modal === 'collar' ? <Bluetooth size={18} /> : <Watch size={18} />}
            </div>
            <p className="text-[10px] uppercase tracking-[0.28em] font-semibold" style={{ color: 'rgba(120,82,40,0.75)' }}>
              Coming soon
            </p>
            <h3 className="text-lg font-semibold mt-1" style={{ color: 'rgba(60,40,18,0.95)' }}>
              {modal === 'collar' ? 'BONDA Collar' : 'Apple Watch'}
            </h3>
            <p className="text-[13px] font-light leading-[1.7] mt-2" style={{ color: 'rgba(80,55,28,0.85)' }}>
              Coming soon. BONDA Collar and Apple Watch integration will allow care, walks, touch, proximity, and calm moments to become relationship signals.
            </p>
            <button onClick={() => setModal(null)}
              className="mt-5 w-full py-3 rounded-2xl text-[13px] font-semibold"
              style={{ background: 'linear-gradient(135deg, #3c2a16, #5a3d1e)', color: '#f5e6c7' }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function DeviceCard({ icon, title, isDemo, detail, cta, onCta }: {
  icon: React.ReactNode;
  title: string;
  isDemo: boolean;
  detail: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="rounded-2xl px-3 py-3 border"
      style={{ background: 'rgba(255,248,232,0.8)', borderColor: 'rgba(201,166,110,0.22)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(201,166,110,0.14)', color: 'rgba(120,82,40,0.92)' }}>
          {icon}
        </span>
        {isDemo ? (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(140,180,140,0.18)', color: 'rgba(80,120,80,0.95)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(90,150,90,0.95)' }} />
            Demo connected
          </span>
        ) : (
          <span className="text-[9px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(201,166,110,0.14)', color: 'rgba(120,82,40,0.8)' }}>
            Coming soon
          </span>
        )}
      </div>
      <p className="text-[12.5px] font-semibold text-stone-700 leading-tight">{title}</p>
      <p className="text-[10.5px] text-stone-500 font-light mt-0.5 mb-2">{detail}</p>
      {!isDemo && (
        <button onClick={onCta}
          className="w-full text-[10.5px] font-semibold uppercase tracking-wider px-2 py-1.5 rounded-full"
          style={{ background: 'rgba(60,40,18,0.92)', color: '#f5e6c7' }}>
          {cta}
        </button>
      )}
    </div>
  );
}
