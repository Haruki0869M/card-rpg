import { describe, expect, it } from 'vitest';
import type { WorldState } from '../../../types';
import { neighborAt, terrainLevel } from '../diorama';
import { riverLinks, scatter } from './scatter';

// 8×6 の小さな地図: 上の2行が丘と山、真ん中が平原と森、右下に湖、(3,3) に町
const W = 8, H = 6;
const terrain = (c: number, r: number) => (r === 0 ? (c < 4 ? 'mountain' : 'hills') : r === 1 && c % 3 === 0 ? 'hills' : r >= 4 && c >= 6 ? 'water' : c < 3 ? 'forest' : 'plains');
const tiles = Array.from({ length: W * H }, (_, i) => {
  const c = i % W, r = Math.floor(i / W);
  return { t: terrain(c, r), r: 0, seen: true, ...(c === 3 && r === 3 ? { f: { kind: 'town', id: 'x' } } : {}) };
}) as unknown as WorldState['tiles'];
const w = { width: W, height: H, tiles };
const levels = tiles.map((t) => terrainLevel(t.t));
const geom = { R: 20, center: (i: number) => ({ x: (i % W) * 35, y: Math.floor(i / W) * 20 }) };

describe('景色の置き方（見た目だけ）', () => {
  it('川は毎回同じで、町・水・丘・山のマスを通らず、つながりは両側からそろう', () => {
    const a = riverLinks(w, levels);
    const b = riverLinks(w, levels);
    expect([...a]).toEqual([...b]);
    expect(a.size).toBeGreaterThan(0);
    for (const [i, ks] of a) {
      expect(tiles[i].f).toBeUndefined();
      expect(levels[i]).toBe(1);
      for (const k of ks) {
        const j = neighborAt(w, i, k);
        // 隣が普通のマスなら、隣からもこちらへつながっている（丘・山＝水源、水＝注ぐ所、地図の外＝端へ流れ出る）
        if (j !== undefined && levels[j] === 1) expect(a.get(j)).toContain((k + 3) % 6);
      }
    }
  });

  it('立つ物は毎回同じで、場所のマスには置かず、森には木・山には峰がある', () => {
    const inp = { w, geom, levels, links: new Map(), rivers: riverLinks(w, levels), blocked: (i: number) => !!tiles[i].f, stage: 0 };
    const a = scatter(inp);
    expect(scatter(inp)).toEqual(a);
    expect(a.some((it) => it.tile === 3 * W + 3 && it.k !== 'ridge')).toBe(false);
    expect(a.some((it) => it.k === 'pine' || it.k === 'broadleaf')).toBe(true);
    expect(a.some((it) => it.k === 'peak')).toBe(true);
    expect(a.some((it) => it.k === 'ridge')).toBe(true);
    // 侵食度の段階が上がると、結晶・亀裂が出る
    expect(scatter({ ...inp, stage: 3 }).some((it) => it.k === 'crystal' || it.k === 'crack')).toBe(true);
  });

  it('雪原には雪だまりと雪の岩、氷原には氷の結晶・岩・木が立ち、湖の氷はほとんど空いている', () => {
    const kinds = (terrainId: string) => {
      const ts = tiles.map((t) => ({ ...t, t: terrainId, f: undefined })) as unknown as WorldState['tiles'];
      const items = scatter({ w: { ...w, tiles: ts }, geom, levels: ts.map(() => 1), links: new Map(), rivers: new Map(), blocked: () => false, stage: 0 });
      return { set: new Set(items.map((it) => it.k)), n: items.length };
    };
    const snow = kinds('snow').set;
    expect(snow.has('snowPine') && snow.has('snowDrift') && snow.has('snowRock')).toBe(true);
    const ice = kinds('ice');
    expect([...ice.set].sort()).toEqual(['iceCrystal', 'iceRock', 'iceTree']);
    const lake = kinds('lakeIce');
    expect([...lake.set].every((k) => k === 'iceCrystal' || k === 'snowDrift')).toBe(true);
    // 湖の氷は滑って進む道: 立つ物は氷原の半分より少ない
    expect(lake.n).toBeLessThan(ice.n / 2);
  });

  it('海: 町のとなりの海に灯台が1つ、ほかの海に岩礁や難破船', () => {
    // 全部を海にして、真ん中に町を1つ
    const ts = tiles.map((t, i) => ({ ...t, t: 'sea', f: i === 2 * W + 3 ? { kind: 'town', id: 'x' } : undefined })) as unknown as WorldState['tiles'];
    const items = scatter({ w: { ...w, tiles: ts }, geom, levels: ts.map(() => 0), links: new Map(), rivers: new Map(), blocked: (i) => !!ts[i].f, stage: 0 });
    const lh = items.filter((it) => it.k === 'lighthouse');
    expect(lh.length).toBe(1);
    expect([0, 1, 2, 3, 4, 5].map((k) => neighborAt(w, 2 * W + 3, k))).toContain(lh[0].tile);
    expect(items.some((it) => it.k === 'seaReef')).toBe(true);
    expect(items.every((it) => ['lighthouse', 'seaReef', 'wreck'].includes(it.k))).toBe(true);
  });

  it('見ていないマスには何も置かない', () => {
    const hidden = tiles.map((t) => ({ ...t, seen: false })) as WorldState['tiles'];
    expect(scatter({ w: { ...w, tiles: hidden }, geom, levels, links: new Map(), rivers: new Map(), blocked: () => false, stage: 3 })).toEqual([]);
  });
});
