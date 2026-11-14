// ===== テスト用の通信（同じプロセスの中で、複数の端末とサーバーをまねる） =====
// Firebase と同じく: 値は JSON で保存（undefined は消える・空のものは無くなる）、通知は少し遅れて届く、
// 切断中は読み書きできず通知も届かない、切断するとサーバーが onDisconnect の値を書く。
import { type Backend, timeKey, type Unsubscribe } from './backend';

type Tree = Record<string, unknown>;
interface Listener {
  client: MemoryClient;
  kind: 'value' | 'added' | 'removed';
  path: string;
  cb: (...a: never[]) => void;
  last?: string;
  seen?: Set<string>;
  after?: string;
}

const split = (path: string) => path.split('/').filter(Boolean);
const clone = <T>(v: T): T => (v === undefined ? (null as T) : JSON.parse(JSON.stringify(v)));

export class MemoryHub {
  root: Tree = {};
  listeners: Listener[] = [];
  private pending = false;
  /** テストで時刻を進める */
  clock = () => Date.now();

  read(path: string): unknown {
    let cur: unknown = this.root;
    for (const p of split(path)) {
      if (!cur || typeof cur !== 'object') return null;
      cur = (cur as Tree)[p];
    }
    return cur === undefined ? null : cur;
  }

  write(path: string, value: unknown) {
    const parts = split(path);
    const v = value === null || value === undefined ? null : clone(value);
    if (!parts.length) {
      this.root = (v as Tree) ?? {};
      return;
    }
    const stack: Tree[] = [this.root];
    let cur = this.root;
    for (const p of parts.slice(0, -1)) {
      if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p] as Tree;
      stack.push(cur);
    }
    const last = parts[parts.length - 1];
    if (v === null) delete cur[last];
    else cur[last] = v;
    // 空になった親は無くなる（Firebase と同じ）
    for (let i = stack.length - 1; i > 0; i--) {
      if (Object.keys(stack[i]).length) break;
      delete stack[i - 1][parts[i - 1]];
    }
    this.schedule();
  }

  schedule() {
    if (this.pending) return;
    this.pending = true;
    setTimeout(() => {
      this.pending = false;
      this.flush();
    }, 0);
  }

  flush() {
    for (const l of [...this.listeners]) {
      if (!l.client.online || l.client.paused || !this.listeners.includes(l)) continue;
      const val = this.read(l.path);
      if (l.kind === 'value') {
        const s = JSON.stringify(val);
        if (s === l.last) continue;
        l.last = s;
        (l.cb as (v: unknown) => void)(clone(val));
        continue;
      }
      const obj = val && typeof val === 'object' ? (val as Tree) : {};
      const keys = Object.keys(obj).sort();
      if (l.kind === 'added') {
        for (const k of keys) {
          if (l.seen!.has(k) || (l.after !== undefined && k <= l.after)) continue;
          l.seen!.add(k);
          (l.cb as (k: string, v: unknown) => void)(k, clone(obj[k]));
        }
      } else {
        for (const k of [...l.seen!]) if (!(k in obj)) {
          l.seen!.delete(k);
          (l.cb as (k: string) => void)(k);
        }
        for (const k of keys) l.seen!.add(k);
      }
    }
  }

  client(uid: string): MemoryClient {
    return new MemoryClient(this, uid);
  }
}

export class MemoryClient implements Backend {
  online = true;
  private frozen = false;
  /** ページが凍っている（スマホが眠った）: 接続は残ったまま、知らせが届かない。false に戻すと、たまった分がまとめて届く */
  get paused() {
    return this.frozen;
  }
  set paused(v: boolean) {
    this.frozen = v;
    if (!v) this.hub.schedule();
  }
  private disconnectOps: [string, unknown][] = [];
  private connectedCbs = new Set<(c: boolean) => void>();
  constructor(
    private hub: MemoryHub,
    readonly uid: string,
  ) {}

  private check() {
    if (!this.online) throw new Error('offline');
  }
  async get<T>(path: string) {
    this.check();
    return clone(this.hub.read(path)) as T | null;
  }
  async set(path: string, value: unknown) {
    this.check();
    this.hub.write(path, value);
  }
  async update(values: Record<string, unknown>) {
    this.check();
    for (const [p, v] of Object.entries(values)) this.hub.write(p, v);
  }
  async remove(path: string) {
    this.check();
    this.hub.write(path, null);
  }
  async transaction<T>(path: string, fn: (cur: T | null) => T | null | undefined) {
    this.check();
    const next = fn(clone(this.hub.read(path)) as T | null);
    if (next === undefined) return { committed: false, value: clone(this.hub.read(path)) as T | null };
    this.hub.write(path, next);
    return { committed: true, value: clone(next) };
  }
  private listen(l: Omit<Listener, 'client'>): Unsubscribe {
    const full: Listener = { ...l, client: this };
    this.hub.listeners.push(full);
    this.hub.schedule();
    return () => {
      this.hub.listeners = this.hub.listeners.filter((x) => x !== full);
    };
  }
  onValue<T>(path: string, cb: (v: T | null) => void) {
    return this.listen({ kind: 'value', path, cb: cb as never });
  }
  onChildAdded<T>(path: string, cb: (key: string, v: T) => void, after?: string) {
    return this.listen({ kind: 'added', path, cb: cb as never, seen: new Set(), after });
  }
  onChildRemoved(path: string, cb: (key: string) => void) {
    const obj = this.hub.read(path);
    return this.listen({ kind: 'removed', path, cb: cb as never, seen: new Set(obj && typeof obj === 'object' ? Object.keys(obj) : []) });
  }
  async keysAtMost(path: string, max: number, limit: number) {
    this.check();
    const obj = (this.hub.read(path) ?? {}) as Record<string, number>;
    return Object.entries(obj)
      .filter(([, v]) => typeof v === 'number' && v <= max)
      .sort((a, b) => a[1] - b[1])
      .slice(0, limit)
      .map(([k]) => k);
  }
  async onDisconnectSet(path: string, value: unknown) {
    this.disconnectOps.push([path, value]);
  }
  newKey() {
    return timeKey(this.hub.clock());
  }
  now() {
    return this.hub.clock();
  }
  onConnected(cb: (c: boolean) => void) {
    this.connectedCbs.add(cb);
    setTimeout(() => cb(this.online), 0);
    return () => void this.connectedCbs.delete(cb);
  }
  goOffline() {
    if (!this.online) return;
    this.online = false;
    for (const [p, v] of this.disconnectOps) this.hub.write(p, v);
    this.disconnectOps = [];
    for (const cb of this.connectedCbs) cb(false);
  }
  goOnline() {
    if (this.online) return;
    this.online = true;
    for (const cb of this.connectedCbs) cb(true);
    this.hub.schedule();
  }
}
