// 区切りF（2026-11-12）: 新ジョブ4職の専用カード（1職3枚）。ID は fs（拳聖）・bw（重装衛士）・dv（竜脈術師）・pt（調教師）＋名前。
// 置き場所は各ジョブの cardPool。中身は、オーナーが OK した計画（docs/tasks/lineup-stageF-plan.md §3）のとおり。
// 2026-11-12: 作る時に計画から勝手に変えていた5枚（受けの型・大盾構え・盾ごと突進・鉄の誓い・なでなで）を、計画どおりに戻した。
// まだ相談中: 「相棒の守り」のエピックと能力・「竜脈の鱗盾」の名前（計画は「竜鱗の守り」。今あるカードと名前が重なる）
import type { AbilityDef, AbilityEffect, CardCategory, CardDef, CardTarget, Effect, Rarity, StatId } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const ba = (amount: number): Effect => ({ kind: 'block', amount, to: 'allies' });
const heal = (amount: number): Effect => ({ kind: 'heal', amount, to: 'self' });
const t = (name: string, effect: AbilityEffect): AbilityDef => ({ name, effect });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[] };
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

/** 受けの型: この敵の番の間、《後の先》の1回の上限+6（計画どおり） */
const FORM: Effect = { kind: 'grantAbility', turns: 0, abilities: [{ name: '受けの型', effect: { modifier: 'counterCap', add: 6 } }] };
/** 竜脈の小竜（ターン終了時に攻撃。竜脈術師の《竜脈》で、最後に使った属性の状態異常が乗る） */
const wyrm = (damage: number, turns: number): Effect => ({ kind: 'summon', id: 'veinWyrm', name: '竜脈の小竜', icon: '🐉', damage, turns, replace: true });

export const NEW_JOB_CARDS: CardDef[] = [
  // ===== 拳聖 =====
  c('fsSeeThrough', '見切り', 'skill', 0, 85, 'self', [[b(4)], [b(7)]], { stat: 'agi', tags: ['block'] }),
  c('fsGuardForm', '受けの型', 'skill', 1, 80, 'self', [[b(6), FORM], [b(9), FORM], [b(12), FORM]], { rarity: 'rare', stat: 'vit', tags: ['block'] }),
  c('fsCounterStrike', '返し突き', 'physical', 1, 75, 'enemy', [[d(4)], [d(6)], [d(9)]], { rarity: 'rare', trait: t('返し突き', { modifier: 'damageDealt', multiplier: 1, once: true, addFromCounter: 'returnPower', if: [{ kind: 'counterAtLeast', key: 'returnPower', n: 1, label: '前の敵の番に攻撃を防いだ時（防いだ量の半分・最大+15）' }] }) }),
  // ===== 重装衛士 =====
  c('bwBigShield', '大盾構え', 'skill', 1, 80, 'self', [[b(7)], [b(10)], [b(14)]], { rarity: 'rare', stat: 'vit', tags: ['block'] }),
  c('bwShieldCharge', '盾ごと突進', 'physical', 1, 75, 'enemy', [[d(6), b(4)], [d(10), b(4)], [d(14), b(4)]], { stat: 'vit' }),
  c('bwIronOath', '鉄の誓い', 'skill', 1, 80, 'self', [[ba(4), b(4)], [ba(6), b(4)], [ba(8), b(4)]], { rarity: 'rare', stat: 'vit', tags: ['block'] }),
  // ===== 竜脈術師 =====
  c('dvDragonCall', '竜脈の呼び声', 'magic', 1, 75, 'self', [[wyrm(4, 2)], [wyrm(5, 2)], [wyrm(6, 2)]], { tags: ['summon'] }),
  c('dvLeyWedge', '地脈の楔', 'magic', 1, 80, 'enemy', [[{ kind: 'freshStatus', order: ['weak', 'vulnerable', 'poison'], amount: 1, count: 1 }], [{ kind: 'freshStatus', order: ['weak', 'vulnerable', 'poison'], amount: 2, count: 1 }], [{ kind: 'freshStatus', order: ['weak', 'vulnerable', 'poison'], amount: 2, count: 1 }]], { rarity: 'rare' }),
  c('dvScaleGuard', '竜脈の鱗盾', 'skill', 1, 80, 'self', [[{ kind: 'blockByFoeKinds', base: 5, max: 4 }], [{ kind: 'blockByFoeKinds', base: 8, max: 4 }], [{ kind: 'blockByFoeKinds', base: 11, max: 4 }]], { tags: ['block'] }),
  // ===== 調教師 =====
  c('ptPat', 'なでなで', 'skill', 0, 85, 'self', [[heal(2)], [heal(3)]], { stat: 'luk', tags: ['pet'] }),
  c('ptBuddyGuard', '相棒の守り', 'skill', 1, 80, 'self', [[b(5)], [b(8)], [b(11)]], { rarity: 'epic', tags: ['pet', 'block'], trait: t('相棒の守り', { when: 'afterCard', if: [{ kind: 'hasPet' }], do: [{ kind: 'block', amount: 3 }] }) }),
  c('ptTogether', 'いっしょに！', 'physical', 1, 75, 'enemy', [[d(3), { kind: 'petAct' }], [d(5), { kind: 'petAct' }], [d(8), { kind: 'petAct' }]], { tags: ['pet'] }),
];
