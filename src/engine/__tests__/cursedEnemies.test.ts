// 呪われた群島：敵の内訳・配置・状態異常の決まりを確認する。
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { DUNGEONS } from '../../data/dungeons';
import { getScenario } from '../../data/scenarios';

const normal = ['seaCrab', 'jellyfish', 'seaSerpentFry', 'merfolkSpearman', 'pirateGrunt', 'drownedSailor', 'ghostDeckhand', 'pirateGunner', 'siren', 'shark', 'conchKnight', 'stormPetrel', 'octopusLarva', 'barnacleBeast', 'emberSeaCrab', 'cursedDrownedSailor', 'stormJellyfish', 'venomShark'];
const elite = ['pirateQuartermaster', 'coralGolem', 'drownedKnight', 'seaWitch', 'krakenTentacle', 'stormSeaWitch'];
const bosses = ['seaSerpentQueen', 'pirateCaptainGuld', 'tideHighPriest', 'ghostAdmiral'];
const ids = new Set([...normal, ...elite, ...bosses]);
// K3 D で足した追加の敵（extra.ts）。28体の内訳とは別に数え、配置は確かめる
const extra = ['driftwoodSpirit', 'lanternAngler', 'cursedPirateGrunt'];
const map = () => getScenario('cursedArchipelago').map!;
const dungeons = () => DUNGEONS.forScenario('cursedArchipelago');
const waves = () => [
  ...dungeons().flatMap((d) => [...d.pools.battle, ...d.pools.elite, d.pools.boss]),
  ...map().regions.flatMap((r) => [...(r.encounters ?? []), ...(r.seaEncounters ?? [])]),
];
const allActions = (id: string) => {
  const e = ENEMIES.get(id);
  return [...e.actions, ...(e.phases ?? []).flatMap((p) => p.actions)];
};

describe('呪われた群島の専用の敵', () => {
  it('通常18・エリート6・ボス4で、亜種は5体（2割まで）', () => {
    expect(ids.size).toBe(28);
    const enemies = [...ids].map((id) => ENEMIES.get(id));
    const variants = enemies.filter((e) => e.variantOf);
    expect(variants).toHaveLength(5);
    expect(variants.length / enemies.length).toBeLessThanOrEqual(0.2);
    for (const e of variants) expect(ENEMIES.get(e.variantOf!).variantOf).toBeUndefined();
    for (const id of [...elite, ...bosses]) expect(ENEMIES.get(id).abilities?.length, id).toBeGreaterThan(0);
  });

  it('28体とも配置し、仮の共通敵を残さない。組は2〜3体で、弱点が全員同じにならない', () => {
    const placed = new Set(waves().flat());
    expect([...placed].sort()).toEqual([...ids, ...extra].sort());
    for (const r of map().regions) {
      for (const wave of [...(r.encounters ?? []), ...(r.seaEncounters ?? [])]) {
        expect(wave.length, wave.join(',')).toBeGreaterThanOrEqual(2);
        expect(wave.length, wave.join(',')).toBeLessThanOrEqual(3);
      }
    }
    for (const wave of waves()) {
      if (wave.length < 2) continue;
      const weak = wave.map((id) => [...(ENEMIES.get(id).weak ?? [])].sort().join('+'));
      expect(new Set(weak).size, wave.join(',')).toBeGreaterThan(1);
    }
  });

  it('各ダンジョンのボスと、亡霊提督の3段階', () => {
    const expected: Record<string, string[]> = {
      wreckCave: ['seaSerpentQueen'], pirateIsland: ['pirateCaptainGuld'], sunkenTemple: ['tideHighPriest'],
      ghostFlagship: ['ghostAdmiral'], tideCave: ['krakenTentacle', 'drownedKnight'],
    };
    for (const d of dungeons()) expect(d.pools.boss, d.id).toEqual(expected[d.id]);
    for (const id of bosses) expect(ENEMIES.get(id).phases?.length, id).toBeGreaterThan(0);
    expect(ENEMIES.get('ghostAdmiral').phases?.map((p) => p.belowHpPct)).toEqual([60, 30]);
  });

  it('凍結は使わない。幽霊は聖が弱点で闇に強い', () => {
    for (const id of ids) for (const a of allActions(id)) for (const x of a.effects) if (x.kind === 'applyStatus') expect(x.status, id).not.toBe('freeze');
    for (const id of ['drownedSailor', 'ghostDeckhand', 'cursedDrownedSailor', 'drownedKnight', 'ghostAdmiral']) {
      expect(ENEMIES.get(id).weak, id).toContain('holy');
      expect(ENEMIES.get(id).resist, id).toContain('dark');
    }
  });

  it('貝の騎士は反撃、ガルドは50%以下で幽霊水夫を呼ぶ', () => {
    expect(ENEMIES.get('conchKnight').abilities?.some((a) => 'when' in a.effect && a.effect.when === 'hurt' && a.effect.do.some((e) => e.kind === 'retaliate'))).toBe(true);
    const guld = ENEMIES.get('pirateCaptainGuld');
    expect(guld.phases?.[0].belowHpPct).toBe(50);
    expect(guld.phases?.[0].actions.some((a) => a.effects.some((e) => e.kind === 'summonEnemy' && e.enemy === 'ghostDeckhand'))).toBe(true);
  });
});
