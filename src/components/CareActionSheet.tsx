import { useState } from 'react';
import { X } from 'lucide-react';
import type { ActionType } from '../lib/types';
import { ACTION_CONFIGS } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  onLog: (type: ActionType, note?: string) => void;
  onClose: () => void;
  petName: string;
}

export default function CareActionSheet({ onLog, onClose, petName }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<ActionType | null>(null);
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    if (!selected) return;
    onLog(selected, note.trim() || undefined);
    onClose();
  };

  const selectedConfig = ACTION_CONFIGS.find(c => c.type === selected);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-warm-100 rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest font-medium">{t('care.sheet.badge')}</p>
            <h2 className="text-xl font-semibold text-stone-800">{petName}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-warm-300 flex items-center justify-center text-stone-500 hover:bg-warm-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {ACTION_CONFIGS.map(config => (
            <button
              key={config.type}
              onClick={() => setSelected(config.type)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all ${
                selected === config.type
                  ? 'border-stone-700 bg-warm-300 shadow-sm scale-95'
                  : 'border-warm-400 bg-warm-200 hover:border-warm-500'
              }`}
            >
              <span className="text-xl">{config.icon}</span>
              <span className="text-[11px] font-medium text-stone-600">{config.label}</span>
              <span className="text-[10px] text-sage-600 font-semibold">+{config.loveValue}</span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mb-5 animate-fadeIn">
            <div className={`rounded-2xl border p-3.5 mb-3 ${selectedConfig?.color ?? ''}`}>
              <p className="text-sm font-medium">
                {selectedConfig?.label} — {selectedConfig?.loveValue} {t('wallet.totalLove.unit')}
              </p>
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('care.note.placeholder')}
              rows={2}
              className="w-full rounded-xl border border-warm-400 bg-warm-200 px-3.5 py-2.5 text-sm text-stone-700 placeholder-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-warm-500"
            />
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected}
          className={`w-full py-3.5 rounded-2xl text-sm font-semibold transition-all ${
            selected
              ? 'bg-stone-800 text-white hover:bg-stone-700 active:scale-95'
              : 'bg-warm-300 text-stone-400 cursor-not-allowed'
          }`}
        >
          {selected
            ? t('care.sheet.cta_ready', { action: selectedConfig?.label ?? '' })
            : t('care.sheet.cta_empty')}
        </button>
      </div>
    </div>
  );
}
