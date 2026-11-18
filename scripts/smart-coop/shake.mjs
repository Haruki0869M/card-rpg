// 賢いマルチプレイ検証 bot: 揺さぶり S1〜S13（計画 §5・直し2・直し3。区切り 3-S）
// 順番は確率を使わない: 揺さぶりの種類ごとに「機会」を数え、k 回目の機会で揺さぶるかは「k を周期で割った余り = 種から決めた数」で決める（§5-1）。
// 同じ種なら、同じ機会の並びで同じ揺さぶりが起きる（押すのは1台ずつ・落ち着いてから。§4）。
//
// 口は4つ:
//   shakeBrain(v, board)        … 頭の前に聞く。動いている揺さぶりの手（決め）か、HOLD（わざと待つ）か、null
//   shakeIdle(v, board)         … 頭が「待つ」と答えた端末に聞く（待っている間にする揺さぶり: S9 の待つ人のシート・S11）
//   shakeObserve(views, board)  … 毎ステップ全端末の View で確かめる（画面の字と data- の印だけ）
//   shakeAfterTick(ctx)         … 毎ステップの後（読み込み直し S7・S8・フォーカスの写しの照らし合わせ S5・S6・NG を審判の失敗に）
//   pickSimultaneous(...)       … S13（2台がほぼ同時に押す）を選ぶ（conductor が使う）
// 決まり: 押すのは全部画面の要素（press.mjs）。見るのは View だけ。状態の写しを読むのは審判（judge.heroes・hostOf）だけ（S5・S6・S8 の照らし合わせ）。
// 確かめが NG なら、審判の失敗「揺さぶりの確かめ NG」にする（ゲームの不具合の見立て。写真と記録が全端末ぶん残る）。
import { G, findMark, findText, decide, hasLayer } from './brain/common.mjs';
import { KB } from './content/load.mjs';
import { partyHp } from './content/dungeon.mjs';
import { shortHash } from './util.mjs';

/** わざと待つ（頭に「待つ」と答えさせる。ほかの頭にも聞かない） */
export const HOLD = Object.freeze({ hold: true });

export const SHAKES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13'];
/** 揺さぶりの名前（報告の言葉） */
export const SHAKE_NAME = {
  S1: '合意待ちの間に装備の付け外し・薬を渡す・使う（P2）',
  S2: '挑む段で、持ち主でない人が装備・道具を開いて閉じる（持ち主はフォーカスを足して待つ）',
  S3: '扉の票をわざと割る・地図で「こっち！」',
  S4: '開け役の票をわざと割る',
  S5: '判定つきイベントの挑む段でフォーカスを足して挑む',
  S6: '宝箱をフォーカスを足して開ける',
  S7: 'P2 の読み込み直し →「部屋に戻る」',
  S8: 'P1（ホスト）の読み込み直し →「部屋に戻る」',
  S9: '施設・報酬・漂流物で、片方が先に終わって待つ（P2 が遅れる）',
  S10: '同行の誘い・移動の提案を1度断ってから受ける',
  S11: '戦闘で、ほかの席の番の間に状態の一覧・予告の説明を開いて閉じる',
  S12: '町の店で「ほしい！」',
  S13: '同時押し（票・開け役・準備完了・取り合い・先へ進む）',
};
/** 周期（計画 §5-2。毎回の物は 1） */
const PERIOD = { S1: 3, S2: 2, S3: 3, S4: 2, S10: 2, S11: 4, S13: 3 };
/** 1つの手順の上限（ステップ数）。超えたら中断して記録する（ゲームの不具合とは決めない） */
const STEP_LIMIT = 40;
const SLOT_WORD = { weapon: '武器', armor: '防具', accessory: '装飾品' };
const P = { prio: true };

const seatsOf = (s) => String(s ?? '').split(',').filter(Boolean);
const sheetOf = (v) => v.layers.find((l) => l.id === 'sheet')?.value ?? null;

/** 種から決めた余り（同じ種なら同じ） */
export const offsetOf = (seed, id, p) => parseInt(shortHash(`${seed}|${id}`), 36) % p;

/** 揺さぶりの板（board.sh）を用意する */
export function shakeInit(board, seed, people = 2) {
  board.sh ??= {
    seed,
    // 区切り 4: 人数（4人の時、S1 は P2 と P3 が交代・S13 は2台ずつ）
    people,
    // 区切り 4: S13 の種類ごとの数（起きた・OK・NG）
    s13: {},
    k: Object.fromEntries(SHAKES.map((id) => [id, { opp: 0, count: 0, ok: 0, ng: 0, abort: 0, log: [] }])),
    sub: {},
    m: null,
    seen: new Set(),
    flags: {},
    pending: [],
    notes: [],
    n: { stage: 0, inv: 0, mv: 0, scene: 0, townExit: 0, worldAfterFirst: 0 },
    prev: {},
    s5: null,
    s6: null,
    watch: [],
    order: [],
  };
  return board.sh;
}

/**
 * 機会を1つ数え、揺さぶるかを返す（同じ key は1回だけ数える）。sub = 種類の中の小分け（S13 の票の種類）
 */
export function opportunity(sh, id, key, sub = null) {
  const sk = `${id}|${sub ?? ''}|${key}`;
  if (sh.seen.has(sk)) return false;
  sh.seen.add(sk);
  const p = PERIOD[id] ?? 1;
  const box = sub ? (sh.sub[`${id}|${sub}`] ??= { opp: 0 }) : sh.k[id];
  const k = sub ? box.opp++ : sh.k[id].opp++;
  if (sub) sh.k[id].opp++;
  return k % p === offsetOf(sh.seed, sub ? `${id}|${sub}` : id, p);
}

function note(sh, text, kind = 'shake') {
  sh.notes.push({ kind, text });
}
/** 確かめの結果を記録する（NG は審判の失敗にする。shakeAfterTick） */
export function result(sh, id, ok, text) {
  const s = sh.k[id];
  if (ok) s.ok++;
  else s.ng++;
  s.log.push(`${ok ? 'OK' : 'NG'}: ${text}`);
  if (!ok) sh.pending.push({ id, text });
}
function begin(sh, id, o) {
  sh.k[id].count++;
  sh.m = { id, step: o.step, stepTicks: 0, lastStep: o.step, data: {}, ...o };
  sh.order.push(`${id}${o.tag ? `(${o.tag})` : ''}`);
  note(sh, `揺さぶり ${id} を始める（${sh.k[id].count} 回目${o.tag ? `・${o.tag}` : ''}）`);
}
const end = (sh) => {
  sh.m = null;
};
const go = (m, step) => () => {
  m.step = step;
};

/** 合意の場面の鍵（場面が進んだかを見る） */
export function agreeKey(v) {
  const f = v.facts;
  return [v.mode, (f.dungeonId ?? [])[0]?.['data-dungeon'] ?? '', (f.dDoors ?? []).map((d) => d['data-door-choice']).join(','), (f.dOptions ?? []).map((o) => o['data-event-option']).join(','), (f.openers ?? []).map((o) => o['data-opener']).join(','), (f.dEvent ?? '').slice(0, 20)].join('|');
}

/** 自分の票が入っていない・ほかの人の票がある合意（S1 の機会）。返す物: { kind, other（ほかの人が入れた選択肢）, options } か null */
function pendingAgree(v) {
  const f = v.facts;
  const doors = f.dDoors ?? [];
  if (v.mode === 'dungeon' && doors.length && !doors.some((d) => d['data-my-vote'] !== null)) {
    const other = doors.find((d) => seatsOf(d.votes).length);
    if (other) return { kind: 'door', other: other['data-door-choice'], options: doors.filter((d) => d.disabled === null).map((d) => d['data-door-choice']) };
  }
  const opts = f.dOptions ?? [];
  if (v.mode === 'event' && opts.length && !opts.some((o) => o['data-my-vote'] !== null)) {
    const other = opts.find((o) => seatsOf(o.votes).length);
    if (other) return { kind: 'event', other: other['data-event-option'], options: opts.map((o) => o['data-event-option']) };
  }
  const ops = f.openers ?? [];
  if (v.mode === 'chest' && ops.length && !ops.some((o) => seatsOf(o.votes).includes(v.seat))) {
    const other = ops.find((o) => seatsOf(o.votes).length);
    if (other) return { kind: 'opener', other: other['data-opener'], options: ops.map((o) => o['data-opener']) };
  }
  return null;
}

/** 票の写し（選択肢ごとの席）。S1 の「閉じた後、票の印が消えていない」 */
function votesOf(v) {
  const f = v.facts;
  const out = {};
  for (const d of f.dDoors ?? []) out[`door:${d['data-door-choice']}`] = seatsOf(d.votes).concat(d['data-my-vote'] !== null ? [v.seat] : []);
  for (const o of f.dOptions ?? []) out[`event:${o['data-event-option']}`] = seatsOf(o.votes).concat(o['data-my-vote'] !== null ? [v.seat] : []);
  for (const o of f.openers ?? []) out[`opener:${o['data-opener']}`] = seatsOf(o.votes);
  return out;
}

/** パーティ・装備のシートを開く（帯の「装備」→ 無ければメニュー →「パーティ・装備」）。開いていれば null */
function openParty(v, what) {
  const sheet = sheetOf(v);
  if (sheet === 'party') return null;
  if (sheet === 'menu') {
    const r = findText(v, 'パーティ・装備', false);
    if (r?.enabled) return decide({ css: '[data-sheet="menu"] button', text: 'パーティ・装備', exact: false }, `${what}: メニュー「パーティ・装備」`, P);
    return decide(G.sheetClose, `${what}: メニューに「パーティ・装備」が無いので閉じる`, P);
  }
  const bar = findMark(v, 'data-bar-button', '装備');
  if (bar?.enabled) return decide(G.barButton('装備'), `${what}: 帯の「装備」を開く`, P);
  const menu = findText(v, 'メニュー');
  if (menu?.enabled) return decide(G.anyMenu, `${what}: メニューを開く`, P);
  return false; // 開く物が無い
}

/** シートを開いて閉じる（S2・S9 の待つ人）。label = 帯のボタンの名前（装備・道具）。返す物: 決め・'done'・false（開く物が無い） */
function openClose(v, m, key, label, what) {
  const st = (m.data[key] ??= { phase: 'open' });
  const sheet = sheetOf(v);
  if (st.phase === 'open') {
    if (sheet) {
      st.phase = 'close';
      st.sheet = sheet;
    } else {
      const bar = findMark(v, 'data-bar-button', label);
      if (bar?.enabled) return decide(G.barButton(label), `${what}: 帯の「${label}」を開く`, P);
      const menu = findText(v, 'メニュー');
      if (menu?.enabled) return decide(G.anyMenu, `${what}: メニューを開く（帯の「${label}」が無い画面）`, P);
      return false;
    }
  }
  if (st.phase === 'close') {
    if (!sheet) {
      st.phase = 'done';
      return 'done';
    }
    return decide(G.sheetClose, `${what}: シート（${sheet}）を×で閉じる`, P);
  }
  return 'done';
}

/** 字から品の id（一番長い名前） */
const itemIn = (text) => {
  const n = Object.keys(KB.itemByName).filter((x) => x && (text ?? '').includes(x)).sort((a, b) => b.length - a.length)[0];
  return n ? KB.itemByName[n] : null;
};
const isHeal = (id) => (KB.items[id]?.heal ?? 0) > 0;

// ---------------------------------------------------------------- S1
function s1(v, sh) {
  const m = sh.m;
  const f = v.facts;
  const what = '揺さぶり S1';
  if (m.step === 'open') {
    const d = openParty(v, what);
    if (d) return d;
    if (d === false) {
      note(sh, 'S1: シートを開くボタンが無い画面なので、装備の付け外しは飛ばした');
      m.step = 'close';
    } else m.step = 'slot';
  }
  if (m.step === 'slot') {
    if (sheetOf(v) !== 'party') return HOLD;
    // 欄の「付け替え」が全部の種類ぶんあるか（窓の潰れの確かめは審判。ここは要る物だけ）
    const slots = f.pSlots ?? [];
    if (!m.data.slotsChecked) {
      m.data.slotsChecked = true;
      result(sh, 'S1', slots.length >= 3, `パーティ・装備のシートの装備の欄 ${slots.length}（武器・防具・装飾品の3つ）`);
    }
    for (const slot of ['accessory', 'armor', 'weapon']) {
      const row = slots.find((s) => s['data-equip-slot'] === slot);
      const id = row ? itemIn(row.text) : null;
      if (id) {
        m.data.slot = slot;
        m.data.itemId = id;
        m.data.itemName = KB.items[id]?.name;
        break;
      }
    }
    if (!m.data.slot) {
      note(sh, 'S1: 付けている装備が無いので、付け外しは飛ばした');
      m.step = 'items';
    } else return decide(G.slotOpen(SLOT_WORD[m.data.slot]), `${what}: 「${SLOT_WORD[m.data.slot]}」の付け替えを開く（${m.data.itemName}）`, { ...P, after: go(m, 'unequip') });
  }
  if (m.step === 'unequip') {
    const u = findMark(v, 'data-slot-unequip', m.data.slot);
    if (!u?.enabled) return HOLD;
    return decide(G.slotUnequip(m.data.slot), `${what}: 「${m.data.itemName}」を外す`, { ...P, after: go(m, 'checkOff') });
  }
  if (m.step === 'checkOff') {
    const row = (f.pSlots ?? []).find((s) => s['data-equip-slot'] === m.data.slot);
    if (!row) return HOLD;
    if (!m.data.offChecked) {
      m.data.offChecked = true;
      result(sh, 'S1', !row.text.includes(m.data.itemName), `${v.seat}: 外した後の「${SLOT_WORD[m.data.slot]}」の欄「${row.text.slice(0, 24)}」に「${m.data.itemName}」が無い`);
    }
    return decide(G.slotOpen(SLOT_WORD[m.data.slot]), `${what}: もう1度「${SLOT_WORD[m.data.slot]}」の付け替えを開く`, { ...P, after: go(m, 'equip') });
  }
  if (m.step === 'equip') {
    const e = findMark(v, 'data-row-equip', m.data.itemId);
    if (!e) return HOLD;
    if (!e.enabled) {
      result(sh, 'S1', false, `${v.seat}: 外した「${m.data.itemName}」の「装備」が押せない（付け直せない）`);
      m.step = 'items';
    } else return decide(G.rowEquip(m.data.itemId), `${what}: 「${m.data.itemName}」を付け直す`, { ...P, after: go(m, 'checkOn') });
  }
  if (m.step === 'checkOn') {
    const row = (f.pSlots ?? []).find((s) => s['data-equip-slot'] === m.data.slot);
    if (!row || !row.text.includes(m.data.itemName)) {
      m.data.onWait = (m.data.onWait ?? 0) + 1;
      if (m.data.onWait < 6) return HOLD;
    }
    result(sh, 'S1', !!row && row.text.includes(m.data.itemName), `${v.seat}: 付け直した後の欄に「${m.data.itemName}」がある`);
    m.step = 'items';
  }
  if (m.step === 'items') {
    const pot = (f.pItems ?? []).find((r) => r['data-item-kind'] === 'pouch' && isHeal(r['data-item-row']) && r.give > 0);
    if (!pot) {
      note(sh, 'S1: 回復の薬を持っていないので、渡す・使うは飛ばした');
      m.step = 'close';
    } else {
      m.data.potion = pot['data-item-row'];
      // 2つ以上あれば、1つ渡して1つ使う。1つだけなら、減った仲間がいれば使い、いなければ渡す
      const count = Number(/×(\d+)/.exec(pot.text)?.[1] ?? 1);
      m.data.potionCount = count;
      return decide(G.itemGive(m.data.potion), `${what}: 「${KB.items[m.data.potion]?.name}」の「渡す」を開く`, { ...P, after: go(m, 'giveTo') });
    }
  }
  if (m.step === 'giveTo') {
    const to = (f.pGiveTo ?? [])[0]?.['data-give-to'];
    if (!to) {
      const why = (f.pGiveReason ?? []).join('／');
      if (!why) return HOLD;
      note(sh, `S1: 渡せない（${why}）`);
      m.step = 'use';
    } else {
      m.data.giveTo = to;
      return decide(G.shGiveTo(to), `${what}: 「${KB.items[m.data.potion]?.name}」を ${to} に渡す`, { ...P, after: go(m, 'giveOk') });
    }
  }
  if (m.step === 'giveOk') {
    if (!hasLayer(v, 'confirm')) return HOLD;
    return decide(G.confirmOk, `${what}: 確認の窓「渡す」`, { ...P, after: () => { m.step = 'use'; m.data.gave = { item: m.data.potion, to: m.data.giveTo, at: sh.n.tick }; } });
  }
  if (m.step === 'use') {
    const pot = (f.pItems ?? []).find((r) => r['data-item-kind'] === 'pouch' && isHeal(r['data-item-row']) && r.use > 0);
    if (!pot) {
      m.step = 'close';
    } else {
      m.data.usePotion = pot['data-item-row'];
      return decide(G.itemUse(m.data.usePotion), `${what}: 「${KB.items[m.data.usePotion]?.name}」の「使う」を開く`, { ...P, after: go(m, 'useTo') });
    }
  }
  if (m.step === 'useTo') {
    const rows = (f.pUseTo ?? []).map((r) => {
      const mm = /^(.*?)\s*HP\s*(\d+)\s*\/\s*(\d+)/.exec(r.text ?? '');
      return { id: r['data-use-to'], enabled: r.disabled === null, name: mm?.[1]?.trim(), hp: Number(mm?.[2]), max: Number(mm?.[3]) };
    });
    if (!rows.length) {
      const why = (f.pGiveReason ?? []).join('／');
      if (!why) return HOLD;
      note(sh, `S1: 使えない（${why}）`);
      m.step = 'close';
    } else {
      const hurt = rows.find((r) => r.enabled && r.hp < r.max);
      if (!hurt) {
        note(sh, 'S1: HP の減った仲間がいないので、薬は使わない（計画 §5-2）');
        m.step = 'close';
      } else {
        m.data.used = { id: hurt.id, name: hurt.name, before: hurt.hp };
        return decide(G.shUseTo(hurt.id), `${what}: 「${KB.items[m.data.usePotion]?.name}」を ${hurt.name}（HP ${hurt.hp}/${hurt.max}）に使う`, { ...P, after: go(m, 'close') });
      }
    }
  }
  if (m.step === 'close') {
    if (!hasLayer(v, 'sheet')) {
      m.step = 'afterClose';
      return HOLD;
    }
    if (hasLayer(v, 'confirm')) return decide(G.confirmOk, `${what}: 確認の窓`, P);
    return decide(G.sheetClose, `${what}: シートを×で閉じる`, P);
  }
  return HOLD; // afterClose・peer は shakeObserve と P1 の頭が進める
}

/** S1 の続き: P1（渡された人）が自分のシートを開いて、渡された薬を見て閉じる */
function s1Peer(v, sh) {
  const m = sh.m;
  const what = '揺さぶり S1（受け取った人）';
  if (m.step === 'peer') {
    const d = openParty(v, what);
    if (d) return d;
    if (d === false) {
      note(sh, 'S1: 受け取った人の画面にシートを開くボタンが無い');
      m.step = 'done';
      return null;
    }
    const has = (v.facts.pItems ?? []).some((r) => r['data-item-row'] === m.data.gave.item);
    result(sh, 'S1', has, `${v.seat}（受け取った人）の画面の持ち物に「${KB.items[m.data.gave.item]?.name}」がある`);
    m.step = 'peerClose';
  }
  if (m.step === 'peerClose') {
    if (!hasLayer(v, 'sheet')) {
      m.step = 'done';
      return null;
    }
    return decide(G.sheetClose, `${what}: シートを×で閉じる`, P);
  }
  return null;
}

// ---------------------------------------------------------------- S3（扉の票を割る・地図の「こっち！」）
function s3(v, sh) {
  const m = sh.m;
  const what = '揺さぶり S3';
  if (m.step === 'split') return decide(G.doorPick(m.data.split), `${what}: わざと別の扉 ${m.data.split} に票を入れる（仲間は ${m.data.other}）`, { ...P, after: go(m, 'checkSplit') });
  if (m.step === 'map') {
    if ((v.facts.mapOverlay ?? 0) > 0) m.step = 'mapCell';
    else {
      const mm = findMark(v, 'data-minimap');
      if (!mm) {
        note(sh, 'S3: 地図のボタンが無い');
        m.step = 'align';
      } else return decide(G.minimap, `${what}: 地図を開く`, P);
    }
  }
  if (m.step === 'mapCell') {
    // 押すマスの候補: まだ開けていない扉（data-door="open"）→ 部屋のマス（通路・開かない扉でない）→ 通路。押しても「こっち！」の枠が出なければ次の候補
    // （区切り 3-S の試しの通しの直し: 予兆の見えている扉は data-door が付かず、候補が無いとして地図を閉じていた）
    const tried = (m.data.cellsTried ??= []);
    const all = v.facts.mapCells ?? [];
    const cands = [...(v.facts.mapDoors ?? []).map((c) => c['data-cell']), ...all.filter((c) => c['aria-label'] && !/通路|開かない扉/.test(c['aria-label'])).map((c) => c['data-cell']), ...all.filter((c) => c['aria-label'] === '通路').map((c) => c['data-cell'])].filter((k, i, a) => a.indexOf(k) === i && !tried.includes(k));
    const cell = cands.length && tried.length < 4 ? { 'data-cell': cands[0] } : null;
    if (cell) tried.push(cell['data-cell']);
    if (!cell) {
      m.data.cellWait = (m.data.cellWait ?? 0) + 1;
      if (m.data.cellWait < 4) return HOLD;
      note(sh, 'S3: 地図に押せる扉のマスが無い');
      m.step = 'mapClose';
    } else return decide(G.mapCell(cell['data-cell']), `${what}: 地図の扉のマス ${cell['data-cell']} を押す`, { ...P, map: false, after: go(m, 'mapSend') });
  }
  if (m.step === 'mapSend') {
    if (!(v.facts.pinPanel ?? 0)) {
      m.data.panelWait = (m.data.panelWait ?? 0) + 1;
      if (m.data.panelWait < 4) return HOLD;
      m.data.panelWait = 0;
      m.step = 'mapCell'; // 次の候補のマス
    } else return decide(G.pinSend, `${what}: 地図で「こっち！」`, { ...P, after: () => { m.step = 'mapCheck'; m.data.pinAt = sh.n.tick; } });
  }
  if (m.step === 'mapClose') {
    if (!(v.facts.mapOverlay ?? 0)) {
      m.step = 'align';
    } else return decide(G.mapClose, `${what}: 地図を閉じる`, P);
  }
  if (m.step === 'align') return decide(G.doorPick(m.data.other), `${what}: 仲間の扉 ${m.data.other} にそろえる`, { ...P, after: () => { m.step = 'checkOpen'; m.data.alignAt = sh.n.tick; } });
  return HOLD;
}

// ---------------------------------------------------------------- S4（開け役の票を割る）
function s4(v, sh) {
  const m = sh.m;
  const what = '揺さぶり S4';
  if (m.step === 'split') return decide(G.openerPick(m.data.split), `${what}: わざと「${m.data.split} に任せる」（仲間は ${m.data.other}）`, { ...P, after: go(m, 'checkSplit') });
  if (m.step === 'align') return decide(G.openerPick(m.data.other), `${what}: 仲間と同じ「${m.data.other} に任せる」にそろえる`, { ...P, after: () => { m.step = 'checkOpen'; m.data.alignAt = sh.n.tick; } });
  return HOLD;
}

// ---------------------------------------------------------------- 挑む段（選び直す・任せる・S2）
function challengeOwner(v, sh) {
  const ch = (v.facts.dChallenge ?? [])[0];
  if (!ch || ch['data-challenge-mine'] !== '1') return null;
  const m = sh.m;
  const what = '揺さぶり（挑む段）';
  if (m && m.id === 'S2' && m.owner === v.seat) {
    const ck = (v.facts.checkMarks ?? [])[0];
    const spent = ck ? Number(ck['data-challenge-focus']) : 0;
    if (spent < 1 && v.facts.checkPlusOn) return decide(G.checkPlus, '揺さぶり S2: 持ち主がフォーカスを足して待つ', { turn: true, ...P });
    // 区切り 4 の誤検知の直し: 足すボタンが押せない（持ち主のフォーカスが 0 など）と、確かめる物が無いのに「0 のまま」で NG にしていた（4人の P3）
    if (spent < 1 && !v.facts.checkPlusOn) m.data.noPlus = true;
    if (!m.data.otherDone) return HOLD;
    return null; // 頭（brain/dungeon）が「挑戦する」
  }
  if (m) return null;
  // 「選び直す」「ほかのキャラに任せる」を1回ずつ通す（区切り 3-S の作業 A）
  if (!sh.flags.rechoose && findMark(v, 'data-challenge-rechoose')?.enabled) {
    return decide(G.challengeRechoose, `${what}: 「選び直す」（1回は通す）`, { turn: true, ...P, after: () => { sh.flags.rechoose = { at: sh.n.tick, event: (v.facts.eventId ?? [])[0]?.['data-event-window'] }; note(sh, `イベント「${sh.flags.rechoose.event}」の挑む段で「選び直す」を押した`); } });
  }
  const to = (v.facts.dChallengeTo ?? [])[0]?.['data-challenge-to'];
  if (!sh.flags.handover && to) {
    return decide(G.challengeHandover(to), `${what}: 「${to}に任せる」（1回は通す）`, { turn: true, ...P, after: () => { sh.flags.handover = { at: sh.n.tick, from: ch['data-challenge-hero'], to }; note(sh, `挑む段で「ほかのキャラに任せる」（${ch['data-challenge-hero']} → ${to}）を押した`); } });
  }
  // S2: 周期2
  const key = `${(v.facts.eventId ?? [])[0]?.['data-event-window']}|${ch['data-challenge-hero']}|${sh.n.stage}`;
  if (opportunity(sh, 'S2', key)) {
    begin(sh, 'S2', { step: 'other', owner: v.seat, tag: key });
    return challengeOwner(v, sh);
  }
  return null;
}

function s2Other(v, sh) {
  const m = sh.m;
  const what = '揺さぶり S2（持ち主でない人）';
  for (const [k, label] of [['eq', '装備'], ['bag', '道具']]) {
    const r = openClose(v, m, k, label, what);
    if (r === 'done') continue;
    if (r === false) {
      note(sh, `S2: 「${label}」を開く物が無い画面`);
      m.data[k] = { phase: 'done' };
      continue;
    }
    return r;
  }
  m.data.otherDone = true;
  return null;
}

// ---------------------------------------------------------------- S9（片方が先に終わって待つ）
function s9Waiter(v, sh) {
  const m = sh.m;
  if (m.step === 'release') return null;
  const r = openClose(v, m, 'sheet', '装備', '揺さぶり S9（待っている人）');
  if (r === 'done') {
    m.step = 'release';
    m.data.waiterDid = true;
    return null;
  }
  if (r === false) {
    note(sh, `S9: 待っている人（${v.seat}）の画面（${v.mode}）にシートを開く物が無い。シートの開け閉めは飛ばした`);
    m.step = 'release';
    return null;
  }
  return r;
}

// ---------------------------------------------------------------- S11（戦闘で待っている間）
function s11(v, sh) {
  const m = sh.m;
  const what = '揺さぶり S11';
  if (v.mode !== 'battle') {
    note(sh, 'S11: 戦闘が終わったので途中でやめた');
    end(sh);
    return null;
  }
  if (m.step === 'more') {
    if (hasLayer(v, 'status-list')) m.step = 'moreClose';
    else {
      const mo = findMark(v, 'data-status-more');
      if (mo?.enabled && !m.data.moreTried) return decide(G.statusMore, `${what}: 状態の印の「＋${mo.marks.find((x) => x.startsWith('data-status-more='))?.split('=')[1] ?? ''}」を押す`, { ...P, after: () => { m.data.moreTried = true; m.step = 'moreClose'; } });
      note(sh, 'S11: 状態の印の「＋N」が出ていないので、一覧は飛ばした');
      m.step = 'intent';
    }
  }
  if (m.step === 'moreClose') {
    if (!hasLayer(v, 'status-list')) {
      m.data.moreWait = (m.data.moreWait ?? 0) + 1;
      if (m.data.moreWait < 4) return HOLD;
      result(sh, 'S11', false, `${v.seat}: 「＋N」を押しても状態の一覧が開かない`);
      m.step = 'intent';
    } else {
      m.data.listOpened = true;
      return decide(G.statusListClose, `${what}: 状態の一覧を閉じる`, { ...P, after: go(m, 'intent') });
    }
  }
  if (m.step === 'intent') {
    if (hasLayer(v, 'status-list')) return HOLD;
    const e = (v.facts.bEnemies ?? []).find((x) => x['data-dead'] === null && x.intent);
    if (!e) {
      note(sh, 'S11: 予告の出ている敵がいない');
      // 区切り 4 の誤検知の直し: 4人の通しの1戦目（奇襲が成功して敵の予告がまだ無い・状態の印も無い）で、開く物が何も無いのに NG にしていた。
      // 開く物が無かった時は「中断」（記録だけ）にする。開けた物が開かない時は、今までどおり NG
      m.data.nothing = !m.data.listOpened;
      m.step = 'done';
      return null;
    }
    m.data.enemy = e['data-enemy'];
    return decide(G.shIntent(e['data-enemy']), `${what}: 敵 ${e['data-enemy']} の予告を長押しする`, { ...P, long: true, after: go(m, 'detailClose') });
  }
  if (m.step === 'detailClose') {
    if (!hasLayer(v, 'detail')) {
      m.data.detailWait = (m.data.detailWait ?? 0) + 1;
      if (m.data.detailWait < 4) return HOLD;
      result(sh, 'S11', false, `${v.seat}: 予告を長押ししても説明の窓が開かない`);
      m.step = 'done';
      return null;
    }
    m.data.detailOpened = true;
    return decide(G.detailClose, `${what}: 説明の窓を閉じる`, { ...P, after: go(m, 'done') });
  }
  return null;
}

// ---------------------------------------------------------------- S7・S8（読み込み直しから戻る）
function reloadReturn(v, sh) {
  const m = sh.m;
  if (v.screen === 'game') return null;
  if (v.screen === 'join') return decide(G.topBack, `揺さぶり ${m.id}: 部屋に参加の画面から「戻る」（タイトルへ）`, P);
  if (v.screen === 'title') {
    const b = findMark(v, 'data-back-to-room');
    if (b?.enabled) return decide(G.backToRoom, `揺さぶり ${m.id}: タイトルの「${b.text}」`, { ...P, after: () => { m.data.pressedBack = true; } });
    return HOLD;
  }
  return HOLD;
}

// ---------------------------------------------------------------- S10（断ってから受ける）
function s10Decline(v, sh) {
  const inv = v.actions.find((a) => a.enabled && a.text === '行かない' && a.css.includes('button'));
  const mv = findMark(v, 'data-move-agree', 'no');
  if (!inv && !mv?.enabled) return null;
  const kind = inv ? 'inv' : 'mv';
  if (!opportunity(sh, 'S10', `${kind}|${sh.n[kind]}`)) return null;
  begin(sh, 'S10', { step: 'reinvite', seat: v.seat, tag: kind === 'inv' ? '同行の誘い' : '移動の提案' });
  return decide(kind === 'inv' ? G.inviteNo : G.moveAgreeNo, `揺さぶり S10: ${kind === 'inv' ? '同行の誘いに「行かない」' : '移動の提案に「同行をやめる」'}（1度断る）`, { ...P, after: () => { sh.m.data.declinedAt = sh.n.tick; } });
}
function s10Reinvite(v, sh) {
  const m = sh.m;
  if (m.step !== 'reinvite') return null;
  // 区切り 4（4人の通しの直し）: 断った人のキャラ（P<n> のキャラは h<n-1>）を誘い直す。前は一覧の先頭を誘い、4人では別の人（P3）のキャラを誘っていた
  const mine = `h${Number(String(m.seat).slice(1)) - 1}`;
  const inv = v.actions.find((a) => a.enabled && a.marks.includes('data-invite=no') && a.marks.includes(`data-companion=${mine}`));
  const hero = inv?.marks.find((x) => x.startsWith('data-companion='))?.slice('data-companion='.length);
  if (!hero) return null;
  return decide(G.invite(hero), `揺さぶり S10: もう1度同行に誘う（${hero}）`, { turn: true, ...P, after: () => { m.step = 'accept'; m.data.hero = hero; m.data.inviter = v.seat; } });
}

// ---------------------------------------------------------------- S12（店の「ほしい！」）
function s12(v, sh) {
  const m = sh.m;
  const tab = (v.facts.tTabs ?? []).find((t) => /\bbtn-gold\b/.test(t.class ?? ''))?.['data-town-tab'];
  if (m.step === 'tab') {
    if (tab === 'shop') m.step = 'want';
    else return decide(G.townTab('shop'), '揺さぶり S12: 店のタブを開く', P);
  }
  if (m.step === 'want') {
    const row = (v.facts.tShop ?? []).find((r) => (r.want ?? 0) > 0);
    if (!row) {
      note(sh, 'S12: 「ほしい！」のボタンのある品が無い');
      end(sh);
      return null;
    }
    m.data.row = row['data-shop-row'];
    m.data.item = row['data-item-id'];
    return decide(G.shopWant(row['data-shop-row']), `揺さぶり S12: 「${KB.items[row['data-item-id']]?.name}」に「ほしい！」`, { ...P, after: () => { m.step = 'check'; m.data.at = sh.n.tick; } });
  }
  return HOLD;
}

// ---------------------------------------------------------------- 頭の前に聞く口
/**
 * 頭の前に聞く。返す物: 決め・HOLD・null
 */
export function shakeBrain(v, board) {
  const sh = board.sh;
  if (!sh) return null;
  const m = sh.m;
  // 読み込み直しの後（タイトル・部屋に参加の画面）
  if (m && (m.id === 'S7' || m.id === 'S8') && m.seat === v.seat && m.step === 'return') return reloadReturn(v, sh);
  if (v.screen !== 'game') return null;
  if (m) {
    switch (m.id) {
      case 'S1':
        if (v.seat === m.seat) return s1(v, sh);
        if (m.step === 'peer' || m.step === 'peerClose') return v.seat === m.data.peer ? s1Peer(v, sh) : null;
        return null;
      case 'S2':
        if (v.seat === m.owner) return challengeOwner(v, sh);
        if (!m.data.otherDone) return s2Other(v, sh);
        return null;
      case 'S3':
        return v.seat === m.seat ? s3(v, sh) : null;
      case 'S4':
        return v.seat === m.seat ? s4(v, sh) : null;
      case 'S9':
        if (v.seat === m.late) return m.step === 'release' ? null : HOLD;
        // 待つ人: シートを開いた後は、頭（common の「うっかり開いたシートを閉じる」）より先に、ここで閉じるまで答える
        // （区切り 3-S の試しの通しの直し: 前はシートを開く → 頭が閉じる → また開く、を行ったり来たりした）
        if (v.seat === m.waiter && m.data.sheet && m.step !== 'release') return s9Waiter(v, sh);
        return null;
      case 'S10':
        if (m.step === 'reinvite' && v.seat !== m.seat) return s10Reinvite(v, sh);
        // 区切り 4（4人の通しの直し）: 誘い直した人は、相手が答えるまで動かずに待つ（人も返事を待つ。前は P4 が誘ってすぐ「移動する」を押し、
        // 誘いが答えられないまま終わって「40 手のあいだ同行にならない」の NG になった。2人の時は P1 の手番の押す順で、たまたま先に答えていた）
        if (m.step === 'accept' && v.seat === m.data.inviter) return HOLD;
        return null;
      case 'S11':
        return v.seat === m.seat ? s11(v, sh) : null;
      case 'S12':
        if (v.seat === m.seat) return s12(v, sh);
        if (v.seat === m.holder) {
          // 店のタブを開いて待つ（相手の「ほしい！」が自分の画面に出るのを見るため）。
          // センサーの直し（2026-11-18・区切り 3-S の試しの通し）: 始めを決めた画面の後に、P1 の頭が別のタブを押していて、P1 が店を見ていなかった（bot の間違い）
          const tab = (v.facts.tTabs ?? []).find((t) => /\bbtn-gold\b/.test(t.class ?? ''))?.['data-town-tab'];
          if (v.mode === 'town' && tab !== 'shop' && !m.data.holderTab) return decide(G.townTab('shop'), '揺さぶり S12（手番の人）: 店のタブを開いて待つ', { ...P, after: () => { m.data.holderTab = true; } });
          return HOLD;
        }
        return null;
      default:
        return null;
    }
  }
  // ---- 始める（機会を数える）----
  // キャラの作業の窓（カードの強化・お供・行商人など。画面いっぱいに出る data-hero-task）が出ている間は始めない
  // （区切り 3-S の試しの通しの直し: 窓の下の帯の「装備」を押そうとして、窓の「やめる」が乗っていた。bot の間違い）
  if ((v.facts.dTask ?? []).length) return null;
  if (v.layers.some((l) => l.id !== 'detail')) {
    // シート・確認の窓などが開いている間は始めない（挑む段の持ち主は、窓が無い時だけ）
    return null;
  }
  // 挑む段（持ち主）: 選び直す・任せる・S2
  const ch = challengeOwner(v, sh);
  if (ch) return ch;
  // 区切り 4: 4人の時、S1 は P2 と P3 が交代でする（計画 §5-2）。だれの番かは、S1 が起きた回数で決める（同じ種なら同じ）
  const s1Seat = sh.people === 4 && sh.k.S1.count % 2 === 1 ? 'P3' : 'P2';
  if (v.seat === 'P3' && s1Seat === 'P3') {
    const pa = pendingAgree(v);
    if (pa && pa.options.length) {
      const key = `${pa.kind}|${agreeKey(v)}`;
      if (opportunity(sh, 'S1', key)) {
        begin(sh, 'S1', { step: 'open', seat: v.seat, tag: `${pa.kind}・${key.slice(0, 40)}` });
        Object.assign(sh.m.data, { votes: votesOf(v), kind: pa.kind, other: pa.other, agree: agreeKey(v) });
        const d = s1(v, sh);
        return d === HOLD ? HOLD : d;
      }
    }
  }
  if (v.seat === 'P2') {
    const b11 = s11Start(v, sh, board);
    if (b11) return b11;
    // S10: 同行の誘い・移動の提案（誘われた人）
    const dec = s10Decline(v, sh);
    if (dec) return dec;
    const pa = pendingAgree(v);
    if (pa && pa.options.length) {
      const key = `${pa.kind}|${agreeKey(v)}`;
      // S3（扉が2つ以上）を先に数える。S3 が起きた機会では S1 は数えない（S1 とずらす）
      if (pa.kind === 'door' && pa.options.length >= 2 && opportunity(sh, 'S3', key)) {
        const split = pa.options.find((x) => x !== pa.other);
        begin(sh, 'S3', { step: 'split', seat: v.seat, tag: key });
        Object.assign(sh.m.data, { other: pa.other, split, mapPin: !sh.flags.mapPin });
        return s3(v, sh);
      }
      if (pa.kind === 'opener' && pa.options.length >= 2 && opportunity(sh, 'S4', key)) {
        const split = pa.options.find((x) => x !== pa.other);
        begin(sh, 'S4', { step: 'split', seat: v.seat, tag: key });
        Object.assign(sh.m.data, { other: pa.other, split });
        return s4(v, sh);
      }
      if (s1Seat === 'P2' && opportunity(sh, 'S1', key)) {
        begin(sh, 'S1', { step: 'open', seat: v.seat, tag: `${pa.kind}・${key.slice(0, 40)}` });
        Object.assign(sh.m.data, { votes: votesOf(v), kind: pa.kind, other: pa.other, agree: agreeKey(v) });
        const d = s1(v, sh);
        return d === HOLD ? HOLD : d;
      }
    }
  }
  return null;
}

/**
 * 頭が「待つ」と答えた端末に聞く口（待っている間にする揺さぶり）
 */
export function shakeIdle(v, board) {
  const sh = board.sh;
  if (!sh || v.screen !== 'game') return null;
  const m = sh.m;
  if (m?.id === 'S9' && v.seat === m.waiter) return s9Waiter(v, sh);
  if (m) return null;
  return null;
}

/**
 * S11 を始めるか（P2・戦闘の味方の番）。区切り 3-S の試しの通しの直し: 「準備完了を押して待っている」時だけにしていたが、
 * 押すのはいつも P1 が先なので、P2 が待つ形がほとんど出ず、30 分で機会 0 だった。戦闘の味方の番（ほかの席がまだ動ける間）の
 * 始めに、ターンごとに1回数える（周期4）。揺さぶりの手は先に押す（prio）ので、P1 の番の途中に開け閉めする形になる
 */
function s11Start(v, sh, board) {
  if (v.seat !== 'P2' || v.mode !== 'battle' || v.layers.length) return null;
  const ready = (v.facts.bEndTurn ?? [])[0]?.['data-end-turn'];
  if (!['ready', 'end', 'waiting'].includes(ready)) return null;
  const t = board.battle?.[v.seat]?.turn ?? 0;
  const n = (board.stats?.battles ?? []).length;
  if (!opportunity(sh, 'S11', `${n}|${t}`)) return null;
  begin(sh, 'S11', { step: 'more', seat: v.seat, tag: `${n + 1}戦目・${t}ターン` });
  sh.m.data.startTick = sh.n.tick;
  return s11(v, sh);
}

// ---------------------------------------------------------------- 毎ステップの確かめ（全端末の View）
const findSeat = (views, seat) => views.find((x) => x.seat === seat);
const hpOfName = (v, name) => partyHp(v.facts.dParty ?? []).find((h) => h.name === name)?.hp;

/**
 * 毎ステップ、全端末の View で確かめる（run が呼ぶ）。返す物: なし（結果は board.sh に書く）
 */
export function shakeObserve(views, board) {
  const sh = board.sh;
  if (!sh || !views.length) return;
  sh.n.tick = (sh.n.tick ?? 0) + 1;
  const p1 = findSeat(views, 'P1');
  const p2 = findSeat(views, 'P2');
  const m = sh.m;
  // 機会の番号（同じ誘い・同じ提案・同じ挑む段を2回数えない）
  for (const v of views) {
    const prev = sh.prev[v.seat] ?? {};
    const inv = v.actions.some((a) => a.text === '行かない');
    const mv = v.actions.some((a) => a.marks.includes('data-move-agree=no'));
    const stage = (v.facts.dChallenge ?? []).length > 0;
    if (v.seat === 'P2') {
      if (prev.inv && !inv) sh.n.inv++;
      if (prev.mv && !mv) sh.n.mv++;
    }
    if (v.seat === 'P1' && prev.stage && !stage) sh.n.stage++;
    if (v.seat === 'P1' && prev.mode === 'town' && v.mode === 'world') sh.n.townExit++;
    sh.prev[v.seat] = { inv, mv, stage, mode: v.mode, screen: v.screen };
  }
  // 実機の不具合の確かめ④（取り合いとカード3択の順）の行: 報酬の画面で取り合いの窓を見たか（区切り 3-S の通しで、報酬の段の印の値が
  // 'claim' でなく、取り合いを見たのに「見なかった」と書いていた。取り合いの行そのもの data-claim で数える）
  if (views.some((v) => v.mode === 'reward' && (v.facts.claims ?? []).length)) sh.flags.claimSeen = true;
  // 手順の上限
  if (m) {
    if (m.step !== m.lastStep) {
      m.lastStep = m.step;
      m.stepTicks = 0;
    } else m.stepTicks++;
    if (m.stepTicks > STEP_LIMIT && !['S7', 'S8'].includes(m.id)) {
      sh.k[m.id].abort++;
      note(sh, `揺さぶり ${m.id}: 手順「${m.step}」が ${STEP_LIMIT} 手のあいだ進まないので中断した（bot の手順の見立てで、ゲームの不具合とは決めない）`, 'warn');
      sh.k[m.id].log.push(`中断: 手順「${m.step}」が進まない`);
      end(sh);
      return;
    }
  }
  if (m?.id === 'S1') observeS1(views, sh, p1, p2);
  else if (m?.id === 'S2') observeS2(views, sh);
  else if (m?.id === 'S3') observeS3(views, sh, p1, p2);
  else if (m?.id === 'S4') observeS4(views, sh, p1, p2);
  else if (m?.id === 'S9') observeS9(views, sh, p1, p2);
  else if (m?.id === 'S10') observeS10(views, sh, p1, p2);
  else if (m?.id === 'S11' && m.step === 'done' && m.data.nothing) {
    // 開く物（状態の「＋N」・敵の予告）が画面に無かった: 確かめられないので中断（ゲームの不具合とは決めない）
    sh.k.S11.abort++;
    sh.k.S11.log.push(`中断: ${m.seat} の画面に、開く物（状態の「＋N」・敵の予告）が無かった`);
    end(sh);
  } else if (m?.id === 'S11' && m.step === 'done') {
    result(sh, 'S11', !!(m.data.listOpened || m.data.detailOpened), `${m.seat}: 状態の一覧${m.data.listOpened ? 'を開いて閉じた' : 'は無し'}・予告の説明${m.data.detailOpened ? 'を開いて閉じた' : 'は開かなかった'}`);
    sh.watch.push({ id: 'S11', kind: 'others-move', since: sh.n.tick, ticks: 0 });
    end(sh);
  } else if (m?.id === 'S12') observeS12(views, sh, p1, p2);
  // 挑む段の「選び直す」「任せる」の確かめ
  if (sh.flags.rechoose && !sh.flags.rechooseChecked) {
    const back = views.every((v) => (v.facts.dOptions ?? []).length > 0 && !(v.facts.dChallenge ?? []).length);
    if (back) {
      sh.flags.rechooseChecked = true;
      sh.k.S5.log.push('OK: 「選び直す」の後、全端末が選ぶ段（選択肢）に戻った');
      note(sh, '確かめ: 「選び直す」の後、全端末が選ぶ段に戻った（OK）', 'check');
    } else if (sh.n.tick - sh.flags.rechoose.at > 30) {
      sh.flags.rechooseChecked = true;
      result(sh, 'S5', false, '「選び直す」を押した後 30 手のあいだ、全端末が選ぶ段に戻らない');
    }
  }
  if (sh.flags.handover && !sh.flags.handoverChecked) {
    const heroes = views.map((v) => (v.facts.dChallenge ?? [])[0]?.['data-challenge-hero']).filter(Boolean);
    if (heroes.length === views.length && heroes.every((h) => h === sh.flags.handover.to)) {
      sh.flags.handoverChecked = true;
      const owners = views.filter((v) => (v.facts.dChallenge ?? [])[0]?.['data-challenge-mine'] === '1').map((v) => v.seat);
      sh.k.S5.log.push(`OK: 「任せる」の後、全端末の挑む役が ${sh.flags.handover.to} になった（持ち主の画面 ${owners.join(',')}）`);
      note(sh, `確かめ: 「任せる」の後、全端末の挑む役が ${sh.flags.handover.to}（持ち主の画面 ${owners.join(',') || 'なし'}）`, 'check');
    } else if (sh.n.tick - sh.flags.handover.at > 30) {
      sh.flags.handoverChecked = true;
      result(sh, 'S5', false, `「任せる」を押した後 30 手のあいだ、挑む役が ${sh.flags.handover.to} にならない`);
    }
  }
  observeS5(views, sh);
  observeS6(views, sh);
  // 始める（全端末を見て決める物）: S9・S12
  if (!sh.m && p1 && p2) startFromViews(views, sh, p1, p2, board);
  // 見張り（揺さぶりの後に「進む」か）
  for (const w of sh.watch.splice(0)) {
    w.ticks++;
    if (w.kind === 'agree') {
      const k = p1 ? agreeKey(p1) : '';
      if (k !== w.key) {
        result(sh, w.id, true, `${w.what}: 合意が進んだ（${w.ticks} 手）`);
        continue;
      }
      if (w.ticks > 60) {
        result(sh, w.id, false, `${w.what}: 60 手のあいだ合意が進まない`);
        continue;
      }
    }
    if (w.kind === 'pin-gone') {
      const has = p1 && (p1.facts.pinBanner ?? []).some((t) => t.includes('P2'));
      if (!has) {
        sh.k[w.id].log.push(`OK: 「こっち！」の帯が P1 の画面から消えた（約 ${w.ticks} 手の後）`);
        continue;
      }
      if (w.ticks > 80) {
        note(sh, `S3: 「こっち！」の帯が 80 手のあいだ P1 の画面から消えない（約8秒で消える見込み）`, 'warn');
        continue;
      }
    }
    if (w.kind === 'others-move') {
      // S11: ほかの人の番が止まらない（同じ戦闘のうちに P1 の画面が変わる＝P1 が押した・敵の番が進んだ）
      if (w.ticks > 1) {
        result(sh, w.id, true, 'ほかの人の番が止まらない（開け閉めの後も、戦闘が進んだ）');
        continue;
      }
    }
    if (w.kind === 'leave') {
      const gone = views.every((v) => v.mode !== w.mode || v.screen !== 'game');
      if (gone) {
        result(sh, w.id, true, `${w.what}: 全員終わって進んだ（${w.ticks} 手）`);
        continue;
      }
      if (w.ticks > 80) {
        result(sh, w.id, false, `${w.what}: 80 手のあいだ「${w.mode}」から進まない（行き止まりの見立て）`);
        continue;
      }
    }
    sh.watch.push(w);
  }
}

function observeS1(views, sh, p1, p2) {
  const m = sh.m;
  // 渡した薬: 受け取った人の画面に「受け取りました」の知らせ（見えた時だけ記録）
  if (m.data.gave && !m.data.toastSeen) {
    const peer = views.find((v) => v.seat !== m.seat);
    if (peer && (peer.facts.toasts ?? []).some((t) => /受け取/.test(t))) {
      m.data.toastSeen = true;
      sh.k.S1.log.push(`OK: ${peer.seat} の画面に「${(peer.facts.toasts ?? []).find((t) => /受け取/.test(t))}」`);
    }
  }
  // 使った薬: 全端末の帯で HP が増えた
  if (m.data.used && !m.data.usedChecked && ['close', 'afterClose', 'peer', 'peerClose', 'done'].includes(m.step)) {
    const hps = views.map((v) => ({ seat: v.seat, hp: hpOfName(v, m.data.used.name) })).filter((x) => x.hp !== undefined);
    if (hps.length === views.length && hps.every((x) => x.hp > m.data.used.before)) {
      m.data.usedChecked = true;
      result(sh, 'S1', true, `${m.data.used.name} の HP が ${m.data.used.before} → ${hps.map((x) => `${x.seat}=${x.hp}`).join('・')}（全端末で増えた）`);
    } else if ((m.data.useWait = (m.data.useWait ?? 0) + 1) > 12) {
      m.data.usedChecked = true;
      result(sh, 'S1', false, `${m.data.used.name} に薬を使ったが、HP が全端末で増えない（前 ${m.data.used.before}・今 ${hps.map((x) => `${x.seat}=${x.hp}`).join('・') || '読めない'}）`);
    }
  }
  if (m.step === 'afterClose') {
    // 閉じた後、票の印が消えていない（揺さぶった人の画面: 仲間の票。票を入れた仲間の画面: その人自身の票）
    // 区切り 4: 4人で P3 が揺さぶる時にも使えるよう、P1・P2 の決め打ちをやめた（2人の時は前と同じ: 揺さぶる人 = P2・票を入れた仲間 = P1）
    const before = m.data.votes;
    const me = findSeat(views, m.seat) ?? p2;
    const nowMe = votesOf(me);
    const lost = [];
    for (const [k, seats] of Object.entries(before)) for (const s of seats) if (!(nowMe[k] ?? []).includes(s)) lost.push(`${m.seat} の画面の ${k} の ${s}`);
    const otherK = `${m.data.kind}:${m.data.other}`;
    const voters = m.data.kind === 'opener' ? [] : (before[otherK] ?? []).filter((s) => s !== m.seat);
    const ownLost = voters.filter((s) => {
      const pv = findSeat(views, s);
      return pv && !(votesOf(pv)[otherK] ?? []).includes(s);
    });
    const ok = !lost.length && !ownLost.length;
    result(sh, 'S1', ok, `シートを閉じた後の票の印: ${ok ? '消えていない' : `消えた（${lost.join('・')}${ownLost.length ? `・${ownLost.map((s) => `${s} の画面の自分の票 ${otherK}`).join('・')}` : ''}）`}`);
    // 合意が進むかを見張る
    sh.watch.push({ id: 'S1', kind: 'agree', key: m.data.agree, ticks: 0, what: 'S1' });
    if (m.data.gave) {
      m.step = 'peer';
      // 区切り 4: 受け取った人 = 渡した相手のキャラの持ち主（キャラ h<n> は P<n+1>。4人で P3 が渡す時も、受け取った人の画面を見る）
      const n = /^h(\d+)$/.exec(m.data.gave.to ?? '')?.[1];
      const owner = n !== undefined ? `P${Number(n) + 1}` : null;
      m.data.peer = (owner && owner !== m.seat && findSeat(views, owner) ? owner : null) ?? views.find((v) => v.seat !== m.seat)?.seat;
    } else end(sh);
    return;
  }
  if (m.step === 'done') end(sh);
}

function observeS2(views, sh) {
  const m = sh.m;
  const owner = findSeat(views, m.owner);
  if (!owner) return;
  const stage = (owner.facts.dChallenge ?? []).length > 0;
  const ck = (owner.facts.checkMarks ?? [])[0];
  const spent = ck ? Number(ck['data-challenge-focus']) : null;
  if (spent !== null && spent >= 1) m.data.maxSpent = Math.max(m.data.maxSpent ?? 0, spent);
  // 持ち主でない人の開け閉めの間、持ち主のフォーカスの指定が 0 に戻らない
  if (m.data.maxSpent && stage && spent !== null && spent < m.data.maxSpent && !m.data.reset) {
    m.data.reset = true;
    result(sh, 'S2', false, `${m.owner}（持ち主）のフォーカスの指定が ${m.data.maxSpent} → ${spent} に戻った（ほかの人がシートを開け閉めしている間）`);
  }
  if (m.data.otherDone && !m.data.checked && stage && m.data.noPlus && !m.data.maxSpent) {
    m.data.checked = true;
    sh.k.S2.abort++;
    sh.k.S2.log.push(`中断: ${m.owner}（持ち主）がフォーカスを足せなかった（足すボタンが押せない）ので、確かめる物が無い`);
  } else if (m.data.otherDone && !m.data.checked && stage) {
    m.data.checked = true;
    if (!m.data.reset) result(sh, 'S2', (spent ?? 0) >= 1, `ほかの人が装備・道具を開いて閉じた後も、${m.owner} のフォーカスの指定が ${spent}（data-challenge-focus）のまま`);
  }
  if (!stage) {
    if (!m.data.checked) note(sh, 'S2: 挑む段が、確かめの前に終わった', 'warn');
    end(sh);
  }
}

function observeS3(views, sh, p1, p2) {
  const m = sh.m;
  m.data.p1key ??= agreeKey(p1);
  if (m.step === 'checkSplit') {
    const ok1 = (f) => (f.dDoors ?? []).find((d) => d['data-door-choice'] === m.data.other);
    const d1 = ok1(p1.facts);
    const s1 = (p1.facts.dDoors ?? []).find((d) => d['data-door-choice'] === m.data.split);
    const split = p1.mode === 'dungeon' && d1 && s1 && (d1['data-my-vote'] !== null || seatsOf(d1.votes).includes('P1')) && seatsOf(s1.votes).includes('P2');
    if (!split) {
      m.data.splitWait = (m.data.splitWait ?? 0) + 1;
      if (m.data.splitWait < 6) return;
    }
    const chips = views.map((v) => `${v.seat}:${(v.facts.pinChips ?? []).filter((t) => t.includes('P2')).length}`).join(' ');
    const banner = (p1.facts.pinBanner ?? []).some((t) => t.includes('P2'));
    // 区切り 4 の誤検知の直し: 前は全端末が dungeon かを見ていた。4人では、ダンジョンに入っていない人（世界マップの P3）がいるので、
    // 割れた票は正しく出ていたのに NG にしていた。票を入れた2人（P1・P2）がダンジョンの画面のまま（扉が開いていない）かを見る
    const status = [p1, p2].every((v) => v?.mode === 'dungeon');
    result(sh, 'S3', !!split && status, `票が割れた（P1=${m.data.other}・P2=${m.data.split}）間は扉が開かない: ${split && status ? 'OK' : `NG（P1 の画面 ${p1.mode}）`}`);
    result(sh, 'S3', banner, `「こっち！」の帯が P1 の画面に出る（札 ${chips}）`);
    if (banner) sh.watch.push({ id: 'S3', kind: 'pin-gone', ticks: 0 });
    if (m.data.mapPin) {
      m.step = 'map';
      sh.flags.mapPin = true;
    } else m.step = 'align';
  } else if (m.step === 'mapCheck') {
    const seen = (p1.facts.cellPins ?? 0) > 0 || (p1.facts.pinBanner ?? []).some((t) => t.includes('P2'));
    if (!seen && sh.n.tick - m.data.pinAt < 6) return;
    result(sh, 'S3', seen, `地図の「こっち！」が P1 の画面に出る（地図のマスの印 ${p1.facts.cellPins ?? 0}・帯 ${(p1.facts.pinBanner ?? []).length}）`);
    m.step = 'mapClose';
  } else if (m.step === 'checkOpen') {
    sh.watch.push({ id: 'S3', kind: 'agree', key: m.data.p1key, ticks: 0, what: 'S3（そろえたら開く）' });
    end(sh);
  }
}

function observeS4(views, sh, p1, p2) {
  const m = sh.m;
  if (m.step === 'checkSplit') {
    const row = (v, id) => (v.facts.openers ?? []).find((o) => o['data-opener'] === id);
    const a = row(p1, m.data.other);
    const b = row(p1, m.data.split);
    const split = a && b && seatsOf(a.votes).includes('P1') && seatsOf(b.votes).includes('P2');
    if (!split) {
      m.data.splitWait = (m.data.splitWait ?? 0) + 1;
      if (m.data.splitWait < 6) return;
    }
    const opened = views.some((v) => (v.facts.chestOpenKind ?? []).length);
    const waitText = views.map((v) => v.waits.map((w) => w.text).join('／')).filter(Boolean);
    result(sh, 'S4', !!split && !opened, `開け役の票が割れた（P1=${m.data.other}・P2=${m.data.split}）間は開かない（開けるボタン ${opened ? 'あり' : 'なし'}・待ちの字「${waitText.join(' ｜ ').slice(0, 80)}」）`);
    m.data.key = agreeKey(p1);
    m.step = 'align';
  } else if (m.step === 'checkOpen') {
    const owners = views.filter((v) => (v.facts.chestOpenKind ?? []).length).map((v) => v.seat);
    const decided = views.every((v) => !(v.facts.openers ?? []).length);
    if (!owners.length && sh.n.tick - m.data.alignAt < 10) return;
    result(sh, 'S4', owners.length === 1 && decided, `そろえたら決まり、開けるボタンは持ち主の画面にだけ出る（出た画面 ${owners.join(',') || 'なし'}）`);
    end(sh);
  }
}

function observeS9(views, sh, p1, p2) {
  const m = sh.m;
  const late = findSeat(views, m.late);
  const waiter = findSeat(views, m.waiter);
  if (!late || !waiter) return;
  // 待っている人の画面に、だれを待っているかの字
  if (!m.data.waitText) {
    const t = [...(waiter.facts.waitNotes ?? []), ...waiter.waits.map((w) => w.text), ...(waiter.facts.onlineNotes ?? [])].find((x) => /P2|さん|待って|選んで/.test(x));
    if (t) m.data.waitText = t;
  }
  if (m.step === 'release' && !m.data.released) {
    m.data.released = true;
    result(sh, 'S9', !!m.data.waitText, `${m.kind}: 待っている ${m.waiter} の画面の待ちの字「${(m.data.waitText ?? 'なし').slice(0, 60)}」・シートの開け閉め ${m.data.waiterDid ? 'できた' : '無し'}・${m.late} は ${m.data.lateHold ?? 0} 手遅らせた`);
    sh.watch.push({ id: 'S9', kind: 'leave', mode: m.mode, ticks: 0, what: `S9（${m.kind}）` });
    end(sh);
    return;
  }
  m.data.lateHold = (m.data.lateHold ?? 0) + 1;
  // 待っている人が何もしないまま（押す物が無い）なら、遅らせるのをやめる（互いに待つ形にしない）
  if (m.data.lateHold > 25) {
    note(sh, `S9: ${m.kind} で待っている人のシートの開け閉めが終わらないので、遅らせるのをやめた`, 'warn');
    m.step = 'release';
  }
}

function observeS10(views, sh, p1, p2) {
  const m = sh.m;
  // 区切り 4: 誘い直した人の画面を見る（4人では P1 とは限らない）
  const inviter = views.find((v) => v.seat === m.data.inviter) ?? views.find((v) => v.seat !== m.seat);
  if (m.step === 'reinvite' && sh.n.tick - (m.data.declinedAt ?? sh.n.tick) > 30) {
    note(sh, 'S10: 断った後、30 手のあいだ誘い直せなかった（手番が移った見立て）', 'warn');
    result(sh, 'S10', true, '断った後に止まらなかった（誘い直しは手番が移ったので無し）');
    end(sh);
    return;
  }
  if (m.step === 'accept' && inviter) {
    const yes = inviter.actions.some((a) => a.marks.includes('data-invite=yes') && a.marks.includes(`data-companion=${m.data.hero}`));
    if (yes) {
      result(sh, 'S10', true, `1度断った後、もう1度誘われて受けた（${inviter.seat} の画面で ${m.data.hero} が「同行」）`);
      end(sh);
    } else if (sh.n.tick - (m.data.declinedAt ?? 0) > 40) {
      result(sh, 'S10', false, `誘い直した後、40 手のあいだ「同行」にならない`);
      end(sh);
    }
  }
}

function observeS12(views, sh, p1, p2) {
  const m = sh.m;
  if (m.step !== 'check') return;
  const holder = findSeat(views, m.holder);
  const row = (holder?.facts.tShop ?? []).find((r) => r['data-shop-row'] === m.data.row);
  const seen = row && /P2/.test(row.chips ?? '');
  if (!seen && sh.n.tick - m.data.at < 8) return;
  result(sh, 'S12', !!seen, `「ほしい！」の印が ${m.holder} の画面の「${KB.items[m.data.item]?.name}」に出る（札「${row?.chips ?? 'なし'}」）`);
  sh.flags.s12towns.add(m.town);
  end(sh);
}

/** S5: 挑む段の持ち主の画面で、フォーカスの指定と成功率の字を集め、結果の枠と照らす（フォーカスの写しは shakeAfterTick） */
function observeS5(views, sh) {
  const owner = views.find((v) => (v.facts.dChallenge ?? [])[0]?.['data-challenge-mine'] === '1');
  if (owner) {
    const ch = owner.facts.dChallenge[0];
    const ck = (owner.facts.checkMarks ?? [])[0];
    if (!sh.s5 || sh.s5.hero !== ch['data-challenge-hero'] || sh.s5.done) sh.s5 = { hero: ch['data-challenge-hero'], owner: owner.seat, chances: {}, spent: 0, event: (owner.facts.eventId ?? [])[0]?.['data-event-window'], done: false };
    if (ck) {
      const sp = Number(ck['data-challenge-focus']);
      sh.s5.chances[sp] = Number(ck['data-challenge-chance']);
      sh.s5.spent = sp;
    }
    sh.s5.left = !views.some((v) => (v.facts.dChallenge ?? []).length) ? true : false;
    return;
  }
  if (sh.s5 && !sh.s5.done) {
    // 挑む段が消えた: 結果の枠（data-check-focus）を全端末で読む
    const res = views.map((v) => ({ seat: v.seat, r: (v.facts.dCheckResult ?? [])[0] }));
    const have = res.filter((x) => x.r);
    sh.s5.wait = (sh.s5.wait ?? 0) + 1;
    if (have.length < views.length && sh.s5.wait < 15) return;
    sh.s5.done = true;
    if (!have.length) {
      // 「選び直す」で選ぶ段に戻った時など（判定はしていない）
      sh.s5 = null;
      return;
    }
    const n = sh.s5.spent;
    sh.s5.result = res;
    sh.s5.checkScreen = { n, res: res.map((x) => `${x.seat}=${x.r ? `${x.r['data-check-result']}・フォーカス${x.r['data-check-focus']}` : '読めない'}`).join(' ') };
    sh.s5.ready = true; // shakeAfterTick がフォーカスの写しと照らして記録する
  }
}

/** S6: 宝箱の持ち主の画面で、フォーカスの指定と成功率の字を集める（照らし合わせは shakeAfterTick） */
function observeS6(views, sh) {
  const owner = views.find((v) => (v.facts.chestOpenKind ?? []).length && (v.facts.checkMarks ?? []).length);
  if (owner) {
    const kind = owner.facts.chestOpenKind[0]['data-chest-open'];
    const ck = owner.facts.checkMarks[0];
    if (!sh.s6 || sh.s6.done) sh.s6 = { owner: owner.seat, kind, chances: {}, spent: 0, done: false };
    const sp = Number(ck['data-challenge-focus']);
    sh.s6.chances[sp] = Number(ck['data-challenge-chance']);
    sh.s6.spent = sp;
    return;
  }
  if (sh.s6 && !sh.s6.done && !views.some((v) => (v.facts.chestOpenKind ?? []).length)) {
    sh.s6.done = true;
    sh.s6.ready = true;
  }
}

/** 全端末を見て始める揺さぶり（S9・S12） */
function startFromViews(views, sh, p1, p2, board) {
  // S9: 施設（祠・神殿と祭壇）・報酬・漂流物の山に、2人とも入った（毎回）
  const flot = (v) => (v.facts.dFlotsam ?? []).length > 0;
  const kindOf = (v) => (flot(v) ? 'flotsam' : ['shrine', 'sanctuary', 'reward'].includes(v.mode) ? v.mode : null);
  const k1 = kindOf(p1);
  const k2 = kindOf(p2);
  const prev = sh.prev.s9kind ?? null;
  sh.prev.s9kind = k1 && k1 === k2 ? k1 : null;
  if (k1 && k1 === k2 && prev !== k1) {
    sh.n.scene++;
    const key = `${k1}|${sh.n.scene}`;
    if (opportunity(sh, 'S9', key)) {
      begin(sh, 'S9', { step: 'hold', late: 'P2', waiter: 'P1', kind: { shrine: '祠', sanctuary: '神殿・祭壇', reward: '報酬', flotsam: '漂流物の山' }[k1], mode: p1.mode, tag: key });
      return;
    }
  }
  // S12: P1 が店のタブを見ていて、P2 も町にいる（1つの町で1回）
  sh.flags.s12towns ??= new Set();
  const town = (p1.facts.tTown ?? [])[0]?.['data-town'];
  const tab1 = (p1.facts.tTabs ?? []).find((t) => /\bbtn-gold\b/.test(t.class ?? ''))?.['data-town-tab'];
  const exit2 = (p2.facts.tExit ?? [])[0]?.['data-facility-exit'];
  if (town && p1.mode === 'town' && p2.mode === 'town' && tab1 === 'shop' && !p1.layers.length && !p2.layers.length && !sh.flags.s12towns.has(town) && exit2 === 'go') {
    if (opportunity(sh, 'S12', town)) begin(sh, 'S12', { step: 'tab', seat: 'P2', holder: 'P1', town, tag: town });
  }
}

/**
 * 押す前（conductor の onViews。画面を読んだ直後・頭に聞く前）: S5・S6 のフォーカスの写しを取る（審判が読むだけ）。
 * 区切り 3-S の試しの通しの直し: 前は押した後（同じステップの後）に取っていて、開けた後の数を「前」と取り違え、S6 を NG と誤検知した。
 * 自己テスト: brain/selftest-shake.mjs（S5 の照らし合わせ。写しは押す前に取る形で流す）
 */
export async function shakeBeforePress({ judge, views, board }) {
  const sh = board.sh;
  if (!sh) return;
  const stageNow = views.some((v) => (v.facts.dChallenge ?? [])[0]?.['data-challenge-mine'] === '1');
  const chestNow = views.some((v) => (v.facts.chestOpenKind ?? []).length && (v.facts.checkMarks ?? []).length);
  if (!stageNow && !chestNow) return;
  const hs = await judge.heroes();
  if (!hs) return;
  if (stageNow) sh.s5before = hs;
  if (chestNow) sh.s6before = hs;
}

// ---------------------------------------------------------------- 毎ステップの後（非同期）
/**
 * ctx = { fleet, judge, views, board }。読み込み直し（S7・S8）・フォーカスの写しの照らし合わせ（S5・S6）・NG を審判の失敗にする
 */
export async function shakeAfterTick({ fleet, judge, views, board }) {
  const sh = board.sh;
  if (!sh) return;
  // S5・S6: 押す前の写し（shakeBeforePress）と、終わった後の写しを照らす
  if (sh.s5?.ready) {
    const s = sh.s5;
    s.ready = false;
    const after = await judge.heroes();
    const n = s.spent;
    if (n < 1) note(sh, `S5: 挑む段で、持ち主がフォーカスを足せなかった（残りが無い・イベント ${s.event}）。揺さぶりの数に入れない`, 'warn');
    else {
      sh.k.S5.count++;
      sh.order.push('S5');
      sh.flags.s5done = true;
      const up = s.chances[0] === undefined || s.chances[n] > s.chances[0] || s.chances[0] >= 100;
      result(sh, 'S5', up, `イベント ${s.event}: フォーカスを足す前と後の成功率の字 ${s.chances[0] ?? '?'}% → ${s.chances[n]}%（${n}）`);
      const same = s.result.every((x) => x.r && Number(x.r['data-check-focus']) === n);
      result(sh, 'S5', same, `結果の枠の「使ったフォーカス」（data-check-focus）が足した数 ${n} と同じ（全端末）: ${s.checkScreen.res}`);
      const before5 = sh.s5before;
      if (before5 && after) {
        const diff = after.map((h) => ({ id: h.id, d: (before5.find((b) => b.id === h.id)?.focus ?? h.focus) - h.focus }));
        const me = diff.find((x) => x.id === s.hero);
        const others = diff.filter((x) => x.id !== s.hero && x.d !== 0);
        result(sh, 'S5', me?.d === n && !others.length, `挑む役 ${s.hero} のフォーカスが ${me?.d ?? '?'} 減った（足した数 ${n}）・ほかのキャラの変化 ${others.map((x) => `${x.id} ${-x.d}`).join('・') || 'なし'}（審判が状態の写しで照らす）`);
      } else note(sh, 'S5: 状態の写しが読めず、フォーカスの減り方は照らせなかった', 'warn');
    }
  }
  if (sh.s6?.ready) {
    const s = sh.s6;
    s.ready = false;
    const n = s.spent;
    const before6 = sh.s6before;
    if (n >= 1 && before6) {
      const after = await judge.heroes();
      sh.k.S6.count++;
      sh.order.push('S6');
      const up = s.chances[0] === undefined || s.chances[n] > s.chances[0] || s.chances[0] >= 100;
      result(sh, 'S6', up, `宝箱（${s.kind}）: フォーカスを足す前と後の成功率の字 ${s.chances[0] ?? '?'}% → ${s.chances[n]}%（${n}）`);
      if (after) {
        const diff = after.map((h) => ({ id: h.id, d: (before6.find((b) => b.id === h.id)?.focus ?? h.focus) - h.focus })).filter((x) => x.d !== 0);
        result(sh, 'S6', diff.length === 1 && diff[0].d === n, `開けた人のフォーカスだけが ${n} 減った（減ったキャラ ${diff.map((x) => `${x.id} ${x.d}`).join('・') || 'なし'}）`);
      }
    }
  }
  // S13: 同時に押した票が両方とも入ったか（押した人が、次にもう1度同じ物を押したら「入らなかった」）
  if (sh.simCheck) {
    const c = sh.simCheck;
    if (c.idx === null) c.idx = judge.actions.length;
    for (const v of views) for (const t of v.facts.toasts ?? []) if (!c.toasts.includes(`${v.seat}「${t}」`)) c.toasts.push(`${v.seat}「${t}」`);
    const next = judge.actions.slice(c.idx).find((a) => a.result === 'tap' || a.result === 'long');
    if (next) {
      const again = c.presses.find((p) => p.seat === next.seat && next.target?.startsWith(p.css));
      // 区切り 4: 種類ごとの OK・NG（S13 の NG が 0 になったかを、種類ごとに見る）
      const t13 = (sh.s13[c.kind] ??= { count: 0, ok: 0, ng: 0, pairs: [] });
      if (again) t13.ng++;
      else t13.ok++;
      result(sh, 'S13', !again, again ? `${c.kind}: 2台で同時に押した後、${again.seat} がもう1度同じ物（${again.css}）を押した（${again.seat} の票・選択が画面に入っていなかった見立て。知らせ ${c.toasts.join('・') || 'なし'}）` : `${c.kind}: 同時に押した票が両方とも入った（次の手は ${next.seat}「${String(next.what).slice(0, 30)}」）`);
      sh.simCheck = null;
    } else if (sh.n.tick - (c.tick ??= sh.n.tick) > 40) sh.simCheck = null;
  }
  // S7・S8: 読み込み直し
  await reloads({ fleet, judge, views, board, sh });
  // 揺さぶりの間の P1 の押した数（S9 の遅らせた手数は observe の数で数える）
  for (const p of sh.pending.splice(0)) await judge.fail('shake', { text: `揺さぶり ${p.id}: ${p.text}`, key: `shake|${p.id}|${p.text.replace(/\d+/g, 'N').slice(0, 80)}` });
  for (const n of sh.notes.splice(0)) judge.note(n.kind, n.text);
}

async function reloads({ fleet, judge, views, board, sh }) {
  const m = sh.m;
  if (m && (m.id === 'S7' || m.id === 'S8')) {
    const v = views.find((x) => x.seat === m.seat);
    const partner = views.find((x) => x.seat !== m.seat);
    // 待っている人の画面に「通信が切れています」が出たか
    if (partner && [...(partner.facts.onlineNotes ?? []), ...partner.waits.map((w) => w.text)].some((t) => /通信が切れて/.test(t))) m.data.offlineSeen ??= Date.now() - m.t0;
    if (v?.screen === 'game' && v.mode) {
      m.data.backTicks = (m.data.backTicks ?? 0) + 1;
      if (m.data.backTicks < 2) return;
      const secs = (Date.now() - m.t0) / 1000;
      const sameScene = v.mode === m.before || v.mode === partner?.mode;
      result(sh, m.id, sameScene, `${m.seat} が読み込み直しから ${secs.toFixed(1)} 秒で戻った: 画面「${v.mode}」（前「${m.before}」・相手「${partner?.mode}」）`);
      const desync = judge.failures.filter((f) => (f.kind === 'desync' || f.kind === 'lag') && f.at >= m.atIso);
      result(sh, m.id, !desync.length, `戻った後の状態の印: ${desync.length ? `ずれ ${desync.length}` : '全端末で同じ'}`);
      if (m.data.offlineSeen !== undefined) {
        const short = m.data.offlineSeen < 10000;
        result(sh, m.id, !short, `待っていた ${partner.seat} に「通信が切れています」が ${(m.data.offlineSeen / 1000).toFixed(1)} 秒で出た（10秒より短い時は出ない決まり）`);
      } else sh.k[m.id].log.push(`OK: 待っていた ${partner?.seat} に「通信が切れています」は出なかった`);
      if (m.id === 'S8') {
        const host = await judge.hostOf();
        sh.k.S8.log.push(`記録: 戻った後のホスト ${Object.entries(host).filter(([, h]) => h).map(([s]) => s).join(',') || '?'}（前は P1。合否ではなく記録）`);
      }
      end(sh);
    } else if (Date.now() - m.t0 > 90000) {
      result(sh, m.id, false, `${m.seat} が読み込み直しから 90 秒たっても遊んでいる画面に戻れない（今 ${v?.screen ?? '?'}）`);
      end(sh);
    }
    return;
  }
  if (sh.m) return;
  const p1 = views.find((v) => v.seat === 'P1');
  const p2 = views.find((v) => v.seat === 'P2');
  if (!p1 || !p2 || views.some((v) => v.busy.length || v.layers.length)) return;
  const st = (sh.reload ??= { s7: 0, s8: 0 });
  const firstDun = (sh.prev.firstDungeon ??= (p1.facts.dungeonId ?? [])[0]?.['data-dungeon'] ?? null);
  const doors = board.dungeon?.doorsChosen ?? 0;
  let due = null;
  // S7 の1回目: 最初のダンジョンの (3＋種で 0〜1) 部屋目の後の、扉を選ぶ画面
  if (st.s7 === 0 && firstDun && p1.mode === 'dungeon' && p2.mode === 'dungeon' && (p1.facts.dungeonId ?? [])[0]?.['data-dungeon'] === firstDun && doors >= 3 + offsetOf(sh.seed, 'S7a', 2) && (p2.facts.dDoors ?? []).length) due = { id: 'S7', seat: 'P2', why: `最初のダンジョンの ${doors} 部屋目の後` };
  // S7 の2回目: 2つ目の町を出た後の世界マップ
  else if (st.s7 === 1 && sh.n.townExit >= 2 && p1.mode === 'world' && p2.mode === 'world') due = { id: 'S7', seat: 'P2', why: `${sh.n.townExit} つ目の町を出た後の世界マップ` };
  // S8 の1回目: 最初のダンジョンを出た後の世界マップ（P1 の手番の始め・(1＋種で 0〜2) 回目）
  else if (st.s8 === 0 && board.cov?.rows?.some((r) => r.group === 'keydungeon' && r.stepped) && p1.mode === 'world' && p2.mode === 'world' && findMark(p1, 'data-roll-move')?.enabled) {
    sh.n.worldAfterFirst++;
    if (sh.n.worldAfterFirst >= 1 + offsetOf(sh.seed, 'S8a', 3)) due = { id: 'S8', seat: 'P1', why: '最初の鍵のダンジョンの後の世界マップ（P1 の手番の始め）' };
  }
  // S8 の2回目: 戦闘の味方の番（(6＋種で 0〜2) 戦目より後・2ターン目より後）
  else if (st.s8 === 1 && p1.mode === 'battle' && p2.mode === 'battle' && (board.stats?.battles ?? []).length >= 6 + offsetOf(sh.seed, 'S8b', 3) && ['ready', 'end'].includes((p1.facts.bEndTurn ?? [])[0]?.['data-end-turn']) && (board.battle?.P1?.turn ?? 0) >= 2) due = { id: 'S8', seat: 'P1', why: `${(board.stats?.battles ?? []).length + 1} 戦目の味方の番` };
  if (!due) return;
  const dev = fleet.devices.find((d) => d.seat === due.seat);
  const v = views.find((x) => x.seat === due.seat);
  if (due.id === 'S7') st.s7++;
  else st.s8++;
  begin(sh, due.id, { step: 'return', seat: due.seat, before: v.mode, t0: Date.now(), atIso: new Date().toISOString(), tag: due.why });
  judge.record({ seat: due.seat, where: `${v.screen}/${v.mode ?? '-'}`, what: `揺さぶり ${due.id}: ページを読み込み直す（${due.why}）`, target: 'reload', result: 'reload' });
  await dev.reload();
}

// ---------------------------------------------------------------- S13（同時押し）
/** 決めの種類（同時押しの対象） */
export function simKind(d) {
  const c = d?.target?.css ?? '';
  if (/^\[data-door-choice=/.test(c)) return 'door';
  if (/^\[data-event-option=/.test(c)) return 'event';
  if (/^\[data-opener=/.test(c)) return 'opener';
  if (/data-end-turn="ready"/.test(c)) return 'ready';
  if (/data-claim-choice|^\[data-claim\] button/.test(c)) return 'claim';
  if (/data-reward-finish/.test(c)) return 'reward';
  return null;
}

/**
 * S13: 2台以上が同じ種類の票を同じステップで押そうとしている時、周期で選んで「同時に押す」組を返す（無ければ null）
 */
export function pickSimultaneous(wants, views, board) {
  const sh = board.sh;
  if (!sh || sh.m) return null;
  const by = {};
  for (const w of wants) {
    if (w.d.prio) return null;
    const k = simKind(w.d);
    if (!k) continue;
    (by[k] ??= []).push(w);
  }
  for (const [k, ws] of Object.entries(by)) {
    if (ws.length < 2) continue;
    const key = `${ws.map((w) => views[w.i].sig).join(',')}`;
    if (!opportunity(sh, 'S13', key, k)) continue;
    // 区切り 4: 4人の時は2台ずつ（計画 §5-2・直し3）。どの2台かは、その種類の S13 が起きた回数で順に回す（同じ種なら同じ）
    const t13 = (sh.s13[k] ??= { count: 0, ok: 0, ng: 0, pairs: [] });
    if (ws.length > 2) {
      const a = t13.count % ws.length;
      ws.splice(0, ws.length, ...[ws[a], ws[(a + 1) % ws.length]].sort((x, y) => x.i - y.i));
    }
    t13.count++;
    t13.pairs.push(ws.map((w) => views[w.i].seat).join('+'));
    sh.k.S13.count++;
    sh.order.push(`S13(${k})`);
    note(sh, `揺さぶり S13 を始める（${k}・${ws.map((w) => `${views[w.i].seat}「${w.d.what}」`).join(' と ')}を同時に押す）`);
    sh.watch.push({ id: 'S13', kind: 'agree', key: agreeKey(views.find((v) => v.seat === 'P1') ?? views[0]), ticks: 0, what: `S13（${k}）` });
    // 押した後の確かめ（shakeAfterTick）: 同時に押した人が、すぐ後にもう1度同じ物を押していないか（自分の票が入っていなかった形）
    sh.simCheck = { kind: k, presses: ws.map((w) => ({ seat: views[w.i].seat, css: w.d.target.css })), idx: null, toasts: [] };
    return { kind: k, wants: ws };
  }
  return null;
}

// ---------------------------------------------------------------- 報告
export function shakeReport(board) {
  const sh = board.sh;
  if (!sh) return { lines: ['揺さぶり: 板が無い（揺さぶりを入れずに流した）'], rows: [] };
  const lines = ['| 番号 | 何をするか | 機会 | 起きた回数 | 確かめ OK | NG | 中断 |', '|---|---|---|---|---|---|---|'];
  for (const id of SHAKES) {
    const s = sh.k[id];
    lines.push(`| ${id} | ${SHAKE_NAME[id]} | ${s.opp} | ${s.count} | ${s.ok} | ${s.ng} | ${s.abort} |`);
  }
  // 区切り 4: S13 の種類ごと（同時に押した2台の組・OK・NG）
  const k13 = ['door', 'event', 'opener', 'ready', 'claim', 'reward'];
  lines.push('', `S13 の種類ごと: ${k13.map((k) => { const t = sh.s13?.[k]; return `${k} 起きた ${t?.count ?? 0}・OK ${t?.ok ?? 0}・NG ${t?.ng ?? 0}${t?.pairs?.length ? `（組 ${[...new Set(t.pairs)].join('・')}）` : ''}`; }).join('／')}`);
  lines.push('', `起きた順（種 ${sh.seed}）: ${sh.order.join(' → ') || 'なし'}`, '');
  for (const id of SHAKES) {
    const s = sh.k[id];
    if (!s.log.length) continue;
    lines.push(`- ${id}: ${s.log.slice(0, 12).join('／')}${s.log.length > 12 ? `／…ほか ${s.log.length - 12}` : ''}`);
  }
  if (sh.flags.rechoose) lines.push(`- イベントの「選び直す」: ${sh.flags.rechoose.event} で通した`);
  else lines.push('- イベントの「選び直す」: 通せなかった（挑む段が出なかった）');
  if (sh.flags.handover) lines.push(`- イベントの「ほかのキャラに任せる」: ${sh.flags.handover.from} → ${sh.flags.handover.to} で通した`);
  else lines.push('- イベントの「ほかのキャラに任せる」: 通せなかった（挑む段が出なかったか、任せる先がいなかった）');
  return { lines, order: sh.order };
}

/**
 * 網羅の表の「揺さぶり S1〜S13」「実機の不具合の確かめ」の行に、起きた回数と確かめの結果を書く（報告の前に1回）。
 * 踏んだ = 1回以上起きて、確かめに NG が無い。起きたが NG がある行は「確かめ NG」と書く（踏んだにしない）
 */
export function shakeCoverage(board, judge) {
  const sh = board.sh;
  const rows = board.cov?.rows;
  if (!sh || !rows) return;
  const run = board.cov.runNo ?? 1;
  const mark = (id, ok, how, why) => {
    const r = rows.find((x) => x.id === id);
    if (!r || r.stepped) return;
    if (ok) r.stepped = { run, at: new Date().toISOString(), how };
    else if (how) r.ng = how;
    else r.why = why;
  };
  for (const id of SHAKES) {
    const s = sh.k[id];
    const how = `起きた ${s.count} 回・確かめ OK ${s.ok}・NG ${s.ng}${s.abort ? `・中断 ${s.abort}` : ''}`;
    mark(`shake:${id}`, s.count > 0 && s.ng === 0, s.count > 0 ? how : null, `起きなかった（機会 ${s.opp}）`);
  }
  const k = sh.k;
  mark('check:bug1', k.S5.count > 0 && k.S5.ng === 0 && k.S2.ng === 0, k.S5.count > 0 ? `挑む段（S5 ${k.S5.count} 回・S2 ${k.S2.count} 回）・選び直す ${sh.flags.rechoose ? 'あり' : 'なし'}・任せる ${sh.flags.handover ? 'あり' : 'なし'}・NG ${k.S5.ng + k.S2.ng}` : null, '挑む段が出なかった');
  mark('check:bug2', k.S1.count > 0 && k.S1.ng === 0, k.S1.count > 0 ? `P2（390×540）が合意待ちにシートで装備の付け外し・渡す・使う（S1 ${k.S1.count} 回・NG ${k.S1.ng}）。窓の潰れ・かぶさりは審判が毎ステップ測る` : null, 'S1 が起きなかった');
  const offNg = k.S7.log.some((x) => x.startsWith('NG') && x.includes('通信が切れています'));
  mark('check:bug3', k.S7.count > 0 && !offNg, k.S7.count > 0 ? `P2 の読み込み直し ${k.S7.count} 回・待っていた人に「通信が切れています」${offNg ? 'が出た（NG）' : 'は出なかった（10秒より短い時）'}` : null, 'S7 が起きなかった');
  const claimSeen = Object.values(board.rewardSeen ?? {}).some((seen) => seen.includes('claim')) || !!sh.flags.claimSeen;
  const orderNg = [...(board.seenNotes ?? [])].some((x) => String(x).startsWith('order|'));
  mark('check:bug4', claimSeen && !orderNg, claimSeen || orderNg ? `報酬の段の順（成長 → カード → 取り合い）: ${orderNg ? '違う順を見た' : '取り合いの後に成長・カードは出なかった'}` : null, '報酬の取り合いを見なかった');
  const job = rows.find((r) => r.id === 'job:mid')?.stepped;
  const jobFail = judge.failures.some((f) => /job-pick/.test(f.text ?? ''));
  mark('check:bug5', !!job && !jobFail, job ? `転職の専用カード選び: ${job.how}${jobFail ? '・窓の失敗あり' : ''}` : null, '転職しなかった');
  const shrineOk = k.S9.log.some((x) => x.startsWith('OK') && x.includes('祠'));
  const shrineNg = k.S9.log.some((x) => x.startsWith('NG') && x.includes('祠'));
  mark('check:bug6', shrineOk && !shrineNg, shrineOk || shrineNg ? `祠で P2 が遅れて、P1 が先に終わって待つ形（S9）: ${shrineNg ? 'NG' : 'OK'}` : null, '祠の S9 が起きなかった');
}
