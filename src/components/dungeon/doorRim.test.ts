import { describe, expect, it } from 'vitest';
import { corridorShadeScale, doorRimStrength } from './DungeonView';

describe('暗い絵のダンジョンの扉の縁', () => {
  it('壁の絵が暗い溶岩の洞窟では、扉の縁を明るくする', () => {
    expect(doorRimStrength('volcano')).toBeGreaterThan(0.5);
  });
  it('壁の絵が明るいダンジョンと、絵が無いダンジョンでは今までどおり', () => {
    expect(doorRimStrength('temple')).toBe(0);
    expect(doorRimStrength('catacomb')).toBe(0);
    expect(doorRimStrength('noSuchDungeon')).toBe(0);
  });

  it('絵が暗いダンジョンほど、奥を暗くする量を弱める（明るい絵・絵が無い時は今までどおり）', () => {
    for (const bg of ['volcano', 'castle', 'forestCave']) expect(corridorShadeScale(bg)).toBeLessThan(0.6);
    expect(corridorShadeScale('temple')).toBe(1);
    expect(corridorShadeScale('catacomb')).toBe(1);
    expect(corridorShadeScale('noSuchDungeon')).toBe(1);
  });
});
