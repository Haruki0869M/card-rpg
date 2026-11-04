// ===== 特殊能力（spec §6.2） =====
// 能力はデータ（BattleAbility）の組み合わせで定義し、ここでは種類ごとの処理だけを書く。
// 職業IDによる分岐は書かない。

import { getClass } from '../../data/classes';
import type { AllyState, BattleAbility, CardDef } from '../../types';

export interface ActiveAbility {
  name: string;
  effect: BattleAbility;
}

/** キャラが持つ戦闘の特殊能力の一覧（M2で装備由来の能力も加える） */
export function battleAbilitiesOf(ally: Pick<AllyState, 'classId'>): ActiveAbility[] {
  const a = getClass(ally.classId).battleAbility;
  return [{ name: a.name, effect: a.effect }];
}

function matchesCategory(effect: { category?: CardDef['category'] }, card: CardDef): boolean {
  return !effect.category || effect.category === card.category;
}

/** 常時発動のダメージ倍率（例: 闘志）。発動中の能力名も返す */
export function damageMultiplierFor(ally: AllyState, card: CardDef): { multiplier: number; active: string[] } {
  let multiplier = 1;
  const active: string[] = [];
  for (const ab of battleAbilitiesOf(ally)) {
    const e = ab.effect;
    if (e.kind !== 'damageMultiplier' || !matchesCategory(e, card)) continue;
    if (e.whenSelfHpAtMostPct !== undefined && ally.hp * 100 > ally.maxHp * e.whenSelfHpAtMostPct) continue;
    multiplier *= e.multiplier;
    active.push(ab.name);
  }
  return { multiplier, active };
}

/** 条件付きで今発動している常時能力の名前（表示用） */
export function activePassiveNames(ally: AllyState): string[] {
  const names: string[] = [];
  for (const ab of battleAbilitiesOf(ally)) {
    const e = ab.effect;
    if (e.kind === 'damageMultiplier' && e.whenSelfHpAtMostPct !== undefined) {
      if (ally.hp * 100 <= ally.maxHp * e.whenSelfHpAtMostPct && !ally.dead) names.push(ab.name);
    }
  }
  return names;
}

/** 完全成功時に発動する能力 */
export function perfectAbilities(ally: AllyState, card: CardDef) {
  return battleAbilitiesOf(ally).filter(
    (ab) =>
      (ab.effect.kind === 'onPerfectBonusDamage' || ab.effect.kind === 'onPerfectApplyStatus') &&
      matchesCategory(ab.effect, card),
  );
}

/** かばう能力の発動確率（持っていなければ 0） */
export function coverChance(ally: AllyState): { chance: number; name: string } | null {
  for (const ab of battleAbilitiesOf(ally)) {
    if (ab.effect.kind === 'coverLethal') return { chance: ab.effect.chance, name: ab.name };
  }
  return null;
}
