// ===== 世界マップの地図（六角形のマス。spec §8.1）=====
// 地形・霧・施設・移動できる範囲は SVG、キャラと敵は上に重ねた画像。タップしたマスを親に知らせる。
import { Castle, CircleHelp, DoorOpen, Flag, Gift, House, Landmark, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react';
import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { artImage, EnemyArt } from '../../art';
import { DUNGEONS } from '../../data/dungeons';
import { getTerrain, QUESTS, TERRAINS, TOWNS } from '../../data/world';
import { colOf, objectiveHandler, rowOf, timeOfDay } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import type { GameState, WorldState } from '../../types';
import { HeroFace } from '../ui/game';

const SQRT3 = Math.sqrt(3);

/** 地形の模様（地形のデータの decor のキー → 小さな絵。中心が0,0・半径24の大きさで書く） */
const TERRAIN_DECOR: Record<string, { d: string; stroke: string; fill?: string }> = {
  grass: { d: 'M-9 4 l2 -5 M-1 6 l2 -6 M7 3 l2 -5', stroke: '#9cc86a' },
  trees: { d: 'M-8 6 L-3 -6 L2 6 Z M2 8 L7 -3 L12 8 Z', stroke: '#173a20', fill: '#245a2e' },
  reeds: { d: 'M-6 7 V-4 M-2 7 V-7 M2 7 V-3 M6 7 V-6', stroke: '#8a9a5a' },
  hills: { d: 'M-11 6 Q-5 -4 1 6 M-1 6 Q5 -2 11 6', stroke: '#5a4a2a' },
  peaks: { d: 'M-11 8 L-3 -8 L5 8 Z M-5 -4 L-3 -8 L-1 -4 Z M2 8 L8 -2 L13 8 Z', stroke: '#3a3438', fill: '#8a8088' },
  cracks: { d: 'M-10 -2 L-4 2 L0 -3 L5 2 L10 -1', stroke: '#2a1e1c' },
  lava: { d: 'M-8 2 Q-2 -6 4 2 Q8 6 10 0', stroke: '#ffd04a' },
  waves: { d: 'M-10 -2 Q-6 -6 -2 -2 T6 -2 M-6 5 Q-2 1 2 5 T10 5', stroke: '#8ac8ff' },
};

const FEATURE_ICON: Record<string, LucideIcon> = { town: House, dungeon: DoorOpen, shrine: Sparkles, event: CircleHelp, chest: Gift, landmark: Landmark };
const FEATURE_COLOR: Record<string, string> = { town: '#ffe9a8', dungeon: '#ff9a7a', shrine: '#9affd0', event: '#9ad8ff', chest: '#ffd76a', landmark: '#d8c8ff' };

/** 地図の場所の絵（無ければ undefined → アイコンで描く） */
function placeImage(f: NonNullable<WorldState['tiles'][number]['f']>): string | undefined {
  if (f.kind === 'town') return artImage(TOWNS.tryGet(f.id)?.capital ? 'place/capital' : 'place/town');
  if (f.kind === 'chest') return artImage(`chest/${f.chest?.rarity ?? 'common'}`);
  if (f.kind === 'dungeon' || f.kind === 'shrine' || f.kind === 'landmark') return artImage(`place/${f.kind}`);
  return undefined;
}

export interface MapGeom {
  R: number;
  hexW: number;
  rowH: number;
  W: number;
  H: number;
  center: (i: number) => { x: number; y: number };
}

export function useMapGeom(w: Pick<WorldState, 'width' | 'height'>, containerW: number): MapGeom {
  return useMemo(() => {
    const R = Math.max(18, Math.min(34, (containerW || 360) / (SQRT3 * (w.width + 0.5))));
    const hexW = SQRT3 * R;
    const rowH = 1.5 * R;
    return {
      R,
      hexW,
      rowH,
      W: hexW * (w.width + 0.5),
      H: rowH * (w.height - 1) + 2 * R,
      center: (i: number) => {
        const c = colOf(w, i);
        const r = rowOf(w, i);
        return { x: hexW * (c + 0.5 * (r & 1)) + hexW / 2, y: R + r * rowH };
      },
    };
  }, [w, containerW]);
}

const hexPoints = (x: number, y: number, R: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90);
    return `${(x + R * Math.cos(a)).toFixed(1)},${(y + R * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

/** 地形と霧（キャラの移動以外では変わりにくいので、タイルの見え方が変わった時だけ描き直す） */
const TerrainLayer = memo(function TerrainLayer({ tiles, geom }: { tiles: WorldState['tiles']; geom: MapGeom }) {
  const { R, center } = geom;
  const s = R / 24;
  // 地形の模様（描いた絵）。並べてもつなぎ目が出ない絵を、マス2つ分くらいの大きさで敷く
  const size = R * 4;
  return (
    <g>
      <defs>
        {TERRAINS.all.map((t) => {
          const url = artImage(`terrain/${t.id}`);
          return url ? (
            <pattern key={t.id} id={`ter-${t.id}`} patternUnits="userSpaceOnUse" width={size} height={size}>
              <rect width={size} height={size} fill={t.color} />
              <image href={url} width={size} height={size} preserveAspectRatio="none" opacity={0.68} />
            </pattern>
          ) : null;
        })}
      </defs>
      {tiles.map((t, i) => {
        const { x, y } = center(i);
        if (!t.seen) return <polygon key={i} points={hexPoints(x, y, R - 0.5)} fill="#141019" stroke="#221c2a" strokeWidth={1} />;
        const ter = getTerrain(t.t);
        const tex = !!artImage(`terrain/${ter.id}`);
        // 絵がある地形は模様で分かるので、小さな印は出さない
        const dec = !tex && ter.decor ? TERRAIN_DECOR[ter.decor] : undefined;
        return (
          <g key={i}>
            <polygon points={hexPoints(x, y, R - 0.5)} fill={tex ? `url(#ter-${ter.id})` : ter.color} stroke="rgba(0,0,0,.5)" strokeWidth={1.2} />
            {dec && <path d={dec.d} transform={`translate(${x},${y}) scale(${s})`} stroke={dec.stroke} fill={dec.fill ?? 'none'} strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />}
          </g>
        );
      })}
    </g>
  );
});

/** 霧が晴れたマスの数（地形の層を描き直すかどうかの目安） */
const seenKey = (w: WorldState) => w.tiles.reduce((n, t) => n + (t.seen ? 1 : 0), 0);

export function WorldMap({
  game,
  reach,
  selected,
  path,
  onTapTile,
}: {
  game: GameState;
  /** 移動できるマス（マス → 必要な移動力） */
  reach?: Map<number, number>;
  selected?: number;
  path?: number[];
  onTapTile: (i: number) => void;
}) {
  const w = game.world!;
  const [box, size] = useElementSize<HTMLDivElement>();
  const geom = useMapGeom(w, size.width);
  const { R, W, H, center } = geom;
  // 霧が晴れた時だけ地形の層を作り直す（それ以外は前の層を使い回す）
  const tilesRef = useRef(w.tiles);
  const key = seenKey(w) + ':' + w.tiles.length;
  const lastKey = useRef(key);
  if (lastKey.current !== key) {
    lastKey.current = key;
    tilesRef.current = w.tiles;
  }

  // 手番のキャラが見えるようにスクロール
  const here = w.pos[w.turn];
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || here === undefined || !size.width) return;
    const { x, y } = center(here);
    el.scrollTo({ top: y - el.clientHeight / 2, left: x - el.clientWidth / 2, behavior: 'smooth' });
  }, [here, w.turn, size.width, center]);

  // 依頼の目的地
  const questTargets = useMemo(() => {
    const ids = new Set<string>();
    for (const q of w.quests) {
      if (q.done) continue;
      const def = QUESTS.get(q.id);
      const t = objectiveHandler(def.objective).target?.(def.objective as never);
      if (t) ids.add(t);
    }
    return ids;
  }, [w.quests]);

  const tap = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = -1;
    let bd = Infinity;
    for (let i = 0; i < w.tiles.length; i++) {
      const c = center(i);
      const d = (c.x - px) ** 2 + (c.y - py) ** 2;
      if (d < bd) (bd = d), (best = i);
    }
    if (best >= 0 && bd <= R * R) onTapTile(best);
  };

  const night = timeOfDay(w.worldTurn);
  const tint =
    night === 'night' ? 'rgba(12,18,60,.42)' : night === 'evening' ? 'rgba(255,110,40,.14)' : night === 'morning' ? 'rgba(255,230,180,.06)' : 'transparent';

  // 同じマスのキャラは少しずらして並べる
  const heroSpots = useMemo(() => {
    const byTile = new Map<number, string[]>();
    for (const [id, t] of Object.entries(w.pos)) byTile.set(t, [...(byTile.get(t) ?? []), id]);
    return byTile;
  }, [w.pos]);

  return (
    <div className="relative min-h-0 flex-1">
    <div ref={box} className="absolute inset-0 overflow-auto overscroll-contain bg-[#0b0910]" data-world-map>
      <div className="relative" style={{ width: W, height: H }} onClick={tap}>
        <svg width={W} height={H} className="absolute inset-0 block">
          <defs>
            <filter id="place-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".85" />
            </filter>
          </defs>
          <TerrainLayer tiles={tilesRef.current} geom={geom} />
          {/* 移動できるマス */}
          {reach &&
            [...reach].map(([i, cost]) => {
              if (i === here) return null;
              const { x, y } = center(i);
              return (
                <g key={`r${i}`} data-reach={i} data-cost={cost}>
                  <polygon points={hexPoints(x, y, R - 3)} fill="rgba(255,240,180,.16)" stroke="rgba(255,214,110,.75)" strokeWidth={1.5} />
                  <text x={x} y={y + R * 0.62} textAnchor="middle" fontSize={Math.max(12, R * 0.42)} fontWeight={800} fill="#fff3c4" stroke="#000" strokeWidth={2.5} paintOrder="stroke">
                    {cost}
                  </text>
                </g>
              );
            })}
          {/* 経路 */}
          {path && path.length > 0 && here !== undefined && (
            <polyline
              points={[here, ...path].map((i) => `${center(i).x},${center(i).y}`).join(' ')}
              fill="none"
              stroke="#ffd76a"
              strokeWidth={Math.max(3, R * 0.16)}
              strokeDasharray={`${R * 0.3} ${R * 0.2}`}
              strokeLinecap="round"
            />
          )}
          {selected !== undefined && <polygon points={hexPoints(center(selected).x, center(selected).y, R - 2)} fill="none" stroke="#fff" strokeWidth={3} />}
          {/* 施設 */}
          {w.tiles.map((t, i) => {
            if (!t.seen || !t.f) return null;
            const { x, y } = center(i);
            const f = t.f;
            const finale = f.kind === 'dungeon' && DUNGEONS.tryGet(f.id)?.finale;
            const Icon = finale ? Castle : FEATURE_ICON[f.kind] ?? CircleHelp;
            const fallen = f.kind === 'town' && w.fallenTowns.includes(f.id);
            const used = f.used && f.kind !== 'town' && f.kind !== 'dungeon';
            const sz = R * (f.kind === 'town' || finale ? 1.15 : 0.95);
            const color = fallen ? '#7a6a7a' : f.kind === 'chest' && f.chest?.rarity ? undefined : FEATURE_COLOR[f.kind];
            const img = finale ? undefined : placeImage(f);
            if (img) {
              // 描いた絵の場所: マスより少し大きく、影をつけて地形から浮かせる
              const big = R * (f.kind === 'town' ? 1.75 : f.kind === 'chest' ? 1.25 : 1.55);
              return (
                <g key={`f${i}`} opacity={used ? 0.4 : 1} data-feature={`${f.kind}:${f.id}`} data-used={used || undefined}>
                  <ellipse cx={x} cy={y + big * 0.33} rx={big * 0.42} ry={big * 0.13} fill="rgba(0,0,0,.55)" />
                  <image href={img} x={x - big / 2} y={y - big * 0.58} width={big} height={big} filter="url(#place-shadow)" style={fallen ? { filter: 'grayscale(1) brightness(.6)' } : undefined} />
                  {questTargets.has(f.id) && <Flag x={x + big * 0.12} y={y - big * 0.75} width={R * 0.6} height={R * 0.6} color="#ff6a8a" fill="#ff6a8a" />}
                </g>
              );
            }
            return (
              <g key={`f${i}`} opacity={used ? 0.35 : 1} data-feature={`${f.kind}:${f.id}`} data-used={used || undefined}>
                <circle cx={x} cy={y} r={sz * 0.62} fill="rgba(0,0,0,.55)" />
                <Icon x={x - sz / 2} y={y - sz / 2} width={sz} height={sz} color={color ?? '#ffd76a'} strokeWidth={2.2} />
                {questTargets.has(f.id) && <Flag x={x + sz * 0.15} y={y - sz * 0.95} width={sz * 0.6} height={sz * 0.6} color="#ff6a8a" fill="#ff6a8a" />}
              </g>
            );
          })}
          {/* 襲撃されている町 */}
          {w.raids.map((r) => {
            const i = w.tiles.findIndex((t) => t.f?.kind === 'town' && t.f.id === r.townId);
            if (i < 0 || !w.tiles[i].seen) return null;
            const { x, y } = center(i);
            return (
              <g key={`raid${r.townId}`}>
                <TriangleAlert x={x - R * 0.9} y={y - R * 1.1} width={R * 0.7} height={R * 0.7} color="#ff4a4a" fill="#3a0808" />
                <text x={x + R * 0.1} y={y - R * 0.55} fontSize={Math.max(12, R * 0.45)} fontWeight={900} fill="#ff8a8a" stroke="#000" strokeWidth={3} paintOrder="stroke">
                  残{Math.max(0, r.deadline - w.worldTurn + 1)}
                </text>
              </g>
            );
          })}
        </svg>
        {/* 徘徊する敵 */}
        {w.wanderers.map((wd) => {
          if (!w.tiles[wd.tile].seen) return null;
          const { x, y } = center(wd.tile);
          const s = R * 1.6;
          return (
            <div
              key={wd.id}
              className="pointer-events-none absolute"
              data-wanderer={wd.id}
              style={{ left: x - s / 2, top: y - s * 0.62, width: s, height: s, filter: wd.raidTown ? 'drop-shadow(0 0 6px #ff3a3a)' : 'drop-shadow(0 2px 2px #000)' }}
            >
              {/* 地形の模様の上でも見えるように、暗い円と赤い縁を敷く */}
              <span className="absolute inset-[8%] rounded-full border-2 border-red-500/80 bg-[#140a10]/80" />
              <EnemyArt defId={wd.enemies[0].defId} className="relative h-full w-full" />
              <span className="absolute -right-1 bottom-0 rounded-full border border-red-300 bg-red-950/90 px-1 text-[12px] leading-4 font-black text-red-200">
                {wd.enemies.length > 1 ? `×${wd.enemies.length}` : `Lv${wd.enemies[0].level ?? 1}`}
              </span>
            </div>
          );
        })}
        {/* 倒れている仲間（M3-C5）: 灰色の顔と×印。同じマスに行けば助け起こせる */}
        {Object.entries(w.downed ?? {}).map(([id, tile]) => {
          const h = game.heroes.find((x) => x.id === id);
          if (!h || !w.tiles[tile]?.seen) return null;
          const { x, y } = center(tile);
          const s = R * 0.95;
          return (
            <div key={`down-${id}`} data-downed={id} className="pointer-events-none absolute" style={{ left: x - s / 2 + R * 0.35, top: y - s / 2 + R * 0.3, width: s, height: s, zIndex: 1 }}>
              <HeroFace hero={h} size={s} dim />
              <span className="absolute -right-1 -bottom-1 rounded-full bg-red-900 px-1 text-[11px] leading-4 font-black text-red-100">倒</span>
            </div>
          );
        })}
        {/* キャラ */}
        {[...heroSpots].map(([tile, ids]) =>
          ids.map((id, k) => {
            const h = game.heroes.find((x) => x.id === id);
            if (!h) return null;
            const { x, y } = center(tile);
            const s = R * (ids.length > 1 ? 0.95 : 1.2);
            const off = ids.length > 1 ? (k - (ids.length - 1) / 2) * s * 0.55 : 0;
            const active = id === w.turn;
            return (
              <div
                key={id}
                data-hero={id}
                className={`pointer-events-none absolute rounded-full ${active ? 'glow-pulse' : ''}`}
                style={{
                  left: x - s / 2 + off,
                  top: y - s / 2 - (ids.length > 1 ? (k % 2) * s * 0.25 : 0),
                  width: s,
                  height: s,
                  zIndex: active ? 3 : 2,
                  boxShadow: active ? '0 0 0 3px #ffd76a, 0 0 12px #ffd76a' : '0 2px 4px #000',
                  opacity: w.acted.includes(id) && !active ? 0.7 : 1,
                  transition: 'left .35s ease-out, top .35s ease-out',
                }}
              >
                <HeroFace hero={h} size={s} />
              </div>
            );
          }),
        )}
      </div>
    </div>
      {/* 時間帯と侵食度の色（地図の上に重ねる。タップは通す） */}
      <div className="pointer-events-none absolute inset-0" style={{ background: tint }} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(90,20,110,${(w.corruption / 100) * 0.55}) 100%)` }}
      />
    </div>
  );
}
