// ラインナップの見直し フェーズ1: 同じ失敗を防ぐテスト（docs/tasks/lineup-plan.md の 1-E）
// 1. カードの名前が重ならない  2. シナリオ限定のエピック以上の装備で、能力の中身が同じ物を増やさない  3. エピック以上の装備は必ず能力を持つ
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../data/cards';
import { ITEMS } from '../../data/items';
import type { ItemDef } from '../../types';

const EPIC_PLUS = new Set(['epic', 'legend']);

/**
 * 能力の中身（ability.effect）を比べるための文字列にする。
 * - key（oncePerTurn などの回数を数える名前）は装備ごとに違うだけなので無視する
 * - 書いた順番（プロパティの並び）が違うだけの物は同じと見なす
 */
function effectSignature(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      return Object.fromEntries(Object.keys(o).filter((k) => k !== 'key' && o[k] !== undefined).sort().map((k) => [k, norm(o[k])]));
    }
    return v;
  };
  return JSON.stringify(norm(value));
}

/** シナリオ限定のエピック以上の装備を、能力の中身が同じ物どうしでまとめる（2つ以上の組だけ。id の順） */
function sameAbilityGroups(items: readonly ItemDef[]): string[][] {
  const bySig = new Map<string, string[]>();
  for (const i of items) {
    if (!i.scenario || !EPIC_PLUS.has(i.rarity) || i.slot === 'consumable' || !i.ability) continue;
    const sig = effectSignature(i.ability.effect);
    bySig.set(sig, [...(bySig.get(sig) ?? []), i.id]);
  }
  return [...bySig.values()].filter((ids) => ids.length > 1).map((ids) => [...ids].sort()).sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * まだ直していない組（能力の中身が同じ、シナリオ限定のエピック以上の装備）。
 * フェーズ1後半・追加の装備の回で直す。直したら、ここから消す（この一覧は減る一方。増やさない）。
 * 2026-11-11 の時点のデータを実際に読んで作った。
 */
const KNOWN_SAME_ABILITY_GROUPS: string[][] = [
  ['angelRobe', 'barnacleArmor', 'echoArmor', 'steelPlate'],
  ['everIceBracer', 'goldenAnchor', 'kingSignet', 'masterCore', 'sixWorldsBadge'],
];

describe('ラインナップの見張り（フェーズ1 1-E）', () => {
  it('カードの名前は重ならない', () => {
    const byName = new Map<string, string[]>();
    for (const c of CARDS.all) byName.set(c.name, [...(byName.get(c.name) ?? []), c.id]);
    const dup = [...byName.entries()].filter(([, ids]) => ids.length > 1).map(([name, ids]) => `「${name}」: ${ids.join(' / ')}`);
    expect(dup, `同じ名前のカードがあります（${dup.length}組）\n${dup.join('\n')}`).toEqual([]);
  });

  describe('シナリオ限定のエピック以上の装備: 能力の中身が同じ物を増やさない', () => {
    const groups = sameAbilityGroups(ITEMS.all);
    const known = KNOWN_SAME_ABILITY_GROUPS.map((ids) => [...ids].sort()).sort((a, b) => a[0].localeCompare(b[0]));
    const show = (gs: string[][]) => gs.map((g) => `[${g.join(', ')}]`).join('\n');

    it('一覧の id は実在し、同じ id を2回書いていない', () => {
      const ids = known.flat();
      for (const id of ids) expect(ITEMS.has(id), `一覧の ${id} が装備に無い`).toBe(true);
      expect(new Set(ids).size, '一覧に同じ id が2回ある').toBe(ids.length);
      for (const g of known) expect(g.length, `組は2つ以上: [${g.join(', ')}]`).toBeGreaterThan(1);
    });

    it('一覧に無い「同じ能力の組」が無い（新しく作らない）', () => {
      const knownKeys = new Set(known.map((g) => g.join('|')));
      const knownIds = new Set(known.flat());
      // 一覧の組から装備が減っただけの組は、下のテスト（一覧が古い）で知らせる。ここでは、一覧に無い装備を含む組だけを見る
      const fresh = groups.filter((g) => !knownKeys.has(g.join('|')) && g.some((id) => !knownIds.has(id)));
      expect(fresh, `能力の中身が同じ装備の組が新しくできています。能力を変えてください（一覧に足して済ませない）\n${show(fresh)}`).toEqual([]);
    });

    it('一覧の組は、今も本当に同じ能力の組である（直したら一覧から消す）', () => {
      const nowKeys = new Set(groups.map((g) => g.join('|')));
      const stale = known.filter((g) => !nowKeys.has(g.join('|')));
      expect(stale, `一覧が古くなっています（直した装備を「まだ直していない組」から消してください）\n一覧の組:\n${show(stale)}\n今の組:\n${show(groups)}`).toEqual([]);
    });
  });

  it('エピック以上の装備は必ず能力（ability）を持つ', () => {
    const missing = ITEMS.all.filter((i) => i.slot !== 'consumable' && EPIC_PLUS.has(i.rarity) && !i.ability).map((i) => i.id);
    expect(missing, `能力の無いエピック以上の装備: ${missing.join(', ')}`).toEqual([]);
  });
});
