// ===== 難易度の確認（自動プレイを何度も回してクリア率などを数える）=====
// 時間がかかるので、普段のテストでは動かさない。SIM=1 npx vitest run balance で動かす。
// 結果は screenshots/balance.md に書き出す
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../../data/rules';
import type { PlayerId } from '../../types';
import { createGame } from '../index';
import { playToEnd } from './bot';

const SEEDS = Number(process.env.SIM_SEEDS ?? 40);
const PARTIES: Record<string, string[]> = {
  '4人': ['warrior', 'mage', 'guardian', 'hunter'],
  '2人': ['warrior', 'mage'],
};

describe.skipIf(!process.env.SIM)('難易度のシミュレーション', () => {
  it('難易度ごとのクリア率', () => {
    const rows: string[] = ['| 人数 | 難易度 | クリア率 | 最後の侵食度（平均） | 使った命の灯火（平均） | 平均レベル | かかった日数（平均） | 負け方 |', '|---|---|---|---|---|---|---|---|'];
    const only = process.env.SIM_DIFF;
    for (const [pname, classes] of Object.entries(PARTIES)) {
      if (process.env.SIM_PARTY && process.env.SIM_PARTY !== pname) continue;
      for (const d of DIFFICULTIES.all) {
        if (only && only !== d.id) continue;
        let clear = 0;
        let corr = 0;
        let used = 0;
        let lv = 0;
        let days = 0;
        const lose: Record<string, number> = {};
        for (let seed = 1; seed <= SEEDS; seed++) {
          const g0 = createGame({ seed: 1000 + seed, scenarioId: 'corruptionKing', difficulty: d.id, party: classes.map((c, i) => ({ classId: c, gender: 'male', name: c + i, playerId: 'P1' as PlayerId })) });
          const { game, log } = playToEnd(g0);
          expect(log.errors).toEqual([]);
          if (game.mode === 'ending') clear++;
          else {
            const why = (game.world?.corruption ?? 0) >= 100 ? '侵食度100%' : game.mode === 'gameover' ? '全滅' : `途中(${game.mode})`;
            lose[why] = (lose[why] ?? 0) + 1;
          }
          corr += game.world?.corruption ?? 0;
          used += d.lives - game.lives;
          lv += game.heroes.reduce((n, h) => n + h.level, 0) / game.heroes.length;
          days += (game.world?.worldTurn ?? 1) / 8;
        }
        const n = SEEDS;
        rows.push(
          `| ${pname} | ${d.name} | **${Math.round((clear / n) * 100)}%** | ${(corr / n).toFixed(0)}% | ${(used / n).toFixed(1)} | ${(lv / n).toFixed(1)} | ${(days / n).toFixed(1)} | ${Object.entries(lose).map(([k, v]) => `${k}${v}`).join('・') || '-'} |`,
        );
      }
    }
    mkdirSync('screenshots', { recursive: true });
    writeFileSync('screenshots/balance.md', rows.join('\n') + '\n');
  }, 3_600_000);
});
