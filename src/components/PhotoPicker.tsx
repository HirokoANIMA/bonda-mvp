import { useRef, useState } from 'react';
import { X, Upload, Sparkles } from 'lucide-react';

// Onboarding photo picker: only Upload and (optionally) Load Baobao demo.
// No illustrated starter, no breed pickers, no sample pet grid, no cartoon icons.

interface Props {
  currentUrl?: string;
  onSelect: (url: string) => void;
  onClose?: () => void;
  onLoadBaobao?: () => void;
  species?: string; // kept for backward compatibility; unused
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PhotoPickerBody({ onSelect, onLoadBaobao }: { onSelect: (url: string) => void; onLoadBaobao?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingUpload(dataUrl);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="text-center px-2">
        <h4 className="text-[18px] font-semibold text-stone-800 leading-snug">
          Choose a photo that feels most like them.
        </h4>
        <p className="text-[12px] text-stone-500 font-light mt-2 leading-relaxed">
          A real photo helps BONDA create a Presence that feels personal.
        </p>
      </div>

      {pendingUpload ? (
        <div className="flex flex-col items-center gap-3 animate-fadeIn">
          <div className="relative">
            <img src={pendingUpload} alt="Your pet" className="w-32 h-32 rounded-3xl object-cover shadow-lg" />
            <button
              onClick={() => setPendingUpload(null)}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-stone-700 text-white flex items-center justify-center shadow"
              aria-label="Remove uploaded photo">
              <X size={12} />
            </button>
          </div>
          <button
            onClick={() => onSelect(pendingUpload)}
            className="w-full py-4 rounded-2xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 active:scale-95 transition-all">
            Continue with this photo
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-[11.5px] text-stone-500 font-light">
            Change photo
          </button>
          <p className="text-[10.5px] text-stone-400 font-light italic">
            You can add more memories later.
          </p>
        </div>
      ) : (
        <>
          {/* Primary — Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all active:scale-[0.98] text-left"
            style={{
              background: 'linear-gradient(135deg, rgba(255,246,220,0.9), rgba(246,223,170,0.7))',
              borderColor: 'rgba(180,140,70,0.45)',
              boxShadow: '0 8px 24px rgba(180,140,70,0.18)',
            }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(60,42,18,0.9)' }}>
              <Upload size={18} className="text-warm-100" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: 'rgba(50,34,14,0.95)' }}>
                {uploading ? 'Opening\u2026' : 'Upload your pet photo'}
              </p>
              <p className="text-[11px] font-light mt-0.5" style={{ color: 'rgba(80,55,22,0.75)' }}>
                JPG, PNG, or HEIC from your device
              </p>
            </div>
          </button>

          {/* Secondary — Baobao demo */}
          {onLoadBaobao && (
            <button
              onClick={onLoadBaobao}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all active:scale-[0.98] text-left"
              style={{
                background: 'rgba(255,252,240,0.72)',
                borderColor: 'rgba(120,90,40,0.24)',
              }}>
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border"
                style={{ borderColor: 'rgba(120,90,40,0.25)' }}>
                <img src="/baobao-demo.jpg" alt="Baobao" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-semibold" style={{ color: 'rgba(50,34,14,0.95)' }}>
                    Load Baobao demo profile
                  </p>
                  <Sparkles size={12} style={{ color: 'rgba(150,110,45,0.85)' }} />
                </div>
                <p className="text-[11px] font-light mt-0.5 leading-relaxed" style={{ color: 'rgba(80,55,22,0.72)' }}>
                  See how BONDA turns care, memories, voice, and relationship signals into Presence.
                </p>
              </div>
            </button>
          )}

          <p className="text-[10.5px] text-stone-400 font-light italic text-center">
            You can add more memories later.
          </p>
        </>
      )}
    </div>
  );
}

export function PhotoPickerModal({ currentUrl: _currentUrl, onSelect, onClose, onLoadBaobao }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-warm-50 rounded-t-3xl px-5 pt-8 pb-10 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-stone-800">Their photo</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-warm-200 flex items-center justify-center" aria-label="Close">
            <X size={14} className="text-stone-500" />
          </button>
        </div>
        <PhotoPickerBody
          onSelect={(url) => { onSelect(url); onClose?.(); }}
          onLoadBaobao={onLoadBaobao ? () => { onLoadBaobao(); onClose?.(); } : undefined}
        />
      </div>
    </div>
  );
}

export function PhotoPickerInline({ onSelect, onLoadBaobao }: Props) {
  return <PhotoPickerBody onSelect={onSelect} onLoadBaobao={onLoadBaobao} />;
}
