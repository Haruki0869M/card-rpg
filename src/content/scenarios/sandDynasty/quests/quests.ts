// シナリオ4の依頼（spec §16・§17）。目標は src/engine/game/world/objectives/ の種類
import type { QuestDef } from '../../../../types';

export const quests: QuestDef[] = [
  {
    id: 'oasisRaiders',
    title: 'オアシスの魔物退治',
    text: 'オアシスの長老「泉の近くを魔物が荒らしています。3組、追い払ってください」',
    objective: { kind: 'defeatWanderers', count: 3 },
    reward: [{ kind: 'gold', amount: 60 }, { kind: 'item', rarity: 'rare', slot: 'consumable' }],
    rewardText: '60ゴールドとレアの消費アイテム',
  },
  {
    id: 'sunTabletQuest',
    title: '太陽の石板',
    text: '市場の老商人「麓の外れに、王朝の昔の祈りを刻んだ石板があるそうだ。読んできてくれんか」',
    objective: { kind: 'visitLandmark', landmarkId: 'sunTablet' },
    reward: [{ kind: 'lives', amount: 1 }, { kind: 'exp', amount: 40 }],
    rewardText: '命の灯火+1と経験値40',
  },
  {
    id: 'scorpionQuest',
    title: '蠍の墓所の宝',
    text: '隊商の宿の主人「蠍の墓所の王を倒せば、隊商の道が安全になる。倒してくれたら、礼をしよう」',
    objective: { kind: 'clearDungeon', dungeonId: 'scorpionTomb' },
    reward: [{ kind: 'gold', amount: 100 }, { kind: 'item', rarity: 'epic', slot: 'equipment' }],
    rewardText: '100ゴールドとエピックの装備',
  },
  {
    id: 'statueQuest',
    title: '石像の守護獣',
    text: '墓守の隊長「神殿の守護獣を倒してくれたら、一族に伝わる最高の一品を譲ろう」',
    objective: { kind: 'clearDungeon', dungeonId: 'statueTemple' },
    reward: [{ kind: 'item', rarity: 'legend', slot: 'equipment' }],
    rewardText: 'レジェンドの装備',
  },
];
