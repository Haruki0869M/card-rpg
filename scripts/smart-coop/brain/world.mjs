// 賢いマルチプレイ検証 bot: 頭「世界マップ」（計画 §4 の世界マップの行・区切り 2-Sb）
// 行き先: 網羅の表（coverage.mjs）で「まだ踏んでいない・見えている物」を、道のりの近い順に選ぶ（計画 §4 の優先の順）。
//   次の目的（目的地の輪 data-goal-mark・次の目的の行）は、いつも最後の行き先（寄り道が無ければそこへ）。
// 道探し: 見えているマスの地形の印（A7 の data-terrain・data-tide）と、説明書きの地形の移動力（決まった表）で、行き先から逆向きに道のりを測る。
//   霧のマスは「分からない」として移動力 2 で見積もる【提案】（人も霧の向こうは見当で進む）。海・溶岩・険しい山（移動力 0）は通れない。
//   潮のマス（data-tide）は、今の潮（上の帯の data-tide-icon）と同じ時だけ通れる。閉じていれば野営して待つ（シナリオ3の仕組み。行の形だけ用意）。
// 仲間: 先頭の人（P1）が、同じマスの仲間を同行に誘う（返事は brain/common.mjs）。
// 遭遇（encounterBrain）: 災厄は戦う。網羅のため「奇襲を狙う」「逃げる」を1回ずつ通す。ほかは戦う。仲間の「加わる」の返事を待つ。
// 決まり: 見るのは View と説明書きだけ。乱数を使わない（同じ点ならマスの番号の小さい方）。自分の手番（手番の駒の席 = この端末の席）でなければ押さない。
import { G, findMark, decide, hasLayer } from './common.mjs';
import { KB } from '../content/load.mjs';
import { covDone, covWant } from '../coverage.mjs';

const T = { turn: true };
/** 霧のマスの見積もりの移動力【提案】 */
const FOG_COST = 2;
/** 寄り道の上限（今の場所からの道のりの移動力）【提案】。遠い寄り道で時間を使い切らない */
const DETOUR_MAX = 9;
/** 災厄・網羅の「必ず」の町の寄り道の上限【提案】 */
const DETOUR_FAR = 18;

// ---- 六角形のマス（odd-r。src/engine/game/world/hex.ts と同じ並び。地図の決まった形） ----
const EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
export function hexNeighbors(cols, rows, i) {
  const c = i % cols;
  const r = Math.floor(i / cols);
  const out = [];
  for (const [dc, dr] of r % 2 ? ODD : EVEN) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc >= 0 && nr >= 0 && nc < cols && nr < rows) out.push(nr * cols + nc);
  }
  return out;
}

/** 閉じた潮のマスの見積もり（潮が変わるまで待つ分）【提案】。いつも通れる切れ目が近ければ、そちらを選ぶ */
export const TIDE_WAIT = 6;

/**
 * 画面の印から、マスごとの「入るのにかかる移動力」を作る（0 = 通れない・FOG_COST = 霧）。
 * hexes = [{ 'data-hex', 'data-terrain', 'data-tide' }]（見えているマスだけ）・tide = 今の潮（high/low/null）
 * ship = 船を持っているか（区切り5: シナリオ3。依頼「船を借りる」の達成の字か、行けるマスに海が光った事で知る。brain の板 board.world.ship）
 * 返す物: { cost, seen, tideShut }（tideShut[i] = 今の潮で閉じているが、潮が変われば通れるマス）
 */
export function costMap(cols, rows, hexes, tide, terrains = KB.world?.terrains ?? {}, ship = false) {
  const n = cols * rows;
  const cost = new Array(n).fill(FOG_COST);
  const seen = new Array(n).fill(false);
  const tideShut = new Array(n).fill(false);
  for (const h of hexes) {
    const i = Number(h['data-hex']);
    if (!(i >= 0 && i < n)) continue;
    seen[i] = true;
    const t = terrains[h['data-terrain']];
    let c = t ? t.moveCost : 1;
    // 海: 船があれば移動力1（地形の shipCost。説明書きに無い時は1）。無ければ通れない
    if (t?.sea) c = ship ? (t.shipCost ?? 1) : 0;
    const td = h['data-tide'];
    if (td) {
      // 潮のマス: 船の要る潮の水道は、船が無ければ通れない。開いていれば1、閉じていれば「待つ分」の見積もり（潮は時間で必ず変わる）
      const usable = !t?.tideShip || ship;
      if (!usable) c = 0;
      else if (tide && td === tide) c = t?.tideShip ? (t.shipCost ?? 1) : 1;
      else { c = TIDE_WAIT; tideShut[i] = true; }
    }
    cost[i] = c;
  }
  return { cost, seen, tideShut };
}

/** 行き先 dest から全部のマスへの道のり（逆向きのダイクストラ。dist[x] = x から dest まで、入るマスの移動力の合計） */
export function distFrom(cols, rows, cost, dest, extra = null) {
  const n = cols * rows;
  const dist = new Array(n).fill(Infinity);
  dist[dest] = 0;
  const open = [dest];
  const inOpen = new Set(open);
  while (open.length) {
    let k = 0;
    for (let j = 1; j < open.length; j++) if (dist[open[j]] < dist[open[k]] || (dist[open[j]] === dist[open[k]] && open[j] < open[k])) k = j;
    const u = open.splice(k, 1)[0];
    inOpen.delete(u);
    // x → u と動く時に u に入る移動力（行き先そのものは通れない地形でも、入口として 1 で数える）
    const cu = u === dest ? 1 : cost[u] + (extra?.[u] ?? 0);
    if (u !== dest && cost[u] <= 0) continue;
    for (const x of hexNeighbors(cols, rows, u)) {
      const d = dist[u] + cu;
      if (d < dist[x]) {
        dist[x] = d;
        if (!inOpen.has(x)) { open.push(x); inOpen.add(x); }
      }
    }
  }
  return dist;
}

/** サイコロを振る前か（振るボタンが押せる） */
const roll0 = (v) => !!findMark(v, 'data-roll-move')?.enabled;

/** 世界マップの「見た事」を、頭の使う形にまとめる */
export function readWorld(v) {
  const m = (v.facts.wMap ?? [])[0] ?? {};
  const cols = Number(m['data-cols'] ?? KB.world?.width ?? 0);
  const rows = Number(m['data-rows'] ?? KB.world?.height ?? 0);
  const tide = (v.facts.wTide ?? [])[0]?.['data-tide-icon'] ?? null;
  const active = (v.facts.activeHero ?? [])[0] ?? null;
  const here = active ? Number(active['data-tile']) : null;
  const features = (v.facts.wFeatures ?? []).map((f) => {
    const [kind, id] = String(f['data-feature']).split(':');
    return { kind, id, tile: Number(f['data-tile']), used: f['data-used'] !== null && f['data-used'] !== undefined };
  });
  const spawns = (v.facts.wSpawns ?? []).map((s) => ({ kind: 'spawn', id: s['data-spawn'], tile: Number(s['data-tile']), used: false }));
  const wanderers = (v.facts.wWanderers ?? []).map((w) => Number(w['data-tile']));
  // 区切り 3-S: 災厄の中ボス（徘徊する敵の印 data-scourge。見えているマスの物だけ）
  const scourges = (v.facts.wWanderers ?? []).filter((w) => w['data-scourge']).map((w) => ({ kind: 'scourge', id: w['data-scourge'], tile: Number(w['data-tile']), used: false }));
  const goalTile = (v.facts.goalMark ?? [])[0] ? Number(v.facts.goalMark[0]['data-goal-mark']) : null;
  const corruption = Number((v.facts.wCorruption ?? [])[0]?.['data-corruption'] ?? 0);
  const party = (v.facts.wParty ?? []).map((p) => {
    const mm = /^(.*?)(?:（(.*?)）)?\s*HP(\d+)\/(\d+)/.exec(p['aria-label'] ?? '');
    return mm ? { name: mm[1], status: mm[2] ?? '', hp: Number(mm[3]), max: Number(mm[4]), canJob: (p.canJob ?? 0) > 0 } : null;
  }).filter(Boolean);
  return { cols, rows, tide, active, here, features, spawns, wanderers, scourges, goalTile, corruption, party, hexes: v.facts.wHexes ?? [] };
}

/** パーティの HP の割合の一番低い値（仲間の列の字。退場・ダンジョンの中の仲間は除く） */
const minHpRatio = (party) => {
  const live = party.filter((p) => !/退場/.test(p.status));
  return live.length ? Math.min(...live.map((p) => p.hp / Math.max(1, p.max))) : 1;
};

/**
 * 行き先の候補（計画 §4 の優先の順。小さい数ほど先）。返す物: [{ tile, kind, id, pri, why }]
 * board.cov = 網羅の表（何を踏んだか）。board.world.done = この冒険で入った・使ったマス
 */
export function destinations(w, board) {
  const ws = board.world;
  const out = [];
  const hpLow = minHpRatio(w.party) <= 0.5;
  const keysDone = covDone(board, 'keydungeon');
  const remaining = Math.max(1, (KB.world?.dungeons ?? []).filter((d) => !d.random).length - keysDone);
  // 侵食度が高い時（残りのダンジョン×15％＋10％ が 100％ を超えそう）は寄り道をやめる（計画 §4）
  const hurry = w.corruption + remaining * 15 + 10 >= 100;
  const add = (f, pri, why) => {
    if (ws.unreachable.has(f.tile) || ws.done.has(f.tile)) return;
    out.push({ ...f, pri, why });
  };
  for (const f of [...w.features, ...w.spawns]) {
    if (f.used) continue;
    switch (f.kind) {
      case 'town':
        if (hpLow) add(f, 1, 'HP が半分以下なので町（宿）');
        else if (!ws.townsVisited.has(f.id) && !hurry) add(f, 2, 'まだ入っていない町');
        break;
      case 'tower':
        if (!hurry) add(f, 3, '見晴らしの塔（まだ登っていない）');
        break;
      case 'chest':
      case 'event':
      case 'shrine':
      case 'landmark':
      case 'spawn':
        if (!hurry && !hpLow) add(f, 4, { chest: '宝箱', event: 'マスのイベント', shrine: '祠', landmark: '名所', spawn: `出現スポット（${f.id}）` }[f.kind]);
        break;
      case 'dungeon': {
        const def = (KB.world?.dungeons ?? []).find((d) => d.id === f.id);
        if (def?.random && keysDone >= 1 && minHpRatio(w.party) > 0.6 && !hurry && covWant(board, `random:${f.tile}`)) add(f, 5, 'ランダムダンジョン（1つ目の鍵の後・HP が6割より上）');
        break;
      }
      case 'temple':
      case 'altar':
        if (ws.jobPlace && !ws.sanctuaryTried.has(f.tile)) add(f, 6, '転職の条件を満たした人がいる（場所だけ足りない）');
        else if (!hurry && covWant(board, `sanctuary:${f.id}`) && !ws.sanctuaryTried.has(f.tile)) add(f, 7, '神殿・祭壇（網羅）');
        break;
      default:
        break;
    }
  }
  // 依頼（次の目的が「町の依頼をあと N つ」の時）: 依頼の一覧で読んだ状態から、報告できる町・届ける物の町・名所・徘徊する敵へ（遠くても行く）
  {
    const W = KB.world;
    const tileOf = (kind, id) => {
      const vis = w.features.find((f) => f.kind === kind && f.id === id);
      if (vis) return vis.tile;
      const f = (W?.features ?? []).find((x) => x.kind === kind && x.id === id);
      return f ? f.at[1] * w.cols + f.at[0] : null;
    };
    ws.questTried ??= new Set();
    for (const q of ws.questSheet ?? []) {
      if (q.state === 'done') continue;
      const kind = q.objective?.kind;
      let t = null;
      let why = '';
      if (q.state === 'report' || kind === 'deliverItem') [t, why] = [tileOf('town', q.town), `依頼「${q.id}」を報告する町（${q.state === 'report' ? '報告できる' : '届け物'}）`];
      else if (kind === 'visitLandmark') [t, why] = [tileOf('landmark', q.objective.landmarkId), `依頼「${q.id}」の名所`];
      else if (kind === 'defeatWanderers' && w.wanderers.length) [t, why] = [[...w.wanderers].sort((a, b) => a - b)[0], `依頼「${q.id}」の徘徊する敵`];
      if (t === null || t === undefined) continue;
      // 次の目的が「町の依頼」でない時は、報告できる町だけを、寄り道として（近い時だけ）
      if (!ws.questMode && q.state !== 'report') continue;
      const key = `${q.id}|${q.state}|${t}`;
      if (ws.questTried.has(key) && kind !== 'defeatWanderers') continue;
      if (ws.questMode) out.push({ tile: t, kind: 'quest', id: key, pri: 0, why });
      else if (!hurry) out.push({ tile: t, kind: 'questNear', id: key, pri: 2, why: `${why}・通りがかり` });
    }
  }
  // 区切り 3-S（2-Sb の作り残し）: 災厄の中ボスを行き先にする（1つ目の鍵の後・全員の HP が6割より上・まだ遭遇していない災厄。倒せなくても良い。遭遇して戦う所まで）
  for (const sc of w.scourges ?? []) {
    if (keysDone >= 1 && minHpRatio(w.party) > 0.6 && !hurry && covWant(board, `scourge:${sc.id}:meet`)) out.push({ ...sc, pri: 5, why: `災厄「${sc.id}」（まだ遭遇していない）` });
  }
  // 区切り5（シナリオ3の通しで、船があると潮のマスを一度も通らなかった）: 網羅の行「潮のマスを渡った」をまだ踏んでいなければ、
  // 見えている潮のマス（船の要る水道は船がある時だけ）の一番番号の小さい物を寄り道にする。閉じていれば手前で潮を待つ（5b）
  if (covWant(board, 'tide-cross') && !hurry) {
    const terr = KB.world?.terrains ?? {};
    const tideTiles = (w.hexes ?? []).filter((h) => h['data-tide'] && (!terr[h['data-terrain']]?.tideShip || ws.ship)).map((h) => Number(h['data-hex'])).filter((t) => !ws.unreachable.has(t) && !ws.done.has(t)).sort((a, b) => a - b);
    if (tideTiles.length) out.push({ tile: tideTiles[0], kind: 'tide', id: 'tide-cross', pri: 4, why: '網羅: 潮のマスを渡る（閉じていれば手前で潮を待つ）' });
  }
  if (w.goalTile !== null) out.push({ tile: w.goalTile, kind: 'goal', id: 'goal', pri: 9, why: '次の目的（鍵のダンジョン・最後のダンジョン）' });
  return out.sort((a, b) => a.pri - b.pri || a.tile - b.tile);
}

/**
 * 世界マップの1手。返す物: 決め か null（待つ）
 * board.world: { invited, done（入った・使ったマス）, townsVisited, target, unreachable, ... } … 相談の板
 */
export function worldBrain(v, board) {
  if (v.screen !== 'game' || v.mode !== 'world') return null;
  if (hasLayer(v, 'sheet') || hasLayer(v, 'confirm') || hasLayer(v, 'story') || hasLayer(v, 'job-pick')) return null;
  const w = readWorld(v);
  if (!w.active || w.active['data-seat'] !== v.seat) return null; // 自分の手番でない
  const ws = (board.world ??= {});
  ws.invited ??= new Set();
  ws.done ??= new Set();
  ws.townsVisited ??= new Set();
  ws.unreachable ??= new Set();
  ws.sanctuaryTried ??= new Set();
  ws.log ??= [];
  // 区切り5（シナリオ3）: 船を持っているか。依頼「船を借りる」の達成の字（coverage が board.shipKnown に書く）か、
  // 行けるマス（光るマス）に海が出た事で知る。知った時は「行けない」と決めた行き先を全部やり直す（海の向こうの物が行けるようになる）
  const terr = KB.world?.terrains ?? {};
  const hexAt = new Map(w.hexes.map((h) => [Number(h['data-hex']), h]));
  const seaReach = (v.facts.reach ?? []).some((r) => terr[hexAt.get(Number(r['data-reach']))?.['data-terrain']]?.sea);
  if (!ws.ship && (board.shipKnown || seaReach)) {
    ws.ship = true;
    ws.unreachable.clear();
    ws.log.push(`船を持っている事を知った（${board.shipKnown ? `依頼の字: ${board.shipKnown}` : '行けるマスに海が光った'}）。行けないと決めた行き先をやり直す`);
  }
  // 0. 同じマスで倒れている仲間を助け起こす（手番を使う）
  const rev = (v.facts.wRevive ?? [])[0];
  if (rev) return decide(G.revive(rev['data-revive']), `倒れた仲間 ${rev['data-revive']} を助け起こす`, T);
  // 1. 先頭の人（P1）は、同じマスの仲間を同行に誘う（誘いは1人1回。返事は相手の端末）
  if (v.seat === 'P1') {
    const inv = v.actions.find((a) => a.enabled && a.marks.includes('data-invite=no'));
    const hero = inv?.marks.find((m) => m.startsWith('data-companion='))?.slice('data-companion='.length);
    if (hero && !ws.invited.has(hero)) {
      ws.invited.add(hero);
      return decide(G.invite(hero), `同行に誘う（${hero}）`, T);
    }
    if (v.actions.some((a) => a.marks.includes('data-invite=wait'))) return null;
  }
  // 2. 移動の提案の返事を待っている間は動かない
  if (v.facts.moveProposal) return null;
  // 3. 行き先を決める（前の行き先が残っていて、まだ使っていなければ続ける）
  const cands = destinations(w, board);
  // 寄り道の行き先だけを続ける（次の目的 = goal は毎回選び直す。試しの通しで、最初に goal を選ぶと、後で見えた宝箱・イベントへ寄らなかった）
  let target = ws.target && ws.target.kind !== 'goal' && cands.find((c) => c.tile === ws.target.tile && c.kind === ws.target.kind);
  const { cost, tideShut } = costMap(w.cols, w.rows, w.hexes, w.tide, terr, !!ws.ship);
  // 徘徊する敵: HP が6割より下なら避ける（そのマスの見積もりを重くする）
  const extra = {};
  if (minHpRatio(w.party) < 0.6) for (const t of w.wanderers) extra[t] = 8;
  const pick = () => {
    // 依頼の行き先は、道のりの一番近い物（同じなら番号の小さい方）
    const qs = cands.filter((c) => c.kind === 'quest').map((c) => {
      const dist = c.tile === w.here ? null : distFrom(w.cols, w.rows, cost, c.tile, extra);
      return { c, dist, d: dist ? dist[w.here] : 0 };
    }).filter((x) => Number.isFinite(x.d)).sort((a, b) => a.d - b.d || a.c.tile - b.c.tile);
    if (qs.length) return qs[0];
    for (const c of cands) {
      if (c.kind === 'quest') continue;
      if (c.tile === w.here) return { c, dist: null, d: 0 };
      const dist = distFrom(w.cols, w.rows, cost, c.tile, extra);
      const d = dist[w.here];
      if (!Number.isFinite(d)) { ws.unreachable.add(c.tile); continue; }
      // 寄り道の上限: 災厄と、網羅の表で「必ず」のまだ入っていない町は遠くても行く（DETOUR_FAR）【提案】
      const far = c.kind === 'scourge' || c.kind === 'tide' || (c.kind === 'town' && covWant(board, `town:${c.id}`));
      if (c.kind !== 'goal' && c.kind !== 'quest' && d > (far ? DETOUR_FAR : DETOUR_MAX)) continue;
      return { c, dist, d };
    }
    return null;
  };
  let plan;
  if (target) {
    const dist = target.tile === w.here ? null : distFrom(w.cols, w.rows, cost, target.tile, extra);
    plan = { c: target, dist, d: dist ? dist[w.here] : 0 };
    if (dist && !Number.isFinite(plan.d)) { ws.unreachable.add(target.tile); plan = pick(); }
  } else plan = pick();
  if (plan && (!ws.target || ws.target.tile !== plan.c.tile)) ws.log.push(`行き先: マス ${plan.c.tile}（${plan.c.kind}:${plan.c.id}・${plan.c.why}・道のり ${plan.d}）`);
  ws.target = plan ? { tile: plan.c.tile, kind: plan.c.kind, id: plan.c.id } : null;
  // 4. 今いるマスで「〜に入る」「調べる」: 行き先のマス・次の目的のダンジョン・通りがかりの網羅の物
  const enter = findMark(v, 'data-interact');
  if (enter?.enabled) {
    const kind = enter.marks.find((m) => m.startsWith('data-interact-kind='))?.slice('data-interact-kind='.length);
    const id = enter.marks.find((m) => m.startsWith('data-interact-id='))?.slice('data-interact-id='.length);
    const goalId = (v.facts.goalId ?? [])[0]?.['data-goal-line'] ?? (v.facts.goalId ?? [])[0]?.['data-goal-short'];
    const atTarget = plan && plan.c.tile === w.here && plan.c.kind !== 'goal';
    const isGoal = kind === 'dungeon' && id === goalId;
    // 合流（先に入った仲間の組）は、字が「〜たちに合流する」
    const join = /合流する/.test(enter.text);
    if (atTarget || isGoal || join) {
      const here = w.here;
      return decide(G.interact(kind, id), `「${enter.text}」（${atTarget ? plan.c.why : isGoal ? '次の目的' : '仲間に合流'}）`, { ...T, after: () => {
        ws.done.add(here);
        if (kind === 'town') ws.townsVisited.add(id);
        if (kind === 'temple' || kind === 'altar') ws.sanctuaryTried.add(here);
        if ((plan?.c.kind === 'quest' || plan?.c.kind === 'questNear') && plan.c.tile === here) (ws.questTried ??= new Set()).add(plan.c.id);
        ws.target = null;
      } });
    }
  }
  // 行き先のマスに着いたのに入る物が無い（使い終わった・字が出ない）→ 行き先から外す
  if (plan && plan.c.tile === w.here && plan.c.kind !== 'goal') {
    ws.done.add(w.here);
    // 依頼の行き先も外す（区切り 2-Sb の通しで、報告する町のマスに着いたのに「〜に入る」が出ず（襲われて落ちた町の形）、
    // そのマスに留まって「サイコロ → 手番を終える」をくり返し、侵食度が100%になった。bot の間違い）
    if (plan.c.kind === 'quest' || plan.c.kind === 'questNear') (ws.questTried ??= new Set()).add(plan.c.id);
    ws.target = null;
    ws.log.push(`行き先 マス ${w.here}（${plan.c.kind}:${plan.c.id}）に着いたが、入る物が無いので外した`);
  }
  // 5. 行き先を選んである →「ここへ進む」
  const go = findMark(v, 'data-move-go');
  // 移動の直後に、決まっていない「移動する（移動力?を使う・?マス先）」が一瞬残る（区切り 2-Sb の通しで、押す前に消えて「押す物が無い」に当たった）。? の間は待つ
  if (go?.enabled && /\?/.test(go.text)) return null;
  if (go?.enabled) return decide(G.moveGo, `「${go.text}」`, T);
  // 5b. 区切り5（シナリオ3の潮）: 行き先へ一番近づく隣のマスが「今の潮で閉じた潮のマス」なら、サイコロを振らずに潮を待つ
  //     （野営が押せれば野営 = 夜の回復・寒さを防ぐ。押せなければ「待機」）。待った回数は「近づけない」に数えない（潮は時間で必ず変わる）
  if (plan?.dist && roll0(v)) {
    const nbs = hexNeighbors(w.cols, w.rows, w.here);
    const best = nbs.filter((t) => Number.isFinite(plan.dist[t])).sort((a, b) => plan.dist[a] - plan.dist[b] || a - b)[0];
    if (best !== undefined && tideShut[best] && plan.dist[best] < plan.dist[w.here]) {
      const tideText = (v.facts.wTide ?? [])[0]?.['aria-label'] ?? w.tide;
      const camp = findMark(v, 'data-camp');
      const mark = () => {
        ws.tideWaits = (ws.tideWaits ?? 0) + 1;
        ws.tideWaitAt = best;
        (board.covMarks ??= []).push({ id: 'tide-wait', how: `${v.seat}: 潮のマス ${best} の手前（マス ${w.here}）で潮を待った（${tideText}）` });
      };
      if (camp?.enabled) return decide(G.camp, `潮を待つ: 野営（隣の潮のマス ${best} が閉じている・${tideText}・行き先 ${plan.c.kind}:${plan.c.id}）`, { ...T, after: mark });
      const wt = findMark(v, 'data-world-wait');
      if (wt?.enabled) return decide(G.worldWait, `潮を待つ:「${wt.text}」（隣の潮のマス ${best} が閉じている・${tideText}）`, { ...T, after: mark });
    }
  }
  // 6. サイコロを振る
  const roll = findMark(v, 'data-roll-move');
  if (roll?.enabled) return decide(G.rollMove, 'サイコロを振る', T);
  // 7. 行けるマスのうち、行き先までの道のりが一番短くなるマス（今の場所より近い時だけ。同じならかかる移動力の小さい方 → 番号の小さい方）
  const reach = v.facts.reach ?? [];
  // 光るマスを押しても選ばれない（「ここへ進む」が出ない）マスは、2回で別のマスにする（区切り 2-Sb の通しで、今いる町の絵の当たりの範囲が
  // 隣のマスの数字「1」に重なり、押すと今の町のマスが選ばれて進めなかった。WorldMap.tsx の tap の pickPlace。人が見て決める事として報告する）
  ws.badReach ??= {};
  const lr = ws.lastReach;
  if (lr && lr.here === w.here && lr.sig === reach.map((r) => r['data-reach']).join(',')) {
    const k = `${w.here}>${lr.tile}`;
    ws.badReach[k] = (ws.badReach[k] ?? 0) + 1;
    if (ws.badReach[k] === 2) (board.notes ??= []).push({ kind: 'warn', text: `${v.seat}: 世界マップの光るマス ${lr.tile}（数字の上）を2回押しても選ばれない（今いるマス ${w.here}）。施設の絵の当たりの範囲が隣のマスに重なっている形の見立て（WorldMap.tsx の tap → pickPlace）。bot は別のマスを選んだ` });
  }
  ws.lastReach = null;
  if (plan?.dist && reach.length) {
    const here = plan.dist[w.here];
    let best = null;
    for (const r of reach) {
      const t = Number(r['data-reach']);
      const d = plan.dist[t];
      if (!(d < here)) continue;
      if ((ws.badReach[`${w.here}>${t}`] ?? 0) >= 2) continue;
      const c = Number(r['data-cost'] ?? 0);
      if (!best || d < best.d || (d === best.d && (c < best.c || (c === best.c && t < best.t)))) best = { t, d, c };
    }
    const sig = reach.map((r) => r['data-reach']).join(',');
    if (best) return decide(G.reach(best.t), `行けるマス ${best.t}（移動力 ${best.c}・行き先 ${plan.c.kind}:${plan.c.id} まで残り ${best.d}）`, { ...T, map: true, after: () => { ws.lastReach = { here: w.here, tile: best.t, sig }; } });
  }
  // 8. 潮で道が閉じている・近づけない →（夜なら）野営、それ以外は「待機」か「手番を終える」
  const wait = findMark(v, 'data-world-wait');
  if (wait?.enabled) {
    // 同じマスで同じ行き先のまま3回続けて手番を終えたら、その行き先をあきらめる（侵食度だけが進む形を避ける。次の目的 goal はあきらめない）
    const key = `${w.here}|${plan?.c.kind}:${plan?.c.tile}`;
    return decide(G.worldWait, `「${wait.text}」${plan ? '' : '（行き先が無い）'}`, { ...T, after: () => {
      ws.idle = ws.idle?.key === key ? { key, n: ws.idle.n + 1 } : { key, n: 1 };
      if (ws.idle.n >= 3 && plan && plan.c.kind !== 'goal') {
        ws.unreachable.add(plan.c.tile);
        if (plan.c.kind === 'quest') (ws.questTried ??= new Set()).add(plan.c.id);
        ws.log.push(`行き先 マス ${plan.c.tile}（${plan.c.kind}:${plan.c.id}）へ3手番近づけないので外した`);
        ws.target = null;
      }
    } });
  }
  return null;
}

/** 遭遇の1手（遭遇したキャラの担当の端末が選ぶ。ほかの人は「加わる」を答える） */
export function encounterBrain(v, board) {
  if (v.screen !== 'game' || v.mode !== 'encounter') return null;
  if (hasLayer(v, 'sheet') || hasLayer(v, 'confirm')) return null;
  const es = (board.encounter ??= { ambush: 0, flee: 0, fight: 0 });
  // ほかの人のキャラの「加わる」の返事（自分のキャラの札が押せて、まだ返事待ち）
  const joins = v.facts.eJoin ?? [];
  const mineJoin = joins.find((j) => j.disabled === null && /返事待ち/.test(j.text));
  if (mineJoin) return decide(G.encounterJoin(mineJoin['data-encounter-join']), `遭遇に「加わる」（${mineJoin['data-encounter-join']}）`);
  const choices = (v.facts.eChoice ?? []).filter((c) => c.disabled === null).map((c) => c['data-encounter-choice']);
  const buttons = (v.facts.eButtons ?? []).filter((b) => b.disabled === null);
  // 結果の後: 「戦闘開始」「世界マップへ」
  const after = buttons.find((b) => /^(戦闘開始|世界マップへ)$/.test(b.text.trim()));
  if (after && !choices.length) return decide(G.encounterGo(after.text.trim()), `遭遇の結果「${after.text.trim()}」`, T);
  // 判定の窓（奇襲・逃げる）: フォーカスを1つ足してから押す
  const tryBtn = buttons.find((b) => /^(奇襲を狙う|逃げる)$/.test(b.text.trim()));
  if (tryBtn) {
    const ck = (v.facts.checkMark ?? [])[0];
    const spent = ck ? Number(ck['data-challenge-focus'] ?? 0) : 0;
    if (ck && spent < 1 && v.facts.checkPlusOn) return decide(G.checkPlusAny, `遭遇: フォーカスを足す（${spent}→${spent + 1}・成功率 ${ck['data-challenge-chance']}%）`, T);
    return decide(G.encounterGo(tryBtn.text.trim()), `遭遇「${tryBtn.text.trim()}」（成功率 ${ck?.['data-challenge-chance'] ?? '?'}%・フォーカス ${spent}）`, T);
  }
  if (!choices.length) return null;
  // 仲間の返事を待つ（ほかの人のキャラが「返事待ち」の間は選ばない）
  if (joins.some((j) => j.disabled !== null && /返事待ち/.test(j.text))) return null;
  const scourge = (v.facts.eScourge ?? []).length > 0 || (v.facts.eKind ?? [])[0]?.['data-encounter'] === 'scourge';
  let pick = 'fight';
  let why = scourge ? '災厄は戦う' : 'ふつうの敵は戦う';
  if (!scourge && choices.includes('ambush') && !es.ambush) [pick, why] = ['ambush', '網羅: 「奇襲を狙う」を1回通す'];
  else if (!scourge && choices.includes('flee') && !es.flee && es.ambush) [pick, why] = ['flee', '網羅: 「逃げる」を1回通す'];
  return decide(G.encounterChoice(pick), `遭遇「${{ fight: '戦う', ambush: '奇襲を狙う', flee: '逃げる' }[pick]}」（${why}）`, { ...T, after: () => { es[pick]++; } });
}
