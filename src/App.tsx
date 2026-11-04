import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useEffect } from 'react';
import { BottomBar, TopBar } from './components/battle/Bars';
import { Battlefield } from './components/battle/Battlefield';
import { FocusPanel } from './components/battle/FocusPanel';
import { Hand } from './components/battle/Hand';
import { PartyStrip } from './components/battle/PartyStrip';
import { DetailPopup } from './components/DetailPopup';
import { ResultScreen } from './components/ResultScreen';
import { Sheets } from './components/Sheets';
import { findAlly } from './engine';
import { useBackButton } from './hooks/useBackButton';
import { useDetail } from './hooks/usePress';
import { useBattle } from './store/battleStore';

/** PC向けの補助ショートカット（任意機能） */
function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useBattle.getState();
      if (s.sheet || s.confirmReset) {
        if (e.key === 'Escape') s.closeTop();
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        const ally = findAlly(s.battle, s.activeId);
        const idx = e.key === '0' ? 9 : Number(e.key) - 1;
        const card = ally?.hand[idx];
        if (card) s.tapCard(card.uid);
      } else if (e.key === 'Enter') s.confirm();
      else if (e.key === 'Escape') s.cancel();
      else if (e.key === 'e' || e.key === 'E') s.endTurn();
      else if (e.key === 'ArrowUp' || e.key === '+') s.selection && s.setFocus(s.selection.focus + 1);
      else if (e.key === 'ArrowDown' || e.key === '-') s.selection && s.setFocus(s.selection.focus - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  const selection = useBattle((s) => s.selection);
  const sheet = useBattle((s) => s.sheet);
  const confirmReset = useBattle((s) => s.confirmReset);
  const cancel = useBattle((s) => s.cancel);
  const closeTop = useBattle((s) => s.closeTop);

  useBackButton(!!selection || !!sheet || confirmReset, closeTop);
  useKeyboard();

  useEffect(() => {
    // 長押しでのメニュー表示を抑止
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    // 指がウィンドウ外に出た等で詳細が残らないように
    const hide = () => useDetail.getState().hide();
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-dvh w-full justify-center bg-[#050407]">
        <div
          className="game-bg safe-pad relative flex h-full w-full max-w-[480px] flex-col overflow-hidden"
          onClick={() => selection && cancel()}
        >
          <TopBar />
          <Battlefield />
          <PartyStrip />
          {/* フォーカス注入パネル: 手札のすぐ上に重ねて出す */}
          <div className="relative z-40 h-0">
            <div className="absolute inset-x-0 bottom-1">
              <AnimatePresence>{selection && <FocusPanel key="focus" />}</AnimatePresence>
            </div>
          </div>
          <Hand />
          <BottomBar />
          <ResultScreen />
          <Sheets />
          <DetailPopup />
        </div>
      </div>
    </MotionConfig>
  );
}
