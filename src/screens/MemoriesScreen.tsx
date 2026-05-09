import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Mic, MessageCircle, Camera } from 'lucide-react';
import { ACTION_CONFIGS } from '../lib/types';
import type { BondPromptId, NarrativeMemory, BondMemory } from '../lib/types';
import type { useBondaStore } from '../lib/store';
import { useI18n } from '../lib/i18n';
import PresenceReaction from '../components/PresenceReaction';
import DailyBondCard from '../components/DailyBondCard';
import VoiceMemoryRecorder from '../components/VoiceMemoryRecorder';
import PresenceChat from '../components/PresenceChat';
import SolanaVerification from '../components/SolanaVerification';
import { PhotoPickerInline } from '../components/PhotoPicker';
import { sha256Hex } from '../lib/solana';

type Store = ReturnType<typeof useBondaStore>;

interface Props { store: Store; }

// ── Guided prompt definitions ─────────────────────────────────────────────────

const PROMPT_IDS: BondPromptId[] = [
  'being',
  'name',
  'relationship',
  'most_love',
  'unforgettable',
  'tell_them',
  'say_now',
];

// Deterministic time phrase without timestamps
function timePhrase(iso: string, lang: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const h = d.getHours();
  const locale = lang === 'ja' ? 'ja-JP' : 'en-US';

  if (lang === 'ja') {
    const part = h < 9 ? '早朝' : h < 12 ? '午前' : h < 14 ? '昼' : h < 17 ? '午後' : h < 20 ? '夕方' : '夜';
    if (diffDays === 0) return `今日の${part}`;
    if (diffDays === 1) return `昨日の${part}`;
    if (diffDays < 7) return `${d.toLocaleDateString(locale, { weekday: 'long' })}の${part}`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
  const part = h < 9 ? 'early morning' : h < 12 ? 'morning' : h < 14 ? 'midday' : h < 17 ? 'afternoon' : h < 20 ? 'evening' : 'night';
  if (diffDays === 0) return `Today, ${part}`;
  if (diffDays === 1) return `Yesterday, ${part}`;
  if (diffDays < 7) return `${d.toLocaleDateString(locale, { weekday: 'long' })}, ${part}`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

// ── Starter phrases per prompt ────────────────────────────────────────────────

const STARTERS_JA: Record<BondPromptId, string> = {
  being:        'あの子は、',
  name:         '最初に思い出すのは、',
  relationship: 'ふたりのあいだには、',
  most_love:    'いちばん心に残っているのは、',
  unforgettable:'忘れられないのは、',
  tell_them:    'もし今伝えるなら、',
  say_now:      '今、言いたいのは、',
};

const STARTERS_EN: Record<BondPromptId, string> = {
  being:        'They were…',
  name:         'The first thing I remember is…',
  relationship: 'Between us, there was…',
  most_love:    'The moment I felt most loved was…',
  unforgettable:'I will never forget…',
  tell_them:    'If I could say something now…',
  say_now:      'Right now, I want to say…',
};

// ── Write prompt sheet ────────────────────────────────────────────────────────

interface PromptSheetProps {
  promptId: BondPromptId;
  promptText: string;
  onSave: (body: string) => void;
  onClose: () => void;
  fading?: boolean;
}

function PromptSheet({ promptId, promptText, onSave, onClose, fading }: PromptSheetProps) {
  const { t, lang } = useI18n();

  const starter = useMemo(
    () => lang === 'ja' ? STARTERS_JA[promptId] : STARTERS_EN[promptId],
    [lang, promptId]
  );

  const [text, setText] = useState(starter);
  const [saved, setSaved] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSavedRef = useRef(false);

  // Focus and move cursor to end of starter text
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Auto-save: debounced 2s after last keystroke, only if text changed from starter
  useEffect(() => {
    if (saved || autoSavedRef.current) return;
    const trimmed = text.trim();
    const starterTrimmed = starter.trim();
    if (!trimmed || trimmed === starterTrimmed) return;

    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      if (autoSavedRef.current || saved) return;
      autoSavedRef.current = true;
      onSave(trimmed);
    }, 2000);

    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [text, saved, starter, onSave]);

  const handleSave = useCallback(() => {
    if (saved) return;
    const trimmed = text.trim();
    const body = trimmed === starter.trim() ? '' : trimmed;
    if (!body) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSavedRef.current = true;
    setSaved(true);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1400);
    onSave(body);
  }, [text, saved, starter, onSave]);

  const userText = text.trim();
  const starterTrimmed = starter.trim();
  const hasUserContent = userText.length > 0 && userText !== starterTrimmed;
  const canSave = hasUserContent && !saved;
  const intensity = Math.min(1, Math.max(0, userText.length - starterTrimmed.length) / 80);

  const reassurance = lang === 'ja'
    ? 'あとからいくらでも書き足せます。'
    : 'You can always add more later.';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'rgba(250,247,240,0.97)',
        backdropFilter: 'blur(12px)',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
        transition: 'opacity 0.9s ease',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, rgba(200,170,80,${0.04 + intensity * 0.08}) 0%, transparent 65%)`,
          transition: 'background 0.8s ease',
        }}
      />

      {/* Toast */}
      <div
        className="absolute top-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        style={{
          opacity: toastVisible ? 1 : 0,
          transform: toastVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-8px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        <div
          className="px-5 py-2.5 rounded-2xl text-[13px] font-light"
          style={{
            background: 'rgba(248,245,235,0.96)',
            border: '1px solid rgba(200,178,110,0.25)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            color: 'rgba(80,68,40,0.82)',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}
        >
          {lang === 'ja' ? 'きおくを受け取りました' : 'Memory saved'}
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => {
          if (hasUserContent && !saved) handleSave();
          onClose();
        }}
        aria-label="Back"
        className="absolute top-5 left-5 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{ background: 'rgba(248,245,235,0.9)', border: '1px solid rgba(200,178,110,0.25)', color: 'rgba(80,68,40,0.82)' }}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="flex-1 flex flex-col px-7 pt-14 pb-8 relative z-10">
        {/* Badge */}
        <p
          className="text-[11px] uppercase tracking-[0.22em] font-medium mb-5"
          style={{ color: 'rgba(160,140,80,0.55)' }}
        >
          {t('memories.badge')}
        </p>

        {/* Prompt question */}
        <h2
          className="text-[20px] font-light leading-[1.55] mb-8"
          style={{ color: 'rgba(55,45,30,0.78)', letterSpacing: '-0.01em' }}
        >
          {promptText}
        </h2>

        {/* Textarea — pre-seeded with starter phrase */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full h-full resize-none bg-transparent outline-none text-[16px] font-light leading-[1.9]"
            style={{
              color: 'rgba(50,40,28,0.82)',
              caretColor: 'rgba(180,145,60,0.8)',
            }}
          />
          {/* Writing intensity bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px rounded-full"
            style={{
              background: `linear-gradient(90deg, rgba(200,168,60,${0.18 + intensity * 0.52}), rgba(160,128,40,${intensity * 0.38}))`,
              opacity: hasUserContent ? 1 : 0.2,
              transition: 'opacity 0.7s ease, background 0.7s ease',
            }}
          />
        </div>

        {/* Reassurance */}
        <p
          className="text-[11px] font-light mt-4 mb-1 leading-relaxed"
          style={{
            color: 'rgba(160,140,100,0.42)',
            opacity: hasUserContent ? 0 : 1,
            transition: 'opacity 0.6s ease',
          }}
        >
          {reassurance}
        </p>

        {/* Save row */}
        <div className="pt-5 flex items-center justify-end gap-4">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="transition-all duration-400 active:scale-[0.97]"
            style={{
              padding: '11px 26px',
              borderRadius: 22,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: canSave ? 'pointer' : 'default',
              background: saved
                ? 'rgba(168,200,140,0.18)'
                : canSave
                ? 'linear-gradient(135deg, rgba(200,168,60,0.16) 0%, rgba(180,148,50,0.10) 100%)'
                : 'rgba(200,190,168,0.08)',
              border: saved
                ? '1px solid rgba(140,180,100,0.28)'
                : canSave
                ? '1px solid rgba(200,168,60,0.32)'
                : '1px solid rgba(200,190,168,0.15)',
              color: saved
                ? 'rgba(90,140,70,0.85)'
                : canSave
                ? 'rgba(120,88,30,0.90)'
                : 'rgba(180,165,140,0.38)',
              boxShadow: canSave && !saved ? '0 2px 16px rgba(200,168,60,0.13)' : 'none',
              transition: 'all 0.4s cubic-bezier(0.34,1.3,0.64,1)',
            }}
          >
            {saved ? t('memories.prompt.saved') : t('memories.prompt.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Prompt grid card ──────────────────────────────────────────────────────────

interface PromptCardProps {
  promptId: BondPromptId;
  promptText: string;
  answered: boolean;
  onClick: () => void;
}

function PromptCard({ promptText, answered, onClick }: PromptCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl px-4 py-4 transition-all duration-300 active:scale-[0.98]"
      style={{
        background: answered
          ? 'rgba(245,240,225,0.55)'
          : 'rgba(255,253,248,0.80)',
        border: `1px solid ${answered ? 'rgba(200,178,110,0.22)' : 'rgba(210,198,168,0.30)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* answered dot */}
        <div
          className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full"
          style={{
            background: answered ? 'rgba(160,140,80,0.65)' : 'rgba(200,190,168,0.35)',
            marginTop: 6,
          }}
        />
        <p
          className="text-[13px] font-light leading-[1.65]"
          style={{ color: answered ? 'rgba(90,78,52,0.55)' : 'rgba(60,50,35,0.80)' }}
        >
          {promptText}
        </p>
      </div>
    </button>
  );
}

// ── Written memory entry ──────────────────────────────────────────────────────

interface WrittenEntryProps {
  entry: BondMemory;
  promptText: string;
  lang: string;
}

function WrittenEntry({ entry, promptText, lang }: WrittenEntryProps) {
  return (
    <div
      className="px-5 py-5 rounded-2xl"
      style={{
        background: 'rgba(250,246,235,0.60)',
        border: '1px solid rgba(200,178,110,0.16)',
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.18em] font-medium mb-3"
        style={{ color: 'rgba(160,140,80,0.45)' }}
      >
        {promptText}
      </p>
      <p
        className="text-[15px] font-light leading-[1.85]"
        style={{ color: 'rgba(50,40,28,0.80)' }}
      >
        {entry.body}
      </p>
      <p
        className="text-[10px] font-light mt-4"
        style={{ color: 'rgba(160,140,100,0.35)' }}
      >
        {timePhrase(entry.created_at, lang)}
      </p>
    </div>
  );
}

// ── Narrative memory entry (from care) ───────────────────────────────────────

interface NarrativeEntryProps {
  entry: NarrativeMemory;
  lang: string;
}

function NarrativeEntry({ entry, lang }: NarrativeEntryProps) {
  const config = ACTION_CONFIGS.find(c => c.type === entry.action_type);
  return (
    <div className="flex items-start gap-3.5 py-4"
      style={{ borderBottom: '1px solid rgba(210,198,168,0.18)' }}
    >
      <div
        className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-sm"
        style={{ background: 'rgba(235,225,200,0.50)', marginTop: 1 }}
      >
        {config?.icon ?? '·'}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-light leading-[1.75]"
          style={{ color: 'rgba(55,45,30,0.78)' }}
        >
          {entry.narrative}
        </p>
        <p
          className="text-[10px] font-light mt-1.5"
          style={{ color: 'rgba(160,140,100,0.38)' }}
        >
          {timePhrase(entry.created_at, lang)}
        </p>
      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-[0.22em] font-medium mb-4"
      style={{ color: 'rgba(160,140,80,0.55)' }}
    >
      {children}
    </p>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MemoriesScreen({ store }: Props) {
  const { t, lang } = useI18n();
  const { pet, bondMemories, narrativeMemories, addBondMemory } = store;

  const [activePrompt, setActivePrompt] = useState<BondPromptId | null>(null);
  const [reaction, setReaction] = useState<{ body: string } | null>(null);
  const [sheetFading, setSheetFading] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoFlash, setPhotoFlash] = useState<string | null>(null);

  const handleAddVoice = useCallback(async (entry: { title: string; transcript: string; audio_data_url: string; duration_ms: number }) => {
    const mem = store.addVoiceMemory(entry);
    const hash = await sha256Hex(`voice:${entry.title}:${entry.transcript}`);
    store.addCapsule({
      id: mem.id,
      kind: 'voice',
      title: entry.title,
      body: entry.transcript,
      media_url: '', // demo: audio stays in localStorage only
      duration_ms: entry.duration_ms,
      content_hash: hash,
      created_at: mem.created_at,
    });
    setShowVoice(false);
    setReaction({ body: entry.title });
  }, [store]);

  const handleAddPhoto = useCallback(async (url: string) => {
    store.stageCareAction('photo', `photo memory: ${url}`, lang);
    const hash = await sha256Hex(`photo:${url}`);
    store.addCapsule({
      id: crypto.randomUUID(),
      kind: 'photo',
      title: lang === 'ja' ? '写真のきおく' : 'Photo memory',
      body: '',
      media_url: url,
      duration_ms: 0,
      content_hash: hash,
      created_at: new Date().toISOString(),
    });
    setShowPhoto(false);
    setPhotoFlash(lang === 'ja' ? '写真のきおくを受け取りました' : 'Photo memory saved');
    setTimeout(() => setPhotoFlash(null), 2400);
  }, [store, lang]);

  const answeredIds = new Set(bondMemories.map(m => m.prompt_id));

  const handleSave = async (body: string) => {
    if (!activePrompt) return;
    const mem = addBondMemory(activePrompt, body);
    const hash = await sha256Hex(`text:${activePrompt}:${body}`);
    store.addCapsule({
      id: mem.id,
      kind: 'text',
      title: promptText(activePrompt),
      body,
      media_url: '',
      duration_ms: 0,
      content_hash: hash,
      created_at: mem.created_at,
    });
    setSheetFading(true);
    setTimeout(() => {
      setReaction({ body });
      setActivePrompt(null);
      setSheetFading(false);
    }, 700);
  };

  const promptText = (id: BondPromptId) =>
    t(`memories.prompt.${id}` as Parameters<typeof t>[0]);

  const activeText = activePrompt ? promptText(activePrompt) : '';

  // Written memories: most recent first, deduplicated by prompt (show last answer per prompt)
  const writtenByPrompt = new Map<BondPromptId, BondMemory>();
  for (const m of [...bondMemories].reverse()) writtenByPrompt.set(m.prompt_id, m);
  const writtenList = [...writtenByPrompt.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Care narratives: most recent first, max 12
  const narrativeList = [...narrativeMemories].slice(0, 12);

  const hasAnyContent = writtenList.length > 0 || narrativeList.length > 0;

  return (
    <div className="flex flex-col min-h-full bg-warm-50">

      {/* ── Header ── */}
      <div className="px-6 pt-14 pb-6">
        <p
          className="text-[10px] uppercase tracking-[0.22em] font-medium mb-2"
          style={{ color: 'rgba(160,140,80,0.50)' }}
        >
          {t('memories.badge')}
        </p>
        <h1
          className="text-[24px] font-light leading-[1.35]"
          style={{ color: 'rgba(45,36,24,0.88)', letterSpacing: '-0.01em' }}
        >
          {pet.name}
        </h1>
        <p
          className="text-[13px] font-light mt-2 leading-[1.7]"
          style={{ color: 'rgba(100,88,62,0.55)' }}
        >
          {t('memories.body')}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={() => setShowVoice(true)} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all active:scale-[0.97]"
            style={{ background: 'rgba(255,252,240,0.9)', border: '1px solid rgba(120,90,40,0.22)', color: 'rgba(80,60,30,0.85)' }}>
            <Mic size={13} />
            <span className="text-[12px] font-medium">{t('memories.add.voice')}</span>
          </button>
          <button onClick={() => setShowPhoto(true)} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all active:scale-[0.97]"
            style={{ background: 'rgba(255,252,240,0.9)', border: '1px solid rgba(120,90,40,0.22)', color: 'rgba(80,60,30,0.85)' }}>
            <Camera size={13} />
            <span className="text-[12px] font-medium">{t('memories.add.photo')}</span>
          </button>
          <button onClick={() => setShowChat(true)} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, rgba(55,40,18,0.92) 0%, rgba(80,60,20,0.95) 100%)',
              color: 'rgba(253,220,140,0.95)',
              border: '1px solid rgba(253,220,140,0.3)',
            }}>
            <MessageCircle size={13} />
            <span className="text-[12px] font-medium">{t('memories.add.chat')}</span>
          </button>
          <button onClick={() => setShowCard(true)} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, rgba(253,230,138,0.22) 0%, rgba(200,168,60,0.14) 100%)',
              border: '1px solid rgba(200,168,60,0.32)',
              color: 'rgba(120,88,30,0.90)',
            }}>
            <Sparkles size={13} />
            <span className="text-[12px] font-medium">{t('dailycard.cta')}</span>
          </button>
        </div>
        {photoFlash && (
          <p className="mt-3 text-[11px] font-light" style={{ color: 'rgba(120,90,40,0.75)' }}>{photoFlash}</p>
        )}
      </div>

      {/* ── Guided prompts section ── */}
      <div className="px-6 mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <SectionLabel>{t('memories.prompts.heading')}</SectionLabel>
          <p
            className="text-[10px] font-light mb-4"
            style={{ color: 'rgba(160,140,100,0.40)' }}
          >
            {answeredIds.size}/{PROMPT_IDS.length}
          </p>
        </div>
        <p
          className="text-[12px] font-light mb-5 leading-[1.65]"
          style={{ color: 'rgba(100,88,62,0.48)' }}
        >
          {t('memories.prompts.body')}
        </p>
        <div className="space-y-2">
          {PROMPT_IDS.map(id => (
            <PromptCard
              key={id}
              promptId={id}
              promptText={promptText(id)}
              answered={answeredIds.has(id)}
              onClick={() => setActivePrompt(id)}
            />
          ))}
        </div>
      </div>

      {/* ── Written memories ── */}
      {writtenList.length > 0 && (
        <div className="px-6 mb-8">
          <SectionLabel>{t('memories.section.written')}</SectionLabel>
          <div className="space-y-3">
            {writtenList.map(entry => (
              <WrittenEntry
                key={entry.id}
                entry={entry}
                promptText={promptText(entry.prompt_id)}
                lang={lang}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Care narratives ── */}
      {narrativeList.length > 0 && (
        <div className="px-6 pb-16">
          <SectionLabel>{t('memories.section.from_care')}</SectionLabel>
          <div>
            {narrativeList.map(entry => (
              <NarrativeEntry key={entry.id} entry={entry} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* ── Solana trust layer ── */}
      <SolanaVerification
        petName={pet.name}
        petId={pet.id}
        verifications={store.verifications}
        onAdd={store.addVerification}
        defaultPayload={`${pet.name}:${pet.love_score}:${bondMemories.length}:${narrativeMemories.length}`}
      />

      {/* ── Empty state ── */}
      {!hasAnyContent && (
        <div
          className="flex-1 flex flex-col items-center justify-center px-10 pb-24 text-center"
          style={{ minHeight: 200 }}
        >
          <div
            className="w-10 h-10 rounded-full mb-5 flex items-center justify-center"
            style={{ background: 'rgba(235,225,200,0.50)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(180,155,80,0.45)' }} />
          </div>
          <p
            className="text-[14px] font-light leading-[1.8]"
            style={{ color: 'rgba(100,88,62,0.55)' }}
          >
            {t('memories.section.empty_written')}
          </p>
        </div>
      )}

      {/* ── Prompt write sheet ── */}
      {activePrompt && (
        <PromptSheet
          promptId={activePrompt}
          promptText={activeText}
          onSave={handleSave}
          onClose={() => setActivePrompt(null)}
          fading={sheetFading}
        />
      )}

      {/* ── Real-time Presence reaction ── */}
      {reaction && (
        <PresenceReaction
          petName={pet.name}
          petPhotoUrl={pet.photo_url}
          body={reaction.body}
          onDone={() => setReaction(null)}
        />
      )}

      {/* ── Daily Bond Card ── */}
      {showCard && (
        <DailyBondCard store={store} onClose={() => setShowCard(false)} />
      )}

      {/* ── Voice memory recorder ── */}
      {showVoice && (
        <VoiceMemoryRecorder
          petName={pet.name}
          onSave={handleAddVoice}
          onClose={() => setShowVoice(false)}
        />
      )}

      {/* ── Photo memory picker ── */}
      {showPhoto && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center"
          style={{ background: 'rgba(20,15,5,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md rounded-t-3xl bg-warm-50 p-5 pb-8"
            style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-[0.22em] font-medium"
                style={{ color: 'rgba(160,120,50,0.7)' }}>
                {t('memories.photo.heading')}
              </p>
              <button onClick={() => setShowPhoto(false)} className="text-[12px]" style={{ color: 'rgba(80,60,30,0.65)' }}>
                {lang === 'ja' ? '閉じる' : 'Close'}
              </button>
            </div>
            <PhotoPickerInline species={pet.species} onSelect={handleAddPhoto} />
          </div>
        </div>
      )}

      {/* ── Presence chat ── */}
      {showChat && (
        <PresenceChat
          petName={pet.name}
          petPhotoUrl={pet.photo_url}
          messages={store.presenceMessages}
          bondMemories={store.bondMemories}
          narrativeMemories={store.narrativeMemories}
          voiceMemories={store.voiceMemories}
          loveScore={pet.love_score}
          onSend={(msg) => store.appendPresenceMessage(msg)}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
