// ===== 世界マップの地図（六角形のマス。spec §8.1）=====
// 地形・霧・施設・移動できる範囲は SVG、キャラと敵は上に重ねた画像。タップしたマスを親に知らせる。
import { Castle, CircleHelp, DoorOpen, Flag, Gift, House, Landmark, LocateFixed, Minus, Plus, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { artImage, EnemyArt } from '../../art';
import { DUNGEONS } from '../../data/dungeons';
import { getTerrain, QUESTS, TERRAINS, TOWNS } from '../../data/world';
import { colOf, objectiveHandler, partySenses, rowOf, timeOfDay } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import { speedFactor, useBattle } from '../../store/battleStore';
import { TIMING } from '../../data/balance';
import type { GameState, WorldState } from '../../types';
import { HeroFace } from '../ui/game';
import { petSpot, PetToken } from '../ui/PetToken';
import { HeroPiece } from './HeroPiece';
import { orderOnTile, pieceSpots, PLAYER_COLORS } from './pieceLayout';
import { cameraTop, mapPadBottom, mapPadY, revealLeft, revealTop, visibleH } from './mapCamera';
import { anchorScroll, clampZoom, stepZoom, ZOOM_MAX, ZOOM_MIN } from './mapZoom';

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
  snow: { d: 'M-8 -3 H8 M-6 4 H6 M0 -8 V8 M-6 -6 L6 6', stroke: '#ffffff' },
  dunes: { d: 'M-11 4 Q-6 -3 -1 4 M0 6 Q5 -1 11 6', stroke: '#9a7a3a' },
  waves: { d: 'M-10 -2 Q-6 -6 -2 -2 T6 -2 M-6 5 Q-2 1 2 5 T10 5', stroke: '#8ac8ff' },
};

const FEATURE_ICON: Record<string, LucideIcon> = { town: House, dungeon: DoorOpen, shrine: Sparkles, event: CircleHelp, chest: Gift, landmark: Landmark, temple: Landmark, altar: Sparkles };
const FEATURE_COLOR: Record<string, string> = { town: '#ffe9a8', dungeon: '#ff9a7a', shrine: '#9affd0', event: '#9ad8ff', chest: '#ffd76a', landmark: '#d8c8ff', temple: '#ffe9a8', altar: '#c8a0ff' };

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

/** zoom: 世界マップの拡大（1 = 今までの大きさ）。枠の幅から決めた1倍のマスの半径に掛ける */
export function useMapGeom(w: Pick<WorldState, 'width' | 'height'>, containerW: number, zoom = 1): MapGeom {
  return useMemo(() => {
    const R = Math.max(18, Math.min(34, (containerW || 360) / (SQRT3 * (w.width + 0.5)))) * zoom;
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
  }, [w, containerW, zoom]);
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
        if (!t.seen) return null;
        const ter = getTerrain(t.t);
        const tex = !!artImage(`terrain/${ter.id}`);
        // 絵がある地形は模様で分かるので、小さな印は出さない
        const dec = !tex && ter.decor ? TERRAIN_DECOR[ter.decor] : undefined;
        return (
          <g key={i} data-hex={i}>
            <polygon points={hexPoints(x, y, R - 0.5)} fill={tex ? `url(#ter-${ter.id})` : ter.color} stroke="rgba(0,0,0,.5)" strokeWidth={1.2} />
            {ter.climate && <polygon points={hexPoints(x, y, R - 0.5)} fill={ter.climate.kind === 'cold' ? 'rgba(140,200,255,.18)' : 'rgba(255,120,40,.18)'} pointerEvents="none" data-climate={ter.climate.kind} />}
            {dec && <path d={dec.d} transform={`translate(${x},${y}) scale(${s})`} stroke={dec.stroke} fill={dec.fill ?? 'none'} strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />}
          </g>
        );
      })}
      {/* 霧: まだ見ていないマスを、少しにじませて重ねる（見えている所との境目がぼける）。濃さはマスごとに少し変える */}
      <defs>
        <filter id="fog-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={R * 0.28} />
        </filter>
        <radialGradient id="fog-fill" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#2a2540" />
          <stop offset="100%" stopColor="#0e0b16" />
        </radialGradient>
      </defs>
      <g filter="url(#fog-blur)" data-fog>
        {tiles.map((t, i) => {
          if (t.seen) return null;
          const { x, y } = center(i);
          const shade = 0.82 + ((i * 2654435761) % 1000) / 1000 * 0.18;
          return <polygon key={i} data-fog-tile={i} points={hexPoints(x, y, R * 1.22)} fill="url(#fog-fill)" opacity={shade} />;
        })}
      </g>
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
  const geom = useMapGeom(w, size.width, zoom);
  const { R, W, H, center } = geom;
  // 地図の大きさ（マスの半径）が、測る前の仮の値か、前の描画から変わった時は「落ち着き中」
  const lastR = useRef<number | null>(null);
  const geomSettling = size.width === 0 || lastR.current !== R;
  useEffect(() => {
    lastR.current = size.width === 0 ? null : R;
  }, [R, size.width]);
  // 霧が晴れた時だけ地形の層を作り直す（それ以外は前の層を使い回す）
  const tilesRef = useRef(w.tiles);
  const key = seenKey(w) + ':' + w.tiles.length;
  const lastKey = useRef(key);
  if (lastKey.current !== key) {
    lastKey.current = key;
    tilesRef.current = w.tiles;
  }

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

  const senses = partySenses(game);
  const night = timeOfDay(w.worldTurn);
  const tint =
    night === 'night' ? 'rgba(12,18,60,.42)' : night === 'evening' ? 'rgba(255,110,40,.14)' : night === 'morning' ? 'rgba(255,230,180,.06)' : 'transparent';

  // 同じマスのキャラは少しずらして並べる
  const heroSpots = useMemo(() => {
    const byTile = new Map<number, string[]>();
    for (const [id, t] of Object.entries(shownPos)) byTile.set(t, [...(byTile.get(t) ?? []), id]);
    return byTile;
  }, [shownPos]);

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1" style={{ touchAction: 'pan-x pan-y' }}>
    <div ref={box} className="absolute inset-0 overflow-auto overscroll-contain bg-[#0b0910]" style={{ touchAction: 'pan-x pan-y' }} data-world-map>
      <div style={{ paddingTop: padY, paddingBottom: padBottom, width: W }} data-map-pad>
      <div className="relative" style={{ width: W, height: H }} onClick={(e) => { if (!anim) tap(e); }}>
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
          {/* 施設（霊感のキャラがいれば、祠とイベントは霧の中でも光って見える） */}
          {w.tiles.map((t, i) => {
            if (!t.f) return null;
            if (!t.seen) {
              if (!senses || (t.f.kind !== 'shrine' && t.f.kind !== 'event')) return null;
              const { x, y } = center(i);
              return <circle key={`sense${i}`} cx={x} cy={y} r={R * 0.32} fill={t.f.kind === 'shrine' ? '#9affd0' : '#9ad8ff'} opacity={0.75} filter="url(#place-shadow)" data-sensed={t.f.kind} />;
            }
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
              data-rare={wd.rare ? 'true' : undefined}
              style={{ left: x - s / 2, top: y - s * 0.62, width: s, height: s, filter: wd.raidTown ? 'drop-shadow(0 0 6px #ff3a3a)' : wd.rare ? 'drop-shadow(0 0 7px #ffd24a)' : 'drop-shadow(0 2px 2px #000)' }}
            >
              {/* 地形の模様の上でも見えるように、暗い円と赤い縁を敷く（レアは金の縁と★） */}
              <span className={`absolute inset-[8%] rounded-full border-2 bg-[#140a10]/80 ${wd.rare ? 'border-amber-300' : 'border-red-500/80'}`} />
              {wd.rare && <span className="absolute -left-1 top-0 z-10 text-[14px] leading-4 font-black text-amber-300">★</span>}
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
              <span className="absolute -right-1 -bottom-1 rounded-full bg-red-900 px-1 text-[12px] leading-4 font-black text-red-100">倒</span>
            </div>
          );
        })}
        {anim?.arrived && <span data-arrival-marker className="pointer-events-none absolute z-10 rounded-full border-2 border-amber-200 bg-amber-950 px-2 text-[22px] font-black text-amber-100" style={{ left: center(anim.path[anim.i]).x - 13, top: Math.max(4, center(anim.path[anim.i]).y - R * 2.3) }}>！</span>}
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
                  top: y - s * 0.62 + spot.dy * R,
                  width: s,
                  height: s,
                  zIndex: 2 + spot.z + (moving ? 10 : 0),
                  opacity: w.acted.includes(id) && !active ? 0.75 : 1,
                  // 地図の大きさが決まった直後・変わった直後は動かさずに置く（仮の大きさからすべって見えないように）
                  transition: geomSettling ? 'none' : moving ? `left ${stepMs * 0.8}ms ease-out, top ${stepMs * 0.8}ms ease-out` : 'left .35s ease-out, top .35s ease-out',
                }}
              >
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
      {/* 時間帯と侵食度の色（地図の上に重ねる。タップは通す） */}
      <div className="pointer-events-none absolute inset-0" style={{ background: tint }} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(90,20,110,${(w.corruption / 100) * 0.55}) 100%)` }}
      />
    </div>
  );
}
