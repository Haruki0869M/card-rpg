// 賢いマルチプレイ検証 bot: 区切り 1-J の揺さぶり1つだけ（検出の確かめ用。区切り 3-S の shake.mjs で全部に置き換える）
// sheet-wait: 同行の誘いの返事を待たせている間（P1 が誘い、P2 の画面に「一緒に行く」の帯が出ている間）に、
//   P2 がメニュー →「パーティ・装備」のシートを開き、×で閉じてから返事をする（実機の不具合②の形: 帯とシートの重なり）。
//   シートが開いている間は、審判が毎ステップ窓の潰れ（×が押せるか）を測り、×を押す時はセンサーがかぶさりを測る。
// 決まり: 全部画面のボタン。見るのは View だけ。
import { G, findText, hasLayer, decide } from './common.mjs';

export function shakeBrain(v, board, kind) {
  if (kind !== 'sheet-wait' || v.seat !== 'P2' || v.screen !== 'game') return null;
  board.shake ??= { step: 'idle', count: 0 };
  const sh = board.shake;
  if (sh.step === 'done') return null;
  const sheet = v.layers.find((l) => l.id === 'sheet')?.value ?? null;
  if (sh.step === 'idle') {
    // 誘いの帯（「一緒に行く」）が出ていて、シートが閉じている時だけ始める
    if (!findText(v, '一緒に行く') || sheet) return null;
    sh.step = 'menu';
  }
  if (sh.step === 'menu') {
    if (sheet === 'menu') {
      sh.step = 'party';
    } else {
      const m = findText(v, 'メニュー');
      if (m?.enabled) return decide({ css: 'button[aria-label="メニュー"]' }, '揺さぶり: メニューを開く');
      return null;
    }
  }
  if (sh.step === 'party') {
    if (sheet === 'party') {
      sh.step = 'close';
    } else {
      const p = findText(v, 'パーティ・装備', false);
      if (p?.enabled) return decide({ css: '[data-sheet="menu"] button', text: 'パーティ・装備', exact: false }, '揺さぶり: 「パーティ・装備」を開く');
      return null;
    }
  }
  if (sh.step === 'close') {
    if (!hasLayer(v, 'sheet')) {
      sh.step = 'done';
      sh.count++;
      return null;
    }
    return decide(G.sheetClose, `揺さぶり: シート（${sheet}）を×で閉じる`);
  }
  return null;
}
