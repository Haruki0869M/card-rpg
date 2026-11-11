// 系統カード（K1。1系統×15枚）: その系統のジョブなら誰でも報酬・ショップで出会う（bu=武 / ma=魔 / sei=聖 / gi=技）。
// ID は ln + 系統 + 名前。コモン6・レア5・エピック4。
import type { CardDef, CardTarget, Effect, Rarity, StatId, AbilityDef, CardCategory, Lineage } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const dh = (amount: number, hits: number): Effect => ({ kind: 'damage', amount, hits });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const st = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const all = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'foes' });
const heal = (amount: number): Effect => ({ kind: 'heal', amount, to: 'self' });
const focus = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const mana = (amount: number): Effect => ({ kind: 'gainMana', amount });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[]; lineage?: Lineage };
/** カードを1枚作る。tiers は成功数0から順に（成功数 i の効果） */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

const L = (lineage: Lineage) => ({ lineage });

export const LINEAGE_CARDS: CardDef[] = [
  // ===== 武（力と体力。守りと押し切り） =====
  c('lnBuBreath', '闘気の構え', 'skill', 0, 85, 'self', [[b(2)], [b(3), focus(1)]], L('bu')),
  { ...c('lnBuStack', '重ね打ち', 'physical', 1, 75, 'enemy', [[d(3)], [d(6)], [d(8)]], L('bu')), weaponTypes: ['scythe'] }, // 区切りD: 重ね打ち＝刈り取り をまとめた
  { ...c('lnBuIronBreath', '鉄壁の呼吸', 'skill', 1, 80, 'self', [[b(5)], [b(7)], [b(9)]], L('bu')), weaponTypes: ['hammer', 'spear'], lineages: ['sei'] }, // 区切りD: 鉄壁の呼吸＝加護の壁＝鉄槌の構え＝槍構え をまとめた
  c('lnBuSweepLeg', '下段払い', 'physical', 1, 75, 'enemy', [[d(2)], [d(4), st('weak', 1)], [d(6), st('weak', 1)]], L('bu')),
  { ...c('lnBuSwipe', '払い斬り', 'physical', 1, 70, 'allEnemies', [[d(2)], [d(3)], [d(5)]], L('bu')), weaponTypes: ['scythe'], common: true }, // 区切りD: 払い斬り＝まとめ打ち＝弧月 をまとめた
  c('lnBuAllIn', '渾身撃', 'physical', 2, 65, 'enemy', [[d(6)], [d(12)], [d(18)]], { ...L('bu'), rarity: 'rare', stat: 'str', tags: ['heavy'] }),
  { ...c('lnBuFlurry', '連続突き', 'physical', 1, 70, 'enemy', [[d(2)], [dh(3, 2)], [dh(3, 3)]], { ...L('bu'), rarity: 'rare', stat: 'dex', tags: ['combo'] }), common: true, stat: undefined }, // 区切りD: 連続突き＝連携攻撃 をまとめた
  c('lnBuCounter', '見切り反撃', 'physical', 1, 75, 'enemy', [[b(3)], [d(5), b(4)], [d(8), b(6)]], { ...L('bu'), rarity: 'rare', stat: 'per' }),
  c('lnBuRoar', '気迫の咆哮', 'skill', 1, 80, 'allEnemies', [[all('weak', 1)], [d(2), all('weak', 1)], [d(3), all('weak', 2)]], { ...L('bu'), rarity: 'rare', stat: 'vit' }),
  c('lnBuUnyielding', '不屈', 'skill', 1, 85, 'self', [[b(5)], [b(7), heal(3)], [b(10), heal(5)]], { ...L('bu'), rarity: 'epic', stat: 'vit', trait: { name: '不屈', effect: { when: 'hurt', do: [b(2)] } } }),
  c('lnBuThousand', '一騎当千', 'physical', 3, 55, 'allEnemies', [[d(3)], [d(5)], [d(8)], [d(11), all('vulnerable', 1)]], { ...L('bu'), rarity: 'epic', stat: 'str', trait: { name: '無双', effect: { when: 'kill', do: [mana(1)] } } }),
  c('lnBuGodStrike', '武神の一撃', 'physical', 3, 55, 'enemy', [[d(7)], [d(13)], [d(20)], [d(28)]], { ...L('bu'), rarity: 'epic', stat: 'str', tags: ['heavy'], trait: { name: '神威', effect: { modifier: 'ignoreBlock' } } }),
  c('lnBuConqueror', '戦場の覇者', 'physical', 2, 65, 'enemy', [[d(4), b(2)], [d(8), b(4)], [d(12), b(5)]], { ...L('bu'), rarity: 'epic', trait: { name: '覇気', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'selfHpAtMost', pct: 50 }] } } }),
];
