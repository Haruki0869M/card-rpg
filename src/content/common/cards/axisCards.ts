// 区切りD: ビルドの軸のカード（docs/tasks/lineup-phase2-cards.md の「★ 憲章の目での見直し」と、先頭の囲みが最新）
// ID は ax + 名前。置き場所（ジョブ）は各ジョブの cardPool、武器種・系統は weaponTypes・lineages に書く。
// 連携のカード（軸③）は teamOnly（1人プレイの報酬・店には出ない。オーナーの決定）。数値はすべて【提案】（Gemini の文の数は、そのまま）
import type { AbilityDef, AbilityEffect, CardCategory, CardDef, CardTarget, Effect, Lineage, Rarity, StatId } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const ba = (amount: number): Effect => ({ kind: 'block', amount, to: 'allies' });
const bt = (amount: number): Effect => ({ kind: 'block', amount, to: 'target' });
const st = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const focus = (amount: number, to: 'self' | 'target' = 'self'): Effect => ({ kind: 'gainFocus', amount, to });
const mana = (amount: number): Effect => ({ kind: 'gainMana', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });
const heal = (amount: number): Effect => ({ kind: 'heal', amount, to: 'self' });
const t = (name: string, effect: AbilityEffect, also?: AbilityEffect[]): AbilityDef => ({ name, effect, ...(also ? { also } : {}) });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[]; exhaust?: boolean; weaponTypes?: string[]; lineages?: Lineage[]; common?: boolean; teamOnly?: boolean };
/** 軸のカードを1枚作る。tiers は成功数0から順に */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

// ---------- 部品 ----------
/** 自分の今のブロックの pct% のダメージ（最大 max） */
const slam = (pct: number, max: number, gain?: number, to?: 'target'): Effect => ({ kind: 'blockDamage', pct, max, ...(gain ? { gain } : {}), ...(to ? { to } : {}) });
/** この敵の番が終わるまで、攻撃を受けるたび（防いだ時も）攻撃者に n ダメージ */
const spikes = (name: string, n: number, perTurn?: number, to?: 'allies'): Effect => ({
  kind: 'grantAbility', turns: 0, ...(to ? { to } : {}),
  abilities: [
    { name, effect: { when: 'hurt', do: [{ kind: 'retaliate', amount: n, ...(perTurn ? { perTurn } : {}) }] } },
    { name, effect: { when: 'blocked', do: [{ kind: 'retaliate', amount: n, ...(perTurn ? { perTurn } : {}) }] } },
  ],
});
/** 不落の城塞: このターンの終わりにブロックが消えず、次のターンへ持ち越す（上限は BALANCE.keepBlockFortify） */
const FORTIFY: Effect = { kind: 'grantAbility', turns: 1, abilities: [{ name: '要塞化', effect: { modifier: 'keepBlock', max: 50, fortify: true } }] };
/** 不動の拳: 受けた攻撃の50%を、次のターンの最初の物理カードに（最大+12） */
const STEADFAST: Effect[] = [
  { kind: 'steadfast', pct: 50, max: 12 },
  { kind: 'grantAbility', turns: 1, abilities: [{ name: '不動の拳', effect: { modifier: 'damageDealt', multiplier: 1, addFromCounter: 'fudo', once: true, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'playedCategoryCount', category: 'physical', max: 0 }, { kind: 'counterAtLeast', key: 'fudo', n: 1, label: '不動の構えの次のターン' }] } }] },
];
/** 輪唱: このターン、連携を起こした味方が回復する（1人1ターン2回まで） */
const roundSong = (n: number): Effect => ({ kind: 'grantAbility', turns: 0, to: 'allies', abilities: [{ name: '輪唱', effect: { when: 'combo', if: [{ kind: 'perTurn', key: 'roundSong', max: 2 }], do: [heal(n)] } }] });

/** 氷砕き: 対象が凍結なら、凍結を消して、敵全員に8の氷片のダメージ（属性は付けない。氷属性だと、また凍ってしまうため） */
const SHATTER: Effect = { kind: 'statusBurst', status: 'freeze', consume: true, splashAll: 8 };
/** 呪いの刈り入れ: 対象の呪いを全部起爆して消し、1つにつき4ダメージ（最大20） */
const HARVEST: Effect = { kind: 'detonateStatus', status: 'curse', damagePer: 4, maxDamage: 20 };
const collapse = (amount: number): Effect => ({ kind: 'collapse', amount, per: 0.25, max: 2 });
const el = (element: string, amount: number): Effect => ({ kind: 'damage', amount, element });
/** 命綱: 次の敵の番が終わるまで、HPは1より下がらない */
const LIFELINE: Effect = { kind: 'grantAbility', turns: 0, abilities: [{ name: '命綱', effect: { modifier: 'endure' } }] };
/** 命綱（完全成功）: 次のターンのマナ+1 */
const NEXT_MANA: Effect = { kind: 'grantAbility', turns: 1, abilities: [{ name: '命綱の息継ぎ', effect: { when: 'turnStart', do: [{ kind: 'gainMana', amount: 1 }] } }] };

export const AXIS_CARDS: CardDef[] = [
  // ===== 軸① ブロック変換・反撃 =====
  c('axShieldSlam', 'シールドスラム', 'physical', 1, 80, 'enemy', [[slam(50, 60)], [slam(100, 60)], [slam(150, 60, 4)]], { rarity: 'rare', stat: 'vit', tags: ['block'], lineages: ['bu'], weaponTypes: ['hammer'] }),
  c('axFortress', '不落の城塞', 'skill', 2, 75, 'self', [[b(8)], [b(12)], [b(18)]], { rarity: 'epic', stat: 'vit', tags: ['block'], trait: t('要塞化', { when: 'afterCard', do: [FORTIFY] }) }),
  c('axSpikeArmor', 'スパイクアーマー', 'skill', 1, 80, 'self', [[b(5), spikes('スパイクアーマー', 2)], [b(8), spikes('スパイクアーマー', 5)], [b(12), spikes('スパイクアーマー', 8)]], { rarity: 'rare', stat: 'vit', tags: ['block'], lineages: ['bu', 'sei'], weaponTypes: ['spear'] }),
  c('axParry', 'パリィ・カウンター', 'physical', 1, 80, 'enemy', [[b(6)], [b(10)]], { rarity: 'epic', tags: ['block'], weaponTypes: ['katana', 'sword'], trait: t('後の先', { when: 'afterCard', do: [{ kind: 'intentDamage', max: 25 }] }) }),
  c('axReturnStroke', '返しの一手', 'physical', 1, 75, 'enemy', [[d(3), b(3)], [d(5), b(4)], [d(8), b(5)]], { rarity: 'rare', weaponTypes: ['spear', 'sword'], trait: t('返し', { modifier: 'damageDealt', multiplier: 1.5, if: [{ kind: 'counterAtLeast', key: 'unhurtTurn', n: 1, label: '前の敵の番にHPが減らなかった時' }] }) }),
  c('axBlockBreaker', 'ブロック砕き', 'physical', 1, 70, 'enemy', [[{ kind: 'breakBlock', amount: 4, stealPct: 50 }, d(4)], [{ kind: 'breakBlock', amount: 6, stealPct: 50 }, d(7)], [{ kind: 'breakBlock', amount: 8, stealPct: 50 }, d(10)]], { rarity: 'rare', weaponTypes: ['axe'] }),
  c('axIronMarch', '鉄壁の進軍', 'physical', 2, 70, 'allEnemies', [[slam(30, 24, undefined, 'target')], [slam(50, 24, undefined, 'target')], [slam(70, 24, undefined, 'target')]], { rarity: 'epic', stat: 'vit', tags: ['block', 'aoe'], trait: t('鉄壁', { when: 'perfect', do: [b(5)] }) }),
  c('axThornVow', '茨の誓い', 'skill', 1, 75, 'self', [[ba(3)], [ba(5)], [ba(7)]], { rarity: 'epic', tags: ['block'], lineages: ['sei'], trait: t('茨の誓い', { when: 'afterCard', do: [spikes('茨の誓い', 4, 1, 'allies')] }) }),
  c('axSteadfastFist', '不動の拳', 'skill', 1, 80, 'self', [[b(4), ...STEADFAST], [b(6), ...STEADFAST], [b(8), ...STEADFAST]], { rarity: 'rare', stat: 'vit', tags: ['block'], weaponTypes: ['fist'] }),

  // ===== 軸② BREAK・弱点 =====
  c('axArmorPierce', '鎧通しの一撃', 'physical', 1, 75, 'enemy', [[d(4)], [d(8)], [d(12)]], { rarity: 'rare', lineages: ['bu', 'gi'], weaponTypes: ['katana'], trait: t('体勢崩し', { modifier: 'damageDealt', multiplier: 2, if: [{ kind: 'targetBigIntent' }] }, [{ modifier: 'breakCount', multiplier: 2, if: [{ kind: 'targetBigIntent' }] }]) }),
  c('axWeakSight', '弱点看破', 'skill', 0, 85, 'enemy', [[st('vulnerable', 1)], [st('vulnerable', 2)]], { rarity: 'rare', stat: 'per', common: true, trait: t('看破', { when: 'perfect', if: [{ kind: 'oncePerTurn', key: 'axWeakSight' }], do: [{ kind: 'markFoe', mark: 'exposed' }] }) }),
  c('axElementChain', 'エレメンタル・チェイン', 'magic', 1, 75, 'enemy', [[d(5)], [d(9)], [d(14), mana(1)]], { rarity: 'epic', weaponTypes: ['tome', 'staff'], trait: t('属性変幻', { modifier: 'weaknessElement' }) }),
  c('axExecutioner', '処刑人の大鎌', 'physical', 2, 70, 'enemy', [[d(8)], [d(15)], [d(22)]], { rarity: 'epic', weaponTypes: ['scythe', 'axe'], trait: t('無慈悲', { modifier: 'damageDealt', multiplier: 2, if: [{ kind: 'targetDisabled' }] }) }),
  c('axVitalShot', '急所射ち', 'physical', 1, 75, 'enemy', [[d(4)], [d(7)], [d(10)]], { rarity: 'rare', weaponTypes: ['bow'], trait: t('急所', { when: 'afterCard', if: [{ kind: 'targetBroken' }, { kind: 'oncePerTurn', key: 'axVitalShot' }], do: [focus(1), draw(1)] }) }),
  c('axManaWedge', '魔力の楔', 'magic', 1, 75, 'enemy', [[d(3)], [d(6)], [d(8)]], { lineages: ['ma'], trait: t('楔', { modifier: 'breakOnSuccess', min: 1 }) }),
  c('axGuidingLight', '導きの光', 'skill', 1, 85, 'ally', [[{ kind: 'markAlly', mark: 'guided' }], [{ kind: 'markAlly', mark: 'guided' }, focus(1, 'target')]], { rarity: 'rare', lineages: ['sei'] }),

  // ===== 軸③ 連携（1人プレイでは報酬に出ない） =====
  c('axCombination', 'コンビネーション', 'physical', 1, 80, 'enemy', [[d(4)], [d(7)], [d(10)]], { common: true, teamOnly: true, tags: ['combo'], trait: t('追撃の合図', { when: 'combo', if: [{ kind: 'oncePerTurn', key: 'axCombination' }], do: [draw(1), mana(1)] }) }),
  c('axAssistPass', 'アシスト・パス', 'skill', 0, 85, 'ally', [[bt(3)], [focus(1, 'target'), { kind: 'markAlly', mark: 'comboUp' }]], { rarity: 'rare', teamOnly: true, tags: ['combo'], lineages: ['gi', 'sei'] }),
  c('axFinalUnison', 'ファイナル・ユニゾン', 'physical', 2, 65, 'enemy', [[d(7)], [d(13)], [d(20)], [d(28)]], { rarity: 'epic', common: true, teamOnly: true, tags: ['combo'], trait: t('絆の終撃', { modifier: 'comboScale', multiplier: 3 }) }),
  c('axPincer', '挟撃の陣', 'skill', 1, 80, 'enemy', [[{ kind: 'markFoe', mark: 'pincer', level: 1 }], [st('vulnerable', 1), { kind: 'markFoe', mark: 'pincer', level: 2 }], [st('vulnerable', 2), { kind: 'markFoe', mark: 'pincer', level: 3 }]], { rarity: 'rare', teamOnly: true, tags: ['combo'], lineages: ['bu', 'gi'] }),
  c('axRoundSong', '輪唱', 'skill', 1, 80, 'self', [[roundSong(2)], [roundSong(3)], [roundSong(4)]], { rarity: 'rare', teamOnly: true, tags: ['combo'], weaponTypes: ['instrument'] }),

  // ===== 軸④ 状態異常の起爆 =====
  c('axVenomBurst', '猛毒爆破', 'skill', 1, 75, 'enemy', [[{ kind: 'statusBurst', status: 'poison', per: 1, max: 75 }], [{ kind: 'statusBurst', status: 'poison', per: 2, max: 75 }], [{ kind: 'statusBurst', status: 'poison', per: 3, max: 75 }]], { rarity: 'epic', tags: ['poison'], trait: t('拡散', { when: 'afterCard', do: [{ kind: 'statusBurst', status: 'poison', halve: true, spread: true }] }) }),
  c('axBlazeCatalyst', '爆炎触媒', 'magic', 1, 75, 'allEnemies', [[{ kind: 'statusBurst', status: 'burn', flat: 4 }], [{ kind: 'statusScale', status: 'burn', add: 2, onlyIf: false }, { kind: 'tickNow', status: 'burn' }], [{ kind: 'statusScale', status: 'burn', mul: 2, maxAdd: 10 }, { kind: 'tickNow', status: 'burn' }]], { rarity: 'rare', tags: ['burn', 'aoe'], weaponTypes: ['tome'] }),
  c('axIceShatter', '氷砕き', 'physical', 1, 75, 'enemy', [[d(5), SHATTER], [d(9), SHATTER], [d(14), SHATTER]], { rarity: 'rare', tags: ['freeze'], weaponTypes: ['hammer', 'axe', 'fist'], trait: t('氷塊粉砕', { modifier: 'damageDealt', multiplier: 2.5, if: [{ kind: 'targetHasStatus', status: 'freeze' }] }) }),
  c('axCurseReturn', '呪詛返しの契り', 'magic', 1, 75, 'allEnemies', [[{ kind: 'cleanseBurst', per: 6, element: 'dark' }], [{ kind: 'cleanseBurst', per: 9, element: 'dark' }], [{ kind: 'cleanseBurst', per: 12, element: 'dark' }]], { rarity: 'epic', tags: ['curse', 'aoe'], trait: t('呪詛返し', { when: 'afterCard', do: [{ kind: 'applyStatus', status: 'curse', amount: 3, to: 'foes' }] }) }),
  c('axCurseHarvest', '呪いの刈り入れ', 'physical', 1, 75, 'enemy', [[el('dark', 4), HARVEST], [el('dark', 7), HARVEST], [el('dark', 10), HARVEST]], { rarity: 'rare', tags: ['curse'], weaponTypes: ['scythe'] }),
  c('axCollapse', '総崩れ', 'physical', 2, 65, 'enemy', [[collapse(5)], [collapse(9)], [collapse(13)], [collapse(18)]], { rarity: 'epic', lineages: ['gi'], trait: t('総崩れ', { when: 'perfect', do: [st('weak', 1)] }) }),

  // ===== 軸⑤ オーバーヒール・聖光 =====
  c('axOverflowBlessing', '溢れる祝福', 'magic', 1, 80, 'ally', [[{ kind: 'overflowHeal', amount: 5, per: 5 }], [{ kind: 'overflowHeal', amount: 8, per: 5 }], [{ kind: 'overflowHeal', amount: 12, per: 5 }]], { rarity: 'rare', tags: ['heal'] }),
  c('axSeraphim', '聖光解放・セラフィム', 'magic', 2, 70, 'allEnemies', [[{ kind: 'seraphim', amount: 5, per: 35, heal: 0 }], [{ kind: 'seraphim', amount: 9, per: 35, heal: 0 }], [{ kind: 'seraphim', amount: 14, per: 35, heal: 0 }]], { rarity: 'epic', tags: ['aoe'], trait: t('聖光爆発', { when: 'afterCard', do: [{ kind: 'heal', amount: 3, to: 'allies' }] }) }),
  c('axReversalSeal', '反転の呪印', 'magic', 1, 75, 'enemy', [[{ kind: 'reversal', pct: 100, max: 45 }], [{ kind: 'reversal', pct: 130, max: 45 }], [{ kind: 'reversal', pct: 160, max: 45 }]], { rarity: 'epic', tags: ['heal'], trait: t('反転', { when: 'perfect', do: [{ kind: 'holyGain', amount: 1 }] }) }),
  c('axLightHoard', '光の蓄え', 'skill', 1, 80, 'self', [[{ kind: 'holdLight' }], [{ kind: 'holdLight' }, { kind: 'holyGain', amount: 1 }]], { rarity: 'epic', trait: t('蓄光', { when: 'afterCard', do: [{ kind: 'holyGain', amount: 1 }] }) }),

  // ===== 軸⑥ 0コスト回転・お供号令 =====
  c('axQuickDraw', 'クイックドロー', 'physical', 0, 80, 'enemy', [[d(2)], [d(4), draw(1)]], { rarity: 'rare', weaponTypes: ['gun', 'dagger', 'fist'], trait: t('早撃ち', { when: 'afterCard', if: [{ kind: 'playedThisTurn', atLeast: 3 }, { kind: 'oncePerTurn', key: 'axQuickDraw' }], do: [mana(1)] }) }),
  c('axPetCharge', 'お供の突撃号令', 'skill', 1, 80, 'enemy', [[{ kind: 'petAct' }], [{ kind: 'petAct' }, { kind: 'summonStrike' }, st('vulnerable', 1)], [{ kind: 'petAct' }, { kind: 'petAct' }, { kind: 'summonStrike', times: 2 }, focus(1)]], { rarity: 'rare', tags: ['pet'] }),
  c('axFlurryGuard', '手数の極み', 'skill', 1, 85, 'self', [[{ kind: 'blockFromPlayed', max: 10 }], [{ kind: 'blockFromPlayed', max: 10 }]], { rarity: 'rare', tags: ['block'], lineages: ['bu'], trait: t('手数', { when: 'perfect', if: [{ kind: 'playedThisTurn', atLeast: 4 }], do: [mana(1)] }) }),
  c('axTreat', 'ごほうび', 'skill', 0, 85, 'self', [[b(2)], [b(3), { kind: 'petTreat' }]], { common: true, tags: ['pet'] }),
  c('axPackHunt', '群れの狩り', 'physical', 2, 70, 'enemy', [[d(5)], [d(8)], [d(12)]], { rarity: 'epic', tags: ['pet'], lineages: ['gi'], trait: t('群れ', { modifier: 'damageDealt', multiplier: 1, scale: { by: 'companions', per: 0.2, max: 0.8 } }) }),
  c('axLoadRound', '弾込め', 'skill', 0, 85, 'self', [[b(2)], [b(2), { kind: 'loadRound' }]], { rarity: 'rare', weaponTypes: ['gun', 'bow'] }),
  c('axFlowingStrikes', '流れる連撃', 'physical', 1, 75, 'enemy', [[{ kind: 'zeroFlurry', amount: 2, max: 4 }], [{ kind: 'zeroFlurry', amount: 3, max: 4 }], [{ kind: 'zeroFlurry', amount: 4, max: 4 }]], { rarity: 'rare', weaponTypes: ['dagger'], lineages: ['gi'] }),
  c('axChantMark', '詠唱の栞', 'skill', 0, 85, 'self', [[draw(1)], [{ kind: 'drawDiscount', category: 'magic', delta: -1 }]], { weaponTypes: ['tome'] }),

  // ===== 背水（HPを払う見返り） =====
  c('axAdversity', '逆境の刃', 'physical', 1, 75, 'enemy', [[{ kind: 'missingHpDamage', amount: 4, pct: 20, max: 12 }], [{ kind: 'missingHpDamage', amount: 7, pct: 20, max: 12 }], [{ kind: 'missingHpDamage', amount: 10, pct: 20, max: 12 }]], { rarity: 'rare', weaponTypes: ['axe', 'katana'] }),
  c('axBloodPrice', '血の代価', 'skill', 1, 85, 'self', [[{ kind: 'bloodPrice', max: 15 }], [{ kind: 'bloodPrice', max: 15, blockPct: 50 }]], { rarity: 'rare', lineages: ['bu'] }),
  c('axLifeline', '命綱', 'skill', 1, 80, 'self', [[LIFELINE], [LIFELINE], [LIFELINE, NEXT_MANA]], { rarity: 'epic', exhaust: true, trait: t('命綱', { modifier: 'exhaust' }) }),
];
