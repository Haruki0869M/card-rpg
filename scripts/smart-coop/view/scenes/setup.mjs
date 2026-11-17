// 画面を読む: 冒険の準備（シナリオ・難易度・人数・遊び方・名前・部屋を作る）
export const SCENE = {
  id: 'setup',
  detect: { all: ['[data-scenarios]', '[data-difficulty-text]'] },
  sel: {
    // シナリオのカード（横に並ぶ。n 番目）。今は印が無いので、並びの中の button を数える
    scenarioCard: { css: '[data-scenarios] > button' },
    difficulty: (name) => ({ css: 'button', text: name, exact: false }), // 字だけ（「やさしい」）
    partySize: (n) => ({ css: 'button', text: `${n}人` }), // 字だけ
    online: { css: 'button', text: 'オンライン協力', exact: false }, // 字だけ（下に「各自のスマホで」がある）
    nameInput: { css: 'input[placeholder="プレイヤー"]' },
    createRoom: { css: 'button', text: '部屋を作る', exact: false }, // 字だけ
  },
  facts: {
    scenarios: { sel: '[data-scenarios] > button', read: 'count' },
    nameInputs: { sel: 'input[placeholder="プレイヤー"]', read: 'count' },
  },
};
