// 夢幻の大迷宮の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 総集編らしく、これまでの世界の力（氷・砂の毒・星・歯車・霧）を少しずつ。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
import type { ItemDef } from '../../../../types';

export const dreamGear: ItemDef[] = [
  // ----- 武器 -----
  {
    id: 'dreamEdge', name: '夢の刃', slot: 'weapon', weaponType: 'sword', rarity: 'epic', icon: 'sword', scenario: 'dreamLabyrinth',
    description: '完全成功で、ランダムな敵1体に闇属性の追撃4。1ターンに1回。悪夢を切る刃。', stats: { str: 6, dex: 4 }, tags: ['physical', 'dark'],
    cards: [{ cardId: 'wMithrilSlash', count: 2 }],
    ability: { name: '悪夢斬り', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'dreamEdge' }], do: [{ kind: 'damage', amount: 4, element: 'dark', to: 'randomFoe' }] } },
  },
  {
    id: 'memoryStaff', name: '記憶の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', scenario: 'dreamLabyrinth',
    description: '魔法の完全成功で、味方全員がブロック3を得る。1ターンに1回。', stats: { int: 8, vit: 2 }, tags: ['magic', 'block'],
    cards: [{ cardId: 'wLightning', count: 2 }],
    ability: { name: '記憶の守り', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'oncePerTurn', key: 'memoryStaff' }], do: [{ kind: 'block', amount: 3, to: 'allies' }] } },
  },
  {
    id: 'lullabySpear', name: '子守歌の槍', slot: 'weapon', weaponType: 'spear', rarity: 'rare', icon: 'spear', scenario: 'dreamLabyrinth',
    description: '眠りを誘う穂先を持つ槍。力のある者に馴染む。', stats: { str: 5, dex: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wtSpearHook', count: 2 }],
  },
  {
    id: 'pillowDagger', name: '枕元の短剣', slot: 'weapon', weaponType: 'dagger', rarity: 'rare', icon: 'dagger', scenario: 'dreamLabyrinth',
    description: '枕元に置かれていた小さな短剣。素早い者に馴染む。', stats: { dex: 4, agi: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wtDaggerVenom', count: 2 }],
  },
  {
    id: 'awakeningScepter', name: '目覚めの錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'dreamLabyrinth',
    description: '毎ターンの始めに、味方全員のHPを回復し、ブロック2を得る。朝を呼ぶ光。', stats: { int: 8, vit: 4 }, tags: ['holy', 'heal'],
    cards: [{ cardId: 'wtScepterJudgment', count: 2 }],
    ability: { name: '朝の光', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 3, to: 'allies' }, { kind: 'block', amount: 2, to: 'allies' }] } },
  },
  // ----- 鎧 -----
  { id: 'nightgown', name: '夢見のローブ', slot: 'armor', rarity: 'rare', icon: 'robe', scenario: 'dreamLabyrinth', description: '闇属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 3, tags: ['dark'], ability: { name: '悪夢除け', effect: { modifier: 'elementGuard', element: 'dark', mode: 'half' } } },
  { id: 'echoArmor', name: '残響の鎧', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'dreamLabyrinth', description: 'ダメージを受けるたびに、ブロック3を得る。', maxHp: 12, tags: ['block'], ability: { name: '記憶の殻', effect: { when: 'hurt', do: [{ kind: 'block', amount: 3 }] } } },
  { id: 'dawnMantle', name: '夜明けの外套', slot: 'armor', rarity: 'legend', icon: 'robe', scenario: 'dreamLabyrinth', description: '毎ターンの始めに、味方全員がブロック3を得る。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['block'], ability: { name: '夜明けの加護', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 3, to: 'allies' }] } } },
  // ----- 装飾品 -----
  { id: 'dreamCatcher', name: '夢の捕まえ網', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'dreamLabyrinth', description: '悪夢を捕まえる網。世界マップで遠くまで見渡せる。', stats: { per: 4 }, explore: { vision: 1 } },
  { id: 'memoryLocket', name: '思い出のロケット', slot: 'accessory', rarity: 'rare', icon: 'amulet', scenario: 'dreamLabyrinth', description: '運と体力が上がる。', stats: { luk: 5, vit: 4 } },
  { id: 'nightmareRing', name: '悪夢の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', scenario: 'dreamLabyrinth', description: '属性の無い物理攻撃に、闇の力が宿る。', tags: ['dark'], stats: { str: 4 }, ability: { name: '闇の付与', effect: { modifier: 'convertElement', into: 'dark' } } },
  { id: 'clearMindCharm', name: '澄んだ心のお守り', slot: 'accessory', rarity: 'epic', icon: 'charm', scenario: 'dreamLabyrinth', description: '完全成功すると、自分の悪い状態異常がすべて治る。1ターンに1回。', tags: ['focus'], stats: { vit: 4 }, ability: { name: '澄みわたる心', effect: { when: 'perfect', if: [{ kind: 'oncePerTurn', key: 'clearMindCharm' }], do: [{ kind: 'cleanse', to: 'self' }] } } },
  { id: 'sixWorldsBadge', name: '六つの世界の徽章', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'dreamLabyrinth', description: '敵を倒すたびに、固いブロックを得る。旅の記憶の証。', tags: ['block'], stats: { str: 6, vit: 6 }, ability: { name: '旅の記憶', effect: { when: 'kill', do: [{ kind: 'block', amount: 8 }] } } },
];
