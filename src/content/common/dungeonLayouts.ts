// ===== シナリオ2〜7の手作りダンジョンの並びの「型」（2026-11-13・docs/review/2026-11-13-room-variety2.md） =====
// 残り6本の24か所は、前から4つの型（1つ目の鍵・2つ目の鍵・3つ目の鍵・最後）の写しだった。並びを直す時に、型ごとに1つ作り、
// ダンジョンごとのイベント（直す前にそのダンジョンで使っていた物）で埋める形にした。型の写しをやめる作業（点検の宿題 H5）は別の計画。
// シナリオ1の4か所は、それぞれのファイルに1つずつ書いてある。
//
// 並びの決まり（tests: src/engine/__tests__/dungeonShape.test.ts）:
// - どの道でも、続けて同じ種類の部屋に入らない・同じ行の部屋は全部ちがう種類
// - どの道でも、戦う部屋（ふつうの戦闘・強敵・中ボス・ボス）でない部屋が3つ以上続かない
// - どの道でも、ふつうの戦闘は鍵で3回以上・最後で4回以上
// - 強敵の部屋は、同じ行に強敵でない部屋がある
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
 * ボスの前が「休憩 → 物語の部屋」なので、5行目は必ず戦う部屋になる。どの道でもふつうの戦闘を3回にするため、
 * 3行目と5行目はふつうの戦闘1つだけ（2行目・4行目で選ぶ）。5行目より後に戦う部屋を2つ置く場所は無い（報告に書いた）
 */
export const keyLayout1 = (e: LayoutEvents): Layout => [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: e.first, next: [0] },
    { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0] },
  ],
  [{ type: 'battle', next: [0, 1, 2] }],
  [
    { type: 'elite', next: [0] },
    { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
    { type: 'event', eventId: e.second!, next: [0] },
  ],
  [{ type: 'battle', next: [0] }],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: e.story, next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 2つ目の鍵のダンジョン（9行）。5〜6行目（敵が1体増える行）は、ふつうの戦闘と強敵を交差させる */
export const keyLayout2 = (e: LayoutEvents): Layout => [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: e.first, next: [0, 1] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0, 1] },
  ],
  [
    { type: 'rest', next: [0] },
    { type: 'battle', next: [1, 2] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0, 1] },
    { type: 'event', eventId: e.second!, next: [0, 1] },
  ],
  [
    { type: 'elite', next: [0] },
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
