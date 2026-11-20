import { describe, expect, it } from 'vitest';
import { CLASSES } from '../../data/classes';
import { baseClassId, pedestalLook } from './HeroPiece';

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

describe('台座: 今のジョブの段と、得意な武器の絵', () => {
  it('どのジョブも段が決まり、武器の種類があるジョブは銘板の絵がある', () => {
    for (const c of CLASSES.all) {
      const look = pedestalLook(c.id);
      expect(['base', 'mid', 'top', 'special']).toContain(look.tier);
      if (c.weaponType) expect(look.icon).toBeTruthy();
    }
  });
  it('例: 剣士 = 基本、剣聖 = 最上位', () => {
    expect(pedestalLook('warrior').tier).toBe('base');
    expect(pedestalLook('swordSaint').tier).toBe('top');
  });
});
