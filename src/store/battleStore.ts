// ===== Zustand ストア =====
// ロジックは src/engine（冒険: applyGameCommand / 戦闘: applyCommand）を呼ぶだけ。
// ここでは画面の切り替え・UI 用の一時状態（選択中のカード・演出）・保存・敵フェーズのタイマーを扱う。

import { create } from 'zustand';
import { TIMING, VIBRATION } from '../data/balance';
import { cardOf } from '../data/cards';
import { CLASSES } from '../data/classes';
import { contentVersion } from '../data/contentVersion';
import { ENCOUNTERS } from '../data/enemies';
import { SCENARIOS } from '../data/scenarios';
import {
  applyGameCommand,
  createBattle,
  createGame,
  findAlly,
  GAME_VERSION,
  migrateGame,
  isDone,
  makeSeed,
  unusableReason,
} from '../engine';
import type { BattleEvent, BattleState, Command, Difficulty, GameCommand, GameState, Gender, SlotResult } from '../types';
import { LOCAL_PLAYER, autoName } from './battleConfig';

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
  tone: 'damage' | 'block' | 'status' | 'zero' | 'ability' | 'heal';
}

/** ユニットごとの動きの演出 */
export interface UnitFx {
  kind: 'attack' | 'hit' | 'cast' | 'phase';
  id: number;
}

export type Sheet = null | 'menu' | 'log' | 'draw' | 'discard' | 'party' | 'pouch';
export type Screen = 'title' | 'setup' | 'create' | 'game';

/** 冒険の準備〜キャラクター作成の下書き */
export interface NewGameDraft {
  scenarioId: string;
  difficulty: Difficulty;
  party: { classId: string; gender: Gender; name: string }[];
}

interface StoreState {
  screen: Screen;
  draft: NewGameDraft;
  game: GameState | null;
  /** 表示中（または最後）の戦闘。戦闘画面の部品はここを読む */
  battle: BattleState;
  settings: Settings;
  activeId: string;
  selection: Selection | null;
  sheet: Sheet;
  /** 冒険の放棄・リセットの確認 */
  confirmAbandon: boolean;
  rollFx: RollFx | null;
  popups: Popup[];
  unitFx: Record<string, UnitFx>;
  retargets: Record<string, number>;
  flash: { cardUid: string; text: string; id: number } | null;
  hint: { text: string; id: number } | null;
  /** 画面下に出す短いお知らせ（エラーなど） */
  toast: { text: string; id: number } | null;

  setScreen: (s: Screen) => void;
  setDraft: (d: Partial<NewGameDraft>) => void;
  startGame: () => void;
  continueGame: () => void;
  abandonGame: () => void;
  dispatchGame: (cmd: GameCommand) => string | undefined;
  dispatch: (cmd: Command) => string | undefined;
  tapCard: (cardUid: string) => void;
  tapEnemy: (uid: string) => void;
  setFocus: (n: number) => void;
  confirm: () => void;
  cancel: () => void;
  setActive: (id: string) => void;
  endTurn: () => void;
  usePouch: (itemUid: string, targetHeroId: string) => void;
  setSettings: (s: Partial<Settings>) => void;
  openSheet: (s: Sheet) => void;
  setConfirmAbandon: (v: boolean) => void;
  showToast: (text: string) => void;
  /** 戻る操作などで一番上のものを閉じる。閉じたら true */
  closeTop: () => boolean;
}

const SAVE_KEY = 'card-rpg/adventure';
const SETTINGS_KEY = 'card-rpg/settings';

interface SaveData {
  version: number;
  /** 保存した時のコンテンツの版（参考。違っても、読めるなら読み込む） */
  content?: string;
  game: GameState;
  activeId: string;
}

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    // 古い版は直してから読む（直せない・今のデータで読めない時は読まない）
    const game = migrateGame(data.game);
    if (!game) return null;
    return { ...data, version: GAME_VERSION, game };
  } catch {
    return null;
  }
}

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (s && typeof s.fastMode === 'boolean') return s;
  } catch {
    /* noop */
  }
  return { fastMode: false, vibration: true };
}

function writeSave(s: Pick<StoreState, 'game' | 'activeId'>) {
  try {
    if (!s.game) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify({ version: GAME_VERSION, content: contentVersion(), game: s.game, activeId: s.activeId } satisfies SaveData));
  } catch {
    // 保存できなくても普通に遊べる
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** 保存は連続した操作をまとめて1回にする（書き込み回数を減らす） */
function scheduleSave(get: () => StoreState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeSave(get());
  }, 150);
}

export function vibrate(settings: Settings, pattern: number | readonly number[]) {
  if (!settings.vibration) return;
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch {
    /* 非対応端末 */
  }
}

export function speedFactor(settings: Pick<Settings, 'fastMode'>): number {
  return settings.fastMode ? TIMING.fastModeFactor : 1;
}

let fxId = 1;
let enemyTimer: ReturnType<typeof setTimeout> | null = null;

/** 次に操作するキャラ（この端末の担当キャラだけが対象） */
function nextActive(battle: BattleState, current: string): string {
  const mine = battle.allies.filter((a) => a.playerId === LOCAL_PLAYER);
  const cur = mine.find((a) => a.id === current);
  if (cur && !isDone(battle, cur)) return current;
  const start = Math.max(0, mine.findIndex((a) => a.id === current));
  for (let i = 1; i <= mine.length; i++) {
    const a = mine[(start + i) % mine.length];
    if (!isDone(battle, a)) return a.id;
  }
  if (cur && !cur.dead) return current;
  return mine.find((a) => !a.dead)?.id ?? mine[0]?.id ?? current;
}

function popupsFromEvents(events: BattleEvent[]): Popup[] {
  const out: Popup[] = [];
  for (const e of events) {
    if (e.type === 'damage') {
      if (e.amount > 0) out.push({ id: fxId++, unitId: e.unitId, text: `-${e.amount}`, tone: 'damage' });
      else out.push({ id: fxId++, unitId: e.unitId, text: e.blocked > 0 ? `防御 ${e.blocked}` : '0', tone: 'zero' });
    } else if (e.type === 'block') {
      out.push({ id: fxId++, unitId: e.unitId, text: `+${e.amount}`, tone: 'block' });
    } else if (e.type === 'heal') {
      out.push({ id: fxId++, unitId: e.unitId, text: `+${e.amount}`, tone: 'heal' });
    } else if (e.type === 'status') {
      const n = { vulnerable: '脆弱', weak: '弱体', burn: '火傷', poison: '毒' }[e.status];
      out.push({ id: fxId++, unitId: e.unitId, text: `${n} ${e.amount}`, tone: 'status' });
    } else if (e.type === 'ability') {
      out.push({ id: fxId++, unitId: e.unitId, text: e.name, tone: 'ability' });
    } else if (e.type === 'enemyPhase') {
      out.push({ id: fxId++, unitId: e.enemyUid, text: e.name, tone: 'ability' });
    }
  }
  return out;
}

/** 戦闘が無い時の表示用の空の戦闘（画面部品の型を単純に保つため） */
const EMPTY_BATTLE: BattleState = (() => {
  const b = createBattle({
    seed: 1,
    party: [{ classId: CLASSES.all[0].id, gender: 'male', name: '-', playerId: LOCAL_PLAYER }],
    encounter: ENCOUNTERS.all[0],
  });
  return { ...b, phase: 'victory' };
})();

/** 冒険の準備の初期値（最初から遊べる先頭のシナリオ・先頭の職業2つ） */
const defaultDraft = (): NewGameDraft => {
  const classes = CLASSES.all.filter((c) => c.unlocked);
  const party = [0, 1].map((i) => {
    const c = classes[i % classes.length];
    const gender = i % 2 ? 'female' : 'male';
    return { classId: c.id, gender, name: autoName(c.id, gender, i) } as const;
  });
  return { scenarioId: SCENARIOS.all.find((s) => s.unlocked)!.id, difficulty: 'normal', party: [...party] };
};

const saved = loadSave();

export const useBattle = create<StoreState>((set, get) => {
  /** 敵フェーズを自動で進める */
  const scheduleEnemy = () => {
    if (enemyTimer) clearTimeout(enemyTimer);
    const { game, settings } = get();
    if (game?.mode !== 'battle' || game.battle?.phase !== 'enemy') return;
    enemyTimer = setTimeout(
      () => {
        enemyTimer = null;
        get().dispatch({ type: 'ENEMY_STEP' });
      },
      (TIMING.enemyStep * 1000) / speedFactor(settings),
    );
  };

  const applyEvents = (events: BattleEvent[]) => {
    if (!events.length) return;
    const { settings, battle } = get();
    const patch: Partial<StoreState> = {};
    const unitFx: Record<string, UnitFx> = { ...get().unitFx };
    let unitFxChanged = false;
    const setFx = (unitId: string, kind: UnitFx['kind']) => {
      unitFx[unitId] = { kind, id: fxId++ };
      unitFxChanged = true;
    };
    for (const e of events) {
      if (e.type === 'roll') {
        patch.rollFx = { id: fxId++, results: e.results, summary: e.summary, perfect: e.perfect };
        const ally = findAlly(battle, e.characterId);
        const inst = ally && [...ally.discard].reverse().find((c) => c.cardId === e.cardId);
        const target = inst ? cardOf(inst).target : 'enemy';
        setFx(e.characterId, target === 'self' ? 'cast' : 'attack');
        if (e.perfect) vibrate(settings, VIBRATION.perfect);
      } else if (e.type === 'retarget') {
        patch.retargets = { ...(patch.retargets ?? get().retargets), [e.enemyUid]: fxId++ };
      } else if (e.type === 'enemyAct') {
        setFx(e.enemyUid, 'attack');
      } else if (e.type === 'enemyPhase') {
        setFx(e.enemyUid, 'phase');
        vibrate(settings, VIBRATION.victory);
      } else if (e.type === 'damage') {
        if (e.amount > 0 || e.blocked > 0) setFx(e.unitId, 'hit');
        if (e.amount > 0 && findAlly(battle, e.unitId)) vibrate(settings, VIBRATION.hurt);
      } else if (e.type === 'phase' && e.phase === 'victory') {
        vibrate(settings, VIBRATION.victory);
      }
    }
    if (unitFxChanged) patch.unitFx = unitFx;
    const newPopups = popupsFromEvents(events);
    if (newPopups.length) {
      patch.popups = [...get().popups, ...newPopups].slice(-10);
      const ids = new Set(newPopups.map((p) => p.id));
      setTimeout(() => set((s) => ({ popups: s.popups.filter((p) => !ids.has(p.id)) })), (TIMING.resultPopup * 1000 + 250) / speedFactor(settings));
    }
    set(patch);
  };

  /** 新しい戦闘に入った時の UI のリセット */
  const resetBattleUi = (b: BattleState): Partial<StoreState> => ({
    selection: null,
    rollFx: null,
    popups: [],
    unitFx: {},
    retargets: {},
    flash: null,
    hint: null,
    activeId: nextActive(b, b.allies.find((a) => a.playerId === LOCAL_PLAYER)?.id ?? b.allies[0].id),
  });

  return {
    screen: 'title',
    draft: defaultDraft(),
    game: saved?.game ?? null,
    battle: saved?.game.battle ?? EMPTY_BATTLE,
    settings: loadSettings(),
    activeId: saved?.activeId ?? '',
    selection: null,
    sheet: null,
    confirmAbandon: false,
    rollFx: null,
    popups: [],
    unitFx: {},
    retargets: {},
    flash: null,
    hint: null,
    toast: null,

    setScreen: (screen) => set({ screen, sheet: null }),
    setDraft: (d) => set({ draft: { ...get().draft, ...d } }),

    startGame: () => {
      const d = get().draft;
      const game = createGame({
        seed: makeSeed(),
        scenarioId: d.scenarioId,
        difficulty: d.difficulty,
        party: d.party.map((m) => ({ ...m, playerId: LOCAL_PLAYER })),
      });
      set({ game, screen: 'game', battle: EMPTY_BATTLE, sheet: null, selection: null });
      scheduleSave(get);
    },

    continueGame: () => {
      const { game } = get();
      if (!game) return;
      set({ screen: 'game', sheet: null });
      if (game.battle) set({ battle: game.battle, ...resetBattleUi(game.battle) });
      scheduleSave(get);
      setTimeout(scheduleEnemy, 300);
    },

    abandonGame: () => {
      if (enemyTimer) clearTimeout(enemyTimer);
      enemyTimer = null;
      set({ game: null, screen: 'title', confirmAbandon: false, sheet: null, battle: EMPTY_BATTLE, selection: null });
      writeSave({ game: null, activeId: '' });
    },

    dispatchGame: (cmd) => {
      const { game } = get();
      if (!game) return '冒険が始まっていません';
      const prevBattle = game.battle;
      const r = applyGameCommand(game, cmd);
      if (r.error) {
        get().showToast(r.error);
        return r.error;
      }
      const next = r.state;
      const patch: Partial<StoreState> = { game: next };
      if (next.battle) {
        patch.battle = next.battle;
        if (next.battle !== prevBattle && (!prevBattle || prevBattle.seed !== next.battle.seed || prevBattle.encounterId !== next.battle.encounterId)) {
          Object.assign(patch, resetBattleUi(next.battle));
        } else if (next.battle.phase === 'ally') {
          patch.activeId = nextActive(next.battle, get().activeId);
        }
        if (next.battle.phase !== 'ally' && next.battle.phase !== 'enemy') {
          patch.selection = null;
          patch.sheet = null;
        }
      }
      set(patch);
      applyEvents(r.battleEvents);
      scheduleSave(get);
      scheduleEnemy();
      return undefined;
    },

    dispatch: (cmd) => {
      const { game } = get();
      if (!game || game.mode !== 'battle') return '戦闘中ではありません';
      const r = applyGameCommand(game, { type: 'BATTLE', command: cmd });
      if (r.error) return r.error;
      const b = r.state.battle!;
      const finished = b.phase !== 'ally' && b.phase !== 'enemy';
      const activeId = b.phase === 'ally' ? nextActive(b, get().activeId) : get().activeId;
      set(finished ? { game: r.state, battle: b, activeId, selection: null, sheet: null } : { game: r.state, battle: b, activeId });
      applyEvents(r.battleEvents);
      scheduleSave(get);
      scheduleEnemy();
      return undefined;
    },

    tapCard: (cardUid) => {
      const { battle, activeId, selection } = get();
      const ally = findAlly(battle, activeId);
      if (!ally || ally.playerId !== LOCAL_PLAYER) return;
      const inst = ally.hand.find((c) => c.uid === cardUid);
      if (!inst) return;
      if (selection?.cardUid === cardUid) {
        get().confirm();
        return;
      }
      const card = cardOf(inst);
      const reason = unusableReason(battle, ally, card);
      if (reason) {
        set({ flash: { cardUid, text: reason, id: fxId++ } });
        return;
      }
      let targetId: string | undefined;
      if (card.target === 'enemy') {
        const alive = battle.enemies.filter((e) => !e.dead);
        if (alive.length === 1) targetId = alive[0].uid;
      }
      set({ selection: { cardUid, targetId, focus: 0 }, flash: null });
    },

    tapEnemy: (uid) => {
      const { selection, battle, activeId } = get();
      if (!selection) return;
      const ally = findAlly(battle, activeId);
      const inst = ally?.hand.find((c) => c.uid === selection.cardUid);
      if (!inst || cardOf(inst).target !== 'enemy') return;
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
      const max = Math.min(cardOf(inst).slots, ally.focus);
      const focus = Math.max(0, Math.min(max, n));
      if (focus !== selection.focus) set({ selection: { ...selection, focus } });
    },

    confirm: () => {
      const { selection, activeId, battle } = get();
      if (!selection) return;
      const ally = findAlly(battle, activeId);
      const inst = ally?.hand.find((c) => c.uid === selection.cardUid);
      if (!inst) return set({ selection: null });
      const card = cardOf(inst);
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

    cancel: () => {
      if (get().selection) set({ selection: null });
    },

    setActive: (id) => {
      const ally = findAlly(get().battle, id);
      if (!ally || ally.dead || ally.playerId !== LOCAL_PLAYER) return;
      if (get().activeId === id && !get().selection) return;
      set({ activeId: id, selection: null });
      scheduleSave(get);
    },

    endTurn: () => {
      const { battle } = get();
      if (battle.phase !== 'ally') return;
      const canAct = battle.allies.some((a) => a.playerId === LOCAL_PLAYER && !isDone(battle, a));
      set({ selection: null, hint: canAct ? { text: 'まだ行動できるキャラがいます', id: fxId++ } : null });
      get().dispatch({ type: 'END_TURN', playerId: LOCAL_PLAYER });
    },

    usePouch: (itemUid, targetHeroId) => {
      const { game, activeId } = get();
      if (!game) return;
      const user =
        game.mode === 'battle'
          ? activeId
          : (game.heroes.find((h) => h.playerId === LOCAL_PLAYER && h.hp > 0)?.id ?? targetHeroId);
      const err = get().dispatchGame({ type: 'USE_POUCH_ITEM', playerId: LOCAL_PLAYER, itemUid, userId: user, targetId: targetHeroId });
      if (!err) set({ sheet: null });
    },

    setSettings: (s) => {
      const settings = { ...get().settings, ...s };
      set({ settings });
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        /* noop */
      }
    },

    openSheet: (sheet) => set({ sheet, selection: sheet ? null : get().selection }),
    setConfirmAbandon: (v) => set({ confirmAbandon: v }),
    showToast: (text) => set({ toast: { text, id: fxId++ } }),

    closeTop: () => {
      const s = get();
      if (s.confirmAbandon) return set({ confirmAbandon: false }), true;
      if (s.sheet === 'log') return set({ sheet: 'menu' }), true;
      if (s.sheet) return set({ sheet: null }), true;
      if (s.selection) return set({ selection: null }), true;
      if (s.screen === 'create') return set({ screen: 'setup' }), true;
      if (s.screen === 'setup') return set({ screen: 'title' }), true;
      return false;
    },
  };
});

// 画面を閉じる・裏に回る直前に、保存待ちを確実に書き出す
if (typeof window !== 'undefined') {
  const flush = () => {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    writeSave(useBattle.getState());
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
