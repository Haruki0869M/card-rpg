// ===== 場面 → BGM（K6） =====
// どの場面でどの曲を流すかを1か所で決める。曲のファイルが無ければ無音（player が何もしない）。
// シナリオ別の曲（bgm_sc1〜7）は、曲が決まったらここの表に足す。今は共通の曲。

import { getRoomType } from '../data/rules';
import { timeOfDay } from '../engine/game/world/time';
import type { GameState } from '../types';
import type { BgmId } from './ids';
import { playBgm, type BgmLoop } from './player';

/**
 * 曲ごとのつなぎ方（音の担当の sound-pick-bgm.md の「使う版」より）。ループ版の曲は継ぎ目なく、
 * ループ用でない曲は終わりの2秒を重ねてつなぐ。エンディングは1回だけ。書いていない曲は crossfade。
 */
export const BGM_LOOP: Partial<Record<BgmId, BgmLoop>> = {
  bgm_title: 'crossfade', bgm_town: 'crossfade', bgm_world_day: 'seamless', bgm_world_night: 'crossfade',
  bgm_dungeon: 'crossfade', bgm_battle: 'crossfade', bgm_boss: 'seamless', bgm_camp: 'crossfade',
  bgm_chest: 'seamless', bgm_ending: 'once',
};

/** その画面で流す曲。null = 止める（勝利・敗北のジングルの間など） */
export function bgmFor(screen: string, game: GameState | null): BgmId | null {
  if (screen !== 'game' || !game) return 'bgm_title';
  const night = game.world ? timeOfDay(game.world.worldTurn) === 'night' : false;
  switch (game.mode) {
    case 'battle': {
      if (game.battle && game.battle.phase !== 'ally' && game.battle.phase !== 'enemy') return null;
      const room = game.dungeon?.rooms.find((r) => r.id === game.dungeon!.currentRoomId);
      return room && getRoomType(room.type).battle?.boss ? 'bgm_boss' : 'bgm_battle';
    }
    case 'dungeon': return 'bgm_dungeon';
    case 'town': return 'bgm_town';
    case 'rest': case 'shrine': case 'sanctuary': return 'bgm_camp';
    case 'chest': return 'bgm_chest';
    case 'event': if (game.dungeon) return 'bgm_dungeon'; return night ? 'bgm_world_night' : 'bgm_world_day';
    case 'world': case 'encounter': case 'hub': return night ? 'bgm_world_night' : 'bgm_world_day';
    case 'ending': return 'bgm_ending';
    // 報酬・敗北・クリアはジングルを聞かせるので曲を止める
    default: return null;
  }
}

interface Watchable { getState(): { screen: string; game: GameState | null }; subscribe(fn: (s: { screen: string; game: GameState | null }) => void): () => void }

let installed = false;
/** 1回だけ呼ぶ。画面が変わるたびに曲を合わせる（同じ曲なら流し続ける） */
export function installBgm(store: Watchable): void {
  if (installed) return;
  installed = true;
  let last: BgmId | null | undefined;
  const apply = (s: { screen: string; game: GameState | null }) => {
    const id = bgmFor(s.screen, s.game);
    if (id === last) return;
    last = id;
    playBgm(id, id ? BGM_LOOP[id] ?? 'crossfade' : undefined);
  };
  apply(store.getState());
  store.subscribe(apply);
}
