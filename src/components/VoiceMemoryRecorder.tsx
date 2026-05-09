import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface Props {
  petName: string;
  onSave: (input: { title: string; transcript: string; audio_data_url: string; duration_ms: number }) => void;
  onClose: () => void;
}

// MOCKED: In production, the captured blob would be uploaded to Supabase
// Storage and the transcript produced by a speech-to-text model. For the
// demo we stash the base64 data URL locally and use the user-entered title
// as the transcript.
export default function VoiceMemoryRecorder({ petName, onSave, onClose }: Props) {
  const { lang } = useI18n();
  const [state, setState] = useState<'idle' | 'recording' | 'review'>('idle');
  const [dataUrl, setDataUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setDataUrl(reader.result as string);
          setState('review');
        };
        reader.readAsDataURL(blob);
        streamRef.current?.getTracks().forEach(t => t.stop());
      };
      recorderRef.current = rec;

      // Level meter
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        setLevel(Math.min(1, sum / (buf.length * 160)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      rec.start();
      startRef.current = performance.now();
      setState('recording');
      setDuration(0);
      tickRef.current = setInterval(() => {
        setDuration(Math.floor(performance.now() - startRef.current));
      }, 100);
    } catch {
      setError(lang === 'ja' ? 'マイクへのアクセスが拒否されました。' : 'Microphone access was denied.');
    }
  }, [lang]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    rec.stop();
    if (tickRef.current) clearInterval(tickRef.current);
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  const discard = useCallback(() => {
    setDataUrl('');
    setDuration(0);
    setState('idle');
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    const el = audioElRef.current;
    if (!el) return;
    if (el.paused) { el.play().then(() => setPlaying(true)).catch(() => {}); }
    else { el.pause(); setPlaying(false); }
  }, []);

  const save = useCallback(() => {
    if (!dataUrl) return;
    const finalTitle = title.trim() || (lang === 'ja' ? `${petName}へ` : `For ${petName}`);
    onSave({
      title: finalTitle,
      transcript: finalTitle,
      audio_data_url: dataUrl,
      duration_ms: duration,
    });
  }, [dataUrl, title, duration, onSave, petName, lang]);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  const seconds = (duration / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-[55] flex flex-col"
      style={{ background: 'rgba(250,247,240,0.97)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.4s ease' }}>
      <button onClick={onClose}
        className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(80,60,30,0.08)', color: 'rgba(80,60,30,0.65)' }}>
        <X size={18} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-7">
        <p className="text-[11px] uppercase tracking-[0.22em] font-medium mb-3"
          style={{ color: 'rgba(160,120,50,0.65)' }}>
          {lang === 'ja' ? '声のきおく' : 'Voice memory'}
        </p>
        <h2 className="text-[22px] font-light text-center leading-[1.5] mb-10"
          style={{ color: 'rgba(55,40,18,0.88)' }}>
          {lang === 'ja'
            ? `${petName}への言葉を、\n声でのこす。`
            : `Say it to ${petName}.\nKeep it in your voice.`}
        </h2>

        {/* Pulsing level orb */}
        <div className="relative mb-8" style={{ width: 160, height: 160 }}>
          <div className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(253,220,140,0.55) 0%, rgba(200,150,60,0.18) 60%, transparent 90%)',
              transform: `scale(${1 + level * 0.4})`,
              transition: 'transform 120ms ease',
              opacity: state === 'recording' ? 1 : 0.5,
            }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full flex items-center justify-center"
              style={{
                width: 90, height: 90,
                background: state === 'recording'
                  ? 'linear-gradient(135deg, #f5d78e, #c49a4a)'
                  : 'rgba(255,252,240,0.9)',
                border: '1px solid rgba(200,150,60,0.35)',
                boxShadow: state === 'recording'
                  ? `0 8px 30px rgba(253,200,100,${0.25 + level * 0.5})`
                  : '0 4px 16px rgba(0,0,0,0.06)',
              }}>
              <Mic size={28} style={{ color: state === 'recording' ? 'rgba(55,40,18,0.95)' : 'rgba(120,90,40,0.7)' }} />
            </div>
          </div>
        </div>

        <p className="text-[14px] font-light mb-8" style={{ color: 'rgba(80,60,30,0.7)' }}>
          {state === 'recording' ? `${seconds}s` : state === 'review' ? `${seconds}s` : (lang === 'ja' ? '長押しせずタップ' : 'Tap to record')}
        </p>

        {error && (
          <p className="text-[12px] mb-4 text-center" style={{ color: 'rgba(160,60,40,0.8)' }}>{error}</p>
        )}

        {state === 'idle' && (
          <button onClick={start}
            className="px-7 py-3.5 rounded-full transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #f5d78e 0%, #c49a4a 100%)',
              color: 'rgba(55,40,18,0.95)',
              boxShadow: '0 8px 28px rgba(200,150,60,0.28)',
              border: '1px solid rgba(255,240,180,0.6)',
            }}>
            <span className="text-[13px] font-semibold tracking-wide flex items-center gap-2">
              <Mic size={14} /> {lang === 'ja' ? '録音をはじめる' : 'Start recording'}
            </span>
          </button>
        )}

        {state === 'recording' && (
          <button onClick={stop}
            className="px-7 py-3.5 rounded-full transition-all active:scale-[0.97]"
            style={{ background: 'rgba(55,40,18,0.92)', color: 'rgba(253,220,140,0.95)' }}>
            <span className="text-[13px] font-semibold tracking-wide flex items-center gap-2">
              <Square size={12} /> {lang === 'ja' ? '録音をおわる' : 'Stop'}
            </span>
          </button>
        )}

        {state === 'review' && (
          <div className="w-full max-w-sm flex flex-col gap-4">
            <audio ref={audioElRef} src={dataUrl} onEnded={() => setPlaying(false)} className="hidden" />
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={lang === 'ja' ? 'タイトル（任意）' : 'Title (optional)'}
              className="w-full px-4 py-3 rounded-2xl text-[14px] font-light outline-none"
              style={{
                background: 'rgba(255,252,240,0.9)',
                border: '1px solid rgba(120,90,40,0.25)',
                color: 'rgba(55,40,18,0.9)',
              }}
            />
            <p className="text-[10px] text-center px-2"
              style={{ color: 'rgba(120,90,40,0.55)' }}>
              {lang === 'ja'
                ? 'デモ：音声はこの端末内のみに保存されます。本番では Supabase Storage に暗号化保存されます。'
                : 'Demo: audio stays on-device only. In production it is stored encrypted in Supabase Storage.'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={togglePlay}
                className="flex items-center justify-center gap-1.5 py-3 rounded-2xl"
                style={{ background: 'rgba(255,252,240,0.9)', border: '1px solid rgba(120,90,40,0.22)', color: 'rgba(80,60,30,0.85)' }}>
                {playing ? <Pause size={14} /> : <Play size={14} />}
                <span className="text-[12px] font-medium">{lang === 'ja' ? '試聴' : 'Listen'}</span>
              </button>
              <button onClick={discard}
                className="flex items-center justify-center gap-1.5 py-3 rounded-2xl"
                style={{ background: 'rgba(255,252,240,0.9)', border: '1px solid rgba(120,90,40,0.22)', color: 'rgba(140,80,50,0.85)' }}>
                <Trash2 size={14} />
                <span className="text-[12px] font-medium">{lang === 'ja' ? '消す' : 'Delete'}</span>
              </button>
              <button onClick={save}
                className="flex items-center justify-center gap-1.5 py-3 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, #f5d78e, #c49a4a)',
                  color: 'rgba(55,40,18,0.95)',
                  boxShadow: '0 6px 18px rgba(200,150,60,0.25)',
                }}>
                <Check size={14} />
                <span className="text-[12px] font-semibold">{lang === 'ja' ? '保存' : 'Keep'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
