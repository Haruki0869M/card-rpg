// ===== 世界マップのマスの場面（宝箱など）で「だれが押せるか」の判断（画面用の純粋な関数） =====
// 2026-11-10 の実機の不具合: オンラインの宝箱で、「手番の人が選んでいます」の覆いが
// 「だれが開ける？」の一覧に重なって P2 が押せなかった。開け役は全員で決める操作なので、
// 宝箱の間は覆いを出さず、宝箱の画面が「手番の人だけが押せるボタン」を自分で出し分ける（オーナーの決定 4-B）。
import { chestShared } from '../../engine';
import type { GameState, Hero, PlayerId } from '../../types';

/** 世界マップのマスの宝箱なら、その手番のキャラ（ダンジョンの中・世界マップの無い冒険・隠し宝箱でないマスの宝箱以外は undefined） */
export function worldChestTurnHero(game: GameState): Hero | undefined {
  if (game.activeScene || !game.world || game.mode !== 'chest' || game.chest?.tile === undefined) return undefined;
  return game.heroes.find((h) => h.id === game.world!.turn);
}

/**
 * 宝箱の「立ち去る」「先へ進む」を押せるか。
 * 世界マップの宝箱はエンジンが手番のキャラの担当だけを通す（leaveChest → worldTurnError）ので、画面も同じ人にだけボタンを出す。
 * 押せない人には waitFor（待つ相手のキャラ）を返す
 */
export function chestLeaveGate(game: GameState, isLocal: (p: PlayerId) => boolean): { canLeave: boolean; waitFor?: Hero } {
  const turnHero = worldChestTurnHero(game);
  if (!turnHero) return { canLeave: true };
  return isLocal(turnHero.playerId) ? { canLeave: true } : { canLeave: false, waitFor: turnHero };
}

/**
 * 「〇〇さんが選んでいます」の覆い（TurnLock）を出すか。
 * 2人以上のプレイヤーがいる宝箱（開け役の投票・取り合い）では出さない: 全員が押す操作があるため
 */
export function showTurnLock(game: GameState, isLocal: (p: PlayerId) => boolean): boolean {
  if (!game.world || game.activeScene) return false;
  const onTile = (game.mode === 'event' && game.event?.tile !== undefined) || (game.mode === 'chest' && game.chest?.tile !== undefined) || game.mode === 'shrine';
  if (!onTile) return false;
  if (game.mode === 'chest' && chestShared(game)) return false;
  const turnHero = game.heroes.find((h) => h.id === (game.mode === 'shrine' ? game.shrine?.heroId : game.world!.turn));
  return !!turnHero && !isLocal(turnHero.playerId);
}
