// volume.sim（遊びの長さの測定）の生データ（.json）を、段階ごとの記録（docs/tasks/overhaul-stage*.md）と同じ形の表にまとめる道具。
// 使い方: node scripts/volume-summary.mjs 名前=screenshots/a.json 名前=screenshots/b.json ...
//   例: node scripts/volume-summary.mjs 直行+0.5=screenshots/vol-s3-straight.json 普通+0.5=screenshots/vol-s3-normal.json
// 出す物（人数ごと・全部のシナリオの合計）: クリア・鍵1〜3の制覇・戦闘の数・1戦あたりの平均ラウンド・クリア時の侵食度・
//   侵食度100%で終わった冒険・どこで終わったか・侵食度の元の番の数・転職の時期（中央値）
import { readFileSync } from 'node:fs';

const avg = (xs) => { const v = xs.filter((x) => x != null && !Number.isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
const med = (xs) => { const v = xs.filter((x) => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : NaN; };
const f = (x, d = 0) => (Number.isNaN(x) ? '-' : x.toFixed(d));
const WHERE = ['鍵1の前', '鍵1の中', '鍵2の前', '鍵2の中', '鍵3の前', '鍵3の中', '最後の前', '最後の中', 'クリア'];

const rows = [];
for (const arg of process.argv.slice(2)) {
  const [name, path] = arg.includes('=') ? arg.split('=') : [arg, arg];
  const data = JSON.parse(readFileSync(path, 'utf8'));
  // ダンジョンの順番（鍵1・鍵2・鍵3・最後）: 最初に入った順で見る（シナリオごと）
  const order = (r) => Object.keys(r.enterLv ?? {}).filter((d) => !d.startsWith('random'));
  const parties = [...new Set(Object.values(data.all).flatMap((x) => Object.keys(x)))];
  for (const p of parties) {
    const rs = Object.values(data.all).flatMap((x) => x[p] ?? []);
    const cl = rs.filter((r) => r.end === 'clear');
    const rounds = rs.reduce((n, r) => n + r.fights.rounds, 0);
    const done = rs.reduce((n, r) => n + r.fights.finished, 0);
    const jobs = rs.filter((r) => !r.stuck).flatMap((r) => r.jobs);
    rows.push({
      name, p, n: rs.length, clear: cl.length,
      keys: [0, 1, 2].map((i) => rs.filter((r) => r.keyClear.length > i).length),
      fights: avg(rs.map((r) => r.fights.started)), fightsClear: avg(cl.map((r) => r.fights.started)),
      perFight: done ? rounds / done : NaN,
      corr: avg(cl.map((r) => r.final.corr)),
      corr100: rs.filter((r) => r.end === 'corr100').length,
      stuck: rs.filter((r) => r.stuck).length,
      gameover: rs.filter((r) => r.end !== 'clear' && r.end !== 'corr100').length,
      where: WHERE.map((w) => rs.filter((r) => r.where === w).length),
      turnsDungeon: avg(cl.map((r) => r.counts.turnsDungeon)), turnsMap: avg(cl.map((r) => r.counts.turnsMap)), enters: avg(cl.map((r) => r.counts.enters)),
      finaleTries: avg(cl.map((r) => r.finaleTries)),
      mid: [med(jobs.map((j) => j.mid?.battle)), med(jobs.map((j) => j.mid?.keys))],
      special: [med(jobs.map((j) => j.special?.battle)), med(jobs.map((j) => j.special?.keys))],
      top: [med(jobs.map((j) => j.topLv?.battle)), med(jobs.map((j) => j.topLv?.keys))],
      // シナリオごとのクリアの数（片寄りを見る）
      enterLv: [0, 1, 2, 3].map((i) => avg(rs.map((r) => (r.enterLv ? r.enterLv[order(r)[i]] : undefined)))),
      lost: [0, 1, 2, 3].map((i) => avg(rs.map((r) => (r.lostIn ? (r.lostIn[order(r)[i]] ?? 0) : undefined)))),
      firstTry: [0, 1, 2, 3].map((i) => { const xs = rs.filter((r) => r.enterLv && order(r)[i]); return `${xs.filter((r) => r.clearTry?.[order(r)[i]] === 1).length}/${xs.length}`; }),
      anyTry: [0, 1, 2, 3].map((i) => { const xs = rs.filter((r) => r.enterLv && order(r)[i]); return `${xs.filter((r) => r.clearTry?.[order(r)[i]]).length}/${xs.length}`; }),
      byScen: Object.entries(data.all).map(([s, x]) => `${s.slice(0, 5)}:${(x[p] ?? []).filter((r) => r.end === 'clear').length}/${(x[p] ?? []).length}`).join(' '),
    });
  }
}

const out = [];
out.push('| 測定 | 人数 | クリア | 鍵1 | 鍵2 | 鍵3 | 戦闘の数（全部の平均） | クリアした冒険の戦闘の数 | 1戦あたりの平均ラウンド | クリア時の侵食度 | 侵食度100%で終わった冒険 | 全滅で終わった冒険 | 詰まり |');
out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) out.push(`| ${r.name} | ${r.p} | ${r.clear}/${r.n} | ${r.keys[0]} | ${r.keys[1]} | ${r.keys[2]} | ${f(r.fights, 1)} | ${f(r.fightsClear, 1)} | ${f(r.perFight, 2)} | ${f(r.corr)}% | ${r.corr100} | ${r.gameover} | ${r.stuck} |`);
out.push('', `| 測定 | 人数 | ${WHERE.join(' | ')} |`, `|---|---|${WHERE.map(() => '---|').join('')}`);
for (const r of rows) out.push(`| ${r.name} | ${r.p} | ${r.where.map((x) => x || '').join(' | ')} |`);
out.push('', '| 測定 | 人数 | ダンジョンの中の番 | 世界マップの番 | ダンジョンに入った回数 | 最後のダンジョンに入った回数 | 中位（戦目・鍵） | 特殊（戦目・鍵） | 最上位のLv（戦目・鍵） |', '|---|---|---|---|---|---|---|---|---|');
for (const r of rows) out.push(`| ${r.name} | ${r.p} | ${f(r.turnsDungeon, 1)} | ${f(r.turnsMap, 1)} | ${f(r.enters, 1)} | ${f(r.finaleTries, 1)} | ${f(r.mid[0])}・${f(r.mid[1])} | ${f(r.special[0])}・${f(r.special[1])} | ${f(r.top[0])}・${f(r.top[1])} |`);
out.push('', '| 測定 | 人数 | 入った時の平均Lv（1つ目・2つ目・3つ目・最後） | 中で全滅した回数の平均（1つ目・2つ目・3つ目・最後） | 最初の挑戦で制覇（入った冒険のうち） | 何回目かで制覇 |', '|---|---|---|---|---|---|');
for (const r of rows) out.push(`| ${r.name} | ${r.p} | ${r.enterLv.map((x) => f(x, 1)).join('・')} | ${r.lost.map((x) => f(x, 2)).join('・')} | ${r.firstTry.join('・')} | ${r.anyTry.join('・')} |`);
out.push('', 'シナリオごとのクリア:');
for (const r of rows) out.push(`- ${r.name}・${r.p}人: ${r.byScen}`);
console.log(out.join('\n'));
