// ===== コンテンツの自動読み込み =====
// src/content/ のファイルを置くだけで登録表に入る（登録表への手での追記は不要）。
//   src/content/common/...              どのシナリオでも使うもの
//   src/content/scenarios/<シナリオID>/... そのシナリオだけで使うもの
// ファイルの書き方: 定義（id を持つオブジェクト）、その配列、または { id: 定義 } の表を export する。
// 名前付きの export ならいくつ書いてもよい（id を持たない export は無視する）。
import { createRegistry, type Registry } from './registry';

export type ContentModules = Record<string, Record<string, unknown>>;

const isDef = (v: unknown): v is { id: string } => !!v && typeof v === 'object' && !Array.isArray(v) && typeof (v as { id?: unknown }).id === 'string';

function defsOf(v: unknown): { id: string }[] {
  if (Array.isArray(v)) return v.filter(isDef);
  if (isDef(v)) return [v];
  if (v && typeof v === 'object') {
    const vals = Object.values(v);
    if (vals.length && vals.every(isDef)) return vals;
  }
  return [];
}

/** ファイルの場所からシナリオIDを取り出す（共通なら undefined） */
export const scenarioOfPath = (path: string): string | undefined => /\/scenarios\/([^/]+)\//.exec(path)?.[1];

export interface ContentRegistry<T extends { id: string }> extends Registry<T> {
  /** どのシナリオのデータか（共通なら undefined） */
  scenarioOf(id: string): string | undefined;
  /** そのシナリオで使えるもの（共通 + そのシナリオ専用） */
  forScenario(scenarioId: string | undefined): T[];
}

/**
 * import.meta.glob(..., { eager: true }) の結果から登録表を作る。
 * 並び順: order（小さい順・省略は0）→ ファイルの場所 → ファイル内の順。同じIDが2つあればエラー。
 */
export function contentRegistry<T extends { id: string; order?: number }>(kind: string, modules: ContentModules, extra: T[] = []): ContentRegistry<T> {
  const found: { def: T; scenario?: string; idx: number }[] = [];
  for (const path of Object.keys(modules).sort()) {
    const scenario = scenarioOfPath(path);
    for (const value of Object.values(modules[path])) for (const def of defsOf(value)) found.push({ def: def as T, scenario, idx: found.length });
  }
  for (const def of extra) found.push({ def, idx: found.length });
  found.sort((a, b) => (a.def.order ?? 0) - (b.def.order ?? 0) || a.idx - b.idx);
  const scenarioById = new Map<string, string | undefined>();
  const reg = createRegistry<T>(kind, []);
  for (const f of found) {
    reg.register(f.def);
    scenarioById.set(f.def.id, f.scenario);
  }
  const origRegister = reg.register;
  return {
    ...reg,
    get all() {
      return reg.all;
    },
    register(item: T) {
      origRegister(item);
      scenarioById.set(item.id, undefined);
    },
    scenarioOf: (id) => scenarioById.get(id),
    forScenario: (sid) => reg.all.filter((d) => {
      const s = scenarioById.get(d.id);
      return s === undefined || s === sid;
    }),
  };
}
