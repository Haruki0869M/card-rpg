// シナリオ（M3で世界マップ・物語・最終目標を加える）
import { createRegistry } from '../registry';

export interface ScenarioDef {
  id: string;
  name: string;
  synopsis: string;
  recommended: string;
  playTime: string;
  unlocked: boolean;
  /** 解放条件の説明（未解放の時に表示） */
  unlockText?: string;
}

export const SCENARIOS = createRegistry<ScenarioDef>('scenario', [
  {
    id: 'corruptionKing',
    name: '侵食の魔王',
    synopsis: '封印されていた侵食の魔王ヴァルグリムが目覚めた。3つの封印の鍵を集め、魔王を再び封じよ。',
    recommended: '1〜4人',
    playTime: '60〜90分',
    unlocked: true,
  },
  {
    id: 'frozenKingdom',
    name: '凍てつく王国',
    synopsis: '永遠の冬に閉ざされた王国。氷の城の奥に何が待つのか。',
    recommended: '2〜4人',
    playTime: '60〜90分',
    unlocked: false,
    unlockText: '伝承の書で解放（M4で追加予定）',
  },
]);
