// 確認用の透明なマスの層の印（A7: 地形・道・潮）。霧のマスには付けない
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HexShapes } from './LandscapeLayer';
import type { WorldState } from '../../../types';

const tiles = [
  { t: 'road', seen: true },
  { t: 'tideFlat', seen: true },
  { t: 'tideChannel', seen: true },
  { t: 'plains', seen: true },
  { t: 'tideFlat', seen: false },
] as unknown as WorldState['tiles'];
const geom = { R: 10, W: 100, H: 100, center: (i: number) => ({ x: i * 20, y: 10 }), ground: (i: number) => ({ x: i * 20, y: 10 }) } as never;

describe('HexShapes の印', () => {
  const html = renderToStaticMarkup(createElement(HexShapes, { tiles, geom, levels: [1, 0, 0, 1, 0], roadTerrain: 'road' }));
  const g = (i: number) => html.match(new RegExp(`<g data-hex="${i}"[^>]*>`))?.[0] ?? '';
  it('見えているマスに地形・道・潮', () => {
    expect(g(0)).toContain('data-terrain="road"');
    expect(g(0)).toContain('data-road=""');
    expect(g(0)).not.toContain('data-tide');
    expect(g(1)).toContain('data-tide="low"');
    expect(g(2)).toContain('data-tide="high"');
    expect(g(3)).toContain('data-terrain="plains"');
    expect(g(3)).not.toContain('data-road');
  });
  it('霧のマスには地形の印を出さない', () => {
    expect(g(4)).toBe('');
    expect(html.match(/data-terrain=/g)?.length).toBe(4);
  });
});
