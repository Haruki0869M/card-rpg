// 武器種カード その3（K1）: 槍・斧・拳・錫杖・鎌・刀・鞭・銃・楽器 各7枚。決まりは weaponTypeCards.ts と同じ。
// 7枚の役割: 単体・連撃（または手数）・守りか補助（コモン3）／全体・状態異常か補助（レア2）／特殊（エピック2）
import type { CardDef, CardTarget, Effect, Rarity, StatId, AbilityDef, CardCategory } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const dh = (amount: number, hits: number): Effect => ({ kind: 'damage', amount, hits });
const el = (element: string, amount: number): Effect => ({ kind: 'damage', amount, element });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const ba = (amount: number): Effect => ({ kind: 'block', amount, to: 'allies' });
const bt = (amount: number): Effect => ({ kind: 'block', amount, to: 'target' });
const st = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const all = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'foes' });
const heal = (amount: number): Effect => ({ kind: 'heal', amount });
const healAll = (amount: number): Effect => ({ kind: 'heal', amount, to: 'allies' });
const drain = (pct: number): Effect => ({ kind: 'healPctOfDealt', pct });
const pay = (amount: number): Effect => ({ kind: 'payHp', amount });
const focus = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const mana = (amount: number): Effect => ({ kind: 'gainMana', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[]; weaponType?: string };
/** カードを1枚作る。tiers は成功数0から順に（成功数 i の効果） */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

const W = (weaponType: string) => ({ weaponType });
const pierce = (name: string): AbilityDef => ({ name, effect: { modifier: 'ignoreBlock' } });
const finisher = (name: string): AbilityDef => ({ name, effect: { modifier: 'damageDealt', multiplier: 1.5, if: [{ kind: 'targetHpAtMost', pct: 30 }] } });

export const WEAPON_TYPE_CARDS_3: CardDef[] = [
  // ===== 槍（間合いと貫き） =====
  c('wtSpearThrust', '突き', 'physical', 1, 80, 'enemy', [[d(3)], [d(6)], [d(8)]], W('spear')),
  c('wtSpearDouble', '二段突き', 'physical', 1, 70, 'enemy', [[d(2)], [dh(3, 2)], [dh(4, 2)]], { ...W('spear'), tags: ['combo'] }),
  c('wtSpearWall', '槍衾', 'skill', 1, 80, 'self', [[b(5)], [b(7)], [b(9)]], W('spear')),
  c('wtSpearSweep', '横薙ぎ', 'physical', 2, 65, 'allEnemies', [[d(2)], [d(5)], [d(8), all('weak', 1)]], { ...W('spear'), rarity: 'rare' }),
  c('wtSpearHook', '引っ掛け', 'physical', 1, 75, 'enemy', [[d(2)], [d(4), st('vulnerable', 1)], [d(6), st('vulnerable', 2)]], { ...W('spear'), rarity: 'rare' }),
  c('wtSpearPierce', '貫き', 'physical', 2, 60, 'enemy', [[d(5)], [d(9)], [d(14)]], { ...W('spear'), rarity: 'epic', trait: pierce('貫通') }),
  c('wtSpearDragon', '竜穿ち', 'physical', 3, 55, 'enemy', [[d(6)], [d(12)], [d(19)], [d(28), st('vulnerable', 2)]], { ...W('spear'), rarity: 'epic', stat: 'str', tags: ['heavy'], trait: { name: '竜殺し', effect: { when: 'kill', do: [mana(1)] } } }),

  // ===== 斧（荒々しい一撃。HPを払って火力を上げる） =====
  c('wtAxeChop', '薪割り', 'physical', 1, 70, 'enemy', [[d(3)], [d(7)], [d(9)]], { ...W('axe'), stat: 'str' }),
  c('wtAxeThrow', '手斧投げ', 'physical', 0, 80, 'enemy', [[d(2)], [d(4)]], W('axe')),
  c('wtAxeParry', '斧で受ける', 'skill', 1, 80, 'self', [[b(4)], [b(6)], [b(8)]], W('axe')),
  c('wtAxeWhirl', '旋風', 'physical', 2, 65, 'allEnemies', [[d(3)], [d(6)], [d(9)]], { ...W('axe'), rarity: 'rare', stat: 'str' }),
  c('wtAxeReckless', '捨て身斬り', 'physical', 1, 70, 'enemy', [[d(6), pay(3)], [d(10), pay(3)], [d(14), pay(3)]], { ...W('axe'), rarity: 'rare', stat: 'str', tags: ['heavy'] }),
  c('wtAxeBloodlust', '血に飢えた斧', 'physical', 2, 60, 'enemy', [[d(5)], [d(9), drain(30)], [d(13), drain(40)]], { ...W('axe'), rarity: 'epic', stat: 'str', trait: { name: '血の渇き', effect: { when: 'kill', do: [heal(4)] } } }),
  c('wtAxeExecute', '断頭', 'physical', 3, 50, 'enemy', [[d(7)], [d(14)], [d(21)], [d(32)]], { ...W('axe'), rarity: 'epic', stat: 'str', tags: ['heavy'], trait: finisher('処刑') }),

  // ===== 拳（素早い手数と呼吸） =====
  c('wtFistStraight', '正拳突き', 'physical', 1, 80, 'enemy', [[d(3)], [d(5)], [d(8)]], { ...W('fist'), stat: 'agi' }),
  c('wtFistRush', '連打', 'physical', 1, 70, 'enemy', [[d(2)], [dh(2, 3)], [dh(3, 3)]], { ...W('fist'), stat: 'agi', tags: ['combo'] }),
  c('wtFistBreath', '息吹', 'skill', 0, 85, 'self', [[focus(1)], [focus(1), b(2)]], { ...W('fist'), stat: 'vit' }),
  c('wtFistPalm', '掌底', 'physical', 1, 75, 'enemy', [[d(3)], [d(5), st('weak', 1)], [d(7), st('weak', 2)]], { ...W('fist'), rarity: 'rare', stat: 'vit' }),
  c('wtFistTurn', '回し受け', 'skill', 1, 80, 'self', [[b(3)], [b(5), focus(1)], [b(7), focus(1)]], { ...W('fist'), rarity: 'rare', stat: 'agi' }),
  c('wtFistThousand', '千手連打', 'physical', 2, 60, 'enemy', [[dh(1, 4)], [dh(2, 5)], [dh(3, 6)]], { ...W('fist'), rarity: 'epic', stat: 'agi', tags: ['combo'], trait: { name: '無心', effect: { when: 'perfect', do: [draw(1)] } } }),
  c('wtFistKiBlast', '気功砲', 'physical', 3, 55, 'enemy', [[d(6)], [d(12)], [d(19)], [d(28)]], { ...W('fist'), rarity: 'epic', stat: 'vit', tags: ['heavy'], trait: pierce('浸透') }),

  // ===== 錫杖（聖なる光と仲間の支え） =====
  c('wtScepterLight', '聖光', 'magic', 1, 80, 'enemy', [[el('holy', 3)], [el('holy', 6)], [el('holy', 8)]], W('scepter')),
  c('wtScepterShield', '祈りの盾', 'skill', 1, 80, 'ally', [[bt(4)], [bt(6)], [bt(9)]], { ...W('scepter'), tags: ['support'] }),
  c('wtScepterPray', '祈り', 'skill', 0, 85, 'self', [[heal(2)], [heal(3), mana(1)]], W('scepter')),
  c('wtScepterHalo', '光輪', 'magic', 2, 65, 'allEnemies', [[el('holy', 3)], [el('holy', 5)], [el('holy', 8)]], { ...W('scepter'), rarity: 'rare' }),
  c('wtScepterBlessing', '加護', 'skill', 1, 80, 'self', [[ba(3)], [ba(5)], [ba(7)]], { ...W('scepter'), rarity: 'rare', tags: ['support'] }),
  c('wtScepterMiracle', '小さな奇跡', 'magic', 2, 60, 'ally', [[heal(5)], [heal(8)], [heal(12)]], { ...W('scepter'), rarity: 'epic', tags: ['support'], trait: { name: '慈愛', effect: { when: 'perfect', do: [healAll(3)] } } }),
  c('wtScepterJudgment', '裁きの光', 'magic', 3, 55, 'enemy', [[el('holy', 6)], [el('holy', 12)], [el('holy', 18)], [el('holy', 27)]], { ...W('scepter'), rarity: 'epic', tags: ['heavy'], trait: { name: '浄化の光', effect: { when: 'kill', do: [healAll(4)] } } }),

  // ===== 鎌（呪いと魂の刈り取り） =====
  c('wtScytheReap', '刈り取り', 'physical', 1, 75, 'enemy', [[d(3)], [d(6)], [d(8)]], W('scythe')),
  c('wtScytheArc', '弧月', 'physical', 1, 70, 'allEnemies', [[d(2)], [d(3)], [d(5)]], W('scythe')),
  c('wtScytheMark', '呪印', 'magic', 1, 80, 'enemy', [[st('curse', 1)], [d(2), st('curse', 1)], [d(3), st('curse', 2)]], W('scythe')),
  c('wtScytheHarvest', '魂の収穫', 'physical', 1, 70, 'enemy', [[d(3)], [d(5), drain(30)], [d(8), drain(40)]], { ...W('scythe'), rarity: 'rare' }),
  c('wtScytheGloom', '闇の刃', 'magic', 2, 65, 'enemy', [[el('dark', 5)], [el('dark', 10)], [el('dark', 15), st('curse', 1)]], { ...W('scythe'), rarity: 'rare' }),
  c('wtScytheEmbrace', '死神の抱擁', 'physical', 2, 60, 'enemy', [[d(5)], [d(9)], [d(14)]], { ...W('scythe'), rarity: 'epic', trait: { name: '魂喰らい', effect: { when: 'kill', do: [mana(1)] } } }),
  c('wtScytheCondemn', '大鎌・断罪', 'physical', 3, 50, 'allEnemies', [[d(3)], [d(6)], [d(10)], [d(14), all('vulnerable', 1)]], { ...W('scythe'), rarity: 'epic', trait: finisher('断罪') }),

  // ===== 刀（見切りと一太刀） =====
  c('wtKatanaDraw', '抜き打ち', 'physical', 1, 80, 'enemy', [[d(3)], [d(6)], [d(9)]], { ...W('katana'), stat: 'per' }),
  c('wtKatanaFlow', '流水', 'physical', 1, 70, 'enemy', [[d(2)], [dh(3, 2)], [dh(4, 2)]], { ...W('katana'), stat: 'per', tags: ['combo'] }),
  c('wtKatanaPoise', '残心', 'skill', 1, 80, 'self', [[b(4)], [b(6), focus(1)], [b(8), focus(1)]], { ...W('katana'), stat: 'per' }),
  c('wtKatanaMoon', '月影', 'physical', 1, 75, 'enemy', [[d(3)], [d(5), st('vulnerable', 1)], [d(7), st('vulnerable', 2)]], { ...W('katana'), rarity: 'rare', stat: 'per' }),
  c('wtKatanaZen', '心頭滅却', 'skill', 1, 80, 'self', [[b(3), focus(1)], [b(5), focus(1)], [b(7), focus(2)]], { ...W('katana'), rarity: 'rare', stat: 'per' }),
  c('wtKatanaSplit', '一刀両断', 'physical', 2, 55, 'enemy', [[d(5)], [d(10)], [d(16)]], { ...W('katana'), rarity: 'epic', stat: 'per', trait: pierce('斬鉄') }),
  c('wtKatanaPetals', '花吹雪', 'physical', 3, 55, 'allEnemies', [[d(3)], [d(6)], [d(10)], [d(13)]], { ...W('katana'), rarity: 'epic', stat: 'per', trait: { name: '舞い散る刃', effect: { when: 'kill', do: [draw(1)] } } }),

  // ===== 鞭（遠くから状態異常。しつけと搦め手） =====
  c('wtWhipLash', '打ち据え', 'physical', 1, 80, 'enemy', [[d(3)], [d(5)], [d(8)]], { ...W('whip'), stat: 'dex' }),
  c('wtWhipCrack', '鞭の音', 'skill', 0, 85, 'enemy', [[st('weak', 1)], [d(2), st('weak', 1)]], { ...W('whip'), stat: 'dex' }),
  c('wtWhipBind', '絡め取り', 'physical', 1, 75, 'enemy', [[d(2)], [d(3), st('vulnerable', 1)], [d(4), st('vulnerable', 1), st('weak', 1)]], { ...W('whip'), stat: 'dex' }),
  c('wtWhipSweep', '薙ぎ鞭', 'physical', 2, 65, 'allEnemies', [[d(2)], [d(4), all('weak', 1)], [d(6), all('weak', 1)]], { ...W('whip'), rarity: 'rare', stat: 'dex' }),
  c('wtWhipShock', '痺れ鞭', 'physical', 1, 75, 'enemy', [[d(2)], [d(3)], [d(4), st('paralysis', 1)]], { ...W('whip'), rarity: 'rare', stat: 'dex' }),
  c('wtWhipTaming', '調教', 'physical', 2, 60, 'enemy', [[d(4)], [d(7)], [d(11)]], { ...W('whip'), rarity: 'epic', stat: 'dex', trait: { name: '主従の絆', effect: { when: 'perfect', do: [mana(1)] } } }),
  c('wtWhipStorm', '嵐の鞭', 'physical', 3, 55, 'enemy', [[dh(2, 2)], [dh(3, 3)], [dh(3, 4)], [dh(4, 5)]], { ...W('whip'), rarity: 'epic', stat: 'dex', tags: ['multi'], trait: { name: '暴風', effect: { when: 'kill', do: [focus(1)] } } }),

  // ===== 銃（正確な射撃と火力） =====
  c('wtGunSnap', '早撃ち', 'physical', 0, 85, 'enemy', [[d(2)], [d(4)]], { ...W('gun'), stat: 'dex' }),
  c('wtGunBurst', '点射', 'physical', 1, 75, 'enemy', [[d(2)], [dh(2, 2)], [dh(3, 3)]], { ...W('gun'), stat: 'dex', tags: ['combo'] }),
  c('wtGunCover', '遮蔽', 'skill', 1, 80, 'self', [[b(4)], [b(6)], [b(8), focus(1)]], { ...W('gun'), stat: 'per' }),
  c('wtGunScatter', '散弾', 'physical', 2, 65, 'allEnemies', [[d(3)], [d(6)], [d(9)]], { ...W('gun'), rarity: 'rare', stat: 'dex' }),
  c('wtGunArmorPiercing', '徹甲弾', 'physical', 1, 70, 'enemy', [[d(3)], [d(6)], [d(9)]], { ...W('gun'), rarity: 'rare', stat: 'dex', trait: pierce('徹甲') }),
  c('wtGunHeadshot', '頭部狙撃', 'physical', 2, 55, 'enemy', [[d(5)], [d(10)], [d(16)]], { ...W('gun'), rarity: 'epic', stat: 'per', trait: finisher('ヘッドショット') }),
  c('wtGunFanFire', '乱射', 'physical', 3, 55, 'enemy', [[dh(1, 3)], [dh(2, 4)], [dh(2, 6)], [dh(3, 8)]], { ...W('gun'), rarity: 'epic', stat: 'dex', tags: ['multi'], trait: { name: '弾幕', effect: { when: 'kill', do: [mana(1)] } } }),

  // ===== 楽器（調べで仲間を支える。運の力） =====
  c('wtInstChord', '和音', 'skill', 1, 80, 'self', [[ba(2)], [ba(3)], [ba(5)]], { ...W('instrument'), stat: 'luk', tags: ['support'] }),
  c('wtInstStrum', '弦打ち', 'magic', 1, 80, 'enemy', [[d(3)], [d(5)], [d(7)]], { ...W('instrument'), stat: 'luk' }),
  c('wtInstTempo', '軽やかな調べ', 'skill', 0, 85, 'self', [[focus(1)], [focus(1), mana(1)]], { ...W('instrument'), stat: 'luk' }),
  c('wtInstLullaby', '子守歌', 'skill', 1, 75, 'allEnemies', [[all('weak', 1)], [all('weak', 1)], [all('weak', 2)]], { ...W('instrument'), rarity: 'rare', stat: 'luk' }),
  c('wtInstHymn', '癒しの曲', 'skill', 1, 80, 'self', [[healAll(2)], [healAll(4)], [healAll(6)]], { ...W('instrument'), rarity: 'rare', stat: 'luk', tags: ['support'] }),
  c('wtInstFinale', '終曲', 'magic', 2, 60, 'allEnemies', [[d(2)], [d(5)], [d(8)]], { ...W('instrument'), rarity: 'epic', stat: 'luk', trait: { name: '余韻', effect: { when: 'perfect', do: [ba(3)] } } }),
  c('wtInstFortune', '幸運の旋律', 'skill', 1, 85, 'self', [[mana(1)], [draw(1), mana(1)], [draw(2), mana(1)]], { ...W('instrument'), rarity: 'epic', stat: 'luk', trait: { name: '福音', effect: { when: 'perfect', do: [focus(1)] } } }),
];
