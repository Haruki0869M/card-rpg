// ===== 重なりの順番（下から上）。画面の上に重ねる物の z-index は、ここで決める（実機の不具合② 点検 F10） =====
// 数字が大きいほど手前。新しく重ねる物を足す時は、この表に1行足してから使う。
// 2人で遊ぶ時に「押せない所」を作らないための決まり:
//   - シート（メニュー・パーティ装備・道具袋・ログ・山札・捨て札・転職・依頼）は、待ちの帯・通信の知らせより手前。
//     シートの見出しと×に、ほかの帯がかぶらない（前は通信の知らせ z-70 がシート z-50 の×に乗って押せなかった）
//   - シートの中から開く物（転職のカード選び・伝承の書・遊び方・確認の窓・詳しい説明）は、シートより手前
//   - 自分の通信が切れている事は、シートの見出しにも出す（知らせの帯がシートの後ろに回るため）
export const LAYER = {
  /** 待ちの帯（ほかの人がマスのイベントを選んでいる間の下の覆い。TurnLock） */
  turnLock: 55,
  /** 通信の知らせ（切断・同行の誘い・ホストの引き継ぎ・スタンプ。OnlineOverlay） */
  online: 62,
  /** シート（下から出る画面。BottomSheet） */
  sheet: 64,
  /** シートの上の確認の窓（冒険をやめる確認） */
  sheetConfirm: 66,
  /** 戦闘の「状態の一覧」（状態の印の「＋N」を押すと開く。StatusListPopup。この端末だけの窓。待ちの帯・通信の知らせより手前） */
  statusList: 68,
  /** カード選び（転職のカード選び = JobPickOverlay は LAYER.cardPick を使う・キャラの課題 HeroTaskOverlay は z-70 のまま）・伝承の書 */
  cardPick: 70,
  /** 遊び方・用語集（HelpScreen は z-75 のまま） */
  help: 75,
  /** 短いお知らせ（Toast。押せない） */
  toast: 80,
  /** 技名・手番の演出（AbilityCutins z-150・TurnCutin z-155/160。押せない／すぐ消える） */
  cutin: 150,
  /** 詳しい説明の窓（DetailPopup z-200。長押しでどこからでも開く） */
  detail: 200,
} as const;

/** 重なりの順番の一覧（確認の台本・テスト用。下から順） */
export const LAYER_ORDER = (Object.entries(LAYER) as [keyof typeof LAYER, number][]).sort((a, b) => a[1] - b[1]);

// ===== 戦場の中の重なり（戦場の中だけで比べる。上の LAYER とは別の箱。実機の不具合④(2)） =====
// 「⚡BREAK!」が技名の帯の上に乗って「⚡BREAK!ャンブルボルト」になった。技名の帯を数字より手前にし、
// BREAK の文字は敵の絵の真ん中寄りへ下げて、帯の高さを避ける（Popups.tsx の breakDrop）。
export const BATTLE_LAYER = {
  /** 敵・味方の頭の上の数字（ダメージ・BREAK! など。UnitPopups） */
  unitPopup: 30,
  /** 技名の帯（CalloutBand）。数字より手前。帯は1本だけで、次の技が出たらすぐ置き換わる */
  callout: 32,
  /** 倒れた敵の演出（DeathField） */
  death: 34,
  /** 命中のエフェクト・白いフラッシュ（ImpactField） */
  impact: 35,
} as const;
