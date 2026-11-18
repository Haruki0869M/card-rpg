// 画面を読む: 遊んでいる間（場面の種類・上に開いている物・演出中・待ちの印・物語）
// 1-G（印 A組）: いちばん外の data-app-root の data-screen・data-mode・data-scene を先に読む（view/index.mjs）。
// 下の MODES の表は、その印が無い時（古い版）の見分け方。押す物の表（sel）は、印がある所は印で書く（字だけの所は、そう書く）。
export const SCENE = {
  id: 'game',
  // 遊んでいる間の画面: 外の枠（.game-bg）の中に、場面の印がどれか1つある
  detect: { any: ['[data-world-map]', '[data-dungeon-bar]', '[data-dungeon-controls]', '[data-enemy]', '[data-reward-step]', '[data-town-tabs]', '[data-event-window]', '[data-cleared-body]', '[data-shrine-option]', '[data-sanctuary]', '[data-ending]', '[data-gameover]'] },
  sel: {
    // 物語（冒頭・地域の紹介）の「つづける」。印なし・字だけ（1-G でも印は足していない。字が変わりにくい所）
    storyNext: { css: 'button', text: 'つづける' },
    storyTap: { css: 'button, [role="button"], div', text: 'タップで続ける' }, // 古い形（今は無い見立て）
    // ---- どの場面にも出る物（brain/common.mjs）----
    confirmOk: { css: '[data-confirm] [data-confirm-ok]' }, // 確認の窓（A4）
    sceneTab: (id) => ({ css: `[data-scene-tab="${id}"]` }), // 場面のタブ（A2）
    inviteYes: { css: '[data-online-overlay] button', text: '一緒に行く' }, // 同行の誘いへの返事。印なし（字だけ。オンラインの帯の中）
    moveAgreeYes: { css: '[data-move-agree="yes"]' }, // 移動の提案（A12）
    sheetClose: { css: '[data-sheet] [data-sheet-close]' },
    resultButton: { css: '[data-result-button]' }, // 戦闘の結果（A17）
    // ---- 世界マップ（brain/world.mjs）----
    interact: (kind, id) => ({ css: `[data-interact][data-interact-kind="${kind}"][data-interact-id="${id}"]` }), // 「〜に入る」（A10）
    invite: (heroId) => ({ css: `[data-companion="${heroId}"][data-invite="no"]` }), // 同行に誘う（A12）
    rollMove: { css: '[data-roll-move]' },
    reach: (tile) => ({ css: `[data-reach="${tile}"]` }),
    moveGo: { css: '[data-move-go]' },
    worldWait: { css: '[data-world-wait]' },
    // ---- 遭遇（A13）----
    encounterFight: { css: '[data-encounter-choice="fight"]' },
    // ---- ダンジョン（仮の頭 brain/provisional.mjs）----
    door: (roomId) => ({ css: `[data-door-choice="${roomId}"]` }),
    // ---- 戦闘（仮の頭）----
    card: (i) => ({ css: `[data-card-index="${i}"][data-usable]` }),
    cardGo: { css: '[data-focus-panel] button', text: '発動', exact: false }, // 「発動」。印なし（字だけ。下に「運に任せる」などの小さい字がある）
    enemy: (id) => ({ css: `[data-enemy="${id}"]` }),
    endTurn: (v) => ({ css: `[data-end-turn="${v}"]` }), // ターン終了・準備完了（A16）
    // ---- 報酬（仮の頭）----
    pickCard: (i) => ({ css: `[data-pick-card="${i}"]` }),
    cardPickAction: { css: '[data-card-pick-action]' },
    rewardSkipCard: { css: '[data-reward-skip-card]' },
    rewardFinish: { css: '[data-reward-finish]' },
  },
  facts: {
    storyButtons: { sel: 'button', text: 'つづける', read: 'count' },
    // 世界マップ: 手番のキャラ（駒の data-active）・目的地の輪（霧の中でも出る、画面の印）・行けるマス・次の目的のダンジョン
    activeHero: { sel: '[data-hero][data-active]', read: 'marks', attrs: ['data-hero', 'data-seat', 'data-tile'] },
    heroes: { sel: '[data-hero]', read: 'marks', attrs: ['data-hero', 'data-seat', 'data-tile'] },
    goalMark: { sel: '[data-goal-mark]', read: 'marks', attrs: ['data-goal-mark'] },
    // 「次の目的」の行は、画面の高さで2つのうち片方だけを見せる（中身は同じ）。隠れている方も値は同じなので読む
    goalId: { sel: '[data-goal-line], [data-goal-short]', read: 'marks', attrs: ['data-goal-line', 'data-goal-short'], hidden: true },
    reach: { sel: '[data-reach]', read: 'marks', attrs: ['data-reach', 'data-cost'] },
    selectedTile: { sel: '[data-selected]', read: 'marks', attrs: ['data-selected'] },
    moveProposal: { sel: '[data-move-proposal]', read: 'count' },
    // ダンジョン: 扉
    doors: { sel: '[data-door-choice]', read: 'marks', attrs: ['data-door-choice', 'data-door-omen', 'data-my-vote', 'disabled'] },
    // 戦闘: 手札・敵・味方
    hand: { sel: '[data-card-index]', read: 'marks', attrs: ['data-card-index', 'data-card-id', 'data-usable'] },
    enemies: { sel: '[data-enemy]', read: 'marks', attrs: ['data-enemy', 'data-dead', 'data-hp'] },
    allies: { sel: '[data-ally]', read: 'marks', attrs: ['data-ally', 'data-done', 'data-dead'] },
    focusPanel: { sel: '[data-focus-panel]', read: 'count' },
    focusText: { sel: '[data-focus-panel]', read: 'text' },
    // 待ちの帯（A5）: 値 = 手番の席（ほかの人がマスの場面を選んでいる間）
    turnLock: { sel: '[data-turn-lock]', read: 'marks', attrs: ['data-turn-lock'] },
    // イベントの「先へ進む」の票（A15 の票の印）
    eventVoteSeats: { sel: '[data-event-panel] [data-vote-seats]', read: 'marks', attrs: ['data-vote-seats'] },
    // 報酬
    rewardVoteSeats: { sel: '[data-reward-bottom] [data-vote-seats]', read: 'marks', attrs: ['data-vote-seats'] },
    rewardStep: { sel: '[data-reward-step]', read: 'marks', attrs: ['data-reward-step'] },
    pickCards: { sel: '[data-pick-card]', read: 'marks', attrs: ['data-pick-card'] },
    // 場面のタブ（A2）
    sceneTabs: { sel: '[data-scene-tab]', read: 'marks', attrs: ['data-scene-tab', 'data-scene-need', 'aria-pressed', 'aria-selected'] },
  },
};

/** 場面（mode）の見分け方。data-mode（1-G の A1）が無い時に使う。上から順 */
export const MODES = [
  { id: 'ending', any: ['[data-ending]'] },
  { id: 'gameover', any: ['[data-gameover]'] },
  { id: 'battle', any: ['[data-enemy]'] },
  { id: 'reward', any: ['[data-reward-step]', '[data-reward-scroll]'] },
  { id: 'chest', any: ['[data-opener-picker]', '[data-chest-open]', '[data-claim-area]'] },
  { id: 'event', any: ['[data-event-window]'] },
  { id: 'rest', any: ['[data-rest]'] },
  { id: 'cleared', any: ['[data-cleared-body]'] },
  { id: 'town', any: ['[data-town-tabs]'] },
  { id: 'shrine', any: ['[data-shrine-option]'] },
  { id: 'sanctuary', any: ['[data-sanctuary]'] },
  { id: 'dungeon', any: ['[data-door-omen]', '[data-dungeon-controls]', '[data-dungeon-bar]'] },
  { id: 'world', any: ['[data-world-map]'] },
];

/** 上に開いている物（シート・窓）。value があれば、その属性の値も読む */
export const LAYERS = [
  { id: 'story', buttons: ['つづける'] },
  { id: 'confirm', css: '[data-confirm]', value: 'aria-label' }, // 確認の窓（A4）
  { id: 'sheet', css: '[data-sheet]', value: 'data-sheet' },
  { id: 'card-pick', css: '[data-card-pick-panel]' },
  { id: 'item-pick', css: '[data-item-pick-panel]' },
  { id: 'detail', css: '[data-detail-popup]' },
  { id: 'overview', css: '[data-overview]' },
  { id: 'status-list', css: '[data-status-list-body]' },
  { id: 'help', css: '[data-help]' },
  { id: 'lorebook', css: '[data-lorebook]' },
  { id: 'scourge', css: '[data-scourge-dialog]' },
  { id: 'relic-picker', css: '[data-relic-picker]' },
  { id: 'job-pick', css: '[data-job-pick]' },
];

/** 演出中の印（ある間は押さずに待つ。計画 §3-1 の1）。visible でなくても「ある」なら演出中 */
export const BUSY = [
  '[data-battle-presenting]',
  '[data-world-moving]',
  '[data-move-blocker]',
  '[data-slot-overlay]',
  '[data-dice-overlay]',
  '[data-door-opening]',
  '[data-dungeon-controls="busy"]',
  '[data-turn-cutin]',
  '[data-ability-cutin]',
  '[data-chest-video]',
  // 区切り 3-S の直し: お供の「シルエット → ポン！」は、演出が終わっても印が残る（値が silhouette → shown。PetReveal.tsx）。
  // 前は値を見ずに演出中としていて、お供を迎える窓で bot が何も押さずに止まった（bot の間違い）。演出中はシルエットの間だけ
  '[data-pet-reveal="silhouette"]',
];

/** 待ちの印（字も読む） */
export const WAITS = [
  { id: 'turn-lock', css: '[data-turn-lock]' },
  { id: 'wait-notes', css: '[data-wait-notes]' },
  { id: 'vote-status', css: '[data-vote-status]' },
  { id: 'opener-wait', css: '[data-opener-wait]' },
  { id: 'challenge-wait', css: '[data-challenge-wait]' },
  { id: 'dungeon-wait', css: '[data-dungeon-wait]' },
  { id: 'online', css: '[data-online-overlay] > *' },
];
