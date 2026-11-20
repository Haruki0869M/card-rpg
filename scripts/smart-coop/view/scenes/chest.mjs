// 画面を読む: 宝箱（だれが開ける？ → 持ち主がフォーカスを決めて開ける → 中身の取り合い → 先へ）。封魔の宝箱も同じ画面（区切り 2-Sa。頭は brain/dungeon.mjs）
// 区切り 2-Sb: B組の印に差し替えた（B9 おすすめ・成功率・立ち去る・中身／B6 判定の窓の指定と成功率）。字の成功率も読み、印と違えば報告する（直し8）。
export const PART = {
  sel: {
    // 「〇〇に任せる」。印なし（行の印 data-opener の中のボタン）→ B9 の data-opener-best・data-opener-chance は読む方
    openerPick: (heroId) => ({ css: `[data-opener="${heroId}"] button` }),
    // 開ける（今ある印。値 = lock・luck・sealed・guard）
    chestOpen: { css: '[data-chest-open]' },
    // 判定の窓のフォーカス（宝箱・イベントの挑む段で同じ部品）。印なし（aria-label だけ）→ B6 の data-challenge-focus
    checkPlus: { css: 'button[aria-label="フォーカスを増やす"]' },
    // 「先へ進む」「ダンジョン制覇！」（done）・「立ち去る」（leave）。B9 の data-chest-leave
    chestLeave: (word) => ({ css: 'button', text: word, exact: false }),
    chestLeaveMark: (k) => ({ css: `[data-chest-leave="${k}"]` }),
    // 演出を飛ばす。印なし（字だけ）
    chestSkip: { css: 'button', text: 'タップで結果まで飛ばす', exact: false },
    // 黄金箱の秘宝の3択（今ある印 data-relic-option）→ 説明の窓の「これを選ぶ」（今ある印 data-item-pick-action）
    relicOption: (i) => ({ css: `[data-relic-option="${i}"]` }),
    relicPick: { css: '[data-relic-picker] [data-item-pick-action]' },
  },
  facts: {
    // 開け役の候補: 字（「おすすめ」・「鍵が開く 45%（フォーカス2で70%）」・「器用5・運3・フォーカス2」）と票（今ある印）→ B9
    openers: {
      sel: '[data-opener]',
      read: 'rows',
      attrs: ['data-opener', 'data-opener-best', 'data-opener-chance'],
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
    // B6: 判定の窓の今の指定と成功率（字「成功率 70%（フォーカス 2 → 1）」と照らす）
    checkMarks: { sel: '[data-challenge-focus]', read: 'attrs', attrs: ['data-challenge-focus', 'data-challenge-chance'] },
    chestLeaveMarks: { sel: '[data-chest-leave]', read: 'rows', attrs: ['data-chest-leave', 'disabled'], textMax: 30 },
    lootItems: { sel: '[data-loot-item]', read: 'attrs', attrs: ['data-loot-item'] },
    chestButtons: { sel: 'button.btn-gold, button.btn-dark', read: 'rows', attrs: ['disabled'], textMax: 40 },
    claimArea: { sel: '[data-claim-area]', read: 'count' },
    relicOpts: { sel: '[data-relic-option]', read: 'rows', attrs: ['data-relic-option', 'data-pick-item'], textMax: 60, sub: { votes: { sel: '[data-vote-seats]', read: 'attr', attr: 'data-vote-seats' }, name: { sel: 'span.truncate', read: 'text' } } },
    relicAction: { sel: '[data-relic-picker] [data-item-pick-action]', read: 'rows', attrs: ['disabled'], textMax: 20 },
    leaveWait: { sel: '[data-leave-wait]', read: 'text' },
    sealResult: { sel: '[data-seal-result]', read: 'marks', attrs: ['data-seal-result'] },
  },
};
