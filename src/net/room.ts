// ===== オンライン協力の部屋（spec §7.2） =====
// しくみ:
// - 各端末は操作（コマンド）を requests に送る。ホストが順番に確かめて番号を付け、log に書く。
// - 全員が log を番号の順に自分のエンジンで動かす。乱数は種付きなので、全員の結果が同じになる。
// - ホストは一定の間隔で状態（snapshot）と要約（hash）を書く。ずれていた端末・途中で入った端末は snapshot から取り直す。
// - ホストが切断したら、残っている中で一番早く入った人がホストを引き継ぐ。
//
// 部屋のデータ（rooms/{合言葉}）:
//   meta      設定・状態・ホスト
//   seats     P1〜P4 の席 → 端末ID
//   members   {端末ID: 名前・席・接続中か}
//   slots     キャラ作成の枠（担当する端末）
//   requests  送られてきた操作（ホストが処理したら消す）
//   log       番号付きの操作（000000001, 000000002, ...）
//   snapshot  ある番号の時点の状態と要約
//   errors    {端末ID: 最後に断られた理由}
//   stamps    {端末ID: 最後に送ったスタンプ}
// roomIndex/{合言葉} = 最後に使った時刻（古い部屋の掃除用）
import { contentVersion } from '../data/contentVersion';
import { applyGameCommand, createGame, GAME_VERSION, stateHash } from '../engine';
import type { Gender, GameCommand, GameResult, GameState, PlayerId } from '../types';
import { type Backend, join, type Unsubscribe } from './backend';

export const SEATS: PlayerId[] = ['P1', 'P2', 'P3', 'P4'];
/** 何手ごとに状態を保存して比べるか */
export const SNAPSHOT_EVERY = 20;
/** 部屋を消すまでの日数（最後に使ってから） */
export const ROOM_TTL_DAYS = 30;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface RoomMeta {
  code: string;
  hostUid: string;
  status: 'lobby' | 'playing';
  scenarioId: string;
  difficulty: string;
  partySize: number;
  version: number;
  content: string;
  createdAt: number;
  updatedAt: number;
  /** ホストが代わりに操作しているプレイヤー（切断中の人の分） */
  proxy?: Partial<Record<PlayerId, boolean>>;
}

export interface Member {
  name: string;
  seat: PlayerId;
  joinedAt: number;
  online: boolean;
}

export interface Slot {
  classId: string;
  gender: Gender;
  name: string;
  ownerUid: string;
}

export interface Stamp {
  kind: string;
  at: number;
  seat: PlayerId;
}

interface LogEntry {
  by: string;
  cmd: string;
}
interface Snapshot {
  seq: number;
  game: string;
  hash: string;
}

export type RoomEvent =
  /** 操作が1つ進んだ（演出用の結果つき） */
  | { type: 'command'; seq: number; by: string; cmd: GameCommand; result: GameResult }
  /** 状態を丸ごと取り直した（参加・再接続・ずれの直し） */
  | { type: 'resync'; seq: number; reason: 'join' | 'start' | 'gap' | 'hash' | 'error' }
  | { type: 'meta' }
  | { type: 'members' }
  | { type: 'slots' }
  | { type: 'stamp'; uid: string; stamp: Stamp }
  /** 自分の操作が断られた */
  | { type: 'rejected'; text: string }
  | { type: 'connection'; connected: boolean }
  | { type: 'host'; hostUid: string };

export const seqKey = (n: number) => String(n).padStart(9, '0');
const roomPath = (code: string, ...rest: string[]) => join('rooms', code, ...rest);

export function randomCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return s;
}

export const normalizeCode = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);

export class RoomError extends Error {}

export class Room {
  meta: RoomMeta | null = null;
  members: Record<string, Member> = {};
  slots: (Slot | null)[] = [];
  /** 部屋に保存されている枠（人数で切り出す前） */
  private rawSlots: Record<string, Slot> = {};
  stamps: Record<string, Stamp> = {};
  game: GameState | null = null;
  /** 最後に動かした操作の番号 */
  seq = 0;
  connected = true;

  private listeners = new Set<(e: RoomEvent) => void>();
  private subs: Unsubscribe[] = [];
  private logSub: Unsubscribe | null = null;
  private reqSub: Unsubscribe | null = null;
  private queue: { key: string; by: string; cmd: string }[] = [];
  private processing = false;
  private hashes = new Map<number, string>();
  private pendingCheck: Snapshot | null = null;
  private resyncing: Promise<void> | null = null;
  private closed = false;

  private constructor(
    readonly backend: Backend,
    readonly code: string,
  ) {}

  get uid() {
    return this.backend.uid;
  }
  get isHost() {
    return this.meta?.hostUid === this.uid;
  }
  get seat(): PlayerId | undefined {
    return this.members[this.uid]?.seat;
  }
  /** この端末が操作できるプレイヤー（自分の席 + ホストなら代わりに操作中の席） */
  myPlayers(): PlayerId[] {
    const out: PlayerId[] = [];
    if (this.seat) out.push(this.seat);
    if (this.isHost) for (const p of SEATS) if (this.meta?.proxy?.[p] && !out.includes(p)) out.push(p);
    return out;
  }
  /** 席の人が接続中か（誰もいない席は false） */
  seatOnline(p: PlayerId): boolean {
    return Object.values(this.members).some((m) => m.seat === p && m.online);
  }
  seatName(p: PlayerId): string | undefined {
    return Object.values(this.members).find((m) => m.seat === p)?.name;
  }

  on(cb: (e: RoomEvent) => void): Unsubscribe {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }
  private emit(e: RoomEvent) {
    for (const cb of this.listeners) cb(e);
  }

  // ---------- 作る・入る ----------

  /** 部屋を作る（作った人がホストで P1） */
  static async create(backend: Backend, opts: { name: string; scenarioId: string; difficulty: string; partySize: number }): Promise<Room> {
    const now = backend.now();
    // ついでに古い部屋を掃除する（有料の自動処理を使わないため）
    try {
      for (const k of await backend.keysAtMost('roomIndex', now - ROOM_TTL_DAYS * 86_400_000, 10)) await backend.update({ [roomPath(k)]: null, [join('roomIndex', k)]: null });
    } catch {
      /* 掃除は失敗してもよい */
    }
    for (let tries = 0; tries < 20; tries++) {
      const code = randomCode();
      const meta: RoomMeta = {
        code,
        hostUid: backend.uid,
        status: 'lobby',
        scenarioId: opts.scenarioId,
        difficulty: opts.difficulty,
        partySize: opts.partySize,
        version: GAME_VERSION,
        content: contentVersion(),
        createdAt: now,
        updatedAt: now,
      };
      const r = await backend.transaction<RoomMeta>(roomPath(code, 'meta'), (cur) => (cur ? undefined : meta));
      if (!r.committed) continue;
      await backend.update({
        [roomPath(code, 'seats', 'P1')]: backend.uid,
        [roomPath(code, 'members', backend.uid)]: { name: opts.name, seat: 'P1', joinedAt: now, online: true } satisfies Member,
        [join('roomIndex', code)]: now,
      });
      const room = new Room(backend, code);
      await room.attach();
      return room;
    }
    throw new RoomError('合言葉を作れませんでした。もう一度試してください');
  }

  /** 合言葉で部屋に入る（前に入っていた部屋なら、同じ席に戻る） */
  static async join(backend: Backend, rawCode: string, name: string): Promise<Room> {
    const code = normalizeCode(rawCode);
    if (code.length !== 4) throw new RoomError('合言葉は4文字です');
    const meta = await backend.get<RoomMeta>(roomPath(code, 'meta'));
    if (!meta) throw new RoomError('その合言葉の部屋はありません');
    if (meta.version !== GAME_VERSION || meta.content !== contentVersion()) throw new RoomError('ゲームの版が部屋と違います。ページを読み込み直してください');
    const me = await backend.get<Member>(roomPath(code, 'members', backend.uid));
    if (!me) {
      if (meta.status !== 'lobby') throw new RoomError('この部屋はもう冒険を始めています');
      let seat: PlayerId | undefined;
      const r = await backend.transaction<Partial<Record<PlayerId, string>>>(roomPath(code, 'seats'), (cur) => {
        const seats = { ...(cur ?? {}) };
        seat = SEATS.find((p) => !seats[p]);
        if (!seat) return undefined;
        seats[seat] = backend.uid;
        return seats;
      });
      if (!r.committed || !seat) throw new RoomError('部屋がいっぱいです（4人まで）');
      await backend.set(roomPath(code, 'members', backend.uid), { name, seat, joinedAt: backend.now(), online: true } satisfies Member);
    }
    const room = new Room(backend, code);
    await room.attach();
    return room;
  }

  /** 部屋のデータを見張り始める */
  private async attach() {
    const b = this.backend;
    const p = (...r: string[]) => roomPath(this.code, ...r);
    this.meta = await b.get<RoomMeta>(p('meta'));
    this.members = (await b.get<Record<string, Member>>(p('members'))) ?? {};
    await b.onDisconnectSet(p('members', this.uid, 'online'), false);
    this.subs.push(
      b.onConnected((c) => {
        const was = this.connected;
        this.connected = c;
        this.emit({ type: 'connection', connected: c });
        if (!c || this.closed) return;
        // 切断から戻った: 切断中に自分だけ進めた分があるかもしれないので、部屋の状態から取り直す
        if (!was && this.game) void this.resync('gap');
        // つながり直したら「接続中」に戻し、切断時の書き込みも予約し直す
        void b.onDisconnectSet(p('members', this.uid, 'online'), false).catch(() => {});
        void b.set(p('members', this.uid, 'online'), true).catch(() => {});
      }),
      b.onValue<RoomMeta>(p('meta'), (m) => {
        if (!m) return;
        const wasPlaying = this.meta?.status === 'playing';
        const oldHost = this.meta?.hostUid;
        const sizeChanged = this.meta?.partySize !== m.partySize;
        this.meta = m;
        this.emit({ type: 'meta' });
        // 人数が変わったら枠も作り直す（増やした時は枠のデータが変わらず、枠の知らせが来ないため）
        if (sizeChanged) this.rebuildSlots();
        if (m.hostUid !== oldHost) this.onHostChanged();
        if (m.status === 'playing' && (!wasPlaying || !this.game)) void this.resync('start');
      }),
      b.onValue<Record<string, Member>>(p('members'), (m) => {
        this.members = m ?? {};
        this.emit({ type: 'members' });
        this.checkHost();
      }),
      b.onValue<Record<string, Slot>>(p('slots'), (s) => {
        this.rawSlots = s ?? {};
        this.rebuildSlots();
      }),
      b.onValue<Record<string, Stamp>>(p('stamps'), (s) => {
        for (const [uid, st] of Object.entries(s ?? {})) {
          if (this.stamps[uid]?.at === st.at) continue;
          const isNew = !!this.stamps[uid] || st.at > b.now() - 10_000;
          this.stamps[uid] = st;
          if (isNew) this.emit({ type: 'stamp', uid, stamp: st });
        }
      }),
      b.onValue<{ text: string; at: number }>(p('errors', this.uid), (e) => {
        if (e && e.at > b.now() - 30_000) this.emit({ type: 'rejected', text: e.text });
      }),
      b.onValue<Snapshot>(p('snapshot'), (s) => s && this.onSnapshot(s)),
    );
    if (this.meta?.status === 'playing') await this.resync('join');
    if (this.isHost) this.startHosting();
  }

  /** 部屋を出る（データは残るので、同じ合言葉でまた入れる） */
  async leave() {
    this.closed = true;
    try {
      await this.backend.set(roomPath(this.code, 'members', this.uid, 'online'), false);
    } catch {
      /* 切断中なら onDisconnect で書かれる */
    }
    this.dispose();
  }

  dispose() {
    this.closed = true;
    for (const u of this.subs) u();
    this.subs = [];
    this.logSub?.();
    this.reqSub?.();
    this.logSub = this.reqSub = null;
    this.listeners.clear();
  }

  // ---------- 待合室（キャラ作成） ----------

  /** キャラ作成の枠を自分のものにする（空いている時だけ） */
  async claimSlot(index: number, hero: Omit<Slot, 'ownerUid'>) {
    const r = await this.backend.transaction<Slot>(roomPath(this.code, 'slots', String(index)), (cur) =>
      cur && cur.ownerUid !== this.uid ? undefined : { ...hero, ownerUid: this.uid },
    );
    if (!r.committed) throw new RoomError('その枠は他の人が使っています');
  }

  async releaseSlot(index: number) {
    const r = await this.backend.transaction<Slot>(roomPath(this.code, 'slots', String(index)), (cur) => (cur && cur.ownerUid === this.uid ? null : undefined));
    if (!r.committed) throw new RoomError('自分の枠ではありません');
  }

  /** ホスト: 設定を変える（待合室の間だけ） */
  async updateSettings(s: Partial<Pick<RoomMeta, 'scenarioId' | 'difficulty' | 'partySize'>>) {
    if (!this.isHost || this.meta?.status !== 'lobby') throw new RoomError('ホストだけが待合室で変えられます');
    const u: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s)) u[roomPath(this.code, 'meta', k)] = v;
    // 人数を減らしたら、はみ出た枠は消す
    if (s.partySize !== undefined) for (let i = s.partySize; i < 4; i++) u[roomPath(this.code, 'slots', String(i))] = null;
    await this.backend.update(u);
  }

  /** 出発できない理由（できるなら null） */
  startProblem(): string | null {
    if (!this.isHost) return 'ホストが出発します';
    if (this.slots.length !== this.meta?.partySize || this.slots.some((s) => !s)) return 'まだ作っていないキャラがいます';
    for (const s of this.slots) if (!this.members[s!.ownerUid]) return '部屋にいない人のキャラがあります';
    return null;
  }

  /** ホスト: 冒険を始める */
  async start(seed = Math.floor(Math.random() * 1_000_000_000)) {
    const problem = this.startProblem();
    if (problem) throw new RoomError(problem);
    const m = this.meta!;
    const game = createGame({
      seed,
      scenarioId: m.scenarioId,
      difficulty: m.difficulty,
      online: true,
      party: this.slots.map((s) => ({ classId: s!.classId, gender: s!.gender, name: s!.name, playerId: this.members[s!.ownerUid].seat })),
    });
    const now = this.backend.now();
    await this.backend.update({
      [roomPath(this.code, 'log')]: null,
      [roomPath(this.code, 'requests')]: null,
      [roomPath(this.code, 'snapshot')]: { seq: 0, game: JSON.stringify(game), hash: stateHash(game) } satisfies Snapshot,
      [roomPath(this.code, 'meta', 'status')]: 'playing',
      [roomPath(this.code, 'meta', 'updatedAt')]: now,
      [join('roomIndex', this.code)]: now,
    });
  }

  // ---------- 遊んでいる間 ----------

  /** 操作を送る（ホストが番号を付けて全員に配る） */
  async send(cmd: GameCommand) {
    if (!this.game) throw new RoomError('冒険が始まっていません');
    await this.backend.set(roomPath(this.code, 'requests', this.backend.newKey()), { by: this.uid, cmd: JSON.stringify(cmd) });
  }

  async sendStamp(kind: string) {
    if (!this.seat) return;
    await this.backend.set(roomPath(this.code, 'stamps', this.uid), { kind, at: this.backend.now(), seat: this.seat } satisfies Stamp);
  }

  /** ホスト: 切断中の人の分を代わりに操作する / やめる */
  async setProxy(p: PlayerId, on: boolean) {
    if (!this.isHost) throw new RoomError('ホストだけが代わりに操作できます');
    await this.backend.set(roomPath(this.code, 'meta', 'proxy', p), on ? true : null);
  }

  /** 状態を部屋の snapshot から取り直す */
  resync(reason: Extract<RoomEvent, { type: 'resync' }>['reason']): Promise<void> {
    if (this.resyncing) return this.resyncing;
    this.resyncing = (async () => {
      try {
        const s = await this.backend.get<Snapshot>(roomPath(this.code, 'snapshot'));
        if (this.closed) return;
        // 「始まった」の知らせが、保存された状態より先に届くことがある → 少し待ってやり直す
        if (!s) {
          setTimeout(() => !this.closed && !this.game && void this.resync(reason), 300);
          return;
        }
        this.adopt(s, reason);
      } finally {
        this.resyncing = null;
      }
    })();
    return this.resyncing;
  }

  private adopt(s: Snapshot, reason: Extract<RoomEvent, { type: 'resync' }>['reason']) {
    this.game = JSON.parse(s.game) as GameState;
    this.seq = s.seq;
    this.hashes.clear();
    this.hashes.set(s.seq, s.hash);
    this.pendingCheck = null;
    this.listenLog();
    this.emit({ type: 'resync', seq: s.seq, reason });
  }

  private listenLog() {
    this.logSub?.();
    this.logSub = this.backend.onChildAdded<LogEntry>(
      roomPath(this.code, 'log'),
      (key, entry) => {
        const n = Number(key);
        if (n <= this.seq || this.resyncing) return;
        if (n !== this.seq + 1) {
          // 間が抜けた（切断中に古い記録が消された）→ 取り直す
          void this.resync('gap');
          return;
        }
        this.applyEntry(n, entry);
      },
      seqKey(this.seq),
    );
  }

  /** 番号付きの操作を自分のエンジンで動かす */
  private applyEntry(n: number, entry: LogEntry): boolean {
    const cmd = JSON.parse(entry.cmd) as GameCommand;
    const result = applyGameCommand(this.game!, cmd);
    if (result.error) {
      // ホストで通った操作が通らない = 状態がずれている
      void this.resync('error');
      return false;
    }
    this.game = result.state;
    this.seq = n;
    this.hashes.set(n, stateHash(this.game));
    if (this.hashes.size > SNAPSHOT_EVERY * 3) this.hashes.delete(Math.min(...this.hashes.keys()));
    this.emit({ type: 'command', seq: n, by: entry.by, cmd, result });
    if (this.pendingCheck && this.pendingCheck.seq === n) this.compare(this.pendingCheck);
    return true;
  }

  private onSnapshot(s: Snapshot) {
    if (!this.game) {
      if (this.meta?.status === 'playing' && !this.resyncing) this.adopt(s, 'start');
      return;
    }
    if (this.isHost) return;
    if (s.seq > this.seq) this.pendingCheck = s;
    else this.compare(s);
  }

  /** 状態の要約を比べて、ずれていたら取り直す */
  private compare(s: Snapshot) {
    this.pendingCheck = null;
    const mine = this.hashes.get(s.seq);
    if (mine && mine !== s.hash) void this.resync('hash');
  }

  // ---------- ホストの仕事 ----------

  private startHosting() {
    if (this.reqSub || this.closed) return;
    this.reqSub = this.backend.onChildAdded<{ by: string; cmd: string }>(roomPath(this.code, 'requests'), (key, v) => {
      this.queue.push({ key, ...v });
      void this.processQueue();
    });
  }

  private stopHosting() {
    this.reqSub?.();
    this.reqSub = null;
    this.queue = [];
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    try {
      // 引き継いだ直後など: 書かれている記録に追いついてから
      await this.catchUp();
      // 切断中は処理しない（書き込みが後から届いて、引き継いだホストとぶつからないように）
      while (this.queue.length && this.isHost && this.connected && !this.closed) {
        const req = this.queue.shift()!;
        await this.handleRequest(req);
      }
    } finally {
      this.processing = false;
    }
  }

  private async catchUp() {
    const log = await this.backend.get<Record<string, LogEntry>>(roomPath(this.code, 'log'));
    for (const k of Object.keys(log ?? {}).sort()) {
      const n = Number(k);
      if (n === this.seq + 1) this.applyEntry(n, log![k]);
    }
  }

  private async handleRequest(req: { key: string; by: string; cmd: string }) {
    const p = (...r: string[]) => roomPath(this.code, ...r);
    if (!this.game) return;
    let cmd: GameCommand;
    try {
      cmd = JSON.parse(req.cmd) as GameCommand;
    } catch {
      await this.backend.remove(p('requests', req.key));
      return;
    }
    const result = applyGameCommand(this.game, cmd);
    const now = this.backend.now();
    if (result.error) {
      await this.backend.update({ [p('requests', req.key)]: null, [p('errors', req.by)]: { text: result.error, at: now } });
      return;
    }
    const n = this.seq + 1;
    const u: Record<string, unknown> = {
      [p('log', seqKey(n))]: { by: req.by, cmd: req.cmd } satisfies LogEntry,
      [p('requests', req.key)]: null,
      [p('meta', 'updatedAt')]: now,
      [join('roomIndex', this.code)]: now,
    };
    this.game = result.state;
    this.seq = n;
    const hash = stateHash(this.game);
    this.hashes.set(n, hash);
    if (this.hashes.size > SNAPSHOT_EVERY * 3) this.hashes.delete(Math.min(...this.hashes.keys()));
    if (n % SNAPSHOT_EVERY === 0) {
      u[p('snapshot')] = { seq: n, game: JSON.stringify(this.game), hash } satisfies Snapshot;
      // 古い記録は消して、部屋のデータを小さく保つ（一つ前の snapshot より前）
      for (let k = n - 2 * SNAPSHOT_EVERY + 1; k <= n - SNAPSHOT_EVERY; k++) if (k > 0) u[p('log', seqKey(k))] = null;
    }
    this.emit({ type: 'command', seq: n, by: req.by, cmd, result });
    await this.backend.update(u);
  }

  /** ホストが切断していたら、残っている中で一番早く入った人が引き継ぐ */
  private checkHost() {
    const m = this.meta;
    if (!m || this.closed || !this.connected) return;
    const host = this.members[m.hostUid];
    if (host?.online) return;
    const next = Object.entries(this.members)
      .filter(([, x]) => x.online)
      .sort((a, b) => a[1].joinedAt - b[1].joinedAt)[0];
    if (next?.[0] !== this.uid) return;
    const old = m.hostUid;
    void this.backend.transaction<string>(roomPath(this.code, 'meta', 'hostUid'), (cur) => (cur === old ? this.uid : undefined)).catch(() => {});
  }

  /** 人数に合わせて枠の一覧を作る */
  private rebuildSlots() {
    const arr: (Slot | null)[] = [];
    for (let i = 0; i < (this.meta?.partySize ?? 0); i++) arr.push(this.rawSlots[i] ?? null);
    this.slots = arr;
    this.emit({ type: 'slots' });
  }

  private onHostChanged() {
    this.emit({ type: 'host', hostUid: this.meta!.hostUid });
    if (this.isHost) {
      // 引き継いだ: 自分が代わりに操作するのは、切断中の席だけ
      this.startHosting();
    } else this.stopHosting();
  }
}
