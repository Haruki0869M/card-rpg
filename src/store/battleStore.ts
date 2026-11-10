import { cardTargets, isAllyCard, needsCardTarget, selectedCardTarget, targetGuide, secondaryCard, secondaryCardTarget } from '../engine/battle/targets';
// ===== Zustand ストア =====
// ロジックは src/engine（冒険: applyGameCommand / 戦闘: applyCommand）を呼ぶだけ。
// ここでは画面の切り替え・UI 用の一時状態（選択中のカード・演出）・保存・敵フェーズのタイマーを扱う。

import { create } from 'zustand';
import { normalizeSettings, type Settings } from './settings';
import { playSound, setAudioVolumes } from '../audio/player';
import { petCry } from '../audio/cues';
import { battleFrames, explorationNotices, explorationSounds, type CalloutDraft, type ImpactDraft, type PopupDraft, type PopupTone, type SynergyTier, type NoticeDraft, type PresentationFrame } from './presentation';
export type { Settings } from './settings';
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
  needsVote,
  sceneOfHero,
  unwrapCommand,
  viewOf,
  voters,
  waitingPlayers,
  WORLD_SCENE,
} from '../engine';
import type { Room } from '../net/room';
import type { BattleEvent, BattleState, Command, Difficulty, DungeonRun, GameCommand, GameResult, GameState, Gender, PlayerId, SlotResult } from '../types';
import { pickAllyTarget } from './healTarget';
import { actorOf, autoName, battleActorOf, isLocalPlayer, isOnlinePlay, LOCAL_PLAYER } from './battleConfig';
import { handoffReplacesCutin } from './handoff';

export interface Selection {
  cardUid: string;
  targetId?: string;
  allyTargetId?: string;
  focus: number;
}

export interface RollFx {
  id: number;
  results: SlotResult[];
  summary: string;
  perfect: boolean;
  /** 成功の数（スロットの結果の音を選ぶ。K6） */
  successes?: number;
  /** 他の人の操作（音を少し小さく。K6） */
  quiet?: boolean;
}

/** 扉が開く演出（入る前のダンジョンの様子と、その場面） */
export interface DoorOpen {
  id: number;
  scene: string;
  run: DungeonRun;
  /** 開けた扉の部屋（扉の前まで自動で歩く様子を見せる） */
  roomId?: string;
}

/** 手番のカットイン（docs/tasks/turn-cutin.md） */
export interface TurnCutin {
  id: number;
  heroId: string;
  /** この端末で操作するキャラの番か（大きなカットイン）。違えば小さなお知らせ */
  mine: boolean;
  /** そのキャラのいる場面（世界マップかダンジョンの場面のID） */
  scene: string;
}

export interface Popup {
  id: number;
  unitId: string;
  text: string;
  tone: PopupTone;
  lane: number;
  /** 重なりの段階（Step C。2 = 大きな金の数字、3 = さらに広がる輪） */
  tier?: SynergyTier;
}

/** 段階B: 技名の帯・命中のエフェクト・戦場の揺れ・盾（見た目だけ。状態・乱数・同期には触れない） */
export type Callout = CalloutDraft & { id: number };
export type ImpactFx = Omit<ImpactDraft, 'unitId'> & { id: number };

/** ユニットごとの動きの演出 */
export interface UnitFx {
  kind: 'attack' | 'hit' | 'cast' | 'phase';
  id: number;
}

export type Sheet = null | 'menu' | 'log' | 'draw' | 'discard' | 'party' | 'pouch' | 'quests' | 'jobs';
export type Screen = 'title' | 'setup' | 'create' | 'game' | 'join' | 'lobby';

/** 冒険の準備〜キャラクター作成の下書き */
export interface NewGameDraft {
  scenarioId: string;
  difficulty: Difficulty;
  /** playerId: 担当プレイヤー（ローカル協力。初期値は全員P1） */
  party: { classId: string; gender: Gender; name: string; playerId?: PlayerId }[];
}

export interface WorldMovePresentation {
  id: number;
  /** 移動を確定した後の状態（到着してから見せる） */
  game: GameState;
  /** 移動を押す前の状態。歩いている間はこちらの視界・敵の配置・手番を見せる（ゴールの敵が先に出ないように） */
  before?: GameState;
}

interface StoreState {
  presentationBusy: boolean;
  /** 「ターン N」「敵のターン」の帯（数字の表示が全部終わってから出す。見た目だけ） */
  phaseBanner: { id: number; phase: 'ally' | 'enemy'; turn: number } | null;
  cutins: (NoticeDraft & { id: number })[];
  petPulses: Record<string, { id: number }>;
  worldMoves: WorldMovePresentation[];
  finishWorldMove: (id: number) => void;
  /** 手番が移った時のカットイン（mine = この端末で操作するキャラの番。見た目だけ。状態・同期は変えない） */
  turnCutin: TurnCutin | null;
  dismissTurnCutin: (id: number) => void;
  /** ダンジョンの扉が開く演出（第3段階B2）。終わるまで、部屋の画面（戦闘など）への切り替えを待つ。端末の中の見た目だけ */
  doorOpen: DoorOpen | null;
  finishDoorOpen: (id: number) => void;
  screen: Screen;
  draft: NewGameDraft;
  /** 冒険の状態（全部の場面） */
  full: GameState | null;
  /** 今見ている場面（'world' か、ダンジョンの場面のID） */
  scene: string;
  /** 今見ている場面を載せた冒険（画面の部品はこれを読む） */
  game: GameState | null;
  /** 表示中（または最後）の戦闘。戦闘画面の部品はここを読む */
  battle: BattleState;
  settings: Settings;
  activeId: string;
  selection: Selection | null;
  sheet: Sheet;
  /** 冒険の放棄・リセットの確認 */
  confirmAbandon: boolean;
  /** 「ターン終了」の確認（この端末の担当で、まだ行動できる仲間がいる時だけ出す） */
  confirmEndTurn: boolean;
  setConfirmEndTurn: (v: boolean) => void;
  rollFx: RollFx | null;
  /** 重なりの演出（Step C）: 揺れ・広がる輪を始めた合図。見た目だけ（状態・乱数・同期は変えない） */
  synergyFx: { id: number; tier: 2 | 3 } | null;
  popups: Popup[];
  unitFx: Record<string, UnitFx>;
  callout: Callout | null;
  impactFx: Record<string, ImpactFx>;
  fieldShake: { id: number } | null;
  guardFx: Record<string, { id: number }>;
  retargets: Record<string, number>;
  flash: { cardUid: string; text: string; id: number } | null;
  hint: { text: string; id: number } | null;
  /** 画面下に出す短いお知らせ（エラーなど） */
  toast: { text: string; id: number } | null;

  setScreen: (s: Screen) => void;
  /** 見る場面を切り替える */
  setScene: (scene: string) => void;
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
  preview: () => void;
  cancel: () => void;
  setActive: (id: string) => void;
  /** force = 確認なしで終える（確認の窓の「ターンを終了する」） */
  endTurn: (force?: boolean) => void;
  /** 道具を使う（userId = 袋の持ち主。戦闘中は操作中のキャラ） */
  usePouch: (itemUid: string, targetHeroId: string, userId?: string) => string | undefined;
  setSettings: (s: Partial<Settings>) => void;
  openSheet: (s: Sheet) => void;
  setConfirmAbandon: (v: boolean) => void;
  /** tone: error = 操作が通らなかった（音を変える。K6）、offline = 通信できなかった */
  showToast: (text: string, tone?: 'info' | 'error' | 'offline') => void;
  /** 確認用: 場面の指定まで済んだ操作をそのまま送る（自動プレイの確認スクリプト用） */
  dispatchWire: (cmd: GameCommand) => string | undefined;
  /** オンライン協力: 部屋から届いた操作の結果を反映する */
  applyRemote: (r: GameResult, cmd: GameCommand) => void;
  /** オンライン協力: 状態を丸ごと差し替える（参加・取り直し） */
  loadRemote: (game: GameState) => void;
  /** オンライン協力をやめた: この端末の1人用の冒険（保存）に戻す */
  exitOnline: () => void;
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
    return normalizeSettings(s);
  } catch {
    /* noop */
  }
  return normalizeSettings(null);
}

function writeSave(s: Pick<StoreState, 'full' | 'activeId'>) {
  // オンライン協力の冒険は部屋に保存される（この端末の1人用の保存は上書きしない）
  if (room) return;
  try {
    if (!s.full) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify({ version: GAME_VERSION, content: contentVersion(), game: s.full, activeId: s.activeId } satisfies SaveData));
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

const isSoundOnly = (f: PresentationFrame) => !!f.sounds?.length && !f.roll && !f.motions?.length && !f.popups?.length && !f.notices?.length;
/** コマの音を鳴らす。勝敗のジングルは、他の人の操作でも普通の大きさ（K6） */
function playFrameSounds(f: PresentationFrame) {
  for (const id of new Set(f.sounds ?? [])) playSound(id, { quiet: !!f.quiet && !id.startsWith('jgl_') });
}

/** 他の人の操作か（音を少し小さくする）。敵の行動は誰が送っても普通の大きさ。K6 */
function remoteActor(wire: GameCommand): boolean {
  const cmd = unwrapCommand(wire).command;
  const inner = cmd.type === 'VOTE' ? cmd.command : cmd;
  if (!inner) return false;
  if (inner.type === 'BATTLE') {
    if (inner.command.type === 'ENEMY_STEP') return false;
    return 'playerId' in inner.command && !isLocalPlayer(inner.command.playerId);
  }
  const actor = 'playerId' in inner ? inner.playerId : undefined;
  return !!actor && !isLocalPlayer(actor);
}

export function speedFactor(settings: Pick<Settings, 'fastMode'>): number {
  return settings.fastMode ? TIMING.fastModeFactor : 1;
}

let fxId = 1;
let enemyTimer: ReturnType<typeof setTimeout> | null = null;

/** オンライン協力の部屋（null = 1台で遊ぶ） */
let room: Room | null = null;
export const setStoreRoom = (r: Room | null) => {
  room = r;
};
/** ホストが送った「敵の行動」がまだ戻ってきていない */
let enemyInFlight = false;

/** この端末の担当で、まだ行動できる（使えるカードが残っている）仲間がいるか。オンラインで準備完了した席は数えない */
export function canStillAct(battle: BattleState): boolean {
  if (battle.phase !== 'ally') return false;
  const waiting = battle.readyCheck ? new Set(waitingPlayers(battle)) : undefined;
  return battle.allies.some((a) => isLocalPlayer(a.playerId) && (!waiting || waiting.has(a.playerId)) && !isDone(battle, a));
}

/** 次に操作するキャラ（この端末の担当キャラだけが対象） */
function nextActive(battle: BattleState, current: string): string {
  const mine = battle.allies.filter((a) => isLocalPlayer(a.playerId));
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

/**
 * 見る場面を決める。今の場面が終わっていたら世界マップへ。
 * 世界マップに誰もいない（全員ダンジョン）なら、この端末のキャラがいるダンジョンへ
 */
function pickScene(full: GameState | null, current: string, follow = false): string {
  const exps = full?.expeditions ?? [];
  if (!full || !exps.length) return WORLD_SCENE;
  let s = current !== WORLD_SCENE && !exps.some((x) => x.id === current) ? WORLD_SCENE : current;
  if (s === WORLD_SCENE && full.world) {
    // 手番がダンジョンの組にあり、その組をこの端末で動かすなら、そのダンジョンを見せる
    const turn = full.world.turn;
    const turnExp = exps.find((x) => x.heroes.includes(turn));
    const local = (id: string) => isLocalPlayer(full.heroes.find((h) => h.id === id)?.playerId ?? 'P1');
    if (follow && turnExp && local(turn)) s = turnExp.id;
    else if (!turn && full.mode === 'world') s = (exps.find((x) => x.heroes.some(local)) ?? exps[0]).id;
  }
  return s;
}
const viewIn = (full: GameState | null, scene: string) => (full ? viewOf(full, scene) : null);
/** OS の「動きを減らす」（扉の演出を出さない） */
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const useBattle = create<StoreState>((set, get) => {
  /** 敵フェーズを自動で進める */
  /** 敵フェーズの戦闘がある場面（見ている場面を優先。見ていない場面の戦闘も進める） */
  const enemyScene = (): string | undefined => {
    const { full, scene } = get();
    if (!full) return undefined;
    const scenes = [scene, WORLD_SCENE, ...(full.expeditions ?? []).map((x) => x.id)];
    return scenes.find((s) => {
      const v = viewOf(full, s);
      return v.mode === 'battle' && v.battle?.phase === 'enemy';
    });
  };
  const scheduleEnemy = () => {
    if (enemyTimer) clearTimeout(enemyTimer);
    const { settings } = get();
    if (!enemyScene()) return;
    // オンライン協力: 敵の行動はホストが代表して進める
    if (room && (!room.isHost || enemyInFlight)) return;
    // 前の行動の数字・帯の表示が終わるまで待つ（終わった時に drainFrames からもう一度呼ぶ）。見た目の間だけで、結果は変わらない
    if (get().presentationBusy || presentationTimer) { enemyWaiting = true; return; }
    enemyTimer = setTimeout(
      () => {
        enemyTimer = null;
        const s = enemyScene();
        if (!s) return;
        if (get().presentationBusy || presentationTimer) { enemyWaiting = true; return; }
        if (room) enemyInFlight = true;
        const step: GameCommand = {
          type: 'BATTLE',
          command: { type: 'ENEMY_STEP' },
        };
        send(s === WORLD_SCENE ? step : { type: 'SCENE', scene: s, command: step }, true);
      },
      (TIMING.enemyStep * 1000) / speedFactor(settings),
    );
  };

  let frames: PresentationFrame[] = [];
  let presentationTimer: ReturnType<typeof setTimeout> | null = null;
  /** 敵の行動が、演出の終わりを待っている */
  let enemyWaiting = false;
  /** 最後に帯を出した戦闘・手番（同じ手番で2回出さない） */
  let bannerKey = '';
  const uiTimers = new Set<ReturnType<typeof setTimeout>>();
  let pendingNotices: NoticeDraft[] = [];
  const later = (fn: () => void, seconds: number) => {
    const timer = setTimeout(() => { uiTimers.delete(timer); fn(); }, seconds * 1000 / speedFactor(get().settings));
    uiTimers.add(timer);
  };
  const clearPresentation = () => {
    if (presentationTimer) clearTimeout(presentationTimer);
    presentationTimer = null; frames = []; pendingNotices = [];
    for (const timer of uiTimers) clearTimeout(timer);
    uiTimers.clear();
    set({ presentationBusy: false, phaseBanner: null, cutins: [], petPulses: {}, popups: [], unitFx: {}, rollFx: null, synergyFx: null, callout: null, impactFx: {}, fieldShake: null, guardFx: {} });
    if (enemyWaiting) { enemyWaiting = false; setTimeout(scheduleEnemy, 0); }
  };
  /** 見ている戦闘の手番が変わっていたら、帯を出す手番を返す（出したことにする） */
  const takeBanner = (): { phase: 'ally' | 'enemy'; turn: number } | null => {
    const { game, battle } = get();
    if (game?.mode !== 'battle' || (battle.phase !== 'ally' && battle.phase !== 'enemy')) return null;
    const key = `${battle.seed}:${battle.encounterId}:${battle.phase}:${battle.turn}`;
    if (key === bannerKey) return null;
    bannerKey = key;
    return { phase: battle.phase, turn: battle.turn };
  };
  /** 演出がすべて終わった（帯も出し終えた）。待っていた敵の行動を進める */
  const finishPresentation = () => {
    set({ presentationBusy: false });
    if (enemyWaiting) { enemyWaiting = false; scheduleEnemy(); }
  };
  const addPopup = (p: PopupDraft) => {
    const current = [...get().popups], own = current.filter(x => x.unitId === p.unitId);
    const replaced = own.length >= TIMING.popupRows ? own[0] : undefined;
    const used = new Set(own.map(x => x.lane));
    const lane = replaced?.lane ?? Array.from({ length: TIMING.popupRows }, (_, i) => i).find(i => !used.has(i)) ?? 0;
    const id = fxId++;
    set({ popups: [...current.filter(x => x.id !== replaced?.id), { ...p, lane, id }] });
    later(() => set(s => ({ popups: s.popups.filter(x => x.id !== id) })), TIMING.resultPopup);
  };
  const pumpNotices = () => {
    if (get().worldMoves.length) return;
    while (pendingNotices.length && get().cutins.length < TIMING.cutinVisible) {
      const n = pendingNotices.shift()!, id = fxId++;
      set(s => ({ cutins: [...s.cutins, { ...n, id }], petPulses: { ...s.petPulses, [n.unitId]: { id } } }));
      // お供の能力カットイン: きらりと鳴いて知らせる（K6）
      playSound('sfx_pet_cutin');
      if (n.source?.kind === 'pet' && n.source.id) playSound(petCry(n.source.id));
      later(() => set(s => {
        const pulses = { ...s.petPulses }; if (pulses[n.unitId]?.id === id) delete pulses[n.unitId];
        return { petPulses: pulses };
      }), TIMING.petPulse);
      later(() => { set(s => ({ cutins: s.cutins.filter(x => x.id !== id) })); pumpNotices(); }, TIMING.abilityCutin);
    }
  };
  const showNotices = (notices: NoticeDraft[]) => {
    for (const n of notices) {
      if (n.source?.kind === 'pet') {
        const existing = pendingNotices.find(x => x.unitId === n.unitId && x.name === n.name);
        if (existing) existing.count = (existing.count ?? 1) + (n.count ?? 1);
        else pendingNotices.push(n);
      } else {
        addPopup({ unitId: n.unitId, tone: 'ability', text: `【${n.source?.kind === 'inherited' ? '継承：' : ''}${n.name}】${(n.count ?? 1) > 1 ? `×${n.count}` : ''}` });
      }
    }
    pumpNotices();
  };
  const applyFrame = (frame: PresentationFrame) => {
    if (frame.roll) {
      const e = frame.roll;
      set({ rollFx: { id: fxId++, results: e.results, summary: e.summary, perfect: e.perfect, successes: e.successes, quiet: frame.quiet } });
      if (e.perfect) vibrate(get().settings, VIBRATION.perfect);
    }
    playFrameSounds(frame);
    if (frame.synergy && frame.synergy >= 2) set({ synergyFx: { id: fxId++, tier: frame.synergy as 2 | 3 } });
    if (frame.motions?.length) set(s => ({ unitFx: { ...s.unitFx, ...Object.fromEntries(frame.motions!.map(m => [m.unitId, { kind: m.kind, id: fxId++ }])) } }));
    if (frame.callout) set({ callout: { ...frame.callout, id: fxId++ } });
    if (frame.impacts?.length) set(s => ({ impactFx: { ...s.impactFx, ...Object.fromEntries(frame.impacts!.map(({ unitId, ...rest }) => [unitId, { ...rest, id: fxId++ }])) } }));
    if (frame.guards?.length) set(s => ({ guardFx: { ...s.guardFx, ...Object.fromEntries(frame.guards!.map(id => [id, { id: fxId++ }])) } }));
    if (frame.shake) set({ fieldShake: { id: fxId++ } });
    for (const p of frame.popups ?? []) addPopup(p);
    showNotices(frame.notices ?? []);
  };
  const drainFrames = () => {
    presentationTimer = null;
    const frame = frames.shift();
    if (!frame) {
      // 手番が変わった: 前の数字が消えるのを待ってから帯を出し、帯が消えてから次へ（帯と数字・敵の行動を重ねない）
      const banner = takeBanner();
      if (!banner) { finishPresentation(); return; }
      set({ presentationBusy: true });
      const linger = get().popups.length ? Math.max(0, TIMING.resultPopup - TIMING.actionLead) : 0;
      const k = 1000 / speedFactor(get().settings);
      presentationTimer = setTimeout(() => {
        set({ phaseBanner: { id: fxId++, ...banner } });
        presentationTimer = setTimeout(() => { set({ phaseBanner: null }); drainFrames(); }, TIMING.phaseBanner * k);
      }, linger * k);
      return;
    }
    const wait = frames.length > TIMING.presentationFramesMax ? 0 : frame.delay;
    presentationTimer = setTimeout(() => {
      presentationTimer = null; applyFrame(frame);
      if (frames.length) drainFrames();
      else presentationTimer = setTimeout(drainFrames, TIMING.actionLead * 1000 / speedFactor(get().settings));
    }, wait * 1000 / speedFactor(get().settings));
  };
  /** quiet = 他の人の操作（音を少し小さく） */
  const applyEvents = (events: BattleEvent[], quiet = false) => {
    if (!events.length) return;
    for (const e of events) {
      if (e.type === 'retarget') set(s => ({ retargets: { ...s.retargets, [e.enemyUid]: fxId++ } }));
      if (e.type === 'phase' && e.phase === 'victory') vibrate(get().settings, VIBRATION.victory);
      if (e.type === 'damage' && e.amount > 0 && findAlly(get().battle, e.unitId)) vibrate(get().settings, VIBRATION.hurt);
    }
    const allyIds = new Set(get().battle.allies.map((a) => a.id));
    const next = battleFrames(events, allyIds).map((f) => (quiet ? { ...f, quiet } : f));
    // 音だけのコマ（手番が変わっただけ等）は、待たずにすぐ鳴らす（演出中の扱いにしない）
    if (!frames.length && !presentationTimer && next.length === 1 && isSoundOnly(next[0])) { playFrameSounds(next[0]); settle(); return; }
    frames.push(...next);
    if (frames.length) { set({ presentationBusy: true }); if (!presentationTimer) drainFrames(); }
    else settle();
  };
  /** 演出が止まっている時に手番が変わった（数字の出ない操作）: すぐ帯を出す */
  const settle = () => { if (!frames.length && !presentationTimer) drainFrames(); };

  /** 新しい戦闘に入った時の UI のリセット */
  const resetBattleUi = (b: BattleState): Partial<StoreState> => { clearPresentation(); bannerKey = ''; return ({
    selection: null,
    rollFx: null,
    synergyFx: null,
    popups: [],
    unitFx: {},
    callout: null,
    impactFx: {},
    fieldShake: null,
    guardFx: {},
    retargets: {},
    flash: null,
    hint: null,
    activeId: nextActive(b, b.allies.find((a) => isLocalPlayer(a.playerId))?.id ?? b.allies[0].id),
  }); };

  /** 操作の結果を画面に反映する（この端末の操作・部屋から届いた操作で共通） */
  const commit = (r: GameResult, cmdScene: string, wire: GameCommand) => {
    const before = get().full;
    const full = r.state;
    const prevBattle = get().game?.battle;
    // 前に見ていた場面が世界マップの画面だったか（手番の受け渡しの画面が出ていたか。フェーズ2-C）
    const worldBefore = get().scene === WORLD_SCENE && get().game?.mode === 'world';
    let scene = get().scene;
    // ダンジョンに入った: この端末のキャラが入ったなら、その場面を見る
    const added = (full.expeditions ?? []).find((x) => !before?.expeditions?.some((y) => y.id === x.id));
    if (added && added.heroes.some((id) => isLocalPlayer(full.heroes.find((h) => h.id === id)?.playerId ?? 'P1'))) scene = added.id;
    // 手番が移った: この端末のキャラの番なら、そのキャラのいる場面（世界マップかダンジョン）を見る（M3-D）
    const turn = full.world?.turn;
    if (turn && turn !== before?.world?.turn && isLocalPlayer(full.heroes.find((h) => h.id === turn)?.playerId ?? 'P1')) scene = sceneOfHero(full, turn);
    scene = pickScene(full, scene);
    const next = viewOf(full, scene);
    if (scene !== get().scene) clearPresentation();
    const patch: Partial<StoreState> = { full, scene, game: next };
    let opening: BattleEvent[] = [];
    let startedBattle = false;
    if (next.battle) {
      patch.battle = next.battle;
      if (next.battle !== prevBattle && (!prevBattle || prevBattle.seed !== next.battle.seed || prevBattle.encounterId !== next.battle.encounterId)) {
        Object.assign(patch, resetBattleUi(next.battle));
        opening = next.battle.openingEvents ?? [];
        startedBattle = !!before;
      } else if (next.battle.phase === 'ally') {
        patch.activeId = nextActive(next.battle, get().activeId);
      }
      if (next.battle.phase !== 'ally' && next.battle.phase !== 'enemy') {
        patch.selection = null;
        patch.sheet = null;
      }
      // 選んでいたカードが手札から無くなった（他の人の操作で状況が変わった）
      const sel = get().selection;
      if (sel && !findAlly(next.battle, get().activeId)?.hand.some((c) => c.uid === sel.cardUid)) patch.selection = null;
    }
    // 扉を開けて部屋に入った（見ている場面）: 扉が開く演出が終わるまで、部屋の画面への切り替えを待つ（第3段階B2）
    const was = before ? viewOf(before, cmdScene) : undefined;
    if (was?.mode === 'dungeon' && was.dungeon && next.dungeon && cmdScene === scene && next.mode !== 'dungeon' && next.dungeon.currentRoomId !== was.dungeon.currentRoomId && !reducedMotion()) {
      patch.doorOpen = { id: fxId++, scene, run: was.dungeon, roomId: next.dungeon.currentRoomId };
    }
    // 手番が移った: カットイン（自分のキャラなら大きく、ほかの人のキャラなら小さなお知らせ）
    if (before && turn && turn !== before.world?.turn) {
      const mine = isLocalPlayer(full.heroes.find((h) => h.id === turn)?.playerId ?? 'P1');
      // 1台で、世界マップの画面のまま担当の人が変わる時は、受け渡しの画面（カットインと同じ見た目）だけを出す
      const handoff = handoffReplacesCutin({
        online: isOnlinePlay(),
        worldBefore,
        worldAfter: scene === WORLD_SCENE && next.mode === 'world',
        prevPlayer: before.heroes.find((h) => h.id === before.world?.turn)?.playerId,
        nextPlayer: full.heroes.find((h) => h.id === turn)?.playerId,
        players: new Set(full.heroes.filter((h) => !h.retired && h.hp > 0).map((h) => h.playerId)).size,
      });
      patch.turnCutin = handoff ? null : { id: fxId++, heroId: turn, mine, scene: sceneOfHero(full, turn) };
      if (mine) vibrate(get().settings, VIBRATION.turn);
      playSound(mine ? 'sfx_turn_cutin' : 'sfx_turn_notice');
    }
    const lm = full.world?.lastMove;
    if (before && scene === WORLD_SCENE && cmdScene === WORLD_SCENE && lm && lm.seq !== before.world?.lastMove?.seq && lm.path.length > 1) {
      patch.worldMoves = [...get().worldMoves, { id: fxId++, game: full, before }];
      patch.sheet = null;
    }
    set(patch);
    // 見ている場面の出来事だけ演出する
    if (cmdScene === scene) {
      if (startedBattle) playSound('sfx_battle_start');
      const quiet = remoteActor(wire);
      applyEvents([...opening, ...r.battleEvents], quiet);
      settle();
      if (before) {
        showNotices(explorationNotices(before, full, wire));
        for (const id of explorationSounds(before, full, wire)) playSound(id, { quiet });
      }
    }
    scheduleSave(get);
    scheduleEnemy();
  };

  /** 操作を送る（オンラインなら部屋へ、そうでなければこの端末で動かす）。silent = 失敗してもお知らせを出さない */
  const send = (wire: GameCommand, silent: boolean): string | undefined => {
    const { full } = get();
    if (!full) return '冒険が始まっていません';
    if (get().worldMoves.length && unwrapCommand(wire).scene === WORLD_SCENE) return '移動が終わるまでお待ちください';
    const isEnemyStep = (c: GameCommand): boolean => (c.type === 'SCENE' ? isEnemyStep(c.command) : c.type === 'BATTLE' && c.command.type === 'ENEMY_STEP');
    if (room) {
      const dry = applyGameCommand(full, wire);
      if (dry.error) {
        if (isEnemyStep(wire)) enemyInFlight = false;
        else if (!silent) get().showToast(dry.error, 'error');
        return dry.error;
      }
      room.send(wire).catch(() => {
        if (isEnemyStep(wire)) enemyInFlight = false;
        get().showToast('送れませんでした。通信を確かめてください', 'offline');
      });
      return undefined;
    }
    const r = applyGameCommand(full, wire);
    if (r.error) {
      if (!silent) get().showToast(r.error, 'error');
      return r.error;
    }
    commit(r, unwrapCommand(wire).scene, wire);
    return undefined;
  };

  return {
    screen: 'title',
    draft: defaultDraft(),
    full: saved?.game ?? null,
    scene: pickScene(saved?.game ?? null, WORLD_SCENE, true),
    game: viewIn(saved?.game ?? null, pickScene(saved?.game ?? null, WORLD_SCENE, true)),
    battle: viewIn(saved?.game ?? null, pickScene(saved?.game ?? null, WORLD_SCENE, true))?.battle ?? EMPTY_BATTLE,
    settings: loadSettings(),
    worldMoves: [],
    presentationBusy: false, phaseBanner: null, cutins: [], petPulses: {}, turnCutin: null, doorOpen: null,
    finishWorldMove: id => {
      set(s => ({ worldMoves: s.worldMoves[0]?.id === id ? s.worldMoves.slice(1) : s.worldMoves }));
      if (!get().worldMoves.length) { pumpNotices(); scheduleEnemy(); }
    },
    activeId: saved?.activeId ?? '',
    selection: null,
    sheet: null,
    confirmAbandon: false,
    confirmEndTurn: false,
    rollFx: null,
    synergyFx: null,
    popups: [],
    unitFx: {},
    callout: null,
    impactFx: {},
    fieldShake: null,
    guardFx: {},
    retargets: {},
    flash: null,
    hint: null,
    toast: null,

    setScreen: (screen) => { if (screen !== 'game') clearPresentation(); set({ screen, sheet: null, ...(screen !== 'game' ? { turnCutin: null } : {}) }); },
    dismissTurnCutin: (id) => { if (get().turnCutin?.id === id) set({ turnCutin: null }); },
    finishDoorOpen: (id) => { if (get().doorOpen?.id === id) set({ doorOpen: null }); },
    setScene: (s) => {
      clearPresentation();
      set({ doorOpen: null });
      const { full } = get();
      const scene = pickScene(full, s);
      const game = viewIn(full, scene);
      set({
        worldMoves: [],
        scene,
        game,
        sheet: null,
        selection: null,
        battle: game?.battle ?? get().battle,
        ...(game?.battle ? resetBattleUi(game.battle) : {}),
      });
    },
    setDraft: (d) => set({ draft: { ...get().draft, ...d } }),

    startGame: () => {
      clearPresentation();
      const d = get().draft;
      const game = createGame({
        seed: makeSeed(),
        scenarioId: d.scenarioId,
        difficulty: d.difficulty,
        party: d.party.map((m) => ({ ...m, playerId: m.playerId ?? LOCAL_PLAYER })),
      });
      set({ worldMoves: [], full: game, scene: WORLD_SCENE, game, screen: 'game', battle: EMPTY_BATTLE, sheet: null, selection: null });
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

    exitOnline: () => {
      clearPresentation();
      if (enemyTimer) clearTimeout(enemyTimer);
      enemyTimer = null;
      enemyInFlight = false;
      const local = loadSave();
      const scene = pickScene(local?.game ?? null, WORLD_SCENE, true);
      const game = viewIn(local?.game ?? null, scene);
      set({ worldMoves: [], full: local?.game ?? null, scene, game, activeId: local?.activeId ?? '', screen: 'title', confirmAbandon: false, sheet: null, battle: game?.battle ?? EMPTY_BATTLE, selection: null });
    },

    abandonGame: () => {
      clearPresentation();
      if (enemyTimer) clearTimeout(enemyTimer);
      enemyTimer = null;
      set({ worldMoves: [], activeId: '', draft: defaultDraft(), full: null, scene: WORLD_SCENE, game: null, screen: 'title', confirmAbandon: false, sheet: null, battle: EMPTY_BATTLE, selection: null });
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      enemyInFlight = false;
      writeSave({ full: null, activeId: '' });
    },

    dispatchGame: (cmd) => {
      const { game, scene } = get();
      if (!game) return '冒険が始まっていません';
      // ローカル協力: そのキャラの担当プレイヤーとして送る
      if ('playerId' in cmd) cmd = { ...cmd, playerId: actorOf(game, cmd) } as GameCommand;
      if (cmd.type === 'BATTLE' && 'playerId' in cmd.command) cmd = { ...cmd, command: { ...cmd.command, playerId: battleActorOf(game, cmd.command) } as Command };
      const wrap = (c: GameCommand): GameCommand => (scene !== WORLD_SCENE && c.type !== 'SCENE' ? { type: 'SCENE', scene, command: c } : c);
      // みんなで決める操作: この端末のプレイヤーの票として入れる（1台で全員を操作しているなら、全員分まとめて入れるのですぐ決まる）
      if (needsVote(game, cmd)) {
        const mine = voters(game).filter((p) => isLocalPlayer(p));
        if (!mine.length) {
          get().showToast('この場面のプレイヤーではありません', 'error');
          return 'この場面のプレイヤーではありません';
        }
        for (const p of mine) {
          const err = send(wrap({ type: 'VOTE', playerId: p, command: { ...cmd, playerId: p } as GameCommand }), false);
          if (err) return err;
        }
        return undefined;
      }
      // オンライン協力: 自分の担当か・通るかを先に確かめてから、部屋に送る（結果は部屋から届く）
      if (room) {
        const actor = 'playerId' in cmd ? cmd.playerId : cmd.type === 'BATTLE' && 'playerId' in cmd.command ? cmd.command.playerId : undefined;
        if (actor && !isLocalPlayer(actor)) {
          const msg = `${actor}${room.seatName(actor) ? `（${room.seatName(actor)}）` : ''}の担当です`;
          if (cmd.type !== 'BATTLE' || cmd.command.type !== 'ENEMY_STEP') get().showToast(msg, 'error');
          return msg;
        }
      }
      // 見ている場面がダンジョンなら、その場面の中の操作として送る
      return send(wrap(cmd), false);
    },

    dispatchWire: (cmd) => send(cmd, false),

    applyRemote: (r, cmd) => {
      enemyInFlight = false;
      commit(r, unwrapCommand(cmd).scene, cmd);
    },

    loadRemote: (full) => {
      clearPresentation();
      enemyInFlight = false;
      if (enemyTimer) clearTimeout(enemyTimer);
      enemyTimer = null;
      // 自分のキャラが全員ダンジョンの中なら、その場面を見る
      const mine = full.heroes.filter((h) => isLocalPlayer(h.playerId) && h.hp > 0 && !h.retired);
      const exp = full.expeditions?.find((x) => mine.length && mine.every((h) => x.heroes.includes(h.id)));
      const scene = pickScene(full, exp?.id ?? get().scene, true);
      const game = viewOf(full, scene);
      set({ worldMoves: [], turnCutin: null, doorOpen: null, full, scene, game, screen: 'game', sheet: null, battle: game.battle ?? EMPTY_BATTLE, ...(game.battle ? resetBattleUi(game.battle) : { selection: null }) });
      scheduleEnemy();
    },

    dispatch: (cmd) => {
      const { game } = get();
      if (!game || game.mode !== 'battle') return '戦闘中ではありません';
      if ('playerId' in cmd) cmd = { ...cmd, playerId: battleActorOf(game, cmd) } as Command;
      if (room && 'playerId' in cmd && !isLocalPlayer(cmd.playerId)) return `${cmd.playerId}の担当です`;
      const { scene } = get();
      const inner: GameCommand = { type: 'BATTLE', command: cmd };
      return send(scene !== WORLD_SCENE ? { type: 'SCENE', scene, command: inner } : inner, true);
    },

    tapCard: (cardUid) => {
      const { battle, activeId, selection } = get();
      const ally = findAlly(battle, activeId);
      if (!ally || !isLocalPlayer(ally.playerId)) return;
      const inst = ally.hand.find((c) => c.uid === cardUid);
      if (!inst) return;
      if (selection?.cardUid === cardUid) {
        get().cancel();
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
      // 回復・支援の最初の相手: HPが減っている味方（割合が一番低い）→ 全員満タンなら、敵の予告のダメージの合計が一番大きい味方
      if (isAllyCard(card)) targetId = pickAllyTarget(battle, cardTargets(battle, ally, card)) ?? targetId;
      const allyTargetId = card.secondaryTarget ? pickAllyTarget(battle, cardTargets(battle, ally, secondaryCard(card))) : undefined;
      set({ selection: { cardUid, targetId, allyTargetId, focus: 0 }, flash: null });
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
      // 狙っている敵を仲間に見せる（M3-C5。戦闘の結果は変わらない）
      if (ally && battle.aims?.[ally.id] !== uid) get().dispatch({ type: 'AIM', playerId: LOCAL_PLAYER, characterId: ally.id, targetId: uid });
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
      if (needsCardTarget(card) && (!ally || !selectedCardTarget(battle, ally, card, selection.targetId))) {
        set({ flash: { cardUid: selection.cardUid, text: targetGuide(card), id: fxId++ } });
        return;
      }
      const err = get().dispatch({
        type: 'PLAY_CARD',
        playerId: LOCAL_PLAYER,
        characterId: activeId,
        cardInstanceId: selection.cardUid,
        targetId: needsCardTarget(card) ? selection.targetId : undefined,
        allyTargetId: selection.allyTargetId,
        focusUsed: selection.focus,
      });
      if (err) set({ flash: { cardUid: selection.cardUid, text: err, id: fxId++ } });
      else set({ selection: null });
    },

    preview: () => {
      const { selection, activeId, battle } = get();
      if (!selection || battle.slotPreview) return;
      const ally = findAlly(battle, activeId), inst = ally?.hand.find(c => c.uid === selection.cardUid);
      if (!ally || !inst) return;
      const err = get().dispatch({ type: 'PREVIEW_CARD', playerId: LOCAL_PLAYER, characterId: activeId, cardInstanceId: selection.cardUid, targetId: selection.targetId, allyTargetId: selection.allyTargetId, focusUsed: selection.focus });
      if (err) set({ flash: { cardUid: selection.cardUid, text: err, id: fxId++ } });
      else set({ selection: null });
    },

    cancel: () => {
      if (get().selection) set({ selection: null });
    },

    setActive: (id) => {
      const { selection, battle, activeId } = get();
      const source = findAlly(battle, activeId);
      const inst = source?.hand.find(c => c.uid === selection?.cardUid);
      if (selection && source && inst && (isAllyCard(cardOf(inst)) || cardOf(inst).secondaryTarget)) {
        const card = cardOf(inst);
        if (card.secondaryTarget && secondaryCardTarget(battle, source, card, id)) set({ selection: { ...selection, allyTargetId: id } });
        else if (!card.secondaryTarget && selectedCardTarget(battle, source, card, id)) set({ selection: { ...selection, targetId: id } });
        else get().showToast(targetGuide(card.secondaryTarget ? secondaryCard(card) : card));
        return;
      }
      const ally = findAlly(get().battle, id);
      if (!ally || ally.dead || !isLocalPlayer(ally.playerId)) return;
      if (get().activeId === id && !get().selection) return;
      set({ activeId: id, selection: null });
      scheduleSave(get);
    },

    endTurn: (force = false) => {
      const { battle } = get();
      set({ confirmEndTurn: false });
      if (battle.phase !== 'ally') return;
      // この端末の担当のキャラだけで判断する（1台で全員を動かす時も、オンラインで自分の分だけの時も同じ）。
      // 使えるカード（マナが足りる）が残っている仲間がいれば、押し間違いを防ぐために確認する
      const canAct = canStillAct(battle);
      if (canAct && !force) { set({ selection: null, confirmEndTurn: true }); return; }
      set({ selection: null, hint: null });
      // オンライン協力: この端末の担当のうち、まだ準備完了していない席の分を押す
      if (room) {
        for (const p of waitingPlayers(battle).filter((x) => isLocalPlayer(x))) get().dispatch({ type: 'END_TURN', playerId: p });
        return;
      }
      get().dispatch({ type: 'END_TURN', playerId: LOCAL_PLAYER });
    },

    usePouch: (itemUid, targetHeroId, userId) => {
      const { game, activeId } = get();
      if (!game) return;
      const user = game.mode === 'battle' ? activeId : (userId ?? game.heroes.find((h) => h.pouch.some((p) => p.uid === itemUid))?.id ?? targetHeroId);
      const err = get().dispatchGame({ type: 'USE_POUCH_ITEM', playerId: LOCAL_PLAYER, itemUid, userId: user, targetId: targetHeroId });
      if (!err) { set({ sheet: null }); get().showToast('道具を使いました'); }
      return err;
    },

    setSettings: (s) => {
      const settings = normalizeSettings({ ...get().settings, ...s });
      set({ settings });
      setAudioVolumes(settings);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        /* noop */
      }
    },

    openSheet: (sheet) => set({ sheet, selection: sheet ? null : get().selection }),
    setConfirmAbandon: (v) => set({ confirmAbandon: v }),
    setConfirmEndTurn: (v) => set({ confirmEndTurn: v }),
    showToast: (text, tone = 'info') => {
      playSound(tone === 'error' ? 'sfx_ui_deny' : tone === 'offline' ? 'sfx_ui_error' : 'sfx_ui_notice');
      set({ toast: { text, id: fxId++ } });
    },

    closeTop: () => {
      const s = get();
      if (s.confirmAbandon) return set({ confirmAbandon: false }), true;
      if (s.confirmEndTurn) return set({ confirmEndTurn: false }), true;
      if (s.sheet === 'log') return set({ sheet: 'menu' }), true;
      if (s.sheet) return set({ sheet: null }), true;
      if (s.selection) return set({ selection: null }), true;
      if (s.screen === 'create') return set({ screen: room ? 'lobby' : 'setup' }), true;
      if (s.screen === 'setup' || s.screen === 'join') return set({ screen: 'title' }), true;
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

// 保存してある音量を、音の部品に伝える（K6）
setAudioVolumes(useBattle.getState().settings);
