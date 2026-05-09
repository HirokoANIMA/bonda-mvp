import { useState } from 'react';
import { Camera, CreditCard as Edit3, Check, X, Sparkles, RefreshCw, RotateCcw, ShieldOff, Heart, ChevronRight } from 'lucide-react';
import { ACTION_CONFIGS } from '../lib/types';
import type { useBondaStore } from '../lib/store';
import BondWallet from '../components/BondWallet';
import TrustEntry from '../components/TrustEntry';
import { PhotoPickerModal } from '../components/PhotoPicker';
import { useI18n } from '../lib/i18n';

type Store = ReturnType<typeof useBondaStore>;

interface Props {
  store: Store;
  onOpenTrustLayer?: () => void;
  onStartOver?: () => void;
  onCreateOwn?: () => void;
  onReloadDemo?: () => void;
}

// ── Coin utility cards ────────────────────────────────────────────────────────

interface UtilityCard {
  icon: string;
  title: string;
  body: string;
}

function CoinUtilitySection({ lang }: { lang: string }) {
  const isJa = lang === 'ja';

  const title = isJa ? 'Bond Walletの価値の使い道' : 'How Bond Wallet Value Is Used';
  const subtitle = isJa
    ? '関係から生まれた価値は、ケアや寄付へつながります。'
    : 'Value born from your bond continues in the real world.';

  const cards: UtilityCard[] = isJa
    ? [
        { icon: '🐾', title: 'ケアに使う',     body: 'トリミング・ホテル・通院などに使える予定' },
        { icon: '🌱', title: '寄付につなぐ',   body: '保護犬・保護猫や動物福祉への支援に' },
        { icon: '📖', title: '思い出を残す',   body: '写真・動画・記憶をより深く保存' },
        { icon: '👨‍👩‍👧', title: '家族と共有する', body: '大切な関係を家族で受け継ぐ' },
      ]
    : [
        { icon: '🐾', title: 'Pet care',      body: 'Grooming, boarding, vet visits and more' },
        { icon: '🌱', title: 'Donate',        body: 'Support shelters and animal welfare' },
        { icon: '📖', title: 'Keep memories', body: 'Save photos, videos, and written memories' },
        { icon: '👨‍👩‍👧', title: 'Share',         body: 'Pass this bond on to your family' },
      ];

  return (
    <div className="px-5 pb-6">
      <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-1">
        {title}
      </p>
      <p className="text-[11px] text-stone-400 font-light mb-4 leading-relaxed">
        {subtitle}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map(card => (
          <div
            key={card.title}
            className="bg-warm-100 rounded-2xl border border-warm-400 px-4 py-3.5"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{card.icon}</span>
              <p className="text-[12px] font-semibold text-stone-700 leading-tight">{card.title}</p>
            </div>
            <p className="text-[11px] text-stone-400 font-light leading-relaxed">{card.body}</p>
            <p
              className="text-[9px] font-medium mt-2 uppercase tracking-widest"
              style={{ color: 'rgba(160,140,80,0.50)' }}
            >
              {isJa ? 'Coming soon' : 'Coming soon'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileScreen({ store, onOpenTrustLayer, onStartOver, onCreateOwn, onReloadDemo }: Props) {
  const { t, lang, setLang } = useI18n();
  const { pet, logs, updatePet } = store;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);
  const [species, setSpecies] = useState(pet.species);
  const [showPhotoSelect, setShowPhotoSelect] = useState(false);
  const [confirm, setConfirm] = useState<null | 'startOver' | 'clearProof'>(null);

  const save = () => {
    updatePet({ name: name.trim() || pet.name, species: species.trim() || pet.species });
    setEditing(false);
  };

  const cancel = () => {
    setName(pet.name);
    setSpecies(pet.species);
    setEditing(false);
  };

  const actionCounts = ACTION_CONFIGS.map(c => ({
    config: c,
    count: logs.filter(l => l.action_type === c.type).length,
    total: logs.filter(l => l.action_type === c.type).reduce((s, l) => s + l.love_value, 0),
  })).sort((a, b) => b.count - a.count);

  const memberSince = logs.length > 0
    ? t('profile.since', { date: new Date(logs[logs.length - 1].created_at).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', year: 'numeric' }) })
    : t('profile.since.new');

  return (
    <div className="flex flex-col min-h-full bg-warm-50">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-warm-200 to-warm-50 px-5 pt-14 pb-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img
              src={pet.photo_url}
              alt={pet.name}
              className="w-24 h-24 rounded-3xl object-cover shadow-lg"
              style={{ objectPosition: 'center' }}
            />
            <button
              onClick={() => setShowPhotoSelect(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-stone-800 rounded-full flex items-center justify-center shadow-lg"
            >
              <Camera size={12} className="text-white" />
            </button>
          </div>
          <div className="flex-1 pt-2">
            {editing ? (
              <div className="space-y-2">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-lg font-bold text-stone-800 bg-warm-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-warm-500 border border-warm-400"
                  autoFocus
                />
                <input
                  value={species}
                  onChange={e => setSpecies(e.target.value)}
                  className="w-full text-sm text-stone-500 bg-warm-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-warm-500 border border-warm-400"
                  placeholder={t('profile.species.placeholder')}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={save} className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 text-white rounded-xl text-xs font-semibold">
                    <Check size={12} /> {t('profile.edit.save')}
                  </button>
                  <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 bg-warm-300 text-stone-600 rounded-xl text-xs font-semibold border border-warm-400">
                    <X size={12} /> {t('profile.edit.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-2xl font-bold text-stone-800">{pet.name}</h1>
                  <button onClick={() => setEditing(true)} className="p-1 rounded-lg hover:bg-warm-300 text-stone-400 transition-colors">
                    <Edit3 size={14} />
                  </button>
                </div>
                <p className="text-stone-500 text-sm capitalize">{pet.species}</p>
                <p className="text-stone-400 text-xs mt-1">{memberSince}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bond Wallet */}
      <BondWallet store={store} />

      {/* How Bond Wallet Value Is Used (moved up directly under Bond Wallet) */}
      <CoinUtilitySection lang={lang} />

      {/* Solana Trust Layer entry — opens Memories and scrolls to trust layer */}
      {onOpenTrustLayer && (
        <TrustEntry label="Bond ownership and consent status" onOpen={onOpenTrustLayer} />
      )}

      {/* Care Breakdown */}
      <div className="px-5 pb-5">
        <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-3">{t('profile.care.title')}</p>
        <div className="bg-warm-100 rounded-2xl border border-warm-400 overflow-hidden">
          {actionCounts.map(({ config, count, total }, i) => (
            <div
              key={config.type}
              className={`flex items-center gap-3 px-4 py-3 ${i < actionCounts.length - 1 ? 'border-b border-warm-300' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 border ${config.color}`}>
                {config.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-700">{config.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-warm-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-400 rounded-full transition-all"
                      style={{
                        width: logs.length > 0 ? `${(count / (logs.length || 1)) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-400 flex-shrink-0">{count}x</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-sage-600 flex-shrink-0">+{total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Language toggle */}
      <div className="px-5 pb-6">
        <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-3">{t('profile.lang.label')}</p>
        <div className="flex gap-2">
          {(['en', 'ja'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold border-2 transition-all active:scale-95 ${
                lang === l
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-warm-100 text-stone-500 border-warm-400 hover:border-warm-600'
              }`}
            >
              {t(l === 'en' ? 'profile.lang.en' : 'profile.lang.ja')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Start yours invitation (demo pet only) ── */}
      {pet.id === 'demo-pet-baobao' && onCreateOwn && (
        <div className="px-5 pb-6">
          <div className="relative overflow-hidden rounded-3xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(255,244,215,0.95) 0%, rgba(236,200,120,0.78) 100%)',
              border: '1px solid rgba(180,140,70,0.35)',
              boxShadow: '0 12px 36px rgba(180,140,70,0.16)',
            }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(60,42,18,0.92)', color: '#f5e6c7' }}>
                <Heart size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1"
                  style={{ color: 'rgba(120,82,34,0.78)' }}>
                  Your turn
                </p>
                <p className="text-[15px] font-semibold leading-snug"
                  style={{ color: 'rgba(50,34,14,0.95)' }}>
                  Create a BONDA for your own pet or loved one
                </p>
              </div>
            </div>
            <button
              onClick={onCreateOwn}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #3c2a16, #5a3d1e)',
                color: '#f5e6c7',
                boxShadow: '0 8px 20px rgba(60,42,18,0.26)',
              }}>
              <span className="text-[13px] font-semibold tracking-wide">Start yours</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── DEMO & DATA ── */}
      <div className="px-5 pb-8">
        <p className="text-xs uppercase tracking-widest font-medium mb-1" style={{ color: 'rgba(120,90,45,0.70)' }}>
          Demo & Data
        </p>
        <p className="text-[11px] font-light mb-3 leading-relaxed" style={{ color: 'rgba(110,85,45,0.68)' }}>
          Reload the demo, explore your own, or clear local state on this device.
        </p>

        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(201,166,110,0.32)', background: 'rgba(255,250,238,0.75)' }}>
          <DataRow
            icon={<Sparkles size={14} />}
            title="Create your own BONDA"
            subtitle="Start a new Presence for your pet or loved one."
            onClick={() => onCreateOwn?.()}
            disabled={!onCreateOwn}
          />
          <DataRow
            icon={<RefreshCw size={14} />}
            title="Reload Baobao demo"
            subtitle="Return to the Baobao demo profile."
            onClick={() => onReloadDemo?.()}
            disabled={!onReloadDemo}
          />
          <DataRow
            icon={<RotateCcw size={14} />}
            title="Start over"
            subtitle="Clear current local demo data and return to the first screen."
            onClick={() => setConfirm('startOver')}
            emphasis
            last={!store.verifications || store.verifications.length === 0}
          />
          {store.verifications && store.verifications.length > 0 && (
            <DataRow
              icon={<ShieldOff size={14} />}
              title="Clear local proof history"
              subtitle="Remove locally saved devnet proof records from this browser."
              onClick={() => setConfirm('clearProof')}
              last
            />
          )}
        </div>

        <p className="text-[10.5px] font-light mt-2 px-1 leading-relaxed" style={{ color: 'rgba(110,85,45,0.60)' }}>
          Real Solana devnet transactions are never deleted. Your wallet stays connected.
        </p>
      </div>

      {/* Logo mark */}
      <div className="flex justify-center px-6 pt-2 pb-8">
        <img
          src="/Ver16_Pitch_BONDA.png"
          alt="BONDA"
          className="h-6 w-auto object-contain opacity-40"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {showPhotoSelect && (
        <PhotoPickerModal
          species={pet.species}
          currentUrl={pet.photo_url}
          onSelect={(url) => updatePet({ photo_url: url })}
          onClose={() => setShowPhotoSelect(false)}
        />
      )}

      {confirm === 'startOver' && (
        <ConfirmModal
          title="Start over?"
          body="This will clear the current local demo state and return you to the first screen. Your private memories are stored only locally in this demo."
          cancelLabel="Cancel"
          confirmLabel="Start over"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            onStartOver?.();
          }}
        />
      )}

      {confirm === 'clearProof' && (
        <ConfirmModal
          title="Clear local proof history?"
          body="This removes locally saved devnet proof records from this browser only. Real Solana devnet transactions on-chain are not affected."
          cancelLabel="Cancel"
          confirmLabel="Clear proof history"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            store.clearProofHistory();
          }}
        />
      )}
    </div>
  );
}

function DataRow({
  icon, title, subtitle, onClick, emphasis, disabled, last,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  emphasis?: boolean;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-warm-200/60 active:bg-warm-300/50'} ${last ? '' : 'border-b'}`}
      style={{ borderColor: 'rgba(201,166,110,0.22)' }}>
      <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: emphasis ? 'rgba(60,42,18,0.92)' : 'rgba(201,166,110,0.16)',
          color: emphasis ? '#f5e6c7' : 'rgba(120,82,40,0.95)',
        }}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-semibold leading-tight" style={{ color: 'rgba(60,42,18,0.95)' }}>
          {title}
        </span>
        <span className="block text-[11.5px] font-light mt-0.5 leading-relaxed" style={{ color: 'rgba(100,72,32,0.72)' }}>
          {subtitle}
        </span>
      </span>
      <ChevronRight size={14} style={{ color: 'rgba(120,82,40,0.45)' }} />
    </button>
  );
}

function ConfirmModal({
  title, body, cancelLabel, confirmLabel, onCancel, onConfirm,
}: {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: 'rgba(30,22,10,0.55)' }}
      onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-3xl p-6 relative"
        style={{ background: 'linear-gradient(180deg, #fbf4e6 0%, #f2e3c4 100%)', border: '1px solid rgba(201,166,110,0.35)' }}
        onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2" style={{ color: 'rgba(120,82,40,0.75)' }}>
          Confirm
        </p>
        <h3 className="text-lg font-semibold" style={{ color: 'rgba(60,40,18,0.95)' }}>
          {title}
        </h3>
        <p className="text-[13px] font-light leading-[1.7] mt-2" style={{ color: 'rgba(80,55,28,0.85)' }}>
          {body}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            onClick={onCancel}
            className="py-3 rounded-2xl text-[13px] font-semibold transition-colors"
            style={{
              background: 'rgba(255,252,240,0.9)',
              border: '1px solid rgba(120,90,40,0.28)',
              color: 'rgba(60,42,18,0.92)',
            }}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="py-3 rounded-2xl text-[13px] font-semibold transition-colors"
            style={{
              background: 'linear-gradient(135deg, #3c2a16, #5a3d1e)',
              color: '#f5e6c7',
            }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
