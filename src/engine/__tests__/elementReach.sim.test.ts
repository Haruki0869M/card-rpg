// ===== つまみの測定2（2026-11-13・数えるだけ）: 48職それぞれが「敵の弱点の属性」を出す手立てを、どれだけ持てるか =====
// ゲームの決まり・数値には触れない（データを読んで表にするだけ）。普段のテストでは動かさない。
// 使い方: SIM=1 SIM_OUT=screenshots/tune2/elements.md [SIM_FOES=要約.json（twoBots.sim の SIM_JSON。出会った敵 foes を使う）]
//   node C:/dev/card-rpg-tools/heavy.mjs npx vitest run src/engine/__tests__/elementReach.sim.test.ts
// 数え方（コードと同じ見方）:
//   ・属性つきの攻撃 = カードの段か特殊能力の中に「属性つきのダメージ」がある物（同じカードは1枚に数える。最初の山札だけは枚数）
//   ・弱点の手助け = 宿す（rememberElement）・弱点看破の印（markFoe exposed）・導きの光（markAlly guided）・弱点扱い（alwaysWeak）・
//     属性変幻（weaknessElement）・油壺（tempWeak）・属性の変換（convertElement）・武器に属性を宿すイベント（weaponElement）
//   ・候補 = 報酬・店のカードの候補（heroCardPool。今のジョブの専用＋武器種＋系統＋共通。決め技と異端は入らない）
//   ・武器 = そのジョブが持てる武器種（得意・サブ）の武器で、付いてくる札に属性つきの攻撃がある物（ランダムダンジョン専用の物は別に数える）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, it } from 'vitest';
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ELEMENTS } from '../../data/elements';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { SHARPEN_TRAITS } from '../../content/common/sharpenTraits';
import type { CardDef, Hero, ItemDef } from '../../types';
import { jobWeapons } from '../game/hero';
import { heroCardPool } from '../game/jobs';

const OUT = process.env.SIM_OUT ?? 'screenshots/tune2/elements.md';
const SCEN = process.env.SIM_SCENARIO ?? 'corruptionKing';
const AID_NAME: Record<string, string> = { rememberElement: '宿す', 'markFoe:exposed': '弱点看破', 'markAlly:guided': '導きの光', alwaysWeak: '弱点扱い', weaknessElement: '属性変幻', tempWeak: '油壺', convertElement: '属性の変換', weaponElement: '武器に宿す' };
const elName = (id: string) => ELEMENTS.get(id).name;

/** 物の中を全部たどって、属性つきのダメージの属性と、弱点の手助けの種類を集める */
function scan(x: unknown, out = { els: new Set<string>(), aids: new Set<string>(), conv: new Set<string>() }) {
  if (Array.isArray(x)) { for (const v of x) scan(v, out); return out; }
  if (!x || typeof x !== 'object') return out;
  const o = x as Record<string, unknown>;
  if (o.kind === 'damage' && typeof o.element === 'string') out.els.add(o.element);
  if (o.kind === 'rememberElement') out.aids.add('rememberElement');
  if (o.kind === 'markFoe' && o.mark === 'exposed') out.aids.add('markFoe:exposed');
  if (o.kind === 'markAlly' && o.mark === 'guided') out.aids.add('markAlly:guided');
  if (o.kind === 'tempWeak') { out.aids.add('tempWeak'); if (typeof o.element === 'string') out.conv.add(o.element); }
  if (o.kind === 'weaponElement') { out.aids.add('weaponElement'); for (const e of (o.elements as string[]) ?? []) out.conv.add(e); }
  if (o.modifier === 'alwaysWeak') out.aids.add('alwaysWeak');
  if (o.modifier === 'weaknessElement') out.aids.add('weaknessElement');
  if (o.modifier === 'convertElement') { out.aids.add('convertElement'); out.conv.add(o.into as string); }
  for (const v of Object.values(o)) scan(v, out);
  return out;
}
const hasDamage = (c: CardDef) => c.tiers.some((t) => t.effects.some((e) => e.kind === 'damage'));
// 属性は「完全成功の段（一番上の段）」と特殊能力で見る（「弱点で、しかも完全成功」の決まりで効くのは、完全成功の時の属性だけ。
// 例: 属性共鳴は 0成功=火・1成功=氷・完全成功=雷 なので、雷だけに数える）
const cardScan = (c: CardDef) => scan([c.tiers.at(-1) ?? null, c.trait ?? null, SHARPEN_TRAITS[c.id] ?? null]);
const RAR = ['common', 'rare', 'epic', 'legend'] as const;
const RAR_NAME: Record<string, string> = { common: 'C', rare: 'R', epic: 'E', legend: 'L' };
const fakeHero = (classId: string) => ({ classId, jobs: [], equipment: {}, deck: [] }) as unknown as Hero;

describe.skipIf(!process.env.SIM)('属性の手立ての数え（48職）', () => {
  it('表にする', () => {
    const L: string[] = [];
    const weapons = ITEMS.forScenario(SCEN).filter((i) => i.slot === 'weapon');
    const itemEls = (i: ItemDef) => {
      const s = scan([i.ability ?? null]);
      for (const c of i.cards ?? []) if (CARDS.has(c.cardId)) { const cs = cardScan(CARDS.get(c.cardId)); cs.els.forEach((e) => s.els.add(e)); cs.aids.forEach((a) => s.aids.add(a)); cs.conv.forEach((e) => s.conv.add(e)); }
      return s;
    };
    L.push(`# 属性の手立ての数え（${SCEN}・${new Date().toISOString().slice(0, 10)}）`, '');
    L.push('## 1. ジョブごと', '');
    L.push('| ジョブ | 段 | 武器（得意/サブ） | 最初の山札: 攻撃の枚数 / 属性つき（属性） | 最初の武器の札 | 候補: 攻撃の種類 / 属性つき（%） | 候補の属性 | 候補の手助け | ジョブの能力 | 持てる武器: 属性の札つき / 全部（格ごと） | 武器の属性 | 枠3以上の攻撃（最初の山札の枚数 / 候補の種類） |');
    L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
    const reach: Record<string, { name: string; tier: string; els: Set<string>; anyWeak: boolean; physShare: number }> = {};
    for (const cls of CLASSES.all) {
      const deck = cls.deck.flatMap((d) => Array.from({ length: d.count }, () => CARDS.get(d.cardId)));
      const atk = deck.filter(hasDamage);
      const atkEl = atk.filter((c) => cardScan(c).els.size);
      const deckEls = new Set(atkEl.flatMap((c) => [...cardScan(c).els]));
      const sw = cls.startingEquipment?.weapon ? ITEMS.get(cls.startingEquipment.weapon) : undefined;
      const swS = sw ? itemEls(sw) : undefined;
      const pool = heroCardPool(fakeHero(cls.id)).map((id) => CARDS.get(id));
      const pAtk = pool.filter(hasDamage);
      const pEl = pAtk.filter((c) => cardScan(c).els.size);
      const pEls = new Set(pEl.flatMap((c) => [...cardScan(c).els]));
      const pAids = new Set(pool.flatMap((c) => [...cardScan(c).aids]));
      const ab = scan([cls.battleAbility ?? null]);
      const types = jobWeapons(cls.id);
      const mine = weapons.filter((w) => types.includes(w.weaponType!));
      const mineEl = mine.filter((w) => itemEls(w).els.size || itemEls(w).aids.has('convertElement'));
      const wEls = new Set(mineEl.flatMap((w) => [...itemEls(w).els, ...itemEls(w).conv]));
      const byR = (xs: ItemDef[]) => RAR.map((r) => `${RAR_NAME[r]}${xs.filter((w) => w.rarity === r && !w.source).length}`).join(' ');
      const exclusive = mineEl.filter((w) => w.source).length;
      const heavyDeck = atk.filter((c) => c.slots >= 3).length;
      const heavyPool = pAtk.filter((c) => c.slots >= 3).length;
      const tier = cls.tier ?? 'base';
      L.push(`| ${cls.name}（${cls.id}） | ${tier} | ${types.join('/')} | ${atk.length} / ${atkEl.length}${deckEls.size ? `（${[...deckEls].map(elName).join('')}）` : ''} | ${sw ? `${sw.name}${swS!.els.size ? `（${[...swS!.els].map(elName).join('')}）` : ''}` : '-'} | ${pAtk.length} / ${pEl.length}（${Math.round((pEl.length / Math.max(1, pAtk.length)) * 100)}%・うち物理${pEl.filter((c) => c.category === 'physical').length}） | ${[...pEls].map(elName).join('') || '-'} | ${[...pAids].map((a) => AID_NAME[a]).join('・') || '-'} | ${[...ab.aids].map((a) => AID_NAME[a]).join('・') || '-'} | ${byR(mineEl)} / ${byR(mine)}${exclusive ? `＋専用${exclusive}` : ''} | ${[...wEls].map(elName).join('') || '-'} | ${heavyDeck} / ${heavyPool} |`);
      const els = new Set([...deckEls, ...(swS?.els ?? []), ...pEls, ...wEls, ...ab.conv]);
      const anyWeak = pAids.has('weaknessElement') || pAids.has('alwaysWeak') || pAids.has('markFoe:exposed') || pAids.has('markAlly:guided');
      reach[cls.id] = { name: cls.name, tier, els, anyWeak, physShare: pEl.length / Math.max(1, pAtk.length) };
    }
    // 1b. 属性の札・属性の変換を持つ武器（武器種ごと）
    L.push('', '## 1b. 属性の攻撃の札（完全成功の段）か属性の変換を持つ武器', '');
    L.push('| 武器種 | 武器の数（専用を除く） | 属性の手立てを持つ武器（格・属性） |');
    L.push('|---|---|---|');
    for (const t of [...new Set(weapons.map((w) => w.weaponType!))]) {
      const ws = weapons.filter((w) => w.weaponType === t);
      const el = ws.filter((w) => itemEls(w).els.size || itemEls(w).aids.has('convertElement'));
      L.push(`| ${t} | ${ws.filter((w) => !w.source).length} | ${el.map((w) => `${w.name}（${RAR_NAME[w.rarity]}${w.source ? '・専用' : ''}・${[...itemEls(w).els, ...itemEls(w).conv].map(elName).join('')}）`).join('・') || '-'} |`);
    }
    // 2. どのジョブでも手に入る物（装飾品・鎧・消耗品・イベント）
    L.push('', '## 2. どのジョブでも手に入る手立て（武器以外の装備・消耗品）', '');
    L.push('| 物 | 種類 | 格 | 出どころ | 中身 |');
    L.push('|---|---|---|---|---|');
    for (const i of ITEMS.forScenario(SCEN)) {
      if (i.slot === 'weapon') continue;
      const s = itemEls(i);
      const use = scan([i.use ?? null]);
      if (!s.els.size && !s.aids.size && !use.els.size && !use.aids.size) continue;
      const what = [...new Set([...s.els, ...use.els])].map((e) => `${elName(e)}の攻撃`).concat([...new Set([...s.aids, ...use.aids])].map((a) => AID_NAME[a] + ([...s.conv, ...use.conv].length ? `（${[...new Set([...s.conv, ...use.conv])].map(elName).join('')}）` : ''))).join('・');
      L.push(`| ${i.name}（${i.id}） | ${i.slot} | ${i.rarity} | ${i.source ?? (i.noShop ? '店に無い' : '店・宝箱')}${i.scenario ? `・${i.scenario}専用` : ''} | ${what} |`);
    }
    // 3. シナリオの敵（大技を持つ物）の弱点
    const foesFile = process.env.SIM_FOES;
    const seen = foesFile && existsSync(foesFile) ? (JSON.parse(readFileSync(foesFile, 'utf8')).foes as Record<string, number>) : undefined;
    const foes = (seen ? Object.keys(seen).map((id) => ENEMIES.get(id)) : ENEMIES.forScenario(SCEN)).filter((e) => [...e.actions, ...(e.phases ?? []).flatMap((p) => p.actions)].some((a) => a.big));
    const allFoes = seen ? Object.keys(seen).map((id) => ENEMIES.get(id)) : ENEMIES.forScenario(SCEN);
    L.push('', `## 3. ${seen ? '実際に出会った敵（twoBots.sim の記録）' : 'シナリオの敵（共通の敵を含む）'}の中で、大技を持つ敵の弱点`, '');
    L.push(`敵の数: ${allFoes.length}・そのうち大技を持つ敵: ${foes.length}・大技を持つのに弱点が無い敵: ${foes.filter((e) => !e.weak?.length).map((e) => `${e.name}（${e.id}）`).join('・') || 'なし'}`, '');
    L.push('| 敵 | 出た戦闘の数 | 弱点 | 耐性 |');
    L.push('|---|---|---|---|');
    for (const e of foes.sort((a, b) => (seen?.[b.id] ?? 0) - (seen?.[a.id] ?? 0))) L.push(`| ${e.name}（${e.id}） | ${seen?.[e.id] ?? '-'} | ${(e.weak ?? []).map(elName).join('・') || 'なし'} | ${(e.resist ?? []).map(elName).join('・') || '-'} |`);
    L.push('', '## 4. 弱点の属性ごとに、その属性を出せるジョブの数（最初の山札・候補・持てる武器・ジョブの能力のどれかで）', '');
    L.push('| 属性 | その属性が弱点の、大技を持つ敵の数 | 出せるジョブの数（48職中） | 基本職で出せる職 | 出せないジョブ |');
    L.push('|---|---|---|---|---|');
    for (const el of ELEMENTS.all) {
      const nFoes = foes.filter((e) => e.weak?.includes(el.id)).length;
      const can = Object.entries(reach).filter(([, r]) => r.els.has(el.id));
      const cannot = Object.entries(reach).filter(([, r]) => !r.els.has(el.id));
      L.push(`| ${el.name} | ${nFoes} | ${can.length} | ${can.filter(([, r]) => r.tier === 'base').map(([, r]) => r.name).join('・') || '-'} | ${cannot.map(([, r]) => r.name).join('・')} |`);
    }
    L.push('', `どの弱点でも突ける手助け（属性変幻・弱点扱い・弱点看破・導きの光）を候補に持つジョブ: ${Object.values(reach).filter((r) => r.anyWeak).length}職（${Object.values(reach).filter((r) => r.anyWeak).map((r) => r.name).join('・')}）`);
    L.push('', `候補の攻撃のうち属性つきが 25% より少ないジョブ（物理寄り）: ${Object.values(reach).filter((r) => r.physShare < 0.25).map((r) => `${r.name}${Math.round(r.physShare * 100)}%`).join('・')}`);
    // 5. カードの枠の数（重い一撃の決まり（エ）が、今のカードの作りに合うか）
    L.push('', '## 5. 攻撃のカードの枠の数（全部のカード。決め技・異端を含む）', '');
    const atkAll = CARDS.all.filter(hasDamage);
    L.push('| 枠 | 物理 | 魔法 | 技 |');
    L.push('|---|---|---|---|');
    for (let s = 1; s <= Math.max(...atkAll.map((c) => c.slots)); s++) L.push(`| ${s} | ${atkAll.filter((c) => c.slots === s && c.category === 'physical').length} | ${atkAll.filter((c) => c.slots === s && c.category === 'magic').length} | ${atkAll.filter((c) => c.slots === s && c.category === 'skill').length} |`);
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, L.join('\n') + '\n');
  }, 600_000);
});
