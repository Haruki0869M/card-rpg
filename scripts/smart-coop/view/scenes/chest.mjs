// 画面を読む: 宝箱（だれが開ける？ → 持ち主がフォーカスを決めて開ける → 中身の取り合い → 先へ）。封魔の宝箱も同じ画面（区切り 2-Sa。頭は brain/dungeon.mjs）
// B組の印が入ったら、各行の「→ B?」の印に差し替える。
export const PART = {
  sel: {
    // 「〇〇に任せる」。印なし（行の印 data-opener の中のボタン）→ B9 の data-opener-best・data-opener-chance は読む方
    openerPick: (heroId) => ({ css: `[data-opener="${heroId}"] button` }),
    // 開ける（今ある印。値 = lock・luck・sealed・guard）
    chestOpen: { css: '[data-chest-open]' },
    // 判定の窓のフォーカス（宝箱・イベントの挑む段で同じ部品）。印なし（aria-label だけ）→ B6 の data-challenge-focus
    checkPlus: { css: 'button[aria-label="フォーカスを増やす"]' },
    // 「先へ進む」「ダンジョン制覇！」「立ち去る」。印なし（字だけ）→ B9 の data-chest-leave
    chestLeave: (word) => ({ css: 'button', text: word, exact: false }),
    // 演出を飛ばす。印なし（字だけ）
    chestSkip: { css: 'button', text: 'タップで結果まで飛ばす', exact: false },
  },
  facts: {
    // 開け役の候補: 字（「おすすめ」・「鍵が開く 45%（フォーカス2で70%）」・「器用5・運3・フォーカス2」）と票（今ある印）→ B9
    openers: {
      sel: '[data-opener]',
      read: 'rows',
      attrs: ['data-opener'],
      sub: {
        votes: { sel: '[data-vote-seats]', read: 'attr', attr: 'data-vote-seats' },
        button: { sel: 'button', read: 'text' },
      },
    },
    openerHead: { sel: '[data-opener-picker] > div', read: 'text' },
    openerWait: { sel: '[data-opener-wait]', read: 'text' },
    openerChosen: { sel: '[data-opener-chosen]', read: 'text' },
    chestOpenKind: { sel: '[data-chest-open]', read: 'marks', attrs: ['data-chest-open'] },
    // 判定の窓（宝箱・イベント）: 字「成功率 70%（フォーカス 2 → 1）」。一番内側の物を使う → B6/B9 の data-challenge-chance・data-opener-chance
    checkTexts: { sel: 'div.flex-col', text: '判定：', exact: false, read: 'texts' },
    checkPlusOn: { sel: 'button[aria-label="フォーカスを増やす"]', read: 'enabled' },
    chestButtons: { sel: 'button.btn-gold, button.btn-dark', read: 'rows', attrs: ['disabled'], textMax: 40 },
    claimArea: { sel: '[data-claim-area]', read: 'count' },
    leaveWait: { sel: '[data-leave-wait]', read: 'text' },
    sealResult: { sel: '[data-seal-result]', read: 'marks', attrs: ['data-seal-result'] },
  },
};
