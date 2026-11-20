// ===== 冒険の途中に開く伝承の書（Step C ②） =====
// この端末の画面の状態だけ。冒険の状態・乱数・保存・同期には一切触れない（読むだけの本）。
import { create } from 'zustand';

interface LoreState {
  open: boolean;
  /** 本の中の「戻る」1回分（詳細 → 本の順に閉じる）。開いている本が登録する */
  backInBook: (() => void) | null;
  openLore: () => void;
  /** 「戻る」1回分。本が開いていなければ何もしない */
  back: () => void;
  close: () => void;
}

export const useLore = create<LoreState>((set, get) => ({
  open: false,
  backInBook: null,
  openLore: () => set({ open: true }),
  back: () => {
    const s = get();
    if (!s.open) return;
    if (s.backInBook) s.backInBook();
    else set({ open: false });
  },
  close: () => set({ open: false, backInBook: null }),
}));
