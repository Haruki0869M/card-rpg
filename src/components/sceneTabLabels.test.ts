import { describe, expect, it } from 'vitest';
import { sceneTabLabels } from './sceneTabLabels';
import type { Expedition, Hero } from '../types';

const exp = (id: string, name: string, heroes: string[]) => ({ id, heroes, mode: 'dungeon', dungeon: { name } }) as unknown as Expedition;
const heroes = [
  { id: 'eld', name: 'エルド' },
  { id: 'rina', name: 'リナ' },
] as unknown as Hero[];

describe('場面のタブの名前', () => {
  it('同じ名前が1つなら、そのまま', () => {
    expect(sceneTabLabels([exp('x1', '翠の神殿', ['eld'])], heroes)).toEqual(['翠の神殿']);
    expect(sceneTabLabels([exp('x1', '翠の神殿', ['eld']), exp('x2', '静寂の地下墓地', ['rina'])], heroes)).toEqual(['翠の神殿', '静寂の地下墓地']);
  });
  it('同じ名前が2つ以上なら、先頭のキャラの名前を付けて見分ける', () => {
    expect(sceneTabLabels([exp('x1', '翠の神殿', ['eld']), exp('x2', '翠の神殿', ['rina'])], heroes)).toEqual(['翠の神殿（エルド）', '翠の神殿（リナ）']);
  });
  it('ダンジョンの名前が無い時は「ダンジョン」', () => {
    expect(sceneTabLabels([{ id: 'x1', heroes: ['eld'], mode: 'dungeon' } as Expedition], heroes)).toEqual(['ダンジョン']);
  });
});
