// ===== 世界マップの立体のミニチュア（仮の絵）と、枠から飛び出す木・山 =====
// 絵（Midjourney）が来たら、src/assets/art/ の下に置くだけで差し替わる:
//   場所:   place/event.webp・place/temple.webp・place/altar.webp・place/finale.webp
//   飾り:   prop/forest.webp・prop/mountain.webp・prop/volcano.webp
// 絵が無い間は、ここの SVG の図（仮のミニチュア）を描く。見た目だけで、ゲームの状態には関係しない。
import { artImage } from '../../art';
import { GROUND_K, hash01 } from './diorama';

/** 場所の種類 → 絵のキー（MAP_ART_KEYS の絵があればそれを使う） */
export type MiniKind = 'event' | 'temple' | 'altar' | 'finale';
export type PropKind = 'forest' | 'mountain' | 'volcano';
export const MINI_ART_KEY: Record<MiniKind, string> = { event: 'place/event', temple: 'place/temple', altar: 'place/altar', finale: 'place/finale' };
export const PROP_ART_KEY: Record<PropKind, string> = { forest: 'prop/forest', mountain: 'prop/mountain', volcano: 'prop/volcano' };

/** 地形の飾り（枠から飛び出す木・山）の種類 */
export function propOf(terrainId: string): PropKind | undefined {
  if (terrainId === 'forest') return 'forest';
  if (terrainId === 'mountain') return 'mountain';
  if (terrainId === 'lava') return 'volcano';
  return undefined;
}

/**
 * 場所のミニチュア。x, y = マスの上の面の中心、R = マスの半径。
 * 絵があれば絵を、無ければ仮の図を、上の面より上へ飛び出させて立てる
 */
export function PlaceMini({ kind, x, y, R, dim }: { kind: MiniKind; x: number; y: number; R: number; dim?: boolean }) {
  const img = artImage(MINI_ART_KEY[kind]);
  const big = R * (kind === 'finale' ? 1.9 : 1.5);
  if (img) return <image href={img} x={x - big / 2} y={y - big * 0.62} width={big} height={big} filter="url(#place-shadow)" style={dim ? { filter: 'grayscale(1) brightness(.6)' } : undefined} />;
  // 図は 100×100 の枠で描き、足元（50, 80）をマスの中心より少し下に合わせる
  const s = big / 100;
  return (
    <g transform={`translate(${(x - 50 * s).toFixed(1)},${(y + R * 0.2 * GROUND_K - 80 * s).toFixed(1)}) scale(${s.toFixed(3)})`} data-mini={kind}>
      <ellipse cx="50" cy="82" rx="34" ry="9" fill="rgba(0,0,0,.45)" />
      {kind === 'event' && <EventShape />}
      {kind === 'temple' && <TempleShape />}
      {kind === 'altar' && <AltarShape />}
      {kind === 'finale' && <FinaleShape />}
    </g>
  );
}

/** イベント: 旅人のテントと石碑。石碑の上に小さな「？」のバッジ */
function EventShape() {
  return (
    <>
      {/* テント */}
      <path d="M18 78 L38 40 L58 78 Z" fill="#c98a4a" stroke="#3a2210" strokeWidth="2" strokeLinejoin="round" />
      <path d="M38 40 L58 78 L47 78 Z" fill="#8a5528" />
      <path d="M38 52 L33 78 L43 78 Z" fill="#2a1608" />
      <line x1="38" y1="40" x2="38" y2="33" stroke="#3a2210" strokeWidth="2" />
      <path d="M38 33 L46 36 L38 39 Z" fill="#e05a4a" />
      {/* 石碑 */}
      <path d="M60 80 L62 46 Q70 38 78 46 L80 80 Z" fill="#9a9aa8" stroke="#2a2a34" strokeWidth="2" strokeLinejoin="round" />
      <path d="M71 44 Q76 46 78 50 L80 80 L72 80 Z" fill="#6a6a7a" />
      <path d="M65 56 H75 M65 62 H74 M65 68 H75" stroke="#4a4a58" strokeWidth="1.6" />
      {/* 「？」のバッジ */}
      <circle cx="70" cy="28" r="11" fill="#1a3a6a" stroke="#9ad8ff" strokeWidth="2.5" />
      <text x="70" y="33.5" textAnchor="middle" fontSize="16" fontWeight="900" fill="#e8f6ff">?</text>
    </>
  );
}

/** 神殿: 石の台座と4本の柱、三角の屋根 */
function TempleShape() {
  return (
    <>
      <rect x="14" y="70" width="72" height="10" fill="#b8b0a0" stroke="#3a3428" strokeWidth="2" />
      <rect x="14" y="76" width="72" height="4" fill="#7a7266" />
      {[22, 38, 54, 70].map((px) => (
        <g key={px}>
          <rect x={px} y="40" width="8" height="30" fill="#e8e0cc" stroke="#3a3428" strokeWidth="1.6" />
          <rect x={px + 5} y="40" width="3" height="30" fill="#a8a090" />
        </g>
      ))}
      <rect x="16" y="34" width="68" height="7" fill="#d8d0bc" stroke="#3a3428" strokeWidth="1.8" />
      <path d="M12 34 L50 14 L88 34 Z" fill="#e8e0cc" stroke="#3a3428" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 14 L88 34 L70 34 Z" fill="#b8b0a0" />
      <circle cx="50" cy="27" r="3.5" fill="#ffe9a8" />
    </>
  );
}

/** 祭壇: 石の台と、上に浮かぶ光る結晶 */
function AltarShape() {
  return (
    <>
      <ellipse cx="50" cy="40" rx="26" ry="22" fill="#c8a0ff" opacity=".25" />
      <path d="M26 80 L30 58 H70 L74 80 Z" fill="#7a6a8a" stroke="#241a30" strokeWidth="2" strokeLinejoin="round" />
      <path d="M60 58 H70 L74 80 H62 Z" fill="#54486a" />
      <rect x="24" y="52" width="52" height="7" rx="1.5" fill="#a898b8" stroke="#241a30" strokeWidth="2" />
      <path d="M50 18 L59 34 L50 48 L41 34 Z" fill="#e0c8ff" stroke="#5a2a9a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 18 L59 34 L50 48 Z" fill="#a878f0" />
      <circle cx="47" cy="30" r="2.2" fill="#fff" />
    </>
  );
}

/** 最後の城（魔王城など）: 暗い石の城と赤い窓 */
function FinaleShape() {
  return (
    <>
      <rect x="22" y="44" width="56" height="36" fill="#3a2e44" stroke="#120c18" strokeWidth="2" />
      <rect x="58" y="44" width="20" height="36" fill="#281e30" />
      {[16, 42, 70].map((px, k) => (
        <g key={px}>
          <rect x={px} y={k === 1 ? 20 : 32} width={k === 1 ? 16 : 14} height={k === 1 ? 60 : 48} fill="#463852" stroke="#120c18" strokeWidth="2" />
          <path d={`M${px - 2} ${k === 1 ? 20 : 32} L${px + (k === 1 ? 8 : 7)} ${k === 1 ? 4 : 18} L${px + (k === 1 ? 18 : 16)} ${k === 1 ? 20 : 32} Z`} fill="#6a2a4a" stroke="#120c18" strokeWidth="2" strokeLinejoin="round" />
          <rect x={px + (k === 1 ? 6 : 5)} y={k === 1 ? 30 : 42} width="4" height="7" fill="#ff5a3a" />
        </g>
      ))}
      <path d="M44 80 V68 Q50 60 56 68 V80 Z" fill="#120c18" />
    </>
  );
}

/**
 * 地形の飾り（森の木・山の頂・火山）。上の面の中に根元を置き、奥の方は上の辺より上へ飛び出す。
 * i = マスの番号（木の数・場所をマスごとに少し変える）
 */
export function TerrainProp({ kind, x, y, R, i }: { kind: PropKind; x: number; y: number; R: number; i: number }) {
  const img = artImage(PROP_ART_KEY[kind]);
  if (img) {
    const big = R * 1.6;
    return <image href={img} x={x - big / 2} y={y - big * 0.7} width={big} height={big} pointerEvents="none" />;
  }
  if (kind === 'forest') {
    // 奥から手前へ（上から下へ）描く。手前の木が奥の木を隠す
    const spots: [number, number, number][] = [
      [-0.38, -0.32, 0.95],
      [0.3, -0.38, 1.05],
      [-0.02, -0.06, 1.15],
      [-0.42, 0.22, 0.85],
      [0.4, 0.18, 0.9],
    ];
    const n = 3 + Math.floor(hash01(i, 3) * 3);
    return (
      <g pointerEvents="none">
        {spots.slice(0, n).map(([dx, dy, k], j) => {
          const jx = (hash01(i, 10 + j) - 0.5) * 0.14;
          return <Pine key={j} x={x + (dx + jx) * R} y={y + dy * R * GROUND_K} h={R * 0.78 * k} dark={hash01(i, 20 + j) < 0.5} />;
        })}
      </g>
    );
  }
  if (kind === 'mountain') {
    const h = R * (1.15 + hash01(i, 4) * 0.25);
    const wd = R * 0.78;
    const bx = x + (hash01(i, 5) - 0.5) * R * 0.16;
    const by = y + R * 0.38 * GROUND_K;
    const tx = bx + wd * 0.05;
    const ty = by - h;
    const snow = h * 0.3;
    return (
      <g pointerEvents="none">
        {/* 奥の小さな峰 */}
        <path d={`M${bx + wd * 0.1} ${by - R * 0.18} L${bx + wd * 0.62} ${by - h * 0.62} L${bx + wd * 1.05} ${by - R * 0.18} Z`} fill="#5a5258" stroke="#1e1a1e" strokeWidth={R * 0.04} strokeLinejoin="round" />
        <path d={`M${bx - wd} ${by} L${tx} ${ty} L${bx + wd} ${by} Z`} fill="#8a8288" stroke="#1e1a1e" strokeWidth={R * 0.05} strokeLinejoin="round" />
        <path d={`M${tx} ${ty} L${bx + wd} ${by} L${bx + wd * 0.15} ${by} Z`} fill="#5e565c" />
        <path d={`M${tx} ${ty} L${tx - wd * (snow / h)} ${ty + snow} L${tx - wd * 0.1} ${ty + snow * 0.75} L${tx + wd * 0.05} ${ty + snow * 1.05} L${tx + wd * (snow / h) * 0.9} ${ty + snow} Z`} fill="#f4f6fa" stroke="#1e1a1e" strokeWidth={R * 0.03} strokeLinejoin="round" />
      </g>
    );
  }
  // 火山: 黒い山と、光る火口
  const h = R * 1.0;
  const wd = R * 0.8;
  const by = y + R * 0.36 * GROUND_K;
  return (
    <g pointerEvents="none">
      <path d={`M${x - wd} ${by} L${x - wd * 0.25} ${by - h} H${x + wd * 0.25} L${x + wd} ${by} Z`} fill="#3a2a28" stroke="#140c0a" strokeWidth={R * 0.05} strokeLinejoin="round" />
      <path d={`M${x + wd * 0.25} ${by - h} L${x + wd} ${by} H${x + wd * 0.3} Z`} fill="#241816" />
      <path d={`M${x - wd * 0.06} ${by - h} L${x - wd * 0.2} ${by - h * 0.55} L${x} ${by - h * 0.7} L${x + wd * 0.12} ${by - h * 0.45} L${x + wd * 0.12} ${by - h}`} fill="none" stroke="#ff8a2a" strokeWidth={R * 0.06} strokeLinecap="round" />
      <ellipse cx={x} cy={by - h} rx={wd * 0.27} ry={R * 0.08} fill="#ffb84a" stroke="#140c0a" strokeWidth={R * 0.03} />
    </g>
  );
}

/** 針葉樹1本（x, y = 根元） */
function Pine({ x, y, h, dark }: { x: number; y: number; h: number; dark: boolean }) {
  const w = h * 0.42;
  const c1 = dark ? '#1f4a2a' : '#2a6034';
  const c2 = dark ? '#14321c' : '#1c4424';
  const st = h * 0.05;
  return (
    <g>
      <ellipse cx={x + w * 0.2} cy={y} rx={w * 0.85} ry={h * 0.1} fill="rgba(0,0,0,.35)" />
      <rect x={x - h * 0.04} y={y - h * 0.16} width={h * 0.08} height={h * 0.16} fill="#4a3018" />
      <path d={`M${x - w} ${y - h * 0.14} L${x} ${y - h * 0.62} L${x + w} ${y - h * 0.14} Z`} fill={c1} stroke="#0a1a0e" strokeWidth={st} strokeLinejoin="round" />
      <path d={`M${x - w * 0.78} ${y - h * 0.46} L${x} ${y - h} L${x + w * 0.78} ${y - h * 0.46} Z`} fill={c1} stroke="#0a1a0e" strokeWidth={st} strokeLinejoin="round" />
      <path d={`M${x} ${y - h} L${x + w * 0.78} ${y - h * 0.46} L${x + w * 0.1} ${y - h * 0.46} Z M${x} ${y - h * 0.62} L${x + w} ${y - h * 0.14} L${x + w * 0.1} ${y - h * 0.14} Z`} fill={c2} />
    </g>
  );
}
