// シナリオ7の依頼（spec §16・§17）。目標は src/engine/game/world/objectives/ の種類
import type { QuestDef } from '../../../../types';

export const quests: QuestDef[] = [
  {
    id: 'dreamPatrol',
    title: '悪夢の掃除',
    text: '目覚めの宿の夢守り「宿の近くに悪夢がうろついています。3組、追い払ってください」',
    objective: { kind: 'defeatWanderers', count: 3 },
    reward: [{ kind: 'gold', amount: 80 }, { kind: 'item', rarity: 'rare', slot: 'consumable' }],
    rewardText: '80ゴールドとレアの消費アイテム',
  },
  {
    id: 'fountainQuest',
    title: '夢の泉',
    text: '市場の古老「草原の外れに、記憶が湧く泉があるそうだ。覗いてきておくれ」',
    objective: { kind: 'visitLandmark', landmarkId: 'dreamFountain' },
    reward: [{ kind: 'lives', amount: 1 }, { kind: 'exp', amount: 50 }],
    rewardText: '命の灯火+1と経験値50',
  },
  {
    id: 'iceEchoQuest',
    title: '氷の記憶の残響',
    text: '提灯の丘の宿の主「氷の洞に、かつての女王の残響が眠っている。鎮めてくれたら、礼をしよう」',
    objective: { kind: 'clearDungeon', dungeonId: 'echoIceVault' },
    reward: [{ kind: 'gold', amount: 120 }, { kind: 'item', rarity: 'epic', slot: 'equipment' }],
    rewardText: '120ゴールドとエピックの装備',
  },
  {
    id: 'ghostEchoQuest',
    title: '幽霊船の悪夢',
    text: 'さまよう宿の女将「夜な夜な、幽霊船の悪夢が宿に迫ってくる。止めてくれたら、最高の一品を譲ろう」',
    objective: { kind: 'clearDungeon', dungeonId: 'echoGhostShip' },
    reward: [{ kind: 'item', rarity: 'legend', slot: 'equipment' }],
    rewardText: 'レジェンドの装備',
  },
];
