import { useEffect, useMemo, useRef, useState } from 'react';
import { Share2, X, Download, Copy, ExternalLink, Shield, ArrowLeft } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { useBondaStore } from '../lib/store';
import { shortSig } from '../lib/solana';

interface ProofData {
  status: 'live' | 'pending';
  shortId: string;
  shortHash: string;
  explorerUrl: string;
  fullSig: string;
}

type Store = ReturnType<typeof useBondaStore>;

interface Props {
  store: Store;
  onClose: () => void;
}

// Deterministic day number since pet creation
function daysSince(createdAt: string): number {
  const start = new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now.setHours(0,0,0,0) - new Date(start).setHours(0,0,0,0)) / 86400000);
  return Math.max(1, diff + 1);
}

function formatDate(lang: string) {
  const now = new Date();
  return now.toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// Visual tier: early / mid / advanced based on love_score
function tierFor(score: number): 'early' | 'mid' | 'advanced' {
  if (score < 150) return 'early';
  if (score < 450) return 'mid';
  return 'advanced';
}

// Pick a short day-text from care + memories + logs
function pickDayText(store: Store, lang: 'en' | 'ja'): string {
  const mem = store.bondMemories[0];
  if (mem) return mem.body;
  const narr = store.narrativeMemories[0];
  if (narr) return narr.narrative;
  const log = store.logs[0];
  if (log?.emotional_translation) return log.emotional_translation;
  return lang === 'ja'
    ? '今日も、そばにいた。'
    : 'Today, we were together.';
}

export default function DailyBondCard({ store, onClose }: Props) {
  const { t, lang } = useI18n();
  const { pet } = store;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [shareState, setShareState] = useState<'idle' | 'working' | 'done'>('idle');

  const day = useMemo(() => daysSince(pet.created_at), [pet.created_at]);
  const dateStr = useMemo(() => formatDate(lang), [lang]);
  const tier = tierFor(pet.love_score);
  const dayText = useMemo(() => pickDayText(store, lang), [store, lang]);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [proofCopied, setProofCopied] = useState(false);

  const proof = useMemo<ProofData | null>(() => {
    const live = store.verifications.find(v => v.network === 'devnet' && v.status === 'confirmed' && !!v.tx_signature);
    if (live) {
      return {
        status: 'live',
        shortId: shortSig(live.tx_signature),
        shortHash: live.content_hash.slice(0, 10) + '\u2026',
        explorerUrl: live.explorer_url,
        fullSig: live.tx_signature,
      };
    }
    return null;
  }, [store.verifications]);

  const todayCount = useMemo(() => {
    const d = new Date().toDateString();
    return store.logs.filter(l => new Date(l.created_at).toDateString() === d).length;
  }, [store.logs]);

  const caption = useMemo(() => {
    const base = `Today, ${pet.name}'s Presence grew from ${todayCount || store.logs.length} moments of care. BONDA turns love into Presence. #BONDA #RelationshipToPresence`;
    return proof ? `${base}\nProof ID: ${proof.shortId}` : base;
  }, [pet.name, todayCount, store.logs.length, proof]);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bonda.app';

  // Render generated visual
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 560, H = 560;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Seed from pet id for stable visual
    let seed = 0;
    for (let i = 0; i < pet.id.length; i++) seed = (seed * 31 + pet.id.charCodeAt(i)) >>> 0;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 8) / 0xffffff; };

    const particles = Array.from({ length: tier === 'early' ? 70 : tier === 'mid' ? 130 : 200 }, () => ({
      a: rand() * Math.PI * 2,
      r: 30 + rand() * (tier === 'early' ? 160 : 220),
      s: 0.2 + rand() * 1.2,
      sz: 0.6 + rand() * (tier === 'advanced' ? 2.6 : 2.0),
      hue: rand(),
    }));

    let t0 = performance.now();
    const draw = (now: number) => {
      const elapsed = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.7);
      if (tier === 'early') {
        bg.addColorStop(0, 'rgba(252,246,232,1)');
        bg.addColorStop(1, 'rgba(238,230,210,1)');
      } else if (tier === 'mid') {
        bg.addColorStop(0, 'rgba(253,240,210,1)');
        bg.addColorStop(1, 'rgba(228,214,182,1)');
      } else {
        bg.addColorStop(0, 'rgba(252,232,190,1)');
        bg.addColorStop(1, 'rgba(196,172,128,1)');
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Advanced: soft photo integration
      if (tier === 'advanced' && pet.photo_url && photoImg.current?.complete) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.filter = 'blur(14px) saturate(0.7)';
        const img = photoImg.current;
        const scale = Math.max(W / img.width, H / img.height) * 1.1;
        const iw = img.width * scale;
        const ih = img.height * scale;
        ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
        ctx.restore();
      } else if (tier === 'mid' && pet.photo_url && photoImg.current?.complete) {
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.filter = 'blur(24px) saturate(0.6)';
        const img = photoImg.current;
        const scale = Math.max(W / img.width, H / img.height);
        const iw = img.width * scale;
        const ih = img.height * scale;
        ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
        ctx.restore();
      }

      // Central glow
      const cx = W / 2, cy = H / 2;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
      glow.addColorStop(0, tier === 'advanced' ? 'rgba(253,220,140,0.55)' : 'rgba(253,230,138,0.35)');
      glow.addColorStop(0.5, 'rgba(220,188,120,0.15)');
      glow.addColorStop(1, 'rgba(168,184,160,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      for (const p of particles) {
        p.a += p.s * 0.004;
        const x = cx + Math.cos(p.a + elapsed * 0.05) * p.r;
        const y = cy + Math.sin(p.a + elapsed * 0.05) * p.r;
        const rch = tier === 'early' ? 170 : tier === 'mid' ? 210 : 240;
        const gch = tier === 'early' ? 180 : tier === 'mid' ? 180 : 160;
        const bch = tier === 'early' ? 155 : tier === 'mid' ? 120 : 90;
        ctx.beginPath();
        ctx.arc(x, y, p.sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rch},${gch},${bch},${0.45 + p.hue * 0.3})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pet.id, pet.photo_url, tier]);

  const photoImg = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!pet.photo_url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = pet.photo_url;
    photoImg.current = img;
  }, [pet.photo_url]);

  // Export card as image — composite canvas + overlay text
  const buildShareCanvas = async (): Promise<Blob | null> => {
    const src = canvasRef.current;
    if (!src) return null;
    const W = 1080, H = 1920; // Instagram Story aspect
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const ctx = out.getContext('2d');
    if (!ctx) return null;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    if (tier === 'early') {
      bg.addColorStop(0, '#faf4e6'); bg.addColorStop(1, '#e6dcc2');
    } else if (tier === 'mid') {
      bg.addColorStop(0, '#fbecc8'); bg.addColorStop(1, '#cbb58a');
    } else {
      bg.addColorStop(0, '#f9e0b2'); bg.addColorStop(1, '#a8896a');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Draw the animated visual into center
    const visualSize = 820;
    const vx = (W - visualSize) / 2;
    const vy = 440;
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, vy + visualSize / 2, visualSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(src, vx, vy, visualSize, visualSize);
    ctx.restore();

    // Title + day
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(80,60,30,0.55)';
    ctx.font = '300 28px Inter, sans-serif';
    ctx.fillText('BONDA  ·  Daily Bond Card', W / 2, 180);

    ctx.fillStyle = 'rgba(55,40,18,0.92)';
    ctx.font = '300 76px Inter, sans-serif';
    ctx.fillText(pet.name, W / 2, 280);

    ctx.fillStyle = 'rgba(90,70,40,0.75)';
    ctx.font = '300 34px Inter, sans-serif';
    ctx.fillText(
      lang === 'ja' ? `${day}日目  ·  ${dateStr}` : `Day ${day}  ·  ${dateStr}`,
      W / 2, 340,
    );

    // Short day text (wrapped)
    ctx.fillStyle = 'rgba(60,45,20,0.88)';
    ctx.font = '300 38px Inter, sans-serif';
    const maxW = W - 240;
    const words = dayText.split(lang === 'ja' ? '' : ' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = lang === 'ja' ? line + w : (line ? line + ' ' + w : w);
      if (ctx.measureText(test).width > maxW) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
      if (lines.length >= 3) break;
    }
    if (line && lines.length < 4) lines.push(line);
    const baseY = vy + visualSize + 100;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, baseY + i * 56));

    // Stats
    ctx.fillStyle = 'rgba(80,60,30,0.55)';
    ctx.font = '400 26px Inter, sans-serif';
    ctx.fillText(
      lang === 'ja'
        ? `愛のスコア ${pet.love_score}  ·  ${store.logs.length} の瞬間`
        : `love ${pet.love_score}  ·  ${store.logs.length} moments`,
      W / 2, H - 160,
    );

    ctx.fillStyle = 'rgba(80,60,30,0.35)';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText('bonda.app', W / 2, H - 100);

    return new Promise(res => out.toBlob(b => res(b), 'image/png'));
  };

  const handleShare = async () => {
    setShareState('working');
    try {
      const blob = await buildShareCanvas();
      if (!blob) { setShareState('idle'); return; }
      const file = new File([blob], `bonda-${pet.name}-day${day}.png`, { type: 'image/png' });
      const navAny = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      if (navAny.canShare?.({ files: [file] }) && navAny.share) {
        await navAny.share({
          files: [file],
          title: `${pet.name} · ${lang === 'ja' ? `${day}日目` : `Day ${day}`}`,
          text: dayText,
        });
        setShareState('done');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        setShareState('done');
      }
    } catch {
      setShareState('idle');
    }
    setTimeout(() => setShareState('idle'), 2400);
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col"
      style={{ background: 'rgba(30,24,14,0.82)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.4s ease' }}
    >
      <button
        onClick={onClose}
        className="absolute top-5 left-5 z-10 flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-full"
        style={{ background: 'rgba(255,252,240,0.18)', color: 'rgba(255,250,230,0.9)' }}
        aria-label="Back"
      >
        <ArrowLeft size={16} />
        <span className="text-[12px] font-medium">Back</span>
      </button>
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,252,240,0.18)', color: 'rgba(255,250,230,0.85)' }}
        aria-label="Close"
      >
        <X size={18} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-14 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-[0.24em] font-medium mb-3"
          style={{ color: 'rgba(255,238,200,0.55)' }}>
          {t('dailycard.badge')}
        </p>

        {/* Card */}
        <div
          className="relative rounded-[26px] overflow-hidden w-full max-w-sm"
          style={{
            aspectRatio: '9 / 16',
            background: tier === 'advanced'
              ? 'linear-gradient(180deg, #fbecc8 0%, #cbb58a 100%)'
              : tier === 'mid'
              ? 'linear-gradient(180deg, #faf0d2 0%, #d8c7a0 100%)'
              : 'linear-gradient(180deg, #fbf5e6 0%, #e8ddc4 100%)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center text-center px-6 py-8">
            <p className="text-[10px] uppercase tracking-[0.3em] font-medium"
              style={{ color: 'rgba(80,60,30,0.50)' }}>
              BONDA · Daily Bond Card
            </p>
            <h2 className="text-[28px] font-light mt-4"
              style={{ color: 'rgba(55,40,18,0.92)', letterSpacing: '-0.01em' }}>
              {pet.name}
            </h2>
            <p className="text-[12px] font-light mt-1"
              style={{ color: 'rgba(90,70,40,0.72)' }}>
              {lang === 'ja' ? `${day}日目  ·  ${dateStr}` : `Day ${day}  ·  ${dateStr}`}
            </p>

            <div className="flex-1 flex items-center justify-center w-full my-3">
              <div className="relative w-full aspect-square rounded-full overflow-hidden"
                style={{ maxWidth: 260 }}>
                <canvas ref={canvasRef} />
              </div>
            </div>

            <p className="text-[13px] font-light leading-[1.7] px-2 line-clamp-4"
              style={{ color: 'rgba(60,45,20,0.88)' }}>
              {dayText}
            </p>

            <div className="mt-4 pt-3 w-full border-t"
              style={{ borderColor: 'rgba(120,95,50,0.18)' }}>
              <p className="text-[10px] font-medium uppercase tracking-widest"
                style={{ color: 'rgba(80,60,30,0.55)' }}>
                {lang === 'ja'
                  ? `愛 ${pet.love_score}  ·  ${store.logs.length} の瞬間`
                  : `love ${pet.love_score}  ·  ${store.logs.length} moments`}
              </p>
            </div>

            {/* Solana Proof section */}
            <div className="mt-3 w-full rounded-xl px-3 py-2.5 text-left"
              style={{ background: 'rgba(60,40,18,0.06)', border: '1px solid rgba(120,95,50,0.18)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Shield size={10} style={{ color: 'rgba(80,60,30,0.65)' }} />
                <span className="text-[9px] uppercase tracking-[0.22em] font-semibold"
                  style={{ color: 'rgba(80,60,30,0.75)' }}>
                  Solana Proof
                </span>
                {proof ? (
                  <span className="text-[8.5px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(90,150,90,0.16)', color: 'rgba(60,110,60,0.95)' }}>
                    Devnet Live
                  </span>
                ) : (
                  <span className="text-[8.5px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(120,95,50,0.10)', color: 'rgba(110,85,40,0.75)' }}>
                    Demo — not yet on-chain
                  </span>
                )}
              </div>
              {proof ? (
                <>
                  <p className="text-[10.5px] font-mono leading-[1.5]" style={{ color: 'rgba(60,45,20,0.85)' }}>
                    Proof ID: {proof.shortId}
                  </p>
                  <p className="text-[10px] font-mono leading-[1.5]" style={{ color: 'rgba(80,60,30,0.65)' }}>
                    Hash: {proof.shortHash}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button onClick={async () => {
                      try { await navigator.clipboard.writeText(proof.fullSig); setProofCopied(true); setTimeout(() => setProofCopied(false), 1600); } catch { /* noop */ }
                    }}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
                      style={{ background: 'rgba(60,40,18,0.08)', color: 'rgba(60,40,18,0.88)' }}>
                      <Copy size={9} /> {proofCopied ? 'Copied' : 'Copy Proof ID'}
                    </button>
                    <a href={proof.explorerUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
                      style={{ background: 'rgba(60,40,18,0.08)', color: 'rgba(60,40,18,0.88)' }}>
                      <ExternalLink size={9} /> Explorer
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-[10.5px] font-light leading-[1.5]" style={{ color: 'rgba(80,60,30,0.72)' }}>
                  Pending devnet anchor. Open the Solana Trust Layer in Memories to anchor today&rsquo;s bond.
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] mt-5 max-w-xs text-center font-light leading-relaxed"
          style={{ color: 'rgba(255,240,210,0.55)' }}>
          {t('dailycard.sub')}
        </p>

        {/* Share */}
        <button
          onClick={() => setShowShareMenu(true)}
          className="mt-6 flex items-center gap-2.5 px-6 py-3.5 rounded-full transition-all active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, rgba(253,230,138,0.95) 0%, rgba(220,178,90,0.95) 100%)',
            color: 'rgba(55,40,18,0.92)',
            boxShadow: '0 8px 30px rgba(253,200,100,0.35)',
            border: '1px solid rgba(255,240,180,0.6)',
          }}
        >
          <Share2 size={16} />
          <span className="text-[13px] font-medium tracking-wide">
            {t('dailycard.share')}
          </span>
        </button>
      </div>

      {showShareMenu && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-6"
          style={{ background: 'rgba(20,14,6,0.55)' }}
          onClick={() => setShowShareMenu(false)}>
          <div className="w-full max-w-sm rounded-3xl p-5 relative"
            style={{ background: 'linear-gradient(180deg, #fbf4e6 0%, #f2e3c4 100%)', border: '1px solid rgba(201,166,110,0.35)' }}
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowShareMenu(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(120,82,40,0.08)', color: 'rgba(80,55,28,0.75)' }}>
              <X size={14} />
            </button>
            <p className="text-[10px] uppercase tracking-[0.26em] font-semibold" style={{ color: 'rgba(120,82,40,0.75)' }}>
              Share today&rsquo;s bond
            </p>
            <p className="text-[12.5px] font-light leading-[1.7] mt-1.5 mb-4" style={{ color: 'rgba(80,55,28,0.85)' }}>
              {caption}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => {
                const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(shareUrl)}`;
                window.open(intent, '_blank', 'noopener,noreferrer');
              }}
                className="py-2.5 rounded-xl text-[12px] font-semibold"
                style={{ background: 'rgba(30,22,10,0.92)', color: '#f5e6c7' }}>
                Share to X
              </button>
              <button onClick={async () => {
                try { await navigator.clipboard.writeText(caption); } catch { /* noop */ }
                await handleShare();
                window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
              }}
                className="py-2.5 rounded-xl text-[12px] font-semibold"
                style={{ background: 'rgba(60,40,18,0.92)', color: '#f5e6c7' }}>
                Share to Instagram
              </button>
              <button onClick={async () => {
                try { await navigator.clipboard.writeText(caption); setCaptionCopied(true); setTimeout(() => setCaptionCopied(false), 1600); } catch { /* noop */ }
              }}
                className="py-2.5 rounded-xl text-[12px] font-semibold inline-flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(255,248,232,0.9)', color: 'rgba(60,40,18,0.92)', border: '1px solid rgba(201,166,110,0.35)' }}>
                <Copy size={11} /> {captionCopied ? 'Copied' : 'Copy caption'}
              </button>
              <button onClick={handleShare} disabled={shareState === 'working'}
                className="py-2.5 rounded-xl text-[12px] font-semibold inline-flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(255,248,232,0.9)', color: 'rgba(60,40,18,0.92)', border: '1px solid rgba(201,166,110,0.35)' }}>
                <Download size={11} /> {shareState === 'working' ? 'Saving\u2026' : shareState === 'done' ? 'Saved' : 'Download'}
              </button>
            </div>

            <p className="text-[10px] font-light text-center mt-3" style={{ color: 'rgba(100,72,32,0.65)' }}>
              {proof ? `Proof ID ${proof.shortId} included in share.` : 'No Solana proof yet — share without on-chain reference.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
