// 特殊職の後半5職。各職6枚、先頭3枚が転職時の選択肢。
import { BALANCE } from '../../../data/balance';
import type { AbilityDef, CardDef, CardCategory, CardTarget, Effect } from '../../../types';
const v = BALANCE.specialJobs;
const d = (amount: number, element?: string): Effect => ({ kind: 'damage', amount, element });
const b = (amount: number, to: 'self' | 'allies' = 'self'): Effect => ({ kind: 'block', amount, to });
const h = (amount: number, to: 'allies' | 'lowestAlly' | 'target' = 'lowestAlly'): Effect => ({ kind: 'heal', amount, to });
const f = (amount: number, to: 'self' | 'allies' | 'otherAllies' = 'self'): Effect => ({ kind: 'gainFocus', amount, to });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });
const song = (): Effect => ({ kind: 'applyStatus', status: 'songInspired', amount: 1, to: 'allies' });
const turret = (): Effect => ({ kind: 'summon', id: 'turret', name: '砲台', icon: '⚙', damage: v.turretDamage, turns: v.deviceTurns, replace: true, targeted: true });
const trap = (): Effect => ({ kind: 'summon', id: 'mechanicalTrap', name: '罠', icon: '◇', damage: 0, turns: v.deviceTurns, targeted: true, replace: true, trigger: 'enemyBeforeAction', effects: [d(v.trapDamage), { kind: 'applyStatus', status: 'weak', amount: v.trapWeak }] });
const gamble = (amount: number, hits?: number): Effect => ({ kind: 'damage', amount, hits, outcomes: v.gambleOutcomes.map(o => ({ ...o })) });
const focus: AbilityDef = { name: '研ぎ澄まし', effect: { when: 'perfect', do: [f(1)] } };
const pierce: AbilityDef = { name: '貫通', effect: { modifier: 'ignoreBlock' } };
function c(id: string, name: string, category: CardCategory, cost: number, target: CardTarget, tiers: Effect[][], options: Partial<CardDef> = {}): CardDef {
  return { id, name, category, cost, target, slots: tiers.length - 1, baseChance: cost >= 3 ? 55 : cost === 0 ? 85 : 70, rarity: 'rare',
    tiers: tiers.map((effects, minSuccesses) => ({ minSuccesses, effects })), ...options };
}
export const FINAL_SPECIAL_CARDS: CardDef[] = [
  c('maidenHeal', '癒やしの祝詞', 'magic', 1, 'ally', [[h(3, 'target')], [h(6, 'target')], [h(9, 'target')]], { stat: 'per' }),
  c('maidenPurify', '清めの鈴', 'magic', 1, 'self', [[{ kind: 'reduceStatus', amount: 1, statuses: ['weak', 'vulnerable'], to: 'allies' }], [{ kind: 'cleanse', to: 'allies' }], [{ kind: 'cleanse', to: 'allies' }, h(2, 'allies')]], { stat: 'per', rarity: 'epic', trait: focus }),
  c('maidenWard', '守りの御札', 'skill', 1, 'self', [[b(2, 'allies')], [b(3, 'allies')], [b(5, 'allies')]], { stat: 'per' }),
  c('maidenFocus', '鎮めの祈り', 'skill', 0, 'self', [[f(1)], [f(2)]], { stat: 'per' }),
  c('maidenLight', '破魔の光', 'magic', 2, 'enemy', [[d(6, 'holy')], [d(11, 'holy')], [d(17, 'holy')]], { rarity: 'epic', trait: pierce, stat: 'per' }),
  c('divinePossession', '神降ろし', 'magic', v.possessionCost, 'self', [[{ kind: 'payHp', amount: v.possessionHp }, { kind: 'applyStatus', status: 'possession', amount: v.possessionTurns, to: 'allies' }], [{ kind: 'payHp', amount: v.possessionHp }, { kind: 'applyStatus', status: 'possession', amount: v.possessionTurns, to: 'allies' }]], { stat: 'per', rarity: 'legend', exhaust: true, trait: { name: '神との契り', effect: { modifier: 'exhaust' } } }),

  c('starRay', '星の光条', 'magic', 1, 'enemy', [[d(3)], [d(6)], [d(9)]], { stat: 'int' }),
  c('starWard', '予兆の護り', 'skill', 1, 'self', [[b(4)], [b(7)], [b(10)]], { stat: 'luk' }),
  c('starFocus', '星の導き', 'skill', 0, 'self', [[f(1)], [f(2)]], { stat: 'luk' }),
  c('starPages', '天球の書', 'skill', 1, 'self', [[draw(1)], [draw(2)], [draw(2), f(1)]], { stat: 'int' }),
  c('starGift', '星明かりの恵み', 'magic', 2, 'self', [[h(3, 'allies')], [h(5, 'allies')], [h(7, 'allies')]], { rarity: 'epic', trait: focus }),
  c('starFall', '星降る夜', 'magic', 3, 'allEnemies', [[d(5)], [d(9)], [d(14)], [d(19)]], { rarity: 'epic', trait: pierce }),

  c('machineShot', '精密射撃', 'physical', 1, 'enemy', [[d(3)], [d(6)], [d(9)]], { stat: 'dex' }),
  c('placeTurret', '砲台設置', 'skill', 1, 'enemy', [[turret()], [turret()], [turret(), b(3)]], { stat: 'int', tags: ['summon'] }),
  c('placeTrap', '罠設置', 'skill', 1, 'enemy', [[trap()], [trap()], [trap(), b(3)]], { stat: 'dex', tags: ['summon'] }),
  c('machineVolley', '二連射', 'physical', 2, 'enemy', [[{ kind: 'damage', amount: 3, hits: 2 }], [{ kind: 'damage', amount: 6, hits: 2 }], [{ kind: 'damage', amount: 9, hits: 2 }]], { stat: 'dex', rarity: 'epic', trait: focus }),
  c('machineGuard', '装甲整備', 'skill', 1, 'self', [[b(4)], [b(7)], [b(10)]], { stat: 'int' }),
  c('machineCannon', '大砲撃', 'physical', 3, 'allEnemies', [[d(5)], [d(9)], [d(14)], [d(19)]], { stat: 'dex', rarity: 'epic', trait: pierce }),

  c('bardCourage', '勇気の歌', 'skill', 1, 'self', [[song()], [song(), b(2)], [song(), b(4)]], { stat: 'luk' }),
  c('bardFocus', '心を結ぶ歌', 'skill', 1, 'self', [[f(1, 'otherAllies')], [f(1, 'otherAllies'), b(2)], [f(1, 'otherAllies'), b(4)]], { stat: 'luk' }),
  c('bardHeal', '癒やしの歌', 'magic', 1, 'self', [[h(2, 'allies')], [h(3, 'allies')], [h(5, 'allies')]], { stat: 'luk' }),
  c('bardWard', '守りの旋律', 'skill', 1, 'self', [[b(2, 'allies')], [b(3, 'allies')], [b(5, 'allies')]], { stat: 'luk' }),
  c('bardStrike', '響く一撃', 'physical', 2, 'enemy', [[d(6)], [d(11)], [d(17)]], { stat: 'dex', rarity: 'epic', trait: focus }),
  c('bardFinale', '旅人の大合唱', 'skill', 2, 'self', [[b(3, 'allies'), song()], [b(5, 'allies'), song()], [b(7, 'allies'), song(), f(1, 'otherAllies')]], { stat: 'luk', rarity: 'epic', trait: focus }),

  c('gambleStrike', '勝負の一撃', 'physical', 1, 'enemy', [[gamble(4)], [gamble(6)], [gamble(8)]], { stat: 'luk' }),
  c('gambleTwin', '双賽の刃', 'physical', 2, 'enemy', [[gamble(3, 2)], [gamble(6, 2)], [gamble(9, 2)]], { stat: 'luk', rarity: 'epic', trait: focus }),
  c('gambleGuard', '堅実な構え', 'skill', 1, 'self', [[b(4)], [b(7)], [b(10)]], { stat: 'per' }),
  c('gambleFocus', '勝負の呼吸', 'skill', 0, 'self', [[f(1)], [f(2)]], { stat: 'luk' }),
  c('gambleDraw', '次の一手', 'skill', 1, 'self', [[draw(1)], [draw(2)], [draw(2), f(1)]], { stat: 'luk' }),
  c('gambleFinale', '乾坤の勝負', 'physical', 3, 'enemy', [[gamble(8)], [gamble(14)], [gamble(20)], [gamble(26)]], { stat: 'luk', rarity: 'epic', trait: focus }),
];
