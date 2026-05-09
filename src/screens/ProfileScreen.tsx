import { useState } from 'react';
import { Camera, CreditCard as Edit3, Check, X } from 'lucide-react';
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

export default function ProfileScreen({ store, onOpenTrustLayer }: Props) {
  const { t, lang, setLang } = useI18n();
  const { pet, logs, updatePet } = store;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);
  const [species, setSpecies] = useState(pet.species);
  const [showPhotoSelect, setShowPhotoSelect] = useState(false);

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
    </div>
  );
}
