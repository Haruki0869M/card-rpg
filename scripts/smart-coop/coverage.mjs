// 賢いマルチプレイ検証 bot: 網羅の表（計画 §6・区切り 2-Sb）
// 1段目: 種類の表（データから。始める前に決まる）= content/world.mjs が読んだ説明書き（町・依頼・ダンジョン・イベント・祠・神殿と祭壇・災厄・ジョブの段）。
// 2段目: この冒険の実物（画面から。遊びながら「踏んだ」の印を付ける）。踏んだかどうかは、画面に出た印と字だけで決める（エンジンの状態は読まない）。
// 行の need: must = 通しか場面からで必ず踏む・maybe = 種で出ない事がある（出たら踏む）・later = 後の区切り（揺さぶり・実機の不具合の確かめ = 区切り3）
import { KB } from './content/load.mjs';
import { DOOR_KINDS } from './content/dungeon.mjs';

const TIER_NAME = { mid: '中位', top: '最上位', special: '特殊' };
const TOWN_TABS = ['shop', 'inn', 'quests', 'remove', 'sell'];

/** 1段目: データから行を作る（KB.world が要る） */
export function buildCoverage(world = KB.world) {
  if (!world) throw new Error('網羅の表: 世界の説明書き（KB.world）が読めていない');
  const rows = [];
  const add = (id, group, label, need = 'must', from = 'データ') => rows.push({ id, group, label, need, from, stepped: null });
  // 町と、町でやる事
  for (const t of world.towns) add(`town:${t.id}`, 'town', `町「${t.name}」に入った`, 'must', 'towns');
  add('town-tabs', 'town-action', '1つの町で5つのタブを全部開いた', 'must', '固定');
  for (const [id, label] of [['inn', '宿に泊まった'], ['buy', '店で買った'], ['sell', '装備を売った'], ['remove', 'カードを削った'], ['quest-accept', '依頼を受けた'], ['quest-report', '依頼を報告した']]) add(`town-action:${id}`, 'town-action', label, id === 'quest-report' || id === 'sell' ? 'maybe' : 'must', 'towns・quests');
  for (const q of world.quests) {
    add(`quest:${q.id}:accept`, 'quest', `依頼「${q.title}」を受けた`, 'maybe', 'quests');
    add(`quest:${q.id}:report`, 'quest', `依頼「${q.title}」を報告した`, 'maybe', 'quests');
  }
  // ダンジョン（鍵・最後・ランダム）
  for (const d of world.dungeons) {
    const kind = d.random ? 'ランダムダンジョン' : d.finale ? '最後のダンジョン' : '鍵のダンジョン';
    add(`dungeon:${d.id}:enter`, d.random ? 'random' : 'keydungeon-enter', `${kind}「${d.name}」に入った`, d.random ? 'maybe' : 'must', 'dungeons');
    add(`dungeon:${d.id}:clear`, d.random ? 'random' : 'keydungeon', `${kind}「${d.name}」を制覇した`, d.random ? 'maybe' : 'must', 'dungeons');
  }
  // 部屋の種類（扉の予兆）
  for (const [k, info] of Object.entries(DOOR_KINDS)) {
    if (!k) continue;
    add(`room:${k}`, 'room', `部屋「${info.name}」に入った`, k === 'sealed' || k === 'midboss' ? 'maybe' : 'must', 'roomTypes');
  }
  // イベント（どこで起きるかの種類ごとに1つ以上は必ず・1つずつは出たら）
  const whereName = { dungeon: 'ダンジョンのイベント', map: '地図のイベント', random: '突発イベント', spawn: '出現スポットのイベント' };
  for (const [where, name] of Object.entries(whereName)) {
    const list = world.events.filter((e) => e.where === where);
    if (!list.length) continue;
    add(`events:${where}`, 'event-kind', `${name}を1つ以上（全 ${list.length}）`, where === 'spawn' ? 'maybe' : 'must', 'events');
    for (const e of list) add(`event:${e.id}`, `event-${where}`, `${name}「${e.title}」`, 'maybe', 'events');
  }
  // 祠・神殿と祭壇・見晴らしの塔・出現スポット・宝箱（地図）
  add('shrines', 'shrine-any', '祠に1つ以上', 'must', 'shrines');
  for (const s of world.shrines) add(`shrine:${s.id}`, 'shrine', `祠「${s.name}」`, 'maybe', 'shrines');
  add('sanctuaries', 'sanctuary-any', '神殿か祭壇に1つ以上', 'must', 'sanctuaries');
  for (const s of world.sanctuaries) add(`sanctuary:${s.id}`, 'sanctuary', `${s.kind === 'temple' ? '神殿' : '祭壇'}「${s.name}」`, 'maybe', 'sanctuaries');
  if (world.towers) add('tower', 'tower', `見晴らしの塔に登った（この地図に ${world.towers}）`, 'must', 'map.prefer.tower');
  add('map-chest', 'map', '地図の宝箱を開けた', 'must', 'map.regions.chests');
  for (const k of ['star', 'peddler', 'thief']) add(`spawn:${k}`, 'spawn', `出現スポット「${{ star: '落ちた星', peddler: '行商人', thief: 'コソ泥' }[k]}」`, 'maybe', 'types/world.ts SpawnKind');
  // 災厄
  for (const s of world.scourges) {
    add(`scourge:${s.id}:meet`, 'scourge', `災厄「${s.name}」に遭遇した`, 'maybe', 'map.scourges');
    add(`scourge:${s.id}:defeat`, 'scourge', `災厄「${s.name}」を倒した`, 'maybe', 'map.scourges');
  }
  // 転職（段ごと）
  for (const tier of ['mid', 'top', 'special']) add(`job:${tier}`, 'job', `${TIER_NAME[tier]}へ転職して、専用のカードを選んだ`, tier === 'mid' ? 'must' : 'maybe', 'classes');
  add('equip', 'equip', '手に入れた装備を付けた（ステータスのシート）', 'maybe', '固定');
  // 共通の画面
  for (const [k, label] of [['fight', '戦う'], ['ambush', '奇襲を狙う'], ['flee', '逃げる']]) add(`encounter:${k}`, 'encounter', `遭遇の3択「${label}」`, 'must', '固定');
  add('encounter:night', 'encounter', '夜襲（夜の遭遇）', 'maybe', '固定');
  add('wipe-retreat', 'common', '全滅からの立て直し（命の灯火で町へ退却）', 'maybe', '固定');
  add('gameover', 'common', 'ゲームオーバーの画面', 'maybe', '固定');
  add('ending', 'common', 'エンディングの画面（クリア）', 'must', '固定');
  // シナリオだけの仕組み（あるシナリオだけ。行の形だけ用意）
  if (world.special.tide) add('tide-cross', 'special', '潮を待って渡った', 'must', 'terrains の tide');
  if (world.special.cold) add('cold', 'special', '寒さ・焚き火', 'must', 'climate');
  if (world.special.ship) add('ship', 'special', '船に乗った', 'must', 'map の ship');
  // 区切り 3-S: 晶石の祭壇の2つの使い方・行商人で買う（2-Sb の作り残し）
  add('altar:upgrade', 'altar', '晶石の祭壇「＋に強化」（data-altar-mode=upgrade）', 'maybe', 'HeroTasks の祭壇');
  add('altar:transmute', 'altar', '晶石の祭壇「変異させる」（data-altar-mode=transmute）', 'maybe', 'HeroTasks の祭壇');
  add('peddler-buy', 'spawn', '行商人で買った', 'maybe', 'HeroTasks の行商人');
  // 区切り 3-S（揺さぶり・実機の不具合の確かめ）。前の区切りまでは「後の区切り」だった 19 行
  for (const [k, label] of [['bug1', 'イベントの2段階の合意'], ['bug2', '狭い画面のシート'], ['bug3', '待ち中に「通信が切れています」が出ない'], ['bug4', '取り合いとカード3択の順'], ['bug5', '転職のカード選び'], ['bug6', '祠で片方が先に終わる']]) add(`check:${k}`, 'check', `実機の不具合の確かめ: ${label}`, 'must', '計画 §3-7');
  for (let i = 1; i <= 13; i++) add(`shake:S${i}`, 'shake', `揺さぶり S${i}`, 'must', '計画 §5・直し3');
  return rows;
}

const covOf = (board) => (board.cov ??= { rows: buildCoverage(), runNo: 1, prev: {}, tabs: {}, scourgeFight: null, lastDungeon: {} });

/** 行に「踏んだ」の印を付ける（最初の1回だけ）。how = 何を見て決めたか */
export function step(board, id, how) {
  const cov = covOf(board);
  const r = cov.rows.find((x) => x.id === id);
  if (!r || r.stepped) return false;
  r.stepped = { run: cov.runNo, at: new Date().toISOString(), how };
  return true;
}

/** そのグループで踏んだ行の数 */
export function covDone(board, group) {
  if (!board.cov && !KB.world) return 0;
  return covOf(board).rows.filter((r) => r.group === group && r.stepped).length;
}

/** その行をまだ踏んでいないか（行が無ければ true） */
export function covWant(board, id) {
  if (!board.cov && !KB.world) return true;
  const r = covOf(board).rows.find((x) => x.id === id);
  return !r || !r.stepped;
}

/**
 * 2段目: 全端末の View から「踏んだ」を書く（run が毎ステップ呼ぶ）。見るのは画面の印と字だけ。
 */
export function coverageObserve(views, board) {
  if (!KB.world) return;
  const cov = covOf(board);
  const evWhere = Object.fromEntries(KB.world.events.map((e) => [e.id, e.where]));
  for (const v of views) {
    if (v.screen !== 'game') continue;
    const prev = cov.prev[v.seat];
    const m = v.mode;
    const f = v.facts;
    // 町: 町の id・タブ（金のボタン = 今開いているタブ）・依頼の状態
    const town = (f.tTown ?? [])[0]?.['data-town'];
    if (m === 'town' && town) {
      step(board, `town:${town}`, `${v.seat}: 町の画面（data-town=${town}）`);
      const sel = (f.tTabs ?? []).find((t) => /\bbtn-gold\b/.test(t.class ?? ''))?.['data-town-tab'];
      const tabs = (cov.tabs[town] ??= new Set());
      if (sel) tabs.add(sel);
      if (TOWN_TABS.every((t) => tabs.has(t))) step(board, 'town-tabs', `${v.seat}: 町「${town}」で5つのタブを開いた`);
      for (const q of f.tQuests ?? []) {
        const st = q['data-quest-state'];
        if (st === 'active' || st === 'report' || st === 'done') {
          step(board, `quest:${q['data-quest']}:accept`, `${v.seat}: 依頼の状態 ${st}`);
          step(board, 'town-action:quest-accept', `${v.seat}: 依頼「${q['data-quest']}」の状態 ${st}`);
        }
        if (st === 'done') {
          step(board, `quest:${q['data-quest']}:report`, `${v.seat}: 依頼の状態 done（達成済み）`);
          step(board, 'town-action:quest-report', `${v.seat}: 依頼「${q['data-quest']}」が達成済み`);
        }
      }
    }
    // ダンジョン: 入った（data-dungeon）・制覇（制覇の画面を、そのダンジョンの中で見た）
    const dun = (f.dungeonId ?? [])[0]?.['data-dungeon'];
    if (dun) {
      cov.lastDungeon[v.seat] = dun;
      step(board, `dungeon:${dun}:enter`, `${v.seat}: ダンジョンの画面（data-dungeon=${dun}）`);
    }
    if (m === 'cleared' && cov.lastDungeon[v.seat]) step(board, `dungeon:${cov.lastDungeon[v.seat]}:clear`, `${v.seat}: 制覇の画面（data-cleared-body）`);
    // イベント（data-event-window の値 = イベントの id）
    if (m === 'event') {
      const id = (f.eventId ?? [])[0]?.['data-event-window'];
      if (id) {
        step(board, `event:${id}`, `${v.seat}: イベントの画面（data-event-window=${id}）`);
        const where = evWhere[id];
        if (where) step(board, `events:${where}`, `${v.seat}: 「${id}」`);
        if (/^spawn(Star|Peddler|Thief)$/.test(id)) step(board, `spawn:${id.slice(5).toLowerCase()}`, `${v.seat}: 出現スポットのイベント ${id}`);
      }
    }
    // 祠・神殿と祭壇
    const sh = (f.sShrine ?? [])[0];
    if (sh && m === 'shrine') {
      step(board, `shrine:${sh['data-shrine']}`, `${v.seat}: 祠の画面（data-shrine=${sh['data-shrine']}）`);
      step(board, 'shrines', `${v.seat}: 祠「${sh['data-shrine']}」`);
    }
    if (sh && m === 'sanctuary') {
      step(board, `sanctuary:${sh['data-shrine']}`, `${v.seat}: 神殿・祭壇の画面（data-sanctuary=${sh['data-sanctuary']}）`);
      step(board, 'sanctuaries', `${v.seat}: 「${sh['data-shrine']}」`);
    }
    // 見晴らしの塔（地図の塔の印に data-used が付いた = 登った）
    if (m === 'world' && (f.wFeatures ?? []).some((x) => String(x['data-feature']).startsWith('tower:') && x['data-used'] !== null && x['data-used'] !== undefined)) step(board, 'tower', `${v.seat}: 地図の塔の印に data-used`);
    // 地図の宝箱（世界マップから宝箱の画面へ）
    if (m === 'chest' && prev === 'world') step(board, 'map-chest', `${v.seat}: 世界マップから宝箱の画面`);
    // 遭遇の種類・災厄
    const ek = (f.eKind ?? [])[0]?.['data-encounter'];
    if (m === 'encounter') {
      if (ek === 'ambushed') step(board, 'encounter:night', `${v.seat}: 夜襲（data-encounter=ambushed）`);
      const sc = (f.eScourge ?? [])[0]?.['data-encounter-scourge'];
      if (sc) {
        step(board, `scourge:${sc}:meet`, `${v.seat}: 災厄の遭遇（data-encounter-scourge=${sc}）`);
        cov.scourgeFight = sc;
      } else cov.scourgeFight = null;
    }
    if (m === 'battle' && cov.scourgeFight && (f.bResult ?? [])[0]?.['data-result'] === 'victory') {
      step(board, `scourge:${cov.scourgeFight}:defeat`, `${v.seat}: 災厄との戦闘の結果「勝ち」`);
    }
    if (m !== 'battle' && m !== 'encounter' && m !== 'reward') cov.scourgeFight = null;
    // 転職: 専用カード選びの題「〇〇に転職した！」→ ジョブの段
    const jt = f.jPickTitle;
    if (jt && /に転職した！/.test(jt)) {
      const name = jt.replace(/に転職した！.*$/, '').trim();
      const c = KB.classes[KB.classByName[name]];
      if (c && c.tier !== 'base') step(board, `job:${c.tier}`, `${v.seat}: 「${jt}」`);
    }
    // 全滅の後・ゲームオーバー・エンディング
    const res = (f.bResult ?? [])[0]?.['data-result'];
    if (res === 'retreat') step(board, 'wipe-retreat', `${v.seat}: 結果のボタン data-result=retreat`);
    if (m === 'gameover' || (f.gameover ?? []).length) step(board, 'gameover', `${v.seat}: ゲームオーバーの画面（data-gameover）`);
    if (m === 'ending' || (f.ending ?? []).length) {
      step(board, 'ending', `${v.seat}: エンディングの画面（data-ending）`);
      // 最後のダンジョンは、制覇の画面を出さずにエンディングへ進む（ボスを倒した後）。エンディングを見た = 最後のダンジョンを制覇した
      const fin = (KB.world.dungeons ?? []).find((d) => d.finale);
      if (fin && cov.lastDungeon[v.seat] === fin.id) step(board, `dungeon:${fin.id}:clear`, `${v.seat}: 最後のダンジョン（data-dungeon=${fin.id}）の後にエンディングの画面`);
    }
    cov.prev[v.seat] = m;
  }
  // 頭が押した事（押した後の字が画面に残らない物）: 板の covMarks から移す
  for (const e of (board.covMarks ?? []).splice(0)) step(board, e.id, e.how);
  // 部屋の種類（扉の予兆）・遭遇の3択（頭が数えた物 = 選んだ扉の部屋の画面に入った・遭遇のボタンを押した）
  for (const [k, n] of Object.entries(board.dungeon?.seen ?? {})) if (n > 0 && k) step(board, `room:${k}`, `扉の予兆 ${k} の部屋に入った（${n} 回）`);
  for (const [k, n] of Object.entries(board.encounter ?? {})) if (n > 0) step(board, `encounter:${k}`, `遭遇の「${k}」を押した（${n} 回）`);
}

/** 新しい冒険（全滅でゲームオーバーの後の続き）: この後に踏んだ行は「やり直しの後」に数える */
export function coverageNextRun(board) {
  const cov = covOf(board);
  cov.runNo++;
  cov.prev = {};
  cov.lastDungeon = {};
}

/** 報告の行（markdown）と、数のまとめ */
export function coverageReport(board) {
  if (!KB.world) return { lines: ['網羅の表: 世界の説明書きが読めていない'], summary: null };
  const cov = covOf(board);
  const rows = cov.rows;
  const count = (need, pred) => rows.filter((r) => r.need === need && pred(r)).length;
  const sum = {};
  for (const need of ['must', 'maybe', 'later']) sum[need] = { all: count(need, () => true), run1: count(need, (r) => r.stepped?.run === 1), after: count(need, (r) => r.stepped && r.stepped.run > 1), not: count(need, (r) => !r.stepped) };
  const needName = { must: '必ず', maybe: '出たら', later: '後の区切り' };
  const lines = [
    `データから作った行: ${rows.length}（必ず ${sum.must.all}・出たら ${sum.maybe.all}・後の区切り ${sum.later.all}）　シナリオ: ${KB.world.scenarioName}（${KB.world.scenarioId}）`,
    `踏んだ: 必ず ${sum.must.run1 + sum.must.after}/${sum.must.all}（1回の通しで ${sum.must.run1}・やり直しの後で ${sum.must.after}）・出たら ${sum.maybe.run1 + sum.maybe.after}/${sum.maybe.all}（1回の通しで ${sum.maybe.run1}・やり直しの後で ${sum.maybe.after}）`,
    '',
    '| 行 | 必ず／出たら | 結果 | 何を見て決めたか |',
    '|---|---|---|---|',
  ];
  for (const r of rows) {
    const res = r.stepped ? (r.stepped.run === 1 ? '踏んだ（1回の通し）' : `踏んだ（やり直し ${r.stepped.run - 1} 回目の後）`) : r.need === 'later' ? '— 後の区切り' : r.ng ? '確かめ NG' : '踏んでいない';
    lines.push(`| ${r.label} | ${needName[r.need]} | ${res} | ${r.stepped?.how ?? r.ng ?? r.why ?? ''} |`);
  }
  const notMust = rows.filter((r) => r.need === 'must' && !r.stepped);
  lines.push('', `踏めなかった「必ず」の行: ${notMust.length ? notMust.map((r) => r.label).join('／') : 'なし'}`);
  return { lines, summary: sum, rows };
}
