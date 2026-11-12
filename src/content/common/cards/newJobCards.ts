// 区切りF（2026-11-12）: 新ジョブ4職の専用カード（1職3枚）。ID は fs（拳聖）・bw（重装衛士）・dv（竜脈術師）・pt（調教師）＋名前。
// 置き場所は各ジョブの cardPool。数値はすべて【提案】（docs/tasks/lineup-stageF-plan.md §3）
import type { AbilityDef, AbilityEffect, CardCategory, CardDef, CardTarget, Effect, Rarity, StatId } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const t = (name: string, effect: AbilityEffect): AbilityDef => ({ name, effect });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[] };
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

/** 受けの型: この敵の番の間、防いだ時にもう1回小さく返す（1回最大6・1ターン1回。《後の先》とは別に数える） */
const FORM: Effect = { kind: 'grantAbility', turns: 0, abilities: [{ name: '受けの型', effect: { when: 'guarded', do: [{ kind: 'retaliateDealt', max: 6, perTurn: 1, key: 'ukenokata' }] } }] };
/** 大盾構え: 次のターンへ残せるブロックの上限が30になる（《不落》の半分・最大20 → 最大30） */
const BIG_SHIELD: Effect = { kind: 'grantAbility', turns: 1, abilities: [{ name: '大盾構え', effect: { modifier: 'keepBlock', max: 30, pct: 50 } }] };
/** 竜脈の小竜（ターン終了時に攻撃。竜脈術師の《竜脈》で、最後に使った属性の状態異常が乗る） */
const wyrm = (damage: number, turns: number): Effect => ({ kind: 'summon', id: 'veinWyrm', name: '竜脈の小竜', icon: '🐉', damage, turns, replace: true });

export const NEW_JOB_CARDS: CardDef[] = [
  // ===== 拳聖 =====
  c('fsSeeThrough', '見切り', 'skill', 0, 85, 'self', [[b(4)], [b(7)]], { stat: 'agi', tags: ['block'] }),
  c('fsGuardForm', '受けの型', 'skill', 1, 80, 'self', [[b(6), FORM], [b(9), FORM], [b(12), FORM]], { rarity: 'rare', stat: 'vit', tags: ['block'] }),
  c('fsCounterStrike', '返し突き', 'physical', 1, 75, 'enemy', [[d(4)], [d(6)], [d(9)]], { rarity: 'rare', trait: t('返し突き', { modifier: 'damageDealt', multiplier: 1, once: true, addFromCounter: 'returnPower', if: [{ kind: 'counterAtLeast', key: 'returnPower', n: 1, label: '前の敵の番に攻撃を防いだ時（防いだ量の半分・最大+15）' }] }) }),
  // ===== 重装衛士 =====
  c('bwBigShield', '大盾構え', 'skill', 1, 80, 'self', [[b(7), BIG_SHIELD], [b(10), BIG_SHIELD], [b(14), BIG_SHIELD]], { rarity: 'rare', stat: 'vit', tags: ['block'] }),
  c('bwShieldCharge', '盾ごと突進', 'physical', 1, 75, 'enemy', [[d(5)], [d(8)], [d(12)]], { stat: 'vit', trait: t('重圧', { when: 'afterCard', if: [{ kind: 'selfBlockAtLeast', n: 20 }], do: [{ kind: 'applyStatus', status: 'weak', amount: 2, to: 'target' }] }) }),
  c('bwIronOath', '鉄の誓い', 'skill', 1, 80, 'self', [[b(8), { kind: 'shareBlock', pct: 25, max: 6 }], [b(12), { kind: 'shareBlock', pct: 25, max: 6 }], [b(16), { kind: 'shareBlock', pct: 25, max: 6 }]], { rarity: 'rare', stat: 'vit', tags: ['block'] }),
  // ===== 竜脈術師 =====
  c('dvDragonCall', '竜脈の呼び声', 'magic', 1, 75, 'self', [[wyrm(4, 2)], [wyrm(5, 3)], [wyrm(6, 3)]], { tags: ['summon'] }),
  c('dvLeyWedge', '地脈の楔', 'magic', 1, 80, 'enemy', [[{ kind: 'freshStatus', order: ['weak', 'vulnerable', 'poison'], amount: 1, count: 1 }], [{ kind: 'freshStatus', order: ['weak', 'vulnerable', 'poison'], amount: 2, count: 1 }], [{ kind: 'freshStatus', order: ['weak', 'vulnerable', 'poison'], amount: 2, count: 2 }]], { rarity: 'rare' }),
  c('dvScaleGuard', '竜脈の鱗盾', 'skill', 1, 80, 'self', [[{ kind: 'blockByFoeKinds', base: 5, max: 4 }], [{ kind: 'blockByFoeKinds', base: 8, max: 4 }], [{ kind: 'blockByFoeKinds', base: 11, max: 4 }]], { tags: ['block'] }),
  // ===== 調教師 =====
  c('ptPat', 'なでなで', 'skill', 0, 85, 'self', [[b(3)], [b(5)]], { stat: 'luk', tags: ['pet'] }),
  c('ptBuddyGuard', '相棒の守り', 'skill', 1, 80, 'self', [[b(5)], [b(8)], [b(11)]], { rarity: 'epic', tags: ['pet', 'block'], trait: t('相棒の守り', { when: 'afterCard', if: [{ kind: 'hasPet' }], do: [{ kind: 'block', amount: 3 }] }) }),
  c('ptTogether', 'いっしょに！', 'physical', 1, 75, 'enemy', [[d(3), { kind: 'petAct' }], [d(5), { kind: 'petAct' }], [d(8), { kind: 'petAct' }]], { tags: ['pet'] }),
];
