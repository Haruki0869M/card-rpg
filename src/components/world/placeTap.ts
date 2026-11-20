// ===== 施設の絵を押して入る・名前の札（回1の追加。play-feedback-1113-plan §6）=====
// 施設の絵は、立体に見せるためにマスの少し上に浮かせて描く（FACILITY_LIFT）。絵の上の方を押すと、上のマスに近くなるので、
// 絵が占める四角を求めて、その中を押したら施設のマスを押した事にする。見た目と押し方だけ（ゲームの結果は変えない）。

/** 施設のあるマス: 建物を少し奥（上）へずらす量（R を1とする） */
export const FACILITY_LIFT = 0.22;

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * 施設の絵の形（WorldMap の featureArt と同じ寸法）。
 * mark = 丸とアイコン（縮小した時・絵の無い施設）、tower = 見晴らしの塔、image = 描いた絵・ミニチュア（big = 絵の一辺。R の何倍か）
 */
export type ArtShape = { type: 'mark' } | { type: 'tower' } | { type: 'image'; big: number };

/** 施設の絵が占める四角。x, y = マスの上の面の中心。badge = ランダムダンジョンのテーマの印（右上の丸）も含める */
export function artBox(shape: ArtShape, x: number, y: number, R: number, badge = false): Box {
  let b: Box;
  if (shape.type === 'mark') {
    const r = R * 0.95 * 0.62;
    b = { x0: x - r, y0: y - r, x1: x + r, y1: y + r };
  } else {
    const yl = y - R * FACILITY_LIFT;
    if (shape.type === 'tower') {
      // 旗の先（見張り台の上 R*0.55）〜足元の影
      b = { x0: x - R * 0.45, y0: yl - R * 1.4, x1: x + R * 0.45, y1: yl + R * 0.53 };
    } else {
      const big = R * shape.big;
      b = { x0: x - big / 2, y0: yl - big * 0.62, x1: x + big / 2, y1: yl + big * 0.38 };
    }
  }
  if (badge) {
    const r = Math.max(9, R * 0.36);
    b = { x0: b.x0, y0: Math.min(b.y0, y - R * 0.75 - r), x1: Math.max(b.x1, x + R * 0.5 + r), y1: b.y1 };
  }
  return b;
}

/** 分かれ道の立て札が占める四角（ExploreMarks の SignpostMini・縮小した時の丸と同じ寸法）。x, y = マスの上の面の中心 */
export function signpostBox(x: number, y: number, R: number, east: boolean, compact: boolean): Box {
  if (compact) {
    const cx = x + R * 0.45, cy = y - R * 0.2, r = R * 0.32;
    return { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
  }
  const sx = x + (east ? R * 0.62 : -R * 0.62);
  const sy = y + R * 0.05;
  // 絵の立て札（柱の高さ R×1.25。板は柱の少し左に付き、幅 R×0.76。北・南は板が縦になるので、上に少し余裕）
  return { x0: sx - R * 0.5, y0: sy - R * 1.38, x1: sx + R * 0.3, y1: sy + R * 0.09 };
}

export const inBox = (b: Box, px: number, py: number) => px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1;

/**
 * 押した所にある施設の絵のマス（無ければ undefined）。絵が重なる時は、手前（下の行。マスの番号が大きい方）を先にする
 */
export function pickPlace(spots: readonly { tile: number; box: Box }[], px: number, py: number): number | undefined {
  let best: number | undefined;
  for (const s of spots) if (inBox(s.box, px, py) && (best === undefined || s.tile > best)) best = s.tile;
  return best;
}

/**
 * 地図を押した時に選ぶマス（2026-11-19 検証 bot の指摘: 町のマスにいる時、町の大きな絵の当たりの範囲が
 * 隣の光るマスに重なって、行き先を押しても選べなかった）。
 * 1. 押した所に見えている上の面が「今、光っている行き先のマス」（今いるマスは除く）なら、そのマス（施設の絵より先）
 * 2. 施設の絵（立て札も）の上なら、その施設のマス
 * 3. 見えている上の面のマス
 * それ以外は undefined（呼ぶ側が一番近いマスを探す）
 */
export function chooseTapTile(o: { topFace?: number; place?: number; reach?: { has(i: number): boolean }; here?: number }): number | undefined {
  if (o.topFace !== undefined && o.topFace !== o.here && o.reach?.has(o.topFace)) return o.topFace;
  if (o.place !== undefined) return o.place;
  return o.topFace;
}

// ---------- 名前の札 ----------

export interface PlaceLabel {
  tile: number;
  text: string;
  /** 0 = 次の目的地、1 = 町、2 = ダンジョン、3 = そのほか（塔・神殿・祭壇・祠） */
  rank: number;
  /** 札の真ん中の x と、上の端の y */
  x: number;
  y: number;
}

/** 札の大きさ（字の数 × 字の大きさ。日本語は全角なので、ほぼ字の大きさの幅） */
export function labelBox(l: Pick<PlaceLabel, 'text' | 'x' | 'y'>, fontSize: number): Box {
  const w = [...l.text].length * fontSize + 8;
  return { x0: l.x - w / 2, y0: l.y, x1: l.x + w / 2, y1: l.y + fontSize + 4 };
}

const overlap = (a: Box, b: Box, gap: number) => a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap;

/**
 * となりの札と重なる時は、次の目的地 → 町 → ダンジョン → そのほか、の順で残す（同じ順なら、マスの番号の小さい方）。
 * compact（0.75倍より小さく縮小した時）は、次の目的地と町だけ
 */
export function placeLabels(labels: readonly PlaceLabel[], fontSize: number, compact: boolean): PlaceLabel[] {
  const order = labels.filter((l) => !compact || l.rank <= 1).slice().sort((a, b) => a.rank - b.rank || a.tile - b.tile);
  const kept: { l: PlaceLabel; box: Box }[] = [];
  for (const l of order) {
    const box = labelBox(l, fontSize);
    if (kept.some((k) => overlap(k.box, box, 2))) continue;
    kept.push({ l, box });
  }
  return kept.map((k) => k.l);
}
