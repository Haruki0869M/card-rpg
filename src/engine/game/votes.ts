// ===== みんなで決める操作（M3-C） =====
// ダンジョンの中（次の部屋・撤退・イベントの選択・続ける など）と、戦闘の報酬の「続ける」は、
// 場面にいるプレイヤーが2人以上なら、全員が選んでから決まる。多数決で、同じ数なら先頭のキャラ（ダンジョンに入った人など）の人が決める。
// 1台で遊ぶ時は、画面がその端末のプレイヤー全員の分をまとめて入れるので、すぐに決まる。
import type { GameCommand, GameState, PlayerId, VoteState } from '../../types';
import { findHero, sceneHeroes } from './heroes';

/** みんなで決める操作の種類 */
/** 全員一致で決める操作（多数決にしない） */
export const UNANIMOUS = new Set<GameCommand['type']>(['ENTER_ROOM', 'CHEST_OPENER']);

export const VOTED_COMMANDS = new Set<GameCommand['type']>(['ENTER_ROOM', 'RETREAT', 'CHOOSE_EVENT', 'FINISH_EVENT', 'REST', 'LEAVE_CHEST', 'RETURN_TO_HUB', 'FINISH_REWARD', 'CHEST_OPENER', 'PICK_RELIC']);

/** 選べるプレイヤー（場面にいる、生きているキャラの担当） */
export const voters = (game: GameState): PlayerId[] => [...new Set(sceneHeroes(game).map((h) => h.playerId))];

/** 同じ数の時に決める人（場面の先頭のキャラの担当） */
export const voteLead = (game: GameState): PlayerId | undefined => {
  // 黄金箱の秘宝の3択（2026-11-14）: 同じ数なら、開けた人（開け役のキャラの担当）が決める
  const c = game.chest;
  const opener = game.mode === 'chest' && c?.relics?.length && c.relicPicked === undefined && c.opener ? findHero(game, c.opener)?.playerId : undefined;
  if (opener && voters(game).includes(opener)) return opener;
  return (game.party?.[0] ? findHero(game, game.party[0])?.playerId : undefined) ?? voters(game)[0];
};

/** 今の場面の目印（部屋・通路の位置・イベント・報酬・場の人数が変わったら、それまでの票は無効。人数 = 後から仲間が合流した時に、半分だけ集まった票で決まらないように） */
export const voteCtx = (game: GameState) => `${game.mode}:${game.dungeon?.currentRoomId ?? ''}:${game.dungeon?.pos ? `${game.dungeon.pos.x},${game.dungeon.pos.y}` : ''}:${game.event?.eventId ?? ''}:${game.event?.result ? 1 : 0}:${game.chest?.contents ? 1 : 0}${game.chest?.seal ?? ''}${game.chest?.relicPicked ?? ''}:${game.reward?.levelUps.length ?? ''}:${sceneHeroes(game).length}`;

/** その操作を、みんなで決める必要があるか（ダンジョンの中か、戦闘の報酬で、プレイヤーが2人以上） */
export function needsVote(game: GameState, cmd: GameCommand): boolean {
  if (!VOTED_COMMANDS.has(cmd.type)) return false;
  // 宝箱の開け役は、世界マップの宝箱でも（同行した仲間がいれば）みんなで決める
  if (!game.activeScene && cmd.type !== 'FINISH_REWARD' && cmd.type !== 'CHEST_OPENER') return false;
  return voters(game).length > 1;
}

/** 同じ選択とみなす目印（だれが出したか・判定するキャラは別でも、同じ選択肢なら同じ） */
export function voteKey(cmd: GameCommand): string {
  const c = cmd as Record<string, unknown>;
  // 宝箱の開け役は「だれに任せるか」が選択肢そのもの
  return JSON.stringify([cmd.type, c.roomId ?? null, c.optionIndex ?? null, c.kind ?? null, cmd.type === 'CHEST_OPENER' ? cmd.heroId : null]);
}

/** 今の票（場面が変わっていたら空） */
export function currentVote(game: GameState): VoteState | undefined {
  return game.vote && game.vote.ctx === voteCtx(game) ? game.vote : undefined;
}

/** その選択に入れたプレイヤー（画面に席の色で出す） */
export function votesFor(game: GameState, cmd: GameCommand): PlayerId[] {
  const v = currentVote(game);
  if (!v) return [];
  const k = voteKey(cmd);
  return (Object.entries(v.picks) as [PlayerId, GameCommand][]).filter(([, c]) => voteKey(c) === k).map(([p]) => p);
}

/** まだ選んでいないプレイヤー */
export const notVoted = (game: GameState): PlayerId[] => {
  const v = currentVote(game);
  return voters(game).filter((p) => !v?.picks[p]);
};

/** 全員そろった時に決まる操作（多数決。同じ数なら先頭の人の選択、その人が入れていなければ先に入れた方） */
export function tally(game: GameState, v: VoteState): GameCommand | undefined {
  const vs = voters(game);
  if (!vs.every((p) => v.picks[p])) return undefined;
  const groups = new Map<string, PlayerId[]>();
  for (const p of vs) {
    const k = voteKey(v.picks[p]!);
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  // 部屋の選択は全員一致（意見が分かれたら決まらず、選び直しを待つ。指摘1）
  if (groups.size > 1 && vs.some((p) => UNANIMOUS.has(v.picks[p]!.type))) return undefined;
  const max = Math.max(...[...groups.values()].map((g) => g.length));
  const top = [...groups.entries()].filter(([, g]) => g.length === max);
  const lead = voteLead(game);
  const [, winners] = top.find(([, g]) => lead && g.includes(lead)) ?? top[0];
  const by = lead && winners.includes(lead) ? lead : winners[0];
  return v.picks[by];
}
