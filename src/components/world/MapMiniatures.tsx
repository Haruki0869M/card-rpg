// ===== 世界マップの立体のミニチュア（仮の絵）と、枠から飛び出す木・山 =====
// 絵（Midjourney）が来たら、src/assets/art/ の下に置くだけで差し替わる:
//   場所:   place/event.webp・place/temple.webp・place/altar.webp・place/finale.webp
//   飾り:   prop/forest.webp・prop/mountain.webp・prop/volcano.webp
// 絵が無い間は、ここの SVG の図（仮のミニチュア）を描く。見た目だけで、ゲームの状態には関係しない。
import { artImage } from '../../art';
import { GROUND_K } from './diorama';

/** 場所の種類 → 絵のキー（絵があればそれを使う。イベントは箱庭の試作のテントの絵） */
export type MiniKind = 'event' | 'temple' | 'altar' | 'finale';
export const MINI_ART_KEY: Record<MiniKind, string> = { event: 'landscape/place-tent', temple: 'landscape/place-temple', altar: 'landscape/place-altar', finale: 'landscape/place-finale' };

/**
 * 場所のミニチュア。x, y = マスの上の面の中心、R = マスの半径。
 * 絵があれば絵を、無ければ仮の図を、上の面より上へ飛び出させて立てる
 */
export function PlaceMini({ kind, x, y, R, dim }: { kind: MiniKind; x: number; y: number; R: number; dim?: boolean }) {
  const img = artImage(MINI_ART_KEY[kind]);
  const big = R * (kind === 'finale' ? 1.9 : 1.5);
  if (img)
    return (
      <>
        <image href={img} x={x - big / 2} y={y - big * 0.62} width={big} height={big} filter="url(#place-shadow)" style={dim ? { filter: 'grayscale(1) brightness(.6)' } : undefined} />
        {kind === 'event' && (
          // イベントの印（テントの右上に小さな「？」）
          <g transform={`translate(${(x + big * 0.3).toFixed(1)},${(y - big * 0.5).toFixed(1)}) scale(${(big / 100).toFixed(3)})`}>
            <circle r="11" fill="#1a3a6a" stroke="#9ad8ff" strokeWidth="2.5" />
            <text y="5.5" textAnchor="middle" fontSize="16" fontWeight="900" fill="#e8f6ff">?</text>
          </g>
        )}
      </>
    );
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

/** 祭壇: 苔むした石の段と台、両脇のろうそく、上に浮かぶ光る結晶（細い線で、周りの絵の描き込みに合わせる） */
function AltarShape() {
  return (
    <>
      <defs>
        <radialGradient id="altar-aura">
          <stop offset="0" stopColor="#e6d0ff" stopOpacity=".55" />
          <stop offset="1" stopColor="#b080ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="34" rx="24" ry="20" fill="url(#altar-aura)" />
      {/* 下の段 */}
      <path d="M20 80 L23 72 H77 L80 80 Z" fill="#8a8494" stroke="#2a2232" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M66 72 H77 L80 80 H68 Z" fill="#5e5868" />
      {/* 台 */}
      <path d="M30 72 L32 56 H68 L70 72 Z" fill="#a49cae" stroke="#2a2232" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M59 56 H68 L70 72 H61 Z" fill="#6e667a" />
      <path d="M36 62 H56 M37 66 H55" stroke="#4a4256" strokeWidth=".8" strokeLinecap="round" opacity=".7" />
      <circle cx="46" cy="64" r="2.4" fill="none" stroke="#c8a8ff" strokeWidth=".9" opacity=".8" />
      {/* 天板 */}
      <rect x="28" y="52" width="44" height="5" rx="1" fill="#c4bcce" stroke="#2a2232" strokeWidth="1.2" />
      {/* 苔 */}
      <path d="M23 72 q4 -2 8 0 M70 72 q3 -1.5 6 0 M31 57 q3 -1.5 6 0" stroke="#6a8a4a" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".8" />
      {/* ろうそく */}
      {[24, 74].map((cx) => (
        <g key={cx}>
          <rect x={cx - 1.6} y="64" width="3.2" height="8" rx=".8" fill="#efe6d4" stroke="#5a4a3a" strokeWidth=".6" />
          <ellipse cx={cx} cy="61.5" rx="1.4" ry="2.4" fill="#ffd27a" />
          <circle cx={cx} cy="61.5" r="3.6" fill="#ffb84a" opacity=".3" />
        </g>
      ))}
      {/* 光る結晶 */}
      <path d="M50 16 L57 31 L50 46 L43 31 Z" fill="#e6d4ff" stroke="#4a2a7a" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M50 16 L57 31 L50 46 Z" fill="#a882ee" />
      <path d="M43 31 H57 M50 16 V46" stroke="#fff" strokeWidth=".6" opacity=".55" />
      <circle cx="47" cy="26" r="1.4" fill="#fff" />
      <path d="M38 22 l1.5 1.5 M63 24 l-1.5 1.5 M41 42 l1.2 -1.2" stroke="#f0e4ff" strokeWidth=".9" strokeLinecap="round" opacity=".8" />
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
