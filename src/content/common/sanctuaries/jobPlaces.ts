import type { SanctuaryDef } from '../../../types';

// 祭壇は2〜3職で共用し、地図上は5か所に抑える（区切りF で新ジョブ4職を足した）。legacyIdsは旧保存の統合に使う。
export const sanctuaries: SanctuaryDef[] = [
  { id: 'pilgrimTemple', kind: 'temple', name: '巡礼の神殿', text: '最上位職と特殊職へ転職できる神殿。', progress: 0.3 },
  { id: 'summitTemple', kind: 'temple', name: '天望の神殿', text: '最上位職と特殊職へ転職できる神殿。', progress: 0.7 },
  { id: 'samuraiAltar', kind: 'altar', altars: ['samurai', 'magicKnight', 'fistSaint'], legacyIds: ['magicKnightAltar'], name: '剣の誓いの祭壇', text: '侍・魔剣士・拳聖への転職ができる。', progress: 0.25 },
  { id: 'timeMageAltar', kind: 'altar', altars: ['timeMage', 'necromancer', 'dragonVein'], legacyIds: ['necromancerAltar'], name: '禁書の祭壇', text: '時魔道士・死霊術師・竜脈術師への転職ができる。', progress: 0.5 },
  { id: 'darkKnightAltar', kind: 'altar', altars: ['darkKnight', 'shrineMaiden', 'bulwark'], legacyIds: ['shrineMaidenAltar'], name: '魂の誓いの祭壇', text: '暗黒騎士・巫女・重装衛士への転職ができる。', progress: 0.65 },
  { id: 'astrologerAltar', kind: 'altar', altars: ['astrologer', 'gambler'], legacyIds: ['gamblerAltar'], name: '運命の祭壇', text: '占星術師・賭博師への転職ができる。', progress: 0.4 },
  { id: 'machinistAltar', kind: 'altar', altars: ['machinist', 'bard', 'petTrainer'], legacyIds: ['bardAltar'], name: '技芸の祭壇', text: '機工士・吟遊詩人・調教師への転職ができる。', progress: 0.15 },
];
