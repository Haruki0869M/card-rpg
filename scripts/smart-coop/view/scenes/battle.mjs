// 画面を読む: 戦闘（区切り 2-Sa。頭は brain/battle.mjs）
// 区切り 2-Sb: B組（区切り 2-G）の印に差し替えた（B1 味方・B2 敵・B3 予告・B4 手札・B5 フォーカスの窓）。
// 字でも出ている数（HP・フォーカスの残り）は字も読み、印と違えば報告する（直し8。brain/battle.mjs の battleObserve）。
// 決まり: 画面に描かれた物だけ（隠れた予告の数字「？」は読まない・山札の中身は読まない）。
export const PART = {
  sel: {
    // 手札のカード（今ある印。押す点はセンサーが「見えている左の帯」を選ぶ）
    handCard: (i) => ({ css: `[data-card-index="${i}"][data-usable]` }),
    // 狙う敵のチップ（フォーカスの窓の中。今ある印）
    targetChip: (uid) => ({ css: `[data-target-chip="${uid}"]` }),
    // 回復・支援する味方のチップ（今ある印）
    allyChip: (id) => ({ css: `[data-ally-target-chip="${id}"]` }),
    // フォーカスを増やす・減らす。印なし（aria-label だけ）→ B5 の data-focus-spend の窓の中のボタンに差し替える
    focusPlus: { css: '[data-focus-panel] button[aria-label="フォーカスを増やす"]' },
    focusMinus: { css: '[data-focus-panel] button[aria-label="フォーカスを減らす"]' },
    // 「発動」（B5 の data-card-go）
    battleGo: { css: '[data-card-go]' },
    // 選んだカードをやめる（×）。印なし（aria-label だけ）
    battleCancel: { css: '[data-focus-panel] button[aria-label="キャンセル"]' },
    // 確認の窓の「やめる」（A4 の印）
    confirmCancel: { css: '[data-confirm] [data-confirm-cancel]' },
    // 最初の戦闘の案内を閉じる（今ある印）
    firstGuideClose: { css: '[data-first-guide-close]' },
    // 道具袋（戦闘の下の段）。印なし（aria-label だけ）
    battlePouch: { css: 'button[aria-label="道具袋"]' },
    pouchItem: (id) => ({ css: `[data-sheet="pouch"] [data-pouch-item="${id}"]` }),
    useTo: (id) => ({ css: `[data-use-to="${id}"]` }),
  },
  facts: {
    // 敵ごと: HP（字「12/30」→ B2 の data-max-hp）・名前と Lv（字）・弱点と耐性（▲▼ の札の title「火に弱い」→ B2/B4 で印に）・
    // 予告（今ある印 data-intent-*。数字は字 → B3 の data-intent-damage）・数え読み・BREAK の手がかり・連携の段・狙われている味方
    bEnemies: {
      sel: '[data-enemy]',
      read: 'rows',
      // B2: 最大 HP・守り・戦闘の格（字の「12/30」も読んで照らす）
      attrs: ['data-enemy', 'data-dead', 'data-hp', 'data-max-hp', 'data-block', 'data-rank'],
      sub: {
        info: { sel: '[data-enemy-info] > div', read: 'text' },
        marks: { sel: '[data-elements] > span', read: 'attrs', attr: 'title' },
        intent: { sel: '[data-intent]', read: 'text' },
        big: { sel: '[data-intent][data-intent-big]', read: 'count' },
        broken: { sel: '[data-intent][data-intent-broken]', read: 'count' },
        behavior: { sel: '[data-intent][data-intent-behavior]', read: 'attr', attr: 'data-intent-behavior' },
        frenzy: { sel: '[data-intent][data-intent-frenzy]', read: 'count' },
        // 攻撃の数字（赤い字の中の数。「？」は読まない）。B3 の data-intent-damage（合計。隠れていれば ?）を先に使う
        atk: { sel: '[data-intent] span.text-red-300 > span.tabular-nums', read: 'texts' },
        intentKind: { sel: '[data-intent][data-intent-kind]', read: 'attr', attr: 'data-intent-kind' },
        intentDamage: { sel: '[data-intent][data-intent-damage]', read: 'attr', attr: 'data-intent-damage' },
        targets: { sel: '[data-intent-target]', read: 'attrs', attr: 'data-intent-target' },
        countdown: { sel: '[data-countdown]', read: 'attr', attr: 'data-countdown' },
        breakRule: { sel: '[data-break-hint]', read: 'attr', attr: 'data-break-rule' },
        breakText: { sel: '[data-break-hint]', read: 'text' },
        brief: { sel: '[data-behavior-brief]', read: 'text' },
        combo: { sel: '[data-combo-stage]', read: 'attr', attr: 'data-combo-stage' },
        aims: { sel: '[data-aims]', read: 'attr', attr: 'data-aims' },
        hpText: { sel: '[data-enemy-info]', read: 'text' },
      },
    },
    // 味方ごと: HP（字「12/30」→ B1 の data-hp・data-max-hp）・マナ（aria-label「マナ」の字 → B1 の data-mana）・
    // 被弾の予告（今ある印 data-incoming）・この端末のキャラか（字「N枚」「済」→ B1 の data-seat）
    bAllies: {
      sel: '[data-ally]',
      read: 'rows',
      // B1: 席・HP・最大 HP・守り・マナ・フォーカス・被弾の予告（字も読んで照らす）
      attrs: ['data-ally', 'data-dead', 'data-done', 'data-selected-target', 'data-seat', 'data-hp', 'data-max-hp', 'data-block', 'data-mana', 'data-focus', 'data-incoming'],
      sub: {
        incoming: { sel: '[data-incoming]', read: 'attr', attr: 'data-incoming' },
        name: { sel: 'span.truncate', read: 'text' },
        // 「N枚」「済」（自分のキャラの札だけに出る。行の一番右）→ B1 の data-seat。行の字の最後は状態の印の字になる事があるので、この字だけを読む
        count: { sel: 'div.tabular-nums > span:last-child', read: 'text' },
        mana: { sel: '[aria-label="マナ"]', read: 'text' },
        // フォーカス（★の後ろの数）→ B1 の data-focus
        focus: { sel: 'span.text-amber-300', read: 'text' },
      },
    },
    // 手札（今ある印。コスト・属性・種類は説明書き content で引く → B4 の data-cost・data-element・data-category）
    // B4: 今のコスト・属性・種類・狙う相手・選択中
    bHand: { sel: '[data-card-index]', read: 'rows', attrs: ['data-card-index', 'data-card-id', 'data-usable', 'data-cost', 'data-element', 'data-category', 'data-target', 'data-selected'], textMax: 40 },
    // フォーカスの窓: 字（成功率・残りフォーカス・「発動」の下の字）→ B5 の data-focus-spend・data-focus-max
    bPanel: { sel: '[data-focus-panel]', read: 'text' },
    bGoText: { sel: '[data-card-go]', read: 'text' },
    // B5: 今の指定（★の数）・指定できる最大（字「残りフォーカス X / Y」と照らす）
    bPanelMark: { sel: '[data-focus-panel]', read: 'attrs', attrs: ['data-focus-spend', 'data-focus-max'] },
    bTiers: { sel: '[data-tier-label]', read: 'rows', attrs: ['data-tier-label', 'data-tier-values'] },
    bChips: { sel: '[data-target-chip]', read: 'rows', attrs: ['data-target-chip', 'data-chip-selected', 'data-chip-prediction', 'data-kill-badge', 'data-break-chip', 'data-miss-chip', 'data-weak-chip', 'data-resist-chip'] },
    bAllyChips: { sel: '[data-ally-target-chip]', read: 'rows', attrs: ['data-ally-target-chip', 'data-chip-selected'] },
    bHints: { sel: '[data-counter-hint]', read: 'rows', attrs: ['data-counter-hint'] },
    bPlus: { sel: '[data-focus-panel] button[aria-label="フォーカスを増やす"]', read: 'enabled' },
    bEndTurn: { sel: '[data-end-turn]', read: 'marks', attrs: ['data-end-turn'] },
    bFirstGuide: { sel: '[data-first-guide-close]', read: 'count' },
    // 道具袋のシート（戦闘中）: 品と、使う相手
    bPouchItems: { sel: '[data-sheet="pouch"] [data-pouch-item]', read: 'rows', attrs: ['data-pouch-item'] },
    bUseTo: { sel: '[data-use-to]', read: 'rows', attrs: ['data-use-to', 'disabled'] },
    bResult: { sel: '[data-result-button]', read: 'marks', attrs: ['data-result'] },
  },
};
