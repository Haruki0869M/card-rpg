// T8：機械仕掛けの帝国の敵28体（内訳・配置・仮の共通敵が残っていないこと）を確認する。
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { DUNGEONS } from '../../data/dungeons';
import { getScenario } from '../../data/scenarios';

const normal = ['gearBug', 'steamRat', 'brokenAutomaton', 'conveyorBot', 'riveter', 'oilSlime', 'sparkTurret', 'steamSprite', 'boilerCrab', 'wrenchGolem', 'clockworkDog', 'pistonFist', 'furnaceImp', 'copperKnight', 'voltGearBug', 'emberOilSlime', 'venomBoilerCrab', 'ironCopperKnight'];
const elite = ['foremanBot', 'steamTurretLord', 'ironButler', 'chainSaw', 'furnaceGolem', 'stormForemanBot'];
const bosses = ['foremanGolem', 'runawayBoiler', 'clockworkSage', 'greatMachine'];
const dungeons = () => DUNGEONS.forScenario('clockworkEmpire');
const waves = () => [
  ...dungeons().flatMap((d) => [...d.pools.battle, ...d.pools.elite]),
  ...getScenario('clockworkEmpire').map!.regions.flatMap((r) => r.encounters ?? []),
];

describe('K4 機械仕掛けの帝国の敵', () => {
  it('専用の敵は通常18・エリート6・ボス4（亜種5）', () => {
    const own = ENEMIES.all.filter((e) => ENEMIES.scenarioOf(e.id) === 'clockworkEmpire');
    expect([...normal, ...elite, ...bosses].sort()).toEqual(own.map((e) => e.id).sort());
    expect(own.filter((e) => e.variantOf)).toHaveLength(5);
    for (const id of bosses) expect(ENEMIES.get(id).phases?.length, id).toBeGreaterThan(0);
    expect(ENEMIES.get('greatMachine').phases).toHaveLength(2);
    for (const id of elite) expect(ENEMIES.get(id).abilities?.length, id).toBeGreaterThan(0);
  });
  it('ダンジョンのボスは指示どおりで、仮の共通の敵は残っていない', () => {
    const boss = Object.fromEntries(dungeons().map((d) => [d.id, d.pools.boss]));
    expect(boss).toMatchObject({ gearFactory: ['foremanGolem'], steamPlant: ['runawayBoiler'], clockTower: ['clockworkSage'], machineHeart: ['greatMachine'], scrapCave: ['ironButler', 'chainSaw'] });
    const own = new Set(ENEMIES.all.filter((e) => ENEMIES.scenarioOf(e.id) === 'clockworkEmpire').map((e) => e.id));
    for (const wave of [...waves(), ...dungeons().map((d) => d.pools.boss)]) for (const id of wave) expect(own.has(id), id).toBe(true);
  });
  it('どの組み合わせも、雷以外の弱点を持つ敵が1体はいる', () => {
    for (const wave of waves().filter((w) => w.length > 1)) {
      expect(wave.some((id) => (ENEMIES.get(id).weak ?? []).some((el) => el !== 'thunder')), wave.join(',')).toBe(true);
    }
  });
});
