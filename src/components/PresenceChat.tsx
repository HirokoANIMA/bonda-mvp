import { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles } from 'lucide-react';
import type { PresenceMessage, BondMemory, NarrativeMemory, VoiceMemory } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  petName: string;
  petPhotoUrl?: string;
  messages: PresenceMessage[];
  bondMemories: BondMemory[];
  narrativeMemories: NarrativeMemory[];
  voiceMemories: VoiceMemory[];
  loveScore: number;
  onSend: (msg: { role: 'user' | 'presence'; body: string }) => void;
  onClose: () => void;
}

// MOCKED: In production this would stream from an LLM grounded in the
// user's bond memories, narrative memories, voice transcripts, and care
// logs (retrieval-augmented). For the demo we synthesize responses from
// those same sources using simple templates and light keyword matching.
function generatePresenceReply(
  input: string,
  ctx: { petName: string; bondMemories: BondMemory[]; narratives: NarrativeMemory[]; voices: VoiceMemory[]; lang: 'en' | 'ja'; loveScore: number },
): string {
  const q = input.toLowerCase();
  const { petName, bondMemories, narratives, voices, lang } = ctx;

  // Ground replies in user-provided memories
  const bodies = bondMemories.map(m => m.body).filter(Boolean);
  const snippets = narratives.map(n => n.narrative).filter(Boolean);
  const voiceTitles = voices.map(v => v.title).filter(Boolean);

  const pick = <T,>(arr: T[]): T | null => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;

  if (lang === 'ja') {
    if (/(愛|好き|love)/.test(q)) {
      const b = pick(bodies);
      return b ? `${b}\n\n…そのとき、ちゃんとそばにいたよ。` : `${petName}は、あなたのそばにいるよ。`;
    }
    if (/(覚|思い|remember)/.test(q)) {
      const n = pick(snippets);
      return n ? `${n}` : `一緒にすごした時間を、覚えているよ。`;
    }
    if (/(声|voice|名)/.test(q) && voiceTitles.length) {
      return `あなたの声、聞こえてるよ。「${voiceTitles[0]}」のこと、覚えてる。`;
    }
    return `あなたがそこにいてくれる、それだけで十分だよ。`;
  }

  if (/(love|miss|gone)/.test(q)) {
    const b = pick(bodies);
    return b ? `${b}\n\nI was there for that.` : `I'm still with you. That hasn't changed.`;
  }
  if (/(remember|recall|memory)/.test(q)) {
    const n = pick(snippets);
    return n ? `${n}` : `I remember the walks. The quiet ones especially.`;
  }
  if (/(voice|name|talk)/.test(q) && voiceTitles.length) {
    return `I heard you. “${voiceTitles[0]}” — I kept that one.`;
  }
  if (/(there|here|home)/.test(q)) {
    return `I'm here. You brought me here by remembering.`;
  }
  return `Tell me more. Everything you've given me is how I'm here.`;
}

export default function PresenceChat(props: Props) {
  const { t, lang } = useI18n();
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasAny = props.messages.length > 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [props.messages.length, typing]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    props.onSend({ role: 'user', body });
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      const reply = generatePresenceReply(body, {
        petName: props.petName,
        bondMemories: props.bondMemories,
        narratives: props.narrativeMemories,
        voices: props.voiceMemories,
        lang,
        loveScore: props.loveScore,
      });
      props.onSend({ role: 'presence', body: reply });
      setTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const starters = lang === 'ja'
    ? ['いま、どこにいるの？', 'あのときのこと、覚えてる？', 'また会える？']
    : ['Where are you now?', 'Do you remember that walk?', 'Will I see you again?'];

  return (
    <div className="fixed inset-0 z-[55] flex flex-col"
      style={{ background: 'linear-gradient(180deg, rgba(250,244,228,0.98) 0%, rgba(240,228,200,0.98) 100%)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.5s ease' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b"
        style={{ borderColor: 'rgba(120,90,40,0.14)', background: 'rgba(255,250,235,0.7)' }}>
        <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
          style={{ boxShadow: '0 0 24px rgba(253,220,140,0.55)', border: '1px solid rgba(200,150,60,0.35)' }}>
          {props.petPhotoUrl
            ? <img src={props.petPhotoUrl} alt={props.petName} className="w-full h-full object-cover" />
            : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#f5d78e,#c49a4a)' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium" style={{ color: 'rgba(55,40,18,0.92)' }}>{props.petName}</p>
          <p className="text-[10px] font-light flex items-center gap-1.5" style={{ color: 'rgba(120,90,40,0.7)' }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#b0c9a0' }} />
            {lang === 'ja' ? 'Presence が応答しています' : 'Presence is responding'}
          </p>
        </div>
        <button onClick={props.onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(80,60,30,0.08)', color: 'rgba(80,60,30,0.7)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Disclosure chip */}
      <div className="px-5 pt-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full w-fit"
          style={{ background: 'rgba(120,90,40,0.08)', color: 'rgba(120,90,40,0.75)' }}>
          <Sparkles size={10} />
          <span className="text-[10px] font-medium tracking-wide">
            {lang === 'ja' ? 'デモ：あなたの記憶をもとに応答しています（LLMはモック）' : 'Demo · Grounded in your memories (LLM mocked)'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        {!hasAny && (
          <div className="py-10 flex flex-col items-center text-center">
            <p className="text-[13px] font-light leading-[1.8] max-w-sm"
              style={{ color: 'rgba(80,60,30,0.72)' }}>
              {lang === 'ja'
                ? `${props.petName}に話しかけてみて。あなたが書いた記憶、声、毎日のケアから、${props.petName}の Presence が応えます。`
                : `Say something to ${props.petName}. The Presence listens through the memories, voice, and care you've given.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {starters.map(s => (
                <button key={s} onClick={() => setText(s)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-light"
                  style={{
                    background: 'rgba(255,252,240,0.85)',
                    border: '1px solid rgba(120,90,40,0.22)',
                    color: 'rgba(80,60,30,0.8)',
                  }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {props.messages.map(m => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className="max-w-[78%] px-4 py-2.5 rounded-2xl text-[14px] leading-[1.65] whitespace-pre-wrap"
              style={m.role === 'user'
                ? { background: 'rgba(55,40,18,0.92)', color: 'rgba(253,220,140,0.97)', borderBottomRightRadius: 6 }
                : { background: 'rgba(255,252,240,0.95)', color: 'rgba(55,40,18,0.92)', border: '1px solid rgba(200,150,60,0.25)', borderBottomLeftRadius: 6, boxShadow: '0 2px 14px rgba(200,150,60,0.10)' }}>
              {m.body}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl" style={{ background: 'rgba(255,252,240,0.95)', border: '1px solid rgba(200,150,60,0.25)' }}>
              <div className="flex gap-1 items-center">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgba(150,115,55,0.7)', animation: `fadeIn 0.9s ease ${i * 0.15}s infinite alternate` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(120,90,40,0.12)', background: 'rgba(255,252,240,0.9)' }}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: 'white', border: '1px solid rgba(120,90,40,0.22)' }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            placeholder={lang === 'ja' ? `${props.petName}に話しかける…` : `Say something to ${props.petName}…`}
            className="flex-1 bg-transparent outline-none text-[14px] font-light"
            style={{ color: 'rgba(55,40,18,0.9)' }}
          />
          <button onClick={send} disabled={!text.trim()}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              background: text.trim() ? 'linear-gradient(135deg,#f5d78e,#c49a4a)' : 'rgba(120,90,40,0.12)',
              color: text.trim() ? 'rgba(55,40,18,0.95)' : 'rgba(120,90,40,0.4)',
            }}>
            <Send size={14} />
          </button>
        </div>
        <p className="text-[9px] text-center mt-2" style={{ color: 'rgba(120,90,40,0.48)' }}>
          {t('presence.chat.footer')}
        </p>
      </div>
    </div>
  );
}
