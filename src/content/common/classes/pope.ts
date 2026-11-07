import type { ClassDef } from '../../../types';
import { bishop } from './bishop';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const pope: ClassDef = {
  ...bishop, id: 'pope', order: 209, name: '教皇', role: '慈愛で戦局を変える最上位職',
  tier: 'top', from: ['bishop'],
  baseMaxHp: bishop.baseMaxHp + 10,
  stats: { ...bishop.stats, per: bishop.stats.per + 8, int: bishop.stats.int + 8 },
  battleAbility: { name: '慈愛', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 2, to: 'allies' }] } },
  exploreAbility: { id: 'popeExplore', name: '加護', description: '休憩・野営の回復+100%', effect: { kind: 'restBonus', multiplier: 2 } },
  requires: { feat: 'success:heal', count: 20, text: '回復カードの成功20回' },
  cardPool: ["papalBlessing","papalLight","papalSanctuary","papalPrayer","miracle"], signature: ["papalBlessing","papalLight","papalSanctuary"],
  jobCards: ['miracle'],
};
