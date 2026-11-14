import type { ClassDef } from '../../../types';
import { tamer } from './tamer';

// 特殊ジョブ（区切りF・2026-11-12）: 調教師。獣使いから。連れて歩いている「お供そのもの」を強くする、ただ1つのジョブ（docs/tasks/lineup-stageF-plan.md）
// 獣使いの「お供の効果2倍」（petMaster）も続く。お供の行動は、全部合わせて1ターン4回まで
export const petTrainer: ClassDef = {
  ...tamer, id: 'petTrainer', order: 313, name: '調教師', role: 'お供と心を合わせて戦う',
  tier: 'special', from: ['tamer'], altar: 'petTrainer',
  baseMaxHp: 66,
  stats: { ...tamer.stats, luk: tamer.stats.luk + 6, per: tamer.stats.per + 4 },
  weaponType: 'whip', subWeapons: ['instrument'],
  petMaster: true,
  battleAbility: { name: '相棒の覚醒', description: 'カードで自分が回復かブロックを得るたび、お供がすぐに1回行動する（1ターン2回まで）', effect: { when: 'selfBoost', if: [{ kind: 'hasPet' }, { kind: 'perTurn', key: 'kakusei', max: 2 }], do: [{ kind: 'petAct' }] } },
  exploreAbility: { id: 'petTrainerExplore', name: '懐き上手', description: 'お供の懐き度の上がり方が2倍。休憩などでお供を撫でると、その場の仲間全員のフォーカス+1（1回につき1回）', effect: { kind: 'combined', effects: [] } },
  requires: { feat: 'petBond', count: 15, text: 'お供の懐き度が♡3以上で、お供の行動が合わせて15回' },
  names: { male: ['ポポ', 'ハル', 'ソラ', 'ルカ'], female: ['ミミ', 'ココ', 'ユキ', 'ナナ'] },
  cardPool: ['ptPat', 'ptTogether', 'axTreat', 'axPetCharge', 'axPackHunt', 'axSurround'],
  signature: ['ptPat', 'ptTogether', 'axTreat'],
  jobCards: ['fxBondRampage'],
};
