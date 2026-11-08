// 通路の絵の読み先: そのダンジョンIDの絵があればそれ、無ければ部屋の背景の名前（K4）
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { corridorArt } from './DungeonView';

describe('通路の絵を読む名前', () => {
  it('そのダンジョンIDの通路の絵があれば、ダンジョンIDを使う（部屋の背景は使い回しのままでよい）', () => {
    expect(corridorArt('crystalCave', 'temple')).toBe('crystalCave');
    expect(corridorArt('gearFactory', 'catacomb')).toBe('gearFactory');
  });

  it('通路の絵が無ければ、部屋の背景の名前（今までどおり）', () => {
    expect(corridorArt('emeraldTemple', 'temple')).toBe('temple');
    expect(corridorArt('noSuchDungeon', 'volcano')).toBe('volcano');
    expect(corridorArt(undefined, 'catacomb')).toBe('catacomb');
  });

  it('ダンジョンのデータのIDは、そのまま通路の絵のIDとして使える（実在するダンジョンで確かめる）', () => {
    const ids = DUNGEONS.all.map((d) => d.id);
    expect(ids).toContain('crystalCave');
    for (const id of ids) expect(typeof corridorArt(id, 'temple')).toBe('string');
  });
});
