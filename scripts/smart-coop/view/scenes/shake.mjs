// 画面を読む: 揺さぶり（区切り 3-S。頭は shake.mjs）。
// 揺さぶりで押す物（シートの中の装備の付け外し・渡す・使う・ダンジョンの地図の「こっち！」・店の「ほしい！」・状態の一覧・予告の長押し・部屋に戻る）と、
// 確かめに読む物（シートの中の持ち物・HP とフォーカスの字・ピンの札・待ちの字）。読むのは画面に描かれた物と見えない印だけ。
export const PART = {
  sel: {
    // ダンジョン・イベントの下の帯の「装備」「道具」（今ある印）
    barButton: (label) => ({ css: `[data-bar-button="${label}"]` }),
    // メニューのボタン（世界マップ・ダンジョン・戦闘の左上。印なし・aria-label だけ）と、メニューのシートの行（字だけ）
    anyMenu: { css: 'button[aria-label="メニュー"]' },
    // パーティ・装備のシート: 欄の「付け替え」（aria-label だけ）・外す（B18）・候補の「装備」（B18）
    slotOpen: (word) => ({ css: `[data-sheet="party"] button[aria-label="${word}を付け替える"]` }),
    slotUnequip: (slot) => ({ css: `[data-sheet="party"] [data-slot-unequip="${slot}"]` }),
    rowEquip: (id) => ({ css: `[data-sheet="party"] [data-row-equip="${id}"]` }),
    // 持ち物の行の「使う」「渡す」（今ある印）と、渡す相手・使う相手（今ある印）
    itemGive: (id) => ({ css: `[data-sheet="party"] [data-item-row="${id}"][data-item-kind="pouch"] [data-row-give]` }),
    itemUse: (id) => ({ css: `[data-sheet="party"] [data-item-row="${id}"][data-item-kind="pouch"] [data-row-use]` }),
    shGiveTo: (heroId) => ({ css: `[data-sheet="party"] [data-give-to="${heroId}"]` }),
    shUseTo: (heroId) => ({ css: `[data-sheet="party"] [data-use-to="${heroId}"]` }),
    // 挑む段: 選び直す・任せる（今ある印）
    challengeRechoose: { css: '[data-challenge-rechoose]' },
    challengeHandover: (heroId) => ({ css: `[data-challenge-to="${heroId}"]` }),
    // ダンジョンの地図（右上の小さな地図 → 大きな地図の扉のマス → 「こっち！」→ 閉じる）
    minimap: { css: '[data-minimap]' },
    mapCell: (k) => ({ css: `[data-map-overlay] [data-cell="${k}"]` }),
    pinSend: { css: '[data-pin-send]' },
    mapClose: { css: '[data-map-overlay] button[aria-label="地図を閉じる"]' },
    // 同行の誘いの「行かない」（字だけ。オンラインの帯の中）・移動の提案の「同行をやめる」（A12）
    inviteNo: { css: '[data-online-overlay] button', text: '行かない' },
    moveAgreeNo: { css: '[data-move-agree="no"]' },
    // 店の「ほしい！」（B14 の行の中・今ある印）
    shopWant: (uid) => ({ css: `[data-shop-row="${uid}"] [data-shop-want]` }),
    // 状態の一覧の「＋N」（今ある印）・閉じる（今ある印）・予告（今ある印。長押しで説明）・説明の窓の「詳細を閉じる」（字だけ）
    statusMore: { css: '[data-status-more]' },
    statusListClose: { css: '[data-status-list-close]' },
    shIntent: (uid) => ({ css: `[data-intent="${uid}"]` }),
    detailClose: { css: '[data-detail-popup] button', text: '詳細を閉じる' },
    // タイトルの「前の部屋に戻る」（今ある印）・部屋に参加の画面の「戻る」（aria-label だけ）
    backToRoom: { css: '[data-back-to-room]' },
    topBack: { css: 'button[aria-label="戻る"]' },
    // 祭壇の2つの使い方（今ある印）・行商人の「〇G」（字だけ）
    altarMode: (m) => ({ css: `[data-hero-task] [data-altar-mode="${m}"]` }),
    peddlerBuy: (word) => ({ css: '[data-hero-task="peddler"] .panel button.btn-gold', text: word }),
  },
  facts: {
    // パーティ・装備のシート: 今見ているキャラ（金の縁 sel-on）・持ち物の行・HP とフォーカスの字
    pHeroTabs: { sel: '[data-sheet="party"] [data-sheet-hero]', read: 'attrs', attrs: ['data-sheet-hero', 'class'] },
    pItems: { sel: '[data-sheet="party"] [data-item-row]', read: 'rows', attrs: ['data-item-row', 'data-item-kind', 'data-open'], textMax: 40, sub: { use: { sel: '[data-row-use]', read: 'count' }, give: { sel: '[data-row-give]', read: 'count' } } },
    pHpText: { sel: '[data-sheet="party"] .tabular-nums', text: 'フォーカス', exact: false, read: 'text' },
    pGiveTo: { sel: '[data-sheet="party"] [data-give-to]', read: 'attrs', attrs: ['data-give-to'] },
    pUseTo: { sel: '[data-sheet="party"] [data-use-to]', read: 'rows', attrs: ['data-use-to', 'disabled'], textMax: 40 },
    pGiveReason: { sel: '[data-sheet="party"] [data-give-reason], [data-sheet="party"] [data-use-reason]', read: 'texts' },
    // ピン: 札（だれの・何の）・上の帯・地図のマスの印・地図の窓
    pinChips: { sel: '[data-pin-chips]', read: 'texts' },
    pinBanner: { sel: '[data-pin-banner]', read: 'texts' },
    cellPins: { sel: '[data-cell-pin]', read: 'count' },
    mapOverlay: { sel: '[data-map-overlay]', read: 'count' },
    mapDoors: { sel: '[data-map-overlay] [data-cell][data-door="open"]', read: 'attrs', attrs: ['data-cell', 'data-room'] },
    // 大きな地図の押せるマス（aria-label = 部屋の種類・扉・通路）
    mapCells: { sel: '[data-map-overlay] [data-cell]', read: 'attrs', attrs: ['data-cell', 'aria-label', 'data-room'] },
    pinPanel: { sel: '[data-pin-panel]', read: 'count' },
    // 待ちの字（だれを待っているか）・通信の知らせ
    waitNotes: { sel: '[data-wait-notes]', read: 'texts' },
    onlineNotes: { sel: '[data-online-overlay]', read: 'texts' },
    // 祭壇の使い方（aria-pressed = 選んでいる方）・行商人の所持金の字
    altarModes: { sel: '[data-hero-task] [data-altar-mode]', read: 'attrs', attrs: ['data-altar-mode', 'aria-pressed'] },
    peddlerGold: { sel: '[data-hero-task="peddler"] div', text: '所持金', exact: false, read: 'text' },
    peddlerItems: { sel: '[data-hero-task="peddler"] .panel', read: 'rows', attrs: [], textMax: 80, sub: { price: { sel: 'button.btn-gold', read: 'text' }, off: { sel: 'button.btn-gold[disabled]', read: 'count' }, name: { sel: 'span.font-bold', read: 'text' } } },
    // 状態の一覧・説明の窓
    statusMoreN: { sel: '[data-status-more]', read: 'count' },
    // 短いお知らせ（A3。渡した時の「〜から受け取りました」など）
    toasts: { sel: '[data-toast]', read: 'texts' },
  },
};
