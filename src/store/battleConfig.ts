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
  // 票の取り消し・入れ直しを、その席として送る（イベントの選択肢の取り消し。実機の不具合① 2026-11-14）。この端末の席でなければ、今までどおり
  if (cmd.type === 'VOTE' && isLocalPlayer(cmd.playerId)) return cmd.playerId;
  const c = cmd as Record<string, unknown>;
  let id = (c.heroId ?? c.userId ?? c.fromHeroId) as string | undefined;
  if (cmd.type === 'CHOOSE_GROWTH') id = game.reward?.levelUps[0]?.heroId;
  if (cmd.type === 'PICK_CARD' && cmd.offerIndex !== null) id = game.reward?.cardOffers[cmd.offerIndex]?.heroId;
  if (id) return heroPlayer(id) ?? first;
  const owner = heroPlayer(sceneOwnerId(game));
  // オンライン協力: キャラを指さない操作（物語を進める・報酬を閉じるなど）は、押した人の操作。
  // ただし、その場面の担当の席を、この端末が動かせる時（ホストが「代わりに操作」している席）は、その席で送る（点検 2026-11-13 F1）。
  // ダンジョンの場面は、場面にいるのが1つの席のキャラだけの時、その席を担当とみなす（オンラインだけ。1台の時の動きは変えない）
  if (localPlayers) {
    const seat = owner ?? soleScenePlayer(game);
    return seat && localPlayers.includes(seat) ? seat : myPlayer();
  }
  return owner ?? first;
}

/**
 * キャラを指さない操作の、その場面の担当のキャラ。
 * 世界マップから開いた画面（町・祠・神殿・遭遇・マスの宝箱とイベント）は訪れたキャラか手番のキャラ。
 * ダンジョン内の操作と投票は従来の経路に任せる（undefined）
 */
function sceneOwnerId(game: GameState): string | undefined {
  if (!game.world) return undefined;
  if (!game.activeScene) {
    if (game.mode === 'town') return game.town?.heroId;
    if (game.mode === 'shrine') return game.shrine?.heroId;
    if (game.mode === 'sanctuary') return game.sanctuary?.heroId;
    if (game.mode === 'encounter') return game.encounter?.heroId;
    if ((game.mode === 'event' && game.event?.tile !== undefined) || (game.mode === 'chest' && game.chest?.tile !== undefined)) return game.world.turn;
  }
  if (game.mode === 'world') return game.world.turn;
  return undefined;
}

/** ダンジョンの場面（見ている組）にいる生きているキャラが、1つの席の物だけなら、その席 */
function soleScenePlayer(game: GameState): PlayerId | undefined {
  if (!game.activeScene) return undefined;
  const seats = new Set(game.heroes.filter((h) => !h.retired && h.hp > 0 && (!game.party || game.party.includes(h.id))).map((h) => h.playerId));
  return seats.size === 1 ? [...seats][0] : undefined;
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
