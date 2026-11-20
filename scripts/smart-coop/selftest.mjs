// 賢いマルチプレイ検証 bot: センサーの自己テスト（計画 §3-7。ゲームもエミュレーターも要らない軽い確認）
// わざと壊した小さな HTML（かぶさり・通り抜ける帯のかぶさり・潰れた窓・横スクロール・字の見切れ・11px の字）で
// 「当たる物に当たり、正しい形に当たらない」事を確かめる。ほかに: 本番に書かない守り（URL・通信）・読めない画面・
// 無理に押さない事・__online を審判だけが使っている事（字で確かめる）。
// 使い方: node scripts/smart-coop/selftest.mjs   または   SMART_MODE=selftest node scripts/smart-online-coop.mjs
import http from 'node:http';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLocalUrl, launchGuardedBrowser, openDevice, SEATS } from './fleet.mjs';
import { checkTarget, checkWindows, checkOverflow } from './sensor.mjs';
import { press, locate } from './press.mjs';
import { readView } from './view/index.mjs';
import { Judge } from './judge.mjs';
import { Conductor } from './conductor.mjs';
import { wait } from './util.mjs';
import { brainChecks } from './brain/selftest-brain.mjs';
import { shakeChecks } from './brain/selftest-shake.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SMART_OUTPUT ?? 'screenshots/smart-coop/selftest';

// ---------- わざと作った画面 ----------
const page = (body, css = '') => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>html,body{margin:0;height:100%;overflow:hidden;font:14px sans-serif;background:#111;color:#eee}
button{width:160px;height:48px;font-size:14px}.abs{position:absolute}${css}</style></head><body>${body}</body></html>`;
const BTN = `<button id="t" class="abs" style="left:40px;top:100px" onclick="window.hits=(window.hits||0)+1">押す物</button>`;
const FIX = {
  // ① かぶさり
  'overlap-bad': page(`${BTN}<div class="abs" style="left:20px;top:80px;width:220px;height:90px;background:#333">上に乗る板</div>`),
  'overlap-good': page(`${BTN}<div class="abs" style="left:20px;top:300px;width:220px;height:90px;background:#333">離れた板</div>`),
  'cover-bad': page(`${BTN}<div data-turn-lock class="abs" style="left:0;top:110px;width:390px;height:60px;background:rgba(0,0,0,.7);pointer-events:none">○○さんの番です</div>`),
  'cover-good': page(`${BTN}<div data-turn-lock class="abs" style="left:0;top:400px;width:390px;height:60px;background:rgba(0,0,0,.7);pointer-events:none">○○さんの番です</div>`),
  // 帯が押す物の「下」に描かれている（物語の窓が下のパネルの上に出る形。2026-11-18 の誤検知）→ 当たらない
  'cover-below': page(`<div data-world-panel class="abs" style="left:0;top:80px;width:390px;height:120px;background:#333;z-index:1">下のパネル</div><div class="abs" style="left:0;top:0;width:390px;height:540px;z-index:5"><button id="t" class="abs" style="left:40px;top:100px" onclick="window.hits=(window.hits||0)+1">つづける</button></div>`),
  'cover-inside': page(`<div data-turn-lock class="abs" style="left:0;top:90px;width:390px;height:80px;background:#222"><button id="t" style="margin:10px 40px" onclick="window.hits=(window.hits||0)+1">帯の中のボタン</button></div>`),
  // 一瞬の当たり: 板が 200ms で消える（show() でもう1度出す）
  // （押す直前に show() を呼ぶ。最初の検査では乗っていて、0.4秒あけた測り直しでは消えている長さ = 450ms）
  // 買った時の字だけのお知らせ（1.2秒で消える。押しても通り抜ける）→ 消えるのを待って押す（区切り 2-Sb の直し）
  'buy-notice': page(`${BTN}<div data-buy-notice="text" id="bn" class="abs" style="left:0;top:90px;width:390px;height:80px;background:rgba(0,0,0,.9);pointer-events:none">上回復薬を買った！</div>
<script>setTimeout(()=>document.getElementById('bn').remove(),1200)</script>`),
  momentary: page(`${BTN}<div id="m" class="abs" style="left:20px;top:80px;width:220px;height:90px;background:#333;display:none">すぐ消える板</div>
<script>function show(){const m=document.getElementById('m');m.style.display='block';setTimeout(()=>m.style.display='none',450)}</script>`),
  // 世界マップ: 地図の中の駒は当たりにしない。地図の外のパネルは「地図を動かす」
  'map-piece': page(`<div data-world-map class="abs" style="left:0;top:0;width:390px;height:540px;background:#123"><button data-reach id="t" class="abs" style="left:100px;top:200px">マス</button><div data-hero class="abs" style="left:110px;top:205px;width:140px;height:40px;background:#a55">駒</div></div>`),
  'map-panel': page(`<div data-world-map class="abs" style="left:0;top:0;width:390px;height:540px;background:#123"><button data-reach id="t" class="abs" style="left:100px;top:450px">マス</button></div><div data-world-panel class="abs" style="left:0;top:420px;width:390px;height:120px;background:#333">下のパネル</div>`),
  // 手札: 重ねて並べる。見えている左の帯の幅
  'hand-bad': page(`<div class="abs" style="left:20px;top:300px"><button data-card-index="0" class="abs" style="left:0;width:100px;height:140px">A</button><button data-card-index="1" class="abs" style="left:30px;width:100px;height:140px">B</button></div>`),
  'hand-good': page(`<div class="abs" style="left:20px;top:300px"><button data-card-index="0" class="abs" style="left:0;width:100px;height:140px">A</button><button data-card-index="1" class="abs" style="left:60px;width:100px;height:140px">B</button></div>`),
  // ② 窓の潰れ
  'sheet-collapsed': page(`<div data-sheet="pouch" class="abs" style="left:0;top:380px;width:390px;height:160px;background:#222;display:flex;flex-direction:column"><button data-sheet-close style="height:48px;width:48px">×</button><div data-sheet-body style="height:100px;overflow-y:auto"><div style="height:600px">長い中身</div></div></div>`),
  'sheet-short-ok': page(`<div data-sheet="pouch" class="abs" style="left:0;top:380px;width:390px;height:160px;background:#222;display:flex;flex-direction:column"><button data-sheet-close style="height:48px;width:48px">×</button><div data-sheet-body style="height:100px;overflow-y:auto"><div style="height:50px">短い中身</div></div></div>`),
  'sheet-good': page(`<div data-sheet="pouch" class="abs" style="left:0;top:100px;width:390px;height:400px;background:#222;display:flex;flex-direction:column"><button data-sheet-close style="height:48px;width:48px">×</button><div data-sheet-body style="height:300px;overflow-y:auto"><div style="height:600px">長い中身</div></div></div>`),
  // 区切り 2-Sb の直し: シートの中の操作で開いた確認の窓が × の上にある（正しい形）／転職の専用カード選び（畳んだ案内は無い形）
  'sheet-confirm-above': page(`<div data-sheet="jobs" class="abs" style="left:0;top:0;width:390px;height:500px;background:#222;display:flex;flex-direction:column"><button data-sheet-close style="height:48px;width:48px">×</button><div data-sheet-body style="height:400px;overflow-y:auto"><div style="height:300px">転職先</div></div><div class="abs" style="left:0;top:0;width:390px;height:500px;background:rgba(0,0,0,.6)"><div data-confirm style="margin-top:300px"><button data-confirm-ok style="height:48px">転職する</button></div></div></div>`),
  'job-pick-ok': page(`<div data-job-pick class="abs" style="left:0;top:0;width:390px;height:500px;background:#0b0910;overflow-y:auto"><button data-pick-card="0" style="height:160px;width:100px">カード</button></div>`),
  // 区切り 3-S の直し: 説明の窓（スクロールする）の中の状態の一覧（ul）は、窓の下に伸びていても画面の外の窓ではない／状態の一覧の窓そのものが外に出ていれば当たる
  'detail-statuslist-ok': page(`<div data-detail-popup class="abs" style="left:8px;top:48px;width:370px;height:400px;overflow-y:auto;background:#222"><div style="height:300px">説明</div><ul data-status-list-body style="height:400px;margin:0">状態</ul></div>`),
  'statuslist-off': page(`<div data-status-list class="abs" style="left:8px;top:400px;width:370px;height:300px;background:#222"><ul data-status-list-body>状態</ul></div>`),
  'sheet-offscreen': page(`<div data-sheet="pouch" class="abs" style="left:0;top:-60px;width:390px;height:400px;background:#222;display:flex;flex-direction:column"><div data-sheet-body style="height:300px;overflow-y:auto"><div style="height:600px">長い中身</div></div></div>`),
  // ③ はみ出し
  'overflow-bad': `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;font:14px sans-serif}</style></head><body>
<div style="width:600px;height:20px;background:#555">横に広すぎる帯</div>
<div style="width:120px;overflow:hidden;white-space:nowrap">とても長い名前のアイテムがここに入って切れてしまう</div>
<div style="font-size:11px">小さい字</div></body></html>`,
  'overflow-good': page(`<div style="width:300px;font-size:14px;padding:8px">ちょうど入る字</div><button style="margin:8px">ボタン</button>`),
  'overflow-ellipsis': page(`<div style="width:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">とても長い名前のアイテムがここに入って切れてしまう</div>`),
  // 画面を読む
  blank: page(''),
  lobby: page(`<div data-testid="room-code">AB12</div><button>作る</button><button>冒険に出発</button>`),
  // イベントの結果の段（選択肢が消えて「先へ進む」だけ）は窓の潰れではない／何も無い窓は潰れ（2026-11-18・区切り 1-J の直し）
  'event-result': page(`<div data-event-panel class="abs" style="left:0;top:100px;width:390px;height:300px;background:#222"><div data-event-window>本文。足早にその場を離れた。</div><button>先へ進む</button></div>`),
  'event-empty': page(`<div data-event-panel class="abs" style="left:0;top:100px;width:390px;height:300px;background:#222"><div data-event-window>本文</div></div>`),
  // 押した形の縮み（.btn:active の scale(0.97)）は小さいボタンではない／本当に 40px のボタンは当たる（2026-11-18・区切り 1-J の直し）
  'pressed-shrink': page(`<button style="position:absolute;left:20px;top:20px;width:206px;height:44px;transform:translateY(2px) scale(0.97)">移動する</button>`),
  'small-real': page(`<button style="position:absolute;left:20px;top:20px;width:206px;height:40px">移動する</button>`),
  // 窓が開く動き（親の scale 0.9 → 1。0.3秒）の途中は小さいボタンではない／ずっと縮んだ窓（親の scale 0.9 のまま）は当たる（2026-11-18・区切り 2-Sa の直し）
  'open-anim': page(`<div id="w" style="position:absolute;left:20px;top:20px"><button style="width:60px;height:44px">欲しい</button></div>`, '@keyframes pop{from{transform:scale(.9)}to{transform:scale(1)}}'),
  // 見えない広がり（::before 44×44px）で押せる範囲を足した 22×18px の札（状態の印の「＋N」と同じ形）は当たらない／広がりの無い 22×18px は当たる（2026-11-18・区切り 2-Sa の直し）
  'widened-chip': page(`<button class="wide" style="position:absolute;left:40px;top:40px;width:22px;height:18px;font-size:12px;padding:0">＋2</button>`, '.wide::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}'),
  'tiny-chip': page(`<button style="position:absolute;left:40px;top:40px;width:22px;height:18px;font-size:12px;padding:0">＋2</button>`),
  'scaled-stay': page(`<div style="position:absolute;left:20px;top:20px;transform:scale(.9)"><button style="width:60px;height:44px">欲しい</button></div>`),
  // シートの上に、シートの外の帯（同行の誘い。押せる物）が乗る（2b5b0f7 の前の重なりの形）／帯がシートの後ろなら当たらない（区切り 1-J で足した検査）
  'sheet-under-band': page(`<div data-sheet="pouch" class="abs" style="left:0;top:0;width:390px;height:540px;background:#222;z-index:50"><button data-sheet-close style="width:48px;height:48px">×</button><div data-sheet-body style="height:400px;overflow-y:auto">中身</div></div><div data-online-overlay class="abs" style="left:0;top:0;width:390px;height:220px;z-index:70;pointer-events:none"><div style="margin-top:106px;height:108px;background:#036;pointer-events:auto">同行に誘っています<button>一緒に行く</button></div></div>`),
  'sheet-over-band': page(`<div data-sheet="pouch" class="abs" style="left:0;top:0;width:390px;height:540px;background:#222;z-index:64"><button data-sheet-close style="width:48px;height:48px">×</button><div data-sheet-body style="height:400px;overflow-y:auto">中身</div></div><div data-online-overlay class="abs" style="left:0;top:0;width:390px;height:220px;z-index:62;pointer-events:none"><div style="margin-top:106px;height:108px;background:#036;pointer-events:auto">同行に誘っています<button>一緒に行く</button></div></div>`),
  // 演出中は測らない（2026-11-18・区切り 1-J の直し）: 歩きの演出の途中に、高さ 43px のボタン（演出の途中の形）。演出の印が消えたら当たる
  'busy-small': page(`<div data-app-root data-screen="game" data-mode="world"><div data-world-map style="height:200px"></div><div id="mv" data-world-moving></div><button style="width:69px;height:43px">P2: 一緒に行く</button></div>`),
};

// ---------- 小さな配り手（127.0.0.1 だけ） ----------
function serve() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const name = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''));
      if (name === 'ping') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('pong'); }
      const html = FIX[name];
      if (!html) { res.writeHead(404); return res.end('no'); }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    srv.listen(0, '127.0.0.1', () => ok(srv));
  });
}

export async function selftest() {
  const results = [];
  const check = (ok, what, detail = '') => {
    results.push({ ok, what });
    console.log(`${ok ? 'OK ' : 'NG '} ${what}${!ok && detail ? ` … ${detail}` : ''}`);
  };

  // ---- 守り(1): URL ----
  const rejects = (u) => { try { assertLocalUrl(u); return false; } catch { return true; } };
  check(rejects('https://card-rpg-1aa60.web.app/?emu=127.0.0.1'), '守り: 本番の URL は動かない');
  check(rejects('http://127.0.0.1:4192/card-rpg/'), '守り: ?emu= が無い URL は動かない');
  check(rejects('http://127.0.0.1:4192/card-rpg/?emu=10.0.0.5'), '守り: ?emu= が手元でない URL は動かない');
  check(rejects('http://example.com/card-rpg/?emu=127.0.0.1'), '守り: ゲームのページが手元でない URL は動かない');
  check(!rejects('http://127.0.0.1:4192/card-rpg/?emu=127.0.0.1&seed=1'), '守り: 手元の URL（?emu=127.0.0.1）は動く');
  check(!rejects('http://localhost:4192/card-rpg/?emu=1'), '守り: localhost の ?emu=1 は動く');

  // ---- 頭（区切り 2-Sa。作り物の説明書きと View で、決まりどおりに選ぶか） ----
  brainChecks(check);
  // ---- 揺さぶり（区切り 3-S。作り物の View で、種と周期・始まり方・確かめが本物の不具合に当たるか） ----
  await shakeChecks(check);
  // ---- 区切り 4: 報酬の「先へ進む」は、待つ枠の席の一覧に自分がいなければ押さない（4人で戦闘に出ていない人） ----
  {
    const { rewardBrain } = await import('./brain/reward.mjs');
    const rv = (seat, voters) => ({ seat, screen: 'game', mode: 'reward', layers: [], waits: [], busy: [], actions: [{ css: '[data-reward-finish]', text: '先へ進む', nth: 0, enabled: true, marks: ['data-reward-finish'], rect: [0, 0, 300, 48] }], facts: { rewardVoteSeats: [{ 'data-vote-seats': 'P1,P2' }], voteStatusSeats: voters, rewardStep: [{ 'data-reward-step': 'finish' }] } });
    const out = rewardBrain(rv('P3', ['P1', 'P2', 'P4']), {});
    const in4 = rewardBrain(rv('P4', ['P1', 'P2', 'P4']), {});
    check(out === null && !!in4, '報酬: 待つ枠の一覧に自分の席が無い人は「先へ進む」を押さない（票に入る人は押す）', JSON.stringify({ out, in4: in4?.what }));
  }
  // ---- 区切り 4: 扉の票のそろえ方（票の多い扉。同じなら席の番号の小さい人の扉。割れていて自分が少ない方なら、そろえ直す） ----
  {
    const { dungeonBrain } = await import('./brain/dungeon.mjs');
    const door = (c, votes, mine) => ({ 'data-door-choice': c, 'data-door-omen': 'battle', 'data-my-vote': mine ? '1' : null, disabled: null, votes });
    const dv = (seat, doors) => ({ seat, screen: 'game', mode: 'dungeon', layers: [], actions: [], waits: [], busy: [], facts: { dDoors: doors, dParty: [] } });
    const a = dungeonBrain(dv('P4', [door('r1c0', 'P2', false), door('r1c1', 'P1', false)]), {});
    const b = dungeonBrain(dv('P4', [door('r1c0', 'P4', true), door('r1c1', 'P1,P2', false)]), {});
    const c = dungeonBrain(dv('P1', [door('r1c0', 'P2', false), door('r1c1', 'P1', true)]), {});
    check(/r1c1/.test(a?.target?.css ?? '') && /r1c1/.test(b?.target?.css ?? '') && c === null, '扉の票: 同じ数なら席の小さい人の扉にそろえる・少ない方に入れていたらそろえ直す・そろえる先の人は待つ', JSON.stringify([a?.what, b?.what, c]));
  }
  // ---- 場面から（区切り 4）: 保存の書き換えが、目当ての隣に立たせ・書き換えた中身を報告の行に出す。無理な時は書き換えずに理由を返す ----
  {
    const { editSave } = await import('./scenes.mjs');
    // 横 5 マスの1列の作り物の地図（隣 = 左右）。歩ける = 2 マス以内
    const bits = {
      classes: [{ id: 'monk', tier: 'mid' }, { id: 'sage', tier: 'special', from: ['monk'], requires: { feat: 'kills', count: 3, text: '3体倒す' }, name: '賢者' }, { id: 'king', tier: 'top', from: ['monk'], name: '拳王' }],
      scourges: [{ id: 'sc', name: '災厄' }],
      neighbors: (w, i) => [i - 1, i + 1].filter((n) => n >= 0 && n < w.tiles.length),
      reachable: (w, from, b) => new Map(w.tiles.map((_, i) => i).filter((i) => Math.abs(i - from) <= b).map((i) => [i, { cost: 1, prev: from }])),
      isRandomDungeonTile: (f) => f?.kind === 'dungeon' && f.id.startsWith('random'),
      heroMaxHp: () => 50,
    };
    const g0 = () => ({ mode: 'world', heroes: [{ id: 'h0', classId: 'monk', hp: 10, level: 3, gold: 0 }, { id: 'h1', classId: 'monk', hp: 10, level: 3, gold: 0 }], world: { pos: { h0: 0, h1: 0 }, turn: 'h1', move: 2, worldTurn: 4, wanderers: [{ id: 'w', tile: 4, scourge: 'sc' }], tiles: [{ seen: true }, { seen: true }, { seen: false, f: { kind: 'temple', id: 't' } }, { seen: false }, { seen: false }] } });
    const sc = editSave(g0(), 'scourge', bits);
    check(!sc.error && sc.game.world.pos.h0 === 3 && sc.game.world.pos.h1 === 3 && sc.game.heroes.every((h) => h.hp === 50) && sc.changes.some((c) => /災厄/.test(c)), '場面から: 災厄の隣に立たせ、HP を満タンにし、書き換えを行に出す', JSON.stringify(sc.changes ?? sc.error));
    const sp = editSave(g0(), 'special', bits);
    check(!sp.error && sp.game.heroes.every((h) => h.level === 5 && h.feats.kills === 3) && [1, 3].includes(sp.game.world.pos.h0), '場面から: 特殊職の直前（Lv5・条件の記録・神殿の隣）', JSON.stringify(sp.changes ?? sp.error));
    const pd = editSave(g0(), 'peddler', bits);
    check(!pd.error && pd.game.world.spawns?.[0]?.kind === 'peddler' && pd.game.heroes.every((h) => h.gold === 300), '場面から: 行商人をキャラの隣に置き、お金を足す', JSON.stringify(pd.changes ?? pd.error));
    const bad = editSave({ ...g0(), mode: 'battle' }, 'scourge', bits);
    check(!!bad.error && !bad.game, '場面から: 世界マップの保存でなければ書き換えない（理由を返す）', JSON.stringify(bad));
    const orig = g0();
    editSave(orig, 'scourge', bits);
    check(orig.world.pos.h0 === 0 && orig.heroes[0].hp === 10, '場面から: 元の保存は書き換えない（写しを書き換える）');
  }

  // ---- __online を使うのは審判だけ（字で確かめる。計画 §2-4 の守り方1） ----
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.mjs')) files.push(p); } };
  walk(HERE);
  files.push(resolve(HERE, '../smart-online-coop.mjs'));
  const rel = (p) => relative(HERE, p).replace(/\\/g, '/');
  const own = rel(fileURLToPath(import.meta.url));
  // 注釈（// と /* */）は除いて、書いてある処理だけを見る
  const code = (p) => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const offenders = (re, allowed) => files.filter((p) => !allowed.includes(rel(p)) && rel(p) !== own && re.test(code(p))).map(rel);
  const o1 = offenders(/__online/, ['judge.mjs', 'scenes.mjs']);
  check(!o1.length, '__online を使うのは judge.mjs（と scenes.mjs）だけ', o1.join(','));
  const o2 = offenders(/\bdispatch\w*\(|\.send\(/, []);
  check(!o2.length, 'dispatch・.send( を使うファイルが無い', o2.join(','));
  const o3 = offenders(/force:\s*true|dispatchEvent|\.click\(/, []);
  check(!o3.length, '無理に押す書き方（force: true・dispatchEvent・.click(）が無い', o3.join(','));

  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await launchGuardedBrowser();
  const dev = await openDevice(browser, SEATS[1]); // P2 390×540
  const p = dev.page;
  const judge = new Judge({ outDir: OUT, devices: [dev] });
  const s = { judge };
  const open = async (name) => { await p.goto(base + name); await wait(50); };
  const target = { css: '#t' };
  const kinds = async () => (await checkTarget(locate(p, target))).problems.map((x) => x.kind);
  try {
    // ---- 守り(2): 手元以外に届かない ----
    await open('overflow-good');
    const net = await p.evaluate(async () => {
      const f = async (u) => { try { await fetch(u, { mode: 'no-cors' }); return 'reached'; } catch { return 'blocked'; } };
      const ws = (u) => new Promise((ok) => { try { const w = new WebSocket(u); w.onopen = () => ok('reached'); w.onerror = () => ok('blocked'); setTimeout(() => ok('timeout'), 4000); } catch { ok('blocked'); } });
      return { local: await f('/ping'), name: await f('http://example.com/'), ip: await f('http://93.184.216.34/'), wsName: await ws('ws://example.com/'), wsIp: await ws('ws://8.8.8.8:80/') };
    });
    check(net.local === 'reached', '守り: 手元（127.0.0.1）には届く', JSON.stringify(net));
    check(net.name === 'blocked' && dev.blocked.some((b) => b.url.includes('example.com')), '守り: 名前の宛先（example.com）は捨てて記録する', JSON.stringify(net));
    check(net.ip === 'blocked', '守り: 数字の宛先（93.184.216.34）にも届かない', JSON.stringify(net));
    check(net.wsName !== 'reached' && net.wsIp !== 'reached', '守り: WebSocket も手元以外に届かない', JSON.stringify(net));

    // ---- ① かぶさり ----
    await open('overlap-bad');
    check((await kinds()).includes('overlap'), '① かぶさり: 上に板が乗ったボタンに当たる');
    await open('overlap-good');
    check(!(await kinds()).length, '① かぶさり: 板が離れていれば当たらない');
    await open('cover-bad');
    check((await kinds()).includes('cover'), '① 見た目のかぶさり: 通り抜ける待ちの帯が半分乗ったボタンに当たる');
    await open('cover-good');
    check(!(await kinds()).length, '① 見た目のかぶさり: 帯が離れていれば当たらない');
    await open('cover-below');
    check(!(await kinds()).length, '① 見た目のかぶさり: 押す物の下に描かれた帯は当たらない');
    await open('cover-inside');
    check(!(await kinds()).length, '① 見た目のかぶさり: 帯の中のボタンは当たらない（例外）');
    await open('map-piece');
    let r = await checkTarget(locate(p, target));
    check(!r.problems.length && !r.needPan, '① 世界マップ: 地図の中の駒が乗ったマスは当たらない（例外）', JSON.stringify(r));
    await open('map-panel');
    r = await checkTarget(locate(p, target));
    check(r.needPan && !r.problems.length, '① 世界マップ: 地図の外のパネルが乗ったマスは「地図を動かす」', JSON.stringify(r));
    await open('hand-bad');
    check((await checkTarget(locate(p, { css: '[data-card-index="0"]' }))).problems.some((x) => x.kind === 'strip'), '① 手札: 見えている左の帯が 43.5px より狭いと当たる');
    await open('hand-good');
    check(!(await checkTarget(locate(p, { css: '[data-card-index="0"]' }))).problems.length, '① 手札: 帯が広ければ当たらない（重ねて並べるのは例外）');

    // ---- 押す: かぶさっていたら押さない・正しい形なら押す・一瞬の当たり ----
    await open('overlap-bad');
    const n0 = judge.failures.length;
    const pr = await press(s, dev, target, { what: '板の下のボタン', expectEffect: false });
    const hits = await p.evaluate(() => window.hits ?? 0);
    check(!pr.pressed && hits === 0 && judge.failures.length === n0 + 1, '押す: 上に板が乗っていたら押さずに失敗を記録する（無理に押さない）', JSON.stringify({ pr, hits }));
    const f = judge.failures.at(-1);
    let evidence = false;
    try { evidence = statSync(`${f.dir}/P2.png`).size > 0 && statSync(`${f.dir}/P2.html`).size > 0 && statSync(`${f.dir}/actions.json`).size > 0; } catch { /* 無い */ }
    check(evidence, '押す: 失敗の時に、写真・DOM・操作の記録を残す', f?.dir);
    await open('overlap-good');
    const pg = await press(s, dev, target, { what: '離れたボタン', expectEffect: false });
    check(pg.pressed && (await p.evaluate(() => window.hits)) === 1, '押す: 正しい形なら、指で1回押す', JSON.stringify(pg));
    await open('buy-notice');
    const nb = judge.failures.length;
    const pb = await press(s, dev, target, { what: '買った時のお知らせの下のボタン', expectEffect: false });
    check(pb.pressed && judge.failures.length === nb, '押す: 買った時の字だけのお知らせは、消えるのを待って押す（区切り 2-Sb の直し）', JSON.stringify({ pb, f: judge.failures.slice(nb).map((x) => x.text) }));
    await open('momentary');
    const n1 = judge.failures.length;
    await p.evaluate(() => window.show());
    const pm = await press(s, dev, target, { what: '一瞬の板', expectEffect: false });
    check(pm.pressed && judge.failures.length === n1 && judge.notes.some((n) => n.kind === 'momentary'), '押す: 一瞬の当たりは写真とメモだけ（1回目は失敗にしない）', JSON.stringify(pm));
    await p.evaluate(() => window.show());
    const pm2 = await press(s, dev, target, { what: '一瞬の板', expectEffect: false });
    check(!pm2.pressed && judge.failures.length === n1 + 1 && judge.failures.at(-1).kind === 'overlap', '押す: 一瞬の当たりが同じ所で2回目なら失敗', JSON.stringify(pm2));

    // ---- ② 窓の潰れ ----
    const win = async () => (await checkWindows(p)).map((x) => x.text);
    await open('sheet-collapsed');
    let w = await win();
    check(w.some((t) => t.includes('スクロールが要るのに')), '② 窓の潰れ: スクロールが要るのに 150px 未満の窓に当たる', w.join('／'));
    await open('sheet-short-ok');
    w = await win();
    check(!w.length, '② 窓の潰れ: 中身が全部入る短い窓は当たらない（オーナーの返事4）', w.join('／'));
    await open('sheet-good');
    w = await win();
    check(!w.length, '② 窓の潰れ: 十分な高さの窓は当たらない', w.join('／'));
    await open('sheet-offscreen');
    w = await win();
    check(w.some((t) => t.includes('画面の外')) && w.some((t) => t.includes('×')), '② 窓の潰れ: 画面の外に出た窓・×が無い窓に当たる', w.join('／'));

    await open('detail-statuslist-ok');
    w = await win();
    check(!w.some((t) => t.includes('status-list') || t.includes('画面の外')), '② 窓の潰れ: 説明の窓の中の状態の一覧（ul が窓の下に伸びる）は当たらない（区切り 3-S の直し）', w.join('／'));
    await open('statuslist-off');
    w = await win();
    check(w.some((t) => t.includes('画面の外')), '② 窓の潰れ: 状態の一覧の窓そのものが画面の外に出ていれば当たる', w.join('／'));
    await open('sheet-confirm-above');
    w = await win();
    check(!w.length, '② 窓の潰れ: シートの中の操作で開いた確認の窓が × の上にあるのは当たらない（区切り 2-Sb の直し）', w.join('／'));
    await open('job-pick-ok');
    w = await win();
    check(!w.length, '② 窓の潰れ: 転職の専用カード選び（畳んだ案内が無い形）は当たらない（区切り 2-Sb の直し）', w.join('／'));

    // ---- ③ はみ出し ----
    await open('overflow-bad');
    let o = await checkOverflow(p, { heavy: true });
    let t = o.problems.map((x) => x.text);
    check(t.some((x) => x.startsWith('横スクロール')), '③ はみ出し: 横スクロールに当たる', t.join('／'));
    check(t.some((x) => x.startsWith('字の見切れ')), '③ はみ出し: 「…」の無い字の見切れに当たる', t.join('／'));
    check(t.some((x) => x.startsWith('small text 11px')), '③ はみ出し: 11px の字に当たる', t.join('／'));
    await open('overflow-good');
    o = await checkOverflow(p, { heavy: true });
    check(!o.problems.length, '③ はみ出し: 正しい形には当たらない', o.problems.map((x) => x.text).join('／'));
    await open('overflow-ellipsis');
    o = await checkOverflow(p, { heavy: true });
    check(!o.problems.length && o.ellipsis.length === 1, '③ はみ出し: わざと「…」で切った字は失敗にせず数える', JSON.stringify(o));

    // ---- シートの上に乗る帯（区切り 1-J で足した検査）----
    await open('sheet-under-band');
    w = await win();
    check(w.some((x) => x.includes('窓の上に、窓の外の物')), '② 窓: シートの上に、シートの外の帯（同行の誘い）が乗っていれば当たる', w.join('／'));
    await open('sheet-over-band');
    w = await win();
    check(!w.length, '② 窓: 帯がシートの後ろ（シートが手前）なら当たらない', w.join('／'));

    // ---- イベントの結果の段・押した形の縮み（区切り 1-J の直し）----
    await open('event-result');
    w = await win();
    check(!w.length, '② 窓の潰れ: イベントの結果の段（「先へ進む」だけ）は当たらない', w.join('／'));
    await open('event-empty');
    w = await win();
    check(w.some((x) => x.includes('要る物が無い')), '② 窓の潰れ: 選択肢もボタンも無いイベントの窓に当たる', w.join('／'));
    await open('pressed-shrink');
    o = await checkOverflow(p, { heavy: true });
    check(!o.problems.some((x) => x.text.startsWith('small button')), '③ はみ出し: 押した形の縮み（scale 0.97）は小さいボタンに当たらない', o.problems.map((x) => x.text).join('／'));
    await open('small-real');
    o = await checkOverflow(p, { heavy: true });
    check(o.problems.some((x) => x.text.startsWith('small button')), '③ はみ出し: 本当に 40px のボタンには当たる', o.problems.map((x) => x.text).join('／'));
    await open('open-anim');
    // 動きを測る直前に始め直す（開いた時の動きが、測る前に終わってしまわないように）
    await p.evaluate(() => { const w = document.getElementById('w'); w.style.animation = 'none'; void w.offsetHeight; w.style.animation = 'pop .4s linear both'; });
    o = await checkOverflow(p, { heavy: true });
    check(!o.problems.some((x) => x.text.startsWith('small button')), '③ はみ出し: 窓が開く動き（親の scale 0.9→1）の途中は当たらない', o.problems.map((x) => x.text).join('／'));
    await open('widened-chip');
    o = await checkOverflow(p, { heavy: true });
    check(!o.problems.some((x) => x.text.startsWith('small button')), '③ はみ出し: 見えない広がりで 44px の押せる範囲がある小さい札は当たらない', o.problems.map((x) => x.text).join('／'));
    await open('tiny-chip');
    o = await checkOverflow(p, { heavy: true });
    check(o.problems.some((x) => x.text.startsWith('small button')), '③ はみ出し: 広がりの無い 22×18px の札は当たる', o.problems.map((x) => x.text).join('／'));
    await open('scaled-stay');
    o = await checkOverflow(p, { heavy: true });
    check(o.problems.some((x) => x.text.startsWith('small button')), '③ はみ出し: ずっと縮んだ窓（親の scale 0.9 のまま）のボタンは当たる', o.problems.map((x) => x.text).join('／'));

    // ---- 演出中は測らない（conductor の点検）----
    await open('busy-small');
    {
      const j2 = new Judge({ outDir: `${OUT}/busy`, devices: [dev] });
      const c2 = new Conductor({ fleet: { devices: [dev] }, judge: j2 });
      await c2.observe();
      const during = j2.failures.map((f) => f.text);
      await p.evaluate(() => document.getElementById('mv').remove());
      await c2.observe();
      const after = j2.failures.map((f) => f.text);
      check(!during.length && after.some((x) => x.includes('small button')), '点検: 演出中（歩きの途中）は測らず、演出が終わってから測って当たる', JSON.stringify({ during, after }));
    }

    // ---- 画面を読む ----
    await open('blank');
    let v = await readView(dev);
    check(!!v.unreadable, '画面を読む: どの画面か分からない時は「読めない画面」と返す（黙って待たない）', JSON.stringify(v.unreadable));
    await open('lobby');
    v = await readView(dev);
    check(v.screen === 'lobby' && v.facts.roomCode === 'AB12' && !v.unreadable, '画面を読む: 待合室と合言葉を読む', JSON.stringify({ screen: v.screen, facts: v.facts }));
  } finally {
    await dev.ctx.close().catch(() => {});
    await browser.close().catch(() => {});
    srv.close();
  }
  const ng = results.filter((x) => !x.ok);
  console.log(`\n自己テスト: ${results.length - ng.length}/${results.length} 成功${ng.length ? `・失敗 ${ng.length}` : ''}`);
  return ng.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await selftest();
