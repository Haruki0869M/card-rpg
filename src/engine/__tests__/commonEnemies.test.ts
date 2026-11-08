// K3 B: 共通の敵 +15体（通常12・エリート3、亜種3）。定義だけで、配置は K4 が全部入った後
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { createBattle } from '../index';
import { makeImmortal, nextTurn, party } from './helpers';

const NORMAL = ['banditThug', 'banditArcher', 'shadowBandit', 'wildBoar', 'giantSpider', 'caveBat', 'stoneTortoise', 'emberBoar', 'stormSpider', 'shambler', 'wanderingGhost', 'imp'];
const ELITE = ['banditChief', 'greatBear', 'hauntedKnight'];
const VARIANTS = ['shadowBandit', 'emberBoar', 'stormSpider'];
/** まだ無い部品（別のセッションが作成中）。B の敵は使わない */
const NOT_YET = ['reflect', 'summonAlly', 'stealFocus', 'delayIntent'];

describe('K3 共通の敵 +15体', () => {
  it('通常12・エリート3が、共通の敵に増えている（今までの5体と合わせて20体）', () => {
    for (const id of [...NORMAL, ...ELITE]) expect(ENEMIES.has(id), id).toBe(true);
    expect(NORMAL.length + ELITE.length).toBe(15);
    const common = ['chaosShaman', 'goblinBrute', 'goblinScout', 'goldenThief', 'guardDog', ...NORMAL, ...ELITE];
    expect(new Set(common).size).toBe(20);
  });

  it('亜種はこの中で3体まで。元の敵が実在し、オーラが付く', () => {
    const found = [...NORMAL, ...ELITE].filter((id) => ENEMIES.get(id).variantOf);
    expect(found.sort()).toEqual([...VARIANTS].sort());
    for (const id of VARIANTS) {
      const v = ENEMIES.get(id);
      expect(ENEMIES.has(v.variantOf!), id).toBe(true);
      expect(v.aura, id).toBeDefined();
    }
  });

  it('強さが、難しめの範囲に収まっている（通常はHP18〜50・エリートはHP70〜90）', () => {
    for (const id of NORMAL) {
      const e = ENEMIES.get(id);
      expect(e.maxHp, id).toBeGreaterThanOrEqual(18);
      expect(e.maxHp, id).toBeLessThanOrEqual(50);
      expect(e.baseLevel, id).toBeLessThanOrEqual(4);
    }
    for (const id of ELITE) {
      const e = ENEMIES.get(id);
      expect(e.maxHp, id).toBeGreaterThanOrEqual(70);
      expect(e.maxHp, id).toBeLessThanOrEqual(90);
    }
  });

  it('まだ無い部品を使っていない', () => {
    for (const id of [...NORMAL, ...ELITE]) {
      const json = JSON.stringify(ENEMIES.get(id));
      for (const kind of NOT_YET) expect(json.includes(`"${kind}"`), `${id}: ${kind}`).toBe(false);
    }
  });

  it('どの敵も、単独で戦闘が始まり、数ターン進んでも例外が出ない（敵が行動する）', () => {
    for (const id of [...NORMAL, ...ELITE]) {
      let s = createBattle({ seed: 7, party: party('warrior', 'mage'), encounter: { id: 't', name: 't', enemies: [{ defId: id }] } });
      makeImmortal(s);
      s.enemies.forEach((e) => (e.hp = e.maxHp = 9999));
      for (let i = 0; i < 4; i++) s = nextTurn(s);
      expect(s.enemies[0].dead, id).toBe(false);
      expect(s.turn, id).toBeGreaterThanOrEqual(2);
    }
  });
});
