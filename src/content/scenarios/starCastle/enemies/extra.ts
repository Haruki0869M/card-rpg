// 星降る天空城：追加の敵（K3 D）。丘・庭園・前庭の組み合わせを増やす
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { moonWolf } from './garden';

export const cometFox: EnemyDef = {
  id: 'cometFox',
  name: '彗星の狐',
  icon: '🦊',
  maxHp: 30,
  baseLevel: 5,
  size: 0.9,
  exp: 10,
  gold: 6,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 盾砕きを1ターン目に予告する（もとから順番の1番目）
  firstActionId: 'tail',
  actions: [
    // 「彗星の尾」を盾砕きに置き換えた（ブロックを0にしてから、同じ聖11のダメージ）。ID は古い保存のために残す
    { id: 'tail', name: '彗星の衝突', big: true, behavior: 'shatter', brief: '厚い盾ほど痛い', hint: 'ブロックを全部壊し、壊した量の半分のダメージを足してから聖11。薄いブロックで受けるか、BREAK する', effects: [{ kind: 'shieldBreak', bonusPct: 50 }, { kind: 'damage', amount: 11, element: 'holy' }] },
    { id: 'dash', name: '星を蹴る', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'shine', name: '尾の光', effects: [{ kind: 'block', amount: 7 }] },
  ],
};

export const harpGuardian: EnemyDef = {
  id: 'harpGuardian',
  name: '竪琴の守り人',
  icon: '🎼',
  maxHp: 46,
  baseLevel: 7,
  size: 1.1,
  exp: 13,
  gold: 9,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 癒し封じを1ターン目に予告する（もとから順番の1番目）
  firstActionId: 'song',
  actions: [
    // 「眠りの調べ」（脆弱1・全体）を癒し封じに置き換えた。ID は古い保存のために残す。
    // 元の脆弱は弱めて残す（狙った1人に脆弱1。fix-plan §2 の 2-4）。4つ目の地域なのでブロック10（BREAK されると行動ごと止まる）
    { id: 'song', name: '癒しを鎮める調べ', big: true, behavior: 'healSeal', brief: '回復を封じ、仲間を癒す', hint: '味方全員の回復が2ターン半分になり、敵みんなのHPが6回復する。一気に削るか、全体攻撃で', effects: [{ kind: 'applyStatus', status: 'healSeal', amount: 2, to: 'foes' }, { kind: 'heal', amount: 6, to: 'allies' }, { kind: 'block', amount: 10 }] },
    { id: 'strike', name: '竪琴の一撃', effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'chord', name: '守りの和音', effects: [{ kind: 'block', amount: 8, to: 'allies' }] },
  ],
};

export const holyMoonWolf: EnemyDef = makeVariant(moonWolf, {
  id: 'holyMoonWolf',
  name: '聖なる月の狼',
  aura: 'holy',
  maxHp: 53,
  baseLevel: 9,
  exp: 16,
  gold: 12,
  weak: ['dark'],
  resist: ['holy'],
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 亜種のこの敵だけ「聖なる牙」を手負い狙いに置き換えた（同じ聖14・HPが半分以下なら×1.5）。
  // ID は古い保存のために残す。1ターン目に予告する（もとから順番の1番目）。元の月の狼は変えていない
  firstActionId: 'bite',
  actions: [
    { id: 'bite', name: '弱った獲物への牙', big: true, behavior: 'hunt', brief: '牙を向けた者に返す', hint: '前のターンに自分を攻撃した味方（何人もいれば最後の人）を狙う。いなければHPの割合が低い味方。HPが半分以下だと×1.5', effects: [{ kind: 'damage', amount: 14, element: 'holy', lowHpMul: 1.5, huntBy: 'lastHit' }] },
    { id: 'howl', name: '月光の遠吠え', effects: [{ kind: 'block', amount: 9 }, { kind: 'damage', amount: 5, element: 'holy' }] },
    { id: 'pounce', name: '光の飛びかかり', effects: [{ kind: 'damage', amount: 7, hits: 2, element: 'holy' }] },
  ],
});
