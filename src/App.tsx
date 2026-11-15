import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BottomBar, TopBar } from './components/battle/Bars';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { Battlefield } from './components/battle/Battlefield';
import { StatusListPopup } from './components/battle/StatusListPopup';
import { FocusPanel } from './components/battle/FocusPanel';
import { useElementSize } from './hooks/useElementSize';
import { SlotPreviewDialog } from './components/battle/SlotPreviewDialog';
import { Hand } from './components/battle/Hand';
import { PartyStrip } from './components/battle/PartyStrip';
import { DetailPopup } from './components/DetailPopup';
import { ResultScreen } from './components/ResultScreen';
import { CreateScreen } from './components/screens/CreateScreen';
import { DungeonScreen } from './components/screens/DungeonScreen';
import { ClearedScreen, GameOverScreen } from './components/screens/EndScreens';
import { HubScreen } from './components/screens/HubScreen';
import { RewardScreen } from './components/screens/RewardScreen';
import { ChestScreen } from './components/screens/ChestScreen';
import { DoorOpenScene } from './components/dungeon/DungeonAnim';
import { WorldScreen } from './components/world/WorldScreen';
import { EncounterScreen, EndingScreen, SanctuaryScreen, ShrineScreen, TownScreen } from './components/world/Places';
import { EventScreen, RestScreen } from './components/screens/RoomScreens';
import { SetupScreen } from './components/screens/SetupScreen';
import { JoinScreen, LobbyScreen, OnlineOverlay } from './components/screens/OnlineScreens';
import { TitleScreen } from './components/screens/TitleScreen';
import { Sheets } from './components/Sheets';
import { JobPickOverlay } from './components/JobSheet';
import { HeroTaskOverlay } from './components/HeroTasks';
import { AbilityCutins } from './components/ui/AbilityCutins';
import { SceneTabs } from './components/SceneTabs';
import { TurnLock } from './components/ui/TurnLock';
import { TurnCutin } from './components/ui/TurnCutin';
import { findAlly } from './engine';
import { useBackButton } from './hooks/useBackButton';
import { useAppHeight } from './hooks/useAppHeight';
import { useLowScreen } from './hooks/useLowScreen';
import { LAYER } from './components/ui/layers';
import { HelpScreen } from './components/help/HelpScreen';
import { useHelp } from './store/help';
import { useLore } from './store/lore';
import { Lorebook } from './components/lorebook/Lorebook';
import { FirstBattleGuide } from './components/battle/FirstBattleGuide';
import { useDetail } from './hooks/usePress';
import { useBattle } from './store/battleStore';
import { useProfile } from './store/profileStore';
import { watchViewChange } from './components/ui/localWindows';

/** PC向けの補助ショートカット（任意機能） */
function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 遊び方・用語集を開いている間は、Esc で閉じるだけ（下の画面は操作しない）
      if (useHelp.getState().open) {
        if (e.key === 'Escape') useHelp.getState().back();
        return;
      }
      // 冒険の途中に開いた伝承の書: Esc で1つ戻るだけ（下の画面は操作しない）
      if (useLore.getState().open) {
        if (e.key === 'Escape') useLore.getState().back();
        return;
      }
      const s = useBattle.getState();
      if (s.worldMoves.length) return;
      if (useDetail.getState().detail) {
        if (e.key === 'Escape') useDetail.getState().back();
        return;
      }
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
  const presenting = useBattle(s => s.presentationBusy);
  const selection = useBattle((s) => s.selection);
  const cancel = useBattle((s) => s.cancel);
  const calm = useBattle((s) => s.settings.cutinMode === 'simple');
  const [dockRef, dock] = useElementSize<HTMLDivElement>();
  return (
    <div className="game-bg safe-pad relative flex h-full w-full max-w-[480px] flex-col overflow-hidden" onClick={() => selection && cancel()} data-battle-presenting={presenting || undefined} data-calm={calm || undefined}>
      <TopBar />
      <FirstBattleGuide />
      <Battlefield />
      {/* 段階A: 味方の枠と手札はいつも同じ高さで置く（カードを選んでも戦場は縮まない）。
          操作パネルはその上に重ねる（味方の下半身〜手札の上。戦場の敵・味方の上半身は押せるまま） */}
      <div ref={dockRef} className="relative flex min-h-0 flex-col" data-battle-dock style={{ ['--dock-h' as string]: `${dock.height}px` }}>
        <PartyStrip />
        <Hand />
        <AnimatePresence>{selection && <FocusPanel key="focus" />}</AnimatePresence>
      </div>
      <BottomBar />
      {!presenting && <ResultScreen />}
      <SlotPreviewDialog />
      <EndTurnConfirm />
      <StatusListPopup />
    </div>
  );
}

/** 「ターン終了」の確認（まだ行動できる仲間がいる時だけ。押し間違いの防止） */
function EndTurnConfirm() {
  const open = useBattle((s) => s.confirmEndTurn && s.battle.phase === 'ally');
  const endTurn = useBattle((s) => s.endTurn);
  const setOpen = useBattle((s) => s.setConfirmEndTurn);
  return (
    <AnimatePresence>
      {open && (
        <ConfirmDialog
          key="end-turn"
          title="ターン終了"
          text="まだ行動できる仲間がいます。ターンを終了しますか？"
          ok="ターンを終了する"
          danger={false}
          onOk={() => endTurn(true)}
          onCancel={() => setOpen(false)}
        />
      )}
    </AnimatePresence>
  );
}

/** 画面の切り替え（タイトル〜キャラ作成 / 冒険中は GameState の mode で決まる） */
function CurrentScreen() {
  const screen = useBattle((s) => s.screen);
  const mode = useBattle((s) => s.game?.mode);
  const movement = useBattle(s => s.worldMoves[0]);
  const door = useBattle((s) => (s.doorOpen && s.doorOpen.scene === s.scene ? s.doorOpen : null));
  if (screen !== 'game' || !mode) {
    if (screen === 'setup') return <SetupScreen />;
    if (screen === 'create') return <CreateScreen />;
    if (screen === 'join') return <JoinScreen />;
    if (screen === 'lobby') return <LobbyScreen />;
    return <TitleScreen />;
  }
  // 移動の演出は、いつもの世界マップの画面（同じ地図・同じ駒）のまま再生する。
  // 下の case 'world' と同じ場所・同じ部品なので、画面も駒も作り直されない。
  if (movement) return <WorldScreen movement={movement} />;
  // 扉が開く演出の間は、部屋の画面（戦闘など）への切り替えを待つ（第3段階B2）
  if (door) return <DoorOpenScene key={door.id} door={door} />;
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
          style={{ zIndex: LAYER.toast }}
          className="pointer-events-none absolute inset-x-4 bottom-24 rounded-xl border border-amber-300/50 bg-black/90 px-3 py-2 text-center text-[14px] text-amber-50"
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
  const moving = useBattle(s => s.worldMoves.length > 0);
  const screen = useBattle((s) => s.screen);
  const closeTop = useBattle((s) => s.closeTop);
  const detail = useDetail(s => s.detail);
  const helpOpen = useHelp((s) => s.open);
  const loreOpen = useLore((s) => s.open);
  useEffect(() => { if (screen !== 'game') { useDetail.getState().hide(); useLore.getState().close(); } }, [screen]);
  // 公開前の点検 B1: 戦闘が終わった・別の戦闘になった・画面（勝利・世界マップ・ダンジョンなど）が変わった時は、
  // この端末だけの窓（状態の一覧・長押しの説明）を閉じる（勝利画面や次の戦闘の始めに残らないように）
  useEffect(() => watchViewChange(useBattle), []);
  // 伝承の書（K5）: 冒険の状態が変わるたびに、見た物・手に入れた物をこの端末の記録に足す（見るだけ。状態・同期は変えない）
  useEffect(() => {
    useProfile.getState().observe(useBattle.getState().full);
    return useBattle.subscribe((s, prev) => {
      if (s.full !== prev.full) useProfile.getState().observe(s.full);
    });
  }, []);

  useBackButton(helpOpen || loreOpen || !!detail || !!selection || !!sheet || confirmAbandon || screen === 'setup' || screen === 'create' || screen === 'join', () => {
    // 遊び方・用語集が一番上（項目 → 目次 → 閉じる）。閉じると開いた画面に戻る
    if (useHelp.getState().open) { useHelp.getState().back(); return true; }
    // 伝承の書（冒険の途中）: 詳細 → 本の順に閉じる。閉じると開いたメニューに戻る
    if (useLore.getState().open) { useLore.getState().back(); return true; }
    if (useDetail.getState().detail) { useDetail.getState().back(); return true; }
    return closeTop();
  });
  useKeyboard();
  // 実機の不具合②: 見えている高さ（visualViewport）を --app-h に入れる（LINE 内ブラウザで下が切れないように）
  useAppHeight();
  // 狭い画面 回0: 見えている高さが 640px 未満（672px 以上で戻る）の時は、いちばん外に data-low の印（低い画面の形に切り替える）
  const low = useLowScreen();

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
      <div className="flex w-full justify-center bg-[#050407]" style={{ height: 'var(--app-h, 100dvh)' }} data-app-root data-low={low ? '' : undefined}>
        <div className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden">
          {!moving && screen === 'game' && <SceneTabs />}
          <div className="relative flex min-h-0 w-full flex-1 justify-center">
            <CurrentScreen />
          </div>
          {!moving && <>
            <Sheets />
            {screen === 'game' && <JobPickOverlay />}
            <HeroTaskOverlay />
            <DetailPopup />
            <OnlineOverlay />
            {screen === 'game' && <TurnLock />}
            {screen === 'game' && <AbilityCutins />}
            {screen === 'game' && <TurnCutin />}
          </>}
          {/* 伝承の書（Step C ②）: 冒険の途中にメニューから開く。読むだけ。閉じると開いたメニューに戻る */}
          {loreOpen && screen === 'game' && (
            <div className="absolute inset-0" style={{ zIndex: LAYER.cardPick }}>
              <Lorebook inAdventure onClose={() => useLore.getState().close()} />
            </div>
          )}
          <HelpScreen />
          <Toast />
        </div>
      </div>
    </MotionConfig>
  );
}
