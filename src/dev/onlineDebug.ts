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
};

declare global {
  interface Window {
    __online?: typeof api;
  }
}
window.__online = api;
