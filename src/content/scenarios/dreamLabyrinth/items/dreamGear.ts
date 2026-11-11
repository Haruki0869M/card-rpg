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
    description: 'コスト2以上の魔法が完全成功すると、その効果がもう一度起きる。1回の戦闘で1回だけ。', stats: { int: 8, vit: 2 }, tags: ['magic', 'highCost'],
    cards: [{ cardId: 'wLightning', count: 2 }],
    ability: { name: '追憶', description: 'コスト2以上の魔法カードが完全成功した時（1回の戦闘で1回まで）：使ったカードの効果をもう一度発動', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'cardCost', min: 2 }, { kind: 'perBattle', key: 'memoryStaff', max: 1 }], do: [{ kind: 'repeatCard' }] } },
  },
  {
    id: 'lullabySpear', name: '子守歌の槍', slot: 'weapon', weaponType: 'spear', rarity: 'rare', icon: 'spear', scenario: 'dreamLabyrinth',
    description: '眠りを誘う穂先を持つ槍。敵をまとめて薙ぎ払う技が付く。', stats: { str: 5, dex: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wtSpearSweep', count: 2 }],
  },
  {
    id: 'pillowDagger', name: '枕元の短剣', slot: 'weapon', weaponType: 'dagger', rarity: 'rare', icon: 'dagger', scenario: 'dreamLabyrinth',
    description: '枕元に置かれていた小さな短剣。影から刺して、敵を弱らせる技が付く。', stats: { dex: 4, agi: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wtDaggerShadow', count: 2 }],
  },
  {
    id: 'awakeningScepter', name: '目覚めの錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'dreamLabyrinth',
    description: '毎ターンの始めに、味方全員のHPを回復し、ブロック2を得る。朝を呼ぶ光。', stats: { int: 8, vit: 4 }, tags: ['holy', 'heal'],
    cards: [{ cardId: 'wtScepterJudgment', count: 2 }],
    ability: { name: '朝の光', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 3, to: 'allies' }, { kind: 'block', amount: 2, to: 'allies' }] } },
  },
  // ----- 鎧 -----
  { id: 'nightgown', name: '夢見のローブ', slot: 'armor', rarity: 'rare', icon: 'robe', scenario: 'dreamLabyrinth', description: '闇属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 3, tags: ['dark'], ability: { name: '悪夢除け', effect: { modifier: 'elementGuard', element: 'dark', mode: 'half' } } },
  { id: 'echoArmor', name: '残響の鎧', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'dreamLabyrinth', description: '戦闘の最初のターン、最初に使うカードのコストが0になる。', maxHp: 12, tags: ['free', 'highCost'], ability: { name: 'やまびこ', description: '戦闘の1ターン目、最初に使うカードのコストが0になる', effect: { modifier: 'cardCost', set: 0, if: [{ kind: 'turnAtMost', turn: 1 }, { kind: 'playedAtMost', count: 0 }] } } },
  { id: 'dawnMantle', name: '夜明けの外套', slot: 'armor', rarity: 'legend', icon: 'robe', scenario: 'dreamLabyrinth', description: 'フォーカスを使ってカードを使うと、ブロック5を得て、カードを1枚引く。1ターンに1回。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['focus', 'block', 'draw'], ability: { name: '夜明けの加護', description: 'フォーカスを使ってカードを使った後（1ターンに1回）：ブロック5、カードを1枚引く', effect: { when: 'afterCard', if: [{ kind: 'usedFocus' }, { kind: 'oncePerTurn', key: 'dawnMantle' }], do: [{ kind: 'block', amount: 5 }, { kind: 'draw', amount: 1 }] } } },
  // ----- 装飾品 -----
  { id: 'dreamCatcher', name: '夢の捕まえ網', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'dreamLabyrinth', description: '悪夢を捕まえる網。運が上がり、世界マップで遠くまで見渡せる。', stats: { luk: 4 }, explore: { vision: 1 } },
  { id: 'memoryLocket', name: '思い出のロケット', slot: 'accessory', rarity: 'rare', icon: 'amulet', scenario: 'dreamLabyrinth', description: '運と体力が上がる。', stats: { luk: 5, vit: 4 } },
  { id: 'nightmareRing', name: '悪夢の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', scenario: 'dreamLabyrinth', description: '属性の無い物理攻撃に、闇の力が宿る。', tags: ['dark'], stats: { str: 4 }, ability: { name: '闇の付与', effect: { modifier: 'convertElement', into: 'dark' } } },
  { id: 'clearMindCharm', name: '澄んだ心のお守り', slot: 'accessory', rarity: 'epic', icon: 'charm', scenario: 'dreamLabyrinth', description: '完全成功すると、自分の悪い状態異常がすべて治る。1ターンに1回。', tags: ['focus'], stats: { vit: 4 }, ability: { name: '澄みわたる心', effect: { when: 'perfect', if: [{ kind: 'oncePerTurn', key: 'clearMindCharm' }], do: [{ kind: 'cleanse', to: 'self' }] } } },
  { id: 'sixWorldsBadge', name: '六つの世界の徽章', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'dreamLabyrinth', description: '同じターンに、物理・魔法・スキルのカードを全部使うと、マナ2を得て、カードを2枚引く。1ターンに1回。全部の能力値が上がる。', tags: ['mana', 'draw'], stats: { str: 4, vit: 4, int: 4, dex: 4, agi: 4, per: 4, luk: 4 }, ability: { name: '万華鏡', description: '同じターンに物理・魔法・スキルのカードを全部使った時（1ターンに1回）：マナ+2、カードを2枚引く', effect: { when: 'afterCard', if: [{ kind: 'playedCategories', categories: ['physical', 'magic', 'skill'] }, { kind: 'oncePerTurn', key: 'sixWorldsBadge' }], do: [{ kind: 'gainMana', amount: 2 }, { kind: 'draw', amount: 2 }] } } },
];
