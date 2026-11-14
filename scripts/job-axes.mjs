// 職 × ビルドの軸の表（2026-11-14・docs/tasks/homework-plan-1114.md 宿題3-4「職 × 軸の表を数え直す」）。ゲームは変えない（読むだけ）。
// 48職それぞれに、憲章5の5つの軸（重装カウンター・オーバーヒール・状態異常バースト・手数＆お供・背水ブラッド）の
// 「核」になるカード・武器・決め技・職の能力が、いくつ届くかを数える。装飾品と鎧はどの職も着けられるので、職とは別に数える。
// 使い方: node scripts/job-axes.mjs [出力先]   （既定は screenshots/job-axes.md。表の元になる文書を書く）
// 「届く」= その職1つだけの時の報酬の候補（jobs.ts の heroCardPool と同じ決まり: 職の候補 ＋ 共通 ＋ 持てる武器種 ＋ 系統。決め技・異端は除く）。
// 軸の印は、効果の部品・常時型・きっかけ・条件の名前から機械で付ける（下の AXES）。11/13 の点検（auditC-axes.mjs）の印の付け方は
// リポジトリに残っていないので、同じではない。数え方の違いは文書に書く。
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, process.argv[2] ?? 'screenshots/job-axes.md');

/** 軸の印: 効果の種類（kind）・常時型（modifier）・きっかけ（when）・条件（if の kind）・ダメージの伸び方（scale.by） */
const AXES = {
  heavy: {
    name: '重装カウンター',
    kind: ['blockDamage', 'retaliate', 'retaliateDealt', 'steadfast', 'counter'],
    modifier: ['keepBlock', 'mirrorCounter', 'counterCap', 'shareBlock'],
    when: ['blocked'],
    cond: ['selfBlockAtLeast'],
    scale: [],
    /** damageDealt の addFromBlock（今のブロックを威力に）・装甲砲台（砲台がブロックの割合を足す。2026-11-14） */
    special: (o) => !!o.addFromBlock || (o.kind === 'summon' && !!o.blockPct),
  },
  overheal: {
    name: 'オーバーヒール',
    kind: ['overflowHeal', 'seraphim', 'holyGain', 'holdLight', 'healOrBlock', 'reversal'],
    modifier: ['healToBlock'],
    when: ['overheal'],
    cond: ['healedFull'],
    scale: [],
  },
  burst: {
    name: '状態異常バースト',
    kind: ['detonateStatus', 'statusBurst', 'statusScale', 'statusKindsDamage', 'tickNow', 'abyss', 'collapse', 'mirrorStatus', 'moveStatus', 'usedElementStatuses', 'freshStatus', 'veinBreak', 'petPounce'],
    modifier: ['statusBonus'],
    when: ['detonate', 'foeTick'],
    cond: ['targetStatusAtLeast'],
    scale: ['targetStatuses'],
  },
  tempo: {
    name: '手数＆お供',
    // 「引いた札のコストを下げる（drawDiscount。詠唱の栞）」は1枚引くだけの小さい道具なので、手数の核にしない
    kind: ['zeroFlurry', 'damageByPlays', 'playedDamage', 'countPlayed', 'comboFinish', 'asuraFists', 'refundCost', 'petAct', 'petRampage', 'petTreat', 'rallyBeasts'],
    modifier: ['petTwice', 'noPlayCount'],
    when: ['petAct'],
    cond: ['playedThisTurn', 'nthThisTurn', 'playedCategoryCount', 'hasPet'],
    scale: ['companions'],
  },
  blood: {
    name: '背水ブラッド',
    kind: ['bloodPrice', 'payHp', 'missingHpDamage', 'missingHpScaled'],
    modifier: ['endure', 'rageStack'],
    // 「HPが減った時（hurt）」のきっかけは、守り・回復の札（起死回生・不屈など）にも付くので、背水の印にしない
    when: [],
    cond: ['selfHpAtMost'],
    scale: ['missingHp'],
  },
};
const AX = Object.keys(AXES);

/** 物（カード・装備・能力）の中を全部たどって、当たる軸を返す */
function axesOf(obj) {
  const hit = new Set();
  const seen = new Set();
  const walk = (o) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o)) { o.forEach(walk); return; }
    for (const a of AX) {
      const d = AXES[a];
      if (typeof o.kind === 'string' && (d.kind.includes(o.kind) || d.cond.includes(o.kind))) hit.add(a);
      if (typeof o.modifier === 'string' && d.modifier.includes(o.modifier)) hit.add(a);
      if (typeof o.when === 'string' && d.when.includes(o.when)) hit.add(a);
      if (o.scale && d.scale.includes(o.scale.by)) hit.add(a);
      if (d.special?.(o)) hit.add(a);
    }
    for (const v of Object.values(o)) walk(v);
  };
  walk(obj);
  return [...hit];
}

const server = await createServer({ root: ROOT, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
try {
  const { CARDS } = await server.ssrLoadModule('/src/data/cards/index.ts');
  const { ITEMS } = await server.ssrLoadModule('/src/data/items/index.ts');
  const { CLASSES } = await server.ssrLoadModule('/src/data/classes/index.ts');
  const { heroCardPool, finisherCards } = await server.ssrLoadModule('/src/engine/game/jobs.ts');
  const { jobWeapons } = await server.ssrLoadModule('/src/engine/game/hero.ts');
  const { goldenBoxItems } = await server.ssrLoadModule('/src/content/common/items/goldenBox.ts');
  const { scourgeItems } = await server.ssrLoadModule('/src/content/common/items/scourgeGear.ts');
  const golden = new Set(goldenBoxItems.map((i) => i.id));
  const scourge = new Set(scourgeItems.map((i) => i.id));
  /** 装備の手に入る所: どこでも / シナリオ限定 / 黄金箱 / 災厄 */
  const whereOf = (it) => (golden.has(it.id) || it.source === 'randomDungeon' ? '黄金箱' : scourge.has(it.id) || it.source === 'scourge' ? '災厄' : it.scenario ? `限定(${it.scenario})` : 'どこでも');
  const FIN = finisherCards();
  const cardAxes = new Map(CARDS.all.map((c) => [c.id, axesOf(c)]));
  /** 装備の軸: 能力 ＋ 付いてくるカード */
  const itemAxes = (it) => [...new Set([...axesOf(it.ability ?? {}), ...(it.cards ?? []).flatMap((x) => cardAxes.get(x.cardId) ?? [])])];
  const gear = ITEMS.all.filter((it) => it.slot !== 'consumable');
  const TIER = { base: '基本', mid: '中位', top: '最上位', special: '特殊' };
  const LIN = { bu: '武', ma: '魔', sei: '聖', gi: '技' };

  const L = [];
  L.push('# 職 × 軸の表（scripts/job-axes.mjs の出力）', '');
  L.push(`カード ${CARDS.all.length}枚・装備 ${gear.length}個（消耗品を除く）・職 ${CLASSES.all.length}。印の付け方はスクリプトの AXES。`, '');

  // 1. 軸ごとの核の数
  L.push('## 1. 軸ごとの核の数', '');
  L.push('| 軸 | カード（異端・決め技を除く） | 異端 | 決め技 | 武器（どこでも / ほか） | 装飾品（どこでも / ほか） | 鎧（どこでも / ほか） | 職の能力 |');
  L.push('|---|---|---|---|---|---|---|---|');
  const gearBy = (a, slot) => {
    const xs = gear.filter((it) => it.slot === slot && itemAxes(it).includes(a));
    return `${xs.filter((it) => whereOf(it) === 'どこでも').length} / ${xs.filter((it) => whereOf(it) !== 'どこでも').length}`;
  };
  for (const a of AX) {
    const cs = CARDS.all.filter((c) => cardAxes.get(c.id).includes(a));
    L.push(`| ${AXES[a].name} | ${cs.filter((c) => !c.heresy && !FIN.has(c.id)).length} | ${cs.filter((c) => c.heresy).length} | ${cs.filter((c) => FIN.has(c.id)).length} | ${gearBy(a, 'weapon')} | ${gearBy(a, 'accessory')} | ${gearBy(a, 'armor')} | ${CLASSES.all.filter((j) => axesOf(j.battleAbility ?? {}).includes(a)).map((j) => j.name).join('・') || '-'} |`);
  }
  // 1b. どの職も着けられる、軸の装飾品と鎧の一覧
  L.push('', '## 1b. どの職も着けられる、軸の装飾品・鎧（手に入る所つき）', '');
  for (const a of AX) {
    const xs = gear.filter((it) => (it.slot === 'accessory' || it.slot === 'armor') && itemAxes(it).includes(a));
    L.push(`- **${AXES[a].name}**: ${xs.map((it) => `${it.name}（${it.slot === 'armor' ? '鎧' : '飾'}・${whereOf(it)}）`).join('・') || '無し'}`);
  }

  // 2. 職ごと
  const rows = [];
  for (const j of CLASSES.all) {
    const pool = heroCardPool({ classId: j.id, jobs: [], deck: [], equipment: {} }, false);
    const weapons = gear.filter((it) => it.slot === 'weapon' && jobWeapons(j.id).includes(it.weaponType));
    const fin = (j.jobCards ?? []).flatMap((id) => cardAxes.get(id) ?? []);
    const abil = axesOf(j.battleAbility ?? {});
    const per = {};
    let n = 0;
    for (const a of AX) {
      const cards = pool.filter((id) => cardAxes.get(id).includes(a));
      const ws = weapons.filter((it) => itemAxes(it).includes(a));
      const wsAny = ws.filter((it) => whereOf(it) === 'どこでも');
      // 「軸がある」= 核の札が2枚以上、または 札1枚以上 ＋（職の能力・決め技・どこでも出る武器のどれか）、または 職の能力か決め技がその軸
      // （「ごほうび」1枚だけ = お供がいないと意味が無い札、の時は数えない）
      const onlyTreat = cards.length === 1 && cards[0] === 'axTreat';
      const has = (!onlyTreat && cards.length >= 2) || (cards.length >= 1 && !onlyTreat && (abil.includes(a) || fin.includes(a) || wsAny.length > 0)) || abil.includes(a) || fin.includes(a);
      if (has) n++;
      per[a] = { cards: cards.length, names: cards.map((id) => CARDS.get(id).name), ws: ws.length, wsAny: wsAny.length, fin: fin.includes(a), abil: abil.includes(a), has, onlyTreat };
    }
    rows.push({ j, per, n });
  }
  L.push('', '## 2. 職ごと（札の数 / 武器 どこでも+ほか / ★決め技 / ◆職の能力。太字 = 軸がある）', '');
  L.push(`| 職 | 段 | 系統 | ${AX.map((a) => AXES[a].name).join(' | ')} | 軸の数 |`);
  L.push(`|---|---|---|${AX.map(() => '---|').join('')}---|`);
  for (const { j, per, n } of rows) {
    const cell = (a) => {
      const p = per[a];
      const t = `${p.cards}${p.onlyTreat ? '(ごほうびだけ)' : ''} / ${p.wsAny}+${p.ws - p.wsAny}${p.fin ? ' ★' : ''}${p.abil ? ' ◆' : ''}`;
      return p.has ? `**${t}**` : t;
    };
    L.push(`| ${n <= 1 ? `**${j.name}**` : j.name} | ${TIER[j.tier ?? 'base']} | ${LIN[j.lineage] ?? '-'} | ${AX.map(cell).join(' | ')} | ${n <= 1 ? `**${n}**` : n} |`);
  }
  L.push('', '## 3. 軸ごとの、届かない職（札が0枚）', '');
  L.push('| 軸 | 札が0枚の職の数 | 「ごほうび」だけの職 | 軸が無い職の数（上の決まり） |');
  L.push('|---|---|---|---|');
  for (const a of AX) {
    L.push(`| ${AXES[a].name} | ${rows.filter((r) => r.per[a].cards === 0).length} | ${rows.filter((r) => r.per[a].onlyTreat).length} | ${rows.filter((r) => !r.per[a].has).length} |`);
  }
  L.push('', '## 4. 軸の数の分布', '');
  for (let k = 0; k <= AX.length; k++) {
    const xs = rows.filter((r) => r.n === k);
    if (xs.length) L.push(`- 軸 ${k}: ${xs.length}職（${xs.map((r) => r.j.name).join('・')}）`);
  }
  L.push('', '## 5. 職ごとの、届く軸の札の名前（参考）', '');
  for (const { j, per } of rows) L.push(`- ${j.name}: ${AX.map((a) => `${AXES[a].name}〔${per[a].names.join('・') || '-'}〕`).join(' ')}`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, L.join('\n') + '\n');
  console.log(`書いた: ${OUT}`);
} finally {
  await server.close();
}
