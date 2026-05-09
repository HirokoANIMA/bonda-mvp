import { useState } from 'react';
import { ChevronRight, Heart, ArrowRight } from 'lucide-react';
import type { CareLog } from '../lib/types';
import { ACTION_CONFIGS } from '../lib/types';
import CareActionSheet from '../components/CareActionSheet';
import LoveFeedback from '../components/LoveFeedback';
import LoveOrb from '../components/LoveOrb';
import BondaCoin from '../components/BondaCoin';
import EmotionalHero from '../components/EmotionalHero';
import RelationshipSignals from '../components/RelationshipSignals';
import TrustEntry from '../components/TrustEntry';
import type { useBondaStore } from '../lib/store';
import { useI18n } from '../lib/i18n';

type Store = ReturnType<typeof useBondaStore>;

interface Props {
  store: Store;
  onOpenTrustLayer?: () => void;
  onViewBaobaoDemo?: () => void;
}

function HomeScreen({ store, onOpenTrustLayer, onViewBaobaoDemo }: Props) {
  const { t, lang } = useI18n();
  const [showSheet, setShowSheet] = useState(false);
  const [feedback, setFeedback] = useState<CareLog | null>(null);
  const { pet, logs, todayLove, presenceProgress, presenceStage } = store;

  function timeLabel(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('day.justNow');
    if (diffMin < 60) return t('day.mAgo', { n: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return t('day.hAgo', { n: diffH });
    return d.toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' });
  }

  function dailySummary(petName: string, count: number, todayTypes: string[]): string {
    if (count === 0) return t('home.summary.zero', { name: petName });
    const unique = [...new Set(todayTypes)];
    const topType = unique[0];
    const typePhraseEN: Record<string, string> = {
      walk: 'walks taken together', feed: 'meals prepared with care',
      touch: 'moments of closeness', talk: 'conversations shared',
      groom: 'acts of gentle care', play: 'moments of shared joy',
      sleep: 'moments of quiet rest', photo: 'photos taken', memory: 'memories captured',
    };
    const typePhraseJA: Record<string, string> = {
      walk: 'お散歩', feed: '食事の準備', touch: 'スキンシップ',
      talk: '会話', groom: 'グルーミング', play: '遊び',
      sleep: '安らぎのひととき', photo: '写真撮影', memory: '思い出の記録',
    };
    const phraseMap = lang === 'ja' ? typePhraseJA : typePhraseEN;
    const phrase = phraseMap[topType] ?? (lang === 'ja' ? 'ケアの瞬間' : 'moments of care');
    if (count === 1) return t('home.summary.one', { name: petName });
    if (count <= 3) return t('home.summary.few', { count, phrase, name: petName });
    if (count <= 6) return t('home.summary.many', { count, phrase, name: petName });
    return t('home.summary.all', { count, name: petName });
  }

  const recentLogs = logs.slice(0, 5);
  const stageIndex = { care: 0, relationship: 1, presence: 2 };
  const stageLabels = {
    care:         t('home.presence.stage.care'),
    relationship: t('home.presence.stage.relationship'),
    presence:     t('home.presence.stage.presence'),
  };
  const todayLogs = logs.filter(l =>
    new Date(l.created_at).toDateString() === new Date().toDateString()
  );
  const todayCount = todayLogs.length;
  const todayTypes = todayLogs.map(l => l.action_type);

  const handleLog = (type: Parameters<Store['stageCareAction']>[0], note?: string) => {
    const log = store.stageCareAction(type, note);
    setFeedback(log);
  };

  return (
    <div className="flex flex-col min-h-full bg-warm-50">

      {/* ── Logo ── */}
      <div className="px-6 pt-10 pb-2">
        <img
          src="/Ver16_Pitch_BONDA.png"
          alt="BONDA"
          className="h-8 w-auto object-contain"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      {/* ── View Baobao demo CTA (only shown when viewing a non-Baobao profile) ── */}
      {pet.id !== 'demo-pet-baobao' && onViewBaobaoDemo && (
        <div className="mx-5 mt-3 mb-1">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: 'linear-gradient(135deg, rgba(255,247,225,0.95), rgba(240,218,170,0.85))',
              border: '1px solid rgba(180,140,70,0.28)',
            }}>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'rgba(120,82,34,0.78)' }}>
                Want to see the full demo?
              </p>
              <p className="text-[12px] font-light mt-0.5 leading-snug" style={{ color: 'rgba(90,62,22,0.82)' }}>
                Return to Baobao anytime to explore Presence, Memories, and Trust.
              </p>
            </div>
            <button
              onClick={onViewBaobaoDemo}
              className="flex-shrink-0 px-3.5 py-2 rounded-full text-[11.5px] font-semibold tracking-wide transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #3c2a16, #5a3d1e)', color: '#f5e6c7' }}>
              View Baobao demo
            </button>
          </div>
        </div>
      )}

      {/* ── Emotional hero ── */}
      <EmotionalHero photoUrl={pet.photo_url} petName={pet.name} />

      {/* ── Pet identity bar ── */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2">
        <div className="relative flex-shrink-0">
          <img
            src={pet.photo_url}
            alt={pet.name}
            className="w-11 h-11 rounded-2xl object-cover shadow-md"
            style={{ objectPosition: 'center' }}
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sage-400 rounded-full border-2 border-warm-50" />
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">{t('home.loveFor')}</p>
          <h1 className="text-base font-bold text-stone-800 leading-tight">{pet.name}</h1>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-warm-200 rounded-full px-3 py-1.5 border border-warm-400">
          <span className="text-[10px] text-stone-400 font-light">{t('home.loveFor')} {pet.name}</span>
        </div>
      </div>

      {/* ── Orb hero ── */}
      <div className="flex flex-col items-center px-5 pt-2 pb-4 bg-gradient-to-b from-warm-50 via-amber-50/20 to-warm-50">
        <LoveOrb
          loveScore={pet.love_score}
          todayLove={todayLove}
          petName={pet.name}
          presenceStage={presenceStage}
        />
      </div>

      {/* ── Presence progress strip ── */}
      <div className="mx-5 mb-5 bg-warm-200 rounded-2xl border border-warm-400 px-4 py-3.5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">{t('home.presence.label')}</p>
          <span className="text-[10px] font-bold text-stone-500">{presenceProgress}%</span>
        </div>
        <div className="h-1.5 bg-warm-400 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(3, presenceProgress)}%`,
              background: 'linear-gradient(90deg, #fcd34d, #6ee7b7)',
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          {(['care', 'relationship', 'presence'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`flex-1 text-center py-1 px-1 rounded-lg text-[10px] font-semibold capitalize transition-all duration-500 ${
                stageIndex[presenceStage] >= i
                  ? 'bg-stone-800 text-white'
                  : 'bg-warm-300 text-stone-400'
              }`}>
                {stageLabels[s]}
              </div>
              {i < 2 && <ChevronRight size={9} className="text-stone-300 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── BONDA Coin ── */}
      <BondaCoin store={store} />

      {/* ── Quick Care ── */}
      <div className="px-5 mb-4">
        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium mb-3">{t('home.quickCare')}</p>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {ACTION_CONFIGS.slice(0, 4).map(config => (
            <button
              key={config.type}
              onClick={() => {
                const log = store.stageCareAction(config.type);
                setFeedback(log);
              }}
              className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all active:scale-90 ${config.color}`}
            >
              <span className="text-xl">{config.icon}</span>
              <span className="text-[10px] font-semibold">{config.label}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ACTION_CONFIGS.slice(4).map(config => (
            <button
              key={config.type}
              onClick={() => {
                const log = store.stageCareAction(config.type);
                setFeedback(log);
              }}
              className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all active:scale-90 ${config.color}`}
            >
              <span className="text-xl">{config.icon}</span>
              <span className="text-[10px] font-semibold">{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Daily Summary ── */}
      <div className="mx-5 mb-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/60 via-warm-200 to-warm-100 rounded-2xl p-5 border border-warm-400">
          <div
            className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #fde68a 0%, transparent 70%)' }}
          />
          <p className="text-[10px] text-amber-500 uppercase tracking-[0.18em] font-medium mb-2.5">{t('home.today')}</p>
          <p className="text-stone-700 text-[15px] leading-[1.7] font-light relative z-10">
            {dailySummary(pet.name, todayCount, todayTypes)}
          </p>
          {todayCount > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-warm-400">
              <span className="text-[11px] text-stone-400 font-light">{todayCount}{t(todayCount === 1 ? 'home.moments_one' : 'home.moments_other')}</span>
              {todayLove > 0 && (
                <>
                  <span className="text-warm-500 text-[10px]">·</span>
                  <span className="text-[11px] text-sage-500 font-medium">{t('home.loveToday', { n: todayLove })}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Relationship Signals (Baobao demo only) ── */}
      {pet.id === 'demo-pet-baobao' && (
        <>
          <RelationshipSignals petName={pet.name} compact />

          {/* Post-demo invitation — "Start yours" */}
          <div className="mx-5 mb-6">
            <div className="relative overflow-hidden rounded-3xl p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(255,244,215,0.95) 0%, rgba(236,200,120,0.78) 100%)',
                border: '1px solid rgba(180,140,70,0.35)',
                boxShadow: '0 12px 36px rgba(180,140,70,0.18)',
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
                  <p className="text-[12px] font-light mt-1.5 leading-relaxed"
                    style={{ color: 'rgba(80,55,22,0.78)' }}>
                    Bring their photo, your voice, and small daily moments — BONDA turns them into Presence.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && !window.confirm('Start building your own BONDA? The Baobao demo will be cleared so you can begin fresh.')) return;
                  store.resetDemo();
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #3c2a16, #5a3d1e)',
                  color: '#f5e6c7',
                  boxShadow: '0 8px 20px rgba(60,42,18,0.28)',
                }}>
                <span className="text-[13px] font-semibold tracking-wide">Start yours</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Recent Feed ── */}
      {recentLogs.length > 0 && (
        <div className="px-5 pb-8">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium mb-3">{t('home.recent')}</p>
          <div className="space-y-2">
            {recentLogs.map(log => {
              const config = ACTION_CONFIGS.find(c => c.type === log.action_type);
              return (
                <div key={log.id} className="bg-warm-200 rounded-2xl px-4 py-3 border border-warm-400">
                  <div className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border ${config?.color ?? ''}`}>
                      {config?.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-stone-700">{config?.label}</span>
                        <span className="text-[10px] text-stone-400">{timeLabel(log.created_at)}</span>

                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed font-light">{log.emotional_translation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {onOpenTrustLayer && (
        <TrustEntry label="Relationship-verified Presence" onOpen={onOpenTrustLayer} />
      )}

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

export default HomeScreen;
