// シナリオ5の依頼（spec §16・§17）。目標は src/engine/game/world/objectives/ の種類
import type { QuestDef } from '../../../../types';

export const quests: QuestDef[] = [
  {
    id: 'harborPatrol',
    title: '港の魔物退治',
    text: '雲の港の警備隊長「夜になると、星のかけらに操られた魔物が出る。3組、退治してくれ」',
    objective: { kind: 'defeatWanderers', count: 3 },
    reward: [{ kind: 'gold', amount: 60 }, { kind: 'item', rarity: 'rare', slot: 'consumable' }],
    rewardText: '60ゴールドとレアの消費アイテム',
  },
  {
    id: 'skyBellQuest',
    title: '天空の鐘',
    text: '風見の宿の主人「港の島の外れに、昔、空を渡る者を導いた鐘があるそうだ。鳴らしてきてくれ」',
    objective: { kind: 'visitLandmark', landmarkId: 'skyBell' },
    reward: [{ kind: 'lives', amount: 1 }, { kind: 'exp', amount: 40 }],
    rewardText: '命の灯火+1と経験値40',
  },
  {
    id: 'librarianQuest',
    title: '星の司書の本',
    text: '天文台の村長「天文台の司書が、星を読む禁じられた本を持ち出した。取り戻して、司書を止めてほしい」',
    objective: { kind: 'clearDungeon', dungeonId: 'observatory' },
    reward: [{ kind: 'gold', amount: 100 }, { kind: 'item', rarity: 'epic', slot: 'equipment' }],
    rewardText: '100ゴールドとエピックの装備',
  },
  {
    id: 'moonMaidenQuest',
    title: '月の乙女の庭',
    text: '庭師「庭の主の月の乙女を、鎮めてやってくれ。昔は、やさしい方だったのだ」',
    objective: { kind: 'clearDungeon', dungeonId: 'moonlitGarden' },
    reward: [{ kind: 'item', rarity: 'legend', slot: 'equipment' }],
    rewardText: 'レジェンドの装備',
  },
];
