// 専用の札が足りなかった6職の、新しい札（2026-11-12。docs/tasks/job-unique-cards-plan.md。オーナーの OK）
// どれも、そのジョブの力と組んで、ほかの札にできない事をする。置き場所は各ジョブの cardPool だけ（共通・武器種・系統には置かない）
import type { CardDef, Effect } from '../../../types';

const b = (amount: number): Effect => ({ kind: 'block', amount });
const tiers = (list: Effect[][]) => list.map((effects, i) => ({ minSuccesses: i, effects }));

export const JOB_UNIQUE_CARDS: CardDef[] = [
  // 闘士《猛連撃》: 手数を重ねたターンの「締め」
  { id: 'brFinishFist', name: '締めの拳', category: 'physical', cost: 1, slots: 2, baseChance: 75, target: 'enemy', rarity: 'rare', stat: 'str', tags: ['combo'],
    tiers: tiers([4, 6, 9].map((amount) => [{ kind: 'comboFinish', amount, per: 2, max: 8, category: 'physical' }])) },
  // 占星術師《星読み》: 先読みで見えた外れを、直して使う
  { id: 'asStarGuide', name: '星の導き', category: 'skill', cost: 1, slots: 1, baseChance: 85, target: 'self', rarity: 'rare', stat: 'luk',
    tiers: tiers([[{ kind: 'fixMiss', count: 1 }], [{ kind: 'fixMiss', count: 2 }]]) },
  // 弓聖《必中》: 完全成功を、手数に変える
  { id: 'bsChaseArrow', name: '追い矢', category: 'physical', cost: 1, slots: 2, baseChance: 75, target: 'enemy', rarity: 'rare', stat: 'dex',
    tiers: tiers([3, 5, 8].map((amount) => [{ kind: 'perfectVolley', amount, max: 3 }])) },
  // ビーストマスター《群れ》: ばらばらに当たる獣の攻撃を、1体に集める
  { id: 'bmFocusPack', name: '狙いを合わせろ', category: 'skill', cost: 1, slots: 2, baseChance: 80, target: 'enemy', rarity: 'rare', tags: ['summon'],
    tiers: tiers([[{ kind: 'summonFocus' }], [{ kind: 'summonFocus' }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }], [{ kind: 'summonFocus' }, { kind: 'applyStatus', status: 'vulnerable', amount: 2 }]]) },
  // 侍《居合》: 守りながらためられる、ただ1枚の札
  { id: 'smStillStance', name: '居合の構え', category: 'skill', cost: 1, slots: 2, baseChance: 80, target: 'self', rarity: 'rare', stat: 'vit', tags: ['block'],
    tiers: tiers([[b(6)], [b(9)], [b(12)]]), trait: { name: '不動', effect: { modifier: 'noPlayCount' } } },
  // 魔剣士《魔法剣》: 1回宿した属性を、2回使う
  { id: 'mkDoubleImbue', name: '二重付与', category: 'skill', cost: 0, slots: 1, baseChance: 85, target: 'self', rarity: 'rare', stat: 'int',
    tiers: tiers([[{ kind: 'imbueExtend', cards: 2 }], [{ kind: 'imbueExtend', cards: 2 }, { kind: 'gainFocus', amount: 1 }]]) },
];
