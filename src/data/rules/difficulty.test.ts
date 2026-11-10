import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, describeDifficulty } from './index';

describe('難易度の説明（フェーズ3）', () => {
  it('内部の倍率（敵のHP×1.55 など）を見せず、命の灯火の数はデータと合う', () => {
    for (const d of DIFFICULTIES.all) {
      const text = describeDifficulty(d);
      expect(text).not.toMatch(/HP×|攻撃×|報酬×|\d\.\d/);
      expect(text).toContain(`命の灯火×${d.lives}`);
    }
  });
  it('「ふつう」の内部の倍率は 1.65（見直しの段階3で 1.55 → 1.65。BREAK で楽になった分を戻すため。提案）', () => {
    const n = DIFFICULTIES.get('normal');
    expect(n.enemyHp).toBe(1.65);
    expect(n.enemyAttack).toBe(1.65);
  });
});
