// 最上位13職の専用カード。各職5枚、先頭3枚が転職直後の選択肢。
import type { AbilityDef, CardDef, CardCategory, CardTarget, Effect } from '../../../types';
import { sharpenTrait } from '../sharpenTraits';
const d = (amount: number, element?: string, hits?: number): Effect => ({ kind: 'damage', amount, element, hits });
const b = (amount: number, to: 'self' | 'allies' = 'self'): Effect => ({ kind: 'block', amount, to });
const h = (amount: number, to: 'self' | 'allies' | 'lowestAlly' | 'target' | 'allyTarget' = 'lowestAlly'): Effect => ({ kind: 'heal', amount, to });
const s = (status: string, amount: number, to: 'target' | 'self' | 'foes' | 'allies' = 'target'): Effect => ({ kind: 'applyStatus', status, amount, to });
const f = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const m = (amount: number): Effect => ({ kind: 'gainMana', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });
const summon = (id: string, name: string, icon: string, damage: number, turns: number, element?: string): Effect => ({ kind: 'summon', id, name, icon, damage, turns, element });
const pierce: AbilityDef = { name: '貫通', effect: { modifier: 'ignoreBlock' } };
const cursed: AbilityDef = { name: '深まる呪い', effect: { modifier: 'damageDealt', multiplier: 1, scale: { by: 'targetStatuses', per: 0.15, max: 0.6 } } };
function c(id: string, name: string, category: CardCategory, cost: number, target: CardTarget, tiers: Effect[][], options: Partial<Pick<CardDef, 'trait' | 'rarity' | 'exhaust' | 'stat' | 'tags' | 'secondaryTarget'>> = {}): CardDef {
  return { id, name, category, cost, target, slots: tiers.length - 1, baseChance: cost >= 3 ? 55 : cost === 0 ? 85 : 70, tiers: tiers.map((effects, minSuccesses) => ({ minSuccesses, effects })), rarity: 'rare', ...options };
}
export const TOP_JOB_CARDS: CardDef[] = [
  // 剣聖: 斬撃・備え・完全成功。
  c('saintSlash', '天衣の一太刀', 'physical', 1, 'enemy', [[d(3)], [d(6)], [d(9), b(3)]], { stat: 'dex' }),
  c('heavenBlade', '天剣', 'physical', 2, 'enemy', [[d(6)], [d(12)], [d(18)]], { rarity: 'epic', trait: pierce }),
  c('swordSanctuary', '剣の結界', 'skill', 1, 'self', [[b(4)], [b(7)], [b(10), f(1)]], { stat: 'per' }),
  c('calmBlade', '静の構え', 'skill', 0, 'self', [[b(2)], [b(3), draw(1)]], { stat: 'per' }),
  c('saintFinale', '無双天舞', 'physical', 3, 'enemy', [[d(8)], [d(16)], [d(24)], [d(34)]], { rarity: 'epic', trait: sharpenTrait('saintFinale'), tags: ['heavy'] }),
  // 覇王: 打撃・威圧・危険な回復。
  c('kingCleaver', '覇王断', 'physical', 2, 'enemy', [[d(6)], [d(12)], [d(19), s('vulnerable', 1)]]),
  c('domination', '制圧の斧', 'physical', 2, 'allEnemies', [[d(3)], [d(6)], [d(10), s('weak', 1, 'foes')]], { rarity: 'epic', trait: pierce }),
  c('conquerorRoar', '覇王の号令', 'skill', 1, 'self', [[b(3, 'allies')], [b(4, 'allies')], [b(5, 'allies'), f(1)]]),
  c('bloodThrone', '血の玉座', 'physical', 1, 'enemy', [[d(3)], [d(5), { kind: 'healPctOfDealt', pct: 30 }], [d(8), { kind: 'healPctOfDealt', pct: 50 }]]),
  c('worldBreaker', '天下割り', 'physical', 3, 'allEnemies', [[d(5)], [d(9)], [d(14)], [d(20)]], { rarity: 'epic', trait: { name: '覇道', effect: { when: 'kill', do: [m(1)] } } }),
  // 拳王: 多段・反撃の備え・手数。
  c('hundredFists', '百拳連打', 'physical', 2, 'enemy', [[d(2, undefined, 3)], [d(3, undefined, 4)], [d(4, undefined, 5)]], { tags: ['combo'] }),
  c('kingCounter', '拳王の受け', 'physical', 1, 'enemy', [[b(3)], [d(4), b(4)], [d(6), b(6)]]),
  c('fistFlurry', '閃光拳', 'physical', 1, 'enemy', [[d(3)], [d(5)], [d(7), draw(1)]], { rarity: 'epic', trait: sharpenTrait('fistFlurry'), stat: 'agi' }),
  c('earthShatter', '震天拳', 'physical', 3, 'enemy', [[d(8)], [d(16)], [d(24)], [d(32), s('weak', 2)]], { rarity: 'epic', trait: pierce }),
  // 大賢者: 3属性を選び分ける。
  c('sageFlame', '賢者の業火', 'magic', 2, 'allEnemies', [[d(4, 'fire')], [d(7, 'fire')], [d(11, 'fire')]]),
  c('sageFrost', '絶零の理', 'magic', 2, 'enemy', [[d(6, 'ice')], [d(11, 'ice')], [d(17, 'ice'), s('weak', 1)]]),
  c('sageThunder', '万雷の理', 'magic', 3, 'enemy', [[d(8, 'thunder')], [d(15, 'thunder')], [d(23, 'thunder')], [d(32, 'thunder')]], { rarity: 'epic', trait: pierce }),
  c('sageMeditation', '叡智の瞑想', 'skill', 0, 'self', [[f(1)], [f(1), draw(1)]], { stat: 'int' }), // 区切りD: 叡智の瞑想＝幸運の仕込み をまとめた
  c('elementRevelation', '万象開闢', 'magic', 3, 'allEnemies', [[d(4, 'fire')], [d(4, 'fire'), d(4, 'ice')], [d(5, 'fire'), d(5, 'ice'), d(4, 'thunder')], [d(6, 'fire'), d(6, 'ice'), d(6, 'thunder')]], { rarity: 'epic', trait: sharpenTrait('elementRevelation') }),
  // 冥王: 呪いと吸収、HPを対価にする。
  c('abyssScythe', '深淵の鎌', 'magic', 2, 'enemy', [[d(6, 'dark')], [d(11, 'dark')], [d(16, 'dark'), { kind: 'healPctOfDealt', pct: 40 }]]),
  c('underworldCurse', '冥府の呪詛', 'magic', 2, 'allEnemies', [[s('curse', 1, 'foes')], [s('curse', 2, 'foes'), d(3, 'dark')], [s('curse', 3, 'foes'), d(6, 'dark')]]),
  c('soulBanquet', '魂の饗宴', 'magic', 3, 'enemy', [[d(8, 'dark')], [d(14, 'dark')], [d(21, 'dark')], [d(28, 'dark'), { kind: 'healPctOfDealt', pct: 50 }]], { rarity: 'epic', trait: cursed }),
  c('deathJudgment', '冥王の裁き', 'magic', 2, 'enemy', [[d(5, 'dark')], [d(10, 'dark')], [d(15, 'dark'), s('curse', 2)]], { rarity: 'epic', trait: cursed }),
  // 幻獣王: 召喚の追加と支援。
  c('royalPhoenix', '王の朱雀', 'magic', 3, 'self', [[summon('royalPhoenix', '王の朱雀', '🔥', 5, 2, 'fire')], [summon('royalPhoenix', '王の朱雀', '🔥', 6, 3, 'fire')], [summon('royalPhoenix', '王の朱雀', '🔥', 8, 3, 'fire')], [summon('royalPhoenix', '王の朱雀', '🔥', 10, 3, 'fire')]], { rarity: 'epic', trait: sharpenTrait('royalPhoenix'), tags: ['summon'] }),
  c('phantomCommand', '幻獣王の号令', 'magic', 1, 'enemy', [[d(3)], [d(5), b(3)], [d(8), b(4)]], { tags: ['summon'] }),
  c('royalTortoise', '王の玄武', 'magic', 2, 'self', [[b(5)], [b(8), summon('royalTortoise', '王の玄武', '🐢', 3, 2, 'ice')], [b(11), summon('royalTortoise', '王の玄武', '🐢', 5, 3, 'ice')]], { tags: ['summon'] }),
  c('phantomLegion', '幻獣の進軍', 'magic', 3, 'allEnemies', [[d(5)], [d(9)], [d(14)], [d(19), s('vulnerable', 1, 'foes')]], { rarity: 'epic', trait: sharpenTrait('phantomLegion'), tags: ['summon'] }),
  // 聖王: 仲間を守りながら聖属性で攻める。
  c('royalHammer', '聖王の鉄槌', 'physical', 2, 'enemy', [[d(6, 'holy')], [d(11, 'holy')], [d(17, 'holy'), b(4)]], { stat: 'vit' }),
  c('royalAegis', '王の聖盾', 'skill', 2, 'self', [[b(4, 'allies')], [b(6, 'allies')], [b(8, 'allies'), s('holyLight', 1, 'self')]], { stat: 'vit' }),
  c('royalGrace', '聖王の恩寵', 'magic', 2, 'self', [[h(3, 'allies')], [h(5, 'allies')], [h(7, 'allies'), { kind: 'cleanse', to: 'allies' }]], { rarity: 'epic', trait: sharpenTrait('royalGrace'), stat: 'per' }),
  c('holyOath', '王の誓約', 'skill', 0, 'self', [[b(2)], [b(3), s('holyLight', 1, 'self')]], { stat: 'vit' }),
  c('royalJudgment', '光の王裁', 'physical', 3, 'allEnemies', [[d(5, 'holy')], [d(9, 'holy')], [d(14, 'holy')], [d(19, 'holy')]], { rarity: 'epic', trait: pierce, stat: 'vit' }),
  // 竜騎士: 跳躍は転職時に加わる決め技。
  c('dragonDive', '竜牙突き', 'physical', 2, 'enemy', [[d(6)], [d(12)], [d(19)]], { rarity: 'epic', trait: pierce }),
  c('dragonScale', '竜鱗の守り', 'skill', 1, 'self', [[b(4)], [b(7)], [b(10), s('regen', 1, 'self')]], { stat: 'vit' }),
  c('dragonSweep', '飛竜旋風', 'physical', 2, 'allEnemies', [[d(4)], [d(7)], [d(10), s('weak', 1, 'foes')]], { rarity: 'epic', trait: sharpenTrait('dragonSweep') }),
  c('dragonSpirit', '竜の息吹', 'skill', 0, 'self', [[f(1)], [f(1), b(3)]]),
  c('jump', '跳躍', 'physical', 2, 'enemy', [[{ kind: 'jump', amount: 24 }], [{ kind: 'jump', amount: 32 }], [{ kind: 'jump', amount: 40 }]], { rarity: 'legend', exhaust: true, trait: { name: '空からの一撃', description: '1戦闘1回。次の敵フェーズの攻撃を避け、次のターンに着地して攻撃する', effect: { modifier: 'exhaust' } } }),
  // 教皇: 回復と浄化。
  c('papalBlessing', '大いなる祝福', 'magic', 2, 'self', [[h(4, 'allies')], [h(6, 'allies')], [h(8, 'allies')]], { stat: 'per' }),
  c('papalLight', '教皇の聖光', 'magic', 2, 'enemy', [[d(5, 'holy')], [d(10, 'holy'), h(2, 'allyTarget')], [d(15, 'holy'), h(4, 'allyTarget')]], { secondaryTarget: 'ally', rarity: 'epic', trait: sharpenTrait('papalLight'), stat: 'per' }),
  c('papalSanctuary', '教皇の加護', 'magic', 2, 'self', [[b(3, 'allies')], [b(5, 'allies'), h(2, 'allies')], [b(7, 'allies'), h(3, 'allies')]], { rarity: 'epic', trait: sharpenTrait('papalSanctuary'), stat: 'per' }),
  c('papalPrayer', '慈愛の祈り', 'magic', 1, 'ally', [[h(3, 'target')], [h(6, 'target')], [h(9, 'target'), { kind: 'cleanse', to: 'target' }]], { stat: 'per' }),
  c('miracle', '奇跡', 'magic', 0, 'self', [[{ kind: 'fullRestore' }], [{ kind: 'fullRestore' }]], { rarity: 'legend', exhaust: true, trait: { name: 'ただ一度の奇跡', description: '1戦闘1回。成功数にかかわらず味方全員を全回復する', effect: { modifier: 'exhaust' } }, stat: 'per' }),
  // 弓聖: フォーカスを使った単体攻撃が必中。
  c('saintArrow', '天弓の一矢', 'physical', 2, 'enemy', [[d(6)], [d(12)], [d(19)]], { stat: 'per' }),
  c('hawkVolley', '鷹の連矢', 'physical', 1, 'enemy', [[d(3)], [d(3, undefined, 2)], [d(4, undefined, 2)]], { stat: 'dex' }),
  c('skyPiercer', '天を貫く矢', 'physical', 3, 'enemy', [[d(8)], [d(16)], [d(24)], [d(34)]], { rarity: 'epic', trait: pierce, stat: 'per' }),
  c('hawkFocus', '鷹の集中', 'skill', 0, 'self', [[f(1)], [f(1), b(2)]], { stat: 'per' }),
  c('heavenRain', '天穹の矢雨', 'physical', 3, 'allEnemies', [[d(5)], [d(9)], [d(14)], [d(19)]], { rarity: 'epic', trait: sharpenTrait('heavenRain'), stat: 'dex' }),
  // ビーストマスター: 群れと支え合う。
  c('packAssault', '群れの強襲', 'physical', 2, 'enemy', [[d(6)], [d(12)], [d(18), s('vulnerable', 1)]], { stat: 'dex', tags: ['summon'] }),
  c('packGuard', '群れの守り', 'skill', 1, 'self', [[b(3, 'allies')], [b(4, 'allies')], [b(5, 'allies')]], { stat: 'per' }),
  c('alphaCall', '白狼の王', 'skill', 2, 'self', [[summon('alphaWolf', '白狼', '🐺', 4, 2)], [summon('alphaWolf', '白狼', '🐺', 6, 2)], [summon('alphaWolf', '白狼', '🐺', 8, 3)]], { rarity: 'epic', trait: sharpenTrait('alphaCall'), stat: 'per', tags: ['summon'] }),
  c('packCare', '群れの手当て', 'skill', 0, 'self', [[h(2, 'self')], [h(3, 'self'), draw(1)]], { stat: 'per' }), // 区切りD: 群れの手当て＝幻獣の贈り物 をまとめた
  c('wildKingdom', '獣王の進撃', 'physical', 3, 'allEnemies', [[d(5)], [d(9)], [d(14)], [d(19), s('weak', 1, 'foes')]], { rarity: 'epic', trait: cursed, stat: 'per' }),
  // 忍者: 分身の追撃を活かす手数と状態異常。
  c('shadowShuriken', '影手裏剣', 'physical', 1, 'enemy', [[d(3)], [d(5)], [d(8)]], { stat: 'dex' }),
  c('ninjaVenom', '忍法・毒霧', 'skill', 1, 'self', [[s('poison', 1, 'foes')], [s('poison', 2, 'foes')], [s('poison', 2, 'foes'), s('weak', 1, 'foes')]], { stat: 'dex' }),
  c('shadowStep', '影渡り', 'physical', 2, 'enemy', [[d(5), b(3)], [d(10), b(4)], [d(15), b(5)]], { rarity: 'epic', trait: cursed, stat: 'agi' }),
  { ...c('ninjaBreath', '息を潜める', 'skill', 0, 'self', [[b(2)], [b(3), f(1)]], { stat: 'agi' }), stat: undefined }, // 区切りD: 息を潜める＝練気 をまとめた
  c('nightExecution', '闇夜の処断', 'physical', 3, 'enemy', [[d(8)], [d(15)], [d(22)], [d(30)]], { rarity: 'epic', trait: cursed, stat: 'dex' }),
  // 大怪盗: 盗みと強奪。
  c('royalSwipe', '王家のすり替え', 'physical', 1, 'enemy', [[d(3)], [d(5), { kind: 'steal', amount: 4 }], [d(8), { kind: 'steal', amount: 6 }]], { rarity: 'epic', trait: sharpenTrait('royalSwipe'), stat: 'dex' }),
  c('thiefDecoy', '華麗な囮', 'skill', 1, 'self', [[b(4)], [b(7)], [b(9), draw(1)]], { stat: 'agi' }),
  c('treasureBlade', '財宝の短剣', 'physical', 2, 'enemy', [[d(6)], [d(11)], [d(17), { kind: 'gainGold', amount: 8 }]], { rarity: 'epic', trait: { name: '大入り', effect: { when: 'kill', do: [{ kind: 'gainGold', amount: 10 }] } }, stat: 'luk' }),
  c('plunder', '強奪', 'skill', 1, 'enemy', [[{ kind: 'stealIntent', multiplier: 0.5 }], [{ kind: 'stealIntent', multiplier: 0.5 }]], { rarity: 'legend', exhaust: true, trait: { name: '一世一代の強奪', description: '1戦闘1回。敵の次の行動の半分を奪う。攻撃は同じ回数・属性でその敵1体にダメージ、それ以外は自分が受け取る', effect: { modifier: 'exhaust' } }, stat: 'luk' }),
];
