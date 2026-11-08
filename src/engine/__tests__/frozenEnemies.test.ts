// 凍てつく王国：敵の内訳・配置・凍結の重なりを確認する。
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { DUNGEONS } from '../../data/dungeons';
import { getScenario } from '../../data/scenarios';

const normal = ['snowHare', 'frostWolf', 'frostSprite', 'iceBat', 'frozenSoldier', 'snowOwl', 'icicleBug', 'iceSlime', 'frozenGhoul', 'iceArcher', 'frostMage', 'yeti', 'blizzardSnake', 'iceSwordsman', 'emberFrostWolf', 'cursedFrozenSoldier', 'venomIceSlime', 'stormIceArcher'];
const elite = ['iceKnight', 'snowWitch', 'blizzardBeast', 'frostGuardian', 'frostDrakeling', 'shadowSnowWitch'];
const bosses = ['crystalLord', 'frozenBishop', 'frostGiant', 'whiteQueen'];
const ids = new Set([...normal, ...elite, ...bosses]);
const dungeons = () => DUNGEONS.forScenario('frozenKingdom');
const waves = () => [
  ...dungeons().flatMap(d => [...d.pools.battle, ...d.pools.elite, d.pools.boss]),
  ...getScenario('frozenKingdom').map!.regions.flatMap(r => r.encounters ?? []),
];

describe('凍てつく王国の専用の敵', () => {
  it('通常18・エリート6・ボス4で、亜種は5体、元の敵は非亜種', () => {
    expect(ids.size).toBe(28);
    const enemies = [...ids].map(id => ENEMIES.get(id));
    const variants = enemies.filter(e => e.variantOf);
    expect(variants).toHaveLength(5);
    expect(variants.length / enemies.length).toBeLessThanOrEqual(0.2);
    for (const e of variants) expect(ENEMIES.get(e.variantOf!).variantOf).toBeUndefined();
    for (const id of elite) expect(ENEMIES.get(id).abilities?.length, id).toBeGreaterThan(0);
    expect(ENEMIES.get('snowOwl').abilities?.some(a => 'when' in a.effect && a.effect.when === 'battleStart' && a.effect.do.some(e => e.kind === 'damage'))).toBe(true);
  });

  it('専用の敵を28体とも配置し、仮の共通敵を残さない', () => {
    const placed = new Set(waves().flat());
    // K3 D で足した3体（extra.ts）も、このシナリオの敵として配置される
    const extra = ['iceFisher', 'frostMoth', 'stormSnowOwl'];
    expect([...placed].sort()).toEqual([...ids, ...extra].sort());
    for (const wave of waves()) for (const id of wave) expect(ENEMIES.has(id), id).toBe(true);
    for (const r of getScenario('frozenKingdom').map!.regions) {
      for (const wave of r.encounters ?? []) expect(wave.length).toBeGreaterThanOrEqual(2);
      for (const wave of r.encounters ?? []) expect(wave.length).toBeLessThanOrEqual(3);
    }
  });

  it('各ダンジョンのボスと、女王の3段階を指定どおりにする', () => {
    const expected: Record<string, string[]> = {
      crystalCave: ['crystalLord'], sunkenCathedral: ['frozenBishop'],
      giantMine: ['frostGiant'], iceCastle: ['whiteQueen'], frozenCave: ['frostDrakeling', 'snowWitch'],
    };
    for (const d of dungeons()) expect(d.pools.boss, d.id).toEqual(expected[d.id]);
    for (const id of bosses) expect(ENEMIES.get(id).phases?.length, id).toBeGreaterThan(0);
    expect(ENEMIES.get('whiteQueen').phases?.map(p => p.belowHpPct)).toEqual([60, 30]);
  });

  it('凍結の明示付与は単体に1だけで、同じ通常戦闘に凍結役を重ねない', () => {
    const freezes = (id: string) => ENEMIES.get(id).actions.some(a => a.effects.some(e => e.kind === 'applyStatus' && e.status === 'freeze'));
    for (const id of ids) {
      const e = ENEMIES.get(id);
      for (const a of [...e.actions, ...(e.phases ?? []).flatMap(p => p.actions)]) {
        for (const x of a.effects) if (x.kind === 'applyStatus' && x.status === 'freeze') {
          expect(x.amount).toBe(1);
          expect(x.to ?? 'target').toBe('target');
        }
      }
    }
    for (const wave of waves()) expect(wave.filter(freezes).length, wave.join(',')).toBeLessThanOrEqual(1);
  });

  it('毒氷のスライムには毒が効き、闇・炎の亜種で氷耐性を分散する', () => {
    expect(ENEMIES.get('venomIceSlime').resist).not.toContain('poison');
    expect(ENEMIES.get('venomIceSlime').abilities?.some(a => 'when' in a.effect && a.effect.when === 'battleStart')).toBe(true);
    expect(ENEMIES.get('emberFrostWolf').resist).toEqual(['fire']);
    expect(ENEMIES.get('cursedFrozenSoldier').resist).toEqual(['dark']);
  });
});
