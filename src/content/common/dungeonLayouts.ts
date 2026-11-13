// ===== シナリオ2〜7の手作りダンジョンの並びの「型」（2026-11-13・docs/review/2026-11-13-room-variety2.md） =====
// 残り6本の24か所は、前から4つの型（1つ目の鍵・2つ目の鍵・3つ目の鍵・最後）の写しだった。並びを直す時に、型ごとに1つ作り、
// ダンジョンごとのイベント（直す前にそのダンジョンで使っていた物）で埋める形にした。型の写しをやめる作業（点検の宿題 H5）は別の計画。
// シナリオ1の4か所は、それぞれのファイルに1つずつ書いてある。
//
// 並びの決まり（tests: src/engine/__tests__/dungeonShape.test.ts）:
// - どの道でも、続けて同じ種類の部屋に入らない・同じ行の部屋は全部ちがう種類
// - どの道でも、戦う部屋（ふつうの戦闘・強敵・中ボス・ボス）でない部屋が3つ以上続かない
// - どの道でも、ふつうの戦闘は鍵で3回以上・最後で4回以上（1つ目の鍵の型 keyLayout1 だけ 2回以上。2026-11-13 オーナーの OK）
// - 強敵の部屋は、同じ行に強敵でない部屋がある
// - どのダンジョンにも、強敵を1回も通らない道がある（2026-11-13 強敵の計画 柱3。2つ目の鍵の型は休憩を1行前に出した = 案イ）
import type { DungeonDef } from '../../types';

type Layout = NonNullable<DungeonDef['layout']>;

/** 型で使うイベント: 道中の物（浅い順）と、ボスの前の物語の部屋 */
export interface LayoutEvents {
  first: string;
  second?: string;
  story: string;
}

/**
 * 1つ目の鍵のダンジョン（8行）。
 * 2026-11-13（点検19の問題 A1・オーナーの OK）: この型だけ「どの道でも、ふつうの戦闘は2回以上」に緩め、選ぶ所を 6 に戻した
 * （直す前 bf628d5 と同じ数。1回目の直しでは 2 だった）。
 * ボスの前が「休憩 → 物語の部屋」なので、5行目は全部が戦う部屋（戦闘か強敵）。3行目も全部が戦う部屋（戦闘か強敵）。
 * 強敵の後の4行目は「イベントか戦闘」、イベントの後はふつうの戦闘だけ（強敵が2回続く道で、ふつうの戦闘が1回にならないように）
 */
export const keyLayout1 = (e: LayoutEvents): Layout => [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: e.first, next: [0, 1] },
    { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0, 1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'elite', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0, 1] },
    { type: 'event', eventId: e.second!, next: [0] },
    { type: 'battle', next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'elite', next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: e.story, next: [0] }],
  [{ type: 'boss', next: [] }],
];

/**
 * 2つ目の鍵のダンジョン（9行）。
 * 2026-11-13（強敵の計画 柱3・オーナーが選んだ案イ）: 休憩を1行前に出した（休憩 → ふつうの戦闘 → 物語の部屋 → ボス）。
 * 前は「休憩 → 物語の部屋 → ボス」で、休憩の前の奥の行（5・6行目）が2行とも戦う部屋だったので、どの道も強敵を1回通っていた。
 * 今は休憩の前の奥の行が5行目だけ（強敵かふつうの戦闘）で、強敵を1回も通らない道がある（1行目 → 宝箱 → 戦闘 → 宝箱かイベント → 戦闘 → 休憩）。
 * 休憩の後の戦闘は1つだけの行（強敵にすると、休憩で強敵を選んだ道のふつうの戦闘が2回になる）。前の6行目の強敵は3行目に移した。
 * 強敵の後の3行目の部屋は、ふつうの戦闘に行く（強敵 → 宝箱 → 強敵 の道で、ふつうの戦闘が足りなくならないように）
 */
export const keyLayout2 = (e: LayoutEvents): Layout => [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: e.first, next: [0, 1] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [1, 2] },
  ],
  [
    { type: 'rest', next: [0] },
    { type: 'elite', next: [0, 1] },
    { type: 'battle', next: [1, 2] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [1] },
    { type: 'event', eventId: e.second!, next: [0, 1] },
  ],
  [
    { type: 'elite', next: [0] },
    { type: 'battle', next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'battle', next: [0] }],
  [{ type: 'event', eventId: e.story, next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 3つ目の鍵のダンジョン（10行）。7行目はふつうの戦闘（ボスの前の「休憩 → 物語の部屋」の手前） */
export const keyLayout3 = (e: LayoutEvents): Layout => [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: e.first, next: [0, 1] },
    { type: 'elite', next: [0, 1] },
  ],
  [
    { type: 'battle', next: [1, 2] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
  ],
  [
    { type: 'battle', next: [1] },
    { type: 'event', eventId: e.second!, next: [0, 1] },
    { type: 'rest', next: [0, 1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [1] },
  ],
  [
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
    { type: 'elite', next: [0] },
  ],
  [{ type: 'battle', next: [0] }],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: e.story, next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 最後のダンジョン（13行。7行目が中ボス・8行目が休憩）。強敵を1回も通らない道もある */
export const finaleLayout = (e: LayoutEvents): Layout => [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: e.first, next: [0, 1] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0, 1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0, 2] },
    { type: 'elite', next: [0, 1] },
    { type: 'battle', next: [1, 2] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [1] },
    { type: 'elite', next: [1] },
  ],
  [
    { type: 'rest', next: [0] },
    { type: 'battle', next: [0] },
  ],
  [{ type: 'midboss', next: [0] }],
  [{ type: 'rest', next: [0, 1] }],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [1] },
  ],
  [
    { type: 'elite', next: [0] },
    { type: 'battle', next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: e.story, next: [0] }],
  [{ type: 'boss', next: [] }],
];
