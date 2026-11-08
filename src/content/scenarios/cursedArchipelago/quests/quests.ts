// シナリオ3の依頼（spec §16・§17）。目標は src/engine/game/world/objectives/ の種類
import type { QuestDef } from '../../../../types';

export const quests: QuestDef[] = [
  {
    id: 'borrowShip',
    title: '船を借りる',
    text: '港町の老船長「霧の海へ出るなら、船が要る。わしの船を貸そう。壊さんでくれよ」',
    objective: { kind: 'talk', text: '老船長から船を借りる' },
    reward: [{ kind: 'ship' }],
    rewardText: '船（海のマスを進めるようになる）',
  },
  {
    id: 'seaRaiders',
    title: '海辺の魔物退治',
    text: '港の兵士長「港の近くを荒らす魔物がいる。3組、追い払ってくれ」',
    objective: { kind: 'defeatWanderers', count: 3 },
    reward: [{ kind: 'gold', amount: 60 }, { kind: 'item', rarity: 'rare', slot: 'consumable' }],
    rewardText: '60ゴールドとレアの消費アイテム',
  },
  {
    id: 'tideStoneQuest',
    title: '潮騒の石碑',
    text: '珊瑚の村の長老「港の島の外れに、灯台の歌を刻んだ石碑があるという。読んできておくれ」',
    objective: { kind: 'visitLandmark', landmarkId: 'tideStone' },
    reward: [{ kind: 'lives', amount: 1 }, { kind: 'exp', amount: 40 }],
    rewardText: '命の灯火+1と経験値40',
  },
  {
    id: 'pirateCaptainQuest',
    title: '海賊船長の宝',
    text: '灯台守の老婆「海賊の隠れ島の船長は、月の灯台の鍵を持っているよ。倒せば、きっと宝も手に入る」',
    objective: { kind: 'clearDungeon', dungeonId: 'pirateIsland' },
    reward: [{ kind: 'gold', amount: 100 }, { kind: 'item', rarity: 'epic', slot: 'equipment' }],
    rewardText: '100ゴールドとエピックの装備',
  },
  {
    id: 'sunkenTempleQuest',
    title: '沈んだ神殿の祈り',
    text: '船大工「沈んだ神殿の奥の神官を倒してくれたら、わしの最高の一品を造ってやろう」',
    objective: { kind: 'clearDungeon', dungeonId: 'sunkenTemple' },
    reward: [{ kind: 'item', rarity: 'legend', slot: 'equipment' }],
    rewardText: 'レジェンドの装備',
  },
];
