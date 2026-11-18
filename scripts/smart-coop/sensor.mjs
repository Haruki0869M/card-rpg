// 賢いマルチプレイ検証 bot: センサー（押す前の3つの検査と、毎ステップの点検。計画 §3・直し・オーナーの返事4）
// ① かぶさり: 押す物の見えている部分に 3×3 の9点 → elementFromPoint。真ん中が別の物・6点以上が別の物 → 失敗。
//    ＋見た目のかぶさり（押しても通り抜ける帯・覆い）が押す物の 25% 以上に重なる → 失敗。
// ② 窓の潰れ: スクロールが要るのに見えている高さが 150px 未満・44px 未満・画面の外 → 失敗。要る要素が描かれているか。
// ③ はみ出し: 横スクロール・画面の外のボタン（毎回）。字の見切れ・12px 未満の字・小さいボタン（その画面を初めて見た時だけ）。
//    「…」で切る決まりの所（truncate・line-clamp）は失敗にせず数える。
// ここで決めるのは「当たったか」だけ。失敗の記録（写真・DOM）は judge.mjs、押すのは press.mjs。
import { layoutIssues } from '../lib.mjs';
import { BANDS, TOASTS, BACKDROPS, WORLD_MAP, HAND_CARD, MIN_STRIP, WINDOWS, COLLAPSE } from './view/scenes/overlays.mjs';

export const TARGET_CFG = { bands: BANDS, toasts: TOASTS, backdrops: BACKDROPS, worldMap: WORLD_MAP, handCard: HAND_CARD, minStrip: MIN_STRIP };

/**
 * ページの中で流す: 押す物 el の検査①。
 * 返す物: { problems: [{ kind, text, by }], point: {x,y}, needPan, rect }
 *   kind: overlap（押せないかぶさり）・cover（見た目のかぶさり）・toast（お知らせが乗っている。消えるのを待つ）・offscreen・disabled・strip（手札の押せる幅）
 */
export function checkTargetInPage(el, C) {
  const q = (s) => { try { return [...document.querySelectorAll(s)]; } catch { return []; } };
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01; };
  const describe = (t) => {
    if (!t) return '（何も無い）';
    const d = [...(t.attributes ?? [])].filter((a) => a.name.startsWith('data-')).map((a) => a.name).slice(0, 2).join(' ');
    const txt = (t.innerText ?? t.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 20);
    return `${t.tagName?.toLowerCase()}${d ? ` ${d}` : ''}${t.className && typeof t.className === 'string' ? ` .${t.className.split(' ').slice(0, 2).join('.')}` : ''}${txt ? ` 「${txt}」` : ''}`;
  };
  const problems = [];
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') problems.push({ kind: 'disabled', text: '押せない状態（disabled）' });
  const r0 = el.getBoundingClientRect();
  // 見えている部分 = 画面と、はみ出しを切る親（スクロールの窓・overflow hidden）で切った四角
  let L = Math.max(r0.left, 0), T = Math.max(r0.top, 0), R = Math.min(r0.right, innerWidth), B = Math.min(r0.bottom, innerHeight);
  for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    const pr = p.getBoundingClientRect();
    if (cs.overflowX !== 'visible') { L = Math.max(L, pr.left); R = Math.min(R, pr.right); }
    if (cs.overflowY !== 'visible') { T = Math.max(T, pr.top); B = Math.min(B, pr.bottom); }
  }
  // 手札: わざと重ねて並べる。右に重なる次のカードの左の端までを「見えている左の帯」とする
  if (el.matches(C.handCard)) {
    const next = q(C.handCard).filter((c) => c !== el && vis(c)).map((c) => c.getBoundingClientRect()).filter((c) => c.left > r0.left + 1 && Math.abs(c.top - r0.top) < 30).sort((a, b) => a.left - b.left)[0];
    if (next) R = Math.min(R, next.left);
    if (R - L < C.minStrip) problems.push({ kind: 'strip', text: `手札の押せる幅が ${(R - L).toFixed(0)}px（${C.minStrip}px より狭い）` });
  }
  if (R - L < 1 || B - T < 1) {
    problems.push({ kind: 'offscreen', text: `押す物が画面（か窓）の外 ${Math.round(r0.left)},${Math.round(r0.top)},${Math.round(r0.right)},${Math.round(r0.bottom)}` });
    return { problems, point: null, needPan: false, rect: [r0.left, r0.top, r0.right, r0.bottom] };
  }
  const own = (t) => !!t && (t === el || el.contains(t));
  const map = el.closest(C.worldMap);
  const xs = [L + (R - L) / 6, L + (R - L) / 2, L + ((R - L) * 5) / 6];
  const ys = [T + (B - T) / 6, T + (B - T) / 2, T + ((B - T) * 5) / 6];
  let bad = 0, centerBad = false, centerBy = null, panReason = null, needPan = false;
  for (const y of ys) for (const x of xs) {
    const t = document.elementFromPoint(x, y);
    let ok = own(t);
    // 世界マップの中の物（駒・お供・敵・札）は、地図がタップを受けるので当たりにしない
    if (!ok && map && t && map.contains(t)) ok = true;
    if (!ok && map && t && !map.contains(t)) panReason = describe(t);
    const center = x === xs[1] && y === ys[1];
    if (!ok) { bad++; if (center) { centerBad = true; centerBy = describe(t); } }
  }
  if (centerBad || bad >= 6) {
    // 地図のマスに地図の外の物が乗っている → 失敗ではなく、地図を動かす（呼ぶ側。4回で出せなければ失敗）
    if (map && panReason) needPan = true;
    else problems.push({ kind: 'overlap', text: `押す物の上に別の物が乗っている（真ん中: ${centerBad ? centerBy : '押せる'}・9点のうち ${bad} 点）`, by: centerBy });
  }
  // 見た目のかぶさり: 押しても通り抜ける帯・覆いが、見えている部分の 25% 以上に重なる
  const area = (R - L) * (B - T);
  for (const sel of C.bands) for (const b of q(sel)) {
    if (!vis(b) || b.contains(el) || el.contains(b)) continue;
    const br = b.getBoundingClientRect();
    const w = Math.min(R, br.right) - Math.max(L, br.left), h = Math.min(B, br.bottom) - Math.max(T, br.top);
    if (w <= 0 || h <= 0) continue;
    const share = (w * h) / area;
    if (share < 0.25) continue;
    // 帯が押す物より「上」に描かれている時だけ数える（下に隠れている帯は、見た目をふさがない）。
    // 重なりの真ん中で、帯を一瞬だけ「当たる」状態にして elementFromPoint で一番上を見る（同じ処理の中で元に戻す。描き直しも操作も起きない）
    const cx = (Math.max(L, br.left) + Math.min(R, br.right)) / 2, cy = (Math.max(T, br.top) + Math.min(B, br.bottom)) / 2;
    const prevPE = b.style.getPropertyValue('pointer-events'), prevPri = b.style.getPropertyPriority('pointer-events');
    b.style.setProperty('pointer-events', 'auto', 'important');
    const top = document.elementFromPoint(cx, cy);
    if (prevPE) b.style.setProperty('pointer-events', prevPE, prevPri); else b.style.removeProperty('pointer-events');
    if (!(top && (top === b || b.contains(top)))) continue;
    // 地図のマスに、地図の外の帯（下のパネル・マスの説明の帯）が乗っている → 失敗ではなく地図を動かす（上と同じ例外）
    if (map && !map.contains(b)) { needPan = true; continue; }
    problems.push({ kind: C.toasts.some((s) => b.matches(s)) ? 'toast' : 'cover', text: `帯・覆い（${sel}）が押す物の ${Math.round(share * 100)}% に重なる`, by: sel });
  }
  return { problems, point: { x: xs[1], y: ys[1] }, needPan, rect: [L, T, R, B] };
}

/** ページの中で流す: 押す物の四角（止まるのを待つのに使う） */
export const rectInPage = (el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 2) / 2); };

/**
 * ページの中で流す: 押す物が、スクロールできる窓の中で見えていなければ、その窓（overflow auto・scroll の親）だけをスクロールする。
 * overflow hidden の親は、人が指で送れないので動かさない（隠れていたら、センサーが「画面の外」として当てる）。動かしたら true
 */
export function revealInPage(el) {
  let moved = false;
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    const r = el.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) {
      const top = Math.max(pr.top, 0), bottom = Math.min(pr.bottom, innerHeight);
      let dy = 0;
      if (r.top < top) dy = r.top - top - 8;
      else if (r.bottom > bottom) dy = Math.min(r.bottom - bottom + 8, r.top - top - 8);
      if (dy) { const before = p.scrollTop; p.scrollTop += dy; if (p.scrollTop !== before) moved = true; }
    }
    if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) {
      const left = Math.max(pr.left, 0), right = Math.min(pr.right, innerWidth);
      let dx = 0;
      if (r.left < left) dx = r.left - left - 8;
      else if (r.right > right) dx = Math.min(r.right - right + 8, r.left - left - 8);
      if (dx) { const before = p.scrollLeft; p.scrollLeft += dx; if (p.scrollLeft !== before) moved = true; }
    }
  }
  return moved;
}

/**
 * ページの中で流す: 検査②（窓の潰れ・要る要素）。開いている窓ごと。
 * 返す物: [{ kind: 'collapsed', win, text }]
 */
export function checkWindowsInPage({ windows, collapse }) {
  const q = (s, root = document) => { try { return [...root.querySelectorAll(s)]; } catch { return []; } };
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01; };
  const textOf = (e) => (e.innerText ?? e.textContent ?? '').replace(/\s+/g, ' ').trim();
  const out = [];
  for (const w of windows) for (const win of q(w.css).filter(vis)) {
    const wr = win.getBoundingClientRect();
    if (wr.top < -1 || wr.bottom > innerHeight + 1 || wr.left < -1 || wr.right > innerWidth + 1)
      out.push({ kind: 'collapsed', win: w.id, text: `窓が画面の外に出ている（${Math.round(wr.left)},${Math.round(wr.top)},${Math.round(wr.right)},${Math.round(wr.bottom)}・画面 ${innerWidth}×${innerHeight}）` });
    // 縦にスクロールする箱: 表の scroll → 無ければ窓の中で一番大きいスクロールの箱
    let box = null;
    if (w.scroll) box = win.matches(w.scroll) ? win : win.querySelector(w.scroll);
    if (!box) box = [win, ...q('*', win)].filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && vis(e)).sort((a, b) => b.clientHeight - a.clientHeight)[0] ?? null;
    if (box && vis(box)) {
      const br = box.getBoundingClientRect();
      const visH = Math.min(br.bottom, innerHeight, wr.bottom) - Math.max(br.top, 0, wr.top);
      const needs = box.scrollHeight > box.clientHeight + 1;
      if (needs && visH < collapse.minScrollable) out.push({ kind: 'collapsed', win: w.id, text: `スクロールが要るのに、見えている高さが ${Math.round(visH)}px（${collapse.minScrollable}px 未満）` });
      else if (visH < collapse.minAny && textOf(box)) out.push({ kind: 'collapsed', win: w.id, text: `見えている高さが ${Math.round(visH)}px（ボタン1つ分も無い）` });
    }
    // 窓の上に、窓の外の物が乗っていないか（covered のある窓だけ）: 見えている部分に 5×5 の点を取り、一番上の要素が窓の中でも、
    // 「上に出てよい物」でもない点が 2 つ以上 → 失敗（押しても通り抜ける飾りは elementFromPoint に出ないので数えない）
    if (w.covered) {
      const L = Math.max(wr.left, 0), T = Math.max(wr.top, 0), R = Math.min(wr.right, innerWidth), B = Math.min(wr.bottom, innerHeight);
      const by = new Map();
      let bad = 0;
      for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) {
        const t = document.elementFromPoint(L + ((R - L) * (k + 0.5)) / 5, T + ((B - T) * (i + 0.5)) / 5);
        if (!t || win.contains(t) || w.covered.above.some((s) => t.closest(s))) continue;
        bad++;
        const name = (t.closest('[data-online-overlay] > *, [data-turn-lock], [data-world-panel]') ?? t);
        const label = `${name.tagName.toLowerCase()}「${textOf(name).slice(0, 20)}」`;
        by.set(label, (by.get(label) ?? 0) + 1);
      }
      if (bad >= 2) out.push({ kind: 'collapsed', win: w.id, text: `窓の上に、窓の外の物が乗っている（25点のうち ${bad} 点: ${[...by.keys()].join('・')}）` });
    }
    // 要る要素が描かれているか
    for (const req of w.required ?? []) {
      const find = (s) => { const inWin = win.matches(s) ? [win] : q(s, win); return inWin.length ? inWin : q(s); };
      if (req.anyOf) {
        if (!req.anyOf.some((s) => find(s).some(vis))) out.push({ kind: 'collapsed', win: w.id, text: `要る物が無い: ${req.label}` });
        continue;
      }
      const els = req.self ? [win] : find(req.css).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      if (els.length < (req.min ?? 1)) { out.push({ kind: 'collapsed', win: w.id, text: `要る物が足りない: ${req.label}（${els.length}・要る数 ${req.min ?? 1}）` }); continue; }
      const e = els[0];
      if (req.text && !textOf(e)) out.push({ kind: 'collapsed', win: w.id, text: `${req.label}の字が空` });
      const r = e.getBoundingClientRect();
      if (req.inView && (r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1)) out.push({ kind: 'collapsed', win: w.id, text: `${req.label}が画面の外` });
      if (req.pressable) {
        const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        // センサーの直し（2026-11-18・区切り 2-Sb）: シートの中の操作で開いた手前の窓（確認の窓「転職する」・転職の専用カード選び など。covered.above の物）が
        // × の上にある時は、× が押せないのが正しい形（手前の窓に答えるまで閉じない）。前は「× の上に別の物」と当てていた（誤検知）。自己テスト: selftest.mjs「シートの上の確認の窓」
        // 確認の窓は、印の無い暗幕（外の枠）の中に印 data-confirm の窓がある形（ConfirmDialog.tsx）。暗幕が × の上にある時も同じ扱い（暗幕の中に「上に出てよい物」がある）
        const aboveOk = t && w.covered?.above.some((s) => t.closest(s) || t.querySelector?.(s));
        if (!aboveOk && !(t && (t === e || e.contains(t)))) out.push({ kind: 'collapsed', win: w.id, text: `${req.label}の上に別の物が乗っていて押せない` });
      }
    }
  }
  return out;
}

/**
 * ページの中で流す: 検査③のうち軽い物（毎回）: 横スクロール・画面の外のボタン（スクロールの窓の中は対象外）
 */
export function lightOverflowInPage(vw) {
  const out = [];
  const de = document.documentElement;
  // 端末の幅 vw と比べる（スマホの形では、中身が広いとページが縮んで innerWidth も広がるため）
  const w = vw ?? innerWidth;
  if (de.scrollWidth > w + 1 || innerWidth > w + 1) out.push({ kind: 'overflow', text: `横スクロール（ページの幅 ${Math.max(de.scrollWidth, innerWidth)}px・画面 ${w}px）` });
  const root = document.querySelector('.game-bg') ?? document.body;
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const inScroller = (e) => { for (let p = e.parentElement; p && p !== root; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY)) return true; } return false; };
  for (const e of root.querySelectorAll('button, [data-card-index], [data-enemy], [data-ally]')) {
    if (!vis(e) || inScroller(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1 || r.top < -1)
      out.push({ kind: 'overflow', text: `画面の外のボタン「${(e.textContent ?? '').trim().slice(0, 16)}」` });
  }
  return out;
}

/**
 * ページの中で流す: 検査③のうち重い物（その画面を初めて見た時だけ）の、lib.mjs に無い分:
 * - 字の見切れ: 直に字を持つ要素で、中身が箱より大きく、はみ出しを隠している（overflow hidden・clip）
 *   「…」で切る決まり（text-overflow: ellipsis・line-clamp）は失敗にせず数える
 * - ボタンが、スクロールしない親の箱で 2px より多く切れている
 * 返す物: { problems: [...], ellipsis: [字] }
 */
export function heavyOverflowInPage() {
  const root = document.querySelector('.game-bg') ?? document.body;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01; };
  const problems = [];
  const ellipsis = [];
  for (const e of root.querySelectorAll('*')) {
    if (![...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
    if (!vis(e)) continue;
    const cs = getComputedStyle(e);
    const clipX = /(hidden|clip)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1;
    const clipY = /(hidden|clip)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1;
    if (!clipX && !clipY) continue;
    const t = e.textContent.trim().slice(0, 24);
    const clamp = cs.getPropertyValue('-webkit-line-clamp');
    if (cs.textOverflow === 'ellipsis' || (clamp && clamp !== 'none')) ellipsis.push(t);
    else problems.push({ kind: 'overflow', text: `字の見切れ「${t}」（中身 ${e.scrollWidth}×${e.scrollHeight}・箱 ${e.clientWidth}×${e.clientHeight}）` });
  }
  for (const b of root.querySelectorAll('button')) {
    if (!vis(b)) continue;
    const r = b.getBoundingClientRect();
    for (let p = b.parentElement; p && p !== root.parentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY)) break; // スクロールの窓の中は、送れば見える
      if (!/(hidden|clip)/.test(cs.overflowX + cs.overflowY)) continue;
      const pr = p.getBoundingClientRect();
      const cut = Math.max(pr.left - r.left, r.right - pr.right, pr.top - r.top, r.bottom - pr.bottom);
      if (cut > 2) { problems.push({ kind: 'overflow', text: `ボタン「${b.textContent.trim().slice(0, 16)}」が親の箱で ${Math.round(cut)}px 切れている` }); break; }
    }
  }
  return { problems, ellipsis };
}

/**
 * ページの中で流す: 押した形の小さな縮み（scale 0.9〜1 未満）がかかっていて、縮める前の大きさは 43.5px 以上のボタンの字（先頭 12字。lib.mjs の書き方と同じ）
 */
export function pressedShrinkInPage() {
  const out = [];
  for (const b of document.querySelectorAll('button')) {
    const t = getComputedStyle(b).transform;
    if (!t || t === 'none') continue;
    const m = /^matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+)/.exec(t);
    if (!m) continue;
    const sx = Math.hypot(Number(m[1]), Number(m[2])), sy = Math.hypot(Number(m[3]), Number(m[4]));
    if (!(sx >= 0.9 && sx < 1 && sy >= 0.9 && sy < 1)) continue;
    if (b.offsetWidth >= 43.5 && b.offsetHeight >= 43.5) out.push(b.textContent.slice(0, 12));
  }
  return out;
}

/**
 * ページの中で流す: 親も含めた縮み（transform）で、見えている四角が縮める前の大きさより小さく、縮める前は 43.5px 以上のボタンの字（先頭 12字）
 */
export function shrunkInPage() {
  const out = [];
  for (const b of document.querySelectorAll('button')) {
    if (b.offsetWidth < 43.5 || b.offsetHeight < 43.5) continue;
    const r = b.getBoundingClientRect();
    if (r.width + 0.5 < b.offsetWidth || r.height + 0.5 < b.offsetHeight) out.push(b.textContent.slice(0, 12));
  }
  return out;
}

/**
 * ページの中で流す: 見えない広がり（::before・::after。content があって 43.5px 以上の四角）で、押せる範囲を足してあるボタンの字（先頭 12字）
 */
export function widenedInPage() {
  const out = [];
  for (const b of document.querySelectorAll('button')) {
    for (const pe of ['::before', '::after']) {
      const cs = getComputedStyle(b, pe);
      if (!cs.content || cs.content === 'none' || cs.display === 'none') continue;
      if (parseFloat(cs.width) >= 43.5 && parseFloat(cs.height) >= 43.5) {
        out.push(b.textContent.slice(0, 12));
        break;
      }
    }
  }
  return out;
}

/** 押す物 loc の検査①（node の側）。押す物が途中で消えた時に長く待たない（5秒） */
export const checkTarget = (loc) => loc.evaluate(checkTargetInPage, TARGET_CFG, { timeout: 5000 });

/** 開いている窓の検査②（node の側） */
export const checkWindows = (page) => page.evaluate(checkWindowsInPage, { windows: WINDOWS, collapse: COLLAPSE });

/**
 * はみ出しの検査③（node の側）。heavy = その端末でその画面を初めて見た時（lib.mjs の layoutIssues も流す）
 * 返す物: { problems: [{ kind, text }], ellipsis: [字] }
 */
export async function checkOverflow(page, { heavy }) {
  const problems = await page.evaluate(lightOverflowInPage, page.viewportSize()?.width ?? null);
  let ellipsis = [];
  if (heavy) {
    const h = await page.evaluate(heavyOverflowInPage);
    problems.push(...h.problems);
    ellipsis = h.ellipsis;
    // lib.mjs の layoutIssues（12px 未満の字・小さいボタン・手札の幅・敵味方の大きさ。横スクロールと画面の外は上で見たので除く）
    // センサーの直し（2026-11-18・区切り 1-J）: 押した直後のボタンは、押した形（.btn:active の scale(0.97)）のまま測られることがあり、
    // 44px のボタンが「69×43」「206×43」と当たった。押した形の縮みは、ボタンの大きさ（並べた時の大きさ）ではないので、
    // 自分に小さな縮み（0.9 以上）がかかっていて、縮める前の大きさ（offsetWidth・offsetHeight）が 43.5px 以上のボタンは当たりにしない。
    // 自己テスト: selftest.mjs「押した形の縮みは当たらない」
    const pressed = new Set(await page.evaluate(pressedShrinkInPage).catch(() => []));
    // センサーの直し（2026-11-18・区切り 2-Sa）: 窓が開く時の動き（親の motion.div の scale 0.9 → 1）の途中で測ると、
    // 44px のボタン（取り合いの「欲しい」「余れば」「いらない」）が 42px と当たった。動きの途中の大きさは、人が押す時の形ではない。
    // 親も含めた縮み（見えている四角が、縮める前の大きさ offsetWidth・offsetHeight より小さい）がかかっているボタンだけ、
    // 0.6秒あけてもう1度測り、まだ小さければ当たりにする（ずっと縮んだままの窓は、2回目でも当たる）。
    // 自己テスト: selftest.mjs「窓が開く動きの途中は当たらない」「ずっと縮んだ窓は当たる」
    const shrunk = new Set(await page.evaluate(shrunkInPage).catch(() => []));
    // センサーの直し（2026-11-18・区切り 2-Sa）: 状態の印の「＋N」の札（StatusChips.tsx の MoreChip）は、見た目 22×18px だが、
    // 押せる範囲を見えない広がり（::before の 44×44px）で作ってある。ボタンの四角だけを見ると「小さいボタン」に当たる（誤検知）。
    // ::before が 43.5px 以上の広がりを持つボタンは、押せる範囲が足りているので当たりにしない。
    // 自己テスト: selftest.mjs「見えない広がりで 44px の押せる範囲がある小さい札は当たらない」
    const widened = new Set(await page.evaluate(widenedInPage).catch(() => []));
    let again = null;
    for (const s of await layoutIssues(page)) {
      if (/^(page overflow|offscreen)/.test(s)) continue;
      const m = /^small button: "(.*)" \d+x\d+$/s.exec(s);
      if (m && pressed.has(m[1])) continue;
      if (m && widened.has(m[1])) continue;
      if (m && shrunk.has(m[1])) {
        if (!again) {
          await new Promise((r) => setTimeout(r, 600));
          again = new Set((await layoutIssues(page)).map((x) => /^small button: "(.*)" \d+x\d+$/s.exec(x)?.[1]).filter((x) => x !== undefined));
        }
        if (!again.has(m[1])) continue;
      }
      problems.push({ kind: 'overflow', text: s });
    }
  }
  return { problems, ellipsis };
}
