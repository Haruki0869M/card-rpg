// ===== 見取り図（段階6a・overhaul-plan-v2 §2-4）=====
// 大陸全体を1画面に出す（真上から見た平らな六角形。地形は色だけ、街道は線）。箱庭の絵は描かないので軽い。
// 印: 自分たち（席の色）・町・鍵のダンジョン（制覇は✓）・次の目的地（光る）・見つけた塔・ランダムダンジョン・💀災厄の中ボス（段階7b。見えている所だけ）。霧の中は暗いまま。
// 印（どのマスでも）を押すと、見取り図を閉じて、その場所へ地図を動かす。ゲームの状態は変えない（見るだけ）。
import { Binoculars, Castle, Check, DoorOpen, House, X } from 'lucide-react';
import { useMemo } from 'react';
import { DUNGEONS } from '../../data/dungeons';
import { getScenario } from '../../data/scenarios';
import { TERRAINS, TOWNS } from '../../data/world';
import { aliveScourges, colOf, nextGoalDungeon, randomDungeonView, rowOf } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import type { GameState, Tile } from '../../types';
import { PLAYER_COLORS } from './pieceLayout';

const SQRT3 = Math.sqrt(3);
/** 霧の中のマスの色 */
const FOG = '#22202e';

interface Mark {
  tile: number;
  kind: 'town' | 'dungeon' | 'finale' | 'random' | 'tower' | 'scourge';
  label: string;
  done?: boolean;
  fallen?: boolean;
  /** ランダムダンジョンのテーマの印（💎・⛓・🗡。段階7a） */
  mark?: string;
}

export function Overview({ game, onPick, onClose }: { game: GameState; onPick: (tile: number) => void; onClose: () => void }) {
  const w = game.world!;
  const [box, size] = useElementSize<HTMLDivElement>();
  const road = getScenario(game.scenarioId).map?.roadTerrain ?? 'road';
  // 枠に収まるマスの半径（平らな六角形: 幅 √3·R·(列+0.5)、高さ 1.5·R·(行-1)+2R）
  const R = Math.max(2, Math.min(size.width / (SQRT3 * (w.width + 0.5)), size.height / (1.5 * (w.height - 1) + 2)));
  const hexW = SQRT3 * R;
  const W = hexW * (w.width + 0.5);
  const H = 1.5 * R * (w.height - 1) + 2 * R;
  const at = (i: number) => {
    const c = colOf(w, i), r = rowOf(w, i);
    return { x: hexW * (c + 0.5 * (r & 1)) + hexW / 2, y: R + r * 1.5 * R };
  };
  const hex = (x: number, y: number, r: number) => Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k - Math.PI / 2;
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

  // 地形の色（街道は下の地形の代わりに平原の色。線は別に描く）
  const cells = useMemo(() => w.tiles.map((t) => (t.seen ? (t.t === road ? TERRAINS.tryGet('plains')?.color ?? '#6f9a4a' : TERRAINS.get(t.t).color) : FOG)), [w.tiles, road]);
  // 街道の線（見えている道のマスどうしと、道の上の町・ダンジョン・名所）
  const onRoad = (t: Tile) => t.t === road || t.f?.kind === 'town' || t.f?.kind === 'dungeon' || t.f?.kind === 'landmark';
  const roadLines = useMemo(() => {
    const out: [number, number][] = [];
    w.tiles.forEach((t, i) => {
      if (!t.seen || !onRoad(t)) return;
      const c = colOf(w, i), r = rowOf(w, i);
      // 右・右下・左下の3方向だけ見る（同じ線を2回描かない）
      const odd = r & 1;
      for (const [dc, dr] of [[1, 0], [odd ? 1 : 0, 1], [odd ? 0 : -1, 1]]) {
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || cc >= w.width || rr >= w.height) continue;
        const j = rr * w.width + cc;
        const u = w.tiles[j];
        if (!u.seen) continue;
        if (onRoad(u) && (t.t === road || u.t === road)) out.push([i, j]);
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, road]);

  const goal = nextGoalDungeon(game);
  const marks = useMemo(() => {
    const out: Mark[] = [];
    w.tiles.forEach((t, i) => {
      const f = t.f;
      if (!f) return;
      // 次の目的地だけは、霧の中でも印を出す（町で聞いた行き先）
      if (!t.seen && !(f.kind === 'dungeon' && f.id === goal)) return;
      if (f.kind === 'town') out.push({ tile: i, kind: 'town', label: TOWNS.tryGet(f.id)?.name ?? f.id, fallen: w.fallenTowns.includes(f.id) });
      else if (f.kind === 'tower') out.push({ tile: i, kind: 'tower', label: '見晴らしの塔', done: f.used });
      else if (f.kind === 'dungeon') {
        const d = DUNGEONS.tryGet(f.id);
        if (!d) return;
        // ランダムダンジョン（段階7a）: テーマの印つきの名前・踏破済みはマスごと（同じ洞窟が2か所ある）
        const rd = randomDungeonView(w, i);
        if (rd) out.push({ tile: i, kind: 'random', label: `${rd.theme?.mark ?? ''}${rd.name}`, done: rd.done, mark: rd.theme?.mark });
        else out.push({ tile: i, kind: d.finale ? 'finale' : 'dungeon', label: d.name, done: game.clearedDungeons.includes(f.id) });
      }
    });
    // 災厄の中ボス（段階7b）: 場所が見えている物だけ（霧の中は出さない。見晴らしの塔に登ると見える）
    for (const { wd, def } of aliveScourges(w)) if (w.tiles[wd.tile].seen) out.push({ tile: wd.tile, kind: 'scourge', label: def.name, mark: '💀' });
    return out;
  }, [w, goal, game.clearedDungeons]);
  const goalTile = goal ? w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === goal) : -1;
  // 自分たち（同じマスの人は少しずらす）
  const heroes = game.heroes.filter((h) => !h.retired && w.pos[h.id] !== undefined);
  const byTile = new Map<number, typeof heroes>();
  for (const h of heroes) byTile.set(w.pos[h.id], [...(byTile.get(w.pos[h.id]) ?? []), h]);

  const icon = (m: Mark) => (m.kind === 'town' ? House : m.kind === 'finale' ? Castle : m.kind === 'tower' ? Binoculars : DoorOpen);
  const color = (m: Mark) => (m.fallen ? '#7a6a7a' : m.kind === 'scourge' ? '#e070ff' : m.kind === 'town' ? '#ffe9a8' : m.kind === 'finale' ? '#ff6a5a' : m.kind === 'tower' ? '#e8e0c8' : m.kind === 'random' ? '#c8a0ff' : '#ff9a7a');
  // 印の大きさ（小さい画面でも押せるように、マスより大きく描く。押せる所はさらに大きい）
  const M = Math.max(14, R * 1.9);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#0b0910]/95" role="dialog" aria-label="見取り図" data-overview>
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
        <div className="min-w-0 flex-1 leading-4">
          <div className="font-display text-[16px] text-amber-100">見取り図</div>
          <div className="truncate text-[12px] text-zinc-400">印を押すと、その場所へ地図を動かします</div>
        </div>
        <button onClick={onClose} aria-label="見取り図を閉じる" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-full" data-overview-close>
          <X size={20} className="text-amber-200" />
        </button>
      </div>
      <div ref={box} className="relative mx-3 mb-3 min-h-0 flex-1">
        {size.width > 0 && (
          <svg
            width={W}
            height={H}
            className="absolute block"
            style={{ left: (size.width - W) / 2, top: (size.height - H) / 2 }}
            data-overview-map
            onClick={(e) => {
              // 印でない所を押した時: 一番近いマス
              const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
              const px = e.clientX - rect.left, py = e.clientY - rect.top;
              let best = -1, bd = Infinity;
              for (let i = 0; i < w.tiles.length; i++) {
                const p = at(i);
                const d = (p.x - px) ** 2 + (p.y - py) ** 2;
                if (d < bd) (bd = d), (best = i);
              }
              if (best >= 0) onPick(best);
            }}
          >
            {cells.map((c, i) => {
              const p = at(i);
              return <polygon key={i} points={hex(p.x, p.y, R * 1.02)} fill={c} />;
            })}
            {roadLines.map(([a, b]) => {
              const p = at(a), q = at(b);
              return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#f0dca0" strokeWidth={Math.max(1.5, R * 0.4)} strokeLinecap="round" />;
            })}
            {goalTile >= 0 && (
              <circle cx={at(goalTile).x} cy={at(goalTile).y} r={M * 0.85} fill="none" stroke="#ffe066" strokeWidth={3} className="glow-pulse" data-overview-goal={goal} />
            )}
            {marks.map((m) => {
              const p = at(m.tile);
              const Icon = icon(m);
              return (
                <g key={`m${m.tile}`} data-overview-mark={m.kind} data-tile={m.tile} aria-label={m.label} style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); onPick(m.tile); }}>
                  <circle cx={p.x} cy={p.y} r={M * 0.75} fill="transparent" />
                  <circle cx={p.x} cy={p.y} r={M * 0.5} fill="rgba(0,0,0,.7)" stroke={color(m)} strokeWidth={1.2} />
                  {m.mark ? (
                    <text x={p.x} y={p.y + M * 0.22} textAnchor="middle" fontSize={M * 0.62} data-overview-theme={m.mark}>{m.mark}</text>
                  ) : (
                    <Icon x={p.x - M * 0.33} y={p.y - M * 0.33} width={M * 0.66} height={M * 0.66} color={color(m)} strokeWidth={2.4} />
                  )}
                  {m.done && m.kind !== 'tower' && (
                    <g data-overview-cleared>
                      <circle cx={p.x + M * 0.42} cy={p.y - M * 0.42} r={M * 0.3} fill="#2f8a3a" />
                      <Check x={p.x + M * 0.42 - M * 0.22} y={p.y - M * 0.42 - M * 0.22} width={M * 0.44} height={M * 0.44} color="#fff" strokeWidth={3.5} />
                    </g>
                  )}
                </g>
              );
            })}
            {[...byTile].map(([tile, hs]) => {
              const p = at(tile);
              return hs.map((h, k) => (
                <circle key={h.id} cx={p.x + (k - (hs.length - 1) / 2) * M * 0.35} cy={p.y + M * 0.55} r={Math.max(4, M * 0.22)} fill={PLAYER_COLORS[h.playerId]} stroke="#fff" strokeWidth={1.5} data-overview-hero={h.id}
                  onClick={(e) => { e.stopPropagation(); onPick(tile); }} />
              ));
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
