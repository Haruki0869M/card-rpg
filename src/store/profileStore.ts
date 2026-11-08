// ===== 伝承の書の記録の保存（この端末の localStorage。冒険の保存・設定とは別。K5） =====
// 冒険の状態が変わるたびに、見た物・手に入れた物を記録に足す。冒険の状態・同期・乱数には触れない。
import { create } from 'zustand';
import type { GameState } from '../types';
import { isLocalPlayer } from './battleConfig';
import { collectSightings, emptyProfile, mergeSightings, normalizeProfile, type Profile } from './profile';

export const PROFILE_KEY = 'card-rpg/profile';

function loadProfile(): Profile {
  try {
    return normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null'));
  } catch {
    return emptyProfile();
  }
}

function writeProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // 保存できなくても普通に遊べる
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** 書き込みは続けて起きた変化をまとめて1回にする */
function scheduleWrite(get: () => Profile) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    writeProfile(get());
  }, 400);
}

interface ProfileStore {
  profile: Profile;
  /** 冒険の状態を見て、記録に足す（増えた時だけ保存） */
  observe: (game: GameState | null) => void;
  /** 記録を差し替える（うちの子図鑑の登録など） */
  update: (fn: (p: Profile) => Profile) => void;
}

export const useProfile = create<ProfileStore>((set, get) => ({
  profile: loadProfile(),
  observe: (game) => {
    if (!game) return;
    let next: Profile;
    try {
      next = mergeSightings(get().profile, collectSightings(game, isLocalPlayer));
    } catch {
      return; // 記録に失敗しても遊びは止めない
    }
    if (next === get().profile) return;
    set({ profile: next });
    scheduleWrite(() => get().profile);
  },
  update: (fn) => {
    const next = fn(get().profile);
    if (next === get().profile) return;
    set({ profile: next });
    scheduleWrite(() => get().profile);
  },
}));
