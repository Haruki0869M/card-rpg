import { describe, expect, it } from 'vitest';
import { ownMountain } from './DepthFront';
import type { SceneItem } from './landscape/scatter';

const own = { tile: 5, x: 100, y: 100, R: 20 };
const item = (o: Partial<SceneItem>): SceneItem => ({ k: 'peak', x: 100, y: 108, h: 30, v: 0, tile: 5, ...o });

describe('駒が立つマスの山は、駒の上に描き直さない（東の尾根）', () => {
  it('そのマスの峰・火山・そのマスから出る尾根は除く', () => {
    expect(ownMountain(item({}), own)).toBe(true);
    expect(ownMountain(item({ k: 'volcano' }), own)).toBe(true);
    expect(ownMountain(item({ k: 'ridge', tile: 9, x: 100, y: 108, x2: 135, y2: 128 }), own)).toBe(true);
  });
  it('手前のマスの峰・木は、今までどおり描き直す', () => {
    expect(ownMountain(item({ tile: 9, y: 130 }), own)).toBe(false);
    expect(ownMountain(item({ k: 'pine' }), own)).toBe(false);
    expect(ownMountain(item({ k: 'ridge', tile: 9, x: 140, y: 130, x2: 175, y2: 150 }), own)).toBe(false);
    expect(ownMountain(item({}), undefined)).toBe(false);
  });
});
