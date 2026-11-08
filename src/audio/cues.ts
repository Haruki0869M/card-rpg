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

/** 地形 → 世界マップの足音（提案: 草原・森・沼・丘→草、砂漠・灰→砂、雪・氷→雪、それ以外→石） */
const TERRAIN_STEP: Record<string, SfxId> = {
  plains: 'sfx_step_grass', forest: 'sfx_step_grass', swamp: 'sfx_step_grass', hills: 'sfx_step_grass', blight: 'sfx_step_grass',
  desert: 'sfx_step_sand', ash: 'sfx_step_sand',
  snow: 'sfx_step_snow', ice: 'sfx_step_snow',
};
export const footstepSound = (terrain: string | undefined): SfxId => (terrain && TERRAIN_STEP[terrain]) || 'sfx_step_stone';

/**
 * ダンジョン → 一人称の通路の足音。ダンジョンIDごとの表で決める（通路の絵の題材に合わせる）。
 * 土 = 森・島・船・洞窟・夢 / 草 = 庭 / 砂 = 墓所・砂の洞窟 / 雪 = 氷の洞窟 / 岩 = 溶岩・鉱山 / 石 = 神殿・城・図書館・機械・塔。
 * 木の足音のファイルは無いので、船は土にしている。表に無いダンジョンは、背景の名前（forest → 土・volcano → 岩）、それも無ければ石
 */
const DUNGEON_STEP: Record<string, SfxId> = {
  // 侵食の魔王
  emeraldTemple: 'sfx_step_stone', demonCastle: 'sfx_step_stone', lavaCavern: 'sfx_step_rock', silentCatacomb: 'sfx_step_stone', randomForest: 'sfx_step_dirt',
  // 凍てつく王国
  crystalCave: 'sfx_step_snow', sunkenCathedral: 'sfx_step_stone', giantMine: 'sfx_step_rock', iceCastle: 'sfx_step_stone', frozenCave: 'sfx_step_snow',
  // 呪われた群島
  wreckCave: 'sfx_step_dirt', pirateIsland: 'sfx_step_dirt', sunkenTemple: 'sfx_step_stone', ghostFlagship: 'sfx_step_dirt', tideCave: 'sfx_step_dirt',
  // 砂塵の王朝
  scorpionTomb: 'sfx_step_sand', shadowLibrary: 'sfx_step_stone', statueTemple: 'sfx_step_stone', sandPalace: 'sfx_step_stone', sandCave: 'sfx_step_sand',
  // 星降る天空城
  windmillTower: 'sfx_step_stone', observatory: 'sfx_step_stone', moonlitGarden: 'sfx_step_grass', skyCastle: 'sfx_step_stone', starDustCave: 'sfx_step_stone',
  // 機械仕掛けの帝国
  gearFactory: 'sfx_step_stone', steamPlant: 'sfx_step_stone', clockTower: 'sfx_step_stone', machineHeart: 'sfx_step_stone', scrapCave: 'sfx_step_stone',
  // 夢幻の大迷宮
  echoIceVault: 'sfx_step_snow', echoSandTomb: 'sfx_step_sand', echoGhostShip: 'sfx_step_dirt', dreamEaterLair: 'sfx_step_stone', dreamCave: 'sfx_step_dirt',
};
export const dungeonStepSoundOf = (dungeonId: string | undefined): SfxId | undefined => (dungeonId ? DUNGEON_STEP[dungeonId] : undefined);
export function dungeonStepSound(dungeonId: string | undefined, background?: string): SfxId {
  const byId = dungeonStepSoundOf(dungeonId);
  if (byId) return byId;
  const key = `${dungeonId ?? ''} ${background ?? ''}`.toLowerCase();
  if (key.includes('forest')) return 'sfx_step_dirt';
  if (key.includes('volcano') || key.includes('lava')) return 'sfx_step_rock';
  return 'sfx_step_stone';
}
