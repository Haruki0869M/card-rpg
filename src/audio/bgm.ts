// ===== 場面 → BGM（K6） =====
// どの場面でどの曲を流すかを1か所で決める。曲のファイルが無ければ無音（player が何もしない）。
// シナリオ別の曲（bgm_sc1〜7）は、曲が決まったらここの表に足す。今は共通の曲。

import { getRoomType } from '../data/rules';
import { timeOfDay } from '../engine/game/world/time';
import type { GameState } from '../types';
import type { BgmId } from './ids';
import { playBgm, playSound } from './player';

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
    // 報酬・敗北・クリア・エンディングはジングルを聞かせるので曲を止める
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
  let lastMode: string | undefined;
  const apply = (s: { screen: string; game: GameState | null }) => {
    const mode = s.screen === 'game' ? s.game?.mode : undefined;
    if (mode !== lastMode) { if (mode === 'ending' && lastMode !== undefined) playSound('jgl_ending'); lastMode = mode; }
    const id = bgmFor(s.screen, s.game);
    if (id === last) return;
    last = id;
    playBgm(id);
  };
  apply(store.getState());
  store.subscribe(apply);
}
