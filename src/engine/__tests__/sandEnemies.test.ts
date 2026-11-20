// 砂塵の王朝：敵の内訳・配置・弱点の混ぜ方を確認する。
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { DUNGEONS } from '../../data/dungeons';
import { getScenario } from '../../data/scenarios';

const normal = ['sandScarab', 'desertViper', 'jackalWarrior', 'tombRobber', 'sandScorpion', 'vulture', 'mummy', 'sandSprite', 'dustDevil', 'sandWorm', 'clayGolem', 'mummyArcher', 'cursedPriest', 'stoneCat', 'emberSandScorpion', 'cursedMummy', 'stormVulture', 'venomJackalWarrior'];
const elite = ['royalGuardMummy', 'scribeShade', 'sphinxCub', 'sandSerpentLord', 'colossusStatue', 'cursedScribeShade'];
const bosses = ['sandScorpionKing', 'shadowVizier', 'stoneGuardianBeast', 'sandPharaoh'];
const ids = new Set([...normal, ...elite, ...bosses]);
const dungeons = () => DUNGEONS.forScenario('sandDynasty');
const waves = () => [
  ...dungeons().flatMap(d => [...d.pools.battle, ...d.pools.elite, d.pools.boss]),
  ...getScenario('sandDynasty').map!.regions.flatMap(r => r.encounters ?? []),
];

describe('砂塵の王朝の専用の敵', () => {
  it('亜種は5体で、元の敵は非亜種。エリートは特殊能力を持つ', () => {
    expect(ids.size).toBe(28);
    const enemies = [...ids].map(id => ENEMIES.get(id));
    const variants = enemies.filter(e => e.variantOf);
    expect(variants.map(v => v.id).sort()).toEqual(['cursedMummy', 'cursedScribeShade', 'emberSandScorpion', 'stormVulture', 'venomJackalWarrior']);
    for (const e of variants) expect(ENEMIES.get(e.variantOf!).variantOf).toBeUndefined();
    for (const id of elite) expect(ENEMIES.get(id).abilities?.length, id).toBeGreaterThan(0);
  });

  it('専用の敵をすべて配置し、仮の共通敵を残さない', () => {
    const placed = new Set(waves().flat());
    // K3 D で足した3体（extra.ts）も、このシナリオの敵として配置される
    const extra = ['desertFennec', 'obeliskSentinel', 'venomMummyArcher'];
    expect([...placed].sort()).toEqual([...ids, ...extra].sort());
    for (const r of getScenario('sandDynasty').map!.regions) {
      for (const wave of r.encounters ?? []) {
        expect(wave.length).toBeGreaterThanOrEqual(2);
        expect(wave.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('通常の組み合わせは、弱点が全員同じにならない', () => {
    for (const wave of waves()) {
      if (new Set(wave).size < 2) continue; // 同じ敵の群れ（砂甲虫2体など）は除く
      const weak = wave.map(id => JSON.stringify([...(ENEMIES.get(id).weak ?? [])].sort()));
      expect(new Set(weak).size, wave.join(',')).toBeGreaterThan(1);
    }
  });

  it('各ダンジョンのボスと、砂塵の王の3段階を指定どおりにする', () => {
    const expected: Record<string, string[]> = {
      scorpionTomb: ['sandScorpionKing'], shadowLibrary: ['shadowVizier'],
      statueTemple: ['stoneGuardianBeast'], sandPalace: ['sandPharaoh'], sandCave: ['sandSerpentLord', 'sphinxCub'],
    };
    for (const d of dungeons()) expect(d.pools.boss, d.id).toEqual(expected[d.id]);
    for (const id of bosses) expect(ENEMIES.get(id).phases?.length, id).toBeGreaterThan(0);
    expect(ENEMIES.get('stoneCat').abilities?.some(a => 'when' in a.effect && a.effect.when === 'hurt' && a.effect.do.some(e => e.kind === 'retaliate'))).toBe(true);
    expect(ENEMIES.get('sphinxCub').actions.some(a => a.effects.some(e => e.kind === 'drainFocus'))).toBe(true);
    expect(ENEMIES.get('sandPharaoh').phases?.map(p => p.belowHpPct)).toEqual([60, 30]);
  });

  it('凍結は使わない。ミイラは火と聖が弱点、砂漠の生き物は火に強い', () => {
    for (const id of ids) {
      const e = ENEMIES.get(id);
      for (const a of [...e.actions, ...(e.phases ?? []).flatMap(p => p.actions)]) {
        for (const x of a.effects) if (x.kind === 'applyStatus') expect(x.status, id).not.toBe('freeze');
      }
    }
    expect(ENEMIES.get('mummy').weak).toEqual(['fire', 'holy']);
    for (const id of ['sandSprite', 'sandScorpion', 'emberSandScorpion']) {
      expect(ENEMIES.get(id).resist, id).toContain('fire');
      expect(ENEMIES.get(id).weak, id).toContain('ice');
    }
  });
});
