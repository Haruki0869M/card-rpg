// 系統カード その2（K1）: 魔・聖・技 各15枚。決まりは lineageCards.ts と同じ（コモン6・レア5・エピック4）。
// ID は ln + 系統 + 名前。味方を選ぶカードは target: 'ally'、自分向けのカードは「最も弱った味方」を使わない。
import type { CardDef, CardTarget, Effect, Rarity, StatId, AbilityDef, CardCategory, Lineage } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const dh = (amount: number, hits: number): Effect => ({ kind: 'damage', amount, hits });
const el = (element: string, amount: number): Effect => ({ kind: 'damage', amount, element });
const elh = (element: string, amount: number, hits: number): Effect => ({ kind: 'damage', amount, element, hits });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const ba = (amount: number): Effect => ({ kind: 'block', amount, to: 'allies' });
const st = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const all = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'foes' });
const heal = (amount: number): Effect => ({ kind: 'heal', amount });
const healAll = (amount: number): Effect => ({ kind: 'heal', amount, to: 'allies' });
const cleanse: Effect = { kind: 'cleanse' };
const pay = (amount: number): Effect => ({ kind: 'payHp', amount });
const focus = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const mana = (amount: number): Effect => ({ kind: 'gainMana', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[]; lineage?: Lineage };
/** カードを1枚作る。tiers は成功数0から順に（成功数 i の効果） */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

const L = (lineage: Lineage) => ({ lineage });
const pierce = (name: string): AbilityDef => ({ name, effect: { modifier: 'ignoreBlock' } });

export const LINEAGE_CARDS_2: CardDef[] = [
  // ===== 魔（マナと属性。手札とマナのやりくり） =====
  c('lnMaSpark', '魔力の火花', 'magic', 0, 85, 'enemy', [[d(2)], [d(3)]], L('ma')),
  c('lnMaConcentrate', '精神集中', 'skill', 1, 85, 'self', [[focus(1)], [focus(1), mana(1)], [focus(2), mana(1)]], L('ma')),
  c('lnMaScatter', '魔力散布', 'magic', 1, 70, 'allEnemies', [[d(2)], [d(3)], [d(5)]], L('ma')),
  c('lnMaFlameLance', '炎槍', 'magic', 2, 65, 'enemy', [[el('fire', 6)], [el('fire', 11)], [el('fire', 17)]], { ...L('ma'), rarity: 'rare' }),
  c('lnMaChainBolt', '走る稲妻', 'magic', 1, 70, 'enemy', [[el('thunder', 2)], [elh('thunder', 3, 2)], [elh('thunder', 3, 3)]], { ...L('ma'), rarity: 'rare', tags: ['combo'] }),
  c('lnMaWither', '衰弱の呪い', 'magic', 1, 75, 'enemy', [[st('weak', 1)], [d(2), st('weak', 1)], [d(3), st('weak', 2), st('vulnerable', 1)]], { ...L('ma'), rarity: 'rare' }),
  c('lnMaMeditate', '深き瞑想', 'skill', 1, 80, 'self', [[mana(1)], [mana(2)], [mana(2), draw(1)]], { ...L('ma'), rarity: 'rare' }),
  c('lnMaCataclysm', '大破壊', 'magic', 3, 50, 'allEnemies', [[d(4)], [d(7)], [d(11)], [d(15)]], { ...L('ma'), rarity: 'epic', trait: { name: '破滅の余波', effect: { when: 'kill', do: [mana(1)] } } }),
  c('lnMaOverload', '魔力過負荷', 'magic', 2, 60, 'enemy', [[d(5)], [d(9)], [d(14)]], { ...L('ma'), rarity: 'epic', trait: { name: '溢れる魔力', effect: { when: 'perfect', do: [mana(2)] } } }),
  c('lnMaStarGuide', '星明かり', 'skill', 1, 85, 'self', [[mana(2)], [mana(2), draw(1)], [mana(3), draw(2)]], { ...L('ma'), rarity: 'epic', trait: { name: '天啓', effect: { when: 'perfect', do: [focus(1)] } } }),
  c('lnMaArcana', '大魔導の秘奥', 'magic', 3, 55, 'enemy', [[d(7)], [d(14)], [d(21)], [d(30)]], { ...L('ma'), rarity: 'epic', tags: ['heavy'], trait: pierce('魔貫') }),

  // ===== 聖（回復と守り。仲間を支える） =====
  { ...c('lnSeiLight', '破邪の光', 'magic', 1, 80, 'enemy', [[el('holy', 3)], [el('holy', 6)], [el('holy', 8)]], L('sei')), weaponTypes: ['scepter'] }, // 区切りD: 破邪の光＝聖光 をまとめた
  c('lnSeiPrayer', '静かな祈り', 'skill', 0, 85, 'self', [[heal(2)], [heal(3), focus(1)]], L('sei')),
  c('lnSeiSmite', '聖打', 'physical', 1, 75, 'enemy', [[d(3)], [d(5)], [d(7), b(2)]], L('sei')),
  c('lnSeiRegen', '再生の祈り', 'skill', 1, 80, 'ally', [[st('regen', 1)], [heal(3), st('regen', 2)], [heal(4), st('regen', 3)]], { ...L('sei'), rarity: 'rare', tags: ['support'] }),
  c('lnSeiPurify', '清めの祈り', 'skill', 1, 80, 'ally', [[cleanse], [cleanse, heal(3)], [cleanse, heal(6)]], { ...L('sei'), rarity: 'rare', tags: ['support'] }),
  c('lnSeiWrath', '聖なる怒り', 'magic', 2, 65, 'enemy', [[el('holy', 6)], [el('holy', 11)], [el('holy', 16)]], { ...L('sei'), rarity: 'rare' }),
  c('lnSeiRain', '恵みの雨', 'skill', 2, 60, 'self', [[healAll(2)], [healAll(4)], [healAll(6)]], { ...L('sei'), rarity: 'epic', tags: ['support'], trait: { name: '恵みの余韻', effect: { when: 'perfect', do: [ba(2)] } } }),
  c('lnSeiDivinePunish', '神罰', 'magic', 3, 50, 'enemy', [[el('holy', 7)], [el('holy', 14)], [el('holy', 21)], [el('holy', 30)]], { ...L('sei'), rarity: 'epic', tags: ['heavy'], trait: { name: '裁きの余光', effect: { when: 'kill', do: [healAll(4)] } } }),
  c('lnSeiMartyr', '殉教者の祈り', 'skill', 1, 80, 'self', [[pay(3), healAll(3)], [pay(3), healAll(5)], [pay(3), healAll(8)]], { ...L('sei'), rarity: 'epic', tags: ['support'], trait: { name: '献身', effect: { when: 'perfect', do: [healAll(3)] } } }),

  // ===== 技（器用さと素早さ。手数・状態異常・手札のやりくり） =====
  { ...c('lnGiQuick', '手早い攻撃', 'physical', 1, 80, 'enemy', [[d(3)], [d(5)], [d(8)]], { ...L('gi'), stat: 'dex' }), weaponTypes: ['bow', 'fist', 'whip'] }, // 区切りD: 手早い攻撃＝早矢＝正拳突き＝打ち据え をまとめた
  c('lnGiTrick', '小細工', 'skill', 0, 85, 'self', [[draw(1)], [draw(1), focus(1)]], { ...L('gi'), stat: 'dex' }), // 区切りD: 小細工＝呼び声 をまとめた
  c('lnGiNeedle', '毒の吹き矢', 'physical', 1, 75, 'enemy', [[d(2)], [d(2), st('poison', 2)], [d(3), st('poison', 3)]], { ...L('gi'), stat: 'dex' }),
  c('lnGiFeint', '牽制', 'physical', 1, 75, 'enemy', [[d(2)], [d(3), st('weak', 1)], [d(4), st('weak', 1)]], { ...L('gi'), stat: 'dex' }),
  c('lnGiSmoke', '目くらまし', 'skill', 1, 80, 'allEnemies', [[all('weak', 1)], [all('weak', 1), b(3)], [all('weak', 2), b(5)]], { ...L('gi'), rarity: 'rare', stat: 'dex' }),
  c('lnGiSnare', '虎挟み', 'skill', 1, 75, 'enemy', [[st('vulnerable', 1)], [d(2), st('vulnerable', 1)], [d(3), st('vulnerable', 2)]], { ...L('gi'), rarity: 'rare', stat: 'per' }),
  c('lnGiWeakpoint', '急所狙い', 'physical', 1, 70, 'enemy', [[d(3)], [d(6), st('vulnerable', 1)], [d(9), st('vulnerable', 2)]], { ...L('gi'), rarity: 'rare', stat: 'per' }),
  c('lnGiShadowDance', '影の舞', 'physical', 2, 60, 'enemy', [[dh(1, 3)], [dh(2, 4)], [dh(3, 5)]], { ...L('gi'), rarity: 'epic', stat: 'agi', tags: ['combo'], trait: { name: '舞い続ける', effect: { when: 'kill', do: [draw(1)] } } }),
  c('lnGiPerfectPlan', '完璧な計画', 'skill', 1, 85, 'self', [[draw(1), focus(1)], [draw(2), focus(1)], [draw(2), focus(2)]], { ...L('gi'), rarity: 'epic', stat: 'per', trait: { name: '計算通り', effect: { when: 'perfect', do: [mana(1)] } } }),
];
