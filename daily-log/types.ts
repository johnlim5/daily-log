// カテゴリの型定義を追加
export type Category = 'Morning' | 'Afternoon' | 'Evening';

export enum Tab {
  TRACKER = 'TRACKER',
  MANAGE = 'MANAGE',
  HISTORY = 'HISTORY',
  ANALYSIS = 'ANALYSIS'
}

export interface Routine {
  id: string;
  title: string;
  emoji: string;
  color: string;
  order: number;
  category: Category; // ここを追加
}

export interface RoutineLog {
  id: string;
  routineId: string;
  timestamp: number;
  note?: string;
}

// 既存の色設定（App.tsxで使っているもの）
export const TAILWIND_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

// 既存の絵文字プリセット
export const EMOJI_PRESETS = [
  '☀️', '🏃', '🧘', '💧', '💊', '📚', '🧹', '🥗', 
  '🌤', '☕️', '💻', '🚶', '🍎', '💪', '🦷', '🛁',
  '🌙', '🕯', '📝', '🧘‍♀️', '🛌', '🧼', '🥦', '🥛'
];