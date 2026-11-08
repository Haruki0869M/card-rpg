// シナリオ6の依頼（spec §16・§17）。目標は src/engine/game/world/objectives/ の種類
import type { QuestDef } from '../../../../types';

export const quests: QuestDef[] = [
  {
    id: 'streetBots',
    title: '暴走した機械の掃除',
    text: '煙突の街の警備隊長「街の機械が暴れている。3組、止めてくれ」',
    objective: { kind: 'defeatWanderers', count: 3 },
    reward: [{ kind: 'gold', amount: 60 }, { kind: 'item', rarity: 'rare', slot: 'consumable' }],
    rewardText: '60ゴールドとレアの消費アイテム',
  },
  {
    id: 'blueprintQuest',
    title: '古い設計図',
    text: '市場の老職人「街の外れに、大機械の古い設計図が残っているそうだ。読んできておくれ」',
    objective: { kind: 'visitLandmark', landmarkId: 'oldBlueprint' },
    reward: [{ kind: 'lives', amount: 1 }, { kind: 'exp', amount: 40 }],
    rewardText: '命の灯火+1と経験値40',
  },
  {
    id: 'boilerQuest',
    title: '暴走ボイラーを止めろ',
    text: '野営地の主人「発電所のボイラーが暴走している。止めてくれたら、礼をしよう」',
    objective: { kind: 'clearDungeon', dungeonId: 'steamPlant' },
    reward: [{ kind: 'gold', amount: 100 }, { kind: 'item', rarity: 'epic', slot: 'equipment' }],
    rewardText: '100ゴールドとエピックの装備',
  },
  {
    id: 'clockSageQuest',
    title: '時計仕掛けの賢者',
    text: '砦の鍛冶長「時計塔の賢者を止めてくれたら、わしの最高の一品を打とう」',
    objective: { kind: 'clearDungeon', dungeonId: 'clockTower' },
    reward: [{ kind: 'item', rarity: 'legend', slot: 'equipment' }],
    rewardText: 'レジェンドの装備',
  },
];
