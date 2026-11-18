// 賢いマルチプレイ検証 bot: 頭「戦闘」（計画 §4 の戦闘の行・区切り 2-Sa）
// 読む: 敵の予告（大技・特殊な行動 = かばう・手数読み・盾砕き・癒し封じ・増援・浄化・手負い狙い・本気）・弱点と耐性・BREAK の手がかり・連携の段・
//       味方の HP と被弾の予告。決める: 1手ずつ「カードを選ぶ → 的を選ぶ → 要るだけフォーカスを足す → 発動」。使う物が無ければ「準備完了」（1台なら「ターン終了」）。
// 決まり: 見るのは View と説明書き（content）だけ。乱数を使わない（同じ点なら左のカード・左の敵）。押すのは自分の席のキャラの物だけ。
// 状態（相談の板 board.battle）は「見た事」だけで書き換える（頭はどの端末でも毎回呼ばれ、押すのは1台だけなので、押した事を前提に数えない）。
import { G, decide, hasLayer } from './common.mjs';
import { KB } from '../content/load.mjs';
import { readAlly, readEnemy, cardScore, isHealCard, hpOf } from '../content/battle.mjs';

const T = { turn: true };

/** 画面の字「残りフォーカス X / Y」→ { left, total, spent } */
function panelFocus(text) {
  const m = /残りフォーカス\s*(\d+)\s*\/\s*(\d+)/.exec(text ?? '');
  if (!m) return null;
  return { left: Number(m[1]), total: Number(m[2]), spent: Number(m[2]) - Number(m[1]) };
}

/** フォーカスの窓のカードの名前（窓の字の先頭〜「成功率」）→ 説明書き */
function panelCard(text) {
  const name = (text ?? '').split('成功率')[0].trim();
  const id = KB.cardByName[name];
  return id ? { ...KB.cards[id], name } : null;
}

/** 戦闘の場面を読む（頭が使う形） */
export function readBattle(v) {
  const enemies = (v.facts.bEnemies ?? []).map(readEnemy);
  const allies = (v.facts.bAllies ?? []).map(readAlly);
  const me = allies.find((a) => a.mine) ?? null;
  const endTurn = (v.facts.bEndTurn ?? [])[0]?.['data-end-turn'] ?? null;
  const hand = (v.facts.bHand ?? []).map((h) => ({ index: Number(h['data-card-index']), id: h['data-card-id'], usable: h['data-usable'] !== null, card: KB.cards[h['data-card-id']] }));
  const alive = enemies.filter((e) => !e.dead);
  const guard = alive.find((e) => e.behavior === 'guard' && !e.broken)?.uid ?? null;
  const shatter = alive.some((e) => e.behavior === 'shatter' && !e.broken && me && e.targets.includes(me.id));
  const punishMin = Math.min(...alive.map((e) => e.punishMin ?? 99));
  return { enemies, allies, me, endTurn, hand, guard, shatter, punishMin };
}

/** 板の戦闘の欄（席ごと）。ターンの始まりの手札の数を覚えて、使った枚数を数える（手数読み） */
function turnState(board, v, b) {
  board.battle ??= {};
  const st = (board.battle[v.seat] ??= { phase: null, startHand: 0, turn: 0, pouchTried: -1 });
  const phase = b.endTurn === 'enemy' ? 'enemy' : b.endTurn ? 'ally' : null;
  if (phase === 'ally' && st.phase !== 'ally') {
    st.turn++;
    st.startHand = b.hand.length;
  }
  st.phase = phase;
  return st;
}

/** フォーカスの窓が開いている時の1手 */
function panelBrain(v, b) {
  const text = v.facts.bPanel ?? '';
  const go = v.facts.bGoText ?? '';
  const card = panelCard(text);
  const chips = v.facts.bChips ?? [];
  const allyChips = v.facts.bAllyChips ?? [];
  // 1. 敵の的を選ぶ（「敵をタップ」）
  if (go.includes('敵をタップ') || (chips.length && !chips.some((c) => c['data-chip-selected'] !== null) && card?.target === 'enemy')) {
    const enemies = new Map(b.enemies.map((e) => [e.uid, e]));
    const rank = (c) => {
      const e = enemies.get(c['data-target-chip']) ?? { combo: 0, big: false, hp: 999 };
      let s = 0;
      const tags = [];
      if (c['data-kill-badge'] === 'sure') { s += 100; tags.push('確実に撃破'); }
      if (c['data-break-chip'] === 'now') { s += 80; tags.push('BREAK!'); }
      if (c['data-kill-badge'] === 'perfect') { s += 50; tags.push('完全で撃破'); }
      if (c['data-break-chip'] === 'perfect') { s += 40; tags.push('完全で BREAK'); }
      if (c['data-weak-chip'] !== null) { s += 20; tags.push('弱点'); }
      if (c['data-resist-chip'] !== null) { s -= 20; tags.push('耐性'); }
      if (c['data-miss-chip'] !== null) { s -= 60; tags.push('外れる'); }
      if (e.combo > 0) { s += 10 * e.combo; tags.push(`連携 +${e.combo}`); }
      if (['call', 'purify', 'healSeal'].includes(e.behavior)) { s += 8; tags.push('先に倒す'); }
      if (e.big && !e.broken) { s += 5; tags.push('大技の予告'); }
      s -= e.hp / 100; // 同じ点なら HP の低い敵（小さな差）
      return { s, tags };
    };
    let best = null;
    for (const c of chips) {
      const r = rank(c);
      if (!best || r.s > best.r.s) best = { c, r };
    }
    if (best) return decide(G.targetChip(best.c['data-target-chip']), `的 ${best.c['data-target-chip']}（${best.r.tags.join('・') || best.c['data-chip-prediction'] || '先頭'}）`, T);
    return decide(G.battleCancel, '的が選べないのでカードをやめる', T);
  }
  // 2. 味方の的を選ぶ（「味方をタップ」）: 回復は HP の割合が一番低い味方、それ以外は自分（無ければ左）
  if (go.includes('味方をタップ')) {
    const list = allyChips.map((c) => ({ id: c['data-ally-target-chip'], ...hpOf(c.text), dead: /戦闘不能/.test(c.text) })).filter((x) => !x.dead || card?.target === 'fallenAlly');
    if (!list.length) return decide(G.battleCancel, '味方の的が選べないのでカードをやめる', T);
    let pick;
    if (isHealCard(card)) pick = [...list].sort((x, y) => x.hp / x.max - y.hp / y.max || (x.id < y.id ? -1 : 1))[0];
    else pick = list.find((x) => x.id === b.me?.id) ?? list[0];
    return decide(G.allyChip(pick.id), `味方の的 ${pick.id}（${isHealCard(card) ? `回復・HP ${pick.hp}/${pick.max}` : '支援'}）`, T);
  }
  // 3. 要るだけフォーカスを足す（BREAK・撃破が「完全成功なら」の時。弱点で完全成功の決まりの敵も）
  const f = panelFocus(text);
  const sel = chips.find((c) => c['data-chip-selected'] !== null);
  const selE = sel ? b.enemies.find((e) => e.uid === sel['data-target-chip']) : null;
  let want = 0;
  let why = '';
  if (sel?.['data-break-chip'] === 'perfect' || (selE?.breakRule === 'weak-perfect' && sel?.['data-weak-chip'] !== null && !selE?.broken)) {
    want = 99;
    why = 'BREAK のために完全成功を狙う';
  } else if (sel?.['data-kill-badge'] === 'perfect') {
    want = 99;
    why = '倒し切るためにフォーカスを足す';
  } else if (f && f.total >= 4 && (card?.slots ?? 1) >= 2) {
    want = 1;
    why = 'フォーカスに余裕があるので1つ足す';
  }
  if (f && f.spent < want && v.facts.bPlus) return decide(G.focusPlus, `フォーカスを足す（${f.spent}→${f.spent + 1}・${why}）`, T);
  // 4. 発動
  if (go.startsWith('発動') && !go.includes('タップ')) return decide(G.battleGo, `「発動」（${card?.name ?? '?'}・フォーカス ${f?.spent ?? 0}）`, T);
  return null;
}

/** 道具袋（戦闘中）: HP の低い自分に回復の薬を使う。使えなければ閉じる */
function pouchBrain(v, b) {
  const useTo = (v.facts.bUseTo ?? []).filter((u) => u.disabled === null);
  if (useTo.length && b.me) {
    const self = useTo.find((u) => u['data-use-to'] === b.me.id) ?? useTo[0];
    return decide(G.useTo(self['data-use-to']), `薬を使う（${self['data-use-to']}・HP ${b.me.hp}/${b.me.max}）`, T);
  }
  const items = (v.facts.bPouchItems ?? []).map((r) => r['data-pouch-item']).filter((id) => (KB.items[id]?.heal ?? 0) > 0);
  if (items.length) {
    const id = [...items].sort((x, y) => KB.items[x].heal - KB.items[y].heal || (x < y ? -1 : 1))[0];
    return decide(G.pouchItem(id), `道具袋の「${KB.items[id]?.name ?? id}」を選ぶ（回復）`, T);
  }
  return decide(G.sheetClose, '道具袋を閉じる（回復の薬が無い）', T);
}

/** 手札から、このターンに使う値打ちの一番高いカード（無ければ null） */
function bestCard(b) {
  const ctx = { enemies: b.enemies, allies: b.allies, me: b.me, guard: b.guard, shatter: b.shatter };
  let best = null;
  for (const h of b.hand.filter((x) => x.usable)) {
    const r = cardScore(h.card, ctx);
    if (!best || r.score > best.r.score) best = { h, r };
  }
  return best;
}

/**
 * 戦闘中の確認の窓「ターン終了」（まだ行動できる仲間がいる時に出る）。common より先に聞く（run の brainFor）。
 * bot が自分で「準備完了」を押した時は「ターンを終了する」。まだ使う値打ちのあるカードがあるのに出ている時は「やめる」で閉じ、注意に書く
 * （区切り 2-Sa の通しで、前の戦闘で押した「準備完了」の確認の窓が、仲間が戦闘を終わらせた後も残り、次の戦闘の最初に出た。
 *   common が「はい」を押して、最初のターンを1枚も使わずに終えた）
 */
export function battleConfirmBrain(v, board) {
  if (v.screen !== 'game' || v.mode !== 'battle') return null;
  const c = v.layers.find((l) => l.id === 'confirm');
  if (!c || c.value !== 'ターン終了') return null;
  const b = readBattle(v);
  const st = turnState(board, v, b);
  const best = bestCard(b);
  const plays = Math.max(0, st.startHand - b.hand.length);
  if (best && best.r.score > 0 && b.enemies.some((e) => !e.dead)) {
    if (plays === 0) {
      board.notes ??= [];
      board.seenNotes ??= new Set();
      const key = `stale-confirm|${v.seat}|${st.turn}|${(board.stats?.battles ?? []).length}`;
      if (!board.seenNotes.has(key)) {
        board.seenNotes.add(key);
        board.notes.push({ kind: 'warn', text: `${v.seat}: ターンの始めに、まだカードを使っていないのに「ターン終了」の確認の窓が出ている（前の戦闘で押した「準備完了」の確認の窓が残った形）。bot は「やめる」で閉じた` });
      }
    }
    return decide(G.confirmCancel, `確認の窓「ターン終了」を閉じる（まだ使うカードがある: ${best.h.card?.name ?? best.h.id}）`, T);
  }
  return decide(G.confirmOk, '確認の窓「ターンを終了する」', T);
}

/**
 * 戦闘の1手。返す物: 決め か null（待つ）
 */
export function battleBrain(v, board) {
  if (v.screen !== 'game' || v.mode !== 'battle') return null;
  if (hasLayer(v, 'confirm') || hasLayer(v, 'story')) return null;
  const b = readBattle(v);
  const st = turnState(board, v, b);
  // 最初の戦闘の案内は1回閉じる（手札の上に重なる帯）
  if ((v.facts.bFirstGuide ?? 0) > 0) return decide(G.firstGuideClose, '最初の戦闘の案内を閉じる', T);
  // 道具袋のシートが開いている
  const sheet = v.layers.find((l) => l.id === 'sheet')?.value;
  if (sheet === 'pouch') {
    st.pouchTried = st.turn;
    return pouchBrain(v, b);
  }
  if (sheet) return null; // ほかのシートは common が閉じる
  if (v.facts.bPanel) return panelBrain(v, b);
  if (b.endTurn !== 'end' && b.endTurn !== 'ready') return null; // 敵の行動中・準備完了を押して待っている
  if (!b.me || b.me.dead) {
    // 倒れていても、自分の席の「準備完了」は押す（押さないと仲間が待ち続ける）
    return decide(G.endTurn(b.endTurn), `「${b.endTurn === 'ready' ? '準備完了' : 'ターン終了'}」（自分のキャラは戦闘不能）`, T);
  }
  // 敵がまだ描かれていない（戦闘の始まりの登場の途中）間は決めない（敵が見えないまま「準備完了」を押さない）
  if (!b.enemies.some((e) => !e.dead)) return null;
  const usable = b.hand.filter((h) => h.usable);
  const plays = Math.max(0, st.startHand - b.hand.length);
  const best = bestCard(b);
  // 手数読み: このターンに使った枚数が「N枚以上で反撃」の手前なら、倒し切れる時だけ使う
  const punishStop = b.punishMin < 99 && plays >= b.punishMin - 1 && !(best?.r.why ?? '').includes('倒し切れる');
  // 回復のカードが無く、自分の HP が3割以下なら、道具袋の薬（1ターン1回まで見る）
  const lowMe = b.me.hp / b.me.max <= 0.3 || b.me.incoming >= b.me.hp;
  const healInHand = usable.some((h) => isHealCard(h.card));
  if (lowMe && !healInHand && st.pouchTried !== st.turn) return decide(G.battlePouch, `道具袋を開く（自分の HP ${b.me.hp}/${b.me.max}・被弾の予告 ${b.me.incoming}）`, T);
  if (best && best.r.score > 0 && !punishStop) {
    return decide(G.handCard(best.h.index), `カード ${best.h.index}（${best.h.card?.name ?? best.h.id}）: ${best.r.why}`, T);
  }
  const why = punishStop ? `手数読み（${b.punishMin}枚以上で反撃）なので止める` : usable.length ? '使う値打ちのあるカードが無い' : '使えるカードが無い';
  return decide(G.endTurn(b.endTurn), `「${b.endTurn === 'ready' ? '準備完了' : 'ターン終了'}」（${why}）`, T);
}

/**
 * 戦闘の記録（直し14: 戦闘の数・1戦のターン数・全滅の場所。数字は直さず記録だけ）。run が毎ステップ全端末の View で呼ぶ（見た事だけ）。
 * board.stats = { battles: [{ n, where, enemies, turns, result }], current }
 */
export function battleObserve(views, board) {
  const s = (board.stats ??= { battles: [], current: null, place: null });
  const v = views.find((x) => x.seat === 'P1') ?? views[0];
  if (!v || v.screen !== 'game') return;
  // 戦闘の場所（直前のダンジョン・深さ。世界マップなら「世界マップ」）
  if (v.mode === 'dungeon') s.place = `${(v.facts.dungeonId ?? [])[0]?.['data-dungeon'] ?? 'ダンジョン'}・${v.facts.dDepth ?? ''}`.trim();
  else if (v.mode === 'world') s.place = '世界マップ';
  // 報酬の段の順の確かめは、1回の報酬ごと（報酬の画面を出たら空にする。brain/reward.mjs の checkOrder）
  board.rewardSeen ??= {};
  for (const x of views) if (x.mode !== 'reward') board.rewardSeen[x.seat] = [];
  // 自分のキャラの名前を覚える（取り合いで「獲得！」を読むのに使う）
  for (const x of views) {
    if (x.mode !== 'battle') continue;
    const mine = (x.facts.bAllies ?? []).find((r) => /(\d+)枚$|済$/.test((r.text ?? '').trim()));
    if (mine?.name) {
      board.me ??= {};
      (board.me[x.seat] ??= { job: null, picks: {}, gear: {}, name: null, claims: {} }).name = mine.name;
    }
  }
  const end = (v.facts.bEndTurn ?? [])[0]?.['data-end-turn'] ?? null;
  if (v.mode === 'battle') {
    if (!s.current) {
      const room = s.place !== '世界マップ' && board.dungeon?.lastRoom?.mode === 'battle' ? board.dungeon.lastRoom.kind : null;
      s.current = { n: s.battles.length + 1, where: `${s.place ?? '?'}${room ? `・${room}` : ''}`, enemies: (v.facts.bEnemies ?? []).map((e) => (e.info ?? '').replace(/^Lv\d+\s*/, '').trim()).filter(Boolean), turns: 0, result: null, lastEnd: null };
    }
    const c = s.current;
    // 敵の名前（戦闘の始まりの登場の途中は描かれていない事があるので、後から埋める）
    const names = (v.facts.bEnemies ?? []).map((e) => (e.info ?? '').replace(/^Lv\d+\s*/, '').trim()).filter(Boolean);
    if (names.length > c.enemies.length) c.enemies = names;
    if ((end === 'end' || end === 'ready') && c.lastEnd !== 'end' && c.lastEnd !== 'ready') c.turns++;
    if (end) c.lastEnd = end;
    const res = (v.facts.bResult ?? [])[0]?.['data-result'];
    if (res) c.result = res;
  } else if (s.current) {
    const c = s.current;
    delete c.lastEnd;
    s.battles.push(c);
    s.current = null;
  }
}
