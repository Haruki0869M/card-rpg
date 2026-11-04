import type { CharacterDef } from '../types';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'warrior',
    name: '戦士',
    role: 'アタッカー兼タンク',
    icon: '🪓',
    maxHp: 60,
    affinity: { physical: 5, magic: -15, skill: 0 },
    deck: [
      { cardId: 'strike', count: 3 },
      { cardId: 'guard', count: 3 },
      { cardId: 'heavySwing', count: 2 },
      { cardId: 'shieldBash', count: 1 },
      { cardId: 'warCry', count: 1 },
    ],
    fourOnly: false,
  },
  {
    id: 'mage',
    name: '魔道士',
    role: '高火力ギャンブラー',
    icon: '🔮',
    maxHp: 42,
    affinity: { physical: -15, magic: 10, skill: 5 },
    deck: [
      { cardId: 'magicArrow', count: 3 },
      { cardId: 'guard', count: 3 },
      { cardId: 'gambleBolt', count: 2 },
      { cardId: 'meditate', count: 2 },
    ],
    fourOnly: false,
  },
  {
    id: 'guardian',
    name: '守護者',
    role: '盾役',
    icon: '🛡️',
    maxHp: 72,
    affinity: { physical: 0, magic: -20, skill: 10 },
    deck: [
      { cardId: 'strike', count: 2 },
      { cardId: 'guard', count: 3 },
      { cardId: 'shieldBash', count: 2 },
      { cardId: 'warCry', count: 2 },
      { cardId: 'meditate', count: 1 },
    ],
    fourOnly: true,
  },
  {
    id: 'hunter',
    name: '狩人',
    role: '万能型',
    icon: '🏹',
    maxHp: 50,
    affinity: { physical: 0, magic: 0, skill: 5 },
    deck: [
      { cardId: 'strike', count: 3 },
      { cardId: 'guard', count: 2 },
      { cardId: 'heavySwing', count: 1 },
      { cardId: 'gambleBolt', count: 1 },
      { cardId: 'shieldBash', count: 1 },
      { cardId: 'meditate', count: 2 },
    ],
    fourOnly: true,
  },
];

export function getCharacter(id: string): CharacterDef {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown character: ${id}`);
  return c;
}

export function partyFor(size: 2 | 4): CharacterDef[] {
  return CHARACTERS.filter((c) => size === 4 || !c.fourOnly);
}
