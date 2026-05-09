import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { useBondaStore } from '../lib/store';
import { useI18n } from '../lib/i18n';

type Store = ReturnType<typeof useBondaStore>;

interface Props {
  store: Store;
}

function SignalBar({ value, label, desc }: { value: number; label: string; desc: string }) {
  const color =
    value >= 70 ? 'bg-sage-300' :
    value >= 40 ? 'bg-amber-200' :
    'bg-stone-200';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-[11px] font-medium text-stone-600">{label}</span>
          <span className="text-[10px] text-stone-400 ml-1.5">{desc}</span>
        </div>
        <span className="text-[11px] text-stone-500 font-light">{value}%</span>
      </div>
      <div className="h-1.5 bg-warm-300 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function BondWallet({ store }: Props) {
  const { t } = useI18n();
  const { pet, wallet, signals, verifiedLove, convertVerifiedLove } = store;
  const [showSignals, setShowSignals] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [converting, setConverting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const convertableAmount = Math.floor(verifiedLove / 100) * 100;
  const wouldEarn = convertableAmount / 100;
  const canConvert = convertableAmount >= 100;

  const handleConvert = () => {
    setConverting(true);
    setTimeout(() => {
      convertVerifiedLove(convertableAmount, verifiedLove);
      setConverting(false);
      setConfirmed(true);
      setShowConvert(false);
      setTimeout(() => setConfirmed(false), 4000);
    }, 1400);
  };

  const avgSignal = Math.round(
    (signals.consistency + signals.reality + signals.relationship + signals.richness) / 4
  );

  const signalKeys = ['consistency', 'reality', 'relationship', 'richness'] as const;

  return (
    <div className="px-5 pb-6">
      <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium mb-3">{t('wallet.title')}</p>

      <div className="bg-warm-200 rounded-3xl border border-warm-400 overflow-hidden">

        {/* Total love score */}
        <div className="px-5 pt-5 pb-4 border-b border-warm-400">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium mb-2">{t('wallet.totalLove')}</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-light text-stone-800 tracking-tight leading-none">
              {store.pet.love_score.toLocaleString()}
            </span>
            <span className="text-sm text-stone-400 pb-0.5 font-light">{t('wallet.totalLove.unit')}</span>
          </div>
          <p className="text-[11px] text-stone-400 font-light mt-2 leading-relaxed">{t('wallet.totalLove.body')}</p>
        </div>

        {/* Verified love — sage as a text tint only */}
        <div className="px-5 py-4 border-b border-warm-400">
          <div className="flex items-start justify-between mb-1.5">
            <div>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">{t('wallet.verified')}</p>
              <p className="text-[11px] text-stone-400 font-light mt-0.5">{t('wallet.verified.sub')}</p>
            </div>
            <button
              onClick={() => setShowSignals(s => !s)}
              className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors mt-0.5 underline underline-offset-2"
            >
              {showSignals ? t('wallet.verified.hide') : t('wallet.verified.how')}
            </button>
          </div>

          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-light text-sage-600 leading-none">{verifiedLove.toLocaleString()}</span>
            <span className="text-sm text-stone-400 pb-0.5 font-light">{t('wallet.verified.unit')}</span>
          </div>

          {showSignals && (
            <div className="space-y-3 mt-3 pt-3 border-t border-warm-400">
              <p className="text-[10px] text-stone-400 font-light leading-relaxed">{t('wallet.verified.explainer')}</p>
              {signalKeys.map(key => (
                <SignalBar
                  key={key}
                  value={signals[key]}
                  label={t(`wallet.signal.${key}` as any)}
                  desc={t(`wallet.signal.${key}.desc` as any)}
                />
              ))}
              <p className="text-[10px] text-stone-300 font-light pt-1">{t('wallet.signal.quality', { n: avgSignal })}</p>
            </div>
          )}
        </div>

        {/* BOND tokens */}
        {wallet.bondTokens > 0 && (
          <div className="px-5 py-4 border-b border-warm-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">{t('wallet.bond.title')}</p>
                <p className="text-[11px] text-stone-400 font-light mt-0.5">{t('wallet.bond.sub')}</p>
              </div>
              <span className="text-2xl font-light text-stone-700">{wallet.bondTokens.toFixed(2)}</span>
            </div>
            <div className="mt-3 space-y-2">
              {(['pet', 'family', 'donate'] as const).map(key => (
                <div key={key} className="flex items-start gap-2.5">
                  <span className="text-sm mt-0.5">{key === 'pet' ? '🐾' : key === 'family' ? '🤝' : '🌱'}</span>
                  <div>
                    <p className="text-[11px] font-medium text-stone-600">{t(`wallet.tokenUse.${key}` as any)}</p>
                    <p className="text-[10px] text-stone-400 font-light">{t(`wallet.tokenUse.${key}.desc` as any)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Convert section */}
        <div className="px-5 py-4">
          {confirmed ? (
            <div className="flex items-center gap-2 justify-center py-1">
              {/* Sage soft glow instead of filled circle */}
              <div className="w-5 h-5 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
                <Check size={11} className="text-sage-600" />
              </div>
              <p className="text-sm text-sage-600 font-light">
                {t('wallet.convert.confirmed', { n: wouldEarn.toFixed(2) })}
              </p>
            </div>
          ) : canConvert ? (
            <button
              onClick={() => setShowConvert(true)}
              className="w-full py-3.5 rounded-2xl bg-stone-800 text-white text-sm font-light tracking-wide hover:bg-stone-700 active:scale-[0.98] transition-all"
            >
              {t('wallet.convert.cta')}
            </button>
          ) : (
            <div className="text-center">
              <p className="text-[11px] text-stone-400 font-light leading-relaxed mb-2">
                {verifiedLove === 0
                  ? t('wallet.convert.notYet.zero', { name: pet.name })
                  : t('wallet.convert.notYet.progress', { n: 100 - (verifiedLove % 100) })}
              </p>
              <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage-200 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, verifiedLove % 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-300 mt-1.5 font-light">{verifiedLove % 100} / 100</p>
            </div>
          )}
        </div>
      </div>

      {/* Convert confirmation sheet */}
      {showConvert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
            onClick={() => !converting && setShowConvert(false)}
          />
          <div className="relative w-full max-w-md bg-warm-100 rounded-t-3xl px-6 pt-6 pb-10 border-t border-warm-400">
            {!converting && (
              <button
                onClick={() => setShowConvert(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center"
              >
                <X size={13} className="text-stone-500" />
              </button>
            )}
            <p className="text-[10px] text-amber-500 uppercase tracking-widest font-medium mb-3">
              {t('wallet.sheet.badge')}
            </p>
            <h3 className="text-xl font-light text-stone-800 leading-snug mb-2">
              {t('wallet.sheet.title')}
            </h3>
            <p className="text-sm text-stone-500 font-light leading-relaxed mb-5">
              {t('wallet.sheet.body', {
                amount: convertableAmount.toLocaleString(),
                tokens: wouldEarn.toFixed(2),
                name: pet.name,
              })}
            </p>
            <div className="bg-warm-100 rounded-2xl border border-warm-400 px-4 py-3.5 mb-5 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-400 font-light">{t('wallet.sheet.used')}</span>
                <span className="text-sm text-stone-600">−{convertableAmount.toLocaleString()}</span>
              </div>
              <div className="h-px bg-warm-300" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-400 font-light">{t('wallet.sheet.received')}</span>
                <span className="text-sm text-sage-600 font-medium">+{wouldEarn.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleConvert}
              disabled={converting}
              className="w-full py-3.5 rounded-2xl bg-stone-800 text-white text-sm font-light tracking-wide hover:bg-stone-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {converting ? t('wallet.sheet.converting') : t('wallet.sheet.confirm')}
            </button>
            <p className="text-[10px] text-stone-400 text-center mt-3 font-light leading-relaxed">
              {t('wallet.sheet.footer', { name: pet.name })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
