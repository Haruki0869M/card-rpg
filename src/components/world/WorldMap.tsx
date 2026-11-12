// ===== 世界マップの地図（六角形のマス。spec §8.1）=====
// 地形・霧・施設・移動できる範囲は SVG、キャラと敵は上に重ねた画像。タップしたマスを親に知らせる。
import { CircleHelp, DoorOpen, Flag, Gift, House, Landmark, LocateFixed, Minus, Plus, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { artImage, EnemyArt } from '../../art';
import { DUNGEONS } from '../../data/dungeons';
import { getTerrain, QUESTS, TERRAINS, TOWNS } from '../../data/world';
import { colOf, objectiveHandler, partySenses, rowOf, timeOfDay } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import { speedFactor, useBattle } from '../../store/battleStore';
import { TIMING } from '../../data/balance';
import { getScenario } from '../../data/scenarios';
import type { GameState, TimeOfDay, WorldState } from '../../types';
import { BASE_DEPTH, corruptionStage, GROUND_K, hash01, hexVerts, LEVEL_STEP, MAX_LEVEL, pts, roadLinks, terrainLevel, tileLevel, TOP_SCALE } from './diorama';
import { PlaceMini, type MiniKind } from './MapMiniatures';
import { FogSilhouettes, LandscapeLayer } from './landscape/LandscapeLayer';
import { riverLinks, scatter } from './landscape/scatter';
import { DepthFront, FRONT_FADE, type FrontSpot, type FrontTint } from './DepthFront';
import { FogSea } from './FogSea';
import { HeroFace } from '../ui/game';
import { petSpot, PetToken } from '../ui/PetToken';
import { HeroPiece } from './HeroPiece';
import { SpawnMarks, TowerMini } from './ExploreMarks';
import { orderOnTile, pieceSpots, PLAYER_COLORS } from './pieceLayout';
import { cameraTop, mapPadBottom, mapPadY, revealLeft, revealTop, visibleH } from './mapCamera';
import { anchorScroll, clampZoom, stepZoom, ZOOM_MAX, ZOOM_MIN } from './mapZoom';

const SQRT3 = Math.sqrt(3);

const FEATURE_ICON: Record<string, LucideIcon> = { town: House, dungeon: DoorOpen, shrine: Sparkles, event: CircleHelp, chest: Gift, landmark: Landmark, temple: Landmark, altar: Sparkles };
const FEATURE_COLOR: Record<string, string> = { town: '#ffe9a8', dungeon: '#ff9a7a', shrine: '#9affd0', event: '#9ad8ff', chest: '#ffd76a', landmark: '#d8c8ff', temple: '#ffe9a8', altar: '#c8a0ff' };

/** 地図の場所の絵（無ければ undefined → アイコンで描く） */
function placeImage(f: NonNullable<WorldState['tiles'][number]['f']>): string | undefined {
  // 箱庭の試作の絵（ChatGPT。墨線＋淡い水彩）があれば、それを使う
  const capital = !!(f.kind === 'town' && TOWNS.tryGet(f.id)?.capital);
  const box = f.kind === 'town' ? artImage(capital ? 'landscape/place-capital' : 'landscape/place-town') : f.kind === 'shrine' ? artImage('landscape/place-shrine') : undefined;
  if (box) return box;
  if (f.kind === 'town') return artImage(capital ? 'place/capital' : 'place/town');
  if (f.kind === 'chest') return artImage(`chest/${f.chest?.rarity ?? 'common'}`);
  if (f.kind === 'dungeon' || f.kind === 'shrine' || f.kind === 'landmark') return artImage(`place/${f.kind}`);
  return undefined;
}

/** 夜・夕方の明かり（場所の種類 → 色と大きさ（R に対する半径）） */
/** 施設のあるマス: 建物を少し奥（上）へ、駒を少し手前（下）へずらす（R を1とする。駒は奥行きの縮みも掛ける） */
const FACILITY_LIFT = 0.22;
const FACILITY_FRONT = 0.85;

const GLOW: Record<string, { color: string; r: number }> = {
  town: { color: 'rgba(255,196,110,.85)', r: 1.7 },
  shrine: { color: 'rgba(150,255,210,.7)', r: 1.2 },
  temple: { color: 'rgba(255,233,168,.75)', r: 1.3 },
  altar: { color: 'rgba(200,160,255,.75)', r: 1.3 },
  // 旅のテントのランタン
  event: { color: 'rgba(255,176,84,.8)', r: 1.1 },
  finale: { color: 'rgba(255,80,50,.7)', r: 1.6 },
};

/**
 * 時間帯の光。wash = 地図の上に重ねる色（地図といっしょに動く）、glow = 明かりの強さ（0 = 出さない）。
 * 朝は左上からの斜めの光の筋、夕方はオレンジ、夜は青い月明かり（前より、はっきり変える）
 */
function timeLight(time: TimeOfDay, R: number): { wash?: string; glow: number } {
  const band = (c: string, a: number) =>
    `repeating-linear-gradient(115deg, rgba(${c},0) 0px, rgba(${c},${a}) ${(R * 1.6).toFixed(0)}px, rgba(${c},0) ${(R * 3.2).toFixed(0)}px, rgba(${c},0) ${(R * 5.5).toFixed(0)}px)`;
  if (time === 'morning') return { wash: `${band('255,226,160', 0.2)}, linear-gradient(rgba(255,214,160,.1), rgba(255,214,160,.1))`, glow: 0 };
  if (time === 'evening') return { wash: 'linear-gradient(170deg, rgba(255,150,60,.3), rgba(220,80,60,.34))', glow: 0.55 };
  if (time === 'night') return { wash: `${band('150,180,255', 0.09)}, linear-gradient(rgba(6,14,58,.58), rgba(6,14,58,.58))`, glow: 1 };
  return { glow: 0 };
}

/** 魔物の駒の台座（赤。レアは金）。glow = 周りの光（襲撃・レア） */
function EnemyBase({ color, s, glow }: { color: string; s: number; glow?: string }) {
  return (
    <svg className="absolute" style={{ left: s * 0.1, top: s * 0.66, width: s * 0.8, height: s * 0.32, overflow: 'visible', filter: glow ? `drop-shadow(0 0 5px ${glow})` : undefined }} viewBox="0 0 100 40" aria-hidden>
      <ellipse cx="54" cy="31" rx="50" ry="11" fill="rgba(0,0,0,.5)" />
      <ellipse cx="50" cy="27" rx="47" ry="12" fill={color} stroke="#1a0606" strokeWidth="2" />
      <rect x="3" y="14" width="94" height="13" fill={color} />
      <rect x="3" y="14" width="94" height="13" fill="rgba(0,0,0,.35)" />
      <line x1="3" y1="14" x2="3" y2="27" stroke="#1a0606" strokeWidth="2" />
      <line x1="97" y1="14" x2="97" y2="27" stroke="#1a0606" strokeWidth="2" />
      <ellipse cx="50" cy="14" rx="47" ry="12" fill={color} stroke="#1a0606" strokeWidth="2" />
      <ellipse cx="50" cy="13" rx="36" ry="8" fill="rgba(255,255,255,.18)" />
    </svg>
  );
}

export interface MapGeom {
  R: number;
  hexW: number;
  rowH: number;
  W: number;
  H: number;
  /** マスの上の面の中心（高さの分だけ上へ持ち上げた位置。駒・光るマス・カメラもここを使う） */
  center: (i: number) => { x: number; y: number };
  /** 高さ0の床の上の中心（高さで持ち上げない位置。雲の海はここに置く） */
  ground: (i: number) => { x: number; y: number };
}

/**
 * zoom: 世界マップの拡大（1 = 今までの大きさ）。枠の幅から決めた1倍のマスの半径に掛ける。
 * levels: マスごとの高さ（0〜3。箱庭の六角柱）。無ければ全部 0
 */
export function useMapGeom(w: Pick<WorldState, 'width' | 'height'>, containerW: number, zoom = 1, levels?: readonly number[]): MapGeom {
  return useMemo(() => {
    const R = Math.max(18, Math.min(34, (containerW || 360) / (SQRT3 * (w.width + 0.5)))) * zoom;
    const hexW = SQRT3 * R;
    const rowH = 1.5 * R; // 地面をつぶす前の行の間隔（つぶした後は rowH * GROUND_K）
    // 一番上の行の高い山も切れないように、上に「一番高い段」の分の余白を足す。下は六角柱の土台の分
    const top = MAX_LEVEL * LEVEL_STEP * R;
    const dims = { width: w.width, height: w.height };
    const ground = (i: number) => {
      const c = colOf(dims, i);
      const r = rowOf(dims, i);
      return { x: hexW * (c + 0.5 * (r & 1)) + hexW / 2, y: top + (R + r * rowH) * GROUND_K };
    };
    return {
      R,
      hexW,
      rowH,
      W: hexW * (w.width + 0.5),
      H: (rowH * (w.height - 1) + 2 * R) * GROUND_K + top + BASE_DEPTH * R,
      ground,
      center: (i: number) => {
        const g = ground(i);
        return { x: g.x, y: g.y - (levels?.[i] ?? 0) * LEVEL_STEP * R };
      },
    };
    // 地図の大きさ（幅・高さ）だけを見る。ゲームの状態が変わるたびに作り直すと、地形と雲の層まで描き直しになる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.width, w.height, containerW, zoom, levels]);
}

const hexPoints = (x: number, y: number, R: number) => pts(hexVerts(x, y, R));

/** 水面のきらめき（水・海のマスの上の方に光の帯。この層の透明度だけを CSS で変える） */
const WaterLayer = memo(function WaterLayer({ tiles, geom, levels }: { tiles: WorldState['tiles']; geom: MapGeom; levels: readonly number[] }) {
  const { R, center } = geom;
  const water = tiles.flatMap((t, i) => (t.seen && levels[i] === 0 && getTerrain(t.t).moveCost === 0 && (t.t === 'water' || getTerrain(t.t).sea) ? [i] : []));
  if (!water.length) return null;
  const band = (phase: number) => (
    <svg width={geom.W} height={geom.H} className={`absolute inset-0 block water-shimmer ${phase ? 'water-shimmer-b' : ''}`}>
      {water.map((i) => {
        const { x, y } = center(i);
        const o = (hash01(i, 60 + phase) - 0.5) * R * 0.3;
        return (
          // 細く淡い波（周りの絵の描き込みに合わせて、太い「≈」に見えないように）
          <g key={i} stroke="#e8f6ff" strokeOpacity={0.7} strokeLinecap="round" fill="none" strokeWidth={Math.max(0.8, R * 0.028)}>
            <path d={`M${x - R * 0.42 + o} ${y - R * 0.18 + phase * R * 0.12} q${R * 0.09} ${-R * 0.05} ${R * 0.18} 0 t${R * 0.18} 0`} />
            <path d={`M${x - R * 0.02 - o} ${y + R * 0.02 + phase * R * 0.08} q${R * 0.07} ${-R * 0.04} ${R * 0.14} 0`} />
          </g>
        );
      })}
    </svg>
  );
  return (
    <div className="pointer-events-none absolute inset-0" data-water-layer>
      {band(0)}
      {band(1)}
    </div>
  );
});

/** 施設1つ分の絵（立体のミニチュア・描いた絵・仮の印）。施設の層と、駒の手前に重ねる層（奥行き）の両方で使う */
function featureArt(t: WorldState['tiles'][number], i: number, geom: MapGeom, finaleTiles: ReadonlySet<number>, fallenTowns: string[]) {
  const { R, center } = geom;
  const w = { fallenTowns };
    if (!t.f || !t.seen) return null;
    const { x, y } = center(i);
    const f = t.f;
    const finale = finaleTiles.has(i);
    const fallen = f.kind === 'town' && w.fallenTowns.includes(f.id);
    const used = f.used && f.kind !== 'town' && f.kind !== 'dungeon';
    // 見晴らしの塔（段階6）: 仮のミニチュア。上の面から少し浮かせる
    if (f.kind === 'tower') return <TowerMini key={`f${i}`} x={x} y={y - R * FACILITY_LIFT} R={R} used={f.used} />;
    const mini: MiniKind | undefined = finale ? 'finale' : f.kind === 'event' || f.kind === 'temple' || f.kind === 'altar' ? f.kind : undefined;
    if (mini) {
      return (
        <g key={`f${i}`} opacity={used ? 0.45 : 1} data-feature={`${f.kind}:${f.id}`} data-used={used || undefined}>
          <PlaceMini kind={mini} x={x} y={y - R * FACILITY_LIFT} R={R} />
        </g>
      );
    }
    const img = placeImage(f);
    if (img) {
      // 描いた絵の場所: マスより少し大きく、影をつけて上の面から飛び出させる
      const big = R * (f.kind === 'town' ? 1.75 : f.kind === 'chest' ? 1.25 : 1.55);
      return (
        <g key={`f${i}`} opacity={used ? 0.4 : 1} data-feature={`${f.kind}:${f.id}`} data-used={used || undefined}>
          <ellipse cx={x} cy={y - R * FACILITY_LIFT + big * 0.33} rx={big * 0.42} ry={big * 0.13} fill="rgba(0,0,0,.55)" />
          <image href={img} x={x - big / 2} y={y - R * FACILITY_LIFT - big * 0.62} width={big} height={big} filter="url(#place-shadow)" style={fallen ? { filter: 'grayscale(1) brightness(.6)' } : undefined} />
        </g>
      );
    }
    const Icon = FEATURE_ICON[f.kind] ?? CircleHelp;
    const sz = R * 0.95;
    const color = fallen ? '#7a6a7a' : FEATURE_COLOR[f.kind];
    return (
      <g key={`f${i}`} opacity={used ? 0.35 : 1} data-feature={`${f.kind}:${f.id}`} data-used={used || undefined}>
        <circle cx={x} cy={y} r={sz * 0.62} fill="rgba(0,0,0,.55)" />
        <Icon x={x - sz / 2} y={y - sz / 2} width={sz} height={sz} color={color ?? '#ffd76a'} strokeWidth={2.2} />
      </g>
    );
}

/** 施設の層（立体のミニチュア・描いた絵）。歩いている間は変わらないので、施設の状態が変わった時だけ描き直す */
const FeatureLayer = memo(function FeatureLayer({ tiles, geom, finaleTiles, fallenTowns }: { tiles: WorldState['tiles']; geom: MapGeom; finaleTiles: ReadonlySet<number>; fallenTowns: string[] }) {
  const w = { tiles, fallenTowns };
  return (
    <svg width={geom.W} height={geom.H} className="absolute inset-0 block" data-feature-layer>
      <defs>
        <filter id="place-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".85" />
        </filter>
      </defs>
      {/* 上の行から順に描く（手前の場所の絵が奥の絵を隠す） */}
      {w.tiles.map((t, i) => featureArt(t, i, geom, finaleTiles, w.fallenTowns))}
    </svg>
  );
});

// ---- 奥行き（2.5D）の重なりの順 ----
// 奥（上の行）の物ほど下に、手前（下の行）の物ほど上に重ねる。1行につき DEPTH_STEP ずつ上げる。
// 行の中の順: 敵の駒 → 倒れた仲間 → キャラの駒（同じマスの中は左奥から右手前）→ 動いている駒 → その行の駒より手前にある木・施設
const DEPTH_STEP = 10;
const depthZ = (row: number, layer: number) => 2 + row * DEPTH_STEP + layer;
const DEPTH_FRONT = 8;
/** 時間帯の色を、手前に重ねた木・施設にも掛ける（下の景色に掛かっている色と、ほぼ同じ） */
const FRONT_TINT: Partial<Record<TimeOfDay, NonNullable<FrontTint>>> = {
  morning: { color: 'rgb(255,218,160)', alpha: 0.16 },
  evening: { color: 'rgb(238,115,60)', alpha: 0.32 },
  night: { color: 'rgb(6,14,58)', alpha: 0.58 },
};

/** 霧が晴れたマスの数（地形の層を描き直すかどうかの目安） */
const seenKey = (w: WorldState) => w.tiles.reduce((n, t) => n + (t.seen ? 1 : 0), 0);

export function WorldMap({
  game,
  reach,
  selected,
  path,
  onTapTile,
  movement,
  bottomInset = 0,
}: {
  game: GameState;
  movement?: { heroes: string[]; i: number; path: number[]; arrived: boolean };
  /** 移動できるマス（マス → 必要な移動力） */
  reach?: Map<number, number>;
  selected?: number;
  path?: number[];
  onTapTile: (i: number) => void;
  /**
   * 地図の下の端に重なっている操作パネルの高さ（px）。地図の枠の大きさはパネルによらずいつも同じで、
   * カメラは「枠の上の端〜パネルの上の端」の真ん中に駒を置く。移動中に帯へ縮んでいる間は、縮む前の高さを渡す（地図を動かさない）
   */
  bottomInset?: number;
}) {
  const w = game.world!;
  const [box, size] = useElementSize<HTMLDivElement>();
  // 拡大: この端末の設定に保存した値。ピンチの最中だけは指に合わせた仮の値（指を離した時に保存する）
  const savedZoom = useBattle(st => st.settings.worldZoom);
  const setSettings = useBattle(st => st.setSettings);
  const [pinchZoom, setPinchZoom] = useState<number | null>(null);
  const zoom = clampZoom(pinchZoom ?? savedZoom);
  // 霧が晴れた時だけ地形の層を作り直す（それ以外は前の層を使い回す）
  const tilesRef = useRef(w.tiles);
  const key = seenKey(w) + ':' + w.tiles.length;
  const lastKey = useRef(key);
  // 今、霧が晴れたばかりのマス（せり上がる演出。最初に地図を出した時は無し）
  const freshRef = useRef<ReadonlySet<number>>(new Set());
  if (lastKey.current !== key) {
    const before = tilesRef.current;
    const fresh = new Set<number>();
    if (before.length === w.tiles.length) w.tiles.forEach((t, i) => t.seen && !before[i].seen && fresh.add(i));
    freshRef.current = fresh;
    lastKey.current = key;
    tilesRef.current = w.tiles;
  }
  const tiles = tilesRef.current;
  // 箱庭の高さ・道・最後の城（地形は冒険の間ほぼ変わらないので、地形の並びが変わった時だけ計算し直す）
  const scenario = getScenario(game.scenarioId);
  const terrainKey = tiles.map((t) => t.t).join(',');
  const finaleTiles = useMemo(() => new Set(tiles.flatMap((t, i) => (t.f?.kind === 'dungeon' && DUNGEONS.tryGet(t.f.id)?.finale ? [i] : []))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [terrainKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const levels = useMemo(() => tiles.map((t, i) => tileLevel(t, finaleTiles.has(i))), [terrainKey, finaleTiles]);
  const roadTerrain = scenario.map?.roadTerrain ?? 'road';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const links = useMemo(() => roadLinks({ ...w, tiles }, roadTerrain), [terrainKey, roadTerrain, w.width, w.height]);
  // 見た目だけの川（丘・山のふもとから湖・海・地図の端へ。移動には関係しない）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rivers = useMemo(() => riverLinks({ ...w, tiles }, levels), [terrainKey, levels, w.width, w.height]);
  // 街道のマスの下に敷く地形（その地域で一番多い、高さ1の地形。無ければ平原）
  const under = useMemo(
    () => (scenario.map?.regions ?? []).map((r) => Object.entries(r.terrain).filter(([id]) => id !== roadTerrain && terrainLevel(id) === 1 && TERRAINS.tryGet(id)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'plains'),
    [scenario, roadTerrain],
  );
  // 侵食度が高いほど、奥の地域から雲が紫の瘴気になる
  const stage = corruptionStage(w.corruption);
  const lastRegion = (scenario.map?.regions.length ?? 1) - 1;
  const miasma = useMemo(() => {
    const from = stage >= 3 ? 0 : stage === 2 ? Math.max(1, lastRegion - 1) : stage === 1 ? lastRegion : lastRegion + 1;
    return (i: number) => (tiles[i]?.r ?? 0) >= from || tiles[i]?.t === 'blight';
  }, [stage, lastRegion, tiles]);
  const geom = useMapGeom(w, size.width, zoom, levels);
  const { R, W, H, center } = geom;
  // 地図の大きさ（マスの半径）が、測る前の仮の値か、前の描画から変わった時は「落ち着き中」
  const lastR = useRef<number | null>(null);
  const geomSettling = size.width === 0 || lastR.current !== R;
  useEffect(() => {
    lastR.current = size.width === 0 ? null : R;
  }, [R, size.width]);
  // 移動中の地図は画面切替より上の共通部品で最後まで保持する。
  const fast = useBattle(st => st.settings.fastMode);
  const simple = useBattle(st => st.settings.cutinMode === 'simple');
  const anim = movement;
  const stepMs = TIMING.worldMoveStep * 1000 / speedFactor({ fastMode: fast });
  const shownPos = useMemo(() => {
    if (!anim) return w.pos;
    const out = { ...w.pos };
    for (const id of anim.heroes) if (out[id] !== undefined) out[id] = anim.path[anim.i];
    return out;
  }, [w.pos, anim]);

  // 手番のキャラが見えるようにスクロール（動いている間は、動いているキャラについていく）
  const here = anim ? anim.path[anim.i] : w.pos[w.turn];
  // 地図の上下の余白（端のマスでも駒を真ん中に置ける。フェーズ2-D）。パネルは地図の上に重なるので、余白はパネルの高さによらない
  const padY = mapPadY(size.height);
  const padBottom = mapPadBottom(size.height);
  const inset = Math.round(bottomInset);
  const reduced = useReducedMotion();
  // 拡大のボタンを縦に並べる高さ（「戻る」のボタン＋3つ＋すき間 ≒ 210px）が、見えている地図に無い時は横に並べる
  const compactZoom = size.height > 0 && visibleH(size.height, inset) < 225;
  // 拡大を変える直前のスクロールと、残したい枠の中の点（ピンチの指の間・ボタンなら枠の真ん中）
  const zoomAnchor = useRef<{ left: number; top: number; ax: number; ay: number; padY: number; R: number } | null>(null);
  const lastCam = useRef<{ here?: number; turn: string; w: number; h: number; inset: number } | null>(null);
  // カメラを少しずつ動かす（ブラウザの smooth は端末によって効かず跳ぶことがあるので、自分で毎フレーム動かす）
  const camAnim = useRef(0);
  const stopCam = () => {
    if (camAnim.current) cancelAnimationFrame(camAnim.current);
    camAnim.current = 0;
  };
  const moveCam = (el: HTMLElement, left: number, top: number, ms: number) => {
    stopCam();
    if (ms <= 0) {
      el.scrollTo({ left, top, behavior: 'instant' });
      return;
    }
    // スクロールできる範囲に収めてから動かす（範囲の外を目指すと、最後に止まる所がずれる）
    const maxL = Math.max(0, el.scrollWidth - el.clientWidth), maxT = Math.max(0, el.scrollHeight - el.clientHeight);
    const toL = Math.max(0, Math.min(maxL, left)), toT = Math.max(0, Math.min(maxT, top));
    const fromL = el.scrollLeft, fromT = el.scrollTop;
    if (Math.abs(toL - fromL) < 1 && Math.abs(toT - fromT) < 1) return;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - k) ** 3;
      el.scrollTo({ left: fromL + (toL - fromL) * e, top: fromT + (toT - fromT) * e, behavior: 'instant' });
      camAnim.current = k < 1 ? requestAnimationFrame(step) : 0;
    };
    camAnim.current = requestAnimationFrame(step);
  };
  // 指やホイールで地図を動かしたら、カメラの動きを止める（取り合わない）
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.addEventListener('touchstart', stopCam, { passive: true });
    el.addEventListener('wheel', stopCam, { passive: true });
    return () => {
      stopCam();
      el.removeEventListener('touchstart', stopCam);
      el.removeEventListener('wheel', stopCam);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || here === undefined || !size.width) return;
    const prev = lastCam.current;
    lastCam.current = { here, turn: w.turn, w: size.width, h: size.height, inset };
    const anchor = zoomAnchor.current;
    zoomAnchor.current = null;
    // 拡大だけが変わった時（歩いていない時）: 指の間の地面をそのまま残す。それ以外は手番・歩いている駒を真ん中へ
    const sameView = !!prev && prev.w === size.width && prev.h === size.height && prev.inset === inset;
    const zoomOnly = sameView && prev.here === here && prev.turn === w.turn;
    if (zoomOnly && !anim) {
      if (anchor && anchor.R !== R) {
        stopCam();
        el.scrollTo({ ...anchorScroll(anchor, anchor.R, R), behavior: 'instant' });
      }
      return;
    }
    // 駒が歩いた・手番が変わった時は、跳ばずになめらかに追う（動きを減らす設定の時・枠の大きさや拡大が変わった時はすぐ合わせる）。
    // 歩いている間は、駒が1マス動く時間（駒の動きと同じ）でカメラも動かす。駒が画面の上でほぼ止まって見える
    const smooth = sameView && !anchor && !reduced && (prev.here !== here || prev.turn !== w.turn);
    const { x, y } = center(here);
    moveCam(el, x - el.clientWidth / 2, cameraTop(y, el.clientHeight, inset), smooth ? (anim ? stepMs * 0.8 : 350) : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here, w.turn, size.width, size.height, inset, center]);

  /** 拡大を変える（ax, ay = 残したい点。枠の中の座標。省略すると枠の真ん中）。save = この端末の設定に保存する */
  const applyZoom = (next: number, save: boolean, ax?: number, ay?: number) => {
    const el = box.current;
    const z = clampZoom(next);
    if (el && z !== zoom) {
      zoomAnchor.current = { left: el.scrollLeft, top: el.scrollTop, ax: ax ?? el.clientWidth / 2, ay: ay ?? visibleH(el.clientHeight, inset) / 2, padY, R };
    }
    if (save) {
      setPinchZoom(null);
      if (z !== savedZoom) setSettings({ worldZoom: z });
    } else setPinchZoom(z);
  };
  const applyZoomRef = useRef(applyZoom);
  applyZoomRef.current = applyZoom;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // 2本指のピンチで拡大・縮小（1本指はいつものスクロールとタップ）。
  // 指が拡大のボタンの上から始まっても効くように、ボタンも含む外側の枠で受ける
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    let start: { dist: number; zoom: number } | null = null;
    let last = 0;
    const two = (e: TouchEvent) => {
      const a = e.touches[0], b = e.touches[1];
      const rect = el.getBoundingClientRect();
      return {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        ax: (a.clientX + b.clientX) / 2 - rect.left,
        ay: (a.clientY + b.clientY) / 2 - rect.top,
      };
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      start = { dist: Math.max(1, two(e).dist), zoom: zoomRef.current };
      last = zoomRef.current;
      e.preventDefault();
    };
    const onMove = (e: TouchEvent) => {
      if (!start || e.touches.length !== 2) return;
      e.preventDefault();
      const t = two(e);
      const z = clampZoom(start.zoom * (t.dist / start.dist));
      if (Math.abs(z - last) < 0.02) return;
      last = z;
      applyZoomRef.current(z, false, t.ax, t.ay);
    };
    const onEnd = (e: TouchEvent) => {
      if (!start || e.touches.length >= 2) return;
      start = null;
      applyZoomRef.current(last, true);
    };
    wrap.addEventListener('touchstart', onStart, { passive: false });
    wrap.addEventListener('touchmove', onMove, { passive: false });
    wrap.addEventListener('touchend', onEnd);
    wrap.addEventListener('touchcancel', onEnd);
    return () => {
      wrap.removeEventListener('touchstart', onStart);
      wrap.removeEventListener('touchmove', onMove);
      wrap.removeEventListener('touchend', onEnd);
      wrap.removeEventListener('touchcancel', onEnd);
    };
  }, [box]);
  // 行き先を選んだ時: 選んだマスが見えていなければ、駒と選んだマスが両方見えるように動かす（見えていれば動かさない）
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || anim || here === undefined || selected === undefined || !size.width) return;
    const top = revealTop(center(here).y, center(selected).y, el.scrollTop, el.clientHeight, R * 1.2, inset);
    // 拡大している時は横にもはみ出すので、横も同じ決まりで見せる
    const left = revealLeft(center(here).x, center(selected).x, el.scrollLeft, el.clientWidth, R * 1.2);
    if (top !== undefined || left !== undefined) moveCam(el, left ?? el.scrollLeft, top ?? el.scrollTop, reduced ? 0 : 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

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

  // タップ: 押した所に見えている「上の面」を優先する（手前の行から調べる。高いマスが奥のマスに重なって見える所でも、見えている方を選ぶ）。
  // どの上の面でもない所（崖の側面など）は、今までどおり一番近いマスの中心
  const tap = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const half = (SQRT3 / 2) * R * TOP_SCALE;
    for (let i = w.tiles.length - 1; i >= 0; i--) {
      const c = center(i);
      const dx = Math.abs(px - c.x);
      const dy = Math.abs((py - c.y) / GROUND_K);
      if (dx <= half && dy <= R * TOP_SCALE - dx / SQRT3) {
        onTapTile(i);
        return;
      }
    }
    let best = -1;
    let bd = Infinity;
    for (let i = 0; i < w.tiles.length; i++) {
      const c = center(i);
      const d = (c.x - px) ** 2 + ((c.y - py) / GROUND_K) ** 2;
      if (d < bd) (bd = d), (best = i);
    }
    if (best >= 0 && bd <= R * R) onTapTile(best);
  };

  const senses = partySenses(game);
  const time = timeOfDay(w.worldTurn);
  const light = timeLight(time, R);
  // 明かり（町・祠・神殿・祭壇・最後の城・野営のたき火）
  const glows = useMemo(() => {
    if (!light.glow) return [];
    const out: { key: string; kind: string; x: number; y: number; r: number; color: string }[] = [];
    tiles.forEach((t, i) => {
      if (!t.seen || !t.f) return;
      const k = finaleTiles.has(i) ? 'finale' : t.f.kind;
      const g = GLOW[k];
      if (!g || (k === 'town' && w.fallenTowns.includes(t.f.id))) return;
      const { x, y } = center(i);
      out.push({ key: `g${i}`, kind: k, x, y: y - R * 0.2, r: R * g.r, color: g.color });
    });
    for (const id of w.sheltered ?? []) {
      const tile = w.pos[id];
      if (tile === undefined) continue;
      const { x, y } = center(tile);
      out.push({ key: `camp${id}`, kind: 'camp', x, y, r: R * 1.3, color: 'rgba(255,160,64,.8)' });
    }
    return out;
  }, [light.glow, tiles, finaleTiles, center, R, w.fallenTowns, w.sheltered, w.pos]);
  // 地域の名前（いつも左上に出す）と、地域に入るたびの短い帯
  const regionIdx = here !== undefined ? w.tiles[here]?.r : undefined;
  const regionName = regionIdx !== undefined ? scenario.map?.regions[regionIdx]?.name : undefined;
  const [banner, setBanner] = useState<{ name: string; seq: number } | null>(null);
  const prevRegion = useRef(regionIdx);
  useEffect(() => {
    const prev = prevRegion.current;
    prevRegion.current = regionIdx;
    if (prev === undefined || regionIdx === undefined || prev === regionIdx || !regionName) return;
    setBanner((b) => ({ name: regionName, seq: (b?.seq ?? 0) + 1 }));
    const t = setTimeout(() => setBanner(null), 2300);
    return () => clearTimeout(t);
  }, [regionIdx, regionName]);

  // 同じマスのキャラは少しずらして並べる
  const heroSpots = useMemo(() => {
    const byTile = new Map<number, string[]>();
    for (const [id, t] of Object.entries(shownPos)) byTile.set(t, [...(byTile.get(t) ?? []), id]);
    return byTile;
  }, [shownPos]);

  // ---- 奥行き: 駒より手前にある木・峰・施設を、駒の上にもう一度描く ----
  const dims = { width: w.width, height: w.height };
  const sceneItems = useMemo(
    () => scatter({ w: { width: w.width, height: w.height, tiles }, geom, levels, links, rivers, stage, blocked: (i) => !!tiles[i].f || finaleTiles.has(i) }),
    // 地形・見えている範囲・大きさが変わった時だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tiles, geom, levels, links, rivers, stage, finaleTiles, w.width, w.height],
  );
  const frontSpots = useMemo(() => {
    const set = new Set<number>();
    for (const t of heroSpots.keys()) set.add(t);
    for (const wd of w.wanderers) if (w.tiles[wd.tile]?.seen) set.add(wd.tile);
    for (const t of Object.values(w.downed ?? {})) set.add(t);
    // 歩いている間は、通るマスも
    for (const t of anim?.path ?? []) set.add(t);
    return [...set].sort((a, b) => a - b).map((tile): FrontSpot & { tile: number } => {
      const { x, y } = center(tile);
      const front = w.tiles[tile]?.f && w.tiles[tile].seen ? FACILITY_FRONT * R * GROUND_K : 0;
      return { key: `t${tile}`, tile, x: x - R * 1.45, y: y - R * 2.1, w: R * 2.9, h: R * 3.1, footY: y + front + R * 0.2, z: depthZ(rowOf(dims, tile), DEPTH_FRONT) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroSpots, w.wanderers, w.downed, anim?.path, center, R, w.tiles]);
  const frontTint = FRONT_TINT[time];

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1" style={{ touchAction: 'pan-x pan-y' }}>
    <div ref={box} className="absolute inset-0 overflow-auto overscroll-contain bg-[#0b0910]" style={{ touchAction: 'pan-x pan-y' }} data-world-map>
      {/* 地図の外（上下の余白）も雲の海（FogSea が余白まで広げる）。下地は雲の色 */}
      <div style={{ paddingTop: padY, paddingBottom: padBottom, width: W, background: time === 'night' ? '#20233c' : '#53587a' }} data-map-pad>
      {/* 歩いている間は、雲と水の動きを止める（スマホで駒の動きをなめらかにするため） */}
      {/* isolate: 奥行きの重なりの順（大きな zIndex）を、地図の中だけに閉じ込める（下の操作の欄の上に出ないように） */}
      <div className="relative isolate" style={{ width: W, height: H }} onClick={(e) => { if (!anim) tap(e); }} data-walking={anim ? '' : undefined}>
        <LandscapeLayer w={w} tiles={tiles} geom={geom} levels={levels} links={links} rivers={rivers} under={under} roadTerrain={roadTerrain} noProp={finaleTiles} stage={stage} frozen={pinchZoom !== null} walking={!!anim} />
        <WaterLayer tiles={tiles} geom={geom} levels={levels} />
        <FogSea tiles={tiles} geom={geom} levels={levels} padTop={padY} padBottom={padBottom} miasma={miasma} fresh={freshRef.current} time={time} />
        {/* 霧の向こうの山のシルエットと、地平線の最後の城 */}
        <FogSilhouettes w={w} tiles={tiles} geom={geom} levels={levels} finale={finaleTiles.values().next().value} padTop={padY} night={time === 'night'} />
        {/* 施設（立体のミニチュア・描いた絵）。時間帯の色の下に置く（夜は暗くなり、町などの明かりだけが光る） */}
        <FeatureLayer tiles={w.tiles} geom={geom} finaleTiles={finaleTiles} fallenTowns={w.fallenTowns} />
        {/* 時間帯の光（朝 = 斜めの光、夕方 = オレンジ、夜 = 青い月明かり）。地図といっしょに動く1枚の色なので、描き直しは起きない */}
        {light.wash && <div className="pointer-events-none absolute" style={{ left: 0, top: -padY, width: W, height: padY + H + padBottom, background: light.wash }} data-time-light={time} />}
        {/* 夜と夕方の明かり（町・祠・神殿・祭壇・野営のたき火） */}
        {light.glow > 0 &&
          glows.map((g) => (
            <span
              key={g.key}
              className="map-glow pointer-events-none absolute rounded-full"
              data-glow={g.kind}
              style={{
                left: g.x - g.r,
                top: g.y - g.r,
                width: g.r * 2,
                height: g.r * 2,
                opacity: light.glow,
                background: `radial-gradient(circle, ${g.color} 0%, ${g.color.replace(/[\d.]+\)$/, '0.25)')} 38%, transparent 70%)`,
              }}
            />
          ))}
        {/* 操作の印（移動できるマス・経路・選んだマス・霊感・依頼の旗・襲撃）。夜でも見えるように、時間帯の色より上に置く */}
        <svg width={W} height={H} className="absolute inset-0 block" data-overlay-layer>
          {reach &&
            [...reach].map(([i, cost]) => {
              if (i === here) return null;
              const { x, y } = center(i);
              return (
                <g key={`r${i}`} data-reach={i} data-cost={cost}>
                  <polygon points={hexPoints(x, y, R * TOP_SCALE - 2)} fill="rgba(255,240,180,.2)" stroke="rgba(255,214,110,.85)" strokeWidth={1.8} />
                  {/* 数字の下敷き（木・テント・建物と重なっても読めるように） */}
                  <circle cx={x} cy={y + R * 0.62 * GROUND_K - Math.max(12, R * 0.42) * 0.36} r={Math.max(12, R * 0.42) * 0.72} fill="rgba(28,18,8,.78)" stroke="rgba(255,214,110,.9)" strokeWidth={1.2} />
                  <text x={x} y={y + R * 0.62 * GROUND_K} textAnchor="middle" fontSize={Math.max(12, R * 0.42)} fontWeight={800} fill="#fff3c4" stroke="#000" strokeWidth={2.5} paintOrder="stroke">
                    {cost}
                  </text>
                </g>
              );
            })}
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
          {selected !== undefined && <polygon points={hexPoints(center(selected).x, center(selected).y, R * TOP_SCALE - 1)} fill="none" stroke="#fff" strokeWidth={3} />}
          {/* 霊感のキャラがいれば、祠とイベントは雲の中でも光って見える */}
          {senses &&
            w.tiles.map((t, i) => {
              if (t.seen || !t.f || (t.f.kind !== 'shrine' && t.f.kind !== 'event')) return null;
              const { x, y } = geom.ground(i);
              return <circle key={`sense${i}`} cx={x} cy={y - LEVEL_STEP * R} r={R * 0.32} fill={t.f.kind === 'shrine' ? '#9affd0' : '#9ad8ff'} opacity={0.8} stroke="#fff" strokeOpacity={0.6} data-sensed={t.f.kind} />;
            })}
          {w.tiles.map((t, i) => {
            if (!t.seen || !t.f || !questTargets.has(t.f.id)) return null;
            const { x, y } = center(i);
            return <Flag key={`q${i}`} x={x + R * 0.2} y={y - R * 1.35} width={R * 0.6} height={R * 0.6} color="#ff6a8a" fill="#ff6a8a" />;
          })}
          {/* 時間で消える出現スポット（段階6） */}
          <SpawnMarks w={w} R={R} center={center} />
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
        {/* 徘徊する敵: 赤い台座に乗った魔物の駒（レアは金の台座と★）。ゆっくり呼吸するように動く */}
        {w.wanderers.map((wd) => {
          if (!w.tiles[wd.tile].seen) return null;
          const { x, y } = center(wd.tile);
          const s = R * 1.5;
          const base = wd.rare ? '#e0a82a' : '#c0282a';
          return (
            <div
              key={wd.id}
              className="pointer-events-none absolute"
              data-wanderer={wd.id}
              data-rare={wd.rare ? 'true' : undefined}
              style={{ left: x - s / 2, top: y - s * 0.72, width: s, height: s, zIndex: depthZ(rowOf(dims, wd.tile), 0) }}
            >
              <EnemyBase color={base} s={s} glow={wd.raidTown ? '#ff3a3a' : wd.rare ? '#ffd24a' : undefined} />
              <span className="enemy-breathe absolute block" style={{ left: s * 0.08, top: -s * 0.02, width: s * 0.84, height: s * 0.84, animationDelay: `${-(hash01(Number(wd.id.replace(/\D/g, '')) || 0, 7) * 3).toFixed(2)}s` }}>
                <EnemyArt defId={wd.enemies[0].defId} className="h-full w-full" />
              </span>
              {wd.rare && <span className="absolute -left-1 top-0 z-10 text-[14px] leading-4 font-black text-amber-300">★</span>}
              <span className="absolute -right-1 bottom-[10%] rounded-full border border-red-300 bg-red-950/90 px-1 text-[12px] leading-4 font-black text-red-200">
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
            <div key={`down-${id}`} data-downed={id} className="pointer-events-none absolute" style={{ left: x - s / 2 + R * 0.35, top: y - s / 2 + R * 0.3, width: s, height: s, zIndex: depthZ(rowOf(dims, tile), 1) }}>
              <HeroFace hero={h} size={s} dim />
              <span className="absolute -right-1 -bottom-1 rounded-full bg-red-900 px-1 text-[12px] leading-4 font-black text-red-100">倒</span>
            </div>
          );
        })}
        {anim?.arrived && <span data-arrival-marker className="pointer-events-none absolute rounded-full border-2 border-amber-200 bg-amber-950 px-2 text-[22px] font-black text-amber-100" style={{ left: center(anim.path[anim.i]).x - 13, top: Math.max(4, center(anim.path[anim.i]).y - R * 2.3), zIndex: depthZ(w.height + 1, 0) }}>！</span>}
        {/* 奥行き: 駒より手前にある木・峰・岩（景色と同じ絵を、駒の上にもう一度描く）。ピンチで大きさを変えている間は出さない */}
        {pinchZoom === null && <DepthFront spots={frontSpots} items={sceneItems} tint={frontTint} />}
        {/* 奥行き: 駒より手前にある施設（町・祠・神殿など）。駒のまわりだけ切り取って、駒の上に重ねる。
            建物は透かさない（木は葉のすき間から見えても自然だが、建物が透けると、駒が建物にめり込んで見える） */}
        {pinchZoom === null &&
          frontSpots.map((sp) => {
            const arts = w.tiles.flatMap((t, i) => {
              if (i === sp.tile || !t.f || !t.seen) return [];
              const c = center(i);
              // 駒の足元より手前（下）にあって、絵がこの四角に掛かる施設だけ
              if (c.y <= sp.footY || c.y - R * 2 > sp.y + sp.h || Math.abs(c.x - (sp.x + sp.w / 2)) > sp.w / 2 + R * 1.1) return [];
              const art = featureArt(t, i, geom, finaleTiles, w.fallenTowns);
              return art ? [art] : [];
            });
            if (!arts.length) return null;
            return (
              <svg key={`ff${sp.key}`} className="pointer-events-none absolute block" data-depth-front-place={sp.key} width={sp.w} height={sp.h} viewBox={`${sp.x} ${sp.y} ${sp.w} ${sp.h}`} style={{ left: sp.x, top: sp.y, zIndex: sp.z, ...FRONT_FADE }}>
                {frontTint && (
                  <defs>
                    <filter id={`front-tint-${sp.key}`} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse">
                      <feFlood floodColor={frontTint.color} floodOpacity={frontTint.alpha} result="tint" />
                      <feComposite in="tint" in2="SourceGraphic" operator="atop" />
                    </filter>
                  </defs>
                )}
                <g filter={frontTint ? `url(#front-tint-${sp.key})` : undefined}>{arts}</g>
              </svg>
            );
          })}
        {/* 足あと（移動の演出中） */}
        {anim &&
          anim.path.slice(0, anim.i).map((t, k) => {
            const { x, y } = center(t);
            return <span key={`fp${k}`} className="footprint pointer-events-none absolute rounded-full" style={{ left: x - 5, top: y - 5, width: 10, height: 10 }} />;
          })}
        {/* キャラ */}
        {/* マスごとに分けず1つの並びで描く。キャラの要素がマスをまたいでも作り直されず、
            残った駒も新しい並びの位置へなめらかに動く */}
        {[...heroSpots].flatMap(([tile, raw]) => {
          // 同じマスの駒は左奥から右手前へ斜めに並べ、手番のキャラを一番手前にする
          const ids = orderOnTile(raw, w.turn);
          const spots = pieceSpots(ids.length);
          return ids.map((id, k) => ({ id, tile, spot: spots[Math.min(k, spots.length - 1)] }));
        })
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
          .map(({ id, tile, spot }) => {
            const h = game.heroes.find((x) => x.id === id);
            if (!h) return null;
            const { x, y } = center(tile);
            const s = R * spot.size;
            // 施設のあるマスでは、駒を少し手前（門の前あたり）に立たせる（建物が駒に隠れないように。見た目だけ）
            const front = w.tiles[tile]?.f && w.tiles[tile].seen ? FACILITY_FRONT : 0;
            const active = id === w.turn;
            const moving = !!anim?.heroes.includes(id);
            const hopping = moving && anim!.i > 0 && !anim!.arrived;
            return (
              <div
                key={id}
                data-hero={id}
                data-tile={tile}
                data-active={active ? '' : undefined}
                className="pointer-events-none absolute"
                style={{
                  left: x - s / 2 + spot.dx * R,
                  top: y - s * 0.62 + (spot.dy + front) * R * GROUND_K,
                  width: s,
                  height: s,
                  // 奥行き: 手前の行の駒ほど上。同じ行の中は、並びの順（動いている駒は、その行のいちばん手前）
                  zIndex: depthZ(rowOf(dims, tile), moving ? 7 : 2 + Math.min(4, spot.z)),
                  opacity: w.acted.includes(id) && !active ? 0.75 : 1,
                  // 地図の大きさが決まった直後・変わった直後は動かさずに置く（仮の大きさからすべって見えないように）
                  transition: geomSettling ? 'none' : moving ? `left ${stepMs * 0.8}ms ease-out, top ${stepMs * 0.8}ms ease-out` : 'left .35s ease-out, top .35s ease-out',
                }}
              >
                {/* 夜と夕方は、駒の足元にも手元の明かり（駒といっしょに動く） */}
                {light.glow > 0 && (
                  <span
                    className="pointer-events-none absolute rounded-full"
                    data-hero-glow
                    style={{
                      left: s / 2 - R * 1.1,
                      top: s * 0.86 - R * 1.1 * GROUND_K,
                      width: R * 2.2,
                      height: R * 2.2 * GROUND_K,
                      opacity: light.glow,
                      background: 'radial-gradient(closest-side, rgba(255,200,120,.55), rgba(255,170,90,.2) 55%, transparent)',
                    }}
                  />
                )}
                <HeroPiece hero={h} size={s} ringColor={PLAYER_COLORS[h.playerId]} active={active} hopping={hopping} stepKey={moving ? anim!.i : 'still'} stepMs={stepMs} simple={simple} />
                {/* お供: 肩に乗る・足元で1歩遅れてぴょこぴょこ付いてくる */}
                {h.pet && (() => {
                  const sp = petSpot(h.pet.petId, s);
                  return (
                    <span className="absolute" style={{ left: sp.left, top: sp.top }}>
                      <PetToken ownerId={h.id} pet={h.pet} size={sp.size} hop={!!anim?.heroes.includes(id) && anim.i > 0 && !anim.arrived} hopDuration={stepMs / 1000} hopKey={anim?.heroes.includes(id) ? `p${anim.i}` : 'still'} />
                    </span>
                  );
                })()}
              </div>
            );
          })}
      </div>
      </div>
    </div>
      {/* 手番のキャラへ戻る（地図をスクロールして見失った時） */}
      {here !== undefined && (
        <button
          onClick={() => {
            const el = box.current;
            if (!el) return;
            const { x, y } = center(here);
            moveCam(el, x - el.clientWidth / 2, cameraTop(y, el.clientHeight, inset), reduced ? 0 : 350);
          }}
          aria-label="手番のキャラへ戻る"
          className="btn btn-dark absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full"
          style={{ bottom: inset + 8 }}
          data-recenter
        >
          <LocateFixed size={20} className="text-amber-200" />
        </button>
      )}
      {/* 拡大・縮小（右手の親指で届くように、「戻る」のボタンの上に縦に並べる）。標準 = 1倍 */}
      {/* 見えている地図が低い時（小さい画面）は、縦に並べると上にはみ出すので、地図の右上に横に並べる */}
      <div
        style={compactZoom ? { top: 8 } : { bottom: inset + 60 }}
        className={`absolute right-2 z-10 flex items-center gap-1.5 ${compactZoom ? 'flex-row' : 'flex-col'}`}
        role="group"
        aria-label="地図の拡大"
        data-zoom-controls
        data-zoom={zoom}
        data-zoom-layout={compactZoom ? 'row' : 'column'}
      >
        <button onClick={() => applyZoom(stepZoom(zoom, 1), true)} disabled={zoom >= ZOOM_MAX} aria-label="地図を拡大" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40" data-zoom-in>
          <Plus size={20} className="text-amber-200" />
        </button>
        <button onClick={() => applyZoom(1, true)} disabled={zoom === ZOOM_MIN} aria-label="地図を標準の大きさに戻す" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-full text-[12px] font-bold text-amber-100 disabled:opacity-40" data-zoom-reset>
          標準
        </button>
        <button onClick={() => applyZoom(stepZoom(zoom, -1), true)} disabled={zoom <= ZOOM_MIN} aria-label="地図を縮小" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40" data-zoom-out>
          <Minus size={20} className="text-amber-200" />
        </button>
      </div>
      {/* 侵食度の色（25%・50%・75% で一段ずつ暗く紫に。地図の上に重ねる。タップは通す） */}
      {stage > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          data-corruption-stage={stage}
          style={{ background: `radial-gradient(ellipse at center, transparent ${[0, 50, 38, 26][stage]}%, rgba(80,14,110,${[0, 0.38, 0.55, 0.72][stage]}) 100%), rgba(50,8,80,${[0, 0.07, 0.14, 0.22][stage]})` }}
        />
      )}
      {/* 斜めから見下ろす形の時: 画面の上の方（奥）を、少しかすませる（遠近感） */}
      {GROUND_K < 1 && <div className="pointer-events-none absolute inset-x-0 top-0 h-[30%]" style={{ background: `linear-gradient(${time === 'night' ? 'rgba(10,14,40,.55)' : 'rgba(150,158,190,.42)'}, transparent)` }} data-depth-haze />}
      {/* 夜は、画面の端を少し暗くする（月明かり） */}
      {time === 'night' && <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 50%, rgba(2,6,30,.45) 100%)' }} />}
      {/* 地域の名前（いつも出す）と、地域に入った時の帯 */}
      {regionName && (
        <div className="pointer-events-none absolute top-2 left-2 z-10 max-w-[60%] truncate rounded-full border border-amber-200/40 bg-black/65 px-3 py-0.5 text-[12px] leading-5 font-bold text-amber-100" data-region-name>
          {regionName}
        </div>
      )}
      {banner && !w.story && (
        <div key={banner.seq} className="region-banner pointer-events-none absolute inset-x-0 z-10 flex justify-center" style={{ top: '18%' }} data-region-banner>
          <div className="font-display border-y border-amber-200/60 px-10 py-1.5 text-[20px] text-amber-50" style={{ background: 'linear-gradient(90deg, transparent, rgba(20,12,30,.85) 20%, rgba(20,12,30,.85) 80%, transparent)', textShadow: '0 1px 3px #000' }}>
            {banner.name}
          </div>
        </div>
      )}
    </div>
  );
}
