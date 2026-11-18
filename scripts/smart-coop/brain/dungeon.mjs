// 賢いマルチプレイ検証 bot: 頭「ダンジョンの部屋」（計画 §4 の扉・休憩・イベント・宝箱・漂流物の山の行・区切り 2-Sa）
// 扉: 予兆の種類で選び分ける（まだ入っていない種類を先に・HP が低ければ休憩・強敵は全員の HP が7割以上の時だけ）。全員が同じ扉に票を入れる（先に入った票にそろえる）。
// 休憩: HP 6割以下の人がいれば「休む」・磨ける札があれば「技を磨く」・フォーカスが減っていれば「瞑想する」。
// イベント: 2段の合意（選ぶ段は全員が同じ選択肢 → 挑む段は挑む役の持ち主がフォーカスを決めて「挑戦する」）。
// 宝箱: 「だれが開ける？」を画面の成功率の字で bot も計算し、全員がその人に「任せる」（ゲームの「おすすめ」と違えば注意に書く。直し11）→ 持ち主がフォーカスを足して開ける → 取り合い → 先へ。
// キャラの作業（カードの強化・漂流物の山・お供・行商人）と、制覇の後の画面も、ここで答える。
// 決まり: 見るのは View と説明書きだけ。乱数を使わない（同じ点なら左）。board は「見た事」だけで書き換える。
import { G, decide, hasLayer } from './common.mjs';
import { KB, rarityRank } from '../content/load.mjs';
import { DOOR_KINDS, doorKindOf, partyHp, restHp, optionKind, checkFrom, openerOf } from '../content/dungeon.mjs';
import { cardValue } from '../content/reward.mjs';
import { claimBrain, meOf, boardNote } from './reward.mjs';

const T = { turn: true };
const seatsOf = (s) => String(s ?? '').split(',').filter(Boolean);

function dstate(board) {
  return (board.dungeon ??= { seen: {}, lastKind: null, events: {}, chests: 0, restKinds: {}, doorsChosen: 0 });
}

/** 扉の1手 */
function doorBrain(v, board) {
  const doors = (v.facts.dDoors ?? []).filter((d) => d.disabled === null);
  if (!doors.length) return null;
  const st = dstate(board);
  const all = v.facts.dDoors ?? [];
  // 自分の票が入っていれば待つ
  if (all.some((d) => d['data-my-vote'] !== null)) return null;
  // ほかの人の票があれば、その扉にそろえる（全員一致で開く）
  const voted = all.find((d) => seatsOf(d.votes).length > 0);
  if (voted) {
    const k = doorKindOf(voted);
    return decide(G.doorPick(voted['data-door-choice']), `扉 ${voted['data-door-choice']}（${DOOR_KINDS[k]?.name ?? k}）: 仲間の票にそろえる`, T);
  }
  const hp = partyHp(v.facts.dParty);
  const minR = hp.length ? Math.min(...hp.map((h) => h.r)) : 1;
  const chill = Number((v.facts.dChill ?? [])[0]?.['data-chill'] ?? 0);
  let best = null;
  for (const [i, d] of doors.entries()) {
    const k = doorKindOf(d);
    const info = DOOR_KINDS[k] ?? { name: k, base: 1 };
    let s = info.base;
    const why = [info.name];
    if (!st.seen[k] && k !== 'boss' && k !== 'midboss') {
      s += 20;
      why.push('まだ入っていない種類');
    }
    if (k === 'rest') {
      if (minR < 0.6) { s += 40; why.push(`HP が低い（${Math.round(minR * 100)}%）`); }
      else if (minR >= 0.9) { s -= 10; why.push('HP は足りている'); }
      if (chill >= 2) { s += 20; why.push(`凍え ${chill}`); }
    }
    if (k === 'elite' || k === 'sealed') {
      if (minR < 0.7) { s -= 50; why.push('全員の HP が7割より下なので避ける'); }
    }
    const beyond = String(d.beyond ?? '').split(',').filter(Boolean);
    if (beyond.includes('rest') && minR < 0.6) { s += 5; why.push('その先に休憩'); }
    if (!best || s > best.s) best = { d, s, why, i };
  }
  return decide(G.doorPick(best.d['data-door-choice']), `扉 ${best.d['data-door-choice']}（${best.why.join('・')}）`, T);
}

/** 休憩の1手 */
function restBrain(v, board) {
  const opts = v.facts.dRest ?? [];
  if (!opts.length) return null;
  if (opts.some((o) => seatsOf(o.votes).includes(v.seat))) return null;
  const other = opts.find((o) => seatsOf(o.votes).length > 0);
  if (other) return decide(G.restPick(other['data-rest']), `休憩「${other['data-rest']}」: 仲間の票にそろえる`, T);
  const hp = restHp(v.facts.dRestHeroes);
  const minR = hp.length ? Math.min(...hp.map((h) => h.r)) : 1;
  const focusLow = hp.some((h) => h.focus !== null && h.focus < h.focusMax);
  const st = dstate(board);
  const up = opts.find((o) => o['data-rest'] === 'upgrade' && o.disabled === null);
  let kind;
  let why;
  if (minR <= 0.6) [kind, why] = ['hp', `HP が6割以下の人がいる（${Math.round(minR * 100)}%）`];
  else if (!st.restKinds.focus && focusLow) [kind, why] = ['focus', '瞑想を1回は通す（フォーカスが減っている）'];
  else if (up) [kind, why] = ['upgrade', '磨ける札がある'];
  else if (focusLow) [kind, why] = ['focus', 'フォーカスが減っている'];
  else [kind, why] = ['hp', 'ほかに要る物が無い'];
  return decide(G.restPick(kind), `休憩「${{ hp: '休む', focus: '瞑想する', upgrade: '技を磨く' }[kind]}」（${why}）`, T);
}

/** イベントの1手（選ぶ段 → 挑む段 → 結果） */
function eventBrain(v, board) {
  const st = dstate(board);
  // 結果の後: 「先へ進む」「戦闘を始める」の票
  const fin = (v.facts.dEventPanelButtons ?? []).find((b) => b.disabled === null && /^(先へ進む|戦闘を始める)/.test(b.text));
  if (fin) {
    if (seatsOf(fin.votes).includes(v.seat)) return null;
    const word = fin.text.startsWith('先へ進む') ? '先へ進む' : '戦闘を始める';
    return decide(G.eventFinish(word), `イベントの結果「${word}」`, T);
  }
  // 挑む段: 挑む役の持ち主だけ（ほかの人は待つ）
  const ch = (v.facts.dChallenge ?? [])[0];
  if (ch) {
    if (ch['data-challenge-mine'] !== '1') return null;
    const c = checkFrom(v);
    if (c?.mismatch) boardNote(board, `mis|${c.mismatch}`, `字と印が違う（直し8）: ${v.seat}: ${c.mismatch}`, 'warn');
    if (c && (c.spent < 1 || c.pct <= 80) && v.facts.checkPlusOn) return decide(G.checkPlus, `挑む段: フォーカスを足す（${c.spent}→${c.spent + 1}・成功率 ${c.pct}%）`, T);
    return decide(G.challengeGo, `挑む段「挑戦する」（成功率 ${c?.pct ?? '?'}%・フォーカス ${c?.spent ?? '?'}）`, T);
  }
  // 1人で挑む判定（世界マップのマスのイベントなど、場面に自分のキャラだけの時）: 選択肢を押すと下の段に判定の窓と「挑戦する」（印なし）が出る
  const solo = (v.facts.dEventPanelButtons ?? []).find((b) => b.disabled === null && /^挑戦する/.test(b.text));
  if (solo) {
    const c = checkFrom(v);
    if (c?.mismatch) boardNote(board, `mis|${c.mismatch}`, `字と印が違う（直し8）: ${v.seat}: ${c.mismatch}`, 'warn');
    if (c && (c.spent < 1 || c.pct <= 80) && v.facts.checkPlusOn) return decide(G.checkPlus, `判定: フォーカスを足す（${c.spent}→${c.spent + 1}・成功率 ${c.pct}%）`, T);
    return decide(G.eventTry, `判定「挑戦する」（成功率 ${c?.pct ?? '?'}%・フォーカス ${c?.spent ?? '?'}）`, T);
  }
  // 選ぶ段
  const opts = (v.facts.dOptions ?? []).map((o) => ({ i: o['data-event-option'], text: o.text, chance: o.chance === null ? null : Number(o.chance), kindMark: o['data-option-kind'], mine: o['data-my-vote'] !== null, votes: seatsOf(o.votes), enabled: o.disabled === null }));
  if (!opts.length) return null;
  if (opts.some((o) => o.mine)) return null;
  const other = opts.find((o) => o.votes.length > 0 && o.enabled);
  if (other) return decide(G.eventOption(other.i), `イベントの選択肢 ${other.i}「${other.text.slice(0, 16)}」: 仲間の票にそろえる`, T);
  let best = null;
  for (const o of opts.filter((x) => x.enabled)) {
    const k = optionKind(o);
    let s = k === 'check' ? o.chance : k === 'leave' || k === 'other' ? 45 : k === 'pay' ? 35 : 30;
    if (!st.events[k]) s += k === 'check' ? 10 : 20;
    if (!best || s > best.s) best = { o, k, s };
  }
  if (!best) return null;
  return decide(G.eventOption(best.o.i), `イベントの選択肢 ${best.o.i}「${best.o.text.slice(0, 16)}」（${best.k}${best.o.chance !== null ? `・${best.o.chance}%` : ''}${st.events[best.k] ? '' : '・まだ選んでいない種類'}）`, T);
}

/** 宝箱の1手 */
function chestBrain(v, board) {
  const st = dstate(board);
  const btn = (re) => (v.facts.chestButtons ?? []).find((b) => b.disabled === null && re.test(b.text));
  // 演出: 最初の1回は最後まで見る。2回目からは飛ばす
  const skip = btn(/^タップで結果まで飛ばす/);
  if (skip) return st.chests > 1 ? decide(G.chestSkip, '宝箱の演出を飛ばす') : null;
  // 開け役を決める
  const rows = (v.facts.openers ?? []).map(openerOf);
  if (rows.length) {
    // 画面の成功率の字で bot も選ぶ: フォーカスを足した時の成功率が一番高い人（同じなら「おすすめ」の人 → フォーカス0の成功率 → 上の行）
    for (const r of rows) if (r.mismatch) boardNote(board, `mis|${r.mismatch}`, `字と印が違う（直し8）: ${v.seat}: ${r.mismatch}`, 'warn');
    const rec = rows.find((r) => r.best);
    const pick = [...rows].sort((a, b) => b.pMax - a.pMax || Number(b.best) - Number(a.best) || b.p0 - a.p0)[0];
    if (rec && rec.id !== pick.id) boardNote(board, `opener|${rows.map((r) => `${r.id}:${r.p0}/${r.pMax}`).join(',')}`, `開け役: 画面の成功率の字で bot が選んだ ${pick.id}（${pick.p0}%→${pick.pMax}%）と、ゲームの「おすすめ」${rec.id}（${rec.p0}%→${rec.pMax}%）が違う`, 'warn');
    if (rows.some((r) => r.votes.includes(v.seat))) return null;
    return decide(G.openerPick(pick.id), `開け役「${pick.id} に任せる」（成功率 ${pick.p0}%・フォーカスを足すと ${pick.pMax}%${rec ? `・おすすめ ${rec.id}` : ''}）`, T);
  }
  if (v.facts.openerWait) return null; // ほかの人が開ける
  // 開ける（持ち主）: 鍵・封印は成功率 80% を超えるまで、運のスロットは1つだけフォーカスを足す
  const open = (v.facts.chestOpenKind ?? [])[0]?.['data-chest-open'];
  if (open) {
    const c = checkFrom(v);
    if (c?.mismatch) boardNote(board, `mis|${c.mismatch}`, `字と印が違う（直し8）: ${v.seat}: ${c.mismatch}`, 'warn');
    if (open !== 'guard' && c && v.facts.checkPlusOn) {
      const want = open === 'luck' ? c.spent < 1 : c.pct <= 80;
      if (want) return decide(G.checkPlus, `宝箱: フォーカスを足す（${c.spent}→${c.spent + 1}・${open === 'luck' ? '運のスロット' : `成功率 ${c.pct}%`}）`, T);
    }
    const word = { lock: '鍵を開ける', luck: '運のスロットで開ける', sealed: '封印を解く', guard: '番人と戦う' }[open] ?? open;
    return decide(G.chestOpen, `宝箱「${word}」（成功率 ${c?.pct ?? '-'}%・フォーカス ${c?.spent ?? 0}）`, T);
  }
  // 中身の取り合い
  const cl = claimBrain(v, board);
  if (cl) return cl;
  // 先へ（全員の票）
  const go = btn(/^(先へ進む|ダンジョン制覇！)/);
  if (go) {
    if (/P\d/.test(go.text) && go.text.includes(v.seat)) return null;
    return decide(G.chestLeave(go.text.replace(/P\d/g, '').trim()), `宝箱「${go.text.replace(/P\d/g, '').trim()}」`, T);
  }
  return null;
}

/** キャラの作業（data-hero-task の窓。ダンジョンでも世界マップでも出る） */
export function heroTaskBrain(v) {
  const task = (v.facts.dTask ?? [])[0];
  if (!task) return null;
  const title = task.title ?? '';
  // 区切り 2-Sb: 作業の種類は B12 の印 data-hero-task（pet・card・altar・peddler・flotsam）
  const kind = task['data-hero-task'] ?? null;
  const buttons = v.facts.dTaskButtons ?? [];
  const bt = (re) => buttons.find((b) => b.disabled === null && re.test(b.text));
  // 漂流物の山: 袋に入る品の中で格の一番高い物（同じなら左）。お金に換わる品は後回し
  const fl = v.facts.dFlotsam ?? [];
  if (fl.length) {
    const ranked = fl.map((f, i) => ({ i, id: f['data-flotsam-option'], gold: f.gold > 0, pick: f.pick, r: rarityRank(KB.items[f['data-flotsam-option']]?.rarity) })).sort((a, b) => Number(a.gold) - Number(b.gold) || b.r - a.r || a.i - b.i);
    const f = ranked[0];
    return decide(G.flotsamPick(f.pick ?? f.i), `漂流物の山「${KB.items[f.id]?.name ?? f.id}」（${f.gold ? 'お金に換わる' : '袋に入る'}${(v.facts.dFlotsamFull ?? 0) ? '・袋がいっぱい' : ''}）`);
  }
  // カードの作業（強化・外す・捧げる・祭壇）。行商人の札（買う物）はここで選ばない（区切り 2-Sb の通しで、お金の足りない札を選んで「決める」が押せなかった。bot の間違い）
  const cards = kind === 'peddler' ? [] : v.facts.dTaskCards ?? [];
  if (cards.length) {
    const me = { job: null };
    const vals = cards.map((c) => ({ i: c['data-pick-card'], name: c['aria-label'], val: cardValue(KB.cardByName[c['aria-label']], me.job), on: c['aria-pressed'] === 'true' }));
    const worst = /外す|捧げる/.test(title);
    const pick = [...vals].sort((a, b) => (worst ? a.val - b.val : b.val - a.val) || Number(a.i) - Number(b.i))[0];
    const panel = (v.facts.dTaskPanel ?? [])[0];
    if (pick.on && panel) return decide(G.taskCardGo, `${title}: 「${pick.name}」に決める`);
    return decide(G.taskCard(pick.i), `${title}: 「${pick.name}」を選ぶ（${worst ? '値打ちの一番低い札' : '値打ちの一番高い札'}）`);
  }
  // お供: 毛色が出たら「お供にする」（名前は例のまま）
  if (kind === 'pet' || /旅のお供/.test(title)) {
    if (!(v.facts.dPetRevealed ?? 0)) return null;
    const b = bt(/お供にする/);
    return b ? decide(G.taskButton('お供にする'), 'お供を迎える（名前は例のまま）') : null;
  }
  // 行商人・闇商人: 買わずに別れる（町と買い物は 2-Sb の頭）
  const bye = bt(/と別れる$/);
  if (bye) return decide(G.taskButton(bye.text), `「${bye.text}」（買い物は 2-Sb）`);
  return null;
}

/** 制覇の画面: 「抜け道を通る」があればそれ（次の目的地の近く）、無ければ「地上に戻る」 */
function clearedBrain(v) {
  const bs = (v.facts.dClearedButtons ?? []).filter((b) => b.disabled === null);
  if (!bs.length) return null;
  if (bs.some((b) => seatsOf(b.votes).includes(v.seat))) return null;
  const voted = bs.find((b) => seatsOf(b.votes).length > 0);
  const b = voted ?? bs.find((x) => x['data-shortcut'] !== null) ?? bs[0];
  if (b['data-shortcut'] !== null) return decide(G.clearedShortcut, `制覇の後「抜け道を通る」${voted ? '（仲間の票にそろえる）' : ''}`, T);
  const word = b.text.replace(/P\d/g, '').trim();
  return decide(G.clearedReturn(word), `制覇の後「${word}」${voted ? '（仲間の票にそろえる）' : ''}`, T);
}

/**
 * 見た事を板に書く（run が毎ステップ全端末の View で呼ぶ）: 入った部屋の種類（網羅）・イベントで選んだ種類・宝箱の数・休憩の種類
 */
export function dungeonObserve(views, board) {
  const st = dstate(board);
  const v = views.find((x) => x.seat === 'P1') ?? views[0];
  if (!v || v.screen !== 'game') return;
  if (v.mode === 'dungeon') {
    const doors = v.facts.dDoors ?? [];
    const voted = [...doors].sort((a, b) => seatsOf(b.votes).length - seatsOf(a.votes).length)[0];
    if (voted && seatsOf(voted.votes).length) st.lastKind = doorKindOf(voted);
  } else if (st.prevMode === 'dungeon' && st.lastKind !== null && ['battle', 'chest', 'rest', 'event'].includes(v.mode)) {
    st.seen[st.lastKind] = (st.seen[st.lastKind] ?? 0) + 1;
    st.doorsChosen++;
    st.lastRoom = { kind: st.lastKind, mode: v.mode };
    if (v.mode === 'chest') st.chests++;
  }
  // イベントの選択肢・休憩の3択: 票の一番多い物を覚えておき、選択肢が消えた（決まった）時に「選んだ種類」に数える
  //（全員の票がそろった瞬間に選択肢が消えるので、そろった形は見えない事が多い）
  const opts = v.mode === 'event' ? v.facts.dOptions ?? [] : [];
  if (opts.length) {
    const w = (o) => seatsOf(o.votes).length + (o['data-my-vote'] !== null ? 1 : 0); // 1人で選ぶ時（世界マップのマス）は票の印が無く、自分の印だけ
    const top = [...opts].sort((a, b) => w(b) - w(a))[0];
    st.lastOpt = w(top) ? optionKind({ text: top.text, chance: top.chance === null ? null : Number(top.chance), kindMark: top['data-option-kind'] }) : null;
  } else if (st.lastOpt) {
    st.events[st.lastOpt] = (st.events[st.lastOpt] ?? 0) + 1;
    st.lastOpt = null;
  }
  const rests = v.mode === 'rest' ? v.facts.dRest ?? [] : [];
  if (rests.length) {
    const top = [...rests].sort((a, b) => seatsOf(b.votes).length - seatsOf(a.votes).length)[0];
    st.lastRest = seatsOf(top.votes).length ? top['data-rest'] : null;
  } else if (st.lastRest) {
    st.restKinds[st.lastRest] = (st.restKinds[st.lastRest] ?? 0) + 1;
    st.lastRest = null;
  }
  st.prevMode = v.mode;
}

/**
 * ダンジョンの部屋の1手。返す物: 決め か null
 */
export function dungeonBrain(v, board) {
  if (v.screen !== 'game') return null;
  if (hasLayer(v, 'confirm') || hasLayer(v, 'story')) return null;
  const task = heroTaskBrain(v);
  if (task) return task;
  if (hasLayer(v, 'sheet')) return null;
  meOf(board, v.seat);
  // 待ちの帯（data-turn-lock = 手番の席）が出ていて自分の席でなければ、その場面の操作は手番の人の物（計画 §3-2: 頭が選ばない）
  const lock = (v.facts.turnLock ?? [])[0];
  if (lock && lock['data-turn-lock'] !== v.seat) return null;
  switch (v.mode) {
    case 'dungeon':
      return doorBrain(v, board);
    case 'rest':
      return restBrain(v, board);
    case 'event':
      return eventBrain(v, board);
    case 'chest':
      return chestBrain(v, board);
    case 'cleared':
      return clearedBrain(v);
    default:
      return null;
  }
}
