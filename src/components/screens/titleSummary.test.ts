import { describe, expect, it } from 'vitest';
import { createGame } from '../../engine';
import { continueSummary, overwriteText } from './titleSummary';

const game = () =>
  createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }, { classId: 'mage', gender: 'female', name: 'b', playerId: 'P2' }] });

describe('タイトルの「つづきから」の説明（フェーズ3）', () => {
  it('先頭に「・」が付かず、今いる場所と所持金の合計が出る', () => {
    const g = game();
    const gold = g.heroes.reduce((n, h) => n + h.gold, 0);
    const text = continueSummary(g);
    expect(text.startsWith('・')).toBe(false);
    expect(text).toContain('世界マップ・');
    expect(text.endsWith(`所持金の合計 ${gold}G`)).toBe(true);
  });
  it('上書きの確認にシナリオの名前と場面が入る', () => {
    expect(overwriteText(game())).toMatch(/^今の冒険（.+・世界マップ.*）は上書きされて消えます。設定と伝承の書は残ります。$/);
  });
});
