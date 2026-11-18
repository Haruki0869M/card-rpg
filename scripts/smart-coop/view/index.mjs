// 賢いマルチプレイ検証 bot: 画面を読む（計画 §2-3・直し12）
// 端末ごとに page.evaluate を1回だけ流して、「今の画面」を同じ形（View）で返す。読むのは DOM の字と印だけ。
// 印と字の表は場面ごとのファイル（view/scenes/*.mjs）。1-G の印が入ったら、表だけ差し替える。
// 「読めない画面」（どの画面か分からない）は、黙って待たずに unreadable として返す（呼ぶ側が失敗にする）。
import { SCENE as TITLE } from './scenes/title.mjs';
import { SCENE as SETUP } from './scenes/setup.mjs';
import { SCENE as JOIN } from './scenes/join.mjs';
import { SCENE as LOBBY } from './scenes/lobby.mjs';
import { SCENE as CREATE } from './scenes/create.mjs';
import { SCENE as GAME, MODES, LAYERS, BUSY, WAITS } from './scenes/game.mjs';
import { PART as BATTLE } from './scenes/battle.mjs';
import { PART as REWARD } from './scenes/reward.mjs';
import { PART as CHEST } from './scenes/chest.mjs';
import { PART as DUNGEON } from './scenes/dungeon.mjs';
import { PART as WORLD } from './scenes/world.mjs';
import { PART as TOWN } from './scenes/town.mjs';
import { shortHash, wait } from '../util.mjs';

// 区切り 2-Sa: 遊んでいる間の画面の表に、場面ごとのファイル（戦闘・報酬・宝箱・ダンジョンの部屋）の「押す物」と「読む物」を足す（直し12: 場面ごとに分ける）
for (const part of [BATTLE, REWARD, CHEST, DUNGEON, WORLD, TOWN]) {
  for (const k of Object.keys(part.sel)) if (k in GAME.sel) throw new Error(`押す物の名前がぶつかる: ${k}`);
  for (const k of Object.keys(part.facts)) if (k in GAME.facts) throw new Error(`読む物の名前がぶつかる: ${k}`);
  Object.assign(GAME.sel, part.sel);
  Object.assign(GAME.facts, part.facts);
}

/** 見分ける順（上から）。遊んでいる間の画面を先に（タイトルの字が後ろに残っていても、上の画面を取る） */
export const SCREENS = [GAME, CREATE, LOBBY, JOIN, SETUP, TITLE];
export const SCENES = Object.fromEntries(SCREENS.map((s) => [s.id, s]));

/** ページの中で流す読み取り（引数 T = 表。関数は渡せないので、表は字と数だけ） */
function readPage(T) {
  const vis = (el) => {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01;
  };
  const q = (s) => {
    try {
      return [...document.querySelectorAll(s)];
    } catch {
      return [];
    }
  };
  const textOf = (el) => (el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const textMatch = (el, text, exact) => (exact === false ? textOf(el).includes(text) : textOf(el) === text);
  const visButtons = () => q('button, [role="button"]').filter(vis);
  const match = (d) => {
    if (!d) return false;
    if (d.all && !d.all.every((s) => q(s).some(vis))) return false;
    if (d.any && !d.any.some((s) => q(s).some(vis))) return false;
    if (d.buttons && !d.buttons.some((t) => visButtons().some((b) => textMatch(b, t, d.exact)))) return false;
    return !!(d.all || d.any || d.buttons);
  };
  const root = document.querySelector('[data-app-root]');
  // 画面の種類: 印（1-G の A1）→ 表の順
  let screen = root?.getAttribute('data-screen') || null;
  const screenBy = screen ? 'mark' : 'table';
  if (!screen) for (const s of T.screens) if (match(s.detect)) { screen = s.id; break; }
  let mode = root?.getAttribute('data-mode') || null;
  const modeBy = mode ? 'mark' : 'table';
  if (!mode && screen === 'game') for (const m of T.modes) if (match(m)) { mode = m.id; break; }
  const sceneTab = root?.getAttribute('data-scene') || null;
  const layers = [];
  for (const l of T.layers) {
    if (l.buttons) {
      if (visButtons().some((b) => l.buttons.includes(textOf(b)))) layers.push({ id: l.id });
      continue;
    }
    for (const el of q(l.css).filter(vis)) layers.push({ id: l.id, value: l.value ? el.getAttribute(l.value) : undefined });
  }
  const busy = T.busy.filter((s) => q(s).length > 0);
  const waits = [];
  for (const w of T.waits) for (const el of q(w.css).filter(vis)) { const t = textOf(el); if (t) waits.push({ id: w.id, text: t.slice(0, 80) }); }
  // 今この端末で押せそうな物（見えている物。押せる状態かも）
  const actions = [];
  const seen = new Map();
  const cssOf = (el) => {
    const tag = el.tagName.toLowerCase();
    if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
    const d = [...el.attributes].find((a) => a.name.startsWith('data-') && a.name !== 'data-state');
    if (d) return d.value && d.value.length < 40 && !/["\\]/.test(d.value) ? `${tag}[${d.name}="${d.value}"]` : `${tag}[${d.name}]`;
    if (tag === 'input' && el.placeholder) return `input[placeholder="${el.placeholder}"]`;
    return tag;
  };
  for (const el of q('button, [role="button"], [data-reach], input, select, textarea').filter(vis)) {
    if (actions.length >= 200) break;
    const css = cssOf(el);
    const text = textOf(el).slice(0, 40) || el.getAttribute('aria-label') || '';
    const k = `${css}|${text}`;
    const nth = seen.get(k) ?? 0;
    seen.set(k, nth + 1);
    const r = el.getBoundingClientRect();
    actions.push({
      css,
      text,
      nth,
      enabled: !el.disabled && el.getAttribute('aria-disabled') !== 'true',
      marks: [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => (a.value ? `${a.name}=${a.value.slice(0, 30)}` : a.name)).slice(0, 8),
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    });
  }
  // 場面ごとの読み取り（表の facts）
  const facts = {};
  const sc = T.screens.find((s) => s.id === screen);
  for (const [name, f] of Object.entries(sc?.facts ?? {})) {
    // when = この場面の時だけ読む（区切り 2-Sb: 世界マップのマスは数百あるので、ほかの場面では読まない。時間を抑える）
    if (f.when && !f.when.includes(mode)) continue;
    // hidden: true … 画面の幅で CSS が隠す双子の物（同じ値を2か所に持つ）も読む（値は見えている方と同じ）
    let els = f.hidden ? q(f.sel) : q(f.sel).filter(vis);
    if (f.text !== undefined) els = els.filter((el) => textMatch(el, f.text, f.exact));
    if (f.read === 'count') facts[name] = els.length;
    else if (f.read === 'text') facts[name] = els[0] ? textOf(els[0]) : null;
    else if (f.read === 'texts') facts[name] = els.map(textOf);
    else if (f.read === 'value') facts[name] = els[0]?.value ?? null;
    else if (f.read === 'enabled') facts[name] = els.length ? !els[0].disabled : null;
    else if (f.read === 'rows')
      // 区切り 2-Sa: 行ごとに「印の値・字・中の物」を読む（敵・味方・手札・選択肢など。読むのは画面に描かれた物だけ）。
      // sub = { 名前: { sel, read: 'text'|'texts'|'attr'|'attrs'|'count', attr, hidden } }（行の中だけを探す）
      facts[name] = els.map((el) => {
        const r = el.getBoundingClientRect();
        const o = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: textOf(el).slice(0, f.textMax ?? 160) };
        for (const a of f.attrs ?? []) o[a] = el.getAttribute(a);
        for (const [k, s] of Object.entries(f.sub ?? {})) {
          let subs;
          try {
            subs = [...el.querySelectorAll(s.sel)];
          } catch {
            subs = [];
          }
          if (!s.hidden) subs = subs.filter(vis);
          if (s.read === 'count') o[k] = subs.length;
          else if (s.read === 'texts') o[k] = subs.map(textOf);
          else if (s.read === 'attrs') o[k] = subs.map((x) => x.getAttribute(s.attr));
          else if (s.read === 'attr') o[k] = subs[0] ? subs[0].getAttribute(s.attr) : null;
          else o[k] = subs[0] ? textOf(subs[0]) : null;
        }
        return o;
      });
    else if (f.read === 'attrs')
      // 区切り 2-Sb: 印の値だけ（位置は測らない。マスのように数が多い物を軽く読む）
      facts[name] = els.map((el) => {
        const o = {};
        for (const a of f.attrs ?? []) o[a] = el.getAttribute(a);
        return o;
      });
    else if (f.read === 'marks')
      // 印の値と、画面の上の真ん中の位置（人が「光るマスが目的地の輪に近い」と見るのと同じ。読むのは画面に描かれた物だけ）
      facts[name] = els.map((el) => {
        const r = el.getBoundingClientRect();
        const o = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        for (const a of f.attrs ?? []) o[a] = el.getAttribute(a);
        return o;
      });
  }
  return {
    url: location.href,
    screen,
    screenBy,
    mode,
    modeBy,
    sceneTab,
    layers,
    busy,
    waits,
    actions,
    facts,
    low: root?.hasAttribute('data-low') ?? false,
    textSample: textOf(document.body).slice(0, 200),
  };
}

/** 表を、ページに渡せる形（字と数だけ）にする */
const TABLE = {
  screens: SCREENS.map((s) => ({ id: s.id, detect: s.detect, facts: s.facts })),
  modes: MODES,
  layers: LAYERS,
  busy: BUSY,
  waits: WAITS,
};

/** 画面の指紋（screen＋mode＋layers＋押せる物の一覧）。止まりの検出と「押して変わったか」に使う */
export function sigOf(v) {
  const acts = v.actions.map((a) => `${a.css}|${a.text}|${a.enabled ? 1 : 0}`).join(';');
  return shortHash(`${v.screen}|${v.mode}|${v.layers.map((l) => `${l.id}:${l.value ?? ''}`).join(',')}|${acts}|${v.waits.map((w) => w.text).join(',')}`);
}

/**
 * 端末1台の今の画面を読む。View を返す（計画 §2-3 の形）。
 * unreadable: どの画面か分からない時の理由（null なら読めた）
 */
export async function readView(dev) {
  let v;
  try {
    v = await dev.page.evaluate(readPage, TABLE);
  } catch (e) {
    // 読み込み直しの途中など。ページが無い
    v = { url: dev.page.url(), screen: null, mode: null, layers: [], busy: [], waits: [], actions: [], facts: {}, textSample: '', error: String(e?.message ?? e) };
  }
  const view = { seat: dev.seat, viewport: `${dev.viewport.width}×${dev.viewport.height}`, ...v };
  view.unreadable = !view.screen ? 'どの画面か分からない（場面の印も字も当たらない）' : view.screen === 'game' && !view.mode && !view.layers.length ? '遊んでいる間の場面が分からない' : null;
  view.sig = sigOf(view);
  return view;
}

/** 全端末の画面を読む */
export const readAll = (devices) => Promise.all(devices.map(readView));

/**
 * 読めるまで少し待って読む（読み込み直しの途中・画面が切り替わる途中の一瞬を、読めない画面と取り違えない）。
 * 上限 ms を超えても読めなければ、unreadable のまま返す（呼ぶ側が「読めない画面」の失敗にする。黙って待たない）
 */
export async function readViewSettled(dev, ms = 4000) {
  const t0 = Date.now();
  for (;;) {
    const v = await readView(dev);
    if (!v.unreadable || Date.now() - t0 > ms) return v;
    await wait(250);
  }
}
