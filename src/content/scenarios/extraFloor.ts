// ===== ダンジョンに1階（部屋の行を1つ）足す =====
// 冒険を長くするため、鍵のダンジョンと最後のダンジョンは、元の並びに1行足して使う。
// 足す場所: ボスの手前の「休憩だけの行」のさらに手前（休憩してからボスへ、の流れは変えない）。休憩の行が無ければボスの手前。
// 足す行は2部屋（どちらかを選ぶ）。前の行の部屋は、位置の近い部屋へつなぎ直す
import type { DungeonDef } from '../../types';

type Layout = NonNullable<DungeonDef['layout']>;
type LayoutRoom = Layout[number][number];

/** 鍵のダンジョン: 戦闘か、宝箱（レア） */
export const KEY_EXTRA_FLOOR: Omit<LayoutRoom, 'next'>[] = [{ type: 'battle' }, { type: 'chest', chest: { rarity: 'rare', locked: false } }];
/** 最後のダンジョン: 戦闘か、強敵 */
export const FINALE_EXTRA_FLOOR: Omit<LayoutRoom, 'next'>[] = [{ type: 'battle' }, { type: 'elite' }];

export function withExtraFloor(layout: Layout, rooms: Omit<LayoutRoom, 'next'>[]): Layout {
  const out = layout.map((row) => row.map((room) => ({ ...room, next: [...room.next] })));
  const boss = out.length - 1;
  let at = boss;
  for (let r = boss - 1; r >= 1; r--) {
    if (out[r].length === 1 && out[r][0].type === 'rest') {
      at = r;
      break;
    }
  }
  // 足す行の部屋は、すべて次の行（1部屋だけの行）につながる
  const nextWidth = out[at].length;
  const added = rooms.map((room, c) => ({ ...room, next: [nextWidth === 1 ? 0 : Math.min(c, nextWidth - 1)] }));
  // 前の行の部屋を、足す行の位置の近い部屋へつなぐ（前の行が1部屋なら全部へ）
  const prev = out[at - 1];
  const n = added.length;
  prev.forEach((room, c) => {
    room.next = prev.length === 1 ? added.map((_, i) => i) : [Math.round((c / (prev.length - 1)) * (n - 1))];
  });
  // どの部屋からも入れない部屋が無いように（念のため）
  added.forEach((_, i) => {
    if (!prev.some((p) => p.next.includes(i))) prev[Math.min(prev.length - 1, i)].next = [...new Set([...prev[Math.min(prev.length - 1, i)].next, i])].sort();
  });
  out.splice(at, 0, added);
  return out;
}
