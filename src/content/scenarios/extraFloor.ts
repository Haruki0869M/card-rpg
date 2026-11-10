// ===== ダンジョンを大きくする（1階足す・通る部屋を増やす） =====
// 冒険を長くするため、鍵のダンジョンと最後のダンジョンは、元の並びから大きくして使う（オーナー承認: 鍵のダンジョン1つを2人で15〜20分、最後は20〜25分）。
// 1. withExtraFloor: ボスの手前の「休憩だけの行」のさらに手前に、2部屋の行を1つ足す（+1階）。
// 2. grownLayout: 入口の行とボス前（休憩→ボス）の間の「中の行」を、決めた行の数になるまで繰り返す。
//    扉は1行に1つしか選べないので、遊ぶ時間は「通る行の数」で決まる。部屋の種類の割合は元の並びと同じ（中の行をそのまま繰り返すため）。
//    繰り返しのつなぎ目では、前の行の部屋を、位置の近い部屋へつなぎ直す。
import type { DungeonDef } from '../../types';

type Layout = NonNullable<DungeonDef['layout']>;
type LayoutRoom = Layout[number][number];

/** 鍵のダンジョン: 戦闘か、宝箱（レア） */
export const KEY_EXTRA_FLOOR: Omit<LayoutRoom, 'next'>[] = [{ type: 'battle' }, { type: 'chest', chest: { rarity: 'rare', locked: false } }];
/** 最後のダンジョン: 戦闘か、強敵 */
export const FINALE_EXTRA_FLOOR: Omit<LayoutRoom, 'next'>[] = [{ type: 'battle' }, { type: 'elite' }];

/**
 * 通る行の数（入口からボスまで。提案の値）。
 * 今の鍵のダンジョン（約9行）が人の2人で約3〜4分（straight-bot の測定 × 人の速さ0.2）なので、約0.4分/行として
 * 鍵のダンジョン 40行 ≒ 16分、最後のダンジョン 52行 ≒ 21分（最後は敵が強く、1部屋が長い）
 */
export const DUNGEON_ROWS = { key: 40, finale: 52 } as const;

const copy = (layout: Layout): Layout => layout.map((row) => row.map((room) => ({ ...room, next: [...room.next] })));

/** 前の行の部屋を、次の行（width 部屋）の位置の近い部屋へつなぎ直す。どの部屋にも入れる */
function connect(prev: LayoutRoom[], width: number) {
  prev.forEach((room, c) => {
    room.next = prev.length === 1 ? Array.from({ length: width }, (_, i) => i) : [Math.round((c / (prev.length - 1)) * (width - 1))];
  });
  for (let i = 0; i < width; i++) {
    if (prev.some((p) => p.next.includes(i))) continue;
    const from = prev[Math.min(prev.length - 1, Math.round((i / Math.max(1, width - 1)) * (prev.length - 1)))];
    from.next = [...new Set([...from.next, i])].sort((a, b) => a - b);
  }
}

/** ボスの手前の「休憩だけの行」（無ければボスの行）の位置 */
function restBeforeBoss(layout: Layout): number {
  const boss = layout.length - 1;
  for (let r = boss - 1; r >= 1; r--) if (layout[r].length === 1 && layout[r][0].type === 'rest') return r;
  return boss;
}

export function withExtraFloor(layout: Layout, rooms: Omit<LayoutRoom, 'next'>[]): Layout {
  const out = copy(layout);
  const at = restBeforeBoss(out);
  // 足す行の部屋は、すべて次の行（1部屋だけの行）につながる
  const added = rooms.map((room) => ({ ...room, next: [0] }));
  connect(out[at - 1], added.length);
  out.splice(at, 0, added);
  return out;
}

/** 中の行を繰り返して、入口からボスまで rows 行にする（元が rows 行以上なら、そのまま） */
export function growLayout(layout: Layout, rows: number): Layout {
  const src = copy(layout);
  const tailAt = restBeforeBoss(src);
  const head = src[0];
  const middle = src.slice(1, tailAt);
  const tail = src.slice(tailAt);
  const need = rows - 1 - tail.length;
  if (need <= middle.length || !middle.length) return src;
  // 1つの「階」= 中の行 ＋ ボス前と同じ休憩の行（元のダンジョンと同じ割合で休める。40行を休憩2回では体力が持たない）
  const landing = tail[0].length === 1 && tail[0][0].type === 'rest' ? [tail[0]] : [];
  const floor = [...middle, ...landing];
  const body: Layout = [];
  while (body.length < need) for (const row of copy(floor)) if (body.length < need) body.push(row);
  // 最後の階の休憩がボス前の休憩と続く時は、その休憩の代わりに中の行を1つ置く（休憩が2つ並ばないように）
  if (landing.length && body[body.length - 1][0].type === 'rest' && body[body.length - 1].length === 1) body[body.length - 1] = copy([middle[(body.length - 1) % floor.length] ?? middle[0]])[0];
  const out = [head, ...body, ...tail];
  // つなぎ目（中の行の最後 → 次の繰り返しの最初、途中で切った所 → 休憩の行）をつなぎ直す
  for (let r = 0; r + 1 < out.length; r++) {
    const width = out[r + 1].length;
    if (out[r].some((room) => room.next.some((n) => n >= width)) || out[r + 1].some((_, c) => !out[r].some((p) => p.next.includes(c)))) connect(out[r], width);
  }
  return out;
}

/** 鍵のダンジョン・最後のダンジョンの並び: 1階足してから、決めた行の数まで大きくする */
export function grownLayout(layout: Layout, extra: Omit<LayoutRoom, 'next'>[]): Layout {
  return growLayout(withExtraFloor(layout, extra), extra === FINALE_EXTRA_FLOOR ? DUNGEON_ROWS.finale : DUNGEON_ROWS.key);
}
