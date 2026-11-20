// 画面を読む: 戦闘の報酬（成長 → カード → 戦利品の取り合い）と、取り合いの窓（宝箱の中身でも同じ部品。区切り 2-Sa。頭は brain/reward.mjs）
// 区切り 2-Sb: B組の印に差し替えた（B11 成長の選択肢・今選ぶキャラ／B10 取り合いの品・キャラ・選択肢）。
export const PART = {
  sel: {
    // 成長の選択肢。印なし（ボタンの字の先頭 = 「力 +1」など）→ B11 の data-growth-option
    growthOption: (i) => ({ css: `[data-growth-option="${i}"]` }),
    // 成長「カード強化」の後の、強化するカード。印なし（カードの絵の字）→ B11
    growthUpgradeCard: (nth) => ({ css: 'div.flex-wrap.overflow-y-auto > button', nth }),
    // 報酬のカード（今ある印）・説明の窓の「このカードを選ぶ」（今ある印）・「選ばない」（今ある印）
    rewardCard: (i) => ({ css: `[data-reward-scroll] [data-pick-card="${i}"]` }),
    rewardSkip: { css: '[data-reward-skip-card]' },
    // 取り合い: 「欲しい」「余れば」「いらない」。印なし（字だけ）→ B10 の data-claim-choice
    claimChoice: (word) => ({ css: '[data-claim] button', text: word }),
    claimChoiceMark: (idx, k) => ({ css: `[data-claim="${idx}"] [data-claim-choice="${k}"]` }),
    rewardDone: { css: '[data-reward-finish]' },
  },
  facts: {
    // レベルアップの窓が出ているか（字）
    rLevelUp: { sel: '.font-display', text: 'レベルアップ！', exact: false, read: 'count' },
    // 成長の選択肢（字 = 「知力 +1 …」）→ B11 の data-growth-option・data-growth-kind
    rGrowth: { sel: '[data-growth-option]', read: 'rows', attrs: ['data-growth-option', 'data-growth-kind'], textMax: 60 },
    rStepHero: { sel: '[data-reward-scroll]', read: 'attrs', attrs: ['data-reward-step', 'data-reward-hero'] },
    rUpgradeCards: { sel: 'div.flex-wrap.overflow-y-auto > button', read: 'rows', textMax: 60 },
    // 報酬のカード（aria-label = カードの名前。めくり終わる前は押せない）→ B11 の data-reward-hero
    rCards: { sel: '[data-reward-scroll] [data-pick-card]', read: 'rows', attrs: ['data-pick-card', 'aria-label', 'disabled', 'aria-pressed'], textMax: 30 },
    rCardPanel: { sel: '[data-card-pick-panel]', read: 'marks', attrs: ['data-card-pick-panel'] },
    rCardTitle: { sel: '[data-reward-scroll] .font-display', text: 'の山札に1枚加える', exact: false, read: 'text' },
    // 取り合い（報酬・宝箱）: 品の名前（字）・自分の行のボタン・選んだ物（金のボタン）・結果（「獲得！」）→ B10 の data-claim-item・data-claim-hero・data-claim-choice
    claims: {
      sel: '[data-claim]',
      read: 'rows',
      attrs: ['data-claim', 'data-claim-item'],
      textMax: 300,
      sub: {
        item: { sel: 'span.block.font-bold', read: 'text' },
        // 品の id: 品の名前を押すと説明が出るボタンの印（今ある印 data-item-detail）→ B10 の data-claim-item
        itemId: { sel: '[data-item-detail]', read: 'attr', attr: 'data-item-detail' },
        buttons: { sel: 'button', read: 'texts' },
        choices: { sel: '[data-claim-choice]', read: 'attrs', attr: 'data-claim-choice' },
        chosen: { sel: 'button.btn-gold', read: 'text' },
      },
    },
  },
};
