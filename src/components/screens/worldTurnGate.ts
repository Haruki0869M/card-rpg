// ===== 世界マップのマスの場面（宝箱など）で「だれが押せるか」の判断（画面用の純粋な関数） =====
// 2026-11-10 の実機の不具合: オンラインの宝箱で、「手番の人が選んでいます」の覆いが
// 「だれが開ける？」の一覧に重なって P2 が押せなかった。開け役は全員で決める操作なので、
// 宝箱の間は覆いを出さず、宝箱の画面が「手番の人だけが押せるボタン」を自分で出し分ける（オーナーの決定 4-B）。
import { chestShared, findHero, needsVote, voters } from '../../engine';
import { facilityMembers } from '../../engine/game/world/facilities';
import type { GameCommand, GameState, Hero, PlayerId } from '../../types';

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
 * 祠に、2人以上のプレイヤーのキャラが一緒に入ったか（同行して入った祠）。
 * 2026-11-15 の実機の不具合: P2 が先に祈って「世界マップへ」を押した後、P1 の画面の下に覆いが出たまま、
 * P1 の「世界マップへ」が覆いの下に隠れて押せず、お互いに待って止まった。
 * 祈るのは先に押した人（エンジンの「もう祈りました」）、出るのは全員がそれぞれ押す操作なので、覆いは出さない（オーナーの決定 A）。
 * 1人のプレイヤーが複数のキャラで入った祠は、今までどおり（false）
 */
export function shrineShared(game: GameState): boolean {
  if (game.mode !== 'shrine' || !game.shrine) return false;
  const owners = new Set(facilityMembers(game).flatMap((id) => {
    const h = findHero(game, id);
    return h ? [h.playerId] : [];
  }));
  return owners.size > 1;
}

/**
 * 「〇〇さんが選んでいます」の覆い（TurnLock）を出すか。
 * 2人以上のプレイヤーがいる宝箱（開け役の投票・取り合い）と、2人以上のプレイヤーが一緒に入った祠では出さない: 全員が押す操作があるため
 */
export function showTurnLock(game: GameState, isLocal: (p: PlayerId) => boolean): boolean {
  if (!game.world || game.activeScene) return false;
  const onTile = (game.mode === 'event' && game.event?.tile !== undefined) || (game.mode === 'chest' && game.chest?.tile !== undefined) || game.mode === 'shrine';
  if (!onTile) return false;
  if (game.mode === 'chest' && chestShared(game)) return false;
  if (shrineShared(game)) return false;
  const turnHero = game.heroes.find((h) => h.id === (game.mode === 'shrine' ? game.shrine?.heroId : game.world!.turn));
  return !!turnHero && !isLocal(turnHero.playerId);
}

/**
 * みんなで決める操作（報酬の「先へ進む」・宝箱の開け役の「任せる」・「立ち去る」・秘宝 など）を、この端末が押しても票が入らないか。
 * 票を入れられるのは、その場面にいる生きているキャラの担当だけ（エンジンの castVote・画面の dispatchGame の「この場面のプレイヤーではありません」）。
 * その戦闘・宝箱に出ていない人の画面では、ボタンを薄くして押せなくし、だれが選んでいるかを出す（2026-11-19 検証 bot の指摘。c4d9d83 と同じ考え方）。
 * 1人で決める場面（票にならない）は、今までどおり false
 */
export function voteOutsider(game: GameState, cmd: GameCommand, isLocal: (p: PlayerId) => boolean): boolean {
  return needsVote(game, cmd) && !voters(game).some(isLocal);
}
