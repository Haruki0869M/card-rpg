// 観点5: スマホの親指の届きやすさと、指で隠れる所（390×844）。ボタンの位置と大きさを測り、親指の届く範囲の目安を重ねて撮る
// 親指の範囲の目安（提案）: 右手で持って、右下の角から半径 300px を「楽に届く」、300〜420px を「伸ばせば届く」、それより遠い所を「持ち直す」
import { writeFile } from 'node:fs/promises';
import { start, OUT } from './rec.mjs';
const r = await start('v5-thumb');
const { page, beat, shot, text, note, tap, tryTap, newGame, edit } = r;
const zone = (x, y) => { const d = Math.hypot(390 - x, 844 - y); const dl = Math.hypot(x, 844 - y); return { right: d <= 300 ? '楽' : d <= 420 ? '伸ばす' : '持ち直す', left: dl <= 300 ? '楽' : dl <= 420 ? '伸ばす' : '持ち直す' }; };
const overlay = (on) => page.evaluate((on) => {
  document.getElementById('__thumb')?.remove();
  if (!on) return;
  const c = document.createElement('canvas'); c.id = '__thumb'; c.width = 390; c.height = 844;
  c.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none';
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,200,0,.13)'; g.beginPath(); g.arc(390, 844, 420, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,255,120,.16)'; g.beginPath(); g.arc(390, 844, 300, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(0,255,120,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(390, 844, 300, Math.PI, 1.5 * Math.PI); g.stroke();
  g.strokeStyle = 'rgba(255,200,0,.8)'; g.beginPath(); g.arc(390, 844, 420, Math.PI, 1.5 * Math.PI); g.stroke();
  g.font = 'bold 12px sans-serif'; g.fillStyle = '#7f7'; g.fillText('右手の親指: 楽に届く', 200, 600); g.fillStyle = '#fd5'; g.fillText('伸ばせば届く', 40, 500);
  document.documentElement.appendChild(c);
}, on);
const measure = async (label, sels) => {
  const out = [];
  for (const [name, sel] of sels) {
    const rs = [];
    for (const l of await page.locator(sel).all()) { if (!(await l.isVisible())) continue; const r = await l.boundingBox(); if (r) rs.push({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }); }
    for (const b of rs.slice(0, 5)) { const z = zone(b.x + b.w / 2, b.y + b.h / 2); out.push({ 場面: label, 物: name, ...b, 右手: z.right, 左手: z.left }); }
  }
  console.table(out);
  return out;
};
const all = [];
await newGame({ n: 2, seats: 'solo' });
await tryTap(page.getByText('つづける'));
await overlay(true); await beat(800); await shot('01-world-zone');
all.push(...await measure('世界マップ', [['移動力の判定', 'button:has-text("移動力の判定")'], ['手番を終える/待機', 'button:has-text("待機"), button:has-text("手番を終える")'], ['野営', 'button:has-text("野営")'], ['メニュー', '[aria-label="メニュー"]'], ['依頼', '[aria-label="依頼"], button:has-text("依頼")'], ['フォーカス＋', '[aria-label="フォーカスを増やす"]']]));
await overlay(false);
await edit((g) => { const w = g.world; const t = w.tiles.findIndex((x) => x.f && x.f.kind === 'dungeon' && x.f.id === 'emeraldTemple'); for (const id of Object.keys(w.pos)) w.pos[id] = t; w.story = undefined; });
await tap(page.getByText('翠の神殿に入る'), 1200);
await tryTap(page.getByText('探索力の判定'), 1300);
await overlay(true); await beat(600); await shot('02-dungeon-zone');
all.push(...await measure('ダンジョン', [['扉を開ける', 'button:has-text("扉を開ける")'], ['前進・左右', 'button:has-text("前進"), button:has-text("左へ"), button:has-text("右へ")'], ['手番を終える', 'button:has-text("手番を終える")'], ['撤退', 'button:has-text("撤退")']]));
await overlay(false);
await tap(page.getByRole('button', { name: /^扉を開ける/ }), 2600);
await overlay(true); await beat(500); await shot('03-battle-zone');
all.push(...await measure('戦闘', [['ターン終了', 'button:has-text("ターン終了")'], ['手札のカード', '[data-card-index]'], ['敵', '[data-enemy]'], ['敵の予告', '[data-intent]'], ['味方の欄', '[data-ally]'], ['メニュー', '[aria-label="メニュー"]']]));
await overlay(false);
// カードを押す → 発動のボタン・フォーカス・敵を選ぶ
await tap(page.locator('[data-card-index]').first(), 700);
await overlay(true); await beat(500); await shot('04-card-panel-zone');
all.push(...await measure('カードを選んだ後', [['発動', 'button:has-text("発動")'], ['フォーカス＋', '[aria-label="フォーカスを増やす"]'], ['フォーカス－', '[aria-label="フォーカスを減らす"]'], ['やめる(×)', '[aria-label="選択をやめる"], [aria-label="閉じる"]'], ['敵', '[data-enemy]']]));
await overlay(false);
// 指で隠れる所: 敵をタップする時の指（下から来る）の影を描く
const enemy = await page.locator('[data-enemy]').first().boundingBox();
const tapAt = { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height * 0.45 };
await page.evaluate(({ x, y }) => {
  const c = document.createElement('canvas'); c.id = '__finger'; c.width = 390; c.height = 844; c.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none';
  const g = c.getContext('2d'); g.fillStyle = 'rgba(255,170,140,.55)';
  g.beginPath(); g.ellipse(x, y + 10, 18, 24, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(x - 18, y + 10); g.lineTo(x + 40, 844); g.lineTo(x + 110, 844); g.lineTo(x + 18, y + 10); g.fill();
  document.documentElement.appendChild(c);
}, tapAt);
await beat(400); await shot('05-finger-on-enemy');
const hidden = await page.evaluate(({ x, y }) => [...document.querySelectorAll('[data-intent], [data-hp], [data-enemy-info]')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; return { what: e.matches('[data-intent]') ? '予告' : e.matches('[data-hp]') ? 'HP' : '名前・HP', y: Math.round(cy), underFinger: cy > y - 10 && Math.abs(cx - x) < 60 }; }), tapAt);
note(`敵をタップする時の指の位置 ${JSON.stringify(tapAt)}: ${JSON.stringify(hidden)}`);
await page.evaluate(() => document.getElementById('__finger')?.remove());
await tap(page.locator('[data-enemy]').first(), 700);
await shot('06-target-picked');
// 余白（押し間違い）: ターン終了と最後のカード、発動と＋の間
const gaps = await page.evaluate(() => {
  const R = (s) => document.querySelector(s)?.getBoundingClientRect();
  const end = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('ターン終了'))?.getBoundingClientRect();
  const cards = [...document.querySelectorAll('[data-card-index]')].map((e) => e.getBoundingClientRect());
  const fire = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('発動'))?.getBoundingClientRect();
  const plus = R('[aria-label="フォーカスを増やす"]');
  const last = cards.sort((a, b) => b.bottom - a.bottom)[0];
  return { "ターン終了と手札の縦の隙間": end && last ? Math.round(end.top - last.bottom) : null, "発動とフォーカス＋の縦の隙間": fire && plus ? Math.round(plus.top - fire.bottom) : null, "カードの幅": cards[0] ? Math.round(cards[0].width) : null, "重なったカードの見える幅": cards.length > 1 ? Math.round(Math.abs(cards[1].left - cards[0].left)) : null };
});
note(`余白: ${JSON.stringify(gaps)}`);
await writeFile(`${OUT}/v5-thumb-measure.json`, JSON.stringify(all, null, 1));
await r.finish({ gaps });
