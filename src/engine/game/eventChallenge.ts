// ===== イベントの2段階の合意（実機の不具合① 2026-11-14・案A。計画: docs/tasks/realdevice-coop-fix-plan.md） =====
// 2人以上のプレイヤーでダンジョンのイベントに出会った時:
//   (1) 選ぶ段: どの選択肢にするかだけを、みんなで決める（票にキャラとフォーカスは入れない）
//   (2) 挑む段: 判定つきの選択肢なら、その判定がいちばん得意なキャラ（挑む役）の持ち主だけがフォーカスを決めて挑む
// 判定の無い選択肢は、決まったらすぐ実行（払う物があれば、払う役 = 払えるキャラのうち並び順で最初のキャラが払う）。
// 1人で遊ぶ時（プレイヤーが1人）と世界マップのマスのイベントは、今までどおり（選ぶ → キャラとフォーカス → 挑戦）。
// ここの関数は状態を変えない（画面・bot・エンジンが同じ決め方を使う。乱数は引かない）
import { EVENTS } from '../../data/events';
import type { EventOption, GameCommand, GameState, Hero } from '../../types';
import { statChance } from './common';
import { sceneHeroes } from './heroes';
import { needsVote } from './votes';

const PROBE: GameCommand = { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 0, focusUsed: 0 };

/** このイベントの選択を、みんなで決めるか（ダンジョンの中で、場面のプレイヤーが2人以上） */
export const eventShared = (game: GameState): boolean => game.mode === 'event' && !!game.event && needsVote(game, PROBE);

/** そのキャラが、選択肢の払う物（お金・フォーカス・道具）を払えるか */
export const canPayOption = (h: Hero, opt: EventOption): boolean =>
  (!opt.cost || h.gold >= opt.cost) && (!opt.costFocus || h.focus >= opt.costFocus) && (!opt.costItem || h.pouch.some((i) => i.itemId === opt.costItem));

/**
 * その選択肢に挑めるキャラ（場面の生きているキャラで、払う物を払えるキャラ）を、得意な順に。
 * 同じ成功率なら、場面の並び順（端末によらない決め方。点検 F5-5）
 */
export function eventChallengers(game: GameState, optionIndex: number): Hero[] {
  const ev = game.event;
  const opt = ev ? EVENTS.get(ev.eventId).options[optionIndex] : undefined;
  if (!opt?.check) return [];
  const c = opt.check;
  const list = sceneHeroes(game).filter((h) => canPayOption(h, opt));
  // Array.prototype.sort は安定（同じ値なら元の並びのまま）
  return list.map((h, i) => ({ h, i, p: statChance(h, c.stat, c.tag, true) })).sort((a, b) => b.p - a.p || a.i - b.i).map((x) => x.h);
}

/**
 * 挑む段の、今の挑む役。記録したキャラが場面にいない・倒れた・払えなくなった時は、次に得意なキャラ（点検 F5-4）。
 * 挑めるキャラがいなければ undefined（だれでも「選び直す」を押せる）
 */
export function eventChallenger(game: GameState): Hero | undefined {
  const d = game.event?.decided;
  if (!d || game.event?.result) return undefined;
  const list = eventChallengers(game, d.optionIndex);
  return list.find((h) => h.id === d.heroId) ?? list[0];
}

/**
 * 判定の無い「払う選択肢」で、だれが払うか（オーナーの返事 2026-11-14・おすすめ案 A）:
 * 払えるキャラのうち、場面の並び順で最初のキャラ。払う物が無い選択肢は undefined
 */
export function eventPayer(game: GameState, optionIndex: number): Hero | undefined {
  const ev = game.event;
  const opt = ev ? EVENTS.get(ev.eventId).options[optionIndex] : undefined;
  if (!opt || opt.check || !(opt.cost || opt.costFocus || opt.costItem)) return undefined;
  return sceneHeroes(game).find((h) => canPayOption(h, opt));
}

/** 挑む役が使えるフォーカスの上限（判定の枠の数と、払うフォーカスを引いた残りの少ない方） */
export function challengeFocusMax(h: Hero, opt: EventOption): number {
  return Math.max(0, Math.min(opt.check?.slots ?? 0, h.focus - (opt.costFocus ?? 0)));
}
