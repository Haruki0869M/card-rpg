import { describe, expect, it } from 'vitest';
import { doorRimStrength } from './DungeonView';

describe('暗い絵のダンジョンの扉の縁', () => {
  it('壁の絵が暗い溶岩の洞窟では、扉の縁を明るくする', () => {
    expect(doorRimStrength('volcano')).toBeGreaterThan(0.5);
  });
  it('壁の絵が明るいダンジョンと、絵が無いダンジョンでは今までどおり', () => {
    expect(doorRimStrength('temple')).toBe(0);
    expect(doorRimStrength('catacomb')).toBe(0);
    expect(doorRimStrength('noSuchDungeon')).toBe(0);
  });
});
