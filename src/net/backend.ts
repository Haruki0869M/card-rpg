// ===== 通信の部品（オンライン協力の中継。spec §7.2） =====
// Firebase Realtime Database と同じ形の、小さな読み書きの窓口。
// 本番は firebaseBackend.ts、テストは memoryBackend.ts（同じプロセスの中で複数の端末をまねる）。
// パスは 'rooms/KX7P/meta' のような「/」区切りの文字列。

export type Unsubscribe = () => void;

export interface Backend {
  /** この端末のID（匿名ログインのID） */
  readonly uid: string;
  get<T>(path: string): Promise<T | null>;
  set(path: string, value: unknown): Promise<void>;
  /** 複数のパスをまとめて書く（全部書けるか、全部書けないか）。null は消す */
  update(values: Record<string, unknown>): Promise<void>;
  remove(path: string): Promise<void>;
  /** 読んで書く（他の端末と同時でも安全）。undefined を返すとやめる */
  transaction<T>(path: string, fn: (cur: T | null) => T | null | undefined): Promise<{ committed: boolean; value: T | null }>;
  /** 値が変わるたびに呼ぶ（最初の1回は今の値） */
  onValue<T>(path: string, cb: (v: T | null) => void): Unsubscribe;
  /** 子が増えるたびに呼ぶ（キーの順。after より後のキーだけ） */
  onChildAdded<T>(path: string, cb: (key: string, v: T) => void, after?: string): Unsubscribe;
  /** 子が消えた時 */
  onChildRemoved(path: string, cb: (key: string) => void): Unsubscribe;
  /** 通信が切れたら、この値を書いてもらう（サーバーが代わりに書く） */
  onDisconnectSet(path: string, value: unknown): Promise<void>;
  /** 子のうち、値（数値）が max 以下のもののキー（古い部屋の掃除用） */
  keysAtMost(path: string, max: number, limit: number): Promise<string[]>;
  /** 新しい子のキー（時刻順に並ぶ） */
  newKey(): string;
  /** 今の時刻（サーバーとのずれを直したもの） */
  now(): number;
  /** 接続しているか */
  onConnected(cb: (connected: boolean) => void): Unsubscribe;
  /** 切断する（テスト・部屋を出る時） */
  goOffline(): void;
  goOnline(): void;
}

/** パスをつなぐ */
export const join = (...parts: (string | number)[]) => parts.map(String).filter(Boolean).join('/');

let lastKeyTime = 0;
let keyCounter = 0;
/** 時刻順に並ぶキー（同じミリ秒でも順番が保たれる） */
export function timeKey(now = Date.now()): string {
  if (now === lastKeyTime) keyCounter++;
  else {
    lastKeyTime = now;
    keyCounter = 0;
  }
  return `${now.toString(36).padStart(9, '0')}${keyCounter.toString(36).padStart(3, '0')}${Math.random().toString(36).slice(2, 6)}`;
}
