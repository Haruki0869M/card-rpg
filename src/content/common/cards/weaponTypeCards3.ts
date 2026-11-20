// 武器種カード その3（K1）: 槍・斧・拳・錫杖・鎌・刀・鞭・銃・楽器 各7枚。決まりは weaponTypeCards.ts と同じ。
// 7枚の役割: 単体・連撃（または手数）・守りか補助（コモン3）／全体・状態異常か補助（レア2）／特殊（エピック2）
import type { CardDef, CardTarget, Effect, Rarity, StatId, AbilityDef, CardCategory } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const dh = (amount: number, hits: number): Effect => ({ kind: 'damage', amount, hits });
const el = (element: string, amount: number): Effect => ({ kind: 'damage', amount, element });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const ba = (amount: number): Effect => ({ kind: 'block', amount, to: 'allies' });
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
  c('wtSpearSweep', '横薙ぎ', 'physical', 2, 65, 'allEnemies', [[d(2)], [d(5)], [d(8), all('weak', 1)]], { ...W('spear'), rarity: 'rare' }),
  c('wtSpearPierce', '貫き', 'physical', 2, 60, 'enemy', [[d(5)], [d(9)], [d(14)]], { ...W('spear'), rarity: 'epic', trait: pierce('貫通') }),
  c('wtSpearDragon', '竜穿ち', 'physical', 3, 55, 'enemy', [[d(6)], [d(12)], [d(19)], [d(28), st('vulnerable', 2)]], { ...W('spear'), rarity: 'epic', stat: 'str', tags: ['heavy'], trait: { name: '竜殺し', effect: { when: 'kill', do: [mana(1)] } } }),

  // ===== 斧（荒々しい一撃。HPを払って火力を上げる） =====
  c('wtAxeThrow', '手斧投げ', 'physical', 0, 80, 'enemy', [[d(2)], [d(4), st('vulnerable', 1)]], W('axe')), // 区切りD: 早業と同じ中身だったので、成功1で脆弱1
  { ...c('wtAxeWhirl', '旋風', 'physical', 2, 65, 'allEnemies', [[d(3)], [d(6)], [d(9)]], { ...W('axe'), rarity: 'rare', stat: 'str' }), weaponTypes: ['sword', 'gun'] }, // 区切りD: 旋風＝大回転斬り＝散弾 をまとめた
  c('wtAxeReckless', '捨て身斬り', 'physical', 1, 70, 'enemy', [[d(6), pay(3)], [d(10), pay(3)], [d(14), pay(3)]], { ...W('axe'), rarity: 'rare', stat: 'str', tags: ['heavy'] }),
  c('wtAxeBloodlust', '血に飢えた斧', 'physical', 2, 60, 'enemy', [[d(5)], [d(9), drain(30)], [d(13), drain(40)]], { ...W('axe'), rarity: 'epic', stat: 'str', trait: { name: '血の渇き', effect: { when: 'kill', do: [heal(4)] } } }),

  // ===== 拳（素早い手数と呼吸） =====

  // ===== 錫杖（聖なる光と仲間の支え） =====
  c('wtScepterPray', '祈り', 'skill', 0, 85, 'self', [[heal(2)], [heal(3), mana(1)]], W('scepter')),
  { ...c('wtScepterHalo', '光輪', 'magic', 2, 65, 'allEnemies', [[el('holy', 3)], [el('holy', 5)], [el('holy', 8)]], { ...W('scepter'), rarity: 'rare' }), lineages: ['sei'] }, // 区切りD: 光輪＝聖域の光 をまとめた
  c('wtScepterMiracle', '小さな奇跡', 'magic', 2, 60, 'ally', [[heal(5)], [heal(8)], [heal(12)]], { ...W('scepter'), rarity: 'epic', tags: ['support'], trait: { name: '慈愛', effect: { when: 'perfect', do: [healAll(3)] } } }),

  // ===== 鎌（呪いと魂の刈り取り） =====
  c('wtScytheMark', '呪印', 'magic', 1, 80, 'enemy', [[st('curse', 1)], [d(2), st('curse', 1)], [d(3), st('curse', 2)]], W('scythe')),
  c('wtScytheHarvest', '魂の収穫', 'physical', 1, 70, 'enemy', [[d(3)], [d(5), drain(30)], [d(8), drain(40)]], { ...W('scythe'), rarity: 'rare' }),
  c('wtScytheGloom', '闇の刃', 'magic', 2, 65, 'enemy', [[el('dark', 5)], [el('dark', 10)], [el('dark', 15), st('curse', 1)]], { ...W('scythe'), rarity: 'rare' }),
  c('wtScytheEmbrace', '死神の抱擁', 'physical', 2, 60, 'enemy', [[d(5)], [d(9)], [d(14)]], { ...W('scythe'), rarity: 'epic', trait: { name: '魂喰らい', effect: { when: 'kill', do: [mana(1)] } } }),
  c('wtScytheCondemn', '大鎌・断罪', 'physical', 3, 50, 'allEnemies', [[d(3)], [d(6)], [d(10)], [d(14), all('vulnerable', 1)]], { ...W('scythe'), rarity: 'epic', trait: finisher('断罪') }),

  // ===== 刀（見切りと一太刀） =====
  c('wtKatanaZen', '心頭滅却', 'skill', 1, 80, 'self', [[b(3), focus(1)], [b(5), focus(1)], [b(7), focus(2)]], { ...W('katana'), rarity: 'rare', stat: 'per' }),
  c('wtKatanaPetals', '花吹雪', 'physical', 3, 55, 'allEnemies', [[d(3)], [d(6)], [d(10)], [d(13)]], { ...W('katana'), rarity: 'epic', stat: 'per', trait: { name: '舞い散る刃', effect: { when: 'kill', do: [draw(1)] } } }),

  // ===== 鞭（遠くから状態異常。しつけと搦め手） =====
  c('wtWhipCrack', '鞭の音', 'skill', 0, 85, 'enemy', [[st('weak', 1)], [d(2), st('weak', 1)]], { ...W('whip'), stat: 'dex' }),
  c('wtWhipSweep', '薙ぎ鞭', 'physical', 2, 65, 'allEnemies', [[d(2)], [d(4), all('weak', 1)], [d(6), all('weak', 1)]], { ...W('whip'), rarity: 'rare', stat: 'dex' }),
  c('wtWhipStorm', '嵐の鞭', 'physical', 3, 55, 'enemy', [[dh(2, 2)], [dh(3, 3)], [dh(3, 4)], [dh(4, 5)]], { ...W('whip'), rarity: 'epic', stat: 'dex', tags: ['multi'], trait: { name: '暴風', effect: { when: 'kill', do: [focus(1)] } } }),

  // ===== 銃（正確な射撃と火力） =====
  c('wtGunArmorPiercing', '徹甲弾', 'physical', 1, 70, 'enemy', [[d(3)], [d(6)], [d(9)]], { ...W('gun'), rarity: 'rare', stat: 'dex', trait: pierce('徹甲') }),
  c('wtGunHeadshot', '頭部狙撃', 'physical', 2, 55, 'enemy', [[d(5)], [d(10)], [d(16)]], { ...W('gun'), rarity: 'epic', stat: 'per', trait: finisher('ヘッドショット') }),
  c('wtGunFanFire', '乱射', 'physical', 3, 55, 'enemy', [[dh(1, 3)], [dh(2, 4)], [dh(2, 6)], [dh(3, 8)]], { ...W('gun'), rarity: 'epic', stat: 'dex', tags: ['multi'], trait: { name: '弾幕', effect: { when: 'kill', do: [mana(1)] } } }),

  // ===== 楽器（調べで仲間を支える。運の力） =====
  c('wtInstTempo', '軽やかな調べ', 'skill', 0, 85, 'self', [[focus(1)], [focus(1), mana(1)]], { ...W('instrument'), stat: 'luk' }),
  c('wtInstLullaby', '子守歌', 'skill', 1, 75, 'allEnemies', [[all('weak', 1)], [all('weak', 1)], [all('weak', 2)]], { ...W('instrument'), rarity: 'rare', stat: 'luk' }),
  c('wtInstHymn', '癒しの曲', 'skill', 1, 80, 'self', [[healAll(2)], [healAll(4)], [healAll(6)]], { ...W('instrument'), rarity: 'rare', stat: 'luk', tags: ['support'] }),
  c('wtInstFinale', '終曲', 'magic', 2, 60, 'allEnemies', [[d(2)], [d(5)], [d(8)]], { ...W('instrument'), rarity: 'epic', stat: 'luk', trait: { name: '余韻', effect: { when: 'perfect', do: [ba(3)] } } }),
  c('wtInstFortune', '幸運の旋律', 'skill', 1, 85, 'self', [[mana(1)], [draw(1), mana(1)], [draw(2), mana(1)]], { ...W('instrument'), rarity: 'epic', stat: 'luk', trait: { name: '福音', effect: { when: 'perfect', do: [focus(1)] } } }),
];
