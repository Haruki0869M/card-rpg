// 画面を読む: 部屋に参加（招待のリンクで開く・合言葉を手で打つ）
export const SCENE = {
  id: 'join',
  detect: { all: ['input[placeholder="KX7P"]'] },
  sel: {
    codeInput: { css: 'input[placeholder="KX7P"]' },
    nameInput: { css: 'input[placeholder="プレイヤー"]' },
    join: { css: 'button', text: '参加する', exact: false }, // 字だけ
  },
  facts: {
    code: { sel: 'input[placeholder="KX7P"]', read: 'value' },
  },
};
