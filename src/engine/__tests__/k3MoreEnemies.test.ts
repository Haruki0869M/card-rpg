// T7：追加の内訳・配置・亜種と、既存の組み合わせの保持を確認する。
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { getScenario } from '../../data/scenarios';

const added = ['thornBoar','mossCarapace','rootImp','emberForestWolf','reedStalker','shadowBogGhoul','fenGuardian','cinderHound','basaltCrawler','ironAshBat','chainWraith','siegeImp','cursedHound'];
const normal = ['forestWolf','toxicShroom','bogGhoul','mireSlime','fireSalamander','ashBat',...added.filter(id => id !== 'fenGuardian')];
// 既存の役割は指示書§2 Aの分類を維持する（sizeだけでは分類しない）。
const elite = ['treeWarden','bogWraith','magmaGolem','darkKnight','gatekeeper','fenGuardian'];
const bosses = ['treantKing','mordea','ignavarl','valgrim'];
const dungeons = () => DUNGEONS.forScenario('corruptionKing');
const map = () => getScenario('corruptionKing').map!;
const waves = () => [...dungeons().flatMap(d => [...d.pools.battle,...d.pools.elite,d.pools.boss]), ...map().regions.flatMap(r => r.encounters ?? [])];
const legacy: Record<string, { battle: string[][]; elite: string[][]; boss: string[] }> = {
  emeraldTemple: { battle: [['forestWolf','forestWolf'],['toxicShroom','forestWolf'],['goblinScout','toxicShroom','goblinScout'],['chaosShaman','forestWolf'],['toxicShroom','toxicShroom','forestWolf']], elite: [['treeWarden'],['goblinBrute','chaosShaman']], boss:['treantKing'] },
  silentCatacomb: { battle: [['bogGhoul','bogGhoul'],['mireSlime','bogGhoul'],['mireSlime','mireSlime','bogGhoul'],['bogGhoul','bogGhoul','mireSlime']], elite:[['bogWraith','bogGhoul'],['bogWraith']], boss:['mordea'] },
  lavaCavern: { battle:[['fireSalamander','ashBat'],['ashBat','ashBat','fireSalamander'],['fireSalamander','fireSalamander']], elite:[['magmaGolem'],['magmaGolem','ashBat']], boss:['ignavarl'] },
  demonCastle: { battle:[['darkKnight','ashBat'],['darkKnight','darkKnight'],['bogWraith','darkKnight']], elite:[['gatekeeper']], boss:['valgrim'] },
};
const legacyMap: Record<string,string[][]> = {
 castleRegion:[['darkKnight'],['darkKnight','ashBat'],['bogWraith','darkKnight']],
 volcano:[['fireSalamander','ashBat'],['magmaGolem'],['ashBat','ashBat','fireSalamander']],
 swamp:[['bogGhoul','bogGhoul'],['mireSlime','bogGhoul'],['bogWraith','mireSlime']],
 forest:[['forestWolf','forestWolf'],['toxicShroom','forestWolf'],['goblinScout','toxicShroom']],
 plains:[['goblinScout'],['goblinScout','goblinScout'],['chaosShaman','goblinScout']],
};
function keeps(actual: string[][], previous: string[][]) {
  for (const wave of previous) expect(actual.map(x => JSON.stringify(x))).toContain(JSON.stringify(wave));
}

describe('K3追加の敵・侵食の魔王', () => {
 it('専用の敵は通常18・エリート6・ボス4、全体は最低61体', () => {
  const scenario = ENEMIES.all.filter(e => ENEMIES.scenarioOf(e.id) === 'corruptionKing');
  expect(scenario).toHaveLength(28);
  expect(normal).toHaveLength(18); expect(elite).toHaveLength(6); expect(bosses).toHaveLength(4);
  expect([...new Set([...normal,...elite,...bosses])].sort()).toEqual(scenario.map(e => e.id).sort());
  expect(ENEMIES.all.length).toBeGreaterThanOrEqual(61);
  expect(ENEMIES.get('fenGuardian').abilities?.length).toBeGreaterThan(0);
 });
 it('追加13体を配置し、部屋・徘徊・イベントの参照が切れない', () => {
  const placed = new Set(waves().flat());
  for (const id of added) expect(placed.has(id), id).toBe(true);
  for (const wave of waves()) for (const id of wave) expect(ENEMIES.has(id), id).toBe(true);
  const check = (value: unknown): void => {
   if (!value || typeof value !== 'object') return;
   if (Array.isArray(value)) { value.forEach(check); return; }
   const obj = value as Record<string,unknown>;
   if (obj.kind === 'battle' && Array.isArray(obj.enemies)) for (const e of obj.enemies as {defId:string}[]) expect(ENEMIES.has(e.defId), e.defId).toBe(true);
   Object.values(obj).forEach(check);
  };
  EVENTS.forScenario('corruptionKing').forEach(check);
 });
 it('既存の部屋と世界マップの組み合わせ・ボスを削除しない', () => {
  for (const [id, old] of Object.entries(legacy)) {
   const p = DUNGEONS.get(id).pools;
   keeps(p.battle,old.battle); keeps(p.elite,old.elite); expect(p.boss).toEqual(old.boss);
  }
  for (const [id, old] of Object.entries(legacyMap)) keeps(map().regions.find(r => r.id === id)!.encounters ?? [], old);
  expect(DUNGEONS.get('randomForest').pools.boss).toEqual(['treeWarden','toxicShroom']);
 });
 it('ランダムの森向けの小鬼は固定の翠の森へ混ぜない', () => {
  expect(DUNGEONS.get('randomForest').pools.battle.flat()).toContain('rootImp');
  expect(DUNGEONS.get('emeraldTemple').pools.battle.flat()).not.toContain('rootImp');
 });
 it('亜種は3体、元の敵は非亜種で、属性か開幕特性を変える。全体の2割以下', () => {
  const variants = added.map(id => ENEMIES.get(id)).filter(e => e.variantOf);
  expect(variants).toHaveLength(3);
  // 夢幻の大迷宮（7本目・総集編）の「夢の再来」は、過去の敵の絵を使い回す例外（オーナー承認済み）なので、2割の数に入れない
  const counted = ENEMIES.all.filter(e => !(ENEMIES.scenarioOf(e.id) === 'dreamLabyrinth' && e.variantOf));
  expect(counted.filter(e => e.variantOf).length / counted.length).toBeLessThanOrEqual(0.2);
  for (const v of variants) {
   const base = ENEMIES.get(v.variantOf!);
   expect(base.variantOf).toBeUndefined(); expect(v.aura).toBeTruthy();
   const pick = (e: typeof base) => ({weak:e.weak,resist:e.resist,abilities:e.abilities,elements:e.actions.map(a => a.effects.map(x => x.kind === 'damage' ? x.element : null))});
   expect(JSON.stringify(pick(v)),v.id).not.toBe(JSON.stringify(pick(base)));
  }
 });
});
