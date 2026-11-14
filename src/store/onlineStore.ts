// ===== オンライン協力の画面用の状態（部屋とつなぐ。spec §7.2） =====
// 部屋（src/net/room.ts）の知らせを受けて、冒険の状態（battleStore）に反映する。
import { create } from 'zustand';
import type { Backend } from '../net/backend';
import { emulatorFromUrl, onlineAvailable } from '../net/onlineEnv';
import { type Member, normalizeCode, Room, RoomError, type Slot, type Stamp, STALE_MS } from '../net/room';
import type { PlayerId } from '../types';
import { setLocalPlayers } from './battleConfig';
import { setStoreRoom, useBattle } from './battleStore';

const ONLINE_KEY = 'card-rpg/online';
/**
 * 止まった（切れた）人の分を、ホストが「代わりに操作する」を押せるようになる時刻（ホストの引き継ぎの直し 2026-11-14）。
 * 前は「気づいてから60秒」で、ホストが眠ると引き継ぎの35秒と合わせて約95秒待った。
 * 今は「最後に動いていた時から STALE_MS（35秒。止まったとみなす時）」。止まったとみなした時には、もうほぼ押せる。
 * - 気づいてから最低 PROXY_GRACE_MS は待つ（戻ってくる瞬間にボタンが出たり消えたりしないため）【提案 5秒】
 * - 「もう少し待つ」を押したら、PROXY_HOLD_MS 後にまた出す【提案 30秒】
 * 時刻はどれも部屋の時計（backend.now()。サーバーとのずれを直した物）
 */
export const PROXY_GRACE_MS = 5_000;
export const PROXY_HOLD_MS = 30_000;
export function proxyReadyAt(m: Pick<Member, 'beat'> | undefined, noticedAt: number, holdUntil = 0): number {
  return Math.max(noticedAt + PROXY_GRACE_MS, (m?.beat ?? noticedAt) + STALE_MS, holdUntil);
}
/** あと何秒で「代わりに操作する」を押せるか（0 = 今押せる） */
export const proxyWaitLeft = (now: number, readyAt: number) => Math.max(0, Math.ceil((readyAt - now) / 1000));

export interface StampFx {
  id: number;
  seat: PlayerId;
  name: string;
  kind: string;
}

interface OnlineState {
  room: Room | null;
  busy: boolean;
  error: string | null;
  /** 部屋の中身が変わるたびに増える（画面の書き直し用） */
  tick: number;
  stamp: StampFx | null;
  /** 最後に入っていた部屋（タイトルの「部屋に戻る」） */
  lastCode: string | null;
  playerName: string;
  /** 席ごとの、切断（止まった事）に気づいた時刻（部屋の時計） */
  offlineSince: Partial<Record<PlayerId, number>>;
  /** 席ごとの、「もう少し待つ」を押して待つ終わりの時刻（部屋の時計） */
  proxyHold: Partial<Record<PlayerId, number>>;
  /** 待合室で作っているキャラの枠 */
  editingSlot: number | null;
  /** 回3 C: ホストが切れて、ほかの人が引き継いだ知らせ（しばらく出す） */
  hostNote: { id: number; oldName: string; newName: string; mine: boolean } | null;

  available: () => boolean;
  setPlayerName: (n: string) => void;
  createRoom: (opts: { scenarioId: string; difficulty: string; partySize: number }) => Promise<boolean>;
  joinRoom: (code: string) => Promise<boolean>;
  /** 「前の部屋に戻る」を出さなくする（部屋がもう無い時） */
  forgetLastRoom: () => void;
  leaveRoom: () => Promise<void>;
  claimSlot: (index: number, hero: Omit<Slot, 'ownerUid'>) => Promise<void>;
  releaseSlot: (index: number) => Promise<void>;
  updateSettings: (s: { scenarioId?: string; difficulty?: string; partySize?: number }) => Promise<void>;
  start: () => Promise<void>;
  sendStamp: (kind: string) => void;
  setProxy: (p: PlayerId, on: boolean) => void;
  /** 「もう少し待つ」 */
  holdProxy: (p: PlayerId) => void;
}

function loadLast(): { code: string | null; name: string } {
  try {
    const d = JSON.parse(localStorage.getItem(ONLINE_KEY) ?? 'null');
    return { code: d?.code ?? null, name: d?.name ?? '' };
  } catch {
    return { code: null, name: '' };
  }
}
function saveLast(code: string | null, name: string) {
  try {
    localStorage.setItem(ONLINE_KEY, JSON.stringify({ code, name }));
  } catch {
    /* noop */
  }
}

let backendPromise: Promise<Backend> | null = null;
/**
 * Firebase につなぐ（URL の ?emu=1 でエミュレーター。?as=名前 で同じブラウザの別の端末としてつなぐ: テスト用）。
 * Firebase の部品は大きいので、ここで初めて読み込む（1人で遊ぶ時は読まない。つなぐのはもともと待つ作りなので、流れは同じ）
 */
function backend(): Promise<Backend> {
  if (!backendPromise) {
    const as = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('as') : null;
    backendPromise = import('../net/firebaseBackend').then((m) => m.connectFirebase({ emulatorHost: emulatorFromUrl(), appName: as ?? undefined }));
    backendPromise.catch(() => (backendPromise = null));
  }
  return backendPromise;
}

/**
 * 版の違う2台の見分け（点検 F2・案A）。ずれ（hash）か通らない操作（error）で取り直した時に、
 * 前と同じ番号へ取り直すのが2回続いたら true（相手と同じ操作を自分のエンジンで動かせない = ゲームの版が違う）。
 * 1回目の知らせの後は、番号が進むまで出さない（何度も出さない）
 */
export const VERSION_MISMATCH_TEXT = 'ゲームの版が相手と違います。2台ともページを読み込み直してください';
export interface ResyncLoop {
  seq: number;
  count: number;
  shown: boolean;
}
export function noteResync(st: ResyncLoop, seq: number, reason: string): boolean {
  if (reason !== 'error' && reason !== 'hash') {
    st.seq = seq;
    st.count = 0;
    st.shown = false;
    return false;
  }
  if (seq === st.seq) st.count++;
  else Object.assign(st, { seq, count: 1, shown: false });
  if (st.count >= 2 && !st.shown) {
    st.shown = true;
    return true;
  }
  return false;
}
const resyncLoop: ResyncLoop = { seq: -1, count: 0, shown: false };

const last = loadLast();
let stampId = 1;

export const useOnline = create<OnlineState>((set, get) => {
  const bump = () => set((s) => ({ tick: s.tick + 1 }));

  /** 部屋の知らせを受け取り始める */
  const attach = (room: Room) => {
    setStoreRoom(room);
    setLocalPlayers(room.myPlayers());
    set({ room, lastCode: room.code, error: null });
    saveLast(room.code, get().playerName);
    room.on((e) => {
      switch (e.type) {
        case 'command':
          useBattle.getState().applyRemote(e.result, e.cmd);
          break;
        case 'resync':
          if (room.game) useBattle.getState().loadRemote(room.game);
          // 版の違う2台（点検 F2）: ずれの直しが同じ所で続いたら、読み込み直しを頼む（遊びかけの部屋は捨てない）
          if (noteResync(resyncLoop, e.seq, e.reason)) useBattle.getState().showToast(VERSION_MISMATCH_TEXT, 'error');
          break;
        case 'stamp':
          set({ stamp: { id: stampId++, seat: e.stamp.seat, name: room.seatName(e.stamp.seat) ?? e.stamp.seat, kind: e.stamp.kind } });
          break;
        case 'rejected':
          useBattle.getState().showToast(e.text);
          break;
        case 'host': {
          // 回3 C: ホストが代わった。前のホストが切れた（止まった）時は、残った人に知らせる
          const old = room.prevHostUid ? room.members[room.prevHostUid] : undefined;
          const now = room.members[e.hostUid];
          if (old && now && !room.alive(old)) set({ hostNote: { id: stampId++, oldName: old.name, newName: now.name, mine: e.hostUid === room.uid } });
          if (room.isHost) useBattle.getState().onBecameHost();
          break;
        }
        case 'members': {
          // 切断に気づいた時刻を覚える（proxyReadyAt の時刻から、ホストが代わりに操作できる）。止まっている人（スマホが眠った）も切断と同じに数える
          const off: Partial<Record<PlayerId, number>> = {};
          const hold: Partial<Record<PlayerId, number>> = {};
          for (const m of Object.values(room.members))
            if (!room.alive(m)) {
              off[m.seat] = get().offlineSince[m.seat] ?? room.backend.now();
              if (get().proxyHold[m.seat] !== undefined) hold[m.seat] = get().proxyHold[m.seat];
            }
          set({ offlineSince: off, proxyHold: hold });
          // 戻ってきた人の分の「代わりに操作」は自動でやめる
          if (room.isHost) for (const p of Object.keys(room.meta?.proxy ?? {}) as PlayerId[]) if (room.seatOnline(p)) void room.setProxy(p, false).catch(() => {});
          break;
        }
      }
      setLocalPlayers(room.myPlayers());
      bump();
    });
    if (room.game) useBattle.getState().loadRemote(room.game);
  };

  const run = async (fn: () => Promise<void>): Promise<boolean> => {
    set({ busy: true, error: null });
    try {
      await fn();
      return true;
    } catch (e) {
      set({ error: e instanceof RoomError ? e.message : `つながりませんでした（${e instanceof Error ? e.message : String(e)}）` });
      return false;
    } finally {
      set({ busy: false });
    }
  };

  const withRoom = async (fn: (r: Room) => Promise<void>) => {
    const r = get().room;
    if (!r) return;
    try {
      await fn(r);
    } catch (e) {
      useBattle.getState().showToast(e instanceof Error ? e.message : String(e));
    }
  };

  return {
    room: null,
    busy: false,
    error: null,
    tick: 0,
    stamp: null,
    lastCode: last.code,
    playerName: last.name,
    offlineSince: {},
    proxyHold: {},
    editingSlot: null,
    hostNote: null,

    available: onlineAvailable,
    setPlayerName: (n) => {
      set({ playerName: n });
      saveLast(get().lastCode, n);
    },
    createRoom: (opts) =>
      run(async () => {
        const b = await backend();
        attach(await Room.create(b, { name: get().playerName || 'プレイヤー', ...opts }));
      }),
    joinRoom: (code) =>
      run(async () => {
        const b = await backend();
        attach(await Room.join(b, normalizeCode(code), get().playerName || 'プレイヤー'));
      }),
    forgetLastRoom: () => {
      set({ lastCode: null });
      saveLast(null, get().playerName);
    },
    leaveRoom: async () => {
      const r = get().room;
      set({ room: null, offlineSince: {}, proxyHold: {}, editingSlot: null, hostNote: null });
      setStoreRoom(null);
      setLocalPlayers(null);
      useBattle.getState().exitOnline();
      if (r) await r.leave().catch(() => {});
    },
    claimSlot: (i, hero) => withRoom((r) => r.claimSlot(i, hero)),
    releaseSlot: (i) => withRoom((r) => r.releaseSlot(i)),
    updateSettings: (s) => withRoom((r) => r.updateSettings(s)),
    start: () => withRoom((r) => r.start()),
    sendStamp: (kind) => void withRoom((r) => r.sendStamp(kind)),
    setProxy: (p, on) => void withRoom((r) => r.setProxy(p, on)),
    holdProxy: (p) => {
      const r = get().room;
      if (r) set({ proxyHold: { ...get().proxyHold, [p]: r.backend.now() + PROXY_HOLD_MS } });
    },
  };
});

export type { Stamp };
