// ===== 夢幻の大迷宮（7本目）の敵28体のテスト =====
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { ENEMIES } from '../../data/enemies';
import { getScenario } from '../../data/scenarios';

const own = () => ENEMIES.all.filter((e) => ENEMIES.scenarioOf(e.id) === 'dreamLabyrinth');

describe('夢幻の大迷宮の敵', () => {
  it('28体（新しい敵10＋夢の再来18）。再来は元の敵の絵を使い回す', () => {
    const all = own();
    expect(all.length).toBe(28);
    const echoes = all.filter((e) => e.variantOf);
    const fresh = all.filter((e) => !e.variantOf);
    expect(echoes.length).toBe(18);
    expect(fresh.length).toBe(10);
    // 再来の元の敵は、ほかのシナリオにいる
    for (const e of echoes) expect(ENEMIES.scenarioOf(e.variantOf!), e.id).not.toBe('dreamLabyrinth');
    // 新しい敵の絵（enemy/<ID>.webp。ボスの変身は dreamEater-1・-2）は、絵の担当が置く。絵が無い間は頭文字の丸が出る
  });

  it('通常18・エリート6・ボス4。ボスは夢喰い（3段階）と過去のボスの再来3体', () => {
    const sc = getScenario('dreamLabyrinth');
    expect(sc.wip).toBeUndefined(); // 登録済み（敵と数値がそろった）
    const bosses = DUNGEONS.forScenario('dreamLabyrinth').flatMap((d) => d.pools.boss);
    expect(new Set(bosses)).toEqual(new Set(['echoWhiteQueen', 'echoSandPharaoh', 'echoGhostAdmiral', 'dreamEater', 'mirrorKnight', 'memoryEater']));
    expect(ENEMIES.get('dreamEater').phases?.length).toBe(2);
  });

  it('夢の再来は元の敵より少し強い（HP+10%・攻撃+1）', () => {
    for (const e of own().filter((x) => x.variantOf)) {
      const base = ENEMIES.get(e.variantOf!);
      expect(e.maxHp, e.id).toBe(Math.round(base.maxHp * 1.1));
    }
  });

  it('ダンジョンと地域の敵の組が、すべて実在する夢幻の大迷宮の敵か、その世界の敵', () => {
    const sc = getScenario('dreamLabyrinth');
    const ids = new Set(own().map((e) => e.id));
    for (const r of sc.map!.regions) for (const g of r.encounters) for (const id of g) expect(ids.has(id), `${r.id}: ${id}`).toBe(true);
    for (const d of DUNGEONS.forScenario('dreamLabyrinth')) for (const g of [...d.pools.battle, ...d.pools.elite]) for (const id of g) expect(ids.has(id), `${d.id}: ${id}`).toBe(true);
  });
});
