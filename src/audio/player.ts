// ===== 音を鳴らす部品（K6・Web Audio API） =====
// src/assets/audio/<sfx|bgm|pet>/<ID>.<mp3|ogg|m4a|wav> を置くだけで鳴る。無い音は何もしない（エラーも出さない）。
// 決まり: ゲームの状態・乱数（Rng）・保存・オンラインの同期には一切触れない。ここから store や engine を読まない。

import type { BgmId, SoundId } from './ids';
import { PRELOAD_IDS } from './ids';
import { createLimiter } from './limiter';

const files = import.meta.glob('../assets/audio/**/*.{mp3,ogg,m4a,wav}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const name = path.replace(/^.*\//, '').replace(/\.[a-z0-9]+$/, '');
  // 同じ名前で形式が複数ある時は、最初に見つかった物（mp3 を推奨）
  if (!URLS[name]) URLS[name] = url;
}

/** その音のファイルがあるか */
export const hasSound = (id: string): boolean => id in URLS;

/** 音量（0〜1）。設定画面の 0〜10 を割った値 */
let volumes = { sfx: 0.7, bgm: 0.5 };
/** 他の人の操作の音は約 −4dB（0.63倍） */
export const QUIET_GAIN = 0.63;
/** 読み込みがこれより遅れたら、その回は鳴らさない（遅れて鳴ると変なので） */
const LATE_MS = 250;

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let sfxBus: GainNode | null = null;
let bgmBus: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
const failed = new Set<string>();
const limiter = createLimiter();
let warned = false;

function warnOnce(e: unknown) {
  if (warned || !import.meta.env?.DEV) return;
  warned = true;
  console.warn('[audio] 音の読み込みに失敗しました（ゲームは続けられます）', e);
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function load(id: string): Promise<AudioBuffer | null> {
  const url = URLS[id];
  if (!url || !ctx || failed.has(id)) return Promise.resolve(null);
  const hit = buffers.get(id);
  if (hit) return Promise.resolve(hit);
  let p = loading.get(id);
  if (!p) {
    const c = ctx;
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
      .then((b) => c.decodeAudioData(b))
      .then((buf) => { buffers.set(id, buf); return buf; })
      .catch((e) => { failed.add(id); warnOnce(e); return null; })
      .finally(() => loading.delete(id));
    loading.set(id, p);
  }
  return p;
}

function start(id: string, buf: AudioBuffer, gain: number) {
  if (!ctx || !sfxBus || ctx.state !== 'running') return;
  if (!limiter.tryStart(id, now(), buf.duration * 1000)) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (gain !== 1) {
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g).connect(sfxBus);
    } else src.connect(sfxBus);
    src.start();
  } catch (e) {
    warnOnce(e);
  }
}

export interface PlayOptions {
  /** 他の人の操作の音（少し小さく） */
  quiet?: boolean;
}

/** 効果音・鳴き声・ジングルを1回鳴らす。ファイルが無い・音がまだ使えない・音量0なら何もしない */
export function playSound(id: SoundId | undefined, opts: PlayOptions = {}): void {
  if (!id || !ctx || volumes.sfx <= 0 || !URLS[id] || failed.has(id)) return;
  const gain = opts.quiet ? QUIET_GAIN : 1;
  const buf = buffers.get(id);
  if (buf) { start(id, buf, gain); return; }
  const asked = now();
  void load(id).then((b) => { if (b && now() - asked <= LATE_MS) start(id, b, gain); });
}

/** 続けて鳴らす（同じコマの音）。同じ音は1回にまとめる */
export function playSounds(ids: readonly (SoundId | undefined)[] | undefined, opts: PlayOptions = {}): void {
  if (!ids?.length) return;
  for (const id of new Set(ids)) playSound(id, opts);
}

// ---------- BGM（K6②で場面とつなぐ。仕組みだけ先に用意） ----------
let bgmId: BgmId | null = null;
let bgmWanted: BgmId | null = null;
let bgmSource: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
const FADE = 1;

function stopCurrentBgm() {
  if (!bgmSource || !ctx) { bgmSource = null; return; }
  const { src, gain } = bgmSource;
  try {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
    src.stop(ctx.currentTime + FADE + 0.05);
  } catch { /* すでに止まっている */ }
  bgmSource = null;
}

/** 場面の曲を流す（ループ）。同じ曲なら何もしない。null で止める。ファイルが無ければ無音 */
export function playBgm(id: BgmId | null): void {
  bgmWanted = id;
  if (id === bgmId) return;
  bgmId = id;
  stopCurrentBgm();
  if (!id || !ctx || !URLS[id]) return;
  void load(id).then((buf) => {
    if (!buf || !ctx || !bgmBus || bgmId !== id) return;
    try {
      const src = ctx.createBufferSource(), gain = ctx.createGain();
      src.buffer = buf; src.loop = true;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE);
      src.connect(gain).connect(bgmBus);
      src.start();
      bgmSource = { src, gain };
    } catch (e) { warnOnce(e); }
  });
}

// ---------- 音量・有効化 ----------

function applyVolumes() {
  if (!ctx) return;
  sfxBus?.gain.setValueAtTime(volumes.sfx, ctx.currentTime);
  bgmBus?.gain.setValueAtTime(volumes.bgm, ctx.currentTime);
}

/** 設定の音量（0〜10）を伝える */
export function setAudioVolumes(v: { sfxVolume: number; bgmVolume: number }): void {
  volumes = { sfx: Math.max(0, Math.min(10, v.sfxVolume)) / 10, bgm: Math.max(0, Math.min(10, v.bgmVolume)) / 10 };
  applyVolumes();
}

/** 音が使える状態か（最初のタップの後） */
export const audioReady = (): boolean => !!ctx && ctx.state === 'running';

/** 最初のタップで呼ぶ。ブラウザの決まりで、それまでは音を作れない */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      sfxBus = ctx.createGain(); sfxBus.connect(ctx.destination);
      bgmBus = ctx.createGain(); bgmBus.connect(ctx.destination);
      applyVolumes();
    } catch (e) { ctx = null; warnOnce(e); return; }
    // よく使う短い音を裏で先に読む（ファイルがある物だけ）
    for (const id of PRELOAD_IDS) if (URLS[id]) void load(id);
    if (bgmWanted) { const w = bgmWanted; bgmId = null; playBgm(w); }
  }
  if (ctx.state === 'suspended' && !document.hidden) void ctx.resume().catch(() => undefined);
}

let installed = false;
/** 画面全体で最初のタップを拾って音を有効化し、裏に回ったら止める。1回だけ呼ぶ */
export function installAudioUnlock(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const opts = { capture: true, passive: true } as const;
  // iPhone は touchend で resume できることが多いので、どちらでも試す
  for (const type of ['pointerdown', 'touchend', 'keydown'] as const) window.addEventListener(type, unlockAudio, opts);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { void ctx.suspend().catch(() => undefined); limiter.clear(); }
    else void ctx.resume().catch(() => undefined);
  });
}
