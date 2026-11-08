// ===== 音を鳴らす部品（K6・Web Audio API） =====
// src/assets/audio/<sfx|bgm|pet>/<ID>.<mp3|ogg|m4a|wav> を置くだけで鳴る。無い音は何もしない（エラーも出さない）。
// 決まり: ゲームの状態・乱数（Rng）・保存・オンラインの同期には一切触れない。ここから store や engine を読まない。

import type { BgmId, SoundId } from './ids';
import { PRELOAD_IDS } from './ids';
import { createLimiter } from './limiter';

const files = import.meta.glob('../assets/audio/**/*.{aac,webm,ogg,m4a,mp3,wav}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** 同じ名前で形式が複数ある時に試す順（小さい形式から。解読できない端末では次の形式を使う） */
const FORMAT_ORDER = ['aac', 'webm', 'ogg', 'm4a', 'mp3', 'wav'];
const URLS: Record<string, string[]> = {};
for (const [path, url] of Object.entries(files)) {
  const name = path.replace(/^.*\//, '').replace(/\.[a-z0-9]+$/, '');
  (URLS[name] ??= []).push(url);
}
const ext = (u: string) => (u.match(/\.([a-z0-9]+)(\?|$)/)?.[1] ?? '');
for (const list of Object.values(URLS)) list.sort((a, b) => FORMAT_ORDER.indexOf(ext(a)) - FORMAT_ORDER.indexOf(ext(b)));

/** その音のファイルがあるか */
export const hasSound = (id: string): boolean => id in URLS;

/** 音量（0〜1）。設定画面の 0〜10 を割った値 */
let volumes = { sfx: 0.5, bgm: 0.4, pet: 0.3 };
/** 同じお供の鳴き声は、続けて鳴らす時に3秒空ける（高い声が続くとしんどいので） */
const PET_GAP_MS = 3000;
/** 他の人の操作の音は約 −4dB（0.63倍） */
export const QUIET_GAIN = 0.63;
/** 読み込みがこれより遅れたら、その回は鳴らさない（遅れて鳴ると変なので） */
const LATE_MS = 250;

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let sfxBus: GainNode | null = null;
let bgmBus: GainNode | null = null;
let petBus: GainNode | null = null;
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
  const urls = URLS[id];
  if (!urls || !ctx || failed.has(id)) return Promise.resolve(null);
  const hit = buffers.get(id);
  if (hit) return Promise.resolve(hit);
  let p = loading.get(id);
  if (!p) {
    const c = ctx;
    // 形式を順に試す（例: iPhone で webm が解読できなければ mp3）
    const tryAt = (i: number): Promise<AudioBuffer> => fetch(urls[i])
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
      .then((b) => c.decodeAudioData(b))
      .catch((e) => (i + 1 < urls.length ? tryAt(i + 1) : Promise.reject(e)));
    p = tryAt(0)
      .then((buf) => { buffers.set(id, buf); return buf; })
      .catch((e) => { failed.add(id); warnOnce(e); return null; })
      .finally(() => loading.delete(id));
    loading.set(id, p);
  }
  return p;
}

const isPet = (id: string) => id.startsWith('pet_');

function start(id: string, buf: AudioBuffer, gain: number) {
  const bus = isPet(id) ? petBus : sfxBus;
  if (!ctx || !bus || ctx.state !== 'running') return;
  if (!limiter.tryStart(id, now(), buf.duration * 1000, isPet(id) ? PET_GAP_MS : undefined)) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (gain !== 1) {
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g).connect(bus);
    } else src.connect(bus);
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
  if (!id || !ctx || (isPet(id) ? volumes.pet : volumes.sfx) <= 0 || !URLS[id] || failed.has(id)) return;
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

// ---------- BGM ----------
// 曲は長いので、全部を解読して持つと 1曲で 40〜100MB になり、スマホが重くなる。
// そこで audio 要素で少しずつ読みながら流し（ストリーミング）、Web Audio の音量・フェードを通す。
// audio 要素はコードの中だけで作り、画面には置かない（保存のボタン・ダウンロードの機能は無い。OpenTracks の規約）。
/**
 * 曲のつなぎ方。seamless = 継ぎ目なくループする曲（ループ版）、crossfade = ループ用でない曲を、
 * 終わりの2秒を次の頭と重ねてつなぐ、once = 1回だけ流す（エンディング）
 */
export type BgmLoop = 'seamless' | 'crossfade' | 'once';
interface Deck { el: HTMLAudioElement; gain: GainNode; token: number; onTime: (() => void) | null }
let bgmId: BgmId | null = null;
let bgmWanted: { id: BgmId; loop: BgmLoop } | null = null;
let decks: Deck[] = [];
let active: Deck | null = null;
/** いちばん最近止めた（フェードアウト中の）audio 要素。次の曲はもう一方で始める */
let fading: Deck | null = null;
const FADE = 1;
const XFADE = 2;
/** iPhone は、タップの中で一度鳴らした audio 要素でないと、あとで鳴らせない。そのための無音 */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
const MIME: Record<string, string> = { aac: 'audio/aac', webm: 'audio/webm', ogg: 'audio/ogg', m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav' };

/** 最初のタップの中で呼ぶ: 曲用の audio 要素を2つ作り、Web Audio につなぐ（2つ = 曲を重ねてつなぐため） */
function makeDecks() {
  if (!ctx || !bgmBus || decks.length || typeof Audio === 'undefined') return;
  for (let k = 0; k < 2; k++) {
    try {
      const el = new Audio();
      el.preload = 'auto';
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(el).connect(gain).connect(bgmBus);
      el.src = SILENT;
      void el.play().then(() => el.pause()).catch(() => undefined);
      decks.push({ el, gain, token: 0, onTime: null });
    } catch (e) { warnOnce(e); }
  }
}

function bgmUrl(id: BgmId): string | undefined {
  const urls = URLS[id];
  if (!urls?.length) return undefined;
  const probe = decks[0]?.el;
  return urls.find((u) => !probe || probe.canPlayType(MIME[ext(u)] ?? '') !== '') ?? urls[0];
}

function fadeDeck(d: Deck, dur: number) {
  if (!ctx) return;
  const t = ctx.currentTime, token = d.token;
  if (d.onTime) { d.el.removeEventListener('timeupdate', d.onTime); d.onTime = null; }
  d.gain.gain.cancelScheduledValues(t);
  d.gain.gain.setValueAtTime(d.gain.gain.value, t);
  d.gain.gain.linearRampToValueAtTime(0, t + dur);
  setTimeout(() => { if (d.token === token) d.el.pause(); }, dur * 1000 + 80);
}

function stopCurrentBgm() {
  if (active) { fadeDeck(active, FADE); fading = active; }
  active = null;
}

/** 空いている方の audio 要素で曲を始める。crossfade なら、終わりの2秒前に次の1回を重ねて始める */
function startDeck(id: BgmId, loop: BgmLoop, fadeIn: number) {
  if (!ctx || !decks.length) return;
  const url = bgmUrl(id);
  if (!url) return;
  const d = decks.find((x) => x !== active && x !== fading) ?? decks.find((x) => x !== active) ?? decks[0];
  d.token++;
  if (d.onTime) d.el.removeEventListener('timeupdate', d.onTime);
  d.onTime = null;
  try {
    if (!d.el.src.endsWith(url)) d.el.src = url;
    d.el.loop = loop === 'seamless';
    d.el.currentTime = 0;
    const t = ctx.currentTime;
    d.gain.gain.cancelScheduledValues(t);
    d.gain.gain.setValueAtTime(0, t);
    d.gain.gain.linearRampToValueAtTime(1, t + fadeIn);
    void d.el.play().catch((e) => { failed.add(id); warnOnce(e); });
    if (loop === 'crossfade') {
      const onTime = () => {
        if (bgmId !== id || active !== d || !(d.el.duration > XFADE * 3)) return;
        if (d.el.currentTime >= d.el.duration - XFADE) { fadeDeck(d, XFADE); fading = d; startDeck(id, loop, XFADE); }
      };
      d.onTime = onTime;
      d.el.addEventListener('timeupdate', onTime);
    }
    active = d;
  } catch (e) { warnOnce(e); }
}

/** 場面の曲を流す。同じ曲なら何もしない。null で止める（1秒でフェード）。ファイルが無ければ無音 */
export function playBgm(id: BgmId | null, loop: BgmLoop = 'seamless'): void {
  bgmWanted = id ? { id, loop } : null;
  if (id === bgmId && (active || !id)) return;
  bgmId = id;
  stopCurrentBgm();
  if (!id || !ctx || !URLS[id] || failed.has(id) || volumes.bgm <= 0) return;
  startDeck(id, loop, FADE);
}

// ---------- 音量・有効化 ----------

function applyVolumes() {
  if (!ctx) return;
  sfxBus?.gain.setValueAtTime(volumes.sfx, ctx.currentTime);
  bgmBus?.gain.setValueAtTime(volumes.bgm, ctx.currentTime);
  petBus?.gain.setValueAtTime(volumes.pet, ctx.currentTime);
}

/** 設定の音量（0〜10）を伝える */
export function setAudioVolumes(v: { sfxVolume: number; bgmVolume: number; petVolume: number }): void {
  const c = (x: number) => Math.max(0, Math.min(10, x)) / 10;
  volumes = { sfx: c(v.sfxVolume), bgm: c(v.bgmVolume), pet: c(v.petVolume) };
  applyVolumes();
  // BGM をオフから戻した時は、今の場面の曲を始める
  if (volumes.bgm > 0 && bgmWanted && !active) { const w = bgmWanted; bgmId = null; playBgm(w.id, w.loop); }
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
      // 耳障りにならないよう、高い音を少しやわらげてから出す（効果音は 6kHz から上を −4dB、鳴き声は 3.5kHz から上を −8dB）
      const soften = (freq: number, db: number) => { const f = ctx!.createBiquadFilter(); f.type = 'highshelf'; f.frequency.value = freq; f.gain.value = db; f.connect(ctx!.destination); return f; };
      sfxBus = ctx.createGain(); sfxBus.connect(soften(6000, -4));
      petBus = ctx.createGain(); petBus.connect(soften(3500, -8));
      bgmBus = ctx.createGain(); bgmBus.connect(ctx.destination);
      applyVolumes();
      makeDecks();
    } catch (e) { ctx = null; warnOnce(e); return; }
    // よく使う短い音を裏で先に読む（ファイルがある物だけ）
    for (const id of PRELOAD_IDS) if (URLS[id]) void load(id);
    if (bgmWanted) { const w = bgmWanted; bgmId = null; playBgm(w.id, w.loop); }
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
    if (document.hidden) { void ctx.suspend().catch(() => undefined); limiter.clear(); active?.el.pause(); }
    else { void ctx.resume().catch(() => undefined); if (active) void active.el.play().catch(() => undefined); }
  });
}
