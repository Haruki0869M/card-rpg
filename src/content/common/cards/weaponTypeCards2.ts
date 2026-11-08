// 武器種カード その2（K1）: 杖・魔導書・槌・弓・短剣 各7枚。決まりは weaponTypeCards.ts と同じ。
// 7枚の役割: 単体・連撃（または手数）・守りか補助（コモン3）／全体・状態異常か補助（レア2）／特殊（エピック2）
import type { CardDef, CardTarget, Effect, Rarity, StatId, AbilityDef, CardCategory } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const dh = (amount: number, hits: number): Effect => ({ kind: 'damage', amount, hits });
const el = (element: string, amount: number): Effect => ({ kind: 'damage', amount, element });
const elh = (element: string, amount: number, hits: number): Effect => ({ kind: 'damage', amount, element, hits });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const st = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const all = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'foes' });
const heal = (amount: number): Effect => ({ kind: 'heal', amount });
const focus = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const mana = (amount: number): Effect => ({ kind: 'gainMana', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[]; weaponType?: string };
/** カードを1枚作る。tiers は成功数0から順に（成功数 i の効果） */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

const W = (weaponType: string) => ({ weaponType });
const pierce: AbilityDef = { name: '貫通', effect: { modifier: 'ignoreBlock' } };

export const WEAPON_TYPE_CARDS_2: CardDef[] = [
  // ===== 杖（魔力の扱い。マナを増やして撃つ） =====
  c('wtStaffSpark', '魔力の閃き', 'magic', 1, 80, 'enemy', [[d(3)], [d(6)], [d(8)]], W('staff')),
  c('wtStaffTwin', '双星弾', 'magic', 1, 70, 'enemy', [[d(2)], [dh(3, 2)], [dh(4, 2)]], { ...W('staff'), tags: ['combo'] }),
  c('wtStaffWard', '魔力の障壁', 'skill', 1, 80, 'self', [[b(4)], [b(6)], [b(8), mana(1)]], W('staff')),
  c('wtStaffRain', '星屑の雨', 'magic', 2, 65, 'allEnemies', [[d(3)], [d(6)], [d(9)]], { ...W('staff'), rarity: 'rare' }),
  c('wtStaffDrain', '魔力吸収', 'magic', 1, 75, 'enemy', [[d(3)], [d(5), mana(1)], [d(7), mana(1)]], { ...W('staff'), rarity: 'rare', tags: ['mana'] }),
  c('wtStaffOverflow', '魔力の氾濫', 'magic', 2, 60, 'enemy', [[d(6)], [d(11), mana(1)], [d(17), mana(2)]], { ...W('staff'), rarity: 'epic', trait: { name: '魔力循環', effect: { when: 'perfect', do: [mana(1)] } } }),
  c('wtStaffCrown', '大魔法・星冠', 'magic', 3, 55, 'enemy', [[d(8)], [d(15)], [d(22)], [d(32)]], { ...W('staff'), rarity: 'epic', tags: ['heavy'], trait: { name: '魔貫', effect: { modifier: 'ignoreBlock' } } }),

  // ===== 魔導書（属性の頁。属性ごとに性格が違う） =====
  c('wtTomeFlame', '火の頁', 'magic', 1, 80, 'enemy', [[el('fire', 3)], [el('fire', 6)], [el('fire', 8)]], W('tome')),
  c('wtTomeFrost', '氷の頁', 'magic', 1, 75, 'enemy', [[el('ice', 2)], [el('ice', 5)], [el('ice', 7), st('weak', 1)]], W('tome')),
  c('wtTomeBolt', '雷の頁', 'magic', 1, 70, 'enemy', [[el('thunder', 2)], [elh('thunder', 3, 2)], [elh('thunder', 4, 2)]], { ...W('tome'), tags: ['combo'] }),
  c('wtTomeVenom', '毒の頁', 'magic', 1, 75, 'enemy', [[el('poison', 2)], [el('poison', 3), st('poison', 2)], [el('poison', 4), st('poison', 3)]], { ...W('tome'), rarity: 'rare' }),
  c('wtTomeHoly', '聖の頁', 'magic', 1, 80, 'ally', [[heal(4)], [heal(7)], [heal(10)]], { ...W('tome'), rarity: 'rare' }),
  c('wtTomeForbidden', '禁書の頁', 'magic', 2, 60, 'enemy', [[el('dark', 6)], [el('dark', 11)], [el('dark', 16), st('curse', 1)]], { ...W('tome'), rarity: 'epic', trait: { name: '闇の囁き', effect: { when: 'perfect', do: [draw(1)] } } }),
  c('wtTomeElements', '四元の大魔導', 'magic', 3, 55, 'allEnemies', [[el('fire', 4)], [el('ice', 8)], [el('thunder', 12)], [el('fire', 16), st('burn', 2)]], { ...W('tome'), rarity: 'epic', trait: { name: '元素の祝福', effect: { when: 'kill', do: [mana(1)] } } }),

  // ===== 槌（重い一撃と守り） =====
  c('wtHammerSmash', '打ち下ろし', 'physical', 1, 70, 'enemy', [[d(3)], [d(7)], [d(9)]], { ...W('hammer'), stat: 'str' }),
  c('wtHammerGuard', '鉄槌の構え', 'skill', 1, 80, 'self', [[b(5)], [b(7)], [b(9)]], W('hammer')),
  c('wtHammerSkull', '脳天割り', 'physical', 1, 70, 'enemy', [[d(2)], [d(4)], [d(6), st('paralysis', 1)]], { ...W('hammer'), stat: 'str' }),
  c('wtHammerQuake', '地鳴らし', 'physical', 2, 65, 'allEnemies', [[d(3)], [d(6)], [d(8), all('vulnerable', 1)]], { ...W('hammer'), rarity: 'rare', stat: 'str' }),
  c('wtHammerBulwark', '護りの槌', 'physical', 1, 75, 'enemy', [[b(4)], [d(4), b(4)], [d(6), b(6)]], { ...W('hammer'), rarity: 'rare' }),
  c('wtHammerCrush', '粉砕', 'physical', 2, 60, 'enemy', [[d(7)], [d(12)], [d(18)]], { ...W('hammer'), rarity: 'epic', stat: 'str', trait: pierce }),
  c('wtHammerTitan', '巨人の鉄槌', 'physical', 3, 50, 'enemy', [[d(10)], [d(18)], [d(26)], [d(38)]], { ...W('hammer'), rarity: 'epic', stat: 'str', tags: ['heavy'], trait: { name: 'めり込み', effect: { when: 'kill', do: [b(6)] } } }),

  // ===== 弓（遠くから手数と狙い） =====
  c('wtBowQuick', '速射', 'physical', 1, 80, 'enemy', [[d(3)], [d(5)], [d(8)]], { ...W('bow'), stat: 'dex' }),
  c('wtBowTriple', '三連射', 'physical', 1, 70, 'enemy', [[d(2)], [dh(3, 2)], [dh(3, 3)]], { ...W('bow'), stat: 'dex', tags: ['combo'] }),
  c('wtBowAim', '狙いを定める', 'skill', 0, 85, 'self', [[focus(1)], [focus(1), draw(1)]], { ...W('bow'), stat: 'per' }),
  c('wtBowShower', '矢の雨', 'physical', 2, 65, 'allEnemies', [[d(2)], [d(5)], [d(8)]], { ...W('bow'), rarity: 'rare', stat: 'dex' }),
  c('wtBowFire', '火矢', 'physical', 1, 75, 'enemy', [[el('fire', 3)], [el('fire', 5)], [el('fire', 7), st('burn', 1)]], { ...W('bow'), rarity: 'rare', stat: 'dex' }),
  c('wtBowSniper', '狙撃', 'physical', 2, 55, 'enemy', [[d(6)], [d(12)], [d(19)]], { ...W('bow'), rarity: 'epic', stat: 'per', tags: ['heavy'], trait: { name: '急所', effect: { when: 'perfect', do: [draw(1)] } } }),
  c('wtBowWindPierce', '風穿ちの一矢', 'physical', 3, 55, 'enemy', [[d(8)], [d(15)], [d(23)], [d(33)]], { ...W('bow'), rarity: 'epic', stat: 'dex', trait: pierce }),

  // ===== 短剣（軽い手数と状態異常） =====
  c('wtDaggerBackhand', '逆手斬り', 'physical', 0, 85, 'enemy', [[d(2)], [d(3)]], { ...W('dagger'), stat: 'dex' }),
  c('wtDaggerDance', '踊り刃', 'physical', 1, 70, 'enemy', [[d(2)], [dh(2, 2)], [dh(3, 3)]], { ...W('dagger'), stat: 'dex', tags: ['combo'] }),
  c('wtDaggerDodge', '身かわし', 'skill', 1, 80, 'self', [[b(4)], [b(6)], [b(8), focus(1)]], { ...W('dagger'), stat: 'agi' }),
  c('wtDaggerVenom', '毒塗りの刃', 'physical', 1, 75, 'enemy', [[d(2)], [d(3), st('poison', 2)], [d(4), st('poison', 3)]], { ...W('dagger'), rarity: 'rare', stat: 'dex' }),
  c('wtDaggerShadow', '影縫い', 'physical', 1, 75, 'enemy', [[d(2)], [d(3), st('weak', 1)], [d(4), st('weak', 1), st('vulnerable', 1)]], { ...W('dagger'), rarity: 'rare', stat: 'dex' }),
  c('wtDaggerAssassinate', '暗殺', 'physical', 2, 60, 'enemy', [[d(5)], [d(10)], [d(16)]], { ...W('dagger'), rarity: 'epic', stat: 'dex', trait: { name: '無音', effect: { when: 'perfect', do: [draw(1)] } } }),
  c('wtDaggerMirage', '幻影の刃', 'physical', 1, 65, 'enemy', [[dh(2, 2)], [dh(3, 3)], [dh(3, 5)]], { ...W('dagger'), rarity: 'epic', stat: 'dex', tags: ['combo'], trait: { name: '残像', effect: { when: 'kill', do: [focus(1)] } } }),
];
