// 賢いマルチプレイ検証 bot: だれが次に押すかを決める役（計画 §4 の共通の決まり）
// - いつも1台ずつ。押せる物のある端末のうち、手番の人 → 席の番号の小さい順。
// - 全端末が落ち着く（番号がそろう）まで、次の人は押さない（審判の compare）。
// - 毎ステップ、全端末で: 画面を読む（読めなければ失敗）→ 窓の潰れ・はみ出しの点検 → 審判の点検 → 止まりの検出。
// 区切り 1-S は骨組み。頭（brain/*）は区切り 1-J から。頭は View だけを受け取る（ページを直接さわれない形）。
import { readAll, readViewSettled } from './view/index.mjs';
import { checkOverflow, checkWindows } from './sensor.mjs';
import { press } from './press.mjs';

export class Conductor {
  /**
   * @param {object} o { fleet, judge, brains: { [seat]: (view, board) => 決め | null } }
   *   決め = { target: { css, text?, exact?, nth? }, what, turn?: true（手番の人の操作）} … null = 待つ
   */
  constructor({ fleet, judge, brains = {} }) {
    this.fleet = fleet;
    this.judge = judge;
    this.brains = brains;
    this.session = { judge };
    this.heavySeen = new Set();
    this.board = {}; // 仲間どうしの相談の板（区切り 2 から）
    this.steps = 0;
  }

  /** 全端末の画面を読み、窓の潰れ・はみ出しを点検する。返す物: View の配列 */
  async observe() {
    const devs = this.fleet.devices;
    const views = await readAll(devs);
    for (const [i, v] of views.entries()) {
      const dev = devs[i];
      if (v.unreadable) {
        // 画面が切り替わる途中の一瞬を取り違えないよう、少し待って読み直す。それでも読めなければ失敗（黙って待たない）
        const again = await readViewSettled(dev);
        views[i] = again;
        if (again.unreadable) await this.judge.fail('unreadable', { seat: dev.seat, text: `${again.unreadable}（字の始め: ${again.textSample?.slice(0, 60) ?? ''}）`, key: `unreadable|${dev.seat}|${again.textSample?.slice(0, 40)}` });
        continue;
      }
      // 演出の途中（歩き・戦闘の見せ方・扉が開く など。View の busy）は測らない。センサーの直し（2026-11-18・区切り 1-J）:
      // 歩きの演出の途中で、移動の提案のボタンが 69×43 と測られ「小さいボタン」に当たった（演出の無い時は 44px。同じ通しの前の手で測って当たっていない）。
      // 動いている途中の大きさ・位置は、人が押す時の形ではない。演出が終わってから、同じ画面をもう1度測る（重い検査の「初めて見た」の印も付けない）。
      // 自己テスト: selftest.mjs「演出中は測らない」
      if (v.busy.length) continue;
      for (const p of await checkWindows(dev.page).catch(() => [])) await this.judge.fail(p.kind, { seat: dev.seat, text: `${v.screen}/${v.mode ?? '-'} の窓「${p.win}」: ${p.text}`, key: `${p.kind}|${dev.viewport.width}x${dev.viewport.height}|${p.win}|${p.text.replace(/\d+/g, 'N')}` });
      // 重い検査は、その端末でその画面の指紋を初めて見た時だけ
      const heavy = !this.heavySeen.has(`${dev.seat}|${v.sig}`);
      this.heavySeen.add(`${dev.seat}|${v.sig}`);
      const o = await checkOverflow(dev.page, { heavy }).catch(() => ({ problems: [], ellipsis: [] }));
      for (const p of o.problems) await this.judge.fail('overflow', { seat: dev.seat, text: `${v.screen}/${v.mode ?? '-'}: ${p.text}`, key: `overflow|${dev.viewport.width}x${dev.viewport.height}|${v.screen}|${p.text}` });
      this.judge.countEllipsis(dev.seat, v.screen, o.ellipsis);
    }
    return views;
  }

  /**
   * 1手: 読む → 頭に聞く → 押す人を1人決める → 押す → 落ち着くのを待つ（審判）。
   * 返す物: { pressed, seat, allWaiting, stop }
   */
  async tick() {
    this.steps++;
    const views = await this.observe();
    // 区切り 2-Sb: 押す前の画面を見る口（画面での確かめの写真を、押す前の形で残すため。頭ではない・押さない）
    if (this.onViews) await this.onViews(views);
    const devs = this.fleet.devices;
    const wants = [];
    for (const [i, v] of views.entries()) {
      const brain = this.brains[v.seat];
      if (!brain || v.unreadable || v.busy.length) continue;
      // 頭には View だけを渡す（ページ・審判は渡さない）
      const d = brain(structuredClone(v), this.board);
      if (d) wants.push({ i, d });
    }
    const allWaiting = wants.length === 0;
    const stuck = await this.judge.watch(views, { allWaiting });
    if (!wants.length) return { pressed: false, allWaiting, views, stuck, stop: this.judge.shouldStop() || stuck === 'timeout' };
    // 手番の人 → 席の番号の小さい順
    wants.sort((a, b) => (b.d.turn ? 1 : 0) - (a.d.turn ? 1 : 0) || a.i - b.i);
    const { i, d } = wants[0];
    const before = await this.judge.maxSeq();
    const r = await press(this.session, devs[i], d.target, { what: d.what, map: !!d.map, where: `${views[i].screen}/${views[i].mode ?? '-'}` });
    await this.judge.step();
    const after = await this.judge.maxSeq();
    // 区切り 2-Sb: 押せた時だけ、頭の「押した後に板に書く事」を流す（どの端末の頭も毎回呼ばれ、押すのは1台だけなので、押していない頭が板を書き換えない）
    if (r.pressed && typeof d.after === 'function') d.after();
    if (r.pressed) await this.judge.repeated(devs[i].seat, views[i].sig, d.what ?? JSON.stringify(d.target), after > before || r.effect);
    return { pressed: r.pressed, seat: devs[i].seat, what: d.what, allWaiting: false, views, stuck, stop: this.judge.shouldStop() };
  }
}
