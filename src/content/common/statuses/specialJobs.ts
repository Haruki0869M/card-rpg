import { BALANCE } from '../../../data/balance';
import type { StatusDef } from '../../../types';
export const specialStatuses: StatusDef[] = [
  { id: 'possession', name: '神降ろし', icon: 'sun', color: '#fff0a0', bg: '#49391a', harmful: false,
    maxStacks: BALANCE.specialJobs.possessionTurns, dealtMultiplier: BALANCE.specialJobs.possessionDamage,
    flatChanceBonus: BALANCE.specialJobs.possessionChance,
    description: `与えるダメージ×${BALANCE.specialJobs.possessionDamage}・カード成功率+${BALANCE.specialJobs.possessionChance}%。数値は残りターン。同じ強化は重ならず残り期間を更新する` },
  { id: 'songInspired', name: '奮い立つ歌', icon: 'sparkles', color: '#b6efff', bg: '#173b52', harmful: false,
    maxStacks: 1, decay: 0, chanceBonus: BALANCE.specialJobs.songChance,
    description: `次に使うカードの成功率+${BALANCE.specialJobs.songChance}%。同じ歌は重ならず、カードを使うと消える` },
];
