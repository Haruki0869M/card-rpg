// 中位ジョブ13職の専用カード（各6枚。設計 v2 §1-1）。
// 各ジョブの先頭3枚が「転職した時に3枚から1枚選べる」専用カード（ClassDef.signature）。
// stat = 成功率の基準にする能力値（無ければカードの種類で決まる）
import type { CardDef, CardTarget, Effect, Rarity, StatId, AbilityDef, CardCategory } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const dh = (amount: number, hits: number): Effect => ({ kind: 'damage', amount, hits });
const el = (element: string, amount: number): Effect => ({ kind: 'damage', amount, element });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const st = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const me = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'self' });
const all = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'foes' });
const heal = (amount: number, to: 'self' | 'lowestAlly' | 'allies' | 'target' | 'allyTarget' = 'self'): Effect => ({ kind: 'heal', amount, to });
const focus = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const mana = (amount: number): Effect => ({ kind: 'gainMana', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });
const drain = (pct: number): Effect => ({ kind: 'healPctOfDealt', pct });
const summon = (id: string, name: string, icon: string, damage: number, turns: number, element?: string): Effect => ({ kind: 'summon', id, name, icon, damage, turns, element });

/** カードを1枚作る。tiers は成功数0から順に（成功数 i の効果） */
function c(
  id: string,
  name: string,
  category: CardCategory,
  cost: number,
  baseChance: number,
  target: CardTarget,
  tiers: Effect[][],
  o: { secondaryTarget?: CardDef['secondaryTarget']; rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[] } = {},
): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

export const MID_JOB_CARDS: CardDef[] = [
  // ===== 剣豪（剣・刀。完全成功と見切りの追撃） =====
  c('swordDance', '剣舞', 'physical', 1, 75, 'enemy', [[d(3)], [d(3), d(3)], [d(4), d(4), d(4)]], { rarity: 'rare', stat: 'dex', tags: ['combo'] }),
  c('flashCut', '一閃', 'physical', 2, 60, 'enemy', [[d(7)], [d(14)], [d(22)]], { rarity: 'epic', stat: 'per', trait: { name: '鞘走り', effect: { when: 'perfect', do: [mana(1)] } } }),
  c('masterStroke', '奥義・星断ち', 'physical', 3, 55, 'enemy', [[d(10)], [d(18)], [d(26)], [d(36), st('vulnerable', 2)]], { rarity: 'epic', trait: { name: '奥義', effect: { modifier: 'ignoreBlock' } }, stat: 'str' }),

  // ===== 狂戦士（斧。HPを削って火力） =====
  c('recklessSwing', '捨て身の一撃', 'physical', 1, 70, 'enemy', [[d(6), me('vulnerable', 1)], [d(11), me('vulnerable', 1)], [d(16)]], { rarity: 'rare', stat: 'str', tags: ['heavy'] }),
  c('bloodRage', '血の怒り', 'skill', 0, 85, 'self', [[mana(1), me('vulnerable', 1)], [mana(1), draw(1)]], { rarity: 'rare', stat: 'vit' }),
  c('ragingStorm', '大暴れ', 'physical', 2, 60, 'allEnemies', [[d(4)], [d(7)], [d(10), all('weak', 1)]], { rarity: 'epic', stat: 'str', trait: { name: '狂乱', effect: { when: 'kill', do: [mana(1)] } } }),
  c('warHowl', '狂戦の咆哮', 'skill', 1, 80, 'self', [[b(5)], [b(7), all('weak', 1)], [b(9), all('weak', 1)]]),
  c('bloodFeast', '血の饗宴', 'physical', 2, 65, 'enemy', [[d(6), drain(30)], [d(10), drain(40)], [d(15), drain(50)]], { rarity: 'epic', trait: { name: '血に飢えて', effect: { when: 'kill', do: [heal(5)] } }, stat: 'str' }),

  // ===== 闘士（拳。手数と弱体） =====
  c('hundredKicks', '百烈脚', 'physical', 2, 60, 'enemy', [[dh(2, 3)], [dh(3, 4)], [dh(3, 6)]], { rarity: 'epic', stat: 'agi', trait: { name: '闘魂', effect: { when: 'perfect', do: [draw(1)] } } }),
  c('guardBreak', '崩し', 'physical', 1, 75, 'enemy', [[d(3)], [d(4), st('vulnerable', 1)], [d(6), st('vulnerable', 1), st('weak', 1)]]),
  c('fistOfFury', '怒涛の拳', 'physical', 2, 60, 'enemy', [[d(6)], [d(10), mana(1)], [d(15), mana(1), focus(1)]], { rarity: 'epic', trait: { name: '破竹', effect: { when: 'kill', do: [draw(1)] } }, stat: 'str' }),

  // ===== 大魔導士（杖・魔導書。属性の大魔法） =====
  c('flameStorm', '炎の嵐', 'magic', 2, 65, 'allEnemies', [[el('fire', 3)], [el('fire', 6)], [el('fire', 9)]], { rarity: 'rare' }),
  { ...c('frostNova', '氷結陣', 'magic', 2, 65, 'allEnemies', [[el('ice', 3)], [el('ice', 5)], [el('ice', 8), all('weak', 1)]], { rarity: 'rare' }), lineages: ['ma'] }, // 区切りD: 氷結陣＝氷結領域 をまとめた
  c('arcaneSurge', '魔力の奔流', 'magic', 1, 75, 'self', [[mana(1)], [mana(1), draw(1)], [mana(2), draw(1)]], { rarity: 'epic', stat: 'int', trait: { name: '集中', effect: { when: 'perfect', do: [focus(1)] } } }),
  c('chainLightning', '連鎖雷', 'magic', 1, 70, 'allEnemies', [[el('thunder', 2)], [el('thunder', 3)], [el('thunder', 5)]]),
  c('manaBarrier', '魔力障壁', 'magic', 1, 80, 'self', [[b(4)], [b(7)], [b(10), focus(1)]]),
  c('starfall', '星落とし', 'magic', 3, 55, 'allEnemies', [[d(6)], [d(10)], [d(15)], [d(22)]], { rarity: 'epic', trait: { name: '星の加護', effect: { when: 'perfect', do: [b(6)] } } }),

  // ===== 呪術師（鎌。呪いと毒） =====
  c('hex', '呪い釘', 'magic', 1, 75, 'enemy', [[st('curse', 1)], [d(3), st('curse', 2)], [el('dark', 5), st('curse', 2)]], { rarity: 'rare', tags: ['curse'] }),
  c('plague', '疫病', 'magic', 2, 65, 'allEnemies', [[all('poison', 1)], [all('poison', 2)], [all('poison', 3), all('curse', 1)]], { rarity: 'rare' }),
  c('soulHarvest', '魂の刈り入れ', 'magic', 2, 60, 'enemy', [[el('dark', 6)], [el('dark', 10), drain(30)], [el('dark', 15), drain(50)]], { rarity: 'epic', trait: { name: '死の気配', effect: { modifier: 'damageDealt', multiplier: 1, scale: { by: 'targetStatuses', per: 0.25 } } } }),
  c('witherTouch', '枯死の指', 'magic', 1, 75, 'enemy', [[st('weak', 1)], [d(3), st('weak', 1), st('poison', 1)], [d(5), st('weak', 2), st('poison', 2)]]),
  c('darkPact', '闇の契約', 'skill', 0, 85, 'self', [[mana(1), me('curse', 1)], [mana(2), me('curse', 1)]], { stat: 'int' }),
  c('doomSpell', '破滅の言葉', 'magic', 3, 55, 'enemy', [[st('curse', 3)], [el('dark', 8), st('curse', 3)], [el('dark', 14), st('curse', 4)], [el('dark', 22), st('curse', 5), st('vulnerable', 2)]], { rarity: 'epic', trait: { name: '終焉', effect: { when: 'kill', do: [mana(1)] } } }),

  // ===== 幻獣使い（魔導書。幻獣が一緒に戦う） =====
  c('summonWolfSpirit', '幻狼招来', 'magic', 2, 70, 'self', [[summon('spiritWolf', '幻狼', '🐺', 4, 2)], [summon('spiritWolf', '幻狼', '🐺', 6, 2)], [summon('spiritWolf', '幻狼', '🐺', 8, 3)]], { rarity: 'rare', tags: ['summon'] }),
  c('phantomLink', '幻獣同調', 'magic', 1, 75, 'enemy', [[d(3)], [d(5), b(3)], [d(7), b(5)]], { rarity: 'rare', tags: ['summon'] }),
  c('summonPhoenix', '朱雀招来', 'magic', 3, 60, 'self', [[summon('phoenix', '朱雀', '🔥', 6, 2, 'fire')], [summon('phoenix', '朱雀', '🔥', 8, 3, 'fire')], [summon('phoenix', '朱雀', '🔥', 10, 3, 'fire'), heal(5, 'allies')]], { rarity: 'epic', trait: { name: '再生の炎', effect: { when: 'perfect', do: [{ kind: 'applyStatus', status: 'regen', amount: 2, to: 'allies' }] } }, tags: ['summon'] }),
  c('spiritShield', '霊獣の盾', 'magic', 1, 80, 'self', [[b(4)], [b(6)], [b(8), heal(2)]]),
  c('summonTortoise', '玄武招来', 'magic', 2, 65, 'self', [[b(6)], [b(9), summon('tortoise', '玄武', '🐢', 3, 3, 'ice')], [b(12), summon('tortoise', '玄武', '🐢', 5, 3, 'ice')]], { rarity: 'epic', trait: { name: '甲羅の守り', effect: { when: 'afterCard', do: [b(2)] } }, tags: ['summon'] }),

  // ===== 聖騎士（槌・剣。かばって聖光をためる） =====
  c('holyStrike', '聖撃', 'physical', 1, 75, 'enemy', [[el('holy', 4)], [el('holy', 7)], [el('holy', 10), b(3)]], { rarity: 'rare', stat: 'vit', tags: ['holy'] }),
  c('aegis', '聖盾', 'skill', 1, 80, 'self', [[b(6)], [b(9), me('holyLight', 1)], [b(12), me('holyLight', 2)]], { rarity: 'rare', stat: 'vit' }),
  c('divineJudgment', '断罪の光', 'physical', 2, 60, 'allEnemies', [[el('holy', 4)], [el('holy', 7)], [el('holy', 10), all('weak', 1)]], { rarity: 'epic', stat: 'vit', trait: { name: '聖別', effect: { when: 'perfect', do: [heal(4, 'allies')] } } }),
  c('oath', '誓い', 'skill', 0, 85, 'self', [[b(3)], [b(4), me('holyLight', 1)]], { stat: 'vit' }),
  c('lightHammer', '光の鉄槌', 'physical', 2, 65, 'enemy', [[el('holy', 6)], [el('holy', 11)], [el('holy', 16), st('vulnerable', 1)]]),
  c('martyr', '殉教の祈り', 'skill', 2, 70, 'ally', [[b(8)], [b(12), heal(4, 'target')], [b(16), heal(6, 'target'), { kind: 'taunt' }]], { rarity: 'epic', trait: { name: '殉教', effect: { when: 'perfect', do: [{ kind: 'applyStatus', status: 'holyLight', amount: 2, to: 'self' }] } }, stat: 'vit' }),

  // ===== 槍騎士（槍。初手の突撃と貫き） =====
  c('lanceCharge', '突進突き', 'physical', 2, 65, 'enemy', [[d(6)], [d(12)], [d(18), st('vulnerable', 1)]], { rarity: 'rare', stat: 'str', tags: ['heavy'] }), // 区切りD: 突進突き＝昇竜脚 をまとめた
  c('spearWall', '槍衾', 'skill', 1, 80, 'self', [[b(5)], [b(8)], [b(10), all('weak', 1)]], { rarity: 'rare', stat: 'vit' }),
  c('skewer', '串刺し', 'physical', 2, 60, 'allEnemies', [[d(4)], [d(6)], [d(9), all('vulnerable', 1)]], { rarity: 'epic', trait: { name: '貫通', effect: { modifier: 'ignoreBlock' } } }),
  c('sweepLegs', '足払い', 'physical', 1, 75, 'enemy', [[d(2), st('weak', 1)], [d(4), st('weak', 1)], [d(5), st('weak', 2)]]),
  c('dragonFang', '竜牙', 'physical', 3, 55, 'enemy', [[d(10)], [d(18)], [d(26)], [d(34), st('vulnerable', 2)]], { rarity: 'epic', trait: { name: '竜殺し', effect: { modifier: 'damageDealt', multiplier: 1.3, if: [{ kind: 'targetHpAtMost', pct: 50 }] } }, stat: 'str' }),

  // ===== 司祭（錫杖。回復をためて全体回復） =====
  c('greaterHeal', '大いなる癒し', 'magic', 2, 75, 'ally', [[heal(5, 'target')], [heal(9, 'target')], [heal(14, 'target'), { kind: 'cleanse', to: 'target' }]], { rarity: 'rare', stat: 'per' }),
  c('sanctify', '聖別の光', 'magic', 1, 75, 'enemy', [[el('holy', 4)], [el('holy', 6), heal(2, 'allyTarget')], [el('holy', 9), heal(4, 'allyTarget')]], { secondaryTarget: 'ally', rarity: 'rare', stat: 'per' }),
  c('massHeal', '慈雨', 'magic', 2, 65, 'self', [[heal(3, 'allies')], [heal(5, 'allies')], [heal(7, 'allies'), me('regen', 2)]], { rarity: 'epic', stat: 'per', trait: { name: '恩寵', effect: { when: 'perfect', do: [{ kind: 'applyStatus', status: 'regen', amount: 2, to: 'allies' }] } } }),
  c('purify', '浄化', 'skill', 1, 80, 'ally', [[{ kind: 'cleanse', to: 'target' }], [{ kind: 'cleanse', to: 'target' }, heal(3, 'target')]], { stat: 'per' }),
  c('wardOfFaith', '信仰の守り', 'skill', 1, 80, 'ally', [[b(4)], [b(6), heal(2, 'target')], [b(8), heal(3, 'target')]], { stat: 'per' }),
  c('resurgence', '再起の祈り', 'magic', 3, 60, 'self', [[heal(6, 'allies')], [heal(9, 'allies')], [heal(12, 'allies')], [heal(16, 'allies'), { kind: 'cleanse', to: 'allies' }]], { rarity: 'epic', trait: { name: '奇跡の兆し', effect: { when: 'perfect', do: [focus(1)] } }, stat: 'per' }),

  // ===== 弓術士（弓。1体を狙い撃つ） =====
  c('arrowRain', '矢の雨', 'physical', 2, 65, 'allEnemies', [[d(3)], [d(5)], [d(7), all('vulnerable', 1)]], { rarity: 'rare', stat: 'dex' }),
  c('piercingArrow', '貫き矢', 'physical', 2, 60, 'enemy', [[d(7)], [d(13)], [d(20), st('vulnerable', 2)]], { rarity: 'epic', stat: 'per', trait: { name: '貫通', effect: { modifier: 'ignoreBlock' } } }),
  c('quickShot', '速射', 'physical', 1, 80, 'enemy', [[d(3)], [d(5)], [d(5), draw(1)]], { stat: 'dex' }),
  c('stormOfArrows', '千本矢', 'physical', 3, 55, 'enemy', [[dh(2, 3)], [dh(3, 4)], [dh(3, 6)], [dh(4, 7)]], { rarity: 'epic', trait: { name: '鷹の目', effect: { when: 'perfect', do: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] } }, stat: 'dex' }),

  // ===== 獣使い（鞭。相棒の獣と連携） =====
  c('packHunt', '狩りの合図', 'physical', 1, 75, 'enemy', [[d(3)], [d(4), summon('companionBeast', '相棒の獣', '🐾', 4, 99)], [d(6), summon('companionBeast', '相棒の獣', '🐾', 6, 99)]], { rarity: 'rare', stat: 'dex', tags: ['summon'] }),
  c('callFalcon', '鷹呼び', 'skill', 2, 65, 'self', [[summon('falcon', '鷹', '🦅', 4, 2)], [summon('falcon', '鷹', '🦅', 6, 3)], [summon('falcon', '鷹', '🦅', 7, 3), focus(1)]], { rarity: 'epic', trait: { name: '空からの目', effect: { when: 'perfect', do: [draw(1)] } }, stat: 'per', tags: ['summon'] }),
  c('feedBeast', '餌付け', 'skill', 0, 85, 'self', [[heal(2)], [heal(3), draw(1)]], { stat: 'per' }),
  c('stampede', '獣の群れ', 'physical', 3, 55, 'allEnemies', [[d(4)], [d(7)], [d(10)], [d(14), all('vulnerable', 1)]], { rarity: 'epic', trait: { name: '群れの力', effect: { modifier: 'damageDealt', multiplier: 1, scale: { by: 'targetStatuses', per: 0.15 } } }, stat: 'per' }),

  // ===== 隠密（短剣。状態異常を重ねて急所を突く） =====
  c('caltrops', '撒き菱', 'skill', 1, 80, 'self', [[all('weak', 1)], [all('weak', 1), all('poison', 1)], [all('weak', 1), all('poison', 2)]], { rarity: 'rare', stat: 'dex' }),
  c('shadowKill', '影縫い', 'physical', 2, 60, 'enemy', [[d(5), st('paralysis', 1)], [d(9), st('paralysis', 1)], [d(14), st('paralysis', 1), st('vulnerable', 1)]], { rarity: 'epic', stat: 'agi', trait: { name: '闇討ち', effect: { modifier: 'damageDealt', multiplier: 1, scale: { by: 'targetStatuses', per: 0.2 } } } }),
  c('smokeVeil', '煙幕', 'skill', 1, 80, 'self', [[b(4)], [b(6), draw(1)], [b(8), draw(1)]], { stat: 'agi' }), // 区切りD: 煙幕＝煙玉 をまとめた
  c('poisonNeedle', '毒針', 'physical', 0, 85, 'enemy', [[st('poison', 1)], [d(2), st('poison', 2)]], { stat: 'dex', tags: ['poison'] }),
  c('assassinate', '暗殺術', 'physical', 3, 55, 'enemy', [[d(8)], [d(14)], [d(20)], [d(28), st('vulnerable', 2)]], { rarity: 'epic', trait: { name: '必殺', effect: { modifier: 'damageDealt', multiplier: 1, scale: { by: 'targetStatuses', per: 0.25 } } }, stat: 'dex' }),

  // ===== 怪盗（短剣。奪って稼ぐ） =====
  c('swipe', 'すり替え', 'physical', 1, 80, 'enemy', [[d(3)], [d(4), { kind: 'steal', amount: 4 }], [d(6), { kind: 'steal', amount: 6 }, { kind: 'gainGold', amount: 3 }]], { rarity: 'rare', stat: 'dex', tags: ['steal'] }),
  c('flourish', '大見得', 'skill', 1, 80, 'self', [[focus(1)], [focus(1), b(4)], [focus(2), b(4)]], { rarity: 'rare', stat: 'luk' }),
  c('grandHeist', '大盗み', 'physical', 2, 60, 'enemy', [[d(5), { kind: 'gainGold', amount: 3 }], [d(9), { kind: 'gainGold', amount: 6 }], [d(14), { kind: 'gainGold', amount: 10 }, mana(1)]], { rarity: 'epic', trait: { name: '置き土産', effect: { when: 'kill', do: [{ kind: 'gainGold', amount: 10 }] } }, stat: 'luk' }),
  c('feint', 'フェイント', 'physical', 1, 80, 'enemy', [[d(2), b(2)], [d(4), b(3)], [d(5), b(4), st('weak', 1)]], { stat: 'agi' }),
  c('luckyCoin', '幸運の金貨', 'skill', 0, 70, 'self', [[], [draw(1)], [draw(1), mana(1)]], { stat: 'luk' }),
  c('phantomDance', '幻影の舞', 'physical', 2, 60, 'allEnemies', [[d(3)], [d(5), { kind: 'steal', amount: 3 }], [d(7), { kind: 'steal', amount: 5 }, all('weak', 1)]], { rarity: 'epic', trait: { name: '幻惑', effect: { when: 'perfect', do: [b(5)] } }, stat: 'agi' }),
];
