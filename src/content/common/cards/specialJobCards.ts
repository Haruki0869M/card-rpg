// 特殊職の前半5職。各職6枚、先頭3枚が転職直後の選択肢。
import { BALANCE } from '../../../data/balance';
import type { AbilityDef, CardDef, CardCategory, CardTarget, Effect } from '../../../types';
import { sharpenTrait } from '../sharpenTraits';
const d = (amount: number, element?: string, hits?: number): Effect => ({ kind: 'damage', amount, element, hits });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const f = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });
const s = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const pay = (amount: number): Effect => ({ kind: 'payHp', amount });
const pierce: AbilityDef = { name: '貫通', effect: { modifier: 'ignoreBlock' } };
const cursed: AbilityDef = { name: '弔い', effect: { modifier: 'damageDealt', multiplier: 1.3, if: [{ kind: 'targetHasStatus', status: 'curse' }] } };
function c(id: string, name: string, category: CardCategory, cost: number, target: CardTarget, tiers: Effect[][], options: Partial<CardDef> = {}): CardDef {
  return { id, name, category, cost, target, slots: tiers.length - 1, baseChance: cost >= 3 ? 55 : cost === 0 ? 85 : 70,
    tiers: tiers.map((effects, minSuccesses) => ({ minSuccesses, effects })), rarity: 'rare', ...options };
}
const hp = BALANCE.specialJobs;
export const SPECIAL_JOB_CARDS: CardDef[] = [
  c('samuraiPoise', '残心', 'skill', 1, 'self', [[b(4)], [b(6), f(1)], [b(9), f(1)]], { stat: 'per' }),
  c('samuraiSwallow', '燕返し', 'physical', 2, 'enemy', [[d(3, undefined, 2)], [d(6, undefined, 2)], [d(9, undefined, 2)]], { rarity: 'epic', trait: sharpenTrait('samuraiSwallow') }),
  c('samuraiFocus', '無念無想', 'skill', 0, 'self', [[f(1)], [f(2)]], { stat: 'per' }), // 区切りD: 無念無想＝鎮めの祈り＝星の導き＝勝負の呼吸 をまとめた
  c('samuraiBlunt', '峰打ち', 'physical', 1, 'enemy', [[d(3)], [d(5), s('weak', 1)], [d(8), s('weak', 1)]]),
  c('samuraiMoon', '奥義・月下断', 'physical', 3, 'enemy', [[d(8)], [d(15)], [d(23)], [d(31)]], { rarity: 'epic', trait: pierce }),

  c('bladeFire', '炎刃の術', 'magic', 1, 'enemy', [[d(3, 'fire')], [d(5, 'fire')], [d(8, 'fire')]]),
  c('bladeIce', '氷刃の術', 'magic', 1, 'enemy', [[d(3, 'ice')], [d(5, 'ice')], [d(8, 'ice')]]),
  c('bladeThunder', '雷刃の術', 'magic', 2, 'enemy', [[d(6, 'thunder')], [d(11, 'thunder')], [d(17, 'thunder')]], { rarity: 'epic', trait: sharpenTrait('bladeThunder') }),
  c('bladeRelease', '奥義・魔剣解放', 'physical', 3, 'enemy', [[d(3, undefined, 3)], [d(5, undefined, 3)], [d(8, undefined, 3)], [d(11, undefined, 3)]], { rarity: 'epic', trait: sharpenTrait('bladeRelease') }),

  c('timeHaste', '加速', 'skill', 1, 'self', [[draw(1)], [draw(1), f(1)], [draw(2), f(1)]], { stat: 'int' }),
  c('timeStop', '時間停止', 'skill', 2, 'enemy', [[{ kind: 'skipIntent' }], [{ kind: 'skipIntent' }]], { stat: 'int', rarity: 'legend', exhaust: true, trait: { name: '止まった時', effect: { modifier: 'exhaust' } } }),
  c('timeMend', '時の回復', 'magic', 2, 'ally', [[{ kind: 'heal', amount: 6, to: 'target' }], [{ kind: 'heal', amount: 11, to: 'target' }], [{ kind: 'heal', amount: 17, to: 'target' }]], { rarity: 'epic', trait: sharpenTrait('timeMend') }),

  c('graveBolt', '冥府の矢', 'magic', 1, 'enemy', [[d(3, 'dark')], [d(6, 'dark')], [d(9, 'dark')]]),
  c('graveCurse', '墓場の呪い', 'magic', 1, 'enemy', [[s('curse', 1)], [s('curse', 2)], [s('curse', 3)]]),
  c('graveFeast', '魂喰らい', 'magic', 2, 'enemy', [[d(6, 'dark'), { kind: 'healPctOfDealt', pct: 30 }], [d(11, 'dark'), { kind: 'healPctOfDealt', pct: 30 }], [d(16, 'dark'), { kind: 'healPctOfDealt', pct: 40 }]], { rarity: 'epic', trait: sharpenTrait('graveFeast') }),
  c('graveWhisper', '死者の囁き', 'skill', 0, 'self', [[pay(hp.offeringCost), draw(1)], [pay(hp.offeringCost), draw(2)]], { stat: 'int' }),
  c('graveFuneral', '奥義・葬送', 'magic', 3, 'enemy', [[d(8, 'dark')], [d(15, 'dark')], [d(23, 'dark')], [d(31, 'dark')]], { rarity: 'epic', trait: cursed }),

  c('bloodBlade', '血刃', 'physical', 1, 'enemy', [[pay(hp.bloodCost), d(4)], [pay(hp.bloodCost), d(7)], [pay(hp.bloodCost), d(10)]]),
  c('bloodShield', '暗黒の盾', 'skill', 1, 'self', [[pay(hp.bloodCost), b(6)], [pay(hp.bloodCost), b(9)], [pay(hp.bloodCost), b(12)]], { stat: 'vit' }), // 区切りD: 冥王の闇への供物をまとめた（暗黒騎士と冥王の両方の報酬）
  c('bloodDrain', '吸命剣', 'physical', 2, 'enemy', [[d(6), { kind: 'healPctOfDealt', pct: 25 }], [d(11), { kind: 'healPctOfDealt', pct: 25 }], [d(16), { kind: 'healPctOfDealt', pct: 40 }]], { rarity: 'epic', trait: sharpenTrait('bloodDrain') }),
  c('bloodOffering', '命の供物', 'skill', 0, 'self', [[pay(hp.offeringCost), { kind: 'gainMana', amount: 1 }], [pay(hp.offeringCost), { kind: 'gainMana', amount: 1 }, draw(1)]], { stat: 'vit' }),
  c('bloodSweep', '闇の薙ぎ払い', 'physical', 2, 'allEnemies', [[pay(hp.offeringCost), d(4)], [pay(hp.offeringCost), d(7)], [pay(hp.offeringCost), d(10)]]),
  c('bloodAbyss', '奥義・奈落斬', 'physical', 3, 'enemy', [[pay(hp.abyssCost), d(10)], [pay(hp.abyssCost), d(18)], [pay(hp.abyssCost), d(26)], [pay(hp.abyssCost), d(35)]], { rarity: 'epic', trait: pierce }),
];
