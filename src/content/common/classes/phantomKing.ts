import type { ClassDef } from '../../../types';
import { phantomTamer } from './phantomTamer';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const phantomKing: ClassDef = {
  ...phantomTamer, id: 'phantomKing', order: 206, name: '幻獣王', role: '王の軍勢で戦局を変える最上位職',
  tier: 'top', from: ['phantomTamer'],
  baseMaxHp: phantomTamer.baseMaxHp + 10,
  stats: { ...phantomTamer.stats, int: phantomTamer.stats.int + 8, per: phantomTamer.stats.per + 8 },
  battleAbility: { name: '王の軍勢', effect: { when: 'battleStart', do: [{ kind: 'summon', id: 'royalPhantom', name: '王の幻獣', icon: '🐉', damage: 8, turns: 99 }] } },
  exploreAbility: { id: 'phantomKingExplore', name: '幻獣の翼', description: '視界+2', effect: { kind: 'tracking', vision: 2, hiddenFindBonus: 0 } },
  requires: { feat: 'mana', count: 80, text: 'マナを合わせて80使う' },
  cardPool: ["royalPhoenix","phantomCommand","royalTortoise","feedBeast","phantomLegion"], signature: ["royalPhoenix","phantomCommand","royalTortoise"],
  jobCards: ['fxBahamut'], // 区切りD: 決め技（転職した時に山札へ1枚）
};
