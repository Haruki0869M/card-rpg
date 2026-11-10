// 今のラインナップ（カード・武器・鎧・装飾品・消耗品・ジョブ）を、1つの文書に書き出す道具。
// 企画の相談（Gemini など）に見せるための物。ゲームのデータと説明文の関数をそのまま使う。
// 使い方: node scripts/dump-lineup.mjs [出力先]   （既定は docs/review/lineup.md）
import { writeFileSync } from 'node:fs';
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
    if (c.weaponType) marks.push(`武器種:${wname(c.weaponType)}`);
    if (c.lineage) marks.push(`系統:${LIN[c.lineage] ?? c.lineage}`);
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
    const ab = it.ability ? ` 《${it.ability.name}》${safe(() => describeAbility(it.ability))}` : '';
    const sc = it.scenario ? `｛シナリオ限定:${it.scenario}｝` : '';
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
  writeFileSync(OUT, out.join('\n').replace(/\r\n/g, '\n') + '\n');
  console.log(`書き出し: ${OUT}（カード${cards.length}・武器${weapons.length}・鎧${armors.length}・装飾品${accs.length}・消耗品${cons.length}・ジョブ${classes.length}）`);
} finally {
  await server.close();
}
