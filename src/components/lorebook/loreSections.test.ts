// Step C ②: 伝承の書の「めったに会えない敵」「隠しボス」はデータから数え、うわさは本当に出る地域を指す
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getScenario } from '../../data/scenarios';
import { useLore } from '../../store/lore';
import { hiddenBosses, rareEnemyIds } from './loreSections';

describe('伝承の書の敵の節（Step C）', () => {
  it('めったに会えない敵は10体（敵のデータの rare）', () => {
    const ids = rareEnemyIds();
    expect(ids).toHaveLength(10);
    for (const id of ids) expect(ENEMIES.get(id).rare, id).toBe(true);
  });
  it('隠しボスは4体。シナリオと地域は名所のイベント（hiddenIn）から取り、うわさにその地域の名前が入る', () => {
    const list = hiddenBosses();
    expect(list.map((h) => h.enemyId).sort()).toEqual(['ancientEngineHeart', 'drownedBride', 'fallenStarSerpent', 'hollowDemonLord']);
    for (const h of list) {
      const ev = EVENTS.all.find((e) => e.hiddenIn && JSON.stringify(e.options[0].success).includes(`"${h.enemyId}"`))!;
      expect(EVENTS.scenarioOf(ev.id)).toBe(h.scenarioId);
      const region = getScenario(h.scenarioId).map!.regions.find((r) => r.id === ev.hiddenIn)!;
      expect(h.regionName).toBe(region.name);
      expect(h.hint).toBe(`${region.name}の地域のどこかに眠るという…`);
    }
    expect(list.find((h) => h.enemyId === 'hollowDemonLord')?.regionName).toBe('魔王城の荒野');
  });
  it('冒険の途中の本: 戻るは本の中（詳細）を先に閉じ、最後に本を閉じる', () => {
    const calls: string[] = [];
    useLore.getState().openLore();
    useLore.setState({ backInBook: () => calls.push('book') });
    useLore.getState().back();
    expect(calls).toEqual(['book']);
    useLore.getState().close();
    expect(useLore.getState().open).toBe(false);
    useLore.getState().back();
    expect(calls).toEqual(['book']);
  });
});
