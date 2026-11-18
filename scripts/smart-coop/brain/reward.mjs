// 賢いマルチプレイ検証 bot: 頭「報酬」と「戦利品の取り合い」（計画 §4 の報酬・取り合いの行・区切り 2-Sa）
// 報酬の順: 成長（レベルアップの窓）→ 自分のカード（めくる → 説明の窓 →「このカードを選ぶ」か「選ばない」）→ 全員がそろってから取り合い → 「先へ進む」の票。
// 取り合い（報酬・宝箱の中身で同じ部品）: キャラごとに、ジョブの得意な武器と、bot が覚えている今の装備から「欲しい／余れば／いらない」。
// 決まり: 見るのは View と説明書きだけ。乱数を使わない。board は「見た事」だけで書き換える（同じ報酬で何回呼ばれても同じ答え）。
import { G, decide, hasLayer } from './common.mjs';
import { KB } from '../content/load.mjs';
import { growthRank, cardValue, deckAverage, claimChoice, CLAIM_WORD } from '../content/reward.mjs';

/** 板の「自分」の欄（席ごと）: ジョブ・覚えている山札と装備・名前（戦闘の味方の札で見た） */
export function meOf(board, seat) {
  board.me ??= {};
  return (board.me[seat] ??= { job: null, picks: {}, gear: {}, name: null, claims: {} });
}

/** bot が覚えている山札（ジョブの最初の山札＋報酬で選んだ札） */
function knownDeck(me) {
  return [...(me.job?.deck ?? []), ...Object.values(me.picks).filter(Boolean)];
}

/** 板に「確かめの結果」を書く（run が審判のメモに移す。同じ key は1回だけ） */
export function boardNote(board, key, text, kind = 'check') {
  board.notes ??= [];
  board.seenNotes ??= new Set();
  if (board.seenNotes.has(key)) return;
  board.seenNotes.add(key);
  board.notes.push({ kind, text });
}

/**
 * 取り合い（[data-claim] の窓が見えている時）。報酬の画面・宝箱の画面のどちらからも呼ぶ。返す物: 決め か null
 */
export function claimBrain(v, board) {
  const me = meOf(board, v.seat);
  for (const c of v.facts.claims ?? []) {
    // 区切り 2-Sb: 品の id は B10 の印 data-claim-item を先に使う
    const itemId = c['data-claim-item'] ?? c.itemId ?? KB.itemByName[(c.item ?? '').replace(/^✨?専用/, '').trim()];
    const name = KB.items[itemId]?.name ?? c.item ?? '?';
    // 結果（運の判定が出た後）: 自分のキャラが「獲得！」なら、覚えている装備を書き換える（見た事）
    if (me.name && itemId && new RegExp(`${me.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(欲しい|余れば|いらない)\\s*運\\s*\\d+\\s*獲得！`).test(c.text ?? '')) {
      const item = KB.items[itemId];
      // 区切り 2-Sb: 手に入れた品は持ち物に入るだけ（付けるのはステータスのシート）。次の自分の手番に brain/town.mjs の付け替えで見る
      const key = `${c.text?.slice(0, 40)}|${itemId}`;
      me.wonSeen ??= new Set();
      if (item && item.slot !== 'consumable' && !me.wonSeen.has(key)) {
        me.wonSeen.add(key);
        (me.pendingSlots ??= new Set()).add(item.slot);
      }
    }
    // 自分の行のボタン（B10 の印 data-claim-choice。この端末のキャラの行にだけ出る）
    const marks = (c.choices ?? []).filter(Boolean);
    const mine = marks.length ? marks : (c.buttons ?? []).filter((t) => t === '欲しい' || t === '余れば' || t === 'いらない');
    if (mine.length < 3) continue; // 自分の行のボタンが無い（ほかの人の行・結果の後）
    if (c.chosen && Object.values(CLAIM_WORD).includes(c.chosen)) continue; // もう答えた
    const r = claimChoice(itemId, me.job, me.gear);
    const target = marks.length ? G.claimChoiceMark(c['data-claim'], r.choice) : G.claimChoice(CLAIM_WORD[r.choice]);
    return decide(target, `取り合い「${CLAIM_WORD[r.choice]}」: ${name}（${r.why}）`);
  }
  return null;
}

/**
 * 報酬の順の確かめ（計画 §4: 成長 → カード → 取り合い）。1回の報酬の中で見た段を順に覚える（報酬の画面を出たら battleObserve が空にする）。
 * ゲームの決まり（waitNotes.ts の rewardStep）: ほかの人の成長を待つ間は、自分のカードが先に出る（回3 A）→ 「カード → 成長」は決まりどおり。
 * 取り合い（claim）の後に、成長かカードが出たら、順が違う（注意に書く）
 */
function checkOrder(v, board) {
  const step = (v.facts.rewardStep ?? [])[0]?.['data-reward-step'];
  if (!step) return;
  board.rewardSeen ??= {};
  const seen = (board.rewardSeen[v.seat] ??= []);
  if (seen[seen.length - 1] !== step) seen.push(step);
  const c = seen.indexOf('claim');
  if (c >= 0 && seen.slice(c + 1).some((s) => s === 'growth' || s === 'card')) boardNote(board, `order|${v.seat}|${seen.join('>')}`, `${v.seat}: 報酬の段の順が違う（取り合いの後に成長かカード: ${seen.join(' → ')}）`, 'warn');
  const g = seen.indexOf('growth');
  if (g > 0 && seen.slice(0, g).includes('card')) boardNote(board, `card-before-growth|${v.seat}`, `${v.seat}: 自分のカードを選んでいる間に、成長の窓が上に出た（ほかの人の成長を待つ間は自分のカードが先に出る決まり。waitNotes.ts の rewardStep・回3 A）。人が見て、選んでいる途中に窓が変わるのが困らないか確かめる`, 'info');
}

/**
 * 報酬の1手。返す物: 決め か null（待つ）
 */
export function rewardBrain(v, board) {
  if (v.screen !== 'game' || v.mode !== 'reward') return null;
  if (hasLayer(v, 'confirm') || hasLayer(v, 'story') || hasLayer(v, 'sheet')) return null;
  const me = meOf(board, v.seat);
  checkOrder(v, board);
  // 1. 成長（レベルアップの窓）
  const ups = v.facts.rUpgradeCards ?? [];
  if ((v.facts.rLevelUp ?? 0) > 0 && ups.length) {
    // 「カード強化」の後: 強化する札（絵の字にカードの名前がある）。値打ちの一番高い札
    let best = null;
    ups.forEach((u, i) => {
      const id = Object.keys(KB.cardByName).filter((n) => (u.text ?? '').includes(n)).sort((a, b) => b.length - a.length)[0];
      const val = id ? cardValue(KB.cardByName[id], me.job) : -1;
      if (!best || val > best.val) best = { i, val, name: id ?? '?' };
    });
    return decide(G.growthUpgradeCard(best.i), `成長: 強化する札「${best.name}」`);
  }
  const growth = v.facts.rGrowth ?? [];
  if ((v.facts.rLevelUp ?? 0) > 0 && growth.length) {
    // 区切り 2-Sb: 押すのは B11 の印 data-growth-option（選択肢の番号）。並べる順は見えている字（「力 +1」など）
    const ranked = growth.map((g, i) => ({ i: Number(g['data-growth-option'] ?? i), text: g.text, r: growthRank(g.text, me.job) })).sort((a, b) => a.r - b.r || a.i - b.i);
    const g = ranked[0];
    return decide(G.growthOption(g.i), `成長「${g.text.slice(0, 16)}」（${['主に使う能力値', 'カードの強化', '最大HP', 'フォーカスの最大', 'ほか'][g.r]}）`);
  }
  // 2. 取り合い（真ん中の窓・下の段）
  const cl = claimBrain(v, board);
  if (cl) return cl;
  // 3. カード（説明の窓が開いていれば「このカードを選ぶ」）
  const cards = v.facts.rCards ?? [];
  if (cards.length) {
    const names = cards.map((c) => c['aria-label'] ?? '');
    const key = names.join('|');
    if (cards.some((c) => c.disabled !== null)) return null; // めくり終わるのを待つ（押せない間は押さない）
    const ids = names.map((n) => KB.cardByName[n] ?? null);
    const deck = knownDeck(me).filter((_, i, a) => a);
    const vals = ids.map((id) => cardValue(id, me.job));
    let bi = 0;
    vals.forEach((x, i) => { if (x > vals[bi]) bi = i; });
    const avg = deckAverage(deck, me.job);
    const take = deck.length < 8 || vals[bi] > avg;
    const panel = (v.facts.rCardPanel ?? [])[0]?.['data-card-pick-panel'];
    if (!take) {
      me.picks[key] = null;
      if (panel) return decide(G.sheetClose, '説明の窓を閉じる'); // 起きない見立て（選ばない時は窓を開かない）
      return decide(G.rewardSkip, `カードを選ばない（一番良い「${names[bi]}」${vals[bi]} が山札の平均 ${avg.toFixed(1)} より良くない）`);
    }
    if (panel && panel === ids[bi]) {
      me.picks[key] = ids[bi];
      return decide(G.cardPickAction, `「このカードを選ぶ」（${names[bi]}）`);
    }
    return decide(G.rewardCard(bi), `報酬のカード ${bi}「${names[bi]}」（値打ち ${vals[bi]}・山札の平均 ${avg.toFixed(1)}${deck.length < 8 ? '・山札が8枚より少ない' : ''}）`);
  }
  // 4. 「先へ進む」「隠し宝箱へ」の票（自分の票が入っていれば待つ）
  // 印の値は React が "true" を入れる（data-reward-finish="true"）。名前だけで探す
  const fin = v.actions.find((a) => a.marks.some((m) => m === 'data-reward-finish' || m.startsWith('data-reward-finish=')) && a.enabled);
  if (fin) {
    const seats = (v.facts.rewardVoteSeats ?? []).flatMap((x) => String(x['data-vote-seats'] ?? '').split(','));
    if (seats.includes(v.seat)) return null;
    return decide(G.rewardDone, `「${fin.text.replace(/P\d/g, '').trim()}」`);
  }
  return null;
}
