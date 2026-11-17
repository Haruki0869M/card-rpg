// 賢いマルチプレイ検証 bot: 報告（日本語の report.md と report.json。計画 §7-2・直し9・直し10・直し14）
// 区切り 1-S は骨組み。網羅の表・揺さぶり・戦闘は、後の区切りで中身が入る（今は「まだ作っていない」と書く）。
import { writeFileSync } from 'node:fs';
import { KINDS } from './judge.mjs';

/** bot が見逃す物（直し9。どの報告にも必ず付ける。固定の一覧） */
export const BLIND_SPOTS = [
  '見た目のずれ（色・絵・配置が少しおかしい、は字と印では分からない）',
  '読みにくさ（字の大きさ・行の長さ・言葉の分かりやすさは、人が読んで決める）',
  '手ざわり（押した感じ・間・気持ちよさ）',
  '音（鳴るか・大きさ・うるささ）',
  '絵とボタンの一致（扉の絵とボタンの並び・キャラの絵と武器など）',
  '指のドラッグとスクロール（bot は窓をその場でスクロールして送る。地図と窓のスクロールは、1回は本物のタッチの操作で通す）',
  'LINE の中のブラウザ（アプリの中のブラウザの動き）',
  '本物の回線（遅い・切れる・つながり直す。bot は手元の確認用サーバーにつなぐ）',
  '同時押しの全部の組み合わせ（bot は決まった順に1台ずつ押す。S13 で一部だけ確かめる）',
];

/**
 * 報告を書く。
 * @param {string} dir 置き場所
 * @param {object} r { title, scenario, people, seed, devices, judge, startedAt, endedAt, stage, reached: { run, checkpoint, rewritten }, extra }
 * 返す物: 終了コード（合格 0・不合格 1）
 */
export function writeReport(dir, r) {
  const j = r.judge;
  const failed = j.failures.length > 0;
  // 区切り 1-S の合格は「失敗 0」だけ。網羅の表・揺さぶりの線は後の区切りで足す（それまでは合格と書かず「失敗なし」と書く）
  const pass = !failed && r.complete === true;
  const verdict = failed ? '不合格' : pass ? '合格' : '失敗なし（ただし、通しの全部はまだ作っていないので合格とは書かない）';
  const minutes = ((new Date(r.endedAt) - new Date(r.startedAt)) / 60000).toFixed(1);
  const byKind = {};
  for (const f of j.failures) byKind[f.label] = (byKind[f.label] ?? 0) + 1;
  const momentary = j.notes.filter((n) => n.kind === 'momentary');
  const blocked = j.notes.filter((n) => n.kind === 'blocked');
  const ellipsisTotal = [...j.ellipsis.values()].reduce((a, b) => a + b, 0);
  const lines = [];
  lines.push(`# 賢いマルチプレイ検証 bot の結果: ${r.scenario}・${r.people}人・種 ${r.seed}`);
  lines.push(`結論: ${verdict}${failed ? `（失敗 ${j.failures.length} 件・${Object.keys(byKind).length} 種類: ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join('・')}）` : ''}`);
  lines.push(`区切り: ${r.stage}　かかった時間: ${minutes} 分　手数: ${j.actions.length}`);
  lines.push(`端末: ${r.devices.map((d) => `${d.seat} ${d.viewport.width}×${d.viewport.height}`).join(' / ')}`);
  lines.push('');
  lines.push('## 見つけた不具合（種類ごと）');
  if (!j.failures.length) lines.push('なし');
  else {
    lines.push('| 番号 | 種類 | どの端末 | 何が起きたか | 写真の場所 |');
    lines.push('|---|---|---|---|---|');
    for (const f of j.failures) lines.push(`| ${f.n} | ${f.label} | ${f.seat ?? '全端末'} | ${String(f.text).replace(/\|/g, '／').slice(0, 200)} | ${f.dir} |`);
  }
  lines.push('');
  lines.push('## 着いた所（直し10: 書き換えだけで見た所は「完走」と呼ばない）');
  lines.push(`- 通しで着いた所: ${r.reached?.run ?? '—'}`);
  lines.push(`- 続き（節目の保存）で着いた所: ${r.reached?.checkpoint ?? '—（区切り 4 から）'}`);
  lines.push(`- 書き換えた保存で見た所: ${r.reached?.rewritten ?? '—（区切り 4 から）'}`);
  lines.push('');
  lines.push('## 網羅の表');
  lines.push('まだ作っていない（区切り 2-Sb）。');
  lines.push('');
  lines.push('## 揺さぶり');
  lines.push('まだ作っていない（区切り 3-S）。');
  lines.push('');
  lines.push('## 戦闘・バランスの記録（直し14。数字は直さず記録だけ）');
  lines.push('戦闘の数（憲章の 32〜40 と並べる）・1戦のターン数・全滅の場所・転職の時期・終わりの悪化の度合い: まだ作っていない（区切り 2-Sa）。');
  lines.push('');
  lines.push('## 同期');
  lines.push(`比べた回数: ${j.syncChecks}　ずれ: ${j.failures.filter((f) => f.kind === 'desync').length}　追いつかない: ${j.failures.filter((f) => f.kind === 'lag').length}`);
  lines.push(`取り直しの記録: ${j.hasResyncLog ? '読めた' : 'まだ読めない（確認用の入口 resyncLog は区切り 1-G で入る）'}`);
  lines.push('');
  lines.push('## 注意（失敗ではない）');
  lines.push(`- 一瞬の当たり: ${momentary.length} 回${momentary.length ? `（${momentary.slice(0, 10).map((n) => n.text).join('／')}）` : ''}`);
  lines.push(`- わざと「…」で切っている字: ${ellipsisTotal} か所（画面ごとの数は report.json）`);
  lines.push(`- 手元以外への通信を捨てた（本番に書かない守り）: ${blocked.length} 回${blocked.length ? `（${[...new Set(blocked.map((n) => n.text))].slice(0, 5).join('／')}）` : ''}`);
  for (const n of j.notes.filter((x) => !['momentary', 'blocked'].includes(x.kind)).slice(0, 20)) lines.push(`- ${n.text}`);
  lines.push('');
  lines.push('## bot が見逃す物（いつも付ける）');
  for (const b of BLIND_SPOTS) lines.push(`- ${b}`);
  if (r.extra?.length) {
    lines.push('');
    lines.push('## そのほか');
    for (const e of r.extra) lines.push(`- ${e}`);
  }
  writeFileSync(`${dir}/report.md`, `${lines.join('\n')}\n`);
  writeFileSync(
    `${dir}/report.json`,
    JSON.stringify(
      {
        verdict,
        pass,
        scenario: r.scenario,
        people: r.people,
        seed: r.seed,
        stage: r.stage,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        devices: r.devices.map((d) => ({ seat: d.seat, viewport: d.viewport })),
        failures: j.failures,
        kinds: Object.fromEntries(Object.entries(KINDS)),
        notes: j.notes,
        ellipsis: Object.fromEntries(j.ellipsis),
        syncChecks: j.syncChecks,
        actions: j.actions.length,
        reached: r.reached,
        blindSpots: BLIND_SPOTS,
      },
      null,
      2,
    ),
  );
  return failed ? 1 : pass ? 0 : 0;
}
