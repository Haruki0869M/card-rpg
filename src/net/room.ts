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
//   pins      {端末ID: 今指しているピン（「こっち！」。約8秒で消える。src/net/pins.ts）}
// roomIndex/{合言葉} = 最後に使った時刻（古い部屋の掃除用）
import { contentVersion } from '../data/contentVersion';
import { applyGameCommand, createGame, GAME_VERSION, stateHash } from '../engine';
import type { Gender, GameCommand, GameResult, GameState, PlayerId } from '../types';
import { type Backend, join, type Unsubscribe } from './backend';
import type { Pin, PinTarget } from './pins';

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
  /** 最後に「動いている」と書いた時刻（回3 C。古い端末は書かないので ? 付き） */
  beat?: number;
}

/** 「動いている」を書く間隔 */
export const BEAT_MS = 10_000;
/**
 * これより長く「動いている」が書かれていない人は、接続が残っていても止まっている（スマホが眠った・ページが凍った）とみなす（回3 C）。
 * ホストなら、残っている中で一番早く入った人が引き継ぐ。
 */
export const STALE_MS = 35_000;

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
  /** どの依頼から作ったか（requests のキー。二重に記録しないため。古い記録には無い） */
  req?: string;
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
  /** だれかのピンが変わった（ゲームの状態は変わらない） */
  | { type: 'pins' }
  /** 自分の操作が断られた */
  | { type: 'rejected'; text: string }
  | { type: 'connection'; connected: boolean }
  | { type: 'host'; hostUid: string };

export const seqKey = (n: number) => String(n).padStart(9, '0');
/** 覚えておく処理済みの依頼の数 */
const DONE_REQS = 500;
/** 記録を書けなかった依頼を、やり直す回数 */
const MAX_TRIES = 3;
interface QueuedRequest {
  key: string;
  by: string;
  cmd: string;
  tries?: number;
}
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
/** 合言葉の部屋が無い（消えた）時の文。タイトルの「前の部屋に戻る」で見分ける */
export const ROOM_MISSING = 'その合言葉の部屋はありません';

export class Room {
  meta: RoomMeta | null = null;
  members: Record<string, Member> = {};
  slots: (Slot | null)[] = [];
  /** 部屋に保存されている枠（人数で切り出す前） */
  private rawSlots: Record<string, Slot> = {};
  stamps: Record<string, Stamp> = {};
  /** 端末ID → 今指しているピン（古い物も入っている。出す時は activePins で選ぶ） */
  pins: Record<string, Pin> = {};
  game: GameState | null = null;
  /** 最後に動かした操作の番号 */
  seq = 0;
  connected = true;

  private listeners = new Set<(e: RoomEvent) => void>();
  private subs: Unsubscribe[] = [];
  private logSub: Unsubscribe | null = null;
  private reqSub: Unsubscribe | null = null;
  private queue: QueuedRequest[] = [];
  private processing = false;
  private hashes = new Map<number, string>();
  /** 記録に入った依頼のキー（同じ依頼を二重に記録しないため。新しい物だけ覚える） */
  private doneReqs = new Set<string>();
  private pendingCheck: Snapshot | null = null;
  private resyncing: Promise<void> | null = null;
  private closed = false;
  private beatTimer: ReturnType<typeof setInterval> | null = null;
  /** 直前のホスト（引き継ぎの知らせに使う。回3 C） */
  prevHostUid: string | null = null;

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
  /** その人が今動いているか: 接続中で、「動いている」の書き込みが古すぎない（書かない古い端末は、接続中なら動いているとみなす） */
  alive(m: Member | undefined): boolean {
    return !!m && m.online && (m.beat === undefined || this.backend.now() - m.beat < STALE_MS);
  }
  /** 席の人が接続中（動いている）か（誰もいない席は false） */
  seatOnline(p: PlayerId): boolean {
    return Object.values(this.members).some((m) => m.seat === p && this.alive(m));
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
    if (!meta) throw new RoomError(ROOM_MISSING);
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
        if (m.hostUid !== oldHost) this.onHostChanged(oldHost);
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
      b.onValue<Record<string, Pin>>(p('pins'), (s) => {
        this.pins = s ?? {};
        this.emit({ type: 'pins' });
      }),
      b.onValue<{ text: string; at: number }>(p('errors', this.uid), (e) => {
        if (e && e.at > b.now() - 30_000) this.emit({ type: 'rejected', text: e.text });
      }),
      b.onValue<Snapshot>(p('snapshot'), (s) => s && this.onSnapshot(s)),
    );
    if (this.meta?.status === 'playing') await this.resync('join');
    if (this.isHost) this.startHosting();
    this.startBeat();
  }

  /**
   * 回3 C: 「動いている」を一定の間隔で書き、ほかの人が止まっていないかを見る。
   * ページが凍る（スマホが眠る）と、接続は残ったまま何も処理しなくなるので、接続の印だけでは気づけない。
   * ホストが止まっていたら、checkHost で引き継ぐ。だれかの「動いている」が変わったら、画面を書き直す
   */
  private startBeat() {
    if (this.beatTimer || this.closed) return;
    let lastBeat = 0;
    let lastAlive = '';
    const tick = () => {
      if (this.closed || !this.connected) return;
      const now = this.backend.now();
      if (now - lastBeat >= BEAT_MS) {
        lastBeat = now;
        void this.backend.set(roomPath(this.code, 'members', this.uid, 'beat'), now).catch(() => {});
      }
      const alive = Object.keys(this.members)
        .sort()
        .map((k) => (this.alive(this.members[k]) ? 1 : 0))
        .join('');
      if (alive !== lastAlive) {
        const first = lastAlive === '';
        lastAlive = alive;
        if (!first) this.emit({ type: 'members' });
      }
      this.checkHost();
    };
    tick();
    this.beatTimer = setInterval(tick, BEAT_MS / 2);
    (this.beatTimer as { unref?: () => void }).unref?.();
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
    if (this.beatTimer) clearInterval(this.beatTimer);
    this.beatTimer = null;
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

  /** ピンを指す（null で消す）。ゲームの状態・記録・乱数には さわらない。ctx = 今の場面の目印（pinContext） */
  async sendPin(target: PinTarget | null, ctx = '') {
    if (!this.seat) return;
    await this.backend.set(roomPath(this.code, 'pins', this.uid), target ? ({ seat: this.seat, target, at: this.backend.now(), ctx } satisfies Pin) : null);
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
    if (entry.req) this.rememberReq(entry.req);
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

  private rememberReq(key: string) {
    this.doneReqs.add(key);
    if (this.doneReqs.size > DONE_REQS) this.doneReqs.delete(this.doneReqs.values().next().value!);
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length && this.isHost && this.connected && !this.closed) {
        // 処理を始める前に、部屋のホスト・記録・依頼を読み直す（ホストの引き継ぎ 2026-11-14）。
        // 目を覚ました古いホストが、自分はもうホストでない事・記録が先へ進んでいる事に気づく前に書かないため
        if (!(await this.refresh())) break;
        while (this.queue.length && this.isHost && this.connected && !this.closed) {
          const req = this.queue.shift()!;
          const r = await this.handleRequest(req);
          if (r === 'retry') {
            // だれかが先に記録を書いた（自分は遅れていた）: 追いついてから、同じ依頼をやり直す
            req.tries = (req.tries ?? 0) + 1;
            if (req.tries <= MAX_TRIES) this.queue.unshift(req);
            break;
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * ホストの仕事を続けてよいか確かめ、記録に追いつく。
   * - 部屋の hostUid が自分でなければ、ホストの仕事をやめる（false）
   * - 部屋にもう無い依頼（新しいホストが処理した物）は、待ち行列から捨てる
   * - 記録の古い分が消えていて追いつけない時は、保存（snapshot）から取り直す
   */
  private async refresh(depth = 0): Promise<boolean> {
    const p = (...r: string[]) => roomPath(this.code, ...r);
    const [hostUid, log, reqs] = await Promise.all([
      this.backend.get<string>(p('meta', 'hostUid')),
      this.backend.get<Record<string, LogEntry>>(p('log')),
      this.backend.get<Record<string, unknown>>(p('requests')),
    ]);
    if (this.closed) return false;
    if (hostUid !== this.uid) {
      this.stopHosting();
      return false;
    }
    this.queue = this.queue.filter((q) => reqs?.[q.key] !== undefined);
    const keys = Object.keys(log ?? {})
      .map(Number)
      .filter((n) => n > this.seq)
      .sort((a, b) => a - b);
    if (keys.length && keys[0] !== this.seq + 1) {
      // 間が抜けている（古い記録が消えた）: 保存から取り直して、もう一度読む
      if (depth >= 2) return false;
      await this.resync('gap');
      return this.refresh(depth + 1);
    }
    for (const n of keys) if (n === this.seq + 1 && !this.applyEntry(n, log![seqKey(n)])) return false;
    return true;
  }

  /** 次の番号の記録が、もう部屋にあるか（自分が遅れているか） */
  private async behind(): Promise<boolean> {
    return (await this.backend.get<LogEntry>(roomPath(this.code, 'log', seqKey(this.seq + 1)))) !== null;
  }

  /** 依頼を1つ処理する。'retry' = 記録を書けなかった（ほかの端末が先に書いた） */
  private async handleRequest(req: QueuedRequest): Promise<'retry' | void> {
    const p = (...r: string[]) => roomPath(this.code, ...r);
    if (!this.game) return;
    // もう記録に入っている依頼（目を覚ました古いホストと、新しいホストの両方が受け取った物）は、二重に記録しない
    if (this.doneReqs.has(req.key)) {
      await this.backend.remove(p('requests', req.key)).catch(() => {});
      return;
    }
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
      // 断る前に、記録が先へ進んでいないか確かめる（古い状態で断って、相方の操作を消さないため）
      if (await this.behind()) return 'retry';
      await this.backend.update({ [p('requests', req.key)]: null, [p('errors', req.by)]: { text: result.error, at: now } });
      return;
    }
    const n = this.seq + 1;
    const entry: LogEntry = { by: req.by, cmd: req.cmd, req: req.key };
    // 自分の画面には先に出す（ホストの操作の速さは今のまま）。記録を書けなかったら、部屋から取り直して直す
    this.game = result.state;
    this.seq = n;
    const hash = stateHash(this.game);
    this.hashes.set(n, hash);
    if (this.hashes.size > SNAPSHOT_EVERY * 3) this.hashes.delete(Math.min(...this.hashes.keys()));
    this.emit({ type: 'command', seq: n, by: req.by, cmd, result });
    // その番号がまだ空の時だけ書く（古いホストが、新しいホストの書いた記録を上書きしないため）
    let committed = false;
    try {
      committed = (await this.backend.transaction<LogEntry>(p('log', seqKey(n)), (cur) => (cur ? undefined : entry))).committed;
    } catch {
      committed = false;
    }
    if (!committed) {
      await this.resync('error');
      return 'retry';
    }
    this.rememberReq(req.key);
    const u: Record<string, unknown> = {
      [p('requests', req.key)]: null,
      [p('meta', 'updatedAt')]: now,
      [join('roomIndex', this.code)]: now,
    };
    if (n % SNAPSHOT_EVERY === 0) {
      // 古い記録は消して、部屋のデータを小さく保つ（一つ前の snapshot より前）
      for (let k = n - 2 * SNAPSHOT_EVERY + 1; k <= n - SNAPSHOT_EVERY; k++) if (k > 0) u[p('log', seqKey(k))] = null;
      const snap: Snapshot = { seq: n, game: JSON.stringify(this.game), hash };
      // 保存は、今の保存より新しい時だけ書く
      void this.backend.transaction<Snapshot>(p('snapshot'), (cur) => (cur && cur.seq >= n ? undefined : snap)).catch(() => {});
    }
    await this.backend.update(u);
  }

  /** ホストが切断していたら（止まっていたら）、残っている中で一番早く入った人が引き継ぐ */
  private checkHost() {
    const m = this.meta;
    if (!m || this.closed || !this.connected) return;
    const host = this.members[m.hostUid];
    if (this.alive(host)) return;
    // 自分は今動いているので、自分の「動いている」が古く見えても候補に入れる（書き込みが届く前）
    const next = Object.entries(this.members)
      .filter(([uid, x]) => (uid === this.uid ? x.online : this.alive(x)))
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

  private onHostChanged(oldHost?: string) {
    this.prevHostUid = oldHost ?? null;
    this.emit({ type: 'host', hostUid: this.meta!.hostUid });
    if (this.isHost) {
      // 引き継いだ: 自分が代わりに操作するのは、切断中の席だけ
      this.startHosting();
    } else this.stopHosting();
  }
}
