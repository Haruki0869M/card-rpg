// 賢いマルチプレイ検証 bot: 審判（計画 §2-4・§3-5・§3-6・直し4・直し5・オーナーの返事1）
// - 確認用の入口（window.__online）を読むのは、ここだけ（と、後の scenes.mjs の用意の時だけ）。読むだけ。
//   書く入口（send・next・inject など）は、各端末で「呼ぶとエラーになる物」に差し替える（読み込み直しの後も効く）。
// - 毎ステップ: URL の emu= を見直す・書く入口が呼ばれていないか・画面のエラー・状態の印（seq:hash）が全端末で同じか・止まり。
// - 失敗の時: 全端末の写真・DOM・見えている字・View・直前の操作 50件・状態の印・状態の写し（読むだけ）を残す。
//   続けられる限り続け、最後は必ず「失敗」と報告する。別々の種類が 10 になったら止める。
import { mkdirSync, writeFileSync } from 'node:fs';
import { assertLocalUrl } from './fleet.mjs';
import { readAll } from './view/index.mjs';
import { now, until, wait, withTimeout } from './util.mjs';

/** 書く入口（通しの間は使わない。計画 §2-4 の表） */
const WRITERS = ['send', 'next', 'inject', 'resync', 'setProxy', 'goOffline', 'goOnline', 'stamp', 'openSheet', 'beforeRoom'];

/** 失敗の種類（報告の言葉） */
export const KINDS = {
  overlap: 'かぶさり',
  cover: '見た目のかぶさり',
  collapsed: '窓の潰れ',
  overflow: 'はみ出し',
  desync: '同期のずれ',
  lag: '追いつかない',
  pageerror: '画面のエラー',
  stuck: '止まり',
  deadlock: '互いに待つ',
  'no-effect': '押しても変わらない',
  unreadable: '読めない画面',
  missing: '押す物が無い',
  guard: '本番に書かない守り',
  seal: '書く入口が呼ばれた',
  timeout: '時間切れ',
  lobby: '部屋に入れない',
  shake: '揺さぶりの確かめ NG',
};

/** 各端末で、書く入口を差し替える仕掛け（ページが読み込まれるたびに効く。__online が置かれた瞬間に包む） */
function sealInit(writers) {
  const box = (window.__smartCoopSeal = window.__smartCoopSeal || { violations: [] });
  let api;
  const wrap = (v) => {
    if (!v || typeof v !== 'object') return v;
    for (const k of writers) {
      if (typeof v[k] !== 'function') continue;
      v[k] = () => {
        box.violations.push({ name: k, at: new Date().toISOString() });
        throw new Error(`smart-coop: 通しの間は __online.${k} を使いません`);
      };
    }
    return v;
  };
  try {
    Object.defineProperty(window, '__online', { configurable: true, get: () => api, set: (v) => { api = wrap(v); } });
  } catch {
    /* 既に置かれている */
  }
}

/** 状態の印などを読む（読むだけ） */
function readFingerprint() {
  const o = window.__online;
  const seal = window.__smartCoopSeal;
  if (!o) return { ready: false, violations: seal?.violations?.length ?? 0 };
  const safe = (f) => { try { return f(); } catch { return null; } };
  return {
    ready: true,
    seq: safe(() => o.seq()),
    hash: safe(() => o.hash()),
    isHost: safe(() => o.isHost()),
    seat: safe(() => o.seat()),
    mode: safe(() => o.mode()),
    ui: safe(() => o.ui()),
    pins: safe(() => o.pins()),
    // 取り直しの記録（1-G で足す読むだけの入口。まだ無ければ null）
    resyncLog: typeof o.resyncLog === 'function' ? safe(() => o.resyncLog()) : null,
    hasResyncLog: typeof o.resyncLog === 'function',
    // 今の URL で決まる冒険の種（1-G の読むだけの入口。&seed= が無ければ null）
    seed: typeof o.seed === 'function' ? safe(() => o.seed()) : null,
    violations: seal?.violations?.length ?? 0,
  };
}

export class Judge {
  /**
   * @param {object} o
   * @param {string} o.outDir 結果の置き場所（screenshots/smart-coop/<シナリオ>-<人数>p-<種>）
   * @param {Array} o.devices 端末（fleet.mjs）
   */
  constructor({ outDir, devices, maxKinds = 10, stuckMs = 40000, deadlockMs = 12000, repeatLimit = 8, limitMin = 180, expectSeed = null }) {
    this.outDir = outDir;
    this.devices = devices;
    this.maxKinds = maxKinds;
    this.stuckMs = stuckMs;
    this.deadlockMs = deadlockMs;
    this.repeatLimit = repeatLimit;
    this.limitMs = limitMin * 60000;
    this.failures = [];
    this.notes = [];
    this.actions = [];
    this.keys = new Set();
    this.momentary = new Map();
    this.ellipsis = new Map();
    this.syncChecks = 0;
    this.blocked = [];
    this.errorsSeen = new Map();
    this.t0 = Date.now();
    this.lastProgress = Date.now();
    this.lastSigs = '';
    this.lastSeq = -1;
    this.waitingSince = null;
    this.repeats = new Map();
    this.views = [];
    this.hasResyncLog = null;
    // 取り直しの記録（端末ごとに、読んだ所までの数）と、理由ごとの数（報告に出す）
    this.resyncSeen = new Map();
    this.resyncs = [];
    // 冒険の種（全端末で同じか。&seed= が効いているか）
    this.seeds = new Map();
    this.expectSeed = expectSeed;
    mkdirSync(outDir, { recursive: true });
  }

  /** 各端末に「書く入口を封じる」仕掛けを入れる（ページを開く前に呼ぶ。読み込み直しの後も効く） */
  async arm() {
    for (const d of this.devices) await d.ctx.addInitScript(sealInit, WRITERS);
  }

  /**
   * 区切り 4（場面から・計画 §6-3 の手順3）: 保存を差し込み終えた後に、今開いているページの書く入口をその場で封じる
   * （arm() は次に読み込んだページから効く。差し込みの前に arm() すると差し込めないので、場面からは差し込みの後にこれと arm() を呼ぶ）
   */
  async sealNow() {
    for (const d of this.devices) {
      if (d.page.isClosed()) continue;
      await d.page.evaluate((writers) => {
        const box = (window.__smartCoopSeal = window.__smartCoopSeal || { violations: [] });
        const o = window.__online;
        if (!o) return;
        for (const k of writers) {
          if (typeof o[k] !== 'function') continue;
          o[k] = () => {
            box.violations.push({ name: k, at: new Date().toISOString() });
            throw new Error(`smart-coop: 通しの間は __online.${k} を使いません`);
          };
        }
      }, WRITERS);
    }
    await this.arm();
  }

  /** 操作の記録（press.mjs から） */
  record(entry) {
    this.actions.push({ at: now(), ...entry });
    if (this.actions.length > 200000) this.actions.splice(0, 10000); // 区切り 2-Sb: 通し全体（数千手）を残す
  }

  note(kind, text, extra = {}) {
    this.notes.push({ at: now(), kind, text, ...extra });
  }

  /** 失敗の種類の数（別々の種類） */
  kinds() {
    return new Set(this.failures.map((f) => f.kind));
  }

  /** 10種類になったら止める（オーナーの返事1） */
  shouldStop() {
    return this.kinds().size >= this.maxKinds || this.failures.some((f) => f.kind === 'guard' || f.kind === 'seal' || f.kind === 'timeout');
  }

  /**
   * 失敗を記録して、全端末の証拠を残す。key が同じ物は1回だけ（同じ不具合を何度も数えない）
   * 返す物: 失敗の記録（同じ key で2回目なら null）
   */
  async fail(kind, { seat = null, text, key, extra } = {}) {
    const k = key ?? `${kind}|${seat}|${text}`;
    if (this.keys.has(k)) return null;
    this.keys.add(k);
    const n = this.failures.length + 1;
    const dir = `${this.outDir}/fail-${String(n).padStart(2, '0')}-${kind}`;
    const f = { n, kind, label: KINDS[kind] ?? kind, seat, text, at: now(), dir, ...(extra ? { extra } : {}) };
    this.failures.push(f);
    console.log(`[smart-coop] 失敗 ${n}: ${f.label}${seat ? `（${seat}）` : ''} ${text}`);
    await this.saveEvidence(dir, f).catch((e) => console.log('[smart-coop] 証拠を残せなかった', e.message));
    return f;
  }

  /** 全端末の写真・DOM・字・View・操作の記録・状態の印・状態の写しを残す（計画 §3-6） */
  async saveEvidence(dir, info) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/failure.json`, JSON.stringify(info, null, 2));
    const views = await readAll(this.devices).catch(() => []);
    writeFileSync(`${dir}/view.json`, JSON.stringify(views, null, 2));
    writeFileSync(`${dir}/actions.json`, JSON.stringify(this.actions.slice(-50), null, 2));
    const sync = {};
    const errors = {};
    for (const d of this.devices) {
      const p = d.page;
      errors[d.seat] = d.errors.slice(-30);
      if (p.isClosed()) continue;
      await p.screenshot({ path: `${dir}/${d.seat}.png` }).catch(() => {});
      writeFileSync(`${dir}/${d.seat}.html`, await p.content().catch(() => ''));
      writeFileSync(`${dir}/${d.seat}.txt`, await p.evaluate(() => document.body?.innerText ?? '').catch(() => ''));
      sync[d.seat] = await p.evaluate(readFingerprint).catch((e) => ({ error: e.message }));
      // 状態の写し（読むだけ。頭には渡さない）
      const state = await p.evaluate(() => { try { return window.__online?.game() ?? null; } catch { return null; } }).catch(() => null);
      if (state) writeFileSync(`${dir}/state-${d.seat}.json`, JSON.stringify(state));
    }
    writeFileSync(`${dir}/sync.json`, JSON.stringify(sync, null, 2));
    writeFileSync(`${dir}/errors.json`, JSON.stringify(errors, null, 2));
  }

  /** 一瞬の当たり（オーナーの返事4: 写真を残し、同じ所で2回目が起きたら失敗）。失敗になったら true */
  async momentaryHit(dev, place, text) {
    const c = (this.momentary.get(place) ?? 0) + 1;
    this.momentary.set(place, c);
    const dir = `${this.outDir}/momentary`;
    mkdirSync(dir, { recursive: true });
    const file = `${dir}/${String(this.notes.length + 1).padStart(3, '0')}-${dev.seat}.png`;
    await dev.page.screenshot({ path: file }).catch(() => {});
    this.note('momentary', `${dev.seat}: ${text}（同じ所で ${c} 回目）`, { place, file });
    if (c >= 2) {
      await this.fail('overlap', { seat: dev.seat, text: `一瞬のかぶさりが同じ所で2回目: ${text}`, key: `momentary|${place}` });
      return true;
    }
    return false;
  }

  /** 「…」で切っている字（失敗にしない。数える） */
  countEllipsis(seat, screen, texts) {
    for (const t of texts) {
      const k = `${seat}|${screen}|${t}`;
      this.ellipsis.set(k, (this.ellipsis.get(k) ?? 0) + 1);
    }
  }

  /** 全端末の状態の印（読むだけ） */
  fingerprints() {
    return Promise.all(this.devices.map((d) => withTimeout(d.page.evaluate(readFingerprint), 15000, `fingerprint ${d.seat}`).catch((e) => ({ ready: false, error: e.message }))));
  }

  /** 全端末の seq の最大（押して効いたかの確かめ・止まりの検出に使う） */
  async maxSeq() {
    const fps = await this.fingerprints();
    return Math.max(-1, ...fps.map((f) => (typeof f.seq === 'number' ? f.seq : -1)));
  }

  /**
   * 毎ステップの点検（審判）:
   * 1. URL の emu= を見直す（直し5）  2. 書く入口が呼ばれていないか  3. 画面のエラー
   * 4. 部屋に入っている端末の seq がそろうまで待って、hash を比べる（上限 15秒）
   */
  async step({ settleMs = 15000 } = {}) {
    for (const d of this.devices) {
      if (d.page.isClosed()) continue;
      const url = d.page.url();
      if (url === 'about:blank') continue;
      try {
        assertLocalUrl(url);
      } catch (e) {
        await this.fail('guard', { seat: d.seat, text: e.message, key: `guard|${d.seat}` });
      }
      for (const b of d.blocked.splice(0)) {
        this.blocked.push({ seat: d.seat, ...b });
        this.note('blocked', `${d.seat}: 手元以外への通信を捨てた ${b.url}`);
      }
      for (const e of d.errors) {
        if (this.errorsSeen.has(e)) continue;
        this.errorsSeen.set(e, true);
        // 守り(2)で捨てた通信の console の error は、守りの記録に数える（ゲームの不具合ではない）
        if (e.type === 'console' && /ERR_BLOCKED_BY_CLIENT|ERR_NAME_NOT_RESOLVED|ERR_PROXY_CONNECTION_FAILED|ERR_TUNNEL_CONNECTION_FAILED/.test(e.text)) {
          this.note('blocked', `${d.seat}: ${e.text}`);
          continue;
        }
        await this.fail('pageerror', { seat: d.seat, text: `${e.type === 'console' ? 'console の error' : 'pageerror'}: ${e.text.slice(0, 300)}` });
      }
    }
    const fps = await this.fingerprints();
    for (const [i, f] of fps.entries())
      if (f.violations) await this.fail('seal', { seat: this.devices[i].seat, text: `書く入口が ${f.violations} 回呼ばれた`, key: `seal|${this.devices[i].seat}` });
    if (this.hasResyncLog === null && fps.some((f) => f.ready)) this.hasResyncLog = fps.some((f) => f.hasResyncLog);
    await this.checkSeeds(fps);
    const r = await this.compare({ settleMs });
    // 比べ終わった後に取り直しの記録を読む（ずれを見つけて自分で直した時も、ここで数える。計画 §2-4）
    await this.checkResyncs(await this.fingerprints());
    return r;
  }

  /** 冒険の種: 全端末が URL の &seed= と同じ種を読んでいるか（違えば、同じ流れをもう1度流せない） */
  async checkSeeds(fps) {
    for (const [i, f] of fps.entries()) {
      if (!f.ready || f.seed === undefined) continue;
      const seat = this.devices[i].seat;
      if (this.seeds.has(seat)) continue;
      this.seeds.set(seat, f.seed);
      if (this.expectSeed !== null && f.seed !== this.expectSeed)
        await this.fail('guard', { seat, text: `冒険の種が URL の &seed=${this.expectSeed} と違う（読めた種: ${f.seed}）。同じ流れをもう1度流せない`, key: `seed|${seat}` });
    }
  }

  /**
   * 取り直しの記録（1-G の resyncLog。読むだけ）: 新しい行を数える。
   * 部屋に入った時（join）・冒険を始めた時（start）以外の取り直し（hash = 状態の印がずれた・gap = 抜け・error = 通らない操作）は、
   * 自動で直っていても「同期のずれ」に数える（計画 §2-4）
   */
  async checkResyncs(fps) {
    for (const [i, f] of fps.entries()) {
      if (!Array.isArray(f.resyncLog)) continue;
      const seat = this.devices[i].seat;
      const seen = this.resyncSeen.get(seat) ?? 0;
      // 読み込み直しの後は記録が空から始まる（ページの中の記録のため）
      const from = f.resyncLog.length < seen ? 0 : seen;
      for (const e of f.resyncLog.slice(from)) {
        this.resyncs.push({ seat, ...e });
        if (e.reason !== 'join' && e.reason !== 'start')
          await this.fail('desync', { seat, text: `部屋が状態を取り直した（理由 ${e.reason}・番号 ${e.seq}）。自動で直ったが、ずれが起きていた`, key: `resync|${seat}|${e.seq}|${e.reason}` });
      }
      this.resyncSeen.set(seat, f.resyncLog.length);
    }
  }

  /**
   * 区切り 4（場面から）: 保存を差し込んだ時の取り直し（ほかの端末が、差し込まれた状態を「印が違う」として取り直す）は、台本の用意なので
   * 同期のずれに数えない。今までの記録を「見た」にして、報告の取り直しの記録には「用意」として残す
   */
  async forgetSetupResyncs() {
    const fps = await this.fingerprints();
    for (const [i, f] of fps.entries()) {
      if (!Array.isArray(f.resyncLog)) continue;
      const seat = this.devices[i].seat;
      for (const e of f.resyncLog.slice(this.resyncSeen.get(seat) ?? 0)) this.resyncs.push({ seat, ...e, setup: true });
      this.resyncSeen.set(seat, f.resyncLog.length);
    }
  }

  /** 部屋に入っている端末の seq がそろうまで待ち、hash を比べる。返す物: { ok, seq, hashes } */
  async compare({ settleMs = 15000 } = {}) {
    let fps = [];
    const inRoom = (f) => f.ready && typeof f.seq === 'number' && f.seq >= 0 && f.hash;
    const same = await until(async () => {
      fps = await this.fingerprints();
      const r = fps.filter(inRoom);
      if (r.length < 2) return true;
      return r.every((f) => f.seq === r[0].seq);
    }, settleMs, 200);
    const r = fps.map((f, i) => ({ seat: this.devices[i].seat, seq: f.seq, hash: f.hash, host: f.isHost })).filter((x, i) => inRoom(fps[i]));
    if (r.length < 2) return { ok: true, compared: false, fps: r };
    this.syncChecks++;
    if (!same) {
      await this.fail('lag', { text: `${settleMs / 1000}秒待っても全端末の番号がそろわない: ${r.map((x) => `${x.seat}=${x.seq}`).join(' ')}`, key: `lag|${r.map((x) => x.seq).join(',')}` });
      return { ok: false, compared: true, fps: r };
    }
    if (new Set(r.map((x) => x.hash)).size > 1) {
      await this.fail('desync', { text: `状態の印が違う: ${r.map((x) => `${x.seat}=${x.hash}`).join(' ')}`, key: `desync|${r[0].seq}` });
      return { ok: false, compared: true, fps: r };
    }
    return { ok: true, compared: true, fps: r };
  }

  /**
   * 止まりの検出（計画 §3-5）。views = 全端末の View。allWaiting = どの端末の頭も「待つ」と答えた
   * 返す物: 失敗の種類（無ければ null）
   */
  async watch(views, { allWaiting = false } = {}) {
    this.views = views;
    const seq = await this.maxSeq();
    const sigs = views.map((v) => v.sig).join(',');
    const busy = views.some((v) => v.busy.length);
    // 区切り 3-S の直し: 演出中の印がずっと消えない形を見逃していた（演出中は「進んでいる」扱いにしていたので、止まりにならず、通しが何分も黙って止まった）。
    // 同じ演出の印が 45 秒より長く消えなければ「止まり」（計画 §3-1 の上限20秒を、重い PC のために長めに）。自己テスト: brain/selftest-shake.mjs「演出が終わらない」
    const busyKey = views.map((v) => `${v.seat}:${v.busy.join('+')}`).filter((x) => !x.endsWith(':')).join(',');
    if (busyKey) {
      if (this.busyKey !== busyKey) {
        this.busyKey = busyKey;
        this.busySince = Date.now();
      } else if (Date.now() - this.busySince > 45000) {
        await this.fail('stuck', { text: `演出中の印が ${Math.round((Date.now() - this.busySince) / 1000)} 秒消えない: ${busyKey}`, key: `busy|${busyKey}` });
        this.busySince = Date.now();
        return 'stuck';
      }
    } else this.busyKey = null;
    if (seq > this.lastSeq || sigs !== this.lastSigs || busy) {
      this.lastProgress = Date.now();
      this.lastSeq = Math.max(this.lastSeq, seq);
      this.lastSigs = sigs;
    }
    if (Date.now() - this.t0 > this.limitMs) {
      await this.fail('timeout', { text: `上限 ${this.limitMs / 60000} 分を超えた`, key: 'timeout' });
      return 'timeout';
    }
    if (allWaiting && !busy) {
      this.waitingSince ??= Date.now();
      if (Date.now() - this.waitingSince > this.deadlockMs) {
        await this.fail('deadlock', { text: `どの端末も押す物が無いまま ${this.deadlockMs / 1000}秒: ${views.map((v) => `${v.seat}「${v.waits.map((w) => w.text).join('／') || '待ちの字なし'}」`).join(' ')}`, key: `deadlock|${sigs}` });
        this.waitingSince = null;
        return 'deadlock';
      }
    } else this.waitingSince = null;
    if (Date.now() - this.lastProgress > this.stuckMs) {
      await this.fail('stuck', { text: `${this.stuckMs / 1000}秒進まない（演出中でもない）`, key: `stuck|${sigs}` });
      this.lastProgress = Date.now();
      return 'stuck';
    }
    return null;
  }

  /** 同じ端末が同じ画面で同じ物を押しても番号が進まない回数を数える（8回で「押しても変わらない」） */
  async repeated(seat, sig, actionKey, advanced) {
    const k = `${seat}|${sig}|${actionKey}`;
    if (advanced) { this.repeats.delete(k); return false; }
    const c = (this.repeats.get(k) ?? 0) + 1;
    this.repeats.set(k, c);
    if (c >= this.repeatLimit) {
      await this.fail('no-effect', { seat, text: `同じ物を ${c} 回押しても進まない: ${actionKey}`, key: `noeffect|${k}` });
      return true;
    }
    return false;
  }

  /**
   * 区切り 3-S: 揺さぶりの確かめ（S5・S6 のフォーカスが減ったか）に使う、キャラの数の写し（読むだけ。頭には渡さない）。
   * 部屋に入っている最初の端末の状態の写し（__online.game()）から、キャラごとの id・席・HP・フォーカスだけを返す。読めなければ null
   */
  async heroes() {
    for (const d of this.devices) {
      if (d.page.isClosed()) continue;
      const hs = await withTimeout(d.page
        .evaluate(() => {
          try {
            const g = window.__online?.game();
            return g?.heroes ? g.heroes.map((h) => ({ id: h.id, playerId: h.playerId, hp: h.hp, focus: h.focus })) : null;
          } catch {
            return null;
          }
        }), 15000, `heroes ${d.seat}`)
        .catch(() => null);
      if (hs) return hs;
    }
    return null;
  }

  /**
   * 区切り 4: 節目の保存（計画 §6-3。読むだけ）。ホストの端末の状態の写し（__online.game()）を file に書く。
   * 「場面から」（scenes.mjs）の元にする。返す物: 書いた時 true
   */
  async checkpoint(file, meta = {}) {
    for (const d of this.devices) {
      if (d.page.isClosed()) continue;
      const got = await withTimeout(d.page.evaluate(() => {
        try {
          const o = window.__online;
          if (!o?.isHost?.()) return null;
          return { seq: o.seq(), hash: o.hash(), game: o.game() };
        } catch {
          return null;
        }
      }), 15000, `checkpoint ${d.seat}`).catch(() => null);
      if (!got?.game) continue;
      mkdirSync(file.replace(/[\\/][^\\/]*$/, ''), { recursive: true });
      writeFileSync(file, JSON.stringify({ at: now(), host: d.seat, people: this.devices.length, seq: got.seq, hash: got.hash, ...meta, game: got.game }));
      return true;
    }
    return false;
  }

  /** 区切り 3-S: 席ごとの「ホストか」（S8 の記録。読むだけ） */
  async hostOf() {
    const fps = await this.fingerprints();
    return Object.fromEntries(fps.map((f, i) => [this.devices[i].seat, f.ready ? !!f.isHost : null]));
  }

  /** 部屋に入る前に使う: 少し待つ（審判が見張る間隔） */
  pause(ms = 200) {
    return wait(ms);
  }
}
