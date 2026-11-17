// 画面を読む: 遊んでいる間（場面の種類・上に開いている物・演出中・待ちの印・物語）
// 1-G（印 A組）が入ったら: いちばん外の data-app-root の data-screen・data-mode・data-scene を先に読む（view/index.mjs）。
// ここの表は、その印が無い時の「今ある印」での見分け方。上から順に当てはめる。
export const SCENE = {
  id: 'game',
  // 遊んでいる間の画面: 外の枠（.game-bg）の中に、場面の印がどれか1つある
  detect: { any: ['[data-world-map]', '[data-dungeon-bar]', '[data-dungeon-controls]', '[data-enemy]', '[data-reward-step]', '[data-town-tabs]', '[data-event-window]', '[data-cleared-body]', '[data-shrine-option]', '[data-sanctuary]', '[data-ending]', '[data-gameover]'] },
  sel: {
    // 物語（冒頭・地域の紹介）の「つづける」。印なし・字だけ（1-G で印が付けば差し替え）
    storyNext: { css: 'button', text: 'つづける' },
    storyTap: { css: 'button, [role="button"], div', text: 'タップで続ける' }, // 古い形（今は無い見立て）
  },
  facts: {
    storyButtons: { sel: 'button', text: 'つづける', read: 'count' },
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
  { id: 'confirm', css: '[role="dialog"]', value: 'aria-label' },
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
  '[data-pet-reveal]',
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
