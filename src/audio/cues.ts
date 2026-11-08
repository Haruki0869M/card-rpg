// ===== 「何が起きたら・どの音」の対応表（K6） =====
// 純粋な関数だけ。ゲームの状態や乱数には触れない（テストできる）。

import type { CardDef, Effect, StatusDef } from '../types';
import type { PetSoundId, SfxId } from './ids';

/** 武器種 → 攻撃音（提案） */
const WEAPON_SOUND: Record<string, SfxId> = {
  sword: 'sfx_battle_slash', dagger: 'sfx_battle_slash', scythe: 'sfx_battle_slash', katana: 'sfx_battle_slash',
  axe: 'sfx_battle_slash', whip: 'sfx_battle_slash',
  hammer: 'sfx_battle_blunt', fist: 'sfx_battle_blunt', staff: 'sfx_battle_blunt', scepter: 'sfx_battle_blunt',
  spear: 'sfx_battle_pierce',
  bow: 'sfx_battle_shoot',
  gun: 'sfx_battle_gun',
};

/** 属性 → 魔法の音（提案: 毒は闇の音、聖は光の音。風の属性は今は無いので、属性の無い魔法に風の音を使う） */
const ELEMENT_SOUND: Record<string, SfxId> = {
  fire: 'sfx_magic_fire', ice: 'sfx_magic_ice', thunder: 'sfx_magic_thunder',
  poison: 'sfx_magic_dark', dark: 'sfx_magic_dark', holy: 'sfx_magic_light',
};

const NEUTRAL_MAGIC: SfxId = 'sfx_magic_wind';

function effectsOf(card: CardDef): Effect[] {
  // いちばん上の段（完全成功）の効果で見る。どの段でも種類は同じことが多い
  return card.tiers.length ? card.tiers[card.tiers.length - 1].effects : [];
}

function elementOf(effects: Effect[]): string | undefined {
  for (const e of effects) if ((e.kind === 'damage' || e.kind === 'summon') && e.element) return e.element;
  return undefined;
}

const attacks = (card: CardDef) => card.target === 'enemy' || card.target === 'allEnemies';

/** カードを使って効果が出た時の音（攻撃の種類・魔法の属性・召喚・自分に使う） */
export function cardSound(card: CardDef): SfxId {
  const effects = effectsOf(card);
  if (effects.some((e) => e.kind === 'summon')) return 'sfx_battle_summon';
  if (!attacks(card)) return 'sfx_battle_self';
  if (card.category === 'magic' || card.weaponType === 'tome' || card.weaponType === 'instrument') {
    const el = elementOf(effects);
    return (el && ELEMENT_SOUND[el]) || NEUTRAL_MAGIC;
  }
  if (card.weaponType && WEAPON_SOUND[card.weaponType]) return WEAPON_SOUND[card.weaponType];
  // 武器種の無い物理・スキルの攻撃は斬る音（提案）
  return 'sfx_battle_slash';
}

export type HitSize = 'small' | 'mid' | 'big';
/** ダメージの大きさ（提案: 1〜9 小・10〜24 中・25以上 大） */
export function hitSize(amount: number): HitSize {
  return amount >= 25 ? 'big' : amount >= 10 ? 'mid' : 'small';
}

/** ダメージを受けた時の音。ally = 味方が受けた */
export function damageSound(amount: number, blocked: number, ally: boolean): SfxId {
  if (amount <= 0) return blocked > 0 ? 'sfx_guard_ok' : 'sfx_damage_zero';
  const size = hitSize(amount);
  return ally ? (`sfx_hurt_${size}` as SfxId) : (`sfx_hit_${size}` as SfxId);
}

/** 状態の増減の音。悪い状態が増えた → 属性の状態異常（毒・やけど等）か弱体、良い状態が増えた → 強化、悪い状態が減った → 治った */
export function statusSound(def: Pick<StatusDef, 'id' | 'harmful' | 'tickDamage'>, amount: number): SfxId | undefined {
  if (!amount) return undefined;
  if (def.harmful) {
    if (amount < 0) return 'sfx_status_cleanse';
    return def.tickDamage || AILMENTS.has(def.id) ? 'sfx_status_ailment' : 'sfx_status_debuff';
  }
  return amount > 0 ? 'sfx_status_buff' : undefined;
}
const AILMENTS = new Set(['burn', 'freeze', 'paralysis', 'poison', 'curse']);

/** 完全成功の音の段階（提案: スロット4つ以上で2段、6つ以上で3段） */
export function perfectSound(slots: number): SfxId {
  return slots >= 6 ? 'sfx_slot_great3' : slots >= 4 ? 'sfx_slot_great2' : 'sfx_slot_great';
}

/** スロットの結果の音 */
export function rollResultSound(successes: number, slots: number, perfect: boolean): SfxId {
  if (perfect) return perfectSound(slots);
  return successes > 0 ? 'sfx_slot_success' : 'sfx_slot_fail';
}

/** お供ID（src/content/common/pets/pets.ts）→ 鳴き声のファイル名（docs/audio-list.md §5） */
export const PET_CRY: Record<string, PetSoundId> = {
  cockatiel: 'pet_okame',
  wolfPup: 'pet_wolf',
  blackCat: 'pet_cat',
  turtle: 'pet_turtle',
  babyDragon: 'pet_dragon',
  rabbit: 'pet_rabbit',
  owl: 'pet_owl',
  foxCub: 'pet_fox',
  javaSparrow: 'pet_bunting',
  budgie: 'pet_budgie',
  longTailedTit: 'pet_nagae',
  redPanda: 'pet_redpanda',
};

export const petCry = (petId: string): PetSoundId | undefined => PET_CRY[petId];
