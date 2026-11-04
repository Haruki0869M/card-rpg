// ===== Zustand ストア =====
// 戦闘ロジックは src/engine を呼ぶだけ。ここでは UI 用の一時状態（選択中のカード・演出キュー）と
// 保存・敵フェーズのタイマーを扱う。

import { create } from 'zustand';
import { TIMING, VIBRATION } from '../data/balance';
import { getCard } from '../data/cards';
import {
  applyCommand,
  createBattle,
  findAlly,
  isDone,
  livingEnemies,
  makeSeed,
  STATE_VERSION,
  unusableReason,
} from '../engine';
import type { BattleEvent, BattleState, Command, SlotResult } from '../types';
import { type BattleConfig, LOCAL_PLAYER, sanitizeConfig, toSetup } from './battleConfig';

export interface Settings {
  fastMode: boolean;
  vibration: boolean;
}

export interface Selection {
  cardUid: string;
  targetId?: string;
  focus: number;
}

export interface RollFx {
  id: number;
  results: SlotResult[];
  summary: string;
  perfect: boolean;
}

export interface Popup {
  id: number;
  unitId: string;
  text: string;
  tone: 'damage' | 'block' | 'status' | 'zero';
}

export type Sheet = null | 'menu' | 'log' | 'draw' | 'discard';

interface StoreState {
  battle: BattleState;
  settings: Settings;
  config: BattleConfig;
  activeId: string;
  selection: Selection | null;
  sheet: Sheet;
  confirmReset: boolean;
  rollFx: RollFx | null;
  popups: Popup[];
  /** 挑発でインテント対象が変わった敵（演出用、値は演出ID） */
  retargets: Record<string, number>;
  /** 現在行動中の敵 */
  actingEnemy: string | null;
  /** 使えないカードをタップした時の理由 */
  flash: { cardUid: string; text: string; id: number } | null;
  /** ターン終了ボタン付近のヒント */
  hint: { text: string; id: number } | null;

  dispatch: (cmd: Command) => string | undefined;
  tapCard: (cardUid: string) => void;
  tapEnemy: (uid: string) => void;
  setFocus: (n: number) => void;
  confirm: () => void;
  cancel: () => void;
  setActive: (id: string) => void;
  endTurn: () => void;
  newBattle: (opts?: { sameSeed?: boolean; config?: BattleConfig }) => void;
  setSettings: (s: Partial<Settings>) => void;
  openSheet: (s: Sheet) => void;
  setConfirmReset: (v: boolean) => void;
  /** 戻る操作などで一番上のものを閉じる。閉じたら true */
  closeTop: () => boolean;
}

const SAVE_KEY = 'card-rpg/save';

interface SaveData {
  version: number;
  battle: BattleState;
  settings: Settings;
  config: BattleConfig;
  activeId: string;
}

function load(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== STATE_VERSION || data.battle?.version !== STATE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

function save(s: Pick<StoreState, 'battle' | 'settings' | 'activeId' | 'config'>) {
  try {
    const data: SaveData = { version: STATE_VERSION, battle: s.battle, settings: s.settings, config: s.config, activeId: s.activeId };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // 保存できなくても普通に遊べる
  }
}

function vibrate(settings: Settings, pattern: number | readonly number[]) {
  if (!settings.vibration) return;
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch {
    /* 非対応端末 */
  }
}

export function speedFactor(settings: Settings): number {
  return settings.fastMode ? TIMING.fastModeFactor : 1;
}

let fxId = 1;
let enemyTimer: ReturnType<typeof setTimeout> | null = null;

/** 次に操作するキャラ（現在のキャラが行動完了なら、まだ行動できる次のキャラ） */
function nextActive(battle: BattleState, current: string): string {
  // この端末のプレイヤーが担当するキャラだけが対象
  const mine = battle.allies.filter((a) => a.playerId === LOCAL_PLAYER);
  const cur = mine.find((a) => a.id === current);
  if (cur && !isDone(battle, cur)) return current;
  const start = Math.max(0, mine.findIndex((a) => a.id === current));
  for (let i = 1; i <= mine.length; i++) {
    const a = mine[(start + i) % mine.length];
    if (!isDone(battle, a)) return a.id;
  }
  // 全員行動完了: 生存している誰か（現在のキャラが生きていればそのまま）
  if (cur && !cur.dead) return current;
  return mine.find((a) => !a.dead)?.id ?? mine[0]?.id ?? current;
}

function popupsFromEvents(events: BattleEvent[]): Popup[] {
  const out: Popup[] = [];
  for (const e of events) {
    if (e.type === 'damage') {
      if (e.amount > 0) out.push({ id: fxId++, unitId: e.unitId, text: `-${e.amount}`, tone: 'damage' });
      else out.push({ id: fxId++, unitId: e.unitId, text: e.blocked > 0 ? `🛡${e.blocked}` : '0', tone: 'zero' });
    } else if (e.type === 'block') {
      out.push({ id: fxId++, unitId: e.unitId, text: `+🛡${e.amount}`, tone: 'block' });
    } else if (e.type === 'status') {
      out.push({ id: fxId++, unitId: e.unitId, text: e.status === 'vulnerable' ? `脆弱${e.amount}` : `弱体${e.amount}`, tone: 'status' });
    }
  }
  return out;
}

const saved = load();
const initialConfig = sanitizeConfig(saved?.config);
const initialBattle = saved?.battle ?? createBattle(toSetup(makeSeed(), initialConfig));

export const useBattle = create<StoreState>((set, get) => {
  /** 敵フェーズを自動で進める */
  const scheduleEnemy = () => {
    if (enemyTimer) clearTimeout(enemyTimer);
    const { battle, settings } = get();
    if (battle.phase !== 'enemy') return;
    enemyTimer = setTimeout(
      () => {
        enemyTimer = null;
        get().dispatch({ type: 'ENEMY_STEP' });
      },
      (TIMING.enemyStep * 1000) / speedFactor(settings),
    );
  };

  const applyEvents = (events: BattleEvent[]) => {
    const { settings } = get();
    const newPopups = popupsFromEvents(events);
    const patch: Partial<StoreState> = {};
    for (const e of events) {
      if (e.type === 'roll') {
        patch.rollFx = { id: fxId++, results: e.results, summary: e.summary, perfect: e.perfect };
        if (e.perfect) vibrate(settings, VIBRATION.perfect);
      } else if (e.type === 'retarget') {
        patch.retargets = { ...(patch.retargets ?? get().retargets), [e.enemyUid]: fxId++ };
      } else if (e.type === 'enemyAct') {
        patch.actingEnemy = e.enemyUid;
      } else if (e.type === 'damage' && e.amount > 0 && !e.unitId.startsWith('e')) {
        vibrate(settings, VIBRATION.hurt);
      } else if (e.type === 'phase') {
        if (e.phase === 'ally') patch.actingEnemy = null;
        if (e.phase === 'victory') vibrate(settings, VIBRATION.victory);
      }
    }
    if (newPopups.length) {
      // 同時に出す演出は最大8個に絞る
      patch.popups = [...get().popups, ...newPopups].slice(-8);
      const ids = new Set(newPopups.map((p) => p.id));
      setTimeout(
        () => set((s) => ({ popups: s.popups.filter((p) => !ids.has(p.id)) })),
        (TIMING.resultPopup * 1000 + 200) / speedFactor(settings),
      );
    }
    set(patch);
  };

  return {
    battle: initialBattle,
    settings: saved?.settings ?? { fastMode: false, vibration: true },
    config: initialConfig,
    activeId: saved?.activeId ?? nextActive(initialBattle, initialBattle.allies[0].id),
    selection: null,
    sheet: null,
    confirmReset: false,
    rollFx: null,
    popups: [],
    retargets: {},
    actingEnemy: null,
    flash: null,
    hint: null,

    dispatch: (cmd) => {
      const { state, events, error } = applyCommand(get().battle, cmd);
      if (error) return error;
      const activeId = state.phase === 'ally' ? nextActive(state, get().activeId) : get().activeId;
      set({ battle: state, activeId });
      applyEvents(events);
      save(get());
      if (state.phase === 'enemy') scheduleEnemy();
      if (state.phase === 'victory' || state.phase === 'defeat') set({ selection: null, sheet: null });
      return undefined;
    },

    tapCard: (cardUid) => {
      const { battle, activeId, selection } = get();
      const ally = findAlly(battle, activeId);
      if (!ally) return;
      const inst = ally.hand.find((c) => c.uid === cardUid);
      if (!inst) return;
      if (selection?.cardUid === cardUid) {
        get().confirm();
        return;
      }
      const card = getCard(inst.cardId);
      const reason = unusableReason(battle, ally, card);
      if (reason) {
        set({ flash: { cardUid, text: reason, id: fxId++ } });
        return;
      }
      let targetId: string | undefined;
      if (card.target === 'enemy') {
        const alive = livingEnemies(battle);
        if (alive.length === 1) targetId = alive[0].uid;
      }
      set({ selection: { cardUid, targetId, focus: 0 }, flash: null });
    },

    tapEnemy: (uid) => {
      const { selection, battle, activeId } = get();
      if (!selection) return;
      const ally = findAlly(battle, activeId);
      const inst = ally?.hand.find((c) => c.uid === selection.cardUid);
      if (!inst || getCard(inst.cardId).target !== 'enemy') return;
      const enemy = battle.enemies.find((e) => e.uid === uid);
      if (!enemy || enemy.dead) return;
      set({ selection: { ...selection, targetId: uid } });
    },

    setFocus: (n) => {
      const { selection, battle, activeId } = get();
      if (!selection) return;
      const ally = findAlly(battle, activeId);
      const inst = ally?.hand.find((c) => c.uid === selection.cardUid);
      if (!ally || !inst) return;
      const max = Math.min(getCard(inst.cardId).slots, ally.focus);
      set({ selection: { ...selection, focus: Math.max(0, Math.min(max, n)) } });
    },

    confirm: () => {
      const { selection, activeId, battle } = get();
      if (!selection) return;
      const ally = findAlly(battle, activeId);
      const inst = ally?.hand.find((c) => c.uid === selection.cardUid);
      if (!inst) return set({ selection: null });
      const card = getCard(inst.cardId);
      if (card.target === 'enemy' && !selection.targetId) {
        set({ flash: { cardUid: selection.cardUid, text: '敵をタップして対象を選んでください', id: fxId++ } });
        return;
      }
      const err = get().dispatch({
        type: 'PLAY_CARD',
        playerId: LOCAL_PLAYER,
        characterId: activeId,
        cardInstanceId: selection.cardUid,
        targetId: card.target === 'enemy' ? selection.targetId : undefined,
        focusUsed: selection.focus,
      });
      if (err) set({ flash: { cardUid: selection.cardUid, text: err, id: fxId++ } });
      else set({ selection: null });
    },

    cancel: () => set({ selection: null }),

    setActive: (id) => {
      const ally = findAlly(get().battle, id);
      if (!ally || ally.dead || ally.playerId !== LOCAL_PLAYER) return;
      set({ activeId: id, selection: null });
      save(get());
    },

    endTurn: () => {
      const { battle } = get();
      if (battle.phase !== 'ally') return;
      const canAct = battle.allies.some((a) => !isDone(battle, a));
      set({ selection: null, hint: canAct ? { text: 'まだ行動できるキャラがいます', id: fxId++ } : null });
      get().dispatch({ type: 'END_TURN', playerId: LOCAL_PLAYER });
    },

    newBattle: (opts) => {
      const { battle } = get();
      const seed = opts?.sameSeed ? battle.seed : makeSeed();
      const config = sanitizeConfig(opts?.config ?? get().config);
      if (enemyTimer) clearTimeout(enemyTimer);
      enemyTimer = null;
      const next = createBattle(toSetup(seed, config));
      set({
        battle: next,
        config,
        activeId: next.allies[0].id,
        selection: null,
        sheet: null,
        confirmReset: false,
        rollFx: null,
        popups: [],
        retargets: {},
        actingEnemy: null,
        flash: null,
        hint: null,
      });
      save(get());
    },

    setSettings: (s) => {
      set({ settings: { ...get().settings, ...s } });
      save(get());
    },

    openSheet: (sheet) => set({ sheet, selection: sheet ? null : get().selection }),
    setConfirmReset: (v) => set({ confirmReset: v }),

    closeTop: () => {
      const s = get();
      if (s.confirmReset) return set({ confirmReset: false }), true;
      if (s.sheet === 'log' || s.sheet === 'draw' || s.sheet === 'discard') {
        set({ sheet: s.sheet === 'log' ? 'menu' : null });
        return true;
      }
      if (s.sheet) return set({ sheet: null }), true;
      if (s.selection) return set({ selection: null }), true;
      return false;
    },
  };
});

// 中断中に敵フェーズだった場合は再開する
if (initialBattle.phase === 'enemy') {
  setTimeout(() => useBattle.getState().dispatch({ type: 'ENEMY_STEP' }), 300);
}
