import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BottomBar, TopBar } from './components/battle/Bars';
import { Battlefield } from './components/battle/Battlefield';
import { FocusPanel } from './components/battle/FocusPanel';
import { SlotPreviewDialog } from './components/battle/SlotPreviewDialog';
import { Hand } from './components/battle/Hand';
import { useTallScreen } from './hooks/useTallScreen';
import { PartyStrip } from './components/battle/PartyStrip';
import { DetailPopup } from './components/DetailPopup';
import { ResultScreen } from './components/ResultScreen';
import { CreateScreen } from './components/screens/CreateScreen';
import { DungeonScreen } from './components/screens/DungeonScreen';
import { ClearedScreen, GameOverScreen } from './components/screens/EndScreens';
import { HubScreen } from './components/screens/HubScreen';
import { RewardScreen } from './components/screens/RewardScreen';
import { ChestScreen } from './components/screens/ChestScreen';
import { WorldScreen } from './components/world/WorldScreen';
import { EncounterScreen, EndingScreen, SanctuaryScreen, ShrineScreen, TownScreen } from './components/world/Places';
import { EventScreen, RestScreen } from './components/screens/RoomScreens';
import { SetupScreen } from './components/screens/SetupScreen';
import { JoinScreen, LobbyScreen, OnlineOverlay } from './components/screens/OnlineScreens';
import { TitleScreen } from './components/screens/TitleScreen';
import { Sheets } from './components/Sheets';
import { JobPickOverlay } from './components/JobSheet';
import { HeroTaskOverlay } from './components/HeroTasks';
import { SceneTabs } from './components/SceneTabs';
import { VoteStatus } from './components/ui/Votes';
import { TurnLock } from './components/ui/TurnLock';
import { findAlly } from './engine';
import { useBackButton } from './hooks/useBackButton';
import { useDetail } from './hooks/usePress';
import { useBattle } from './store/battleStore';

/** PC向けの補助ショートカット（任意機能） */
function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useBattle.getState();
      if (s.sheet || s.confirmAbandon) {
        if (e.key === 'Escape') s.closeTop();
        return;
      }
      if (s.game?.mode !== 'battle') return;
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

function BattleScreen() {
  const selection = useBattle((s) => s.selection);
  const cancel = useBattle((s) => s.cancel);
  const tall = useTallScreen();
  const focus = (
    <AnimatePresence>{selection && <FocusPanel key="focus" />}</AnimatePresence>
  );
  return (
    <div className="game-bg safe-pad relative flex h-full w-full max-w-[480px] flex-col overflow-hidden" onClick={() => selection && cancel()}>
      <TopBar />
      <Battlefield />
      {/* フォーカス注入パネル: 高い画面では選んだカードが大きく浮き上がるので、その上（味方の枠の上）に出す。
          低い画面では敵が隠れないように、手札のすぐ上（味方の枠に重ねる） */}
      {tall && (
        <div className="relative z-[120] h-0">
          <div className="absolute inset-x-0 bottom-0">{focus}</div>
        </div>
      )}
      <PartyStrip />
      {!tall && (
        <div className="relative z-[120] h-0">
          <div className="absolute inset-x-0 bottom-1">{focus}</div>
        </div>
      )}
      <Hand />
      <BottomBar />
      <ResultScreen />
      <SlotPreviewDialog />
    </div>
  );
}

/** 画面の切り替え（タイトル〜キャラ作成 / 冒険中は GameState の mode で決まる） */
function CurrentScreen() {
  const screen = useBattle((s) => s.screen);
  const mode = useBattle((s) => s.game?.mode);
  if (screen === 'title' || !mode) {
    if (screen === 'setup') return <SetupScreen />;
    if (screen === 'create') return <CreateScreen />;
    if (screen === 'join') return <JoinScreen />;
    if (screen === 'lobby') return <LobbyScreen />;
    return <TitleScreen />;
  }
  switch (mode) {
    case 'hub':
      return <HubScreen />;
    case 'world':
      return <WorldScreen />;
    case 'encounter':
      return <EncounterScreen />;
    case 'town':
      return <TownScreen />;
    case 'sanctuary':
      return <SanctuaryScreen />;
    case 'shrine':
      return <ShrineScreen />;
    case 'ending':
      return <EndingScreen />;
    case 'dungeon':
      return <DungeonScreen />;
    case 'battle':
      return <BattleScreen />;
    case 'reward':
      return <RewardScreen />;
    case 'chest':
      return <ChestScreen />;
    case 'event':
      return <EventScreen />;
    case 'rest':
      return <RestScreen />;
    case 'cleared':
      return <ClearedScreen />;
    case 'gameover':
      return <GameOverScreen />;
  }
}

/** 画面下に出る短いお知らせ（操作は止めない） */
function Toast() {
  const toast = useBattle((s) => s.toast);
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!toast) return;
    setShown(toast.id);
    const t = setTimeout(() => setShown(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <AnimatePresence>
      {toast && shown === toast.id && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-4 bottom-24 z-[80] rounded-xl border border-amber-300/50 bg-black/90 px-3 py-2 text-center text-[14px] text-amber-50"
        >
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const selection = useBattle((s) => s.selection);
  const sheet = useBattle((s) => s.sheet);
  const confirmAbandon = useBattle((s) => s.confirmAbandon);
  const screen = useBattle((s) => s.screen);
  const closeTop = useBattle((s) => s.closeTop);

  useBackButton(!!selection || !!sheet || confirmAbandon || screen === 'setup' || screen === 'create' || screen === 'join', closeTop);
  useKeyboard();

  // 招待のリンク（?room=合言葉）で開いたら「部屋に参加」へ
  useEffect(() => {
    if (new URLSearchParams(location.search).get('room')) useBattle.getState().setScreen('join');
  }, []);

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
        <div className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden">
          <SceneTabs />
          <div className="relative flex min-h-0 w-full flex-1 justify-center">
            <CurrentScreen />
          </div>
          <Sheets />
          <JobPickOverlay />
          <HeroTaskOverlay />
          <DetailPopup />
          <OnlineOverlay />
          <VoteStatus />
          <TurnLock />
          <Toast />
        </div>
      </div>
    </MotionConfig>
  );
}
