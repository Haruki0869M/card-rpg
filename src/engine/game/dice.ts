// ===== 移動のサイコロ（オーナーの案: すごろくのように、自分の番に応援できるサイコロ） =====
// 世界マップ: 1d6 ＋ 素早さのボーナス（+0〜+2）＋ 探索の能力・お供のボーナス
// ダンジョン: 1〜3 の小さなサイコロ。出た目 = この手番に選べる扉の数
// フォーカス1 = 目を見た後に1回だけ振り直せる（2回目の目で決まる）。乱数は GameState の rng だけを使う（オンライン・保存して再開でも同じ目）
import { BALANCE } from '../../data/balance';
import { getClass } from '../../data/classes';
import type { DiceRoll, GameState, Hero } from '../../types';
import type { Rng } from '../rng';
import { statChance } from './common';
import { exploreEffects } from './exploreAbilities';
import { petExplore } from './pets';

/** 素早さのボーナス（判定の成功率で決める。しきい値は balance.ts の moveDiceSpeed） */
export function speedBonusOf(hero: Hero): number {
  const chance = statChance(hero, 'agi', 'move');
  return BALANCE.moveDiceSpeed.filter((t) => chance >= t).length;
}

/** 世界マップの移動のサイコロに足すもの（0 のものは入れない） */
export function worldDiceBonus(hero: Hero): DiceRoll['bonus'] {
  const out: DiceRoll['bonus'] = [];
  const speed = speedBonusOf(hero);
  if (speed) out.push({ label: '素早さ', value: speed });
  // 探索の能力: 突進・騎乗・健脚・竜の翼（前のスロット+N）は +1、群れの導き（成功数+1）は +1
  const name = getClass(hero.classId).exploreAbility.name;
  let ability = 0;
  for (const e of exploreEffects(hero)) {
    if (e.kind === 'moveSlots' && e.slots > 0) ability = Math.max(ability, BALANCE.moveDiceSlotBonus);
    if (e.kind === 'travel') ability += e.moveBonus;
  }
  if (ability) out.push({ label: name, value: ability });
  const pet = petExplore(hero).moveBonus ?? 0;
  if (pet) out.push({ label: 'お供', value: pet });
  return out;
}

/** 目の合計の平均（画面の目安。サイコロの平均 ＋ ボーナス） */
export const diceAverage = (sides: number, bonus: DiceRoll['bonus']) => (sides + 1) / 2 + bonus.reduce((n, b) => n + b.value, 0);

/** サイコロの目の印（振るたびに変わる。演出を全員で1回だけ出すため。ログの番号を借りる） */
const nextSeq = (game: GameState) => game.nextLogId;

/** サイコロを振る（1 〜 sides） */
export function rollDie(sides: number, rng: Rng): number {
  return 1 + rng.int(sides);
}

/** 新しく振る */
export function newDice(game: GameState, sides: number, bonus: DiceRoll['bonus'], rng: Rng): DiceRoll {
  const face = rollDie(sides, rng);
  return { sides, face, bonus, total: face + bonus.reduce((n, b) => n + b.value, 0), seq: nextSeq(game) };
}

/** フォーカス1で振り直す（2回目の目で決まる） */
export function rerollDice(game: GameState, d: DiceRoll, rng: Rng): DiceRoll {
  const face = rollDie(d.sides, rng);
  return { ...d, first: d.face, face, rerolled: true, total: face + d.bonus.reduce((n, b) => n + b.value, 0), seq: nextSeq(game) };
}

/** ダンジョンの探索のサイコロ（1〜3。ボーナスなし） */
export const exploreDiceSides = () => BALANCE.exploreDiceSides;
