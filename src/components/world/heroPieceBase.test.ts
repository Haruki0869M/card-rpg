import { describe, expect, it } from 'vitest';
import { CLASSES } from '../../data/classes';
import { baseClassId } from './HeroPiece';

const BASE = ['warrior', 'guardian', 'hunter', 'mage', 'monk', 'thief', 'priest', 'summoner'];

describe('駒は基本職の絵を使う', () => {
  it('どのジョブも、転職の元をたどると基本8職のどれかになる', () => {
    for (const c of CLASSES.all) expect(BASE).toContain(baseClassId(c.id));
  });
  it('例: 剣聖→剣士、大賢者→魔道士', () => {
    expect(baseClassId('swordSaint')).toBe('warrior');
    expect(baseClassId('greatSage')).toBe('mage');
    expect(baseClassId('warrior')).toBe('warrior');
  });
});
