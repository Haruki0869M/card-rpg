// ===== 遊び方・用語集の開け閉め と はじめての戦闘の案内（Step A ③④） =====
// この端末の画面の状態だけ。冒険の状態・乱数・同期には一切触れない。
import { create } from 'zustand';
import type { HelpTopicId } from '../components/help/helpTopics';
import type { Settings } from './settings';

interface HelpState {
  open: boolean;
  /** 開いている項目（null = 目次） */
  topic: HelpTopicId | null;
  /** 項目から開いた時は、戻るで目次でなく閉じる（元の画面へ戻る） */
  direct: boolean;
  openHelp: (topic?: HelpTopicId) => void;
  /** 「戻る」1回分。項目 → 目次 → 閉じる（直接開いた項目は閉じる） */
  back: () => void;
  close: () => void;
}

export const useHelp = create<HelpState>((set, get) => ({
  open: false,
  topic: null,
  direct: false,
  openHelp: (topic) => set({ open: true, topic: topic ?? null, direct: !!topic }),
  back: () => {
    const s = get();
    if (s.topic && !s.direct) set({ topic: null });
    else set({ open: false, topic: null, direct: false });
  },
  close: () => set({ open: false, topic: null, direct: false }),
}));

// ---------- はじめての戦闘の案内 ----------

export type GuideStep = 1 | 2 | 3;

/**
 * 案内を出すか。設定「はじめての案内」が決まっていればそれに従う。
 * 決まっていない（この端末で初めて）時は、まだ戦闘に勝ったことが無ければ出す。
 */
export function guideWanted(settings: Pick<Settings, 'firstGuide'>, battlesWon: number): boolean {
  return settings.firstGuide ?? battlesWon === 0;
}

/**
 * 次の段。③（カードを1枚使った）まで来たら戻らない。
 * ①⇔② はカードを選んでいる間だけ②（選ぶのをやめたら①に戻る）。
 */
export function nextGuideStep(prev: GuideStep, s: { selecting: boolean; played: boolean }): GuideStep {
  if (prev === 3 || s.played) return 3;
  return s.selecting ? 2 : 1;
}

export const GUIDE_TEXT: Record<GuideStep, string> = {
  1: '手札のカードをタップし、狙う敵を選んで『発動』を押そう！（長押しで詳しい効果も見られます）',
  2: '技の威力はスロットの成功数で決まる！『＋』で★フォーカスを使うと、1枠が必ず成功するぞ',
  3: '同じターンに別の仲間が同じ敵を攻撃すると『連携＋20%』！マナを使い切ったら右下の『ターン終了』へ',
};
