// 画面を読む: 世界マップ（行き先・道探し・遭遇・転職の印）（区切り 2-Sb。頭は brain/world.mjs）
// 読むのは画面に描かれた物と、見えない印（A6〜A12・A7 のマスの地形）だけ。霧のマスには地形の印が無い（霧の中は読まない）。
export const PART = {
  sel: {
    // 世界マップの左上の「メニュー」（印なし・aria-label だけ）→ メニューのシートの「転職」（字だけ）
    worldMenu: { css: 'button[aria-label="メニュー"]' },
    menuRow: (word) => ({ css: '[data-sheet="menu"] button', text: word }),
    // 野営・助け起こす（今ある印）
    camp: { css: '[data-camp]' },
    revive: (id) => ({ css: `[data-revive="${id}"]` }),
    // 遭遇（A13）: 奇襲・逃げる（印）→ 判定の窓の「奇襲を狙う」「逃げる」（字だけ。下の段の金のボタン）→ 結果の「戦闘開始」「世界マップへ」（字だけ）
    encounterChoice: (k) => ({ css: `[data-encounter-choice="${k}"]` }),
    encounterJoin: (id) => ({ css: `[data-encounter-join="${id}"]` }),
    encounterGo: (word) => ({ css: 'button.btn-gold', text: word }),
    checkPlusAny: { css: 'button[aria-label="フォーカスを増やす"]' },
    // ステータス（自分のキャラのパーティ・装備のシート）。今ある印
    statusButton: { css: '[data-status-button]' },
  },
  facts: {
    // 地図の大きさ（A6）
    wMap: { sel: '[data-world-map]', read: 'attrs', attrs: ['data-cols', 'data-rows'] },
    // 見えているマス（A7）: 霧のマスには地形の印が無い。透明な層なので「見えているか」の検査はしない（hidden）
    wHexes: { when: ['world'], sel: '[data-hex]', read: 'attrs', attrs: ['data-hex', 'data-terrain', 'data-road', 'data-tide'], hidden: true },
    // 場所（A8）: 町・ダンジョン・祠・宝箱・イベント・名所・塔・神殿・祭壇。使った物は data-used
    wFeatures: { when: ['world'], sel: '[data-feature][data-tile]', read: 'attrs', attrs: ['data-feature', 'data-tile', 'data-used'], hidden: true },
    // 出現スポット（A8）・徘徊する敵（A9）・道しるべ
    wSpawns: { when: ['world'], sel: '[data-spawn]', read: 'attrs', attrs: ['data-spawn', 'data-tile', 'data-spawn-left'], hidden: true },
    wWanderers: { when: ['world'], sel: '[data-wanderer]', read: 'attrs', attrs: ['data-wanderer', 'data-tile'], hidden: true },
    // 上の帯（A11）: 侵食度・時間・潮
    wCorruption: { sel: '[data-corruption]', read: 'attrs', attrs: ['data-corruption'], hidden: true },
    wTime: { sel: '[data-time]', read: 'attrs', attrs: ['data-time'], hidden: true },
    wTide: { sel: '[data-tide-icon]', read: 'attrs', attrs: ['data-tide-icon'], hidden: true },
    // 仲間の列: 顔のボタン（aria-label「名前 HP12/30」）と「転職できます」の印（aria-label）
    wParty: { when: ['world'], sel: '[data-party-row] > button', read: 'rows', attrs: ['aria-label'], textMax: 10, sub: { canJob: { sel: '[aria-label="転職できます"]', read: 'count', hidden: true } } },
    wStatus: { sel: '[data-status-button]', read: 'attrs', attrs: ['aria-label'] },
    // ステータスのシート: 装備の欄（B18。値 = 欄の名前。中の品は字）・候補の「装備」（値 = 品の id）・開いている欄
    pSlots: { sel: '[data-sheet="party"] [data-equip-slot]', read: 'rows', attrs: ['data-equip-slot'], textMax: 60 },
    pEquip: { sel: '[data-sheet="party"] [data-row-equip]', read: 'rows', attrs: ['data-row-equip', 'disabled'], textMax: 10 },
    pExpanded: { sel: '[data-sheet="party"] button[aria-expanded="true"]', read: 'count' },
    wRevive: { sel: '[data-revive]', read: 'attrs', attrs: ['data-revive'] },
    // 遭遇（A13）
    eKind: { sel: '[data-encounter]', read: 'attrs', attrs: ['data-encounter'] },
    eScourge: { sel: '[data-encounter-scourge]', read: 'attrs', attrs: ['data-encounter-scourge'] },
    eJoin: { when: ['encounter'], sel: '[data-encounter-join]', read: 'rows', attrs: ['data-encounter-join', 'disabled'], textMax: 40 },
    eChoice: { sel: '[data-encounter-choice]', read: 'attrs', attrs: ['data-encounter-choice', 'disabled'] },
    eButtons: { when: ['encounter'], sel: 'button.btn-gold', read: 'rows', attrs: ['disabled'], textMax: 20 },
    // 判定の窓（CheckPanel。宝箱・イベント・遭遇で同じ部品）: B6 の印（今の指定のフォーカスと成功率）
    checkMark: { sel: '[data-challenge-focus]', read: 'attrs', attrs: ['data-challenge-focus', 'data-challenge-chance'] },
    // 転職の印: 転職先の札（B17）・専用カード選び
    jOptions: { sel: '[data-job-option]', read: 'rows', attrs: ['data-job-option', 'data-job-state'], textMax: 200, sub: { change: { sel: '[data-job-change]', read: 'attr', attr: 'data-job-change' } } },
    jPickTitle: { sel: '[data-job-pick] .font-display', read: 'text' },
    jPickCards: { sel: '[data-job-pick] [data-pick-card]', read: 'rows', attrs: ['data-pick-card', 'aria-label', 'aria-pressed'], textMax: 20 },
    jPickPanel: { sel: '[data-job-pick] [data-card-pick-panel]', read: 'attrs', attrs: ['data-card-pick-panel'] },
    jSheetEmpty: { sel: '[data-sheet="jobs"]', text: '転職できるキャラはいません', exact: false, read: 'count' },
    // イベントの id（B6。題の字は同じ題が別のイベントにある事があるので id で。網羅の表）
    eventId: { sel: '[data-event-window]', read: 'attrs', attrs: ['data-event-window'] },
    // ゲームオーバー・エンディング
    gameover: { sel: '[data-gameover]', read: 'attrs', attrs: ['data-gameover'], hidden: true },
    ending: { sel: '[data-ending]', read: 'attrs', attrs: ['data-ending'], hidden: true },
    // 結果の画面: 負けの後の行き先（退却・倒れた・ゲームオーバー）
    defeat: { sel: '[data-defeat-retreat], [data-defeat-downed], [data-defeat-gameover]', read: 'text' },
  },
};
