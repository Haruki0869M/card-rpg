// ===== ダンジョンの通路（抜本的な見直し 段階2: 扉1つ＝手番1回。扉の予兆（5色）を見て、次の扉を選ぶ） =====
// 一人称の絵は「扉の壁」（選択肢と同じ数・同じ並びの扉。dungeon/doors.ts）・右上のミニマップ（タップで大きな地図）・下に扉のボタン
import { VoteChips, VoteStatus } from '../ui/Votes';
import { AnimatePresence, motion } from 'framer-motion';
import { showVoteHint } from '../dungeon/hints';
import { ArrowDown, ArrowUp, Backpack, Check, Coins, Compass, Crown, DoorClosed, DoorClosedLocked, Eye, Flame, Gift, LogOut, Menu, Skull, Sparkles, Star, Swords, Users, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatedDungeonView } from '../dungeon/DungeonAnim';
import { corridorArt, OMEN_ICONS, OmenMark } from '../dungeon/DungeonView';
import { doorChoices, wallDoors, type DoorChoice } from '../dungeon/doors';
import { holdImages } from '../../art/images';
import { DUNGEONS } from '../../data/dungeons';
import { getItem } from '../../data/items';
import {
  cellKey,
  currentVote,
  doorFront,
  doorOmen,
  doorBeyond,
  doorDepthBonus,
  doorDetail,
  doorKind,
  omenOfType,
  omenInfoOf,
  canWatchHere,
  partySensesDoors,
  dungeonGrid,
  dungeonNavigator,
  OMEN_INFO,
  exploredPercent,
  depthTier,
  DEPTH_TIER_NAME,
  dungeonRows,
  isLegacyLayout,
  heroMaxHp,
  notVoted,
  partyGold,
  posOf,
  reachableRooms,
  retreatLoss,
  voters,
  walkableKeys,
  activeCells,
  type MapCell,
} from '../../engine';
import { BALANCE } from '../../data/balance';
import { PLAYER_COLOR } from '../../data/theme';
import { isLocalPlayer } from '../../store/battleConfig';
import { useOnline } from '../../store/onlineStore';
import { HeroFace } from '../ui/game';
import { PetToken } from '../ui/PetToken';
import type { DungeonRun, Facing, GameState, Room } from '../../types';
import { useElementSize } from '../../hooks/useElementSize';
import { LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { usePins, type PinsApi, type ShownPin } from '../../store/pins';
import { PinBanner, PinChips } from '../ui/PinChips';
import type { PinTarget } from '../../net/pins';
import { getRoomType } from '../../data/rules';
import { Bar, ItemIcon, Screen } from '../ui/game';

export { doorChoices, type DoorChoice };

/** 部屋のアイコン（部屋の種類のデータの icon のキー → アイコン）。新しいアイコンが要る時はここに1行足す */
const ROOM_ICONS: Record<string, typeof Swords> = { swords: Swords, skull: Skull, crown: Crown, gift: Gift, sparkles: Sparkles, flame: Flame };

/** 部屋の種類の見た目（データから） */
function roomStyle(type: string) {
  const t = getRoomType(type);
  return { name: t.name, Icon: ROOM_ICONS[t.icon] ?? Sparkles, color: t.color, bg: t.bg, behavior: t.behavior, boss: !!t.battle?.boss };
}

/** 重い扉（ボスの門・中ボスの扉）の色と文 */
const GATE = {
  boss: { color: '#ffcf4a', name: 'ボスの間', text: '奥から強い気配がする…', Icon: Crown },
  midboss: { color: '#d9a2ff', name: '中ボスの間', text: '逃げられない強敵が待つ', Icon: Skull },
} as const;

/** 扉の予兆の見た目（色・名前・説明・印）。ボス・中ボスは重い扉 */
export function doorLook(room: Room) {
  const kind = doorKind(room);
  if (kind !== 'door') return GATE[kind];
  const info = omenInfoOf(room.type) ?? { omen: 'mystery' as const, ...OMEN_INFO.mystery };
  return { color: info.color, name: info.name, text: info.text, Icon: OMEN_ICONS[info.omen] };
}

/**
 * 扉のボタン（予兆の色の縁・印・名前・ご褒美の説明・深層ボーナス・「こっち！」の札・みんなの票）。
 * 先読みができる時は、説明の代わりに中身（敵の名前・宝箱の格・イベントの題）と、その先の扉の色が出る。
 * 押すと、その扉に票を入れる（1台なら、すぐ開く）。オンラインで手番でない人が押すと、票と一緒に「こっち！」の印も出る
 */
function DoorButtons({ game, choices, ok, canPin, pins, onOpen }: {
  game: GameState;
  choices: DoorChoice[];
  /** 票を入れられるか（このパーティの番・演出中でない） */
  ok: boolean;
  canPin: boolean;
  pins: PinsApi;
  onOpen: (roomId: string) => void;
}) {
  if (!choices.length) return null;
  const many = choices.length >= 3;
  const run = game.dungeon!;
  return (
    <div className={`grid items-stretch gap-1.5 ${choices.length === 1 ? 'grid-cols-1' : many ? 'grid-cols-3' : 'grid-cols-2'}`} data-door-choices={choices.length}>
      {choices.map(({ room, place, label }) => {
        const look = doorLook(room);
        const detail = doorDetail(game, room);
        const beyond = doorBeyond(game, room);
        const bonus = doorDepthBonus(run, room);
        const roomPins = pins.at({ kind: 'door', id: room.id });
        const cmd = { type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId: room.id } as const;
        return (
          <div key={room.id} className="relative flex">
            <button
              onClick={() => onOpen(room.id)}
              disabled={!ok && !canPin}
              aria-label={`${label}（${look.name}）`}
              className="btn flex min-h-14 w-full min-w-0 flex-col items-center justify-center rounded-xl border-2 bg-black/75 px-1 py-1 text-amber-50 backdrop-blur-[2px] disabled:opacity-45"
              style={{ borderColor: roomPins.length ? PLAYER_COLOR[roomPins[0].seat] : look.color, boxShadow: `0 0 10px ${look.color}` }}
              data-door-choice={room.id}
              data-door-omen={doorKind(room) === 'door' ? (omenOfType(room.type) ?? '') : doorKind(room)}
              data-door-sealed={getRoomType(room.type).sealedChest || undefined}
            >
              <span className={`flex max-w-full items-center gap-1 font-bold ${many ? 'text-[13px] leading-4' : 'text-[15px] leading-5'}`}>
                <look.Icon size={many ? 14 : 16} className="shrink-0" style={{ color: look.color }} />
                <span className="font-display truncate">{place}</span>
                <VoteChips cmd={cmd} />
              </span>
              <span className="max-w-full truncate text-[12px] leading-4 font-bold" style={{ color: look.color }} data-door-omen-name>
                {look.name}
              </span>
              {detail ? (
                <span className="line-clamp-2 max-w-full text-center text-[12px] leading-4 text-zinc-100" data-door-detail>
                  {detail}
                </span>
              ) : (
                <span className="line-clamp-2 max-w-full text-center text-[12px] leading-4 text-zinc-300">{look.text}</span>
              )}
              {bonus && (
                <span className="max-w-full truncate text-[12px] leading-4 font-bold text-amber-200" data-door-bonus>
                  {bonus}
                </span>
              )}
              {beyond.length > 0 && (
                <span className="flex max-w-full items-center gap-1 text-[12px] leading-4 text-zinc-300" data-door-beyond={beyond.join(',')} aria-label={`その先: ${beyond.map((b) => (b === 'boss' || b === 'midboss' ? GATE[b].name : OMEN_INFO[b].name)).join('・')}`}>
                  その先
                  {beyond.map((b, i) => {
                    const c = b === 'boss' || b === 'midboss' ? GATE[b].color : OMEN_INFO[b].color;
                    const I = b === 'boss' || b === 'midboss' ? GATE[b].Icon : OMEN_ICONS[b];
                    return <I key={i} size={13} className="shrink-0" style={{ color: c }} />;
                  })}
                </span>
              )}
            </button>
            <PinChips pins={roomPins} className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2" />
          </div>
        );
      })}
    </div>
  );
}

/** 地図のマス（見たマスだけ。北が上）。大きな地図とミニマップで使う。x0 = 左端のマス、yTop = 上端のマス */
function MapCells({ run, cell, x0, yTop, left = 0, top = 0, only, target, onTap, pinsOf }: {
  run: DungeonRun;
  cell: number;
  x0: number;
  yTop: number;
  left?: number;
  top?: number;
  /** この範囲のマスだけ描く（ミニマップ） */
  only?: (c: MapCell) => boolean;
  target?: { x: number; y: number } | null;
  onTap?: (c: MapCell) => void;
  /** そのマスを指しているピン（扉は部屋のID、通路は "x,y"） */
  pinsOf?: (c: MapCell) => ShownPin[];
}) {
  const game = useBattle((s) => s.game);
  const grid = dungeonGrid(run);
  const pos = posOf(run);
  const seen = new Set(run.seen ?? []);
  const walk = walkableKeys(run);
  // 選ばなかった扉・その扉へだけ続いていた通路は描かない（古い保存データで見たことになっていても）
  const act = activeCells(run);
  const reach = new Set(reachableRooms(run).map((r) => r.id));
  const small = cell < 28;
  return (
    <>
      {grid.cells.map((c) => {
        const k = cellKey(c.x, c.y);
        if (!seen.has(k) || !act.has(k) || (only && !only(c))) return null;
        const here = c.x === pos.x && c.y === pos.y;
        const isTarget = !!target && target.x === c.x && target.y === c.y;
        const room = c.roomId ? run.rooms.find((r) => r.id === c.roomId) : undefined;
        const known = !!room && (room.cleared || room.id === run.currentRoomId);
        const t = room ? roomStyle(room.type) : undefined;
        const openable = !!room && !known && reach.has(room.id);
        const omen = room && game ? doorOmen(game, room) : undefined;
        // 次の行の扉は予兆の色が付く。それより先の扉は、入るまで分からない（ボスの扉だけは見て分かる）
        const Icon = !room || !t ? null : known ? t.Icon : t.boss ? Crown : openable ? DoorClosed : DoorClosedLocked;
        const Tag = onTap ? 'button' : 'span';
        const cellPins = pinsOf?.(c) ?? [];
        return (
          <Tag
            key={k}
            onClick={
              onTap
                ? (e: React.MouseEvent) => {
                    e.stopPropagation();
                    onTap(c);
                  }
                : undefined
            }
            className="absolute flex items-center justify-center"
            style={{
              left: left + (c.x - x0) * cell + 1,
              top: top + (yTop - c.y) * cell + 1,
              width: cell - 2,
              height: cell - 2,
              borderRadius: room ? Math.max(3, cell / 6) : 2,
              background: room && t ? (known ? t.bg : '#2a2018') : walk.has(k) ? '#3a3328' : '#211d18',
              border: `${small ? 1 : 2}px solid ${cellPins.length ? PLAYER_COLOR[cellPins[0].seat] : isTarget ? '#fff' : omen ? OMEN_INFO[omen].color : openable ? '#ffd76a' : room ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.08)'}`,
              boxShadow: omen && !small ? `0 0 10px ${OMEN_INFO[omen].color}` : openable && !small ? '0 0 10px rgba(255,215,106,.6)' : undefined,
              opacity: room && t && !known && !openable && !t.boss ? 0.55 : 1,
            }}
            data-cell={onTap ? k : undefined}
            data-room={room && !known && openable ? room.id : undefined}
            data-door={onTap && room && !known ? (openable ? 'open' : 'closed') : undefined}
            aria-label={onTap ? (room && t ? (known ? t.name : t.boss ? 'ボスの扉' : openable ? '扉' : '開かない扉') : '通路') : undefined}
          >
            {Icon && t && !here && <Icon size={Math.round(cell * 0.55)} strokeWidth={2.2} style={{ color: known ? t.color : t.boss ? '#ffcf4a' : openable ? '#ffd76a' : '#9a9080' }} />}
            {omen && !here && <OmenMark omen={omen} className="absolute -right-1.5 -top-1.5 !w-[46%]" />}
            {cellPins.length > 0 && (small ? (
              <span className="pin-pop absolute -inset-[2px] rounded-[4px] border-2" style={{ borderColor: PLAYER_COLOR[cellPins[0].seat], boxShadow: `0 0 6px ${PLAYER_COLOR[cellPins[0].seat]}` }} data-cell-pin />
            ) : (
              <PinChips pins={cellPins} className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" />
            ))}
            {room?.cleared && !small && (
              <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
            {here && (
              <span className="absolute inset-0 flex items-center justify-center" data-party-here>
                <span className="flex h-[78%] w-[78%] items-center justify-center rounded-full bg-amber-300 text-black shadow-[0_0_8px_#ffd36a]" style={{ transform: `rotate(${pos.facing * 90}deg)` }}>
                  <ArrowUp size={Math.round(cell * 0.5)} strokeWidth={3} />
                </span>
              </span>
            )}
          </Tag>
        );
      })}
    </>
  );
}

/** 右上の小さな地図（今いる場所のまわり5×5マス）。タップで大きな地図 */
function MiniMap({ run, onOpen, pinsOf, onDoor }: { run: DungeonRun; onOpen: () => void; pinsOf?: (c: MapCell) => ShownPin[]; /** 開けられる扉のマスをタップした（部屋のID）。ほかの所は大きな地図 */ onDoor?: (roomId: string) => void }) {
  const reach = new Set(reachableRooms(run).map((r) => r.id));
  const pos = posOf(run);
  const R = 2;
  const cell = 17;
  const size = (R * 2 + 1) * cell;
  const seen = new Set(run.seen ?? []);
  const grid = dungeonGrid(run);
  // 開けられる扉のマス（とまわり少し）を押したら、その扉へ（小さなマスをボタンにすると押しにくいので、位置で決める）。ほかは大きな地図
  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onDoor) {
      const r = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - r.left - 4;
      const py = e.clientY - r.top - 4;
      let best: { id: string; d: number } | undefined;
      for (const id of reach) {
        const c = grid.roomCell.get(id);
        if (!c || !seen.has(cellKey(c.x, c.y)) || Math.abs(c.x - pos.x) > R || Math.abs(c.y - pos.y) > R) continue;
        const cx = (c.x - (pos.x - R) + 0.5) * cell;
        const cy = (pos.y + R - c.y + 0.5) * cell;
        const d = Math.max(Math.abs(px - cx), Math.abs(py - cy));
        if (d <= cell * 0.6 && (!best || d < best.d)) best = { id, d };
      }
      if (best) return onDoor(best.id);
    }
    onOpen();
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={tap}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      aria-label="地図を開く"
      className="panel panel-gold-edge absolute right-2 top-2 z-20 cursor-pointer overflow-hidden rounded-lg p-0"
      style={{ width: size + 8, height: size + 8 }}
      data-minimap
    >
      <span className="absolute" style={{ left: 4, top: 4, width: size, height: size }}>
        <MapCells run={run} cell={cell} x0={pos.x - R} yTop={pos.y + R} only={(c) => Math.abs(c.x - pos.x) <= R && Math.abs(c.y - pos.y) <= R} pinsOf={pinsOf} />
      </span>
    </div>
  );
}

/** 大きな地図（ミニマップをタップで開く）。見えている場所をタップして「ここまで歩く」 */
function MapOverlay({ run, onClose, myTurn, pins, canPin, pinsOf }: {
  run: DungeonRun;
  pins: PinsApi;
  canPin: boolean;
  pinsOf: (c: MapCell) => ShownPin[];
  onClose: () => void;
  myTurn: boolean;
}) {
  const grid = dungeonGrid(run);
  const pos = posOf(run);
  const seen = new Set(run.seen ?? []);
  const walk = walkableKeys(run);
  const [target, setTarget] = useState<{ x: number; y: number; pin?: PinTarget } | null>(null);
  const [mapRef, size] = useElementSize<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const W = size.width || 340;
  const cell = Math.max(34, Math.min(52, Math.floor((W - 24) / Math.max(3, grid.width))));
  const mapH = grid.height * cell;
  const left = (W - grid.width * cell) / 2;
  // 今いるマスが見えるようにスクロール
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, mapH - (pos.y + 1) * cell + 8 - el.clientHeight * 0.6);
  }, [pos.y, mapH, cell]);
  // 地図は見るだけ（進むのは扉のボタン）。手番でない人は、タップで「こっち！」を伝えられる
  const tapCell = (c: MapCell) => {
    if (!canPin || myTurn) return setTarget(null);
    if (c.kind === 'room') {
      const f = doorFront(run, c.roomId!);
      if (f && walk.has(cellKey(f.x, f.y)) && seen.has(cellKey(f.x, f.y))) setTarget({ ...f, pin: { kind: 'door', id: c.roomId! } });
      else setTarget(null);
      return;
    }
    if (walk.has(cellKey(c.x, c.y))) setTarget({ x: c.x, y: c.y, pin: { kind: 'dungeonCell', id: cellKey(c.x, c.y) } });
    else setTarget(null);
  };
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#0c0a08]" data-map-overlay>
      <div className="flex h-11 shrink-0 items-center gap-2 px-2">
        <span className="font-display min-w-0 flex-1 text-[16px] text-amber-100">地図（探索度 {exploredPercent(run)}%）</span>
        <button onClick={onClose} aria-label="地図を閉じる" className="btn btn-dark flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <X size={20} />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overscroll-contain" onClick={() => setTarget(null)}>
          {/* 地図が画面より小さい時は、上下の真ん中に置く */}
          <div className="flex min-h-full flex-col justify-center">
            <div ref={mapRef} className="relative mx-auto w-full shrink-0" style={{ height: mapH + 20 }} data-dungeon-map>
              <MapCells run={run} cell={cell} x0={0} yTop={grid.height - 1} left={left} top={10} target={target} onTap={tapCell} pinsOf={pinsOf} />
            </div>
          </div>
        </div>
        {target && canPin && !myTurn && target.pin && (
          <div className="panel panel-gold-edge absolute inset-x-2 top-2 z-10 flex items-center gap-2 rounded-xl p-2" onClick={(e) => e.stopPropagation()} data-pin-panel>
            <div className="min-w-0 flex-1 text-[13px] leading-4">
              {target.pin.kind === 'door' ? 'この扉' : 'この場所'}を手番の人に伝える
              <span className="block text-[12px] text-zinc-400">歩くのは手番の人です。全員の画面に印が出ます</span>
            </div>
            <button
              onClick={() => {
                pins.toggle(target.pin!);
                setTarget(null);
              }}
              className="btn btn-gold h-11 shrink-0 rounded-lg px-3 font-bold"
              data-pin-send
            >
              こっち！
            </button>
            <button onClick={() => setTarget(null)} aria-label="閉じる" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
              <X size={20} />
            </button>
          </div>
        )}
      </div>
      <div className="shrink-0 px-3 pb-2 pt-1 text-center text-[12px] text-zinc-400">{canPin && !myTurn ? '見えている通路や扉をタップすると、手番の人に「こっち！」と伝えられます' : '進むのは、下の扉のボタンからです'}</div>
    </div>
  );
}

export function DungeonScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);
  useOnline((s) => s.tick);
  const run = game.dungeon!;
  // いつも前（北）を向いて見せる（扉を選ぶだけの形。古い保存データで別の向きを向いていても）
  const runN = useMemo(() => (run.pos && run.pos.facing !== 0 ? { ...run, pos: { ...run.pos, facing: 0 as Facing } } : run), [run]);
  // 演出の間は、ボタン・ミニマップ・探索度も「絵に出ている景色」に合わせる（歩き終わってから変わる）。押せない
  const [shown, setShown] = useState<DungeonRun | null>(null);
  const busy = !!shown;
  const vr = shown ?? runN;
  const [showMap, setShowMap] = useState(false);
  const [showRetreat, setShowRetreat] = useState(false);
  const hasTabs = useBattle((s) => (s.full?.expeditions?.length ?? 0) > 0);
  const partyHeroes = game.heroes.filter((h) => !game.party || game.party.includes(h.id));
  const loss = retreatLoss(game);
  // 古い形（40行・52行）のダンジョンか / 今いる行（入口の通路は0）
  const oldShape = isLegacyLayout(run);
  const depthRow = (vr.rooms.find((r) => r.id === vr.currentRoomId)?.row ?? -1) + 1;
  const nav = dungeonNavigator(game);
  // 手番のキャラの担当が、この端末の人か
  const myTurn = dungeonTurnHere(game) && !!nav && isLocalPlayer(nav.playerId);
  // 扉の票はパーティのだれでも入れられる（全員一致で開く。扉1つ＝手番1回）
  const canVote = dungeonTurnHere(game) && game.mode === 'dungeon' && !busy;
  // ピン（ステップ2）: オンラインで、手番のキャラの担当でない人は「こっち！」を伝えられる（開けるのは手番の人だけ）
  const pins = usePins();
  const canPin = pins.enabled && game.mode === 'dungeon' && !!nav && !isLocalPlayer(nav.playerId);
  const pinsOf = (c: MapCell): ShownPin[] => (c.roomId ? pins.at({ kind: 'door', id: c.roomId }) : pins.at({ kind: 'dungeonCell', id: cellKey(c.x, c.y) }));
  const choices = game.mode === 'dungeon' ? doorChoices(vr) : [];
  const describePin = (p: ShownPin) => {
    if (p.target.kind === 'door') {
      const c = choices.find((x) => x.room.id === p.target.id);
      return c ? c.label.replace('を開ける', '') : '地図の扉';
    }
    return '地図のマス';
  };
  const background = DUNGEONS.tryGet(run.dungeonId)?.background ?? run.background;
  // 通路の絵は入った時に読み込んで描ける形にし、手放さない（1歩ごとに描き直しても欠けない）
  const art = corridorArt(run.dungeonId, background);
  useEffect(() => holdImages(['wall', 'floor', 'ceiling', 'door', 'bossdoor'].map((p) => `dungeon/${art}-${p}`)), [art]);
  // 絵に描く扉（扉のボタンと同じ並び。絵とボタンが食い違わない）
  const doors = useMemo(() => wallDoors(choices), [choices.map((c) => c.room.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  // 扉を選ぶ（票を入れる。全員一致で、扉の前まで自動で歩いて開ける。歩く様子は扉が開く演出の中で見せる）。
  // オンラインで手番でない人は、票と一緒に「こっち！」の印も出す（もう同じ扉を指していれば、印はそのまま）
  const openDoor = (roomId: string) => {
    if (busy || !choices.some((c) => c.room.id === roomId)) return;
    const pinned = pins.mine?.target.kind === 'door' && pins.mine.target.id === roomId;
    if (canPin && !pinned) pins.toggle({ kind: 'door', id: roomId });
    if (canVote) dispatchGame({ type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId });
  };
  // 一人称の絵の扉をタップ: 扉のボタンと同じ
  const tapDoor = (roomId: string) => openDoor(roomId);
  // 今いる部屋（部屋の中に立っている時は、上に部屋の種類を文字で出す）
  const pos = posOf(vr);
  const roomHere = vr.currentRoomId && dungeonGrid(vr).roomCell.get(vr.currentRoomId);
  const inRoom = roomHere && roomHere.x === pos.x && roomHere.y === pos.y ? vr.rooms.find((r) => r.id === vr.currentRoomId) : undefined;
  const inRoomStyle = inRoom ? roomStyle(inRoom.type) : undefined;
  return (
    <Screen>
      {/* 名前は上の場面のタブに出ているので、タブが無い時だけ出す（帯は1本にまとめた） */}
      {!hasTabs && <div className="font-display text-outline shrink-0 truncate px-2 pt-1 text-[17px] leading-6 text-amber-100">{run.name}</div>}
      <div className="relative min-h-[200px] flex-1 overflow-hidden border-y border-amber-500/30">
        {/* 一人称の通路（いつも前を向く） */}
        <AnimatedDungeonView run={runN} background={background} doors={doors} onShown={setShown} onDoor={tapDoor} />
        {/* 左上: メニュー・探索度・お金（帯を1本にまとめた）と、部屋の中なら部屋の種類 */}
        <div className="absolute left-2 top-2 z-20 flex max-w-[calc(100%-118px)] flex-col items-start gap-1">
          <div className="flex items-center gap-1">
            <button onClick={() => openSheet('menu')} aria-label="メニュー" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
              <Menu size={20} />
            </button>
            <div className="panel flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-bold text-sky-200 tabular-nums" data-explored>
              <Compass size={14} /> 探索度 {exploredPercent(vr)}%
            </div>
            <div className="panel flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-bold text-amber-200 tabular-nums">
              <Coins size={14} /> {partyGold(game)}G
            </div>
          </div>
          {/* 深さ（今いる行 / 入口からボスまでの行）と、深層ボーナス。古い形のダンジョンは撤退して入り直せることを知らせる */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="panel flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-bold text-violet-200 tabular-nums" data-depth>
              <ArrowDown size={13} /> 深さ {depthRow}/{dungeonRows(vr)}
              {!oldShape && depthTier(Math.max(0, depthRow - 1)) > 0 && (
                <span className="flex items-center gap-0.5 text-amber-200" data-depth-bonus>
                  <Flame size={12} className="text-orange-300" />
                  {DEPTH_TIER_NAME[depthTier(depthRow - 1)]} 報酬+{Math.round(BALANCE.depthBonus.reward[depthTier(depthRow - 1)] * 100)}%
                </span>
              )}
            </span>
            {oldShape && (
              <span className="rounded-lg bg-black/75 px-2 py-0.5 text-[12px] leading-4 font-bold text-amber-200" data-old-shape>
                このダンジョンは古い形です。撤退しても何も失いません。入り直すと新しい短い形になります
              </span>
            )}
          </div>
          {inRoom && inRoomStyle && (
            <span className="flex items-center gap-1 rounded-lg bg-black/70 px-2 py-0.5 text-[12px] leading-4 font-bold" style={{ color: inRoomStyle.color }} data-room-here>
              <inRoomStyle.Icon size={13} /> {inRoomStyle.name}の部屋{inRoom.cleared ? '（済）' : ''}
            </span>
          )}
          {/* 別の端末の人と遊ぶ時: 扉は全員一致で開く（1台で遊ぶ時は1回で開くので出さない。地図を開いている間も出さない） */}
          {(showVoteHint(voters(game), isLocalPlayer, showMap) || (!showMap && voters(game).length > 1 && !!currentVote(game) && notVoted(game).length === 0)) && (
            <span className="pointer-events-none inline-block rounded-lg bg-black/70 px-2 py-0.5 text-[12px] leading-4 text-zinc-200" data-vote-hint>
              {currentVote(game) && notVoted(game).length === 0 ? '意見が分かれています。選び直してください' : '扉は全員が同じ扉を選ぶと開きます'}
            </span>
          )}
          {/* ピン: だれが「こっち！」と言っているか（全員の画面に。約8秒か、手番の人が動くと消える） */}
          {!showMap && pins.list.length > 0 && <PinBanner pins={pins.list} describe={describePin} />}
        </div>
        <div style={{ pointerEvents: busy ? 'none' : undefined }}>
          <MiniMap run={vr} onOpen={() => setShowMap(true)} pinsOf={pinsOf} onDoor={(id) => (canPin ? pins.toggle({ kind: 'door', id }) : setShowMap(true))} />
        </div>
        {/* 下端: 前にある扉のボタン（左から右へ）。押すと扉の前まで歩いて開ける。開けるのは手番のキャラの担当の人 */}
        <div className="absolute inset-x-2 bottom-2 z-10 flex flex-col gap-1" style={{ pointerEvents: busy ? 'none' : undefined }} data-dungeon-controls={busy ? 'busy' : 'ready'}>
          {/* みんなの選択を待っている時の枠（扉・撤退）。ボタンの上に置き、重ねない */}
          {!showRetreat && <VoteStatus />}
          {canPin && (
            <div className="pointer-events-none flex justify-center" data-pin-guide>
              <span className="rounded-lg bg-black/75 px-2 py-0.5 text-[12px] leading-4 text-sky-100">扉のボタン・地図のマスを押すと、手番の人に「こっち！」と伝えられます</span>
            </div>
          )}
          {choices.length >= 2 && canVote && (
            <div className="pointer-events-none flex justify-center" data-door-choice-note>
              <span className="rounded-lg bg-black/70 px-2 py-0.5 text-[12px] leading-4 text-amber-300/90">1つ開けると、ほかの扉は閉ざされます</span>
            </div>
          )}
          <DoorButtons game={game} choices={choices} ok={canVote} canPin={canPin} pins={pins} onOpen={openDoor} />
        </div>
        {showMap && <MapOverlay run={run} onClose={() => setShowMap(false)} myTurn={myTurn} pins={pins} canPin={canPin} pinsOf={pinsOf} />}
      </div>
      <ScoutBar busy={busy} />
      {/* パーティ（顔と細いHP）と、装備・道具・撤退を1行に */}
      <div className="flex shrink-0 items-center gap-1 px-2 pt-1.5 pb-3" data-dungeon-bar>
        <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
          {partyHeroes.map((h) => (
            <button key={h.id} onClick={() => openSheet('party')} aria-label={`${h.name} HP${h.hp}/${heroMaxHp(h)}`} className="btn relative flex h-11 w-11 shrink-0 flex-col items-center justify-center">
              <HeroFace hero={h} size={30} dim={h.hp <= 0} />
              <span className="mt-[2px] block w-[32px]">
                <Bar value={h.hp} max={heroMaxHp(h)} color="linear-gradient(90deg,#22b45a,#7dffa8)" height={4} />
              </span>
              {/* 並びの欄は横にスクロールするので、はみ出すと上が切れる（ステップ1）。ボタンの内側の右上に置く */}
              {h.pet && (
                <span className="absolute top-0 right-0" data-party-pet>
                  <PetToken ownerId={h.id} pet={h.pet} size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
        {(
          [
            ['装備', Users, 'text-amber-300', () => openSheet('party')],
            ['道具', Backpack, 'text-amber-300', () => openSheet('pouch')],
            ['撤退', LogOut, 'text-red-300', () => setShowRetreat((v) => !v)],
          ] as const
        ).map(([label, Icon, color, on]) => (
          <button key={label} onClick={on} className="btn btn-dark flex h-12 w-[52px] shrink-0 flex-col items-center justify-center rounded-xl text-[12px] leading-4 font-bold">
            <Icon size={17} className={color} />
            {label}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {showRetreat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-end bg-black/60"
            onClick={() => setShowRetreat(false)}
          >
            <div className="panel panel-gold-edge m-2 w-full rounded-xl p-3" onClick={(e) => e.stopPropagation()}>
              <div className="font-display text-[18px] text-red-200">ダンジョンから撤退する</div>
              <VoteStatus className="mt-1" />
              <div className="mt-1 text-[13px] text-zinc-300">
                {oldShape
                  ? 'このダンジョンは古い形です。撤退しても何も失いません。入り直すと新しい短い形になります（進んだ部屋は最初からになります。入り直す時の侵食度と手番は、いつもどおりかかります）。'
                  : '拠点に戻ると全員が全回復します。ただし、このダンジョンで手に入れた宝を1つ失います。'}
              </div>
              {loss ? (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-950/50 p-2 text-[13px]">
                  <ItemIcon item={getItem(loss.itemId)} size={36} />
                  <span>
                    失うもの：<b>{getItem(loss.itemId).name}</b>
                  </span>
                </div>
              ) : (
                <div className="mt-2 text-[13px] text-emerald-300">失う宝はありません。</div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => setShowRetreat(false)} className="btn btn-dark h-12 rounded-lg font-bold">
                  やめる
                </button>
                <button
                  onClick={() => {
                    setShowRetreat(false);
                    dispatchGame({ type: 'RETREAT', playerId: LOCAL_PLAYER });
                  }}
                  disabled={game.mode !== 'dungeon'}
                  className="btn h-12 rounded-lg border border-red-300/60 bg-red-800 font-bold"
                >
                  撤退する
                  <VoteChips cmd={{ type: 'RETREAT', playerId: LOCAL_PLAYER }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}

/** このダンジョンのパーティの番か（世界マップが無いシナリオは、いつでも） */
export const dungeonTurnHere = (game: GameState) => !game.world || (game.party ?? []).includes(game.world.turn);

/**
 * 周囲の警戒（オーナーの決定 2-A）: キャラを1人選び、そのキャラのフォーカス1を払う。判定は無い。
 * この通路にいる間、扉の先の中身（敵の名前・宝箱の格・イベントの題）と、その先の扉の色が分かる
 */
function ScoutPicker({ onClose }: { onClose: () => void }) {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  // 払えるキャラ: この端末の人のキャラ（パーティの中で、生きている）
  const mine = game.heroes.filter((h) => (game.party ?? game.heroes.map((x) => x.id)).includes(h.id) && h.hp > 0 && !h.retired && isLocalPlayer(h.playerId));
  const cost = BALANCE.dungeonScoutFocus;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose} data-scout-panel>
      <div className="panel panel-gold-edge m-2 w-full max-w-[464px] rounded-xl p-3" onClick={(e) => e.stopPropagation()}>
        <div className="font-display flex items-center gap-1.5 text-[18px] text-sky-100">
          <Eye size={18} /> 周囲の警戒（フォーカス{cost}）
        </div>
        <div className="mt-1 text-[13px] leading-5 text-zinc-300">
          だれかのフォーカスを{cost}払うと、この通路にいる間、扉の先が読めます（判定なし・この通路で1回だけ）。
          <span className="block">・扉の先の中身（敵の名前・宝箱の種類・イベントの名前）</span>
          <span className="block">・その先の扉の色</span>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          {mine.map((h) => (
            <button
              key={h.id}
              disabled={h.focus < cost}
              onClick={() => {
                onClose();
                dispatchGame({ type: 'DUNGEON_SCOUT', playerId: h.playerId, heroId: h.id });
              }}
              className="btn btn-dark flex h-12 items-center gap-2 rounded-lg px-2 text-left disabled:opacity-40"
              data-scout-hero={h.id}
            >
              <HeroFace hero={h} size={32} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold">
                <span className="mr-1 rounded px-1 text-[12px] text-black" style={{ background: PLAYER_COLOR[h.playerId] }}>
                  {h.playerId}
                </span>
                {h.name}
              </span>
              <span className="flex shrink-0 items-center gap-0.5 text-[13px] text-amber-200 tabular-nums">
                <Star size={13} className="fill-amber-400/70 text-amber-300" />
                {h.focus < cost ? 'フォーカスなし' : `${h.focus} → ${h.focus - cost}`}
              </span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="btn btn-dark mt-2 h-12 w-full rounded-lg font-bold">
          やめる
        </button>
      </div>
    </div>
  );
}

/**
 * 扉のボタンの下の帯: だれの番か（ほかの人の番の時）／先読みの状態と「周囲の警戒」。
 * 扉1つ＝手番1回: 扉を開けて部屋を済ませたら、この組の番は終わる（全員がダンジョンの中なら、すぐ次の扉を選べる）
 */
function ScoutBar({ busy }: { busy: boolean }) {
  const game = useBattle((s) => s.game)!;
  useOnline((s) => s.tick);
  const [picking, setPicking] = useState(false);
  const run = game.dungeon!;
  const w = game.world;
  if (w && !dungeonTurnHere(game)) {
    const t = game.heroes.find((h) => h.id === w.turn);
    const seat = t ? useOnline.getState().room?.seatName(t.playerId) : undefined;
    return (
      <div className="mx-2 mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-sky-300/40 bg-black/50 px-3 py-2 text-[13px]" data-dungeon-wait>
        {t && <HeroFace hero={t} size={30} />}
        <span className="min-w-0 flex-1">
          {t ? (
            <>
              <span className="rounded px-1 text-[12px] font-bold text-black" style={{ background: PLAYER_COLOR[t.playerId] }}>
                {t.playerId}
              </span>{' '}
              {seat ? `${seat}さんの` : ''}
              {t.name}の番です
            </>
          ) : (
            'ほかの人の番です'
          )}
          <span className="block text-[12px] text-zinc-400">順番が来たら、次の扉を選べます</span>
        </span>
      </div>
    );
  }
  if (game.mode !== 'dungeon' || !reachableRooms(run).some((r) => !r.cleared)) return null;
  const senses = partySensesDoors(game);
  const watched = !canWatchHere(run);
  const mine = game.heroes.filter((h) => (game.party ?? game.heroes.map((x) => x.id)).includes(h.id) && h.hp > 0 && !h.retired && isLocalPlayer(h.playerId));
  const canScout = !senses && !watched && mine.some((h) => h.focus >= BALANCE.dungeonScoutFocus);
  return (
    <div className="mx-2 mt-1.5 flex shrink-0 items-center gap-2 rounded-xl border border-amber-300/40 bg-black/50 px-2 py-1" style={{ pointerEvents: busy ? 'none' : undefined }} data-scout-bar={senses ? 'sense' : watched ? 'watched' : 'none'}>
      <Eye size={18} className={`shrink-0 ${senses || watched ? 'text-sky-200' : 'text-zinc-500'}`} />
      <span className="min-w-0 flex-1 text-[12px] leading-4 text-zinc-200">
        {senses ? (
          <>
            <b className="text-sky-100">先読み中</b>（感知の高い仲間・フクロウ・霊感）
            <span className="block text-zinc-400">扉の先の中身と、その先の扉の色が見えています</span>
          </>
        ) : watched ? (
          <>
            <b className="text-sky-100">警戒中</b>
            <span className="block text-zinc-400">扉の先の中身と、その先の扉の色が見えています</span>
          </>
        ) : (
          <>
            扉を1つ選ぶと、部屋へ進みます
            <span className="block text-zinc-400">警戒すると、扉の先の中身まで読めます</span>
          </>
        )}
      </span>
      {!senses && !watched && (
        <button onClick={() => setPicking(true)} disabled={!canScout} className="btn btn-dark flex h-11 min-w-[72px] shrink-0 flex-col items-center justify-center rounded-lg px-2 text-[12px] leading-4 font-bold disabled:opacity-40" data-scout-open>
          <span className="flex items-center gap-0.5">
            <Eye size={14} className="text-sky-200" />
            警戒
          </span>
          <span className="flex items-center gap-0.5 text-amber-200">
            <Star size={11} className="fill-amber-400/70 text-amber-300" />
            {BALANCE.dungeonScoutFocus}
          </span>
        </button>
      )}
      {picking && <ScoutPicker onClose={() => setPicking(false)} />}
    </div>
  );
}
