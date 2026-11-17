// 画面を読む: キャラクター作成（オンラインは「このキャラに決める」）
export const SCENE = {
  id: 'create',
  detect: { all: ['[data-class-list]'] },
  sel: {
    // 職業の顔のチップ（字 = ジョブの名前）
    job: (name) => ({ css: '[data-class-list] button', text: name }),
    decide: { css: '[data-depart]' }, // オンライン = 「このキャラに決める」
    // 「このまま出発しますか？」の確認
    confirmDepart: { css: '[role="dialog"] button', text: '出発する' }, // 字だけ（1-G の A4 で差し替え）
  },
  facts: {
    jobs: { sel: '[data-class-list] button', read: 'texts' },
  },
};

/**
 * 回復役のジョブの名前（基本ジョブで回復が得意な物）。【提案・区切り1-S】ゲームのデータ（content.mjs。区切り 2-Sa）が入るまでの仮の表。
 * 今の基本ジョブ: src/content/common/classes の tier 'base'（僧侶 = priest）
 */
export const HEALER_JOB_NAMES = ['僧侶'];
