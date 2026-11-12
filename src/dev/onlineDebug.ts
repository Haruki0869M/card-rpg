// ===== オンライン協力の確認用（エミュレーターにつないだ時だけ読み込む: URL に ?emu=1） =====
// Playwright から window.__online を使って、自動プレイの操作を画面と同じ道（ストア）で送る。
import { botNextCommand } from '../engine/bot';
import { stateHash } from '../engine';
import { useBattle } from '../store/battleStore';
import { useOnline } from '../store/onlineStore';
import type { GameCommand } from '../types';

const memo = { interacted: new Set<string>() };

const api = {
  /** 今の状態の要約（全員で比べる） */
  hash: () => {
    const r = useOnline.getState().room;
    return r?.game ? `${r.seq}:${stateHash(r.game)}` : null;
  },
  seq: () => useOnline.getState().room?.seq ?? -1,
  isHost: () => !!useOnline.getState().room?.isHost,
  seat: () => useOnline.getState().room?.seat,
  myPlayers: () => useOnline.getState().room?.myPlayers() ?? [],
  mode: () => useBattle.getState().game?.mode,
  /** 自動プレイの次の操作（送らない） */
  next: (): GameCommand | null => {
    const g = useOnline.getState().room?.game;
    return g ? botNextCommand(g, memo) : null;
  },
  /** 画面と同じ道で操作を送る */
  send: (cmd: GameCommand) => useBattle.getState().dispatchWire(cmd) ?? null,
  setProxy: (p: 'P1' | 'P2' | 'P3' | 'P4', on: boolean) => useOnline.getState().setProxy(p, on),
  goOffline: () => useOnline.getState().room?.backend.goOffline(),
  goOnline: () => useOnline.getState().room?.backend.goOnline(),
  stamp: (k: string) => useOnline.getState().sendStamp(k),
  /** 部屋の今の状態（写し） */
  game: () => structuredClone(useOnline.getState().room?.game ?? null),
  /** 確認用: ホストが状態を差し込む（部屋の snapshot を書き換えて、自分も取り直す）。ほかの端末は resync() で取り直す */
  inject: async (game: unknown) => {
    const r = useOnline.getState().room;
    if (!r?.isHost) return 'ホストではありません';
    const g = game as Parameters<typeof stateHash>[0];
    const s = { seq: r.seq, game: JSON.stringify(g), hash: stateHash(g) };
    await r.backend.set(`rooms/${r.code}/snapshot`, s);
    (r as unknown as { adopt: (s: unknown, why: string) => void }).adopt(s, 'error');
    return null;
  },
  resync: () => useOnline.getState().room?.resync('error'),
  /** 画面の今の様子（確認用。回3） */
  ui: () => {
    const s = useBattle.getState();
    return { screen: s.screen, scene: s.scene, sheet: s.sheet, activeId: s.activeId, mode: s.game?.mode, toast: s.toast?.text ?? null };
  },
  /** 確認用: 下から出る画面（道具袋など）を開く（回3） */
  openSheet: (name: string) => useBattle.getState().openSheet(name as Parameters<ReturnType<typeof useBattle.getState>['openSheet']>[0]),
  /** 確認用: この端末が持っている冒険の状態（1台で遊ぶ時も。回3） */
  full: () => structuredClone(useBattle.getState().full ?? null),
  /** 部屋のピン（確認用） */
  pins: () => structuredClone(useOnline.getState().room?.pins ?? {}),
};

declare global {
  interface Window {
    __online?: typeof api;
  }
}
window.__online = api;
