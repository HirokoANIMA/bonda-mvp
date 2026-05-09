import { useState } from 'react';
import type { CareLog } from '../lib/types';
import { ACTION_CONFIGS } from '../lib/types';
import CareActionSheet from '../components/CareActionSheet';
import LoveFeedback from '../components/LoveFeedback';
import RelationshipSignals from '../components/RelationshipSignals';
import CollarStatus from '../components/CollarStatus';
import { DEMO_PET_ID } from '../lib/store';
import { sha256Hex, getDemoOwnerPubkey } from '../lib/solana';
import type { Verification } from '../lib/solana';
import type { useBondaStore } from '../lib/store';
import { useI18n } from '../lib/i18n';

type Store = ReturnType<typeof useBondaStore>;

interface Props {
  store: Store;
}


function groupByDay(logs: CareLog[]): Map<string, CareLog[]> {
  const map = new Map<string, CareLog[]>();
  for (const log of logs) {
    const key = new Date(log.created_at).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return map;
}

export default function CareScreen({ store }: Props) {
  const { t, lang } = useI18n();
  const [showSheet, setShowSheet] = useState(false);
  const [feedback, setFeedback] = useState<CareLog | null>(null);
  const [presenceFlash, setPresenceFlash] = useState<string | null>(null);

  const handleTurnIntoPresence = async () => {
    const payload = `care-signal:${store.pet.id}:${Date.now()}`;
    const content_hash = await sha256Hex(payload);
    const v: Verification = {
      id: crypto.randomUUID(),
      kind: 'care_signal',
      network: 'mock',
      tx_signature: '',
      owner_pubkey: getDemoOwnerPubkey(),
      content_hash,
      explorer_url: '',
      status: 'mock',
      created_at: new Date().toISOString(),
      capsule_id: null,
      label: 'Care signal',
    };
    store.addVerification(v);
    setPresenceFlash('Moment saved to Presence. View it in Memories.');
    setTimeout(() => setPresenceFlash(null), 2600);
  };

  function timeOfDay(iso: string): string {
    const h = new Date(iso).getHours();
    if (h < 6) return t('care.time.night');
    if (h < 12) return t('care.time.morning');
    if (h < 17) return t('care.time.afternoon');
    if (h < 21) return t('care.time.evening');
    return t('care.time.night');
  }

  function dayLabel(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return t('day.today');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return t('day.yesterday');
    return d.toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  const { pet, logs } = store;

  const grouped = groupByDay(logs);
  const dayKeys = [...grouped.keys()];

  const handleLog = (type: Parameters<Store['stageCareAction']>[0], note?: string) => {
    const log = store.stageCareAction(type, note, lang);
    setFeedback(log);
  };

  return (
    <div className="flex flex-col min-h-full bg-warm-50">
      {/* Header */}
      <div className="bg-warm-100 border-b border-warm-400 px-5 pt-14 pb-5">
        <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-1">{t('care.header.badge')}</p>
        <h1 className="text-2xl font-bold text-stone-800">{t('care.header.title')}</h1>
        <p className="text-sm text-stone-400 mt-1 font-light">{t('care.header.body')}</p>
      </div>

      {/* Stats Row */}
      <div className="px-5 py-4 bg-warm-200 border-b border-warm-400">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-warm-100 rounded-2xl p-3 text-center border border-warm-400">
            <p className="text-xl font-bold text-stone-800">{logs.length}</p>
            <p className="text-[10px] text-stone-400 uppercase tracking-wide mt-0.5">{t('care.stats.total')}</p>
          </div>
          <div className="bg-warm-100 rounded-2xl p-3 text-center border border-warm-400">
            <p className="text-xl font-bold text-sage-600">{store.todayLove}</p>
            <p className="text-[10px] text-stone-400 uppercase tracking-wide mt-0.5">{t('care.stats.today')}</p>
          </div>
          <div className="bg-warm-100 rounded-2xl p-3 text-center border border-warm-400">
            <p className="text-xl font-bold text-stone-800">{dayKeys.length}</p>
            <p className="text-[10px] text-stone-400 uppercase tracking-wide mt-0.5">{t('care.stats.days')}</p>
          </div>
        </div>
      </div>

      {/* Relationship Signals — full feed in Baobao demo, Devices card otherwise */}
      {pet.id === DEMO_PET_ID ? (
        <div className="pt-4">
          <RelationshipSignals petName={pet.name} onTurnIntoPresence={handleTurnIntoPresence} />
        </div>
      ) : (
        <div className="pt-4">
          <CollarStatus petId={pet.id} petName={pet.name} />
        </div>
      )}

      {presenceFlash && (
        <div className="mx-5 -mt-3 mb-3 px-4 py-3 rounded-2xl text-[12px] font-medium text-center"
          style={{ background: 'rgba(60,40,18,0.92)', color: '#f5e6c7' }}>
          {presenceFlash}
        </div>
      )}

      {/* Log Action Button */}
      <div className="px-5 py-4">
        <button
          onClick={() => setShowSheet(true)}
          className="w-full py-4 rounded-2xl bg-stone-800 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-700 active:scale-95 transition-all shadow-lg shadow-warm-400"
        >
          <span className="text-base">+</span>
          {t('care.log.cta')}
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 px-5 pb-8">
        {logs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🤍</div>
            <p className="text-stone-500 text-sm font-medium mb-1">{t('care.empty.title')}</p>
            <p className="text-stone-400 text-xs font-light">{t('care.empty.body')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dayKeys.map(dayKey => {
              const dayLogs = grouped.get(dayKey)!;
              const dayTotal = dayLogs.reduce((s, l) => s + l.love_value, 0);
              return (
                <div key={dayKey}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
                      {dayLabel(dayLogs[0].created_at)}
                    </p>
                    <span className="text-xs text-sage-600 font-semibold bg-sage-50 px-2.5 py-1 rounded-full">
                      +{dayTotal} {t('care.love.unit')}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {dayLogs.map(log => {
                      const config = ACTION_CONFIGS.find(c => c.type === log.action_type);
                      return (
                        <div key={log.id} className="bg-warm-200 rounded-2xl p-4 border border-warm-400">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border ${config?.color ?? ''}`}>
                              {config?.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-stone-800">{config?.label}</span>
                                  {log.source === 'device' && (
                                    <span className="text-[9px] text-sage-500 font-medium">{t('care.tag.auto')}</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-stone-400">{timeOfDay(log.created_at)}</span>
                              </div>
                              <p className="text-xs text-stone-500 leading-relaxed font-light">{log.emotional_translation}</p>
                              {log.note && (
                                <p className="text-xs text-stone-400 mt-1.5 italic">"{log.note}"</p>
                              )}
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <span className="text-xs font-semibold text-sage-600">+{log.love_value}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSheet && (
        <CareActionSheet
          petName={pet.name}
          onLog={handleLog}
          onClose={() => setShowSheet(false)}
        />
      )}

      {feedback && (
        <LoveFeedback
          log={feedback}
          petName={pet.name}
          onScoreCommit={() => store.commitLoveScore(feedback.love_value)}
          onDismiss={() => setFeedback(null)}
        />
      )}
    </div>
  );
}
