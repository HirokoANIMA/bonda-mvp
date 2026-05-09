import { useState, useCallback } from 'react';
import type { Pet, CareLog, ActionType, ActionConfig, AfterBondaMemory, AfterCategory, BondMemory, BondPromptId, NarrativeMemory, VoiceMemory, PresenceMessage, MemoryCapsule } from './types';
import { ACTION_CONFIGS } from './types';
import type { Verification } from './solana';

export const DEMO_PET_ID = 'demo-pet-baobao';
export const BAOBAO_DEMO_IMAGE = '/baobao-demo.jpg';
const STORAGE_KEY = 'bonda_demo_state';

export interface CollarEvent {
  id: string;
  actionType: ActionType;
  message: string;       // emotional sentence shown to user
  detectedAt: string;    // ISO timestamp
  committed: boolean;    // whether it's been turned into a CareLog yet
}

interface WalletState {
  bondTokens: number;
}

interface DemoState {
  pet: Pet;
  logs: CareLog[];
  wallet: WalletState;
  collarConnected: boolean;
  collarEvents: CollarEvent[];
  onboardingComplete: boolean;
  afterMemories: AfterBondaMemory[];
  coinMinted: boolean;
  bondMemories: BondMemory[];
  narrativeMemories: NarrativeMemory[];
  voiceMemories: VoiceMemory[];
  presenceMessages: PresenceMessage[];
  capsules: MemoryCapsule[];
  verifications: Verification[];
  presenceAwakened: boolean;
}

export interface VerificationSignals {
  consistency: number;   // 0–100
  reality: number;       // 0–100  (device-sourced logs)
  relationship: number;  // 0–100  (logs with notes)
  richness: number;      // 0–100  (logs with photo or note)
}

// Emotional messages for each auto-detected event type
const COLLAR_MESSAGES: Record<ActionType, string[]> = {
  walk: [
    `You walked together this morning. That moment became love.`,
    `Every step side by side leaves a mark on your bond.`,
    `You moved through the world together. That is care made real.`,
  ],
  touch: [
    `You were close. The collar felt it. So did they.`,
    `A moment of touch — quiet, warm, and yours.`,
    `You reached for them. That closeness became love.`,
  ],
  play: [
    `You played together. Joy like that doesn't disappear.`,
    `Laughter and movement — your bond deepened without you even noticing.`,
    `That burst of play is now part of your story.`,
  ],
  feed: [
    `You nourished them. That care became love.`,
    `Another meal, another quiet act of devotion.`,
    `You fed them with your own hands. That moment is love.`,
  ],
  talk: [
    `You spoke to them. Your voice is their comfort.`,
    `Every word you share is a thread in your bond.`,
    `You talked. They listened. That is its own kind of love.`,
  ],
  groom: [
    `Your hands were gentle. They trusted you completely.`,
    `That tender moment was felt and remembered.`,
    `Grooming is a quiet language. You spoke it with care.`,
  ],
  sleep: [
    `You stayed close while they rested. That is care.`,
    `Rest came easier with you near. The collar noticed.`,
    `Even in stillness, your presence was felt.`,
  ],
  photo: [
    `You captured something worth holding onto.`,
    `A moment preserved. That is its own form of love.`,
    `You stopped and noticed. The collar caught what you saw.`,
  ],
  memory: [
    `A moment worth keeping. The collar caught what words can't.`,
    `You stopped and noticed. That act of attention is love.`,
    `This moment is now part of your shared story.`,
  ],
};

function randomMessage(type: ActionType): string {
  const arr = COLLAR_MESSAGES[type];
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomTranslation(config: ActionConfig, lang?: string): string {
  const arr = (lang === 'ja' && config.translations_ja.length > 0)
    ? config.translations_ja
    : config.translations;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Narrative sentences generated from care actions — one per log, deterministic from log id
const CARE_NARRATIVES: Record<ActionType, string[]> = {
  walk:   [
    'You walked together. The world opened a little around you both.',
    'Side by side, unhurried. That walk is part of your story now.',
    'You moved through the morning together, and the day felt softer for it.',
  ],
  feed:   [
    'You prepared their meal. A small act — but it said everything.',
    'You fed them with your own hands. That is what devotion looks like.',
    'Another meal, offered freely. That kind of care adds up.',
  ],
  touch:  [
    'You reached out and they leaned in. Nothing else was needed.',
    'A moment of closeness — quiet, warm, yours.',
    'In that touch, something settled between you.',
  ],
  talk:   [
    'You spoke to them. Your voice was enough.',
    'They may not have understood every word. They understood you.',
    'You talked. The sound of you is their comfort.',
  ],
  groom:  [
    'You tended to them carefully. They let themselves be cared for.',
    'Patient hands, unhurried attention. That is its own kind of love.',
    'You were gentle. They trusted you completely.',
  ],
  play:   [
    'You played together, fully present — nothing held back.',
    'The joy between you was real and unguarded.',
    'In that moment of play, everything else fell away.',
  ],
  sleep:  [
    'You stayed close while they rested. That quiet was its own kind of love.',
    'Rest came easier with you near. That means something.',
    'You kept them safe through the stillness.',
  ],
  photo:  [
    'You saw something worth keeping, and you kept it.',
    'This image holds more than the moment shows.',
    'You stopped. You noticed. That is care.',
  ],
  memory: [
    'You paused long enough to remember. That is rare.',
    'This moment is worth holding onto.',
    'You carried it forward. You will always have this.',
  ],
};

function generateNarrative(logId: string, actionType: ActionType): string {
  const arr = CARE_NARRATIVES[actionType];
  const n = logId.charCodeAt(0) + logId.charCodeAt(logId.length - 1);
  return arr[n % arr.length];
}

function loadDemoState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // migrate wallet shape
      if (!parsed.wallet || parsed.wallet.verifiedLove !== undefined) {
        parsed.wallet = { bondTokens: parsed.wallet?.bondaTokens ?? 0 };
      }
      if (parsed.collarConnected === undefined) parsed.collarConnected = true;
      if (!parsed.collarEvents) parsed.collarEvents = [];
      if (parsed.onboardingComplete === undefined) parsed.onboardingComplete = true;
      if (!parsed.afterMemories) parsed.afterMemories = [];
      if (parsed.coinMinted === undefined) parsed.coinMinted = false;
      if (!parsed.bondMemories) parsed.bondMemories = [];
      if (!parsed.narrativeMemories) {
        // Back-fill narratives from existing logs
        parsed.narrativeMemories = (parsed.logs ?? []).map((l: CareLog) => ({
          id: `nm-${l.id}`,
          care_log_id: l.id,
          action_type: l.action_type,
          narrative: generateNarrative(l.id, l.action_type),
          created_at: l.created_at,
        }));
      }
      if (!parsed.voiceMemories) parsed.voiceMemories = [];
      if (!parsed.presenceMessages) parsed.presenceMessages = [];
      if (!parsed.capsules) parsed.capsules = [];
      if (!parsed.verifications) parsed.verifications = [];
      if (parsed.presenceAwakened === undefined) parsed.presenceAwakened = false;
      // Always pin the canonical Baobao demo image so cached state can't drift.
      if (parsed.pet?.id === DEMO_PET_ID) {
        parsed.pet.photo_url = BAOBAO_DEMO_IMAGE;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch {}
  return {
    pet: {
      id: DEMO_PET_ID,
      user_id: 'demo',
      name: 'Baobao',
      species: 'dog',
      photo_url: BAOBAO_DEMO_IMAGE,
      love_score: 0,
      created_at: new Date().toISOString(),
    },
    logs: [],
    wallet: { bondTokens: 0 },
    collarConnected: true,
    collarEvents: [],
    onboardingComplete: false,
    afterMemories: [],
    coinMinted: false,
    bondMemories: [],
    narrativeMemories: [],
    voiceMemories: [],
    presenceMessages: [],
    capsules: [],
    verifications: [],
    presenceAwakened: false,
  };
}

// ── Sample Baobao demo profile — for hackathon "Load Baobao demo" button ──
export function buildBaobaoDemoState(): DemoState {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();
  const petId = DEMO_PET_ID;
  const pet: Pet = {
    id: petId,
    user_id: 'demo',
    name: 'Baobao',
    species: 'dog',
    photo_url: BAOBAO_DEMO_IMAGE,
    love_score: 420,
    created_at: iso(1000 * 60 * 60 * 24 * 42), // ~6 weeks ago
  };

  const logs: CareLog[] = [
    { id: crypto.randomUUID(), pet_id: petId, user_id: 'demo', action_type: 'walk', love_value: 20, emotional_translation: 'You walked together. Every step was a quiet promise.', note: 'Morning walk by the river.', photo_url: '', source: 'device', created_at: iso(1000 * 60 * 60 * 6) },
    { id: crypto.randomUUID(), pet_id: petId, user_id: 'demo', action_type: 'feed', love_value: 10, emotional_translation: 'You nourished them.', note: '', photo_url: '', source: 'manual', created_at: iso(1000 * 60 * 60 * 9) },
    { id: crypto.randomUUID(), pet_id: petId, user_id: 'demo', action_type: 'touch', love_value: 12, emotional_translation: 'You reached out. That closeness became love.', note: '', photo_url: '', source: 'device', created_at: iso(1000 * 60 * 60 * 30) },
    { id: crypto.randomUUID(), pet_id: petId, user_id: 'demo', action_type: 'play', love_value: 18, emotional_translation: 'You played together. Joy like that doesn\'t disappear.', note: 'Fetch at the park.', photo_url: '', source: 'manual', created_at: iso(1000 * 60 * 60 * 54) },
    { id: crypto.randomUUID(), pet_id: petId, user_id: 'demo', action_type: 'sleep', love_value: 10, emotional_translation: 'You stayed close while they rested.', note: '', photo_url: '', source: 'device', created_at: iso(1000 * 60 * 60 * 72) },
  ];
  const narrativeMemories: NarrativeMemory[] = logs.map(l => ({
    id: `nm-${l.id}`,
    care_log_id: l.id,
    action_type: l.action_type,
    narrative: generateNarrative(l.id, l.action_type),
    created_at: l.created_at,
  }));
  const bondMemories: BondMemory[] = [
    { id: crypto.randomUUID(), prompt_id: 'most_love', body: 'The moment I felt most loved was when Baobao curled up on my chest after a long day.', created_at: iso(1000 * 60 * 60 * 24 * 3) },
    { id: crypto.randomUUID(), prompt_id: 'unforgettable', body: 'I will never forget the first time she brought me a flower in her mouth.', created_at: iso(1000 * 60 * 60 * 24 * 10) },
  ];
  const voiceMemories: VoiceMemory[] = [
    { id: crypto.randomUUID(), title: 'Good morning, Baobao', transcript: 'Good morning, Baobao. I hope you slept well.', audio_data_url: '', duration_ms: 3200, created_at: iso(1000 * 60 * 60 * 48) },
  ];
  const presenceMessages: PresenceMessage[] = [];

  return {
    pet,
    logs,
    wallet: { bondTokens: 2 },
    collarConnected: true,
    collarEvents: [],
    onboardingComplete: true,
    afterMemories: [],
    coinMinted: false,
    bondMemories,
    narrativeMemories,
    voiceMemories,
    presenceMessages,
    capsules: [],
    verifications: [],
    presenceAwakened: true,
  };
}

function saveDemoState(state: DemoState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Compute verification signals from logs
function computeSignals(logs: CareLog[]): VerificationSignals {
  if (logs.length === 0) return { consistency: 0, reality: 0, relationship: 0, richness: 0 };

  const now = new Date();
  const last7Days = new Set(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      return d.toDateString();
    })
  );
  const activeDays = new Set(
    logs
      .filter(l => last7Days.has(new Date(l.created_at).toDateString()))
      .map(l => new Date(l.created_at).toDateString())
  );
  const consistency = Math.round((activeDays.size / 7) * 100);

  const deviceLogs = logs.filter(l => l.source === 'device').length;
  const reality = Math.round((deviceLogs / logs.length) * 100);

  const withNote = logs.filter(l => l.note && l.note.trim().length > 0).length;
  const relationship = Math.round((withNote / logs.length) * 100);

  const rich = logs.filter(l => (l.photo_url && l.photo_url.length > 0) || (l.note && l.note.trim().length > 0)).length;
  const richness = Math.round((rich / logs.length) * 100);

  return { consistency, reality, relationship, richness };
}

// Device-sourced logs get a 1.5× reality weight in the verification formula
function computeVerifiedLove(loveScore: number, signals: VerificationSignals): number {
  const weighted =
    signals.consistency * 1.0 +
    signals.reality     * 1.5 +   // device data carries more weight
    signals.relationship * 1.0 +
    signals.richness     * 1.0;
  const maxWeighted = 100 * 4.5;
  const quality = weighted / maxWeighted;
  return Math.floor(loveScore * quality);
}

export function useBondaStore() {
  const [state, setState] = useState<DemoState>(loadDemoState);

  // Manual care action (source: 'manual')
  const stageCareAction = useCallback((actionType: ActionType, note?: string, lang?: string): CareLog => {
    const config = ACTION_CONFIGS.find(c => c.type === actionType)!;
    const translation = getRandomTranslation(config, lang);

    const newLog: CareLog = {
      id: crypto.randomUUID(),
      pet_id: DEMO_PET_ID,
      user_id: 'demo',
      action_type: actionType,
      love_value: config.loveValue,
      emotional_translation: translation,
      note: note ?? '',
      photo_url: '',
      source: 'manual',
      created_at: new Date().toISOString(),
    };

    const newNarrative: NarrativeMemory = {
      id: `nm-${newLog.id}`,
      care_log_id: newLog.id,
      action_type: actionType,
      narrative: generateNarrative(newLog.id, actionType),
      created_at: newLog.created_at,
    };

    setState(prev => {
      const next: DemoState = {
        ...prev,
        pet: { ...prev.pet },
        logs: [newLog, ...prev.logs],
        narrativeMemories: [newNarrative, ...prev.narrativeMemories],
      };
      saveDemoState(next);
      return next;
    });

    return newLog;
  }, []);

  // Commit love score after animation
  const commitLoveScore = useCallback((loveValue: number) => {
    setState(prev => {
      const next: DemoState = {
        ...prev,
        pet: { ...prev.pet, love_score: prev.pet.love_score + loveValue },
      };
      saveDemoState(next);
      return next;
    });
  }, []);

  // Collar detects an event → creates a pending CollarEvent
  const detectCollarEvent = useCallback((actionType: ActionType): CollarEvent => {
    const event: CollarEvent = {
      id: crypto.randomUUID(),
      actionType,
      message: randomMessage(actionType),
      detectedAt: new Date().toISOString(),
      committed: false,
    };

    setState(prev => {
      // Keep last 10 events only
      const collarEvents = [event, ...prev.collarEvents].slice(0, 10);
      const next: DemoState = { ...prev, collarEvents };
      saveDemoState(next);
      return next;
    });

    return event;
  }, []);

  // Commit a collar event into a real CareLog (source: 'device')
  const commitCollarEvent = useCallback((eventId: string) => {
    setState(prev => {
      const event = prev.collarEvents.find(e => e.id === eventId);
      if (!event || event.committed) return prev;

      const config = ACTION_CONFIGS.find(c => c.type === event.actionType)!;
      const newLog: CareLog = {
        id: crypto.randomUUID(),
        pet_id: DEMO_PET_ID,
        user_id: 'demo',
        action_type: event.actionType,
        love_value: config.loveValue,
        emotional_translation: event.message,
        note: '',
        photo_url: '',
        source: 'device',
        created_at: event.detectedAt,
      };

      const collarEvents = prev.collarEvents.map(e =>
        e.id === eventId ? { ...e, committed: true } : e
      );

      const next: DemoState = {
        ...prev,
        pet: { ...prev.pet, love_score: prev.pet.love_score + newLog.love_value },
        logs: [newLog, ...prev.logs],
        collarEvents,
      };
      saveDemoState(next);
      return next;
    });
  }, []);

  // Convert verified love → BOND tokens (100 verified = 1 BOND)
  const convertVerifiedLove = useCallback((amount: number, currentVerified: number) => {
    setState(prev => {
      const safe = Math.min(amount, currentVerified);
      if (safe <= 0) return prev;
      const tokens = safe / 100;
      const newScore = Math.max(0, prev.pet.love_score - safe);
      const next: DemoState = {
        ...prev,
        pet: { ...prev.pet, love_score: newScore },
        wallet: { bondTokens: prev.wallet.bondTokens + tokens },
      };
      saveDemoState(next);
      return next;
    });
  }, []);

  const updatePet = useCallback((updates: Partial<Pet>) => {
    setState(prev => {
      const next: DemoState = { ...prev, pet: { ...prev.pet, ...updates } };
      saveDemoState(next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback((petData: {
    name: string;
    species: string;
    breed?: string;
    photoUrl: string;
    age?: string;
    description?: string;
  }) => {
    setState(prev => {
      const next: DemoState = {
        ...prev,
        pet: {
          ...prev.pet,
          name: petData.name,
          species: petData.species,
          photo_url: petData.photoUrl,
          love_score: 0,
        },
        logs: [],
        onboardingComplete: true,
      };
      saveDemoState(next);
      return next;
    });
  }, []);

  const addAfterMemory = useCallback((category: AfterCategory, body: string): AfterBondaMemory => {
    const entry: AfterBondaMemory = {
      id: crypto.randomUUID(),
      category,
      body,
      created_at: new Date().toISOString(),
    };
    setState(prev => {
      const next: DemoState = {
        ...prev,
        afterMemories: [entry, ...prev.afterMemories],
        pet: { ...prev.pet, love_score: prev.pet.love_score + 30 },
      };
      saveDemoState(next);
      return next;
    });
    return entry;
  }, []);

  // ── Voice memories ─────────────────────────────────────────────────────
  const addVoiceMemory = useCallback((entry: Omit<VoiceMemory, 'id' | 'created_at'>): VoiceMemory => {
    const memory: VoiceMemory = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...entry,
    };
    setState(prev => {
      const next: DemoState = {
        ...prev,
        voiceMemories: [memory, ...prev.voiceMemories],
        pet: { ...prev.pet, love_score: prev.pet.love_score + 15 },
      };
      saveDemoState(next);
      return next;
    });
    return memory;
  }, []);

  // ── Presence chat ──────────────────────────────────────────────────────
  const appendPresenceMessage = useCallback((msg: Omit<PresenceMessage, 'id' | 'created_at'>): PresenceMessage => {
    const message: PresenceMessage = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...msg,
    };
    setState(prev => {
      const next: DemoState = {
        ...prev,
        presenceMessages: [...prev.presenceMessages, message],
      };
      saveDemoState(next);
      return next;
    });
    return message;
  }, []);

  const clearPresenceMessages = useCallback(() => {
    setState(prev => {
      const next: DemoState = { ...prev, presenceMessages: [] };
      saveDemoState(next);
      return next;
    });
  }, []);

  // ── Memory capsules + Solana verifications ─────────────────────────────
  const addCapsule = useCallback((capsule: MemoryCapsule) => {
    setState(prev => {
      const next: DemoState = { ...prev, capsules: [capsule, ...prev.capsules] };
      saveDemoState(next);
      return next;
    });
  }, []);

  const addVerification = useCallback((v: Verification) => {
    setState(prev => {
      const next: DemoState = { ...prev, verifications: [v, ...prev.verifications] };
      saveDemoState(next);
      return next;
    });
  }, []);

  const awakenPresence = useCallback(() => {
    setState(prev => {
      if (prev.presenceAwakened) return prev;
      const next: DemoState = { ...prev, presenceAwakened: true };
      saveDemoState(next);
      return next;
    });
  }, []);

  // ── Sample profile loader (Baobao) ─────────────────────────────────────
  const loadBaobaoDemo = useCallback(() => {
    const demo = buildBaobaoDemoState();
    saveDemoState(demo);
    setState(demo);
  }, []);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('bonda_demo_owner_pubkey');
    const fresh = loadDemoState();
    setState(fresh);
  }, []);

  const addBondMemory = useCallback((promptId: BondPromptId, body: string): BondMemory => {
    const entry: BondMemory = {
      id: crypto.randomUUID(),
      prompt_id: promptId,
      body,
      created_at: new Date().toISOString(),
    };
    setState(prev => {
      const next: DemoState = {
        ...prev,
        bondMemories: [entry, ...prev.bondMemories],
        pet: { ...prev.pet, love_score: prev.pet.love_score + 20 },
      };
      saveDemoState(next);
      return next;
    });
    return entry;
  }, []);

  const todayLove = state.logs
    .filter(l => new Date(l.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, l) => sum + l.love_value, 0);

  const presenceProgress = Math.min(100, Math.floor((state.pet.love_score / 500) * 100));
  const presenceStage =
    state.pet.love_score < 100 ? 'care'
    : state.pet.love_score < 300 ? 'relationship'
    : 'presence';

  const signals = computeSignals(state.logs);
  const verifiedLove = computeVerifiedLove(state.pet.love_score, signals);

  return {
    pet: state.pet,
    logs: state.logs,
    wallet: state.wallet,
    collarConnected: state.collarConnected,
    collarEvents: state.collarEvents,
    onboardingComplete: state.onboardingComplete,
    signals,
    verifiedLove,
    todayLove,
    presenceProgress,
    presenceStage,
    stageCareAction,
    commitLoveScore,
    detectCollarEvent,
    commitCollarEvent,
    convertVerifiedLove,
    updatePet,
    completeOnboarding,
    afterMemories: state.afterMemories,
    addAfterMemory,
    bondMemories: state.bondMemories,
    narrativeMemories: state.narrativeMemories,
    addBondMemory,
    coinMinted: state.coinMinted,
    mintCoin: useCallback(() => {
      setState(prev => {
        const next: DemoState = { ...prev, coinMinted: true };
        saveDemoState(next);
        return next;
      });
    }, []),
    voiceMemories: state.voiceMemories,
    addVoiceMemory,
    presenceMessages: state.presenceMessages,
    appendPresenceMessage,
    clearPresenceMessages,
    capsules: state.capsules,
    addCapsule,
    verifications: state.verifications,
    addVerification,
    presenceAwakened: state.presenceAwakened,
    awakenPresence,
    loadBaobaoDemo,
    resetDemo,
  };
}
