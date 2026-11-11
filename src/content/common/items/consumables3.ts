// 区切りE（2026-11-12）: Gemini の案の消耗品15個。docs/tasks/lineup-stageE-plan.md（オーナーの OK）。数値は Gemini の文のとおり、【提案】の所は計画に書いた物
// レジェンドの3個はお店で売らない（noShop）。区切りG（黄金の宝箱・災厄の中ボス）ができるまでは、レジェンドの宝箱からだけ出る
import type { ItemDef } from '../../../types';

export const consumables3: ItemDef[] = [
  { id: 'flashShard', name: '閃光の破砕玉', slot: 'consumable', rarity: 'epic', icon: 'smoke', description: 'まばゆい閃光で、大技の構えを崩す。', use: [{ kind: 'flashBreak', vulnerable: 2 }] },
  { id: 'heroElixir', name: '英雄の霊薬', slot: 'consumable', rarity: 'epic', icon: 'ether', description: '飲めば力がみなぎる、英雄の秘薬。', use: [{ kind: 'gainMana', amount: 2, to: 'target' }, { kind: 'gainFocus', amount: 2, to: 'target' }, { kind: 'draw', amount: 2, to: 'target' }] },
  { id: 'healingCenser', name: '全体治癒の香炉', slot: 'consumable', rarity: 'epic', icon: 'potion', description: '癒しの香りが、仲間全員を包む。', use: [{ kind: 'heal', amount: 25, to: 'allies' }, { kind: 'cleanse', to: 'allies', optional: true }] },
  { id: 'ironBanner', name: '鉄壁の陣旗', slot: 'consumable', rarity: 'epic', icon: 'antidote', description: '旗の下で、仲間が堅く守りを固める。', use: [{ kind: 'block', amount: 15, to: 'allies' }, { kind: 'grantAbility', turns: 0, to: 'allies', abilities: [{ name: '鉄壁の陣旗', effect: { modifier: 'statusGuard', statuses: ['weak', 'vulnerable'] } }] }] },
  { id: 'venomOil', name: '猛毒の塗薬', slot: 'consumable', rarity: 'rare', icon: 'antidote', description: '武器に塗る猛毒。この戦闘の間ずっと効く。', use: [{ kind: 'grantAbility', to: 'target', abilities: [{ name: '猛毒の塗薬', effect: { when: 'afterCard', if: [{ kind: 'cardHasDamage' }], do: [{ kind: 'applyStatus', status: 'poison', amount: 2, to: 'target' }] } }] }] },
  { id: 'blazeJar', name: '紅蓮の油壺', slot: 'consumable', rarity: 'rare', icon: 'smoke', description: '油をまいて火を放つ。敵は火に弱くなる。', use: [{ kind: 'applyStatus', status: 'burn', amount: 4, to: 'foes' }, { kind: 'tempWeak', element: 'fire' }] },
  { id: 'frostGem', name: '氷結の魔石', slot: 'consumable', rarity: 'epic', icon: 'smoke', description: '砕けば冷気があふれ、敵を凍らせる。', use: [{ kind: 'iceGem', amount: 10 }] },
  { id: 'luckyCat', name: '黄金の招き猫', slot: 'consumable', rarity: 'rare', icon: 'potion', description: '金色の猫が、お金と運を招く。', use: [{ kind: 'battleGoldMul', mul: 2 }, { kind: 'gainFocus', amount: 1, to: 'allies' }] },
  { id: 'phoenixFeather', name: '不死鳥の羽根', slot: 'consumable', rarity: 'legend', icon: 'potion', description: '燃え尽きても蘇る、不死鳥の羽根。1人1本しか持てない。', noShop: true, pouchMax: 1, use: [{ kind: 'phoenix', pct: 50 }] },
  { id: 'divineNectar', name: '神々の神酒', slot: 'consumable', rarity: 'legend', icon: 'potion', description: '神々が口にするという酒。', noShop: true, use: [{ kind: 'fullRestore' }, { kind: 'gainFocus', amount: 3, to: 'allies' }, { kind: 'gainMana', amount: 1, to: 'allies' }] },
  { id: 'timeHourglass', name: '時の砂時計', slot: 'consumable', rarity: 'legend', icon: 'ether', description: '砂を逆さにすると、敵の時がゆっくり流れる。', noShop: true, use: [{ kind: 'halveIntents' }, { kind: 'draw', amount: 2, to: 'allies' }] },
  { id: 'purifyCrystal', name: '浄化の聖結晶', slot: 'consumable', rarity: 'epic', icon: 'antidote', description: '大地の侵食を少しだけ押し戻す結晶。', use: [{ kind: 'fieldOnly', what: 'purify', amount: 3, focus: 2 }] },
  { id: 'campTent', name: 'テントの設営具', slot: 'consumable', rarity: 'rare', icon: 'potion', description: 'しっかりしたテント。夜の魔物も近寄れない。', use: [{ kind: 'fieldOnly', what: 'tent' }] },
  { id: 'whetstone', name: 'カード鍛錬の砥石', slot: 'consumable', rarity: 'epic', icon: 'ether', description: '技を磨き上げる砥石。強化はこの冒険の間だけ。', use: [{ kind: 'fieldOnly', what: 'whetstone' }] },
  { id: 'petFeast', name: 'お供の特上ごちそう', slot: 'consumable', rarity: 'rare', icon: 'potion', description: 'お供が大はしゃぎする特別なごちそう。', use: [{ kind: 'feedPet', amount: 30 }, { kind: 'fieldOnly', what: 'petFeast', amount: 3 }] },
];
