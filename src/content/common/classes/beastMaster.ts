import type { ClassDef } from '../../../types';
import { tamer } from './tamer';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const beastMaster: ClassDef = {
  ...tamer, id: 'beastMaster', order: 211, name: 'ビーストマスター', role: '群れで戦局を変える最上位職',
  tier: 'top', from: ['tamer'],
  baseMaxHp: tamer.baseMaxHp + 10,
  stats: { ...tamer.stats, per: tamer.stats.per + 8, dex: tamer.stats.dex + 8 },
  battleAbility: { name: '群れ', effect: { when: 'battleStart', do: [1, 2, 3].map(n => ({ kind: 'summon' as const, id: `royalBeast${n}`, name: `群れの獣${n}`, icon: '🐾', damage: 4, turns: 99 })) } },
  exploreAbility: { id: 'beastMasterExplore', name: '群れの導き', description: '移動のサイコロ+1・夜でも視界が減らない', effect: { kind: 'travel', moveBonus: 1, nightVision: true } },
  requires: { feat: 'kills', count: 8, text: '敵を8体倒す' },
  cardPool: ["packAssault","packGuard","alphaCall","packCare","wildKingdom","axPetCharge","axPackHunt"], signature: ["packAssault","packGuard","alphaCall"], petMaster: true,
  jobCards: ['fxBeastRoar'], // 区切りD: 決め技（転職した時に山札へ1枚）
};
