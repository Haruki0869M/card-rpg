// シナリオ2の依頼（spec §16・§17）。目標は src/engine/game/world/objectives/ の種類
import type { QuestDef } from '../../../../types';

export const quests: QuestDef[] = [
  {
    id: 'firewoodRun',
    title: '街道の魔物退治',
    text: '灯火の村の書記官「村の薪を運ぶ道に魔物が出ます。3組、追い払ってください」',
    objective: { kind: 'defeatWanderers', count: 3 },
    reward: [{ kind: 'gold', amount: 60 }, { kind: 'item', rarity: 'rare', slot: 'consumable' }],
    rewardText: '60ゴールドとレアの消費アイテム',
  },
  {
    id: 'frozenSoldiers',
    title: '凍った兵士たち',
    text: '宿場町の隊長「雪林をさまよう凍った兵士どもを、5組倒してくれ。かつての仲間たちだ…」',
    objective: { kind: 'defeatWanderers', count: 5 },
    reward: [{ kind: 'gold', amount: 80 }, { kind: 'item', rarity: 'rare', slot: 'equipment' }],
    rewardText: '80ゴールドとレアの装備',
  },
  {
    id: 'songStoneQuest',
    title: '古い歌碑',
    text: '漁村の長老「麓の外れに、春の歌を刻んだ石碑があるという。その歌を、聞いてきておくれ」',
    objective: { kind: 'visitLandmark', landmarkId: 'songStone' },
    reward: [{ kind: 'lives', amount: 1 }, { kind: 'exp', amount: 40 }],
    rewardText: '命の灯火+1と経験値40',
  },
  {
    id: 'giantMineQuest',
    title: '霜の巨人の鉱山',
    text: '砦の鍛冶屋「鉱山の奥の巨人を倒してくれたら、わしの最高の一品を打ってやろう」',
    objective: { kind: 'clearDungeon', dungeonId: 'giantMine' },
    reward: [{ kind: 'item', rarity: 'legend', slot: 'equipment' }],
    rewardText: 'レジェンドの装備',
  },
];
