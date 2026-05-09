import { useState, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { PhotoPickerInline } from '../components/PhotoPicker';
import { useI18n } from '../lib/i18n';

interface OnboardingData {
  species: string;
  breed: string;
  photoUrl: string;
  name: string;
  age: string;
  description: string;
}

interface Props {
  onComplete: (data: OnboardingData) => void;
}

const DOG_BREEDS_EN = [
  'Mixed / Not sure', 'Golden Retriever', 'Labrador', 'French Bulldog',
  'German Shepherd', 'Beagle', 'Poodle', 'Chihuahua', 'Siberian Husky',
  'Dachshund', 'Shih Tzu', 'Border Collie', 'Rottweiler', 'Maltese',
  'Corgi', 'Cocker Spaniel', 'Boxer', 'Great Dane', 'Pomeranian',
];

const CAT_BREEDS_EN = [
  'Mixed / Not sure', 'Domestic Shorthair', 'Domestic Longhair', 'Persian',
  'Maine Coon', 'Siamese', 'British Shorthair', 'Ragdoll', 'Bengal',
  'Scottish Fold', 'Abyssinian', 'Sphynx', 'Burmese', 'Russian Blue',
];

const DOG_BREEDS_JA = [
  'ミックス／わからない', 'ゴールデンレトリバー', 'ラブラドール', 'フレンチブルドッグ',
  'ジャーマンシェパード', 'ビーグル', 'プードル', 'チワワ', 'シベリアンハスキー',
  'ダックスフント', 'シーズー', 'ボーダーコリー', 'ロットワイラー', 'マルチーズ',
  'コーギー', 'コッカースパニエル', 'ボクサー', 'グレートデン', 'ポメラニアン',
];

const CAT_BREEDS_JA = [
  'ミックス／わからない', '短毛雑種', '長毛雑種', 'ペルシャ',
  'メインクーン', 'シャム', 'ブリティッシュショートヘア', 'ラグドール', 'ベンガル',
  'スコティッシュフォールド', 'アビシニアン', 'スフィンクス', 'バーミーズ', 'ロシアンブルー',
];

const AGE_KEYS = [
  'onboarding.ages.under1', 'onboarding.ages.1', 'onboarding.ages.2', 'onboarding.ages.3',
  'onboarding.ages.4', 'onboarding.ages.5', 'onboarding.ages.6to8', 'onboarding.ages.9to12',
  'onboarding.ages.13plus',
] as const;

const DESC_PLACEHOLDER_KEYS = [
  'onboarding.desc.placeholder0', 'onboarding.desc.placeholder1', 'onboarding.desc.placeholder2',
  'onboarding.desc.placeholder3', 'onboarding.desc.placeholder4', 'onboarding.desc.placeholder5',
] as const;

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-500 ${
            i === current
              ? 'w-4 h-1.5 bg-stone-700'
              : i < current
              ? 'w-1.5 h-1.5 bg-stone-400'
              : 'w-1.5 h-1.5 bg-warm-400'
          }`}
        />
      ))}
    </div>
  );
}

function StepWrapper({ children, stepKey }: { children: React.ReactNode; stepKey: string | number }) {
  return (
    <div key={stepKey} className="flex flex-col min-h-full animate-fadeIn">
      {children}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 transition-colors"
    >
      <ChevronLeft size={20} />
    </button>
  );
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { t, lang } = useI18n();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    species: '', breed: '', photoUrl: '', name: '', age: '', description: '',
  });
  const [breedSearch, setBreedSearch] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 8;
  const goNext = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));
  const set = (field: keyof OnboardingData, value: string) =>
    setData(prev => ({ ...prev, [field]: value }));

  const isJa = lang === 'ja';
  const dogBreeds = isJa ? DOG_BREEDS_JA : DOG_BREEDS_EN;
  const catBreeds = isJa ? CAT_BREEDS_JA : CAT_BREEDS_EN;
  const breeds = data.species === 'dog' ? dogBreeds : data.species === 'cat' ? catBreeds : [];
  const filteredBreeds = breeds.filter(b =>
    b.toLowerCase().includes(breedSearch.toLowerCase())
  );
  const ageOptions = AGE_KEYS.map(k => t(k));
  const placeholderIndex = data.name.length % DESC_PLACEHOLDER_KEYS.length;

  // Step 0: Welcome
  if (step === 0) {
    return (
      <StepWrapper stepKey={0}>
        <div className="flex flex-col items-center justify-center min-h-full px-8 py-20 text-center">
          <img
            src="/Ver16_Pitch_BONDA.png"
            alt="BONDA"
            className="h-9 w-auto object-contain mb-16"
            style={{ mixBlendMode: 'multiply' }}
          />
          <div className="mb-12">
            <p className="text-[11px] text-stone-300 uppercase tracking-[0.22em] font-medium mb-4">
              {t('onboarding.badge')}
            </p>
            <h1 className="text-[32px] font-bold text-stone-800 leading-[1.2] mb-5 whitespace-pre-line">
              {t('onboarding.welcome.title')}
            </h1>
            <p className="text-stone-400 text-[15px] font-light leading-relaxed max-w-xs mx-auto whitespace-pre-line">
              {t('onboarding.welcome.body')}
            </p>
          </div>
          <button
            onClick={goNext}
            className="animate-breathe w-full max-w-xs py-4 rounded-full bg-stone-800 text-white text-sm font-medium tracking-widest hover:bg-stone-700 active:scale-95 transition-colors"
            style={{ letterSpacing: '0.12em' }}
          >
            {t('onboarding.welcome.cta')}
          </button>
        </div>
      </StepWrapper>
    );
  }

  // Step 1: Species
  if (step === 1) {
    const options = [
      { value: 'dog',   label: t('onboarding.species.dog'),   emoji: '🐶' },
      { value: 'cat',   label: t('onboarding.species.cat'),   emoji: '🐱' },
      { value: 'other', label: t('onboarding.species.other'), emoji: '🐾' },
    ];
    return (
      <StepWrapper stepKey={1}>
        <div className="flex flex-col min-h-full px-6 pt-14 pb-10">
          <div className="flex items-center justify-between mb-10">
            <BackButton onClick={goBack} />
            <ProgressDots total={6} current={0} />
            <div className="w-8" />
          </div>
          <div className="mb-10">
            <p className="text-[11px] text-stone-300 uppercase tracking-[0.22em] font-medium mb-3">
              {t('onboarding.step1.badge')}
            </p>
            <h2 className="text-[26px] font-bold text-stone-800 leading-snug whitespace-pre-line">
              {t('onboarding.step1.title')}
            </h2>
          </div>
          <div className="space-y-3 flex-1">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  set('species', opt.value);
                  set('breed', '');
                  set('photoUrl', '');
                  setTimeout(goNext, 220);
                }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                  data.species === opt.value
                    ? 'border-stone-700 bg-warm-200'
                    : 'border-warm-400 bg-warm-100 hover:border-warm-500'
                }`}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <p className="text-base font-semibold text-stone-800">{opt.label}</p>
                <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  data.species === opt.value ? 'border-stone-700 bg-stone-700' : 'border-warm-500'
                }`}>
                  {data.species === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </StepWrapper>
    );
  }

  // Step 2: Breed (skip for "other")
  if (step === 2) {
    if (data.species === 'other') {
      setTimeout(goNext, 0);
      return null;
    }
    return (
      <StepWrapper stepKey={2}>
        <div className="flex flex-col min-h-full px-6 pt-14 pb-10">
          <div className="flex items-center justify-between mb-10">
            <BackButton onClick={goBack} />
            <ProgressDots total={6} current={1} />
            <div className="w-8" />
          </div>
          <div className="mb-6">
            <p className="text-[11px] text-stone-300 uppercase tracking-[0.22em] font-medium mb-3">
              {t('onboarding.step2.badge')}
            </p>
            <h2 className="text-[26px] font-bold text-stone-800 leading-snug whitespace-pre-line">
              {t('onboarding.step2.title')}
            </h2>
          </div>
          <div className="relative mb-4">
            <input
              value={breedSearch}
              onChange={e => setBreedSearch(e.target.value)}
              placeholder={t('onboarding.breed.search')}
              className="w-full bg-warm-200 border border-warm-400 rounded-xl px-4 py-3 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-warm-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredBreeds.map(breed => (
              <button
                key={breed}
                onClick={() => { set('breed', breed); setTimeout(goNext, 200); }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                  data.breed === breed
                    ? 'border-stone-700 bg-warm-200 text-stone-800 font-medium'
                    : 'border-warm-300 bg-warm-100 text-stone-600 hover:border-warm-500'
                }`}
              >
                {breed}
              </button>
            ))}
          </div>
          {data.breed && (
            <button
              onClick={goNext}
              className="mt-4 w-full py-4 rounded-2xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 active:scale-95 transition-all"
            >
              {t('onboarding.breed.continue')}
            </button>
          )}
        </div>
      </StepWrapper>
    );
  }

  // Step 3: Photo
  if (step === 3) {
    return (
      <StepWrapper stepKey={3}>
        <div className="flex flex-col min-h-full px-6 pt-14 pb-10">
          <div className="flex items-center justify-between mb-8">
            <BackButton onClick={goBack} />
            <ProgressDots total={6} current={2} />
            <div className="w-8" />
          </div>
          <div className="mb-6">
            <p className="text-[11px] text-stone-300 uppercase tracking-[0.22em] font-medium mb-3">
              {t('onboarding.step3.badge')}
            </p>
            <h2 className="text-[26px] font-bold text-stone-800 leading-snug">
              {t('onboarding.step3.title')}
            </h2>
            <p className="text-stone-400 text-sm font-light mt-2 leading-relaxed">
              {t('onboarding.step3.body')}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PhotoPickerInline
              species={data.species}
              currentUrl={data.photoUrl}
              onSelect={(url) => set('photoUrl', url)}
            />
          </div>
          {data.photoUrl && (
            <button
              onClick={goNext}
              className="mt-6 w-full py-4 rounded-2xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 active:scale-95 transition-all animate-fadeIn"
            >
              {t('onboarding.step3.cta')}
            </button>
          )}
        </div>
      </StepWrapper>
    );
  }

  // Step 4: Name
  if (step === 4) {
    const nameCta = data.name.trim()
      ? (isJa ? `こんにちは、${data.name}` : `Hello, ${data.name}`)
      : t('onboarding.step4.cta_empty');
    return (
      <StepWrapper stepKey={4}>
        <div className="flex flex-col min-h-full px-6 pt-14 pb-10">
          <div className="flex items-center justify-between mb-10">
            <BackButton onClick={goBack} />
            <ProgressDots total={6} current={3} />
            <div className="w-8" />
          </div>
          <div className="mb-8">
            <p className="text-[11px] text-stone-300 uppercase tracking-[0.22em] font-medium mb-3">
              {t('onboarding.step4.badge')}
            </p>
            <h2 className="text-[26px] font-bold text-stone-800 leading-snug whitespace-pre-line">
              {t('onboarding.step4.title')}
            </h2>
          </div>
          {data.photoUrl && (
            <div className="flex flex-col items-center mb-8">
              <img src={data.photoUrl} alt="" className="w-24 h-24 rounded-3xl object-cover shadow-lg mb-3" />
              <p className={`text-xl font-bold text-stone-800 transition-all duration-300 ${data.name ? 'opacity-100' : 'opacity-0'}`}>
                {data.name || '—'}
              </p>
            </div>
          )}
          <input
            ref={nameInputRef}
            value={data.name}
            onChange={e => set('name', e.target.value)}
            placeholder={isJa ? '名前を入力…' : 'Their name…'}
            autoFocus
            className="w-full bg-warm-200 border border-warm-400 rounded-2xl px-5 py-4 text-lg font-semibold text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-warm-500 text-center mb-6"
            onKeyDown={e => { if (e.key === 'Enter' && data.name.trim()) goNext(); }}
          />
          <button
            onClick={goNext}
            disabled={!data.name.trim()}
            className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all ${
              data.name.trim()
                ? 'bg-stone-800 text-white hover:bg-stone-700 active:scale-95'
                : 'bg-warm-300 text-stone-400 cursor-not-allowed'
            }`}
          >
            {nameCta}
          </button>
        </div>
      </StepWrapper>
    );
  }

  // Step 5: Age
  if (step === 5) {
    const themLabel = data.name || t('onboarding.step5.them');
    return (
      <StepWrapper stepKey={5}>
        <div className="flex flex-col min-h-full px-6 pt-14 pb-10">
          <div className="flex items-center justify-between mb-10">
            <BackButton onClick={goBack} />
            <ProgressDots total={6} current={4} />
            <div className="w-8" />
          </div>
          <div className="mb-8">
            <p className="text-[11px] text-stone-300 uppercase tracking-[0.22em] font-medium mb-3">
              {t('onboarding.step5.badge')}
            </p>
            <h2 className="text-[26px] font-bold text-stone-800 leading-snug">
              {t('onboarding.step5.title_pre')}{themLabel}{t('onboarding.step5.title_post')}
            </h2>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {ageOptions.map((age, idx) => (
              <button
                key={idx}
                onClick={() => { set('age', age); setTimeout(goNext, 200); }}
                className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all text-sm ${
                  data.age === age
                    ? 'border-stone-700 bg-warm-200 text-stone-800 font-semibold'
                    : 'border-warm-300 bg-warm-100 text-stone-600 hover:border-warm-500'
                }`}
              >
                {age}
              </button>
            ))}
          </div>
          {data.age && (
            <button
              onClick={goNext}
              className="mt-4 w-full py-4 rounded-2xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 active:scale-95 transition-all"
            >
              {t('onboarding.step5.continue')}
            </button>
          )}
        </div>
      </StepWrapper>
    );
  }

  // Step 6: One-line description
  if (step === 6) {
    const themLabel = data.name || t('onboarding.step5.them');
    return (
      <StepWrapper stepKey={6}>
        <div className="flex flex-col min-h-full px-6 pt-14 pb-10">
          <div className="flex items-center justify-between mb-10">
            <BackButton onClick={goBack} />
            <ProgressDots total={6} current={5} />
            <div className="w-8" />
          </div>
          <div className="mb-8">
            <p className="text-[11px] text-stone-300 uppercase tracking-[0.22em] font-medium mb-3">
              {t('onboarding.step6.badge')}
            </p>
            <h2 className="text-[26px] font-bold text-stone-800 leading-snug whitespace-pre-line">
              {t('onboarding.step6.title_pre')}{themLabel}{t('onboarding.step6.title_post')}
            </h2>
            <p className="text-stone-400 text-sm font-light mt-2">
              {t('onboarding.step6.body')}
            </p>
          </div>
          <textarea
            value={data.description}
            onChange={e => set('description', e.target.value)}
            placeholder={t(DESC_PLACEHOLDER_KEYS[placeholderIndex])}
            rows={3}
            autoFocus
            className="w-full bg-warm-200 border border-warm-400 rounded-2xl px-5 py-4 text-[15px] text-stone-700 placeholder-stone-300 font-light leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-warm-500 mb-4"
          />
          <button
            onClick={goNext}
            className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all ${
              data.description.trim()
                ? 'bg-stone-800 text-white hover:bg-stone-700 active:scale-95'
                : 'bg-warm-300 text-stone-500'
            }`}
          >
            {data.description.trim() ? t('onboarding.step6.cta') : t('onboarding.step6.skip')}
          </button>
        </div>
      </StepWrapper>
    );
  }

  // Step 7: Finish
  if (step === 7) {
    return (
      <StepWrapper stepKey={7}>
        <div className="flex flex-col items-center justify-center min-h-full px-8 py-20 text-center">
          {data.photoUrl && (
            <div className="relative mb-8">
              <div
                className="absolute inset-0 rounded-full opacity-20 blur-2xl scale-125"
                style={{ background: 'radial-gradient(circle, #fde68a, transparent)' }}
              />
              <img
                src={data.photoUrl}
                alt={data.name}
                className="relative w-32 h-32 rounded-full object-cover shadow-2xl"
              />
            </div>
          )}
          <div className="mb-3">
            <p className="text-[11px] text-stone-300 uppercase tracking-[0.22em] font-medium mb-2">
              {data.name}
            </p>
            <h1 className="text-[28px] font-bold text-stone-800 leading-[1.25] mb-4 whitespace-pre-line">
              {t('onboarding.finish.title')}
            </h1>
            {data.description && (
              <p className="text-stone-400 text-[14px] font-light italic leading-relaxed max-w-[240px] mx-auto mb-1">
                "{data.description}"
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mb-12 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-sage-400" />
            <p className="text-[11px] text-stone-400 font-light">{t('onboarding.finish.badge')}</p>
          </div>
          <button
            onClick={() => onComplete(data)}
            className="w-full max-w-xs py-4 rounded-2xl bg-stone-800 text-white text-sm font-semibold tracking-wide hover:bg-stone-700 active:scale-95 transition-all"
          >
            {t('onboarding.finish.cta')}
          </button>
          <button onClick={goBack} className="mt-3 text-[11px] text-stone-400 font-light">
            {t('onboarding.finish.back')}
          </button>
        </div>
      </StepWrapper>
    );
  }

  return null;
}
