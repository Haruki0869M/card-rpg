// 賢いマルチプレイ検証 bot: 頭「どの場面にも出る物」（計画 §4・区切り 1-J）
// 物語の「つづける」・確認の窓・同行の誘いと移動の提案への返事・操作を待っている場面のタブ・うっかり開いたシート・戦闘の結果。
// 決まり: 見るのは View（DOM の字と印）だけ。乱数を使わない。返すのは「押す物」か null（待つ）。
import { SCENES } from '../view/index.mjs';

export const G = SCENES.game.sel;

/** 見えている押せる物のうち、印 name（値 value）を持つ物 */
export function findMark(v, name, value) {
  return v.actions.find((a) => a.marks.some((m) => (value === undefined ? m === name || m.startsWith(`${name}=`) : m === `${name}=${value}`)));
}
/** 見えている押せる物のうち、字が text の物 */
export const findText = (v, text, exact = true) => v.actions.find((a) => (exact ? a.text === text : a.text.includes(text)));
export const hasLayer = (v, id) => v.layers.some((l) => l.id === id);

/** 決め（押す物）の形 */
export const decide = (target, what, o = {}) => ({ target, what, ...o });

/**
 * どの場面でも先に見る物。返す物: 決め か null
 */
export function commonBrain(v) {
  if (v.screen !== 'game') return null;
  // 1. 物語（冒頭・地域の紹介・制覇の後）
  if (hasLayer(v, 'story')) {
    const a = findText(v, 'つづける');
    if (a?.enabled) return decide(G.storyNext, '物語「つづける」');
  }
  // 2. 確認の窓は「はい」（bot は、確認が要る操作を自分で選んだ時だけ窓を出す）
  if (hasLayer(v, 'confirm')) {
    const a = findMark(v, 'data-confirm-ok');
    if (a?.enabled) return decide(G.confirmOk, `確認の窓「${a.text}」`);
    return null;
  }
  // 3. うっかり開いたシートは閉じる（区切り 1-J の頭はシートを開かない。開いていたら閉じて先へ）
  if (hasLayer(v, 'sheet')) {
    const a = findMark(v, 'data-sheet-close');
    if (a?.enabled) return decide(G.sheetClose, 'シートを閉じる（×）');
  }
  // 4. 同行の誘いには「一緒に行く」（計画 §4: 2人目以降は先頭の人に同行する）
  const inv = v.actions.find((a) => a.text === '一緒に行く' && a.enabled && !a.marks.some((m) => m.startsWith('data-move-agree')));
  if (inv) return decide(G.inviteYes, '同行の誘い「一緒に行く」');
  // 5. 移動の提案には「一緒に行く」
  const agree = findMark(v, 'data-move-agree', 'yes');
  if (agree?.enabled) return decide(G.moveAgreeYes, `移動の提案「${agree.text}」`);
  // 6. 操作を待っている場面のタブ（赤い点）があり、今そこを見ていなければ切り替える
  const need = (v.facts.sceneTabs ?? []).find((t) => t['data-scene-need'] !== null && t['data-scene-tab'] !== v.sceneTab);
  if (need) return decide(G.sceneTab(need['data-scene-tab']), `場面のタブ「${need['data-scene-tab']}」（操作を待っている）`);
  // 7. 戦闘の結果（勝ち・逃げた・全滅）
  const res = findMark(v, 'data-result-button');
  if (res?.enabled) return decide(G.resultButton, `結果「${res.text}」`);
  return null;
}
