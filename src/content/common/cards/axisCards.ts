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
];
