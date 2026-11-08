// プレイヤーと名前の決め方
import { CLASSES } from '../data/classes';
import type { Command, GameCommand, GameState, Gender, PlayerId } from '../types';

/** この端末のプレイヤー（オンライン協力では部屋ごとに決まる。M3-B） */
export const LOCAL_PLAYER: PlayerId = 'P1';
export const PLAYER_IDS: PlayerId[] = ['P1', 'P2', 'P3', 'P4'];

let localPlayers: PlayerId[] | null = null;
/** オンライン協力: この端末で操作できるプレイヤー（null = ローカル。全員この端末） */
export const setLocalPlayers = (p: PlayerId[] | null) => {
  localPlayers = p;
};
export const isOnlinePlay = () => localPlayers !== null;

/**
 * この端末で操作できるプレイヤーか。
 * ローカル協力（1台を回して遊ぶ。spec §7.3）では全員がこの端末なので、いつも true。
 * オンライン協力では、自分の席（ホストなら、代わりに操作している席も）だけ
 */
export const isLocalPlayer = (id: PlayerId): boolean => !localPlayers || localPlayers.includes(id);

/** この端末の代表のプレイヤー（誰の操作でもよいコマンドに使う） */
export const myPlayer = (): PlayerId => localPlayers?.[0] ?? LOCAL_PLAYER;

/** コマンドを送るプレイヤー（ローカル協力: そのキャラの担当プレイヤーとして送る） */
export function actorOf(game: GameState, cmd: GameCommand): PlayerId {
  const heroPlayer = (id?: string) => (id ? game.heroes.find((h) => h.id === id)?.playerId : undefined);
  const first = localPlayers ? myPlayer() : (game.heroes.find((h) => !h.retired)?.playerId ?? LOCAL_PLAYER);
  const c = cmd as Record<string, unknown>;
  let id = (c.heroId ?? c.userId) as string | undefined;
  if (cmd.type === 'CHOOSE_GROWTH') id = game.reward?.levelUps[0]?.heroId;
  if (cmd.type === 'PICK_CARD' && cmd.offerIndex !== null) id = game.reward?.cardOffers[cmd.offerIndex]?.heroId;
  // オンライン協力: キャラを指さない操作（物語を進める・報酬を閉じるなど）は、押した人の操作
  if (!id && localPlayers) return myPlayer();
  // ローカル協力では、世界マップから開いた画面でも担当者を引き継ぐ。
  // ダンジョン内の操作と投票は従来の経路に任せる。
  if (!id && game.world && !game.activeScene) {
    if (game.mode === 'town') id = game.town?.heroId;
    else if (game.mode === 'shrine') id = game.shrine?.heroId;
    else if (game.mode === 'sanctuary') id = game.sanctuary?.heroId;
    else if (game.mode === 'encounter') id = game.encounter?.heroId;
    else if ((game.mode === 'event' && game.event?.tile !== undefined)
      || (game.mode === 'chest' && game.chest?.tile !== undefined)) id = game.world.turn;
  }
  if (!id && game.world && game.mode === 'world') id = game.world.turn;
  return heroPlayer(id) ?? first;
}

/** 戦闘のコマンドを送るプレイヤー */
export function battleActorOf(game: GameState, cmd: Command): PlayerId {
  const b = game.battle;
  const id = 'characterId' in cmd ? cmd.characterId : undefined;
  if (localPlayers && !id) return 'playerId' in cmd ? cmd.playerId : myPlayer();
  return b?.allies.find((a) => a.id === id)?.playerId ?? b?.allies[0]?.playerId ?? LOCAL_PLAYER;
}

/** 職業と性別に合った名前（同じ名前が並ばないよう index でずらす） */
export function autoName(classId: string, gender: Gender, index: number): string {
  const list = CLASSES.get(classId).names[gender];
  return list[index % list.length];
}
