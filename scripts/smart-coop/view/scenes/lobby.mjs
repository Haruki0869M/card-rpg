// 画面を読む: 待合室（合言葉・キャラの枠・冒険に出発）
export const SCENE = {
  id: 'lobby',
  detect: { all: ['[data-testid="room-code"]'] },
  sel: {
    roomCode: { css: '[data-testid="room-code"]' },
    makeHero: { css: 'button', text: '作る' }, // 字だけ（空いた枠の「作る」）
    start: { css: 'button', text: '冒険に出発', exact: false }, // 字だけ（ホストだけ）
  },
  facts: {
    roomCode: { sel: '[data-testid="room-code"]', read: 'text' },
    emptySlots: { sel: 'button', text: '作る', read: 'count' },
    startButtons: { sel: 'button', text: '冒険に出発', exact: false, read: 'count' },
    startEnabled: { sel: 'button', text: '冒険に出発', exact: false, read: 'enabled' },
  },
};
