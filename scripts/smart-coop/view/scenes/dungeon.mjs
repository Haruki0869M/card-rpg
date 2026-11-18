// 画面を読む: ダンジョンの部屋（扉・休憩・イベント・漂流物の山・キャラの作業・制覇の画面。区切り 2-Sa。頭は brain/dungeon.mjs）
// シナリオ2・3の部屋（凍え・漂流物の山 など）も、この表に行を足せば頭から読める形にしてある。
// 区切り 2-Sb: B組の印に差し替えた（B6 イベントの選択肢の形・B7 判定の結果・B12 キャラの作業の種類とキャラ）。
export const PART = {
  sel: {
    // 扉（今ある印）
    doorPick: (roomId) => ({ css: `[data-door-choice="${roomId}"]` }),
    // 休憩の3択（今ある印）
    restPick: (kind) => ({ css: `[data-rest="${kind}"]` }),
    // イベントの選択肢（今ある印）・挑む段（今ある印）
    eventOption: (i) => ({ css: `[data-event-option="${i}"]` }),
    challengeGo: { css: '[data-challenge-go]' },
    // 1人で挑む判定の「挑戦する」（場面に自分のキャラだけの時）。印なし（字だけ）→ B6 の data-challenge-go を同じ所に
    eventTry: { css: '[data-event-panel] button', text: '挑戦する' },
    challengeTo: (heroId) => ({ css: `[data-challenge-to="${heroId}"]` }),
    // イベントの結果の後「先へ進む」「戦闘を始める」。印なし（字だけ）
    eventFinish: (word) => ({ css: '[data-event-panel] button', text: word, exact: false }),
    // 漂流物の山（今ある印）
    flotsamPick: (i) => ({ css: `[data-flotsam-pick="${i}"]` }),
    // キャラの作業（カードの強化・外す・捧げる・祭壇・お供・行商人）。カードは今ある印、決めるボタンは今ある印、ほかは字だけ → B12 の data-hero-task の値
    taskCard: (i) => ({ css: `[data-hero-task] [data-pick-card="${i}"]` }),
    taskCardGo: { css: '[data-hero-task] [data-card-pick-action]' },
    taskButton: (word) => ({ css: '[data-hero-task] button', text: word, exact: false }),
    // 制覇の画面: 「抜け道を通る」（今ある印）・「入口へ戻る」「地上に戻る」（字だけ）
    clearedShortcut: { css: '[data-shortcut]' },
    clearedReturn: (word) => ({ css: 'button', text: word, exact: false }),
  },
  facts: {
    // 扉: 予兆・封魔・その先・凍え・自分の票・みんなの票（今ある印）
    dDoors: {
      sel: '[data-door-choice]',
      read: 'rows',
      attrs: ['data-door-choice', 'data-door-omen', 'data-my-vote', 'disabled', 'data-door-sealed', 'aria-label'],
      textMax: 80,
      sub: {
        beyond: { sel: '[data-door-beyond]', read: 'attr', attr: 'data-door-beyond' },
        chill: { sel: '[data-door-chill]', read: 'text' },
        votes: { sel: '[data-vote-seats]', read: 'attr', attr: 'data-vote-seats' },
      },
    },
    dDepth: { sel: '[data-depth]', read: 'text' },
    dChill: { sel: '[data-chill]', read: 'marks', attrs: ['data-chill'] },
    dWait: { sel: '[data-dungeon-wait]', read: 'text' },
    dungeonId: { sel: '[data-dungeon]', read: 'marks', attrs: ['data-dungeon'] },
    // パーティの帯（扉の画面・イベントの画面の下の帯 data-dungeon-bar）: 顔のボタンの aria-label「名前 HP12/30」（戦闘の外の HP は B 組にも無い。字で読む）
    dParty: { sel: '[data-dungeon-bar] button[aria-label*="HP"]', read: 'rows', attrs: ['aria-label'], textMax: 10 },
    // 休憩: 3択（今ある印）と、キャラの行の字「HP 12/30 → 21」
    dRest: { sel: '[data-rest]', read: 'rows', attrs: ['data-rest', 'data-rest-full', 'disabled'], sub: { votes: { sel: '[data-vote-seats]', read: 'attr', attr: 'data-vote-seats' } } },
    dRestHeroes: { sel: 'div.panel.rounded-lg', text: 'HP ', exact: false, read: 'texts' },
    // イベント: 選択肢（今ある印）と成功率（今ある印）・払う（字）・挑む段（今ある印）→ B6 の data-option-kind
    dEvent: { sel: '[data-event-window]', read: 'text' },
    dOptions: {
      sel: '[data-event-option]',
      read: 'rows',
      attrs: ['data-event-option', 'data-my-vote', 'disabled', 'data-option-wait', 'data-option-kind'],
      textMax: 120,
      sub: { chance: { sel: '[data-option-chance]', read: 'attr', attr: 'data-option-chance' }, votes: { sel: '[data-vote-seats]', read: 'attr', attr: 'data-vote-seats' } },
    },
    dChallenge: { sel: '[data-challenge]', read: 'rows', attrs: ['data-challenge-hero', 'data-challenge-mine'], textMax: 300 },
    dChallengeTo: { sel: '[data-challenge-to]', read: 'rows', attrs: ['data-challenge-to'] },
    dEventPanelButtons: { sel: '[data-event-panel] button', read: 'rows', attrs: ['disabled'], textMax: 30, sub: { votes: { sel: '[data-vote-seats]', read: 'attr', attr: 'data-vote-seats' } } },
    // 漂流物の山（今ある印）
    dFlotsam: { sel: '[data-flotsam-option]', read: 'rows', attrs: ['data-flotsam-option'], sub: { gold: { sel: '[data-flotsam-gold]', read: 'count' }, pick: { sel: '[data-flotsam-pick]', read: 'attr', attr: 'data-flotsam-pick' } } },
    dFlotsamFull: { sel: '[data-flotsam-full]', read: 'count' },
    // キャラの作業の窓（字の題 → B12 の値）・カード・お供
    dTask: { sel: '[data-hero-task]', read: 'rows', attrs: ['data-hero-task', 'data-task-hero'], textMax: 60, sub: { title: { sel: '.font-display', read: 'text' } } },
    dCheckResult: { sel: '[data-check-result]', read: 'attrs', attrs: ['data-check-result', 'data-check-focus'] },
    dTaskCards: { sel: '[data-hero-task] [data-pick-card]', read: 'rows', attrs: ['data-pick-card', 'aria-label', 'aria-pressed'], textMax: 20 },
    dTaskPanel: { sel: '[data-hero-task] [data-card-pick-panel]', read: 'marks', attrs: ['data-card-pick-panel'] },
    dPetRevealed: { sel: '[data-hero-task] [data-pet-revealed]', read: 'count' },
    dTaskButtons: { sel: '[data-hero-task] button', read: 'rows', attrs: ['disabled'], textMax: 20 },
    // 制覇の画面（今ある印）と、下のボタン（字）・票
    dCleared: { sel: '[data-cleared-body]', read: 'count' },
    dClearedButtons: { sel: '[data-cleared-body] ~ div button', read: 'rows', attrs: ['data-shortcut', 'disabled'], textMax: 30, sub: { votes: { sel: '[data-vote-seats]', read: 'attr', attr: 'data-vote-seats' } } },
  },
};
