// 今の全データ（ジョブ・カード・武器・鎧・装飾品・消耗品・敵・状態異常・属性・お供）を、1つの文書に書き出す道具。
// 企画の相談（Gemini など）に見せるための物。ゲームのデータと説明文の関数をそのまま使う。
// 使い方: node scripts/dump-lineup.mjs [出力先]   （既定は docs/review/lineup.md）
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, process.argv[2] ?? 'docs/review/lineup.md');
const server = await createServer({ root: ROOT, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
try {
  const { CARDS } = await server.ssrLoadModule('/src/data/cards/index.ts');
  const { ITEMS } = await server.ssrLoadModule('/src/data/items/index.ts');
  const { CLASSES } = await server.ssrLoadModule('/src/data/classes/index.ts');
  const { describeEffect } = await server.ssrLoadModule('/src/engine/battle/effects/index.ts');
  const { describeAbility } = await server.ssrLoadModule('/src/engine/abilities/index.ts');
  const { WEAPON_TYPES } = await server.ssrLoadModule('/src/data/rules/index.ts');
  const { ENEMIES, ENCOUNTERS } = await server.ssrLoadModule('/src/data/enemies/index.ts');
  const { STATUSES } = await server.ssrLoadModule('/src/data/statuses/index.ts');
  const { ELEMENTS } = await server.ssrLoadModule('/src/data/elements/index.ts');
  const { DUNGEONS } = await server.ssrLoadModule('/src/data/dungeons/index.ts');
  const { PETS } = await server.ssrLoadModule('/src/data/pets/index.ts');
  const { SCENARIOS } = await server.ssrLoadModule('/src/data/scenarios/index.ts');
  const { describeStatus } = await server.ssrLoadModule('/src/engine/battle/statuses.ts');
  const wname = (id) => WEAPON_TYPES.tryGet(id)?.name ?? id;
  const RAR = { common: 'コモン', rare: 'レア', epic: 'エピック', legend: 'レジェンド' };
  const CAT = { physical: '物理', magic: '魔法', skill: 'スキル' };
  const TGT = { enemy: '敵1体', self: '自分', allEnemies: '敵全体', ally: '味方1人', otherAlly: 'ほかの味方1人', fallenAlly: '倒れた味方' };
  const LIN = { bu: '武', ma: '魔', sei: '聖', gi: '技' };
  const TIER = { base: '基本', mid: '中位', top: '最上位', special: '特殊' };
  const STAT = { str: '力', int: '知力', dex: '器用', agi: '素早さ', per: '感知', luk: '運', vit: '体力' };
  const rarOrder = ['common', 'rare', 'epic', 'legend'];
  const safe = (f, d = '') => { try { return f(); } catch { return d; } };

  // カードがどのジョブに属するか
  const owner = new Map();
  const add = (cid, text) => { if (!owner.has(cid)) owner.set(cid, []); if (!owner.get(cid).includes(text)) owner.get(cid).push(text); };
  for (const c of CLASSES.all) {
    for (const d of c.deck ?? []) add(d.cardId, `${c.name}の最初の山札`);
    for (const id of c.jobCards ?? []) add(id, `${c.name}の転職カード`);
    for (const id of c.signature ?? []) add(id, `${c.name}の専用カード`);
    for (const id of c.cardPool ?? []) if (!(owner.get(id) ?? []).some((t) => t.startsWith(c.name))) add(id, `${c.name}の報酬`);
  }
  const weaponCards = new Map();
  for (const it of ITEMS.all) for (const c of it.cards ?? []) { if (!weaponCards.has(c.cardId)) weaponCards.set(c.cardId, []); weaponCards.get(c.cardId).push(it.name); }

  const cardLine = (c) => {
    const tiers = c.tiers.map((t, i) => {
      const lo = t.minSuccesses; const hi = i + 1 < c.tiers.length ? c.tiers[i + 1].minSuccesses - 1 : c.slots;
      const range = lo === hi ? `${lo}` : `${lo}〜${hi}`;
      const fx = t.effects.map((e) => safe(() => describeEffect(e, 'ally', c), e.kind)).join('、') || '何も起きない';
      return `成功${range}: ${fx}`;
    }).join(' ／ ');
    const marks = [];
    for (const w of [c.weaponType, ...(c.weaponTypes ?? [])].filter(Boolean)) marks.push(`武器種:${wname(w)}`);
    for (const l of [c.lineage, ...(c.lineages ?? [])].filter(Boolean)) marks.push(`系統:${LIN[l] ?? l}`);
    if (c.common) marks.push('共通');
    if (c.heresy) marks.push('異端');
    if (c.exhaust) marks.push('戦闘中1回');
    if (c.stat) marks.push(`判定:${STAT[c.stat] ?? c.stat}`);
    const own = owner.get(c.id) ?? [];
    marks.push(...own.slice(0, 3));
    if (own.length > 3) marks.push(`ほか${own.length - 3}`);
    const w = weaponCards.get(c.id); if (w) marks.push(`武器に付く(${w.length}本)`);
    const trait = c.trait ? ` 《${c.trait.name}》${safe(() => describeAbility(c.trait))}` : '';
    return `- **${c.name}**［${RAR[c.rarity ?? 'common']}・${CAT[c.category]}・コスト${c.cost}・枠${c.slots}・成功率${c.baseChance}%・${TGT[c.target] ?? c.target}］${tiers}${trait}${marks.length ? `｛${marks.join('・')}｝` : ''}`;
  };
  const itemLine = (it) => {
    const p = [];
    for (const [k, v] of Object.entries(it.stats ?? {})) if (v) p.push(`${STAT[k] ?? k}${v > 0 ? '+' : ''}${v}`);
    if (it.maxHp) p.push(`最大HP+${it.maxHp}`);
    if (it.focusMax) p.push(`フォーカス最大+${it.focusMax}`);
    if (it.startBlock) p.push(`開始時ブロック${it.startBlock}`);
    if (it.extraDraw) p.push(`毎ターン+${it.extraDraw}枚`);
    for (const c of it.cards ?? []) p.push(`カード「${safe(() => CARDS.get(c.cardId).name, c.cardId)}」×${c.count}`);
    for (const e of it.use ?? []) p.push(safe(() => describeEffect(e).replace('対象', '味方1人'), e.kind));
    if (it.explore?.vision) p.push(`視界+${it.explore.vision}`);
    if (it.explore?.campHeal) p.push(`野営の回復+${Math.round(it.explore.campHeal * 100)}%`);
    if (it.explore?.petEvent) p.push(`お供を連れている時、イベントの判定+${it.explore.petEvent}%`);
    const ab = it.ability ? ` 《${it.ability.name}》${safe(() => describeAbility(it.ability))}` : '';
    if (it.pouchBonus) p.push(`道具袋+${it.pouchBonus}`);
    // 段階7a: ランダムダンジョンの専用の装備（黄金箱と闇商人だけ）・仲間がいる時だけ出る物
    const sc = (it.scenario ? `｛シナリオ限定:${it.scenario}｝` : '') + (it.source === 'randomDungeon' ? '｛専用:黄金箱・闇商人だけ｝' : '') + (it.teamOnly ? '｛仲間がいる時だけ｝' : '');
    return `- **${it.name}**［${RAR[it.rarity]}］${p.join('・')}${ab}${p.length || ab ? '' : it.description}${sc}`;
  };
  const count = (list, f) => { const m = {}; for (const x of list) { const k = f(x); m[k] = (m[k] ?? 0) + 1; } return m; };
  const rarCount = (list) => { const m = count(list, (x) => x.rarity ?? 'common'); return rarOrder.map((r) => `${RAR[r]}${m[r] ?? 0}`).join('・'); };
  const byRar = (a, b) => rarOrder.indexOf(a.rarity ?? 'common') - rarOrder.indexOf(b.rarity ?? 'common');

  const out = [];
  const cards = [...CARDS.all]; const items = [...ITEMS.all]; const classes = [...CLASSES.all];
  const weapons = items.filter((i) => i.slot === 'weapon'); const armors = items.filter((i) => i.slot === 'armor');
  const accs = items.filter((i) => i.slot === 'accessory'); const cons = items.filter((i) => i.slot === 'consumable');
  out.push('# DESTINY OF CRYSTALIA 今のラインナップ（ゲームのデータから自動で書き出し）', '');
  out.push('## 0. 数のまとめ', '');
  out.push(`- カード（スキル）: ${cards.length}枚（${rarCount(cards)}／物理${cards.filter((c) => c.category === 'physical').length}・魔法${cards.filter((c) => c.category === 'magic').length}・スキル${cards.filter((c) => c.category === 'skill').length}）`);
  out.push(`- 武器: ${weapons.length}（${rarCount(weapons)}）`, `- 鎧: ${armors.length}（${rarCount(armors)}）`, `- 装飾品: ${accs.length}（${rarCount(accs)}）`, `- 消耗品: ${cons.length}（${rarCount(cons)}）`, `- ジョブ: ${classes.length}`, '');
  const wc = count(weapons, (w) => w.weaponType ?? '?');
  out.push(`- 武器の種類ごとの数: ${Object.entries(wc).map(([k, v]) => `${wname(k)} ${v}`).join('・')}`, '');
  out.push('読み方: カードは［レア度・種類・コスト・スロットの枠の数・1枠の成功率・対象］。「成功N」は、スロットの成功の数ごとの効果。《 》は特別な力。｛ ｝はどこで手に入るかの印。', '');

  out.push('## 1. ジョブ', '');
  for (const t of ['base', 'mid', 'top', 'special']) {
    const list = classes.filter((c) => (c.tier ?? 'base') === t); if (!list.length) continue;
    out.push(`### ${TIER[t]}（${list.length}）`, '');
    for (const c of list) {
      const from = c.from?.length ? `・転職元:${c.from.map((id) => safe(() => CLASSES.get(id).name, id)).join('/')}` : '';
      const req = c.requires ? `・条件:${c.requires.text}` : '';
      out.push(`- **${c.name}**（${c.role}・系統${LIN[c.lineage] ?? '-'}・HP${c.baseMaxHp}・武器◎${wname(c.weaponType)}${c.subWeapons?.length ? `○${c.subWeapons.map(wname).join('/')}` : ''}${from}${req}）戦闘《${c.battleAbility.name}》${safe(() => describeAbility(c.battleAbility))} ／ 探索《${c.exploreAbility.name}》${c.exploreAbility.description}`);
    }
    out.push('');
  }

  out.push('## 2. カード（スキル）', '');
  const used = new Set();
  const section = (title, list) => { list.forEach((c) => used.add(c.id)); out.push(`### ${title}（${list.length}枚・${rarCount(list)}）`, ''); };
  const jobList = cards.filter((c) => owner.has(c.id) && !c.weaponType && !c.lineage && !c.common && !c.heresy);
  section('ジョブのカード（最初の山札・転職・専用・そのジョブの報酬）', jobList);
  out.push(...jobList.sort(byRar).map(cardLine), '');
  const wList = cards.filter((c) => !used.has(c.id) && c.weaponType);
  section('武器種のカード（その武器を持てるジョブの報酬に出る）', wList);
  for (const k of Object.keys(count(wList, (c) => c.weaponType))) { const l = wList.filter((c) => c.weaponType === k).sort(byRar); out.push(`#### ${wname(k)}（${l.length}枚）`, '', ...l.map(cardLine), ''); }
  const lList = cards.filter((c) => !used.has(c.id) && c.lineage);
  section('系統のカード（武・魔・聖・技）', lList);
  for (const k of Object.keys(count(lList, (c) => c.lineage))) { const l = lList.filter((c) => c.lineage === k).sort(byRar); out.push(`#### ${LIN[k] ?? k}（${l.length}枚）`, '', ...l.map(cardLine), ''); }
  const cList = cards.filter((c) => !used.has(c.id) && c.common);
  section('共通のカード（どのジョブにも出る）', cList);
  out.push(...cList.sort(byRar).map(cardLine), '');
  const hList = cards.filter((c) => !used.has(c.id) && c.heresy);
  section('異端のカード（代償つき・イベントだけ）', hList);
  out.push(...hList.sort(byRar).map(cardLine), '');
  const rest = cards.filter((c) => !used.has(c.id));
  section('そのほか（武器に付くカードなど）', rest);
  out.push(...rest.sort(byRar).map(cardLine), '');

  out.push('## 3. 武器', '');
  for (const k of Object.keys(wc)) { const list = weapons.filter((w) => (w.weaponType ?? '?') === k).sort(byRar); out.push(`### ${wname(k)}（${list.length}・${rarCount(list)}）`, '', ...list.map(itemLine), ''); }
  out.push(`## 4. 鎧（${armors.length}）`, '', ...armors.sort(byRar).map(itemLine), '');
  out.push(`## 5. 装飾品（${accs.length}）`, '', ...accs.sort(byRar).map(itemLine), '');
  out.push(`## 6. 消耗品（${cons.length}）`, '', ...cons.sort(byRar).map(itemLine), '');
  // ---------- 7. 敵 ----------
  // 敵・戦闘の組み合わせが、どのフォルダ（共通 / シナリオ）のデータかを、ファイルから調べる
  const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = resolve(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const home = new Map();
  for (const p of walk(resolve(ROOT, 'src/content'))) {
    const m = p.replace(/\\/g, '/').match(/src\/content\/(common|scenarios\/([^/]+))\/.*(enemies|encounters|dungeons)\/[^/]+\.ts$/); if (!m) continue;
    for (const x of readFileSync(p, 'utf8').matchAll(/\bid: ['"]([^'"]+)['"]/g)) if (!home.has(m[3] + ':' + x[1])) home.set(m[3] + ':' + x[1], m[2] ?? 'common');
  }
  const scName = (id) => id === '?' ? '亜種（元の敵から道具で作った属性違い。出る場所は各ダンジョンの一覧を見る）' : id === 'common' ? '共通（どのシナリオにも出る）' : safe(() => SCENARIOS.get(id).name, id) + '（' + id + '）';
  const elName = (id) => ELEMENTS.tryGet(id)?.name ?? id;
  const AI = { sequence: '順番', random: 'ランダム' };
  const actLine = (a) => `${a.big ? '【大技】' : ''}${a.name}: ${a.effects.map((e) => safe(() => describeEffect(e, 'enemy'), e.kind)).join('、') || '何もしない'}`;
  const enemyLine = (e) => {
    const marks = [];
    if (e.rare) marks.push('★レア'); if (e.variantOf) marks.push('亜種（元:' + safe(() => ENEMIES.get(e.variantOf).name, e.variantOf) + '）');
    if (e.weak?.length) marks.push('弱点:' + e.weak.map(elName).join('/')); if (e.resist?.length) marks.push('耐性:' + e.resist.map(elName).join('/'));
    const ab = (e.abilities ?? []).map((a) => `《${a.name}》${safe(() => describeAbility(a))}`).join(' ');
    const ph = (e.phases ?? []).map((p) => ` ▼HP${p.belowHpPct}%以下「${p.name}」（${AI[p.pattern] ?? p.pattern}）${p.actions.map(actLine).join(' ／ ')}`).join('');
    return `- **${e.name}**［Lv${e.baseLevel}・HP${e.maxHp}・行動:${AI[e.pattern] ?? e.pattern}・経験値${e.exp}・${e.gold}G${marks.length ? '・' + marks.join('・') : ''}］${actLine ? e.actions.map(actLine).join(' ／ ') : ''}${ab ? ' ' + ab : ''}${ph}`;
  };
  const enemies = [...ENEMIES.all]; const encounters = [...ENCOUNTERS.all];
  const dungeons = [...DUNGEONS.all];
  const bossIds = new Set(dungeons.flatMap((d) => d.pools.boss));
  const midIds = new Set(dungeons.flatMap((d) => d.pools.midboss ?? []));
  const eliteIds = new Set(dungeons.flatMap((d) => d.pools.elite.flat()));
  const usedIds = new Set(dungeons.flatMap((d) => [...d.pools.battle.flat(), ...d.pools.elite.flat(), ...d.pools.boss, ...(d.pools.midboss ?? [])]));
  out.push(`## 7. 敵（${enemies.length}体。うち 亜種${enemies.filter((e) => e.variantOf).length}・レア${enemies.filter((e) => e.rare).length}・ダンジョンのボス${bossIds.size}・中ボス${midIds.size}）`, '');
  out.push('読み方: ［そのデータのレベル・その時のHP・行動の決め方・倒した時の経験値とお金］。行動は「名前: 効果」。【大技】は、予告が出ているターンに体勢を崩せる（BREAK）行動。レベルが上がると HP と攻撃が増える。', '');
  const homes = [...new Set(enemies.map((e) => home.get('enemies:' + e.id) ?? '?'))];
  for (const h of homes) {
    const list = enemies.filter((e) => (home.get('enemies:' + e.id) ?? '?') === h).sort((a, b) => a.baseLevel - b.baseLevel);
    out.push(`### ${scName(h)}（${list.length}体）`, '', ...list.map((e) => enemyLine(e) + (bossIds.has(e.id) ? '｛ダンジョンのボス｝' : midIds.has(e.id) ? '｛中ボス｝' : eliteIds.has(e.id) ? '｛強敵の部屋｝' : usedIds.has(e.id) ? '' : '｛ダンジョンの外（世界マップ・イベントなど）｝')), '');
  }
  out.push(`## 8. 戦闘の組み合わせ（${encounters.length}）`, '');
  for (const h of [...new Set(encounters.map((x) => home.get('encounters:' + x.id) ?? '?'))]) {
    const list = encounters.filter((x) => (home.get('encounters:' + x.id) ?? '?') === h);
    out.push(`### ${scName(h)}（${list.length}）`, '', ...list.map((x) => `- ${x.boss ? '【ボス】' : ''}${x.name}: ${x.enemies.map((y) => safe(() => ENEMIES.get(y.defId).name, y.defId) + (y.level ? '(Lv' + y.level + ')' : '')).join('・')}`), '');
  }
  out.push(`### ダンジョンごとの敵（${dungeons.length}か所）`, '', '読み方: 「戦闘」「強敵」は、／で区切った組のどれかが出る。', '');
  const nm = (id) => safe(() => ENEMIES.get(id).name, id);
  for (const h of [...new Set(dungeons.map((d) => home.get('dungeons:' + d.id) ?? '?'))]) {
    out.push(`#### ${scName(h)}`, '');
    for (const d of dungeons.filter((x) => (home.get('dungeons:' + x.id) ?? '?') === h)) {
      const rows = d.layout ? d.layout.length + '行（固定）' : (d.rows ?? '?') + '行（自動生成）';
      out.push(`- **${d.name}**［敵の基準Lv${d.baseLevel}・${rows}${d.random ? '・ランダムダンジョン' : ''}${d.finale ? '・最後のダンジョン' : ''}${d.rewardKey ? '・鍵のダンジョン' : ''}］戦闘: ${d.pools.battle.map((g) => g.map(nm).join('+')).join(' ／ ')} ｜ 強敵: ${d.pools.elite.map((g) => g.map(nm).join('+')).join(' ／ ')}${d.pools.midboss ? ' ｜ 中ボス: ' + d.pools.midboss.map(nm).join('+') : ''} ｜ ボス: ${d.pools.boss.map(nm).join('+')}`);
    }
    out.push('');
  }

  // ---------- 9. ジョブの能力値と最初の山札 ----------
  out.push('## 9. ジョブの能力値と最初の山札', '');
  for (const c of classes) {
    const st = Object.entries(c.stats ?? {}).map(([k, v]) => `${STAT[k] ?? k}${v}`).join('・');
    const deck = (c.deck ?? []).map((d) => `${safe(() => CARDS.get(d.cardId).name, d.cardId)}×${d.count}`).join('・');
    const jc = (c.jobCards ?? []).map((id) => safe(() => CARDS.get(id).name, id)).join('・');
    out.push(`- **${c.name}**（${TIER[c.tier ?? 'base']}）HP${c.baseMaxHp}・${st}${deck ? ' ／ 山札: ' + deck : ''}${jc ? ' ／ 転職でもらうカード: ' + jc : ''}`);
  }
  out.push('');

  // ---------- 10. 状態異常・属性・お供 ----------
  out.push('## 10. 状態異常・属性・お供', '', '### 状態異常', '');
  for (const d of STATUSES.all) out.push(`- **${d.name}**（${d.harmful ? '悪い' : '良い'}）${safe(() => describeStatus(d))}`);
  out.push('', '### 属性', '');
  for (const d of ELEMENTS.all) out.push(`- **${d.name}**${d.status ? '（付ける状態異常: ' + (STATUSES.tryGet(d.status)?.name ?? d.status) + '）' : ''}`);
  out.push('', `### お供（${[...PETS.all].length}種類）`, '');
  for (const p of PETS.all) out.push(`- **${p.name}**${p.rare ? '（めったに出ない）' : ''}・色${p.colors.length}種類: ${p.description} ／ 戦闘: ${p.abilities.map((a) => safe(() => describeAbility(a))).join('、') || 'なし'} ／ 獣使いの系統: ${p.masterAbilities.map((a) => safe(() => describeAbility(a))).join('、') || 'なし'}`);
  out.push('');

  // ---------- 11. 同じ中身の物（名前だけ違う物） ----------
  out.push('## 11. 同じ中身の物（名前だけ違う物。憲章5の確認用）', '', '名前・出どころの印を除いて、中身の行が1文字も違わない物の組です。数字が少しだけ違う物（例: 回復量が2ずつ違う薬）は、ここには出ません。', '');
  const dupes = (title, list, line, nameOf) => {
    const g = new Map();
    for (const x of list) { const k = line(x).replace('**' + nameOf(x) + '**', '').replace(/｛.*?｝/g, ''); if (!g.has(k)) g.set(k, []); g.get(k).push(nameOf(x)); }
    const groups = [...g.entries()].filter(([, v]) => v.length > 1);
    out.push(`### ${title}: ${groups.length}組（${groups.reduce((n, [, v]) => n + v.length, 0)}個）`, '', ...groups.map(([k, v]) => `- ${v.join('＝')} … ${k.replace(/^- /, '').slice(0, 110)}`), '');
  };
  dupes('武器', weapons, itemLine, (x) => x.name); dupes('鎧', armors, itemLine, (x) => x.name);
  dupes('装飾品', accs, itemLine, (x) => x.name); dupes('消耗品', cons, itemLine, (x) => x.name);
  dupes('カード', cards, cardLine, (x) => x.name);
  dupes('敵', enemies, (e) => enemyLine(e).replace(/亜種（元:.*?）/, ''), (x) => x.name);
  writeFileSync(OUT, out.join('\n').replace(/\r\n/g, '\n') + '\n');
  console.log(`書き出し: ${OUT}（カード${cards.length}・武器${weapons.length}・鎧${armors.length}・装飾品${accs.length}・消耗品${cons.length}・ジョブ${classes.length}・敵${enemies.length}）`);
} finally {
  await server.close();
}
