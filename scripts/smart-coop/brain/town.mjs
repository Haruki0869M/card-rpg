// 賢いマルチプレイ検証 bot: 頭「町・祠・神殿と祭壇・転職・装備の付け替え」（計画 §4 の町・転職・祠の行・区切り 2-Sb）
// 町（自分のキャラの分。ほかの人のキャラは、その人の端末が答える）:
//   依頼の報告 → 依頼を受ける → 宿（HP が7割より下）→ 要らない装備を1つ売る → 山札が9枚より多ければ弱い札を削る → 回復の薬を1つ買う → 転職（聖堂）→ 町を出る。
//   この順で5つのタブを全部1回は開く（網羅）。お金は「宿2回分」を残す【提案】。
// 祠: 選べる選択肢の先頭 → 結果 → 出る。神殿・祭壇: 「転職先を見る」で転職できれば転職 → 出る。
// 転職: 仲間の列の「転職できます」の印（自分のキャラ）が出たら、ステータス →「転職先を見る」→ 転職できる先を、最上位 → 中位 → 特殊（今の武器を使えるジョブを先に）の順で選ぶ →
//   確認の窓「転職する」（common が押す）→ 専用のカード3枚から、値打ちの一番高い札を選ぶ。条件が場所だけ足りない時は、世界マップの頭が神殿・祭壇を行き先に入れる。
// 装備: 取り合いで品を手に入れたら、次の自分の手番の始めにステータスを開いて、その欄の持ち物から、今より値打ちの高い品を付ける（説明書きで点を付ける）。
// 決まり: 見るのは View と説明書きだけ。乱数を使わない（同じ点なら左・上）。
import { G, findMark, findText, decide, hasLayer } from './common.mjs';
import { KB } from '../content/load.mjs';
import { cardValue, itemValue, jobByName } from '../content/reward.mjs';
import { meOf } from './reward.mjs';

const T = { turn: true };
const TIER_ORDER = { top: 0, mid: 1, special: 2, base: 3 };
const SLOT_WORD = { weapon: '武器', armor: '防具', accessory: '装飾品' };
/** 宿代の何回分を残すか【提案】 */
const RESERVE_INNS = 2;

/** 町の中の、この端末の今回の訪問の欄（町を出たら消す） */
function visitOf(board, v) {
  board.townVisit ??= {};
  if (v.mode !== 'town') {
    delete board.townVisit[v.seat];
    return null;
  }
  const town = (v.facts.tTown ?? [])[0]?.['data-town'] ?? '?';
  const cur = board.townVisit[v.seat];
  if (!cur || cur.town !== town) board.townVisit[v.seat] = { town, did: new Set(), sold: 0 };
  return board.townVisit[v.seat];
}

const covMark = (board, id, how) => (board.covMarks ??= []).push({ id, how });

/** 町の1手 */
export function townBrain(v, board) {
  const st = visitOf(board, v);
  if (!st || v.screen !== 'game') return null;
  if (hasLayer(v, 'confirm') || hasLayer(v, 'story') || hasLayer(v, 'job-pick')) return null;
  if (hasLayer(v, 'sheet')) return null; // 転職の一覧などは jobBrain・common
  const exit = (v.facts.tExit ?? [])[0]?.['data-facility-exit'];
  if (exit !== 'go') return null; // 自分の分は終えた（仲間を待つ）
  const me = meOf(board, v.seat);
  const vis = (v.facts.tVisitor ?? []).sort((a, b) => a.length - b.length)[0] ?? '';
  const gm = /(\S+?)が町にいます\s*(\d+)\s*G/.exec(vis);
  if (gm && !me.name) me.name = gm[1];
  const gold = gm ? Number(gm[2]) : 0;
  const tdef = (KB.world?.towns ?? []).find((t) => t.id === st.town);
  const innCost = tdef?.innCost ?? 20;
  const reserve = innCost * RESERVE_INNS;
  const tabSel = (v.facts.tTabs ?? []).find((t) => /\bbtn-gold\b/.test(t.class ?? ''))?.['data-town-tab'];
  const open = (id, why) => decide(G.townTab(id), `町のタブ「${{ shop: 'ショップ', inn: '宿屋', quests: '依頼', remove: 'カード削除', sell: '売却' }[id]}」を開く（${why}）`);
  // 0. 開いている説明の窓（売る・削る）を先に答える
  const cardAct = (v.facts.tCardPick ?? [])[0];
  if (tabSel === 'remove' && cardAct) {
    if (cardAct.disabled === null && !st.did.has('remove')) {
      return decide(G.cardPickAction, `カードを取り除く（${cardAct.text.slice(0, 20)}）`, { after: () => {
        st.did.add('remove');
        covMark(board, 'town-action:remove', `${v.seat}: 町「${st.town}」で「${cardAct.text.slice(0, 20)}」を押した（確認の窓「取り除く」へ）`);
      } });
    }
  }
  const itemAct = (v.facts.tItemPick ?? [])[0];
  if (tabSel === 'sell' && itemAct && itemAct.disabled === null && st.sold < 1) {
    return decide(G.itemPickAction, `装備を売る（${itemAct.text.slice(0, 20)}）`, { after: () => {
      st.sold++;
      covMark(board, 'town-action:sell', `${v.seat}: 町「${st.town}」で「${itemAct.text.slice(0, 20)}」を押した`);
    } });
  }
  // 1. 依頼: 報告 → 受ける
  if (!st.did.has('quests')) {
    if (tabSel !== 'quests') return open('quests', '依頼の報告と受注');
    const qs = v.facts.tQuests ?? [];
    const rep = qs.find((q) => q.action === 'report' && !q.off);
    if (rep) return decide(G.questAction(rep['data-quest'], 'report'), `依頼「${rep['data-quest']}」を報告する`);
    const acc = qs.find((q) => q.action === 'accept' && !q.off);
    if (acc) return decide(G.questAction(acc['data-quest'], 'accept'), `依頼「${acc['data-quest']}」を受ける`);
    st.did.add('quests');
  }
  // 2. 宿: HP が7割より下で、お金が足りる時
  if (!st.did.has('inn')) {
    if (tabSel !== 'inn') return open('inn', 'HP を見る');
    const hp = /HP\s*(\d+)\s*\/\s*(\d+)/.exec((v.facts.tInnHp ?? [])[0] ?? '');
    const inn = (v.facts.tInn ?? [])[0];
    const r = hp ? Number(hp[1]) / Math.max(1, Number(hp[2])) : 1;
    if (inn && inn.disabled === null && r < 0.7 && gold >= Number(inn['data-town-inn'] ?? innCost)) {
      return decide(G.townInn, `宿に泊まる（HP ${hp?.[1]}/${hp?.[2]}・${inn['data-town-inn']}G）`, { after: () => {
        st.did.add('inn');
        covMark(board, 'town-action:inn', `${v.seat}: 町「${st.town}」で宿に泊まった（HP ${hp?.[1]}/${hp?.[2]}）`);
      } });
    }
    st.did.add('inn');
  }
  // 3. 売る: 持ち物の装備（装備中の物は出ない）を1つ。値打ちの一番低い物
  if (!st.did.has('sell')) {
    if (tabSel !== 'sell') return open('sell', '要らない装備を売る');
    const rows = (v.facts.tSell ?? []).map((r) => ({ uid: r['data-sell-item'], name: r['aria-label'], val: itemValue(KB.items[KB.itemByName[r['aria-label']]], me.job) }));
    if (rows.length) {
      const pick = [...rows].sort((a, b) => a.val - b.val || (a.uid < b.uid ? -1 : 1))[0];
      return decide(G.sellItem(pick.uid), `売る装備を選ぶ「${pick.name}」（値打ち ${pick.val}）`, { after: () => st.did.add('sell') });
    }
    st.did.add('sell');
  }
  // 4. 削る: 山札が9枚より多く、お金に余裕がある時、値打ちの一番低い札
  if (!st.did.has('removeTab')) {
    if (tabSel !== 'remove') return open('remove', '山札の弱い札を削る');
    const cards = (v.facts.tRemove ?? []).map((c) => ({ v: c['data-pick-card'], name: c['aria-label'], val: cardValue(KB.cardByName[c['aria-label']], me.job) }));
    const cost = tdef?.removeCost ?? 50;
    if (cards.length > 9 && gold >= cost + reserve) {
      const pick = [...cards].sort((a, b) => a.val - b.val || (a.v < b.v ? -1 : 1))[0];
      return decide(G.removeCard(pick.v), `削る札を選ぶ「${pick.name}」（値打ち ${pick.val}・山札 ${cards.length} 枚）`, { after: () => st.did.add('removeTab') });
    }
    st.did.add('removeTab');
  }
  // 5. 買う: 回復の薬を1つ（お金が宿代2回分より多く残る時）
  if (!st.did.has('shop')) {
    if (tabSel !== 'shop') return open('shop', '回復の薬を買う');
    // 依頼の届け物（受けている依頼の目標が「〇〇を届ける」）: 店にあれば1つ買う（依頼の一覧で読んだ物だけ）
    const deliv = (board.world?.questSheet ?? []).filter((q) => q.state !== 'done' && q.objective?.kind === 'deliverItem').map((q) => q.objective.itemId);
    board.delivBought ??= new Set();
    const want = (v.facts.tShop ?? []).find((r) => deliv.includes(r['data-item-id']) && !board.delivBought.has(r['data-item-id']) && !(r.buyOff > 0));
    if (want) return decide(G.shopBuy(want['data-shop-row']), `依頼の届け物「${KB.items[want['data-item-id']]?.name}」を買う（${want['data-price']}G）`, { after: () => { board.delivBought.add(want['data-item-id']); } });
    const potions = (v.facts.tShop ?? [])
      .map((r) => ({ uid: r['data-shop-row'], id: r['data-item-id'], price: Number(r['data-price'] ?? 9999), off: r.buyOff > 0 }))
      .filter((r) => !r.off && (KB.items[r.id]?.heal ?? 0) > 0 && gold - r.price >= reserve)
      .sort((a, b) => a.price - b.price || (a.uid < b.uid ? -1 : 1));
    if (potions.length) {
      return decide(G.shopBuy(potions[0].uid), `回復の薬を買う「${KB.items[potions[0].id]?.name}」（${potions[0].price}G・残り ${gold - potions[0].price}G）`, { after: () => {
        st.did.add('shop');
        covMark(board, 'town-action:buy', `${v.seat}: 町「${st.town}」で「${KB.items[potions[0].id]?.name}」の「買う」を押した（${potions[0].price}G）`);
      } });
    }
    st.did.add('shop');
  }
  // 6. 転職（聖堂）: 1回の訪問で1回だけ見る
  if (!st.did.has('jobs')) {
    const b = findText(v, '聖堂（転職）');
    if (b?.enabled) return decide(G.townJobs, '「聖堂（転職）」を開く（転職できるか見る）', { after: () => { st.did.add('jobs'); jobFlow(board, v.seat).open = 'town'; } });
    st.did.add('jobs');
  }
  // 7. 町を出る
  return decide(G.facilityExit, `町を出る（${[...st.did].join('・')}）`);
}

/** 祠・神殿と祭壇の1手 */
export function facilityBrain(v, board) {
  if (v.screen !== 'game' || (v.mode !== 'shrine' && v.mode !== 'sanctuary')) {
    if (board.facility) delete board.facility[v.seat];
    return null;
  }
  if (hasLayer(v, 'confirm') || hasLayer(v, 'story') || hasLayer(v, 'job-pick') || hasLayer(v, 'sheet')) return null;
  board.facility ??= {};
  const st = (board.facility[v.seat] ??= { jobs: false });
  const exit = (v.facts.tExit ?? [])[0]?.['data-facility-exit'];
  if (v.mode === 'shrine') {
    const opt = (v.facts.sOptions ?? []).find((o) => o.disabled === null);
    if (opt && !v.facts.sResult) return decide(G.shrineOption(opt['data-shrine-option']), `祠の選択肢 ${opt['data-shrine-option']}「${opt.text.slice(0, 20)}」`);
  } else if (!st.jobs) {
    const b = findText(v, '転職先を見る');
    if (b?.enabled) return decide(G.sanctuaryJobs, '神殿・祭壇「転職先を見る」', { after: () => { st.jobs = true; jobFlow(board, v.seat).open = 'sanctuary'; } });
    st.jobs = true;
  }
  if (exit === 'go') return decide(G.facilityExit, `${v.mode === 'shrine' ? '祠' : '神殿・祭壇'}を出る（世界マップへ）`);
  return null;
}

const jobFlow = (board, seat) => ((board.jobFlow ??= {})[seat] ??= { open: null, tried: 0 });

/** 自分のキャラの名前（ステータスのボタンの字「〇〇のステータスを見る」）*/
function myName(v, board) {
  const me = meOf(board, v.seat);
  const s = (v.facts.wStatus ?? [])[0]?.['aria-label'];
  const m = /^(.*)のステータスを見る$/.exec(s ?? '');
  if (m && v.mode === 'world') me.name ??= m[1];
  return me.name;
}

/**
 * 転職・装備の付け替え（シートを開いて答える流れ）。common より先に聞く（common は「うっかり開いたシート」を閉じるため）
 */
export function jobBrain(v, board) {
  if (v.screen !== 'game') return null;
  const me = meOf(board, v.seat);
  const jf = jobFlow(board, v.seat);
  // A. 専用カード選び（転職の直後。どの場面でも出る）
  if (hasLayer(v, 'job-pick')) {
    const title = v.facts.jPickTitle ?? '';
    const jm = /^(.*)に転職した！/.exec(title);
    if (jm) me.job = jobByName(jm[1]) ?? me.job;
    jf.tried = 0;
    jf.open = null;
    const cards = (v.facts.jPickCards ?? []).map((c) => ({ i: c['data-pick-card'], name: c['aria-label'], on: c['aria-pressed'] === 'true', val: cardValue(KB.cardByName[c['aria-label']], me.job) }));
    if (!cards.length) return null;
    const best = [...cards].sort((a, b) => b.val - a.val || Number(a.i) - Number(b.i))[0];
    const panel = (v.facts.jPickPanel ?? [])[0]?.['data-card-pick-panel'];
    if (best.on && panel) return decide(G.jobPickAction, `専用カード「${best.name}」にする`);
    return decide(G.jobPickCard(best.i), `専用カード「${best.name}」を選ぶ（値打ち ${best.val}）`);
  }
  if (hasLayer(v, 'confirm')) return null; // 「転職する」の確認の窓は common が押す
  const sheet = v.layers.find((l) => l.id === 'sheet')?.value;
  // B. 転職の一覧
  if (sheet === 'jobs' && jf.open) {
    const opts = (v.facts.jOptions ?? []).map((o) => ({ id: o['data-job-option'], state: o['data-job-state'], cls: KB.classes[o['data-job-option']], text: o.text }));
    const ready = opts.filter((o) => o.state === 'ready');
    const ws = (board.world ??= {});
    ws.jobPlace = opts.some((o) => o.state === 'place');
    if (ws.jobPlace) ws.jobPlaceText = opts.filter((o) => o.state === 'place').map((o) => `${o.cls?.name ?? o.id}: ${o.text.slice(-30)}`).join('／');
    if (ready.length && jf.tried < 2) {
      const cur = me.job;
      const pick = [...ready].sort((a, b) => (TIER_ORDER[a.cls?.tier] ?? 9) - (TIER_ORDER[b.cls?.tier] ?? 9) || Number(b.cls?.weaponType === cur?.weaponType) - Number(a.cls?.weaponType === cur?.weaponType))[0];
      return decide(G.jobChange(pick.id), `転職する「${pick.cls?.name ?? pick.id}」（${pick.cls?.tier ?? '?'}${pick.cls?.weaponType === cur?.weaponType ? '・今の武器が使える' : ''}・転職できる先 ${ready.length}）`, { after: () => { jf.tried++; } });
    }
    return decide(G.sheetClose, `転職の一覧を閉じる（${ready.length ? '2回押しても転職にならない' : '今すぐ転職できる先が無い'}${ws.jobPlace ? `・場所だけ足りない: ${ws.jobPlaceText}` : ''}）`, { after: () => { jf.open = null; } });
  }
  // C. ステータス（パーティ・装備）のシート: 転職へ進む／装備を付け替える
  if (sheet === 'party' && (jf.open === 'status' || me.equipOpen)) {
    if (jf.open === 'status') {
      const b = v.actions.find((a) => a.enabled && a.text.startsWith('転職先を見る'));
      if (b) return decide({ css: 'button', text: '転職先を見る', exact: false }, `「${b.text}」`);
      jf.open = null;
    }
    if (me.equipOpen) return equipInSheet(v, board, me);
    return decide(G.sheetClose, 'ステータスを閉じる');
  }
  if (sheet) return null;
  // 物語・確認の窓・見取り図などが上に開いている間は開かない（2-Sb の試しの通しで、制覇の後の物語の下のステータスを押そうとして止まった。bot の間違い）
  if (v.layers.length) return null;
  // D. 世界マップ: 自分のキャラに「転職できます」の印 → ステータスを開く（手番でなくても開ける。手番の人を止めない）
  if (v.mode === 'world') {
    const name = myName(v, board);
    const party = v.facts.wParty ?? [];
    const mine = party.find((p) => name && String(p['aria-label'] ?? '').startsWith(name));
    if (mine && (mine.canJob ?? 0) > 0 && jf.tried < 2) {
      return decide(G.statusButton, `ステータスを開く（${name} に「転職できます」の印）`, { after: () => { jf.open = 'status'; } });
    }
    // E. 装備: 手に入れた品がある → 自分の手番の始め（サイコロの前）にステータスを開く
    const active = (v.facts.activeHero ?? [])[0];
    if ((me.pendingSlots?.size ?? 0) > 0 && active?.['data-seat'] === v.seat && findMark(v, 'data-roll-move')?.enabled) {
      return decide(G.statusButton, `ステータスを開く（手に入れた装備を付けるか見る: ${[...me.pendingSlots].map((s) => SLOT_WORD[s] ?? s).join('・')}）`, { after: () => { me.equipOpen = true; } });
    }
  }
  return null;
}

/** ステータスのシートの中で、手に入れた品の欄を見て、今より良ければ付ける */
function equipInSheet(v, board, me) {
  const slots = (v.facts.pSlots ?? []).map((s) => ({ slot: s['data-equip-slot'], text: s.text }));
  for (const s of slots) {
    const nameNow = Object.keys(KB.itemByName).filter((n) => s.text.includes(n)).sort((a, b) => b.length - a.length)[0];
    if (nameNow) me.gear[s.slot] = KB.items[KB.itemByName[nameNow]];
  }
  const cands = (v.facts.pEquip ?? []).filter((c) => c.disabled === null).map((c) => ({ id: c['data-row-equip'], item: KB.items[c['data-row-equip']] }));
  const open = me.equipSlot;
  if (open && (v.facts.pExpanded ?? 0) > 0) {
    const now = me.gear[open] ?? null;
    const best = [...cands].sort((a, b) => itemValue(b.item, me.job) - itemValue(a.item, me.job) || (a.id < b.id ? -1 : 1))[0];
    me.pendingSlots.delete(open);
    me.equipSlot = null;
    if (best && itemValue(best.item, me.job) > itemValue(now, me.job)) {
      (board.covMarks ??= []).push({ id: 'equip', how: `${v.seat}: 「${best.item?.name ?? best.id}」の「装備」を押した（${SLOT_WORD[open]}）` });
      return decide({ css: `[data-row-equip="${best.id}"]` }, `装備を付ける「${best.item?.name ?? best.id}」（${SLOT_WORD[open]}・今の「${now?.name ?? 'なし'}」より値打ちが高い）`);
    }
  }
  const next = [...(me.pendingSlots ?? [])][0];
  if (next) {
    me.equipSlot = next;
    return decide({ css: `button[aria-label="${SLOT_WORD[next]}を付け替える"]` }, `「${SLOT_WORD[next]}」の付け替えを開く`);
  }
  me.equipOpen = false;
  return decide(G.sheetClose, 'ステータスを閉じる（装備を見終えた）');
}

/**
 * 依頼（区切り 2-Sb の通しで、最後から2つ目の鍵のダンジョンが「町の依頼をあと1つ果たして、報告してから来よう」で開かず、止まった）。
 * 次の目的の字に「町の依頼をあと N つ」が出たら、P1 がメニューの「依頼と封印の鍵」を開いて、依頼ごとの状態（報告できる・n/m・達成済み）と報告先を読む。
 * 世界マップの頭（destinations）が、それを行き先にする（報告できる町・届ける物の町・名所・徘徊する敵）。読み直すのは、世界マップに戻った時。
 */
export function questBrain(v, board) {
  if (v.screen !== 'game') return null;
  const ws = (board.world ??= {});
  board.questFlow ??= {};
  const qf = (board.questFlow[v.seat] ??= { open: null, need: true, prevMode: null });
  // 読み直す時: 次の目的が「町の依頼」の間は世界マップに戻るたび。それ以外は、ダンジョンを出た時・町を出た時（報告できる依頼を、通りがかりの町で報告するため）
  if (v.mode === 'world' && qf.prevMode && qf.prevMode !== 'world' && (ws.questMode || ['cleared', 'town', 'dungeon'].includes(qf.prevMode))) qf.need = true;
  qf.prevMode = v.mode;
  if (v.mode === 'world') {
    const gt = (v.facts.goalText ?? []).map((x) => x['aria-label']).find(Boolean) ?? '';
    const m = /町の依頼をあと(\d+)つ/.exec(gt);
    const was = ws.questMode;
    ws.questMode = m ? Number(m[1]) : 0;
    if (ws.questMode && !was) qf.need = true;
  }
  const sheet = v.layers.find((l) => l.id === 'sheet')?.value;
  if (sheet === 'quests' && qf.open) {
    const rows = [];
    for (const t of v.facts.qRows ?? []) {
      if (!/報告先/.test(t)) continue;
      const q = (KB.world?.quests ?? []).find((x) => t.startsWith(x.title));
      if (!q) continue;
      const st = /達成済み/.test(t) ? 'done' : /報告できる/.test(t) ? 'report' : 'active';
      const prog = /(\d+)\/(\d+)/.exec(t);
      const town = (KB.world?.towns ?? []).find((x) => t.includes(`報告先: ${x.name}`));
      rows.push({ id: q.id, state: st, now: prog ? Number(prog[1]) : null, goal: prog ? Number(prog[2]) : null, town: town?.id ?? q.reportTown, objective: q.objective });
    }
    return decide(G.sheetClose, `依頼の一覧を読んで閉じる（${rows.map((r) => `${r.id}:${r.state}${r.now !== null ? ` ${r.now}/${r.goal}` : ''}`).join('・') || '受けている依頼なし'}）`, { after: () => { ws.questSheet = rows; qf.open = null; qf.need = false; } });
  }
  if (sheet === 'menu' && qf.open === 'menu') return decide(G.menuRow('依頼と封印の鍵'), 'メニュー「依頼と封印の鍵」', { after: () => { qf.open = 'quests'; } });
  if (v.layers.length || v.mode !== 'world') return null;
  if (v.seat === 'P1' && qf.need && !qf.open) return decide(G.worldMenu, `メニューを開く（${ws.questMode ? `次の目的が「町の依頼をあと${ws.questMode}つ」。` : ''}依頼の状態を見る）`, { after: () => { qf.open = 'menu'; } });
  return null;
}
