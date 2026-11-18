// 画面を読む: タイトル（場面ごとの印と字の表。印が入ったら、ここだけ差し替える）
// 押す物の書き方: { css, text?, exact? } … css に当たる見えている物のうち、字が text の物（exact: 字が全部同じ。既定 true）
export const SCENE = {
  id: 'title',
  // どの画面か: data-screen（1-G の A1）が無い間は、字で見分ける
  detect: { buttons: ['新しい冒険'], exact: false },
  sel: {
    newGame: { css: 'button', text: '新しい冒険', exact: false }, // 字だけ（印なし）
    joinRoom: { css: 'button', text: '部屋に参加', exact: false }, // 字だけ（印なし）
    backToRoom: { css: '[data-back-to-room]' },
    // 「新しい冒険を始めますか？」の確認（前の冒険が残っている時）
    confirmNew: { css: '[data-confirm] [data-confirm-ok]', text: '上書きして始める' }, // 確認の窓の印（A4）＋字（どの確認の窓かを取り違えない）
  },
  facts: {
    hasBackToRoom: { sel: '[data-back-to-room]', read: 'count' },
  },
};
