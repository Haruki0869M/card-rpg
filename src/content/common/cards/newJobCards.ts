// 区切りF（2026-11-12）: 新ジョブ4職の専用カード（1職3枚）。ID は fs（拳聖）・bw（重装衛士）・dv（竜脈術師）・pt（調教師）＋名前。
// 置き場所は各ジョブの cardPool。中身は、オーナーが OK した計画（docs/tasks/lineup-stageF-plan.md §3）のとおり。
// 2026-11-12: 作る時に計画から勝手に変えていた5枚（受けの型・大盾構え・盾ごと突進・鉄の誓い・なでなで）を、計画どおりに戻した。
// 2026-11-12: 「どのジョブもエピック2枚以上」の決まりをやめた（オーナーの決定）。「相棒の守り」は計画どおりのブロックだけに戻し、拳聖の報酬から「不落の城塞」を外した。
// 2026-11-12（オーナーの OK。docs/tasks/charter5-card-merge-plan.md §5）: 見切り = 《後の先》の回数+1。盾ごと突進 = 挑発を足す。竜脈の鱗盾 = 名前はこれで決まり・1種類につき+2（最大+8）。
// 大盾構え・相棒の守りは無くした（同じ役の札がすでにある）。
import type { AbilityDef, AbilityEffect, CardCategory, CardDef, CardTarget, Effect, Rarity, StatId } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const ba = (amount: number): Effect => ({ kind: 'block', amount, to: 'allies' });
const t = (name: string, effect: AbilityEffect): AbilityDef => ({ name, effect });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[] };
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

/** 受けの型: この敵の番の間、《後の先》の1回の上限+6（計画どおり） */
const FORM: Effect = { kind: 'grantAbility', turns: 0, abilities: [{ name: '受けの型', effect: { modifier: 'counterCap', add: 6 } }] };
/** 見切り: この敵の番の間、《後の先》の反撃の回数の上限+1（3回 → 4回） */
const SEE: Effect = { kind: 'grantAbility', turns: 0, abilities: [{ name: '見切り', effect: { modifier: 'counterCap', add: 0, times: 1 } }] };
/** 竜脈の小竜（ターン終了時に攻撃。竜脈術師の《竜脈》で、最後に使った属性の状態異常が乗る） */
const wyrm = (damage: number, turns: number): Effect => ({ kind: 'summon', id: 'veinWyrm', name: '竜脈の小竜', icon: '🐉', damage, turns, replace: true });

export const NEW_JOB_CARDS: CardDef[] = [
  // ===== 拳聖 =====
  c('fsSeeThrough', '見切り', 'skill', 0, 85, 'self', [[b(4), SEE], [b(7), SEE]], { stat: 'agi', tags: ['block'] }),
  c('fsGuardForm', '受けの型', 'skill', 1, 80, 'self', [[b(6), FORM], [b(9), FORM], [b(12), FORM]], { rarity: 'rare', stat: 'vit', tags: ['block'] }),
  c('fsCounterStrike', '返し突き', 'physical', 1, 75, 'enemy', [[d(4)], [d(6)], [d(9)]], { rarity: 'rare', trait: t('返し突き', { modifier: 'damageDealt', multiplier: 1, once: true, addFromCounter: 'returnPower', if: [{ kind: 'counterAtLeast', key: 'returnPower', n: 1, label: '前の敵の番に攻撃を防いだ時（防いだ量の半分・最大+15）' }] }) }),
  // ===== 重装衛士 =====
  c('bwShieldCharge', '盾ごと突進', 'physical', 1, 75, 'enemy', [[d(6), b(4), { kind: 'taunt' }], [d(10), b(4), { kind: 'taunt' }], [d(14), b(4), { kind: 'taunt' }]], { stat: 'vit' }),
  c('bwIronOath', '鉄の誓い', 'skill', 1, 80, 'self', [[ba(4), b(4)], [ba(6), b(4)], [ba(8), b(4)]], { rarity: 'rare', stat: 'vit', tags: ['block'] }),
  // ===== 竜脈術師 =====
  c('dvDragonCall', '竜脈の呼び声', 'magic', 1, 75, 'self', [[wyrm(4, 2)], [wyrm(5, 2)], [wyrm(6, 2)]], { tags: ['summon'] }),
  c('dvLeyWedge', '地脈の楔', 'magic', 1, 80, 'enemy', [[{ kind: 'freshStatus', order: ['weak', 'vulnerable', 'poison'], amount: 1, count: 1 }], [{ kind: 'freshStatus', order: ['weak', 'vulnerable', 'poison'], amount: 2, count: 1 }], [{ kind: 'freshStatus', order: ['weak', 'vulnerable', 'poison'], amount: 2, count: 1 }]], { rarity: 'rare' }),
  c('dvScaleGuard', '竜脈の鱗盾', 'skill', 1, 80, 'self', [[{ kind: 'blockByFoeKinds', base: 5, max: 8, per: 2 }], [{ kind: 'blockByFoeKinds', base: 8, max: 8, per: 2 }], [{ kind: 'blockByFoeKinds', base: 11, max: 8, per: 2 }]], { tags: ['block'] }),
  // ===== 調教師 =====
  // オーナーの決定（2026-11-12）: HP回復。満タンの時はブロック2（満タンでも《相棒の覚醒》でお供が動くように）
  c('ptPat', 'なでなで', 'skill', 0, 85, 'self', [[{ kind: 'healOrBlock', amount: 2, block: 2 }], [{ kind: 'healOrBlock', amount: 3, block: 2 }]], { stat: 'luk', tags: ['pet'] }),
  c('ptTogether', 'いっしょに！', 'physical', 1, 75, 'enemy', [[d(3), { kind: 'petAct' }], [d(5), { kind: 'petAct' }], [d(8), { kind: 'petAct' }]], { tags: ['pet'] }),
];
