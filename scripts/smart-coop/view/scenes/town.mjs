// 画面を読む: 町・祠・神殿と祭壇（区切り 2-Sb。頭は brain/town.mjs）
// 印は B13〜B17（町の id・タブ・店の品と値段・買う・宿・依頼・祠と神殿の id）。字でしか出ていない物（お金・宿の HP）は字で読む。
export const PART = {
  sel: {
    townTab: (id) => ({ css: `[data-town-tab="${id}"]` }),
    questAction: (id, k) => ({ css: `[data-quest="${id}"] [data-quest-action="${k}"]` }),
    shopBuy: (uid) => ({ css: `[data-shop-row="${uid}"] [data-shop-buy]` }),
    townInn: { css: '[data-town-inn]' },
    sellItem: (uid) => ({ css: `[data-sell-item="${uid}"]` }),
    itemPickAction: { css: '[data-item-pick-action]' },
    removeCard: (v) => ({ css: `[data-pick-card="${v}"]` }),
    facilityExit: { css: '[data-facility-exit="go"]' },
    // 町の「聖堂（転職）」・神殿と祭壇の「転職先を見る」。印なし（字だけ）
    townJobs: { css: 'button', text: '聖堂（転職）' },
    sanctuaryJobs: { css: 'button', text: '転職先を見る' },
    shrineOption: (i) => ({ css: `[data-shrine-option="${i}"]` }),
    jobChange: (id) => ({ css: `[data-job-change="${id}"]` }),
    jobPickCard: (i) => ({ css: `[data-job-pick] [data-pick-card="${i}"]` }),
    jobPickAction: { css: '[data-job-pick] [data-card-pick-action]' },
  },
  facts: {
    tTown: { sel: '[data-town-tabs]', read: 'attrs', attrs: ['data-town'] },
    // タブ: 選ばれているタブは金のボタン（class の btn-gold。画面の色で見える事）
    tTabs: { sel: '[data-town-tab]', read: 'attrs', attrs: ['data-town-tab', 'class'] },
    // 「〇〇が町にいます 120G」（お金は字だけ）
    tVisitor: { when: ['town'], sel: 'div.mx-3.mt-1', text: 'が町にいます', exact: false, read: 'texts' },
    tQuests: { sel: '[data-quest]', read: 'rows', attrs: ['data-quest', 'data-quest-state'], textMax: 80, sub: { action: { sel: '[data-quest-action]', read: 'attr', attr: 'data-quest-action' }, off: { sel: '[data-quest-action][disabled]', read: 'count' } } },
    tShop: { sel: '[data-shop-row]', read: 'rows', attrs: ['data-shop-row', 'data-item-id', 'data-price'], textMax: 60, sub: { buyOff: { sel: '[data-shop-buy][disabled]', read: 'count' } } },
    tInn: { sel: '[data-town-inn]', read: 'rows', attrs: ['data-town-inn', 'disabled'], textMax: 20 },
    tInnHp: { when: ['town'], sel: 'span.tabular-nums', text: 'HP ', exact: false, read: 'texts' },
    tSell: { sel: '[data-sell-item]', read: 'rows', attrs: ['data-sell-item', 'aria-label'], textMax: 40 },
    tRemove: { sel: '[data-pick-card^="rm-"]', read: 'rows', attrs: ['data-pick-card', 'aria-label', 'aria-pressed'], textMax: 10 },
    tItemPick: { sel: '[data-item-pick-action]', read: 'rows', attrs: ['disabled'], textMax: 30 },
    tCardPick: { sel: '[data-card-pick-action]', read: 'rows', attrs: ['disabled'], textMax: 40 },
    tExit: { sel: '[data-facility-exit]', read: 'attrs', attrs: ['data-facility-exit'] },
    // 祠（B16）・神殿と祭壇
    sShrine: { sel: '[data-shrine]', read: 'attrs', attrs: ['data-shrine', 'data-sanctuary'], hidden: true },
    sOptions: { sel: '[data-shrine-option]', read: 'rows', attrs: ['data-shrine-option', 'disabled'], textMax: 40 },
    sResult: { sel: '[data-shrine-result]', read: 'text' },
  },
};
