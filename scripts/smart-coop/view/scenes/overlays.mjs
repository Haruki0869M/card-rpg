// センサーが使う印の表（どの場面にも出る帯・覆い・窓）。計画 §3-2・§3-3。
// 例外を足す時は、理由を1行書く（何でも例外にして通す、をしない。計画 §3-7）

/** 見た目のかぶさり（押せるが見えない）を測る「帯と覆い」（計画 §3-2 (b)）。押す物の面積の 25% 以上に重なれば失敗 */
export const BANDS = [
  '[data-turn-lock]', // 待ちの帯は例外にしない（実機の不具合②の形）
  '[data-online-overlay] > *',
  '[data-vote-status]',
  '[data-wait-notes]',
  '[data-pin-banner]',
  '[data-tile-info]',
  '[data-toast]', // 1-G の A3 で入る。消えるまで待ってから測り直す
  '[data-callout]',
  '[data-hidden-notice]',
  '[data-challenge-wait]',
  '[data-dungeon-wait]',
  '[data-buy-notice]',
  '[data-region-banner]',
  '[data-dungeon-bar]',
  '[data-world-panel]',
];

/** 短いお知らせ（数秒で消える）。当たったら消えるまで待つ（上限3秒） */
// センサーの直し（2026-11-18・区切り 2-Sb）: 店の「〇〇を買った！」の字だけのお知らせ（data-buy-notice="text"。BuyNotice.tsx。押しても通り抜け、1.8秒で消える）も
//   短いお知らせとして、消えるまで待ってから測り直す。前は続けて2つ買う時の2つ目の「買う」で「見た目のかぶさり」に当たっていた（誤検知）。自己テスト: selftest.mjs「買った時のお知らせ」
//   装備を買った時の窓（data-buy-notice="equip"。閉じるまで残る）は、今までどおり帯として当てる
export const TOASTS = ['[data-toast]', '[data-buy-notice="text"]'];

/** 暗幕そのものを押して閉じる物（理由: 暗幕が押す物なので、上に乗っている事にならない） */
export const BACKDROPS = ['[data-detail-backdrop]', '[data-scourge-backdrop]', '[data-status-list-backdrop]'];

/** 世界マップ（理由: 地図の中の駒・お供・敵・札は地図がタップを受ける。地図の外の物が乗っていたら、失敗ではなく地図を動かす） */
export const WORLD_MAP = '[data-world-map]';

/** 手札のカード（理由: わざと重ねて並べる。見えている左の帯だけを押して、そこだけを検査する。lib.mjs の 43.5px の決まり） */
export const HAND_CARD = '[data-card-index]';
export const MIN_STRIP = 43.5;

/**
 * 窓の潰れを測る窓（計画 §3-3）。scroll = 縦にスクロールする箱（無ければ窓の中の一番大きいスクロールの箱）。
 * required = 要る要素: css・min（数）・inView（画面の中）・pressable（真ん中が押せる）・text（字が空でない）・anyOf（どれか1つ）
 */
export const WINDOWS = [
  // sheet の covered: シートの上に、シートの外の物（押せる物）が乗っていないか（区切り 1-J で足した検査。実機の不具合②の形 =
  //   通信の知らせ・同行の誘いの帯がシートの上に乗り、シートの中身が隠れて押せない）。above = シートの上に出てよい物（シートから開く窓など。理由: シートの中の操作で開く手前の窓）
  { id: 'sheet', css: '[data-sheet]', scroll: '[data-sheet-body]', required: [{ css: '[data-sheet-close]', inView: true, pressable: true, label: '×' }], covered: { above: ['[data-confirm]', '[data-detail-popup]', '[data-detail-backdrop]', '[data-help]', '[data-lorebook]', '[data-card-pick-panel]', '[data-item-pick-panel]', '[data-job-pick]', '[data-hero-task]', '[data-status-list-body]', '[data-smart-induced]'] } },
  { id: 'sheet-party', css: '[data-sheet="party"]', scroll: '[data-sheet-body]', required: [{ css: '[data-equip-slot]', min: 1, label: '装備の欄' }, { css: '[data-party-items]', label: '持ち物の列' }] },
  // 道具袋の「行ごとに使う・渡す」は、行を開いた時だけ出る見立て【未確認】。区切り3（揺さぶり S1）で行を開いてから確かめる
  { id: 'sheet-pouch', css: '[data-sheet="pouch"]', scroll: '[data-sheet-body]', required: [] },
  { id: 'card-pick', css: '[data-card-pick-panel]', required: [{ css: '[data-card-summary]', text: true, label: '説明の文' }, { css: '[data-card-pick-action]', inView: true, label: '「このカードを選ぶ」' }] },
  { id: 'item-pick', css: '[data-item-pick-panel]', required: [] },
  { id: 'detail', css: '[data-detail-popup]', required: [{ self: true, text: true, label: '説明の文' }] },
  // event: 結果の段（選んだ後）は、選択肢が消えて下の段に「先へ進む」「戦闘を始める」（印なし。data-event-panel の中のボタン）だけになる。
  //   センサーの直し（2026-11-18・区切り 1-J）: 前はこの形を「要る物が無い」と当てていた（誤検知）。自己テスト: selftest.mjs「イベントの結果の段」
  { id: 'event', css: '[data-event-panel]', scroll: '[data-event-scroll]', required: [{ css: '[data-event-window]', text: true, label: '本文' }, { anyOf: ['[data-event-option]', '[data-challenge-go]', '[data-challenge-wait]', '[data-event-panel] button'], label: '選択肢か「挑戦する」か待ちの字か結果の後のボタン' }] },
  { id: 'town', css: '[data-town-body]', required: [] },
  { id: 'town-exit', css: '[data-town-tabs]', required: [{ css: '[data-town-tabs] > button', min: 5, label: 'タブ5つ' }, { css: '[data-town-exit]', inView: true, label: '「町を出る」の段' }] },
  { id: 'reward', css: '[data-reward-scroll]', required: [{ css: '[data-reward-bottom]', inView: true, label: '下のボタンの段' }] },
  { id: 'claim', css: '[data-claim-area]', required: [] },
  { id: 'relic-picker', css: '[data-relic-picker]', required: [] },
  // センサーの直し（2026-11-18・区切り 2-Sb）: 「下の案内」（data-job-pick-peek）は、カード選びを下に畳んだ時だけ出る別の形（JobSheet.tsx の peek。
  //   カード選びの窓 data-job-pick と同時には出ない）。前は「要る物」にしていて、転職のたびに当たっていた（誤検知）。自己テスト: selftest.mjs「転職の専用カード選び」
  { id: 'job-pick', css: '[data-job-pick]', required: [{ css: '[data-pick-card]', min: 1, label: 'カード' }] },
  { id: 'hero-task', css: '[data-hero-task]', required: [] },
  { id: 'flotsam', css: '[data-flotsam-options]', required: [] },
  { id: 'status-list', css: '[data-status-list-body]', required: [] },
  { id: 'help', css: '[data-help]', required: [] },
  { id: 'scourge', css: '[data-scourge-dialog]', required: [] },
  { id: 'opener', css: '[data-opener-picker]', required: [] },
];

/** 窓の潰れの数字（計画 §3-3・オーナーの返事4: 150px 未満は、スクロールが要る時だけ失敗） */
export const COLLAPSE = { minScrollable: 150, minAny: 44 };
