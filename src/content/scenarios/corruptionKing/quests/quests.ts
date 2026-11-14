// シナリオ1の依頼（spec §16.2・§17）。目標は src/engine/game/world/objectives/ の種類
import type { QuestDef } from '../../../../types';

export const quests: QuestDef[] = [
  {
    id: 'wolfHunt',
    title: '街道の魔物退治',
    text: '王都の兵士長「街道を荒らす魔物を3体退治してくれ。報酬ははずむぞ」',
    objective: { kind: 'defeatWanderers', count: 3 },
    reward: [{ kind: 'gold', amount: 60 }, { kind: 'item', rarity: 'rare', slot: 'consumable' }],
    rewardText: '60ゴールドとレアの消費アイテム',
  },
  {
    id: 'ancientEmblem',
    title: '古い紋章',
    text: '村の長老「平原の西の古い遺跡に、神殿ゆかりの紋章が眠っておる。持ち帰ってくれんか」',
    objective: { kind: 'visitLandmark', landmarkId: 'oldRuins' },
    reward: [{ kind: 'gold', amount: 50 }, { kind: 'item', rarity: 'rare', slot: 'equipment' }],
    rewardText: '50ゴールドとレアの装備',
  },
  {
    id: 'holyWater',
    title: '墓守の万能薬',
    text: '墓守の老人「亡者の呪いにも効く万能薬がほしい。王都の店で売っておるはずじゃ」',
    objective: { kind: 'deliverItem', itemId: 'antidote' },
    reward: [{ kind: 'lives', amount: 1 }, { kind: 'exp', amount: 40 }],
    rewardText: '命の灯火+1と経験値40',
  },
  {
    id: 'legendSmith',
    title: '伝説の鍛冶',
    text: '鍛冶屋「溶岩の大空洞の奥には、伝説の金属が眠る。炎竜を倒して持ってきてくれれば、最高の一品を打ってやる」',
    objective: { kind: 'clearDungeon', dungeonId: 'lavaCavern' },
    reward: [{ kind: 'item', rarity: 'legend', slot: 'equipment' }],
    rewardText: 'レジェンドの装備',
  },
];
