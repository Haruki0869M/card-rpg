// ===== 登録表（レジストリ） =====
// 職業・敵・カードなどを ID で引ける一覧。データを1件追加するだけでゲームに登場させるための仕組み。

export interface Registry<T extends { id: string }> {
  /** 登録順の一覧（読み取り専用） */
  readonly all: readonly T[];
  get(id: string): T;
  tryGet(id: string): T | undefined;
  has(id: string): boolean;
  /** 追加登録（テストや将来の追加データ用）。同じIDは上書きしない */
  register(item: T): void;
}

export function createRegistry<T extends { id: string }>(kind: string, items: T[]): Registry<T> {
  const map = new Map<string, T>();
  const list: T[] = [];
  const reg: Registry<T> = {
    get all() {
      return list;
    },
    get(id) {
      const v = map.get(id);
      if (!v) throw new Error(`Unknown ${kind}: ${id}`);
      return v;
    },
    tryGet: (id) => map.get(id),
    has: (id) => map.has(id),
    register(item) {
      if (map.has(item.id)) throw new Error(`Duplicate ${kind}: ${item.id}`);
      map.set(item.id, item);
      list.push(item);
    },
  };
  items.forEach((i) => reg.register(i));
  return reg;
}
