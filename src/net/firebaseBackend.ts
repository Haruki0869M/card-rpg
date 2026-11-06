// ===== Firebase の通信（本番。匿名ログイン + Realtime Database） =====
// 設定値は firebaseConfig.ts。URL に ?emu=1 を付けると、手元のエミュレーター（開発・テスト用）につなぐ。
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  child,
  connectDatabaseEmulator,
  type Database,
  endAt,
  get,
  getDatabase,
  goOffline,
  goOnline,
  onChildAdded,
  onChildRemoved,
  onDisconnect,
  onValue,
  limitToFirst,
  orderByKey,
  orderByValue,
  push,
  query,
  ref,
  remove,
  runTransaction,
  set,
  startAfter,
  update,
} from 'firebase/database';
import type { Backend, Unsubscribe } from './backend';
import { FIREBASE_CONFIG, hasFirebaseConfig } from './firebaseConfig';

export interface FirebaseOptions {
  /** エミュレーターのホスト（例 '127.0.0.1'）。省略で本番 */
  emulatorHost?: string;
  /** 1つのページで複数の端末をまねる時の名前（テスト用） */
  appName?: string;
}

/** URL の ?emu=1（または ?emu=ホスト名）でエミュレーターを使う */
export function emulatorFromUrl(): string | undefined {
  if (typeof location === 'undefined') return undefined;
  const v = new URLSearchParams(location.search).get('emu');
  if (v === null) return undefined;
  return v === '' || v === '1' ? location.hostname || '127.0.0.1' : v;
}

export const onlineAvailable = () => hasFirebaseConfig() || !!emulatorFromUrl();

class FirebaseBackend implements Backend {
  private offset = 0;
  constructor(
    readonly uid: string,
    private db: Database,
  ) {
    onValue(ref(db, '.info/serverTimeOffset'), (s) => (this.offset = Number(s.val()) || 0));
  }
  private r(path: string) {
    return ref(this.db, path);
  }
  async get<T>(path: string) {
    return (await get(this.r(path))).val() as T | null;
  }
  set(path: string, value: unknown) {
    return set(this.r(path), value ?? null);
  }
  update(values: Record<string, unknown>) {
    return update(ref(this.db), values);
  }
  remove(path: string) {
    return remove(this.r(path));
  }
  async transaction<T>(path: string, fn: (cur: T | null) => T | null | undefined) {
    const r = await runTransaction(this.r(path), (cur) => fn(cur as T | null));
    return { committed: r.committed, value: r.snapshot.val() as T | null };
  }
  onValue<T>(path: string, cb: (v: T | null) => void): Unsubscribe {
    return onValue(
      this.r(path),
      (s) => cb(s.val() as T | null),
      (e) => console.warn(`[firebase] ${path}: ${e.message}`),
    );
  }
  onChildAdded<T>(path: string, cb: (key: string, v: T) => void, after?: string): Unsubscribe {
    const q = after === undefined ? query(this.r(path), orderByKey()) : query(this.r(path), orderByKey(), startAfter(after));
    return onChildAdded(
      q,
      (s) => cb(s.key!, s.val() as T),
      (e) => console.warn(`[firebase] ${path}: ${e.message}`),
    );
  }
  onChildRemoved(path: string, cb: (key: string) => void): Unsubscribe {
    return onChildRemoved(this.r(path), (s) => cb(s.key!));
  }
  async keysAtMost(path: string, max: number, limit: number) {
    const s = await get(query(this.r(path), orderByValue(), endAt(max), limitToFirst(limit)));
    const out: string[] = [];
    s.forEach((c) => {
      out.push(c.key!);
    });
    return out;
  }
  onDisconnectSet(path: string, value: unknown) {
    return onDisconnect(this.r(path)).set(value);
  }
  newKey() {
    return push(child(ref(this.db), 'k')).key!;
  }
  now() {
    return Date.now() + this.offset;
  }
  onConnected(cb: (c: boolean) => void): Unsubscribe {
    return onValue(ref(this.db, '.info/connected'), (s) => cb(!!s.val()));
  }
  goOffline() {
    goOffline(this.db);
  }
  goOnline() {
    goOnline(this.db);
  }
}

const apps = new Map<string, Promise<Backend>>();

/** Firebase につないで匿名ログインする（同じ名前なら1回だけ） */
export function connectFirebase(opts: FirebaseOptions = {}): Promise<Backend> {
  const name = opts.appName ?? '[DEFAULT]';
  let p = apps.get(name);
  if (!p) {
    p = (async () => {
      const emu = opts.emulatorHost;
      const config = emu ? { apiKey: 'emulator', projectId: 'demo-card-rpg', databaseURL: `http://${emu}:9000?ns=demo-card-rpg-default-rtdb` } : FIREBASE_CONFIG;
      const app: FirebaseApp = initializeApp(config, name);
      const auth = getAuth(app);
      const db = getDatabase(app);
      if (emu) {
        connectAuthEmulator(auth, `http://${emu}:9099`, { disableWarnings: true });
        connectDatabaseEmulator(db, emu, 9000);
      }
      const cred = await signInAnonymously(auth);
      return new FirebaseBackend(cred.user.uid, db);
    })();
    apps.set(name, p);
    p.catch(() => apps.delete(name));
  }
  return p;
}
