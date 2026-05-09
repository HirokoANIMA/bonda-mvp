export interface Database {
  public: {
    Tables: {
      pets: {
        Row: Pet;
        Insert: Omit<Pet, 'id' | 'created_at'>;
        Update: Partial<Omit<Pet, 'id' | 'created_at'>>;
      };
      care_logs: {
        Row: CareLog;
        Insert: Omit<CareLog, 'id' | 'created_at'>;
        Update: Partial<Omit<CareLog, 'id' | 'created_at'>>;
      };
      presence_milestones: {
        Row: PresenceMilestone;
        Insert: Omit<PresenceMilestone, 'id' | 'achieved_at'>;
        Update: Partial<Omit<PresenceMilestone, 'id' | 'achieved_at'>>;
      };
    };
  };
}

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: string;
  photo_url: string;
  love_score: number;
  created_at: string;
}

export interface CareLog {
  id: string;
  pet_id: string;
  user_id: string;
  action_type: ActionType;
  love_value: number;
  emotional_translation: string;
  note: string;
  photo_url: string;
  source: 'manual' | 'device';
  created_at: string;
}

export interface PresenceMilestone {
  id: string;
  pet_id: string;
  stage: 'care' | 'relationship' | 'presence';
  achieved_at: string;
  description: string;
}

export type ActionType = 'walk' | 'feed' | 'touch' | 'talk' | 'groom' | 'play' | 'sleep' | 'photo' | 'memory';

export type AfterCategory = 'food' | 'habits' | 'places' | 'memories' | 'words' | 'regrets' | 'gratitude';

export interface AfterBondaMemory {
  id: string;
  category: AfterCategory;
  body: string;
  created_at: string;
}

// A written memory entry from guided prompts
export type BondPromptId = 'being' | 'name' | 'relationship' | 'most_love' | 'unforgettable' | 'tell_them' | 'say_now';

export interface BondMemory {
  id: string;
  prompt_id: BondPromptId;
  body: string;
  created_at: string;
}

// A narrative memory auto-generated from a care log
export interface NarrativeMemory {
  id: string;
  care_log_id: string;
  action_type: ActionType;
  narrative: string;
  created_at: string;
}

// A voice memory — captured via MediaRecorder and stored as a base64 data URL
// for the demo. In production, the audio blob goes to Supabase Storage and
// only the content_hash is referenced on Solana.
export interface VoiceMemory {
  id: string;
  title: string;
  transcript: string;      // demo-only mock transcript
  audio_data_url: string;  // base64 data URL of the recording
  duration_ms: number;
  created_at: string;
}

// A chat-style message in the Presence conversation
export interface PresenceMessage {
  id: string;
  role: 'user' | 'presence';
  body: string;
  created_at: string;
}

// Unified memory capsule envelope — what gets hashed + verified on Solana.
// Private `body`/`media_url` stays in Supabase. Only `content_hash`, `kind`,
// and `id` go on-chain.
export interface MemoryCapsule {
  id: string;
  kind: 'text' | 'photo' | 'voice' | 'care' | 'story';
  title: string;
  body: string;
  media_url: string;
  duration_ms: number;
  content_hash: string;
  created_at: string;
}

export interface ActionConfig {
  type: ActionType;
  label: string;
  loveValue: number;
  icon: string;
  color: string;
  translations: string[];
  translations_ja: string[];
}

export const ACTION_CONFIGS: ActionConfig[] = [
  {
    type: 'walk',
    label: 'Walk',
    loveValue: 20,
    icon: '🐾',
    color: 'bg-sage-50 border-sage-200 text-sage-700',
    translations: [
      'You walked together. Every step was a quiet promise.',
      'That evening walk became part of your bond.',
      'You moved through the world side by side. That became love.',
    ],
    translations_ja: [
      '一緒に歩いた時間が、愛として残りました。',
      '並んで歩いたその道が、絆の一部になりました。',
      '一歩ずつ、ふたりの物語が刻まれていきました。',
    ],
  },
  {
    type: 'feed',
    label: 'Food',
    loveValue: 10,
    icon: '🍚',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    translations: [
      'You nourished them. That care became love.',
      'Every meal you prepare is a small act of devotion.',
      'You fed them with your own hands. That moment is love.',
    ],
    translations_ja: [
      'ごはんの時間も、大切な記憶です。',
      'あなたの手で準備されたごはんが、愛になりました。',
      '毎日の食事が、静かな献身のかたちです。',
    ],
  },
  {
    type: 'touch',
    label: 'Touch',
    loveValue: 12,
    icon: '🤍',
    color: 'bg-rose-50 border-rose-200 text-rose-700',
    translations: [
      'You reached out. That closeness became love.',
      'In that touch, they felt entirely safe.',
      'Your warmth reached them. That is love made real.',
    ],
    translations_ja: [
      'そっと触れたぬくもりが、ここに残りました。',
      'その距離の近さが、安心になりました。',
      'あなたのぬくもりが、届きました。',
    ],
  },
  {
    type: 'talk',
    label: 'Talk',
    loveValue: 8,
    icon: '💬',
    color: 'bg-sky-50 border-sky-200 text-sky-700',
    translations: [
      'You spoke to them. Your voice is their comfort.',
      'Every word you share is a thread in your bond.',
      'You talked. They listened. That is its own kind of love.',
    ],
    translations_ja: [
      '声をかけた時間が、関係を深めました。',
      'あなたの声が、この子の安らぎです。',
      '言葉を交わすたびに、ふたりの絆が育ちます。',
    ],
  },
  {
    type: 'groom',
    label: 'Groom',
    loveValue: 15,
    icon: '✨',
    color: 'bg-sage-50 border-sage-200 text-sage-600',
    translations: [
      'You cared for them carefully. That tenderness became love.',
      'Your hands were gentle. They trusted you completely.',
      'Grooming is a quiet language. You spoke it with care.',
    ],
    translations_ja: [
      'ていねいに整えてあげた時間が、愛になりました。',
      'やさしい手つきが、信頼を育てました。',
      'ケアの時間は、静かな愛の言葉です。',
    ],
  },
  {
    type: 'play',
    label: 'Play',
    loveValue: 18,
    icon: '🎾',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    translations: [
      'You played together. Joy like that doesn\'t disappear.',
      'In that moment of play, everything else fell away.',
      'You gave them delight. That is love in its purest form.',
    ],
    translations_ja: [
      '遊んだ時間が、ふたりの記憶になりました。',
      'いっしょに過ごしたその喜びは、消えません。',
      '夢中になったその瞬間が、愛のかたちです。',
    ],
  },
  {
    type: 'sleep',
    label: 'Sleep',
    loveValue: 10,
    icon: '🌙',
    color: 'bg-slate-50 border-slate-200 text-slate-600',
    translations: [
      'You stayed close while they rested. That is care.',
      'Rest is a form of trust. They gave it to you.',
      'You kept them safe through the night.',
    ],
    translations_ja: [
      'そばで眠る時間も、愛の一部です。',
      '安心して眠れたのは、あなたがいたからです。',
      '静かな夜に、ふたりの絆がありました。',
    ],
  },
  {
    type: 'photo',
    label: 'Photo',
    loveValue: 8,
    icon: '📸',
    color: 'bg-warm-50 border-warm-300 text-stone-600',
    translations: [
      'You captured a moment that would otherwise slip away.',
      'This image holds something words cannot.',
      'You saw something worth keeping. That is attention.',
    ],
    translations_ja: [
      '写真が、存在の輪郭を少しずつ濃くします。',
      'その瞬間を残そうとした気持ちが、愛です。',
      '言葉では届かないものが、この写真にあります。',
    ],
  },
  {
    type: 'memory',
    label: 'Memory',
    loveValue: 25,
    icon: '✨',
    color: 'bg-stone-50 border-stone-200 text-stone-700',
    translations: [
      'You made a memory. It is yours forever.',
      'This moment is now part of your shared story.',
      'You stopped and noticed. That act of attention is love.',
    ],
    translations_ja: [
      '思い出を預けることで、存在が育ちます。',
      'その記憶は、ずっとここにあります。',
      '立ち止まって気づいたこと、それが愛です。',
    ],
  },
];
