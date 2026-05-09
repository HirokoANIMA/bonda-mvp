import { Shield, ChevronRight } from 'lucide-react';

interface Props {
  label: string;
  onOpen: () => void;
}

export default function TrustEntry({ label, onOpen }: Props) {
  const scrollAfterNav = () => {
    onOpen();
    // Give the route switch a tick, then scroll the trust section into view.
    setTimeout(() => {
      const el = document.getElementById('solana-trust-layer');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  return (
    <button
      onClick={scrollAfterNav}
      className="mx-5 mb-5 w-[calc(100%-2.5rem)] px-4 py-3 rounded-2xl flex items-center gap-3 transition-all hover:translate-y-[-1px]"
      style={{
        background: 'linear-gradient(180deg, rgba(30,22,10,0.92) 0%, rgba(50,36,14,0.94) 100%)',
        border: '1px solid rgba(253,220,140,0.22)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
      }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(253,220,140,0.14)' }}>
        <Shield size={14} style={{ color: 'rgba(253,220,140,0.95)' }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: 'rgba(253,220,140,0.82)' }}>
          Solana trust layer
        </p>
        <p className="text-[12px] font-light mt-0.5" style={{ color: 'rgba(255,240,210,0.88)' }}>
          {label}
        </p>
      </div>
      <ChevronRight size={14} style={{ color: 'rgba(253,220,140,0.7)' }} />
    </button>
  );
}
