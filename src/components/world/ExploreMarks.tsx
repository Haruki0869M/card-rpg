// ===== 段階6 探索の仕組みの、地図の上の印（仮のミニチュア） =====
// 見晴らしの塔と、時間で消える出現スポット（流れ星・行商人・コソ泥）を、プログラムで描いた簡単な SVG で出す。
// 絵が来たら、この中の Mini を差し替えるだけでよい（ゲームの中身・地図の描き方には触れない）。
import type { SpawnKind, WorldState } from '../../types';
import { spawnTurnsLeft } from '../../engine/game/world/explore';

type Center = (i: number) => { x: number; y: number };

/** 見晴らしの塔（石の塔と小さな旗）。登った後は薄くする */
export function TowerMini({ x, y, R, used }: { x: number; y: number; R: number; used?: boolean }) {
  const h = R * 1.35;
  const bw = R * 0.42;
  const top = y - h * 0.62;
  return (
    <g data-feature="tower:watchtower" data-used={used || undefined} opacity={used ? 0.45 : 1} pointerEvents="none">
      <ellipse cx={x} cy={y + R * 0.38} rx={R * 0.5} ry={R * 0.15} fill="rgba(0,0,0,.5)" />
      {/* 塔の胴（下が少し広い） */}
      <path d={`M${x - bw * 0.62} ${y + R * 0.36} L${x - bw * 0.48} ${top + R * 0.2} L${x + bw * 0.48} ${top + R * 0.2} L${x + bw * 0.62} ${y + R * 0.36} Z`} fill="#b9ab92" stroke="#3a3128" strokeWidth={1.4} />
      <path d={`M${x} ${top + R * 0.2} L${x + bw * 0.48} ${top + R * 0.2} L${x + bw * 0.62} ${y + R * 0.36} L${x} ${y + R * 0.36} Z`} fill="#8f826c" />
      {/* 見張り台と、のこぎりの歯の形の縁 */}
      <rect x={x - bw * 0.68} y={top} width={bw * 1.36} height={R * 0.22} fill="#cbbda2" stroke="#3a3128" strokeWidth={1.4} />
      {[-0.5, 0, 0.5].map((k) => (
        <rect key={k} x={x + bw * k - bw * 0.14} y={top - R * 0.13} width={bw * 0.28} height={R * 0.14} fill="#cbbda2" stroke="#3a3128" strokeWidth={1.2} />
      ))}
      {/* 窓と旗 */}
      <rect x={x - bw * 0.12} y={y - h * 0.22} width={bw * 0.24} height={R * 0.2} rx={bw * 0.12} fill="#2a2018" />
      <line x1={x} y1={top - R * 0.13} x2={x} y2={top - R * 0.55} stroke="#3a3128" strokeWidth={1.4} />
      <path d={`M${x} ${top - R * 0.55} l${R * 0.32} ${R * 0.09} l${-R * 0.32} ${R * 0.09} Z`} fill="#6ac8ff" stroke="#1a3a5a" strokeWidth={1} />
    </g>
  );
}

/** 流れ星の落下地点（光る星と、焦げたくぼみ） */
function StarMini({ x, y, R }: { x: number; y: number; R: number }) {
  const s = R * 0.42;
  const pts = Array.from({ length: 10 }, (_, k) => {
    const a = (Math.PI / 5) * k - Math.PI / 2;
    const r = k % 2 ? s * 0.45 : s;
    return `${x + r * Math.cos(a)},${y - R * 0.15 + r * Math.sin(a)}`;
  }).join(' ');
  return (
    <g>
      <ellipse cx={x} cy={y + R * 0.3} rx={R * 0.48} ry={R * 0.16} fill="#2a1e14" opacity={0.8} />
      <circle cx={x} cy={y - R * 0.15} r={s * 1.35} fill="#fff3a0" opacity={0.35} />
      <polygon points={pts} fill="#ffe35a" stroke="#8a5a00" strokeWidth={1.4} strokeLinejoin="round" />
      <path d={`M${x + s * 0.7} ${y - R * 0.5} l${R * 0.45} ${-R * 0.35}`} stroke="#fff3a0" strokeWidth={R * 0.08} strokeLinecap="round" opacity={0.8} />
    </g>
  );
}

/** さすらいの行商人（しま模様の屋根の荷馬車） */
function PeddlerMini({ x, y, R }: { x: number; y: number; R: number }) {
  const w = R * 0.95;
  const by = y - R * 0.05;
  return (
    <g>
      <ellipse cx={x} cy={y + R * 0.38} rx={R * 0.55} ry={R * 0.14} fill="rgba(0,0,0,.5)" />
      <rect x={x - w / 2} y={by - R * 0.2} width={w} height={R * 0.42} rx={2} fill="#8a5a32" stroke="#3a2412" strokeWidth={1.4} />
      {/* しま模様の屋根 */}
      <path d={`M${x - w * 0.56} ${by - R * 0.2} Q${x} ${by - R * 0.85} ${x + w * 0.56} ${by - R * 0.2} Z`} fill="#f4ead6" stroke="#3a2412" strokeWidth={1.4} />
      {[-0.3, 0, 0.3].map((k) => (
        <path key={k} d={`M${x + w * k - w * 0.07} ${by - R * 0.2} Q${x + w * k * 0.7} ${by - R * 0.7} ${x + w * k + w * 0.07} ${by - R * 0.2} Z`} fill="#d8443a" />
      ))}
      {[-0.28, 0.28].map((k) => (
        <circle key={k} cx={x + w * k} cy={by + R * 0.28} r={R * 0.15} fill="#5a3a1e" stroke="#2a1a0a" strokeWidth={1.4} />
      ))}
    </g>
  );
}

/** 黄金のコソ泥（金貨の袋と、こぼれた金貨） */
function ThiefMini({ x, y, R }: { x: number; y: number; R: number }) {
  const s = R * 0.4;
  return (
    <g>
      <ellipse cx={x} cy={y + R * 0.36} rx={R * 0.45} ry={R * 0.13} fill="rgba(0,0,0,.5)" />
      <path d={`M${x - s * 0.35} ${y - s * 0.9} Q${x - s * 1.2} ${y + s * 0.2} ${x - s * 0.6} ${y + s * 0.8} L${x + s * 0.6} ${y + s * 0.8} Q${x + s * 1.2} ${y + s * 0.2} ${x + s * 0.35} ${y - s * 0.9} Z`} fill="#e8b830" stroke="#6a4a00" strokeWidth={1.4} />
      <path d={`M${x - s * 0.45} ${y - s * 0.85} L${x + s * 0.45} ${y - s * 0.85}`} stroke="#6a4a00" strokeWidth={2} />
      <circle cx={x} cy={y + s * 0.15} r={s * 0.38} fill="#ffe680" stroke="#6a4a00" strokeWidth={1.2} />
      <circle cx={x} cy={y + s * 0.15} r={s * 0.16} fill="none" stroke="#6a4a00" strokeWidth={1} />
      <circle cx={x + s * 1.05} cy={y + s * 0.75} r={s * 0.28} fill="#ffd84a" stroke="#6a4a00" strokeWidth={1} />
      <circle cx={x - s * 1.1} cy={y + s * 0.8} r={s * 0.22} fill="#ffd84a" stroke="#6a4a00" strokeWidth={1} />
    </g>
  );
}

const MINI: Record<SpawnKind, (p: { x: number; y: number; R: number }) => React.JSX.Element> = { star: StarMini, peddler: PeddlerMini, thief: ThiefMini };

/** 出現スポットの印と、消えるまでのターン数（残1は赤） */
export function SpawnMarks({ w, R, center }: { w: WorldState; R: number; center: Center }) {
  return (
    <>
      {(w.spawns ?? []).map((s) => {
        if (!w.tiles[s.tile]?.seen) return null;
        const { x, y } = center(s.tile);
        const left = spawnTurnsLeft(w, s);
        const Mini = MINI[s.kind];
        const fs = Math.max(12, R * 0.42);
        return (
          <g key={s.id} data-spawn={s.kind} data-spawn-left={left} pointerEvents="none">
            <Mini x={x} y={y} R={R} />
            <rect x={x + R * 0.12} y={y - R * 1.02} width={fs * 2.3} height={fs * 1.25} rx={fs * 0.6} fill={left <= 1 ? '#5a0a0a' : '#1a1408'} stroke={left <= 1 ? '#ff8a8a' : '#ffd76a'} strokeWidth={1.5} />
            <text x={x + R * 0.12 + fs * 1.15} y={y - R * 1.02 + fs * 0.95} textAnchor="middle" fontSize={fs} fontWeight={900} fill={left <= 1 ? '#ffb0b0' : '#ffe9a8'}>
              残{left}
            </text>
          </g>
        );
      })}
    </>
  );
}
