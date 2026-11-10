// ===== ダンジョンの通路（第3段階: 歩いて回り、見た所が地図に描き足される。部屋の中身は扉を開けるまで分からない） =====
// 段階B: 一人称の通路の絵（DungeonView）・右上のミニマップ（タップで大きな地図と「ここまで歩く」）・絵に重ねた歩くボタン
import { VoteChips } from '../ui/Votes';
import { AnimatePresence, motion } from 'framer-motion';
import { showVoteHint, moveGuide } from '../dungeon/hints';
import { ArrowDown, ArrowUp, Backpack, Check, Coins, Compass, Crown, DoorClosed, DoorClosedLocked, Flame, Gift, Hand, LogOut, Menu, Sparkles, Swords, Skull, Users, X, Dices, Star } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatedDungeonView } from '../dungeon/DungeonAnim';
import { corridorArt, OmenMark } from '../dungeon/DungeonView';
import { holdImages } from '../../art/images';
import { DUNGEONS } from '../../data/dungeons';
import { getItem } from '../../data/items';
import {
  cellKey,
  currentVote,
  doorFront,
  doorOmen,
  exploreRollerOf,
  canWatchHere,
  exploreShared,
  dungeonGrid,
  dungeonNavigator,
  OMEN_INFO,
  type DoorOmen,
  exploredPercent,
  findPath,
  heroMaxHp,
  notVoted,
  partyGold,
  posOf,
  reachableRooms,
  retreatLoss,
  statChance,
  voters,
  walkableKeys,
  activeCells,
  type MapCell,
} from '../../engine';
import { BALANCE } from '../../data/balance';
import { PLAYER_COLOR } from '../../data/theme';
import { isLocalPlayer } from '../../store/battleConfig';
import { useOnline } from '../../store/onlineStore';
import { RollStrip } from '../ui/CheckPanel';
import { DiceOverlay, DiceResult } from '../ui/DiceRoll';
import { HeroFace } from '../ui/game';
import { PetToken } from '../ui/PetToken';
import { Eye, Minus, Plus } from 'lucide-react';
import type { DungeonRun, Facing, GameState, Hero, Room } from '../../types';
import { useElementSize } from '../../hooks/useElementSize';
import { LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { usePins, type PinsApi, type ShownPin } from '../../store/pins';
import { PinBanner, PinChips } from '../ui/PinChips';
import type { PinTarget } from '../../net/pins';
import { getRoomType } from '../../data/rules';
import { Bar, ItemIcon, Screen } from '../ui/game';

/** 部屋のアイコン（部屋の種類のデータの icon のキー → アイコン）。新しいアイコンが要る時はここに1行足す */
const ROOM_ICONS: Record<string, typeof Swords> = { swords: Swords, skull: Skull, crown: Crown, gift: Gift, sparkles: Sparkles, flame: Flame };

/** 部屋の種類の見た目（データから） */
function roomStyle(type: string) {
  const t = getRoomType(type);
  return { name: t.name, Icon: ROOM_ICONS[t.icon] ?? Sparkles, color: t.color, bg: t.bg, behavior: t.behavior, boss: !!t.battle?.boss };
}

/** 前にある扉の選択肢（左から右へ）。押すと、扉の前まで自動で歩いて、扉を開ける（扉1つで1回分。オーナーの案） */
export interface DoorChoice {
  room: Room;
  /** ボタンの文字（例: 「左の扉を開ける」） */
  label: string;
}

/** 選べる扉（今の通路の、開けられる扉だけ。後ろの扉・通った扉・選ばなかった扉・入口は出さない）。左から右の順 */
export function doorChoices(run: DungeonRun): DoorChoice[] {
  const grid = dungeonGrid(run);
  const rooms = reachableRooms(run)
    .filter((r) => !r.cleared && r.id !== run.currentRoomId)
    .map((r) => ({ r, c: grid.roomCell.get(r.id), f: doorFront(run, r.id) }))
    .filter((x) => x.c && x.f && findPath(run, x.f))
    .sort((a, b) => a.c!.x - b.c!.x)
    .map((x) => x.r);
  const n = rooms.length;
  const pos = (i: number) => (n === 1 ? '正面' : n === 2 ? (i === 0 ? '左' : '右') : n === 3 ? ['左', '真ん中', '右'][i] : `左から${i + 1}番目`);
  return rooms.map((room, i) => ({ room, label: `${pos(i)}の扉を開ける` }));
}

/**
 * 扉のボタン（大きく。気配の色の縁・ボスの冠・「こっち！」の札・みんなの票）。
 * 押すと、その扉に票を入れる（1台なら、すぐ開く）。オンラインで手番でない人が押すと、票と一緒に「こっち！」の印も出る
 */
function DoorButtons({ choices, ok, canPin, pins, omens, onOpen }: {
  choices: DoorChoice[];
  /** 票を入れられるか（このパーティの番・サイコロの後・残りがある・演出中でない） */
  ok: boolean;
  canPin: boolean;
  pins: PinsApi;
  omens: Record<string, DoorOmen>;
  onOpen: (roomId: string) => void;
}) {
  if (!choices.length) return null;
  const many = choices.length >= 3;
  return (
    <div className={`grid gap-1.5 ${choices.length === 1 ? 'grid-cols-1' : many ? 'grid-cols-3' : 'grid-cols-2'}`} data-door-choices={choices.length}>
      {choices.map(({ room, label }) => {
        const omen = omens[room.id];
        const boss = roomStyle(room.type).boss;
        const roomPins = pins.at({ kind: 'door', id: room.id });
        const cmd = { type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId: room.id } as const;
        return (
          <div key={room.id} className="relative">
            <button
              onClick={() => onOpen(room.id)}
              disabled={!ok && !canPin}
              className={`btn flex w-full flex-col items-center justify-center rounded-xl border-2 bg-black/70 px-1 text-amber-50 backdrop-blur-[2px] disabled:opacity-45 ${many ? 'h-14 text-[13px] leading-4' : 'h-14 text-[16px] leading-5'} font-bold`}
              style={{ borderColor: roomPins.length ? PLAYER_COLOR[roomPins[0].seat] : omen ? OMEN_INFO[omen].color : 'rgba(255,215,106,.7)', boxShadow: omen ? `0 0 10px ${OMEN_INFO[omen].color}` : undefined }}
              data-door-choice={room.id}
            >
              <span className="flex items-center gap-1">
                {boss ? <Crown size={many ? 15 : 18} className="shrink-0 text-amber-300" /> : <DoorClosed size={many ? 15 : 18} className="shrink-0 text-amber-200" />}
                <span className="font-display">{label}</span>
                <VoteChips cmd={cmd} />
              </span>
              <span className="max-w-full truncate text-[12px] font-normal" style={{ color: omen ? OMEN_INFO[omen].color : '#a1a1aa' }}>
                {boss ? '奥から強い気配がする…' : omen ? OMEN_TEXT[omen] : '中身は開けるまで分からない'}
              </span>
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
        // 中身は入るまで分からない（ボスの扉だけは見て分かる）
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
  const nav = dungeonNavigator(game);
  // 扉を選べるか（手番・担当・サイコロの後・残りがある）
  const myTurn = dungeonTurnHere(game) && !!nav && isLocalPlayer(nav.playerId);
  const left = game.world ? (run.explore ?? 0) : Infinity;
  // 扉の票はパーティのだれでも入れられる（全員一致で開く。今までの「扉を開ける」と同じ）
  const canVote = dungeonTurnHere(game) && game.mode === 'dungeon' && !busy && (!game.world || (run.explore != null && left > 0));
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
  // 2人以上: サイコロの前に「だれが振る？」。決まった人がほかの端末の人なら、その人を待つ
  const rollerId = exploreRollerOf(game);
  const roller = rollerId ? game.heroes.find((h) => h.id === rollerId) : undefined;
  const sharedRoll = exploreShared(game) && run.explore == null;
  const guide =
    myTurn && sharedRoll && game.mode === 'dungeon'
      ? !roller
        ? 'まずは下で、だれがサイコロを振るか決めよう'
        : !isLocalPlayer(roller.playerId)
          ? `${roller.name}がサイコロを振るのを待っています`
          : moveGuide({ myTurn, inDungeon: true, explore: run.explore, onWorld: !!game.world })
      : moveGuide({ myTurn, inDungeon: game.mode === 'dungeon', explore: run.explore, onWorld: !!game.world });
  const background = DUNGEONS.tryGet(run.dungeonId)?.background ?? run.background;
  // 通路の絵は入った時に読み込んで描ける形にし、手放さない（1歩ごとに描き直しても欠けない）
  const art = corridorArt(run.dungeonId, background);
  useEffect(() => holdImages(['wall', 'floor', 'ceiling', 'door', 'bossdoor'].map((p) => `dungeon/${art}-${p}`)), [art]);
  // 扉の気配（第3段階C1）: 部屋のID → 種類
  const omens = Object.fromEntries(run.rooms.map((r) => [r.id, doorOmen(game, r)]).filter(([, o]) => o)) as Record<string, DoorOmen>;
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
  const diceKey = run.exploreDice ? `explore:${game.seed}:${run.dungeonId}:${run.exploreDice.seq}` : undefined;
  const diceHero = run.exploreDice?.heroId ? game.heroes.find((h) => h.id === run.exploreDice!.heroId) : undefined;
  return (
    <Screen>
      {/* 名前は上の場面のタブに出ているので、タブが無い時だけ出す（帯は1本にまとめた） */}
      {!hasTabs && <div className="font-display text-outline shrink-0 truncate px-2 pt-1 text-[17px] leading-6 text-amber-100">{run.name}</div>}
      <div className="relative min-h-[200px] flex-1 overflow-hidden border-y border-amber-500/30">
        {/* 一人称の通路（いつも前を向く） */}
        <AnimatedDungeonView run={runN} background={background} omens={omens} onShown={setShown} onDoor={tapDoor} />
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
          {canPin && !guide && (
            <div className="pointer-events-none flex justify-center" data-pin-guide>
              <span className="rounded-lg bg-black/75 px-2 py-0.5 text-[12px] leading-4 text-sky-100">扉のボタン・地図のマスを押すと、手番の人に「こっち！」と伝えられます</span>
            </div>
          )}
          {guide && (
            <div className="pointer-events-none flex justify-center" data-move-guide>
              <span className="move-guide flex items-center gap-1 rounded-lg border border-amber-300/60 bg-black/80 px-2 py-0.5 text-[12px] leading-4 font-bold text-amber-100">
                {guide}
                <ArrowDown size={14} className="shrink-0 text-amber-300" />
              </span>
            </div>
          )}
          {choices.length >= 2 && canVote && (
            <div className="pointer-events-none flex justify-center" data-door-choice-note>
              <span className="rounded-lg bg-black/70 px-2 py-0.5 text-[12px] leading-4 text-amber-300/90">1つ開けると、ほかの扉は閉ざされます</span>
            </div>
          )}
          <DoorButtons choices={choices} ok={canVote} canPin={canPin} pins={pins} omens={omens} onOpen={openDoor} />
        </div>
        {showMap && <MapOverlay run={run} onClose={() => setShowMap(false)} myTurn={myTurn} pins={pins} canPin={canPin} pinsOf={pinsOf} />}
      </div>
      <DiceOverlay dice={run.exploreDice} diceKey={diceKey} title={`${diceHero?.name ?? ''}の探索のサイコロ（選べる扉の数）`} />
      <ExplorePanel busy={busy} />
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
              <div className="mt-1 text-[13px] text-zinc-300">拠点に戻ると全員が全回復します。ただし、このダンジョンで手に入れた宝を1つ失います。</div>
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

/** 気配の説明（目の前の扉） */
const OMEN_TEXT: Record<DoorOmen, string> = {
  danger: '奥から危険な気配がする…',
  treasure: 'きらりと財宝の気配がする',
  rest: '穏やかな安らぎの気配がする',
  mystery: '不思議な気配がする…',
};

/** 周囲の警戒（第3段階C1）: 歩数2・感知の判定。成功1で開けられる扉の場所と気配、完全成功で次の戦闘に応援 */
function WatchPanel({ onClose }: { onClose: () => void }) {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const [focus, setFocus] = useState(0);
  const nav = dungeonNavigator(game);
  // 判定するキャラ: 手番のキャラの担当の人のキャラのうち、感知が一番高いキャラ
  const judge = game.heroes
    .filter((h) => (game.party ?? []).includes(h.id) && h.hp > 0 && nav && h.playerId === nav.playerId)
    .sort((a, b) => statChance(b, 'per') - statChance(a, 'per'))[0];
  if (!judge) return null;
  const slots = BALANCE.dungeonWatchSlots;
  const max = Math.min(slots, judge.focus);
  const f = Math.min(focus, max);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose} data-watch-panel>
      <div className="panel panel-gold-edge m-2 w-full max-w-[464px] rounded-xl p-3" onClick={(e) => e.stopPropagation()}>
        <div className="font-display flex items-center gap-1.5 text-[18px] text-sky-100">
          <Eye size={18} /> 周囲の警戒（扉の数は使わない）
        </div>
        <div className="mt-1 text-[13px] leading-5 text-zinc-300">
          {judge.name}の感知{statChance(judge, 'per')}%×{slots}枠で判定する。この通路で1回だけ。
          <span className="block">成功1つ: 開けられる扉の場所と気配が分かる</span>
          <span className="block">成功2つ: さらに身構えて、次の戦闘で全員に「応援」</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-[13px]">
          <button onClick={() => setFocus(Math.max(0, f - 1))} disabled={f <= 0} aria-label="フォーカスを減らす" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
            <Minus size={18} />
          </button>
          <span>
            フォーカス <b className="text-amber-200">{f}</b>（残り{judge.focus}）
          </span>
          <button onClick={() => setFocus(Math.min(max, f + 1))} disabled={f >= max} aria-label="フォーカスを増やす" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
            <Plus size={18} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="btn btn-dark h-12 rounded-lg font-bold">
            やめる
          </button>
          <button
            onClick={() => {
              onClose();
              dispatchGame({ type: 'DUNGEON_WATCH', playerId: judge.playerId, heroId: judge.id, focusUsed: f });
            }}
            className="btn btn-gold font-display h-12 rounded-lg text-[17px]"
          >
            警戒する
          </button>
        </div>
      </div>
    </div>
  );
}

/** このダンジョンのパーティの番か（世界マップが無いシナリオは、いつでも） */
export const dungeonTurnHere = (game: GameState) => !game.world || (game.party ?? []).includes(game.world.turn);

/** 「だれが振る？」（ダンジョンのパーティに2人以上のプレイヤーがいる時。全員が同じキャラを選ぶと決まる。宝箱の開け役と同じ形）。
 * サイコロの目はだれが振っても同じ確率。違うのは、振り直しに使うフォーカスが残っているか */
function ExploreRollerPicker({ heroes, chosen }: { heroes: Hero[]; chosen?: string }) {
  const dispatchGame = useBattle((s) => s.dispatchGame);
  useOnline((s) => s.tick);
  const best = [...heroes].sort((a, b) => b.focus - a.focus)[0]?.id;
  const seatName = (h: Hero) => useOnline.getState().room?.seatName(h.playerId);
  return (
    <div className="mx-2 mt-1.5 flex shrink-0 flex-col gap-1" data-explore-picker>
      <div className="text-[12px] leading-4 text-zinc-300">だれが探索のサイコロ（1〜{BALANCE.exploreDiceSides}）を振る？ 全員が同じ人を選ぶと決まります（振った人のフォーカス1で1回振り直せる）</div>
      {heroes.map((h) => {
        const cmd = { type: 'EXPLORE_ROLLER', playerId: LOCAL_PLAYER, heroId: h.id } as const;
        return (
          <div key={h.id} className={`flex items-center gap-1.5 rounded-lg p-1 ${chosen === h.id ? 'bg-amber-500/25 ring-1 ring-amber-300' : 'bg-black/35'}`} data-explore-roller={h.id}>
            <HeroFace hero={h} size={30} />
            <span className="min-w-0 flex-1 leading-4">
              <span className="flex items-center gap-1 text-[13px] font-bold">
                <span className="rounded px-1 text-[12px] text-black" style={{ background: PLAYER_COLOR[h.playerId] }}>
                  {h.playerId}
                </span>
                <span className="truncate">{h.name}</span>
                {h.id === best && h.focus > 0 && <span className="shrink-0 text-[12px] text-amber-300">おすすめ</span>}
              </span>
              <span className="block truncate text-[12px] text-zinc-300 tabular-nums">
                {h.focus > 0 ? `フォーカス${h.focus}（振り直しできる）` : 'フォーカスなし（振り直しできない）'}
                {seatName(h) ? `・${seatName(h)}` : ''}
              </span>
            </span>
            <button onClick={() => dispatchGame(cmd)} className={`btn flex h-11 shrink-0 items-center gap-0.5 rounded-lg px-2 text-[13px] font-bold ${chosen === h.id ? 'btn-gold' : 'btn-dark'}`}>
              <Hand size={14} />
              任せる
              <VoteChips cmd={cmd} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 探索のサイコロ（オーナーの案）: ダンジョンのパーティも世界マップの手番の順番で動く。
 * 番が来たらサイコロ（1〜3）を振り、出た目の数だけ扉を選べる。扉1つで1（歩く距離は数えない）。使い切るか「手番を終える」で次の人の番。
 * 2人以上のプレイヤー: 先に「だれが振る？」をみんなで決め、決まったキャラの担当の人が振る（オーナーの案）。
 * 残りが0でも、この通路でまだ「警戒」していなければ、警戒と「手番を終える」が残る
 */
function ExplorePanel({ busy }: { busy: boolean }) {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  useOnline((s) => s.tick);
  const [watching, setWatching] = useState(false);
  const [pickAgain, setPickAgain] = useState(false);
  const run = game.dungeon!;
  const chosenId = exploreRollerOf(game);
  useEffect(() => setPickAgain(false), [chosenId]);
  if (!game.world) return null;
  const w = game.world;
  if (!dungeonTurnHere(game)) {
    const t = game.heroes.find((h) => h.id === w.turn);
    const seat = t ? useOnline.getState().room?.seatName(t.playerId) : undefined;
    return (
      <div className="mx-2 mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-sky-300/40 bg-black/50 px-3 py-2 text-[13px]">
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
          <span className="block text-[12px] text-zinc-400">順番が来たら、このダンジョンを探索できます</span>
        </span>
      </div>
    );
  }
  const party = game.heroes.filter((h) => (game.party ?? []).includes(h.id) && h.hp > 0);
  const nav = dungeonNavigator(game);
  const watchedHere = !canWatchHere(run);
  const canWatch = !!nav && isLocalPlayer(nav.playerId) && game.mode === 'dungeon' && !watchedHere && run.explore != null;
  const shared = exploreShared(game);
  const chosen = chosenId ? party.find((h) => h.id === chosenId) : undefined;
  // 1人の時に振るキャラ: この端末のキャラのうち、フォーカスが一番多いキャラ（振り直しに使える）
  const roller = shared ? chosen : party.filter((h) => isLocalPlayer(h.playerId)).sort((a, b) => b.focus - a.focus)[0];
  if (run.explore == null) {
    if (game.mode !== 'dungeon') return null;
    // 2人以上: まず「だれが振る？」
    if (shared && (!chosen || pickAgain)) return <ExploreRollerPicker heroes={party} chosen={chosen?.id} />;
    // 決まったキャラが、ほかの人の担当: 待つ
    if (shared && chosen && !isLocalPlayer(chosen.playerId)) {
      return (
        <div className="mx-2 mt-1.5 flex shrink-0 items-center gap-2 rounded-xl border border-sky-300/40 bg-black/50 px-2 py-1.5 text-[13px]" data-explore-wait>
          <HeroFace hero={chosen} size={30} />
          <span className="min-w-0 flex-1 leading-4">
            <b>{chosen.name}</b>がサイコロを振ります
            <span className="block text-[12px] text-zinc-400">{useOnline.getState().room?.seatName(chosen.playerId) ?? chosen.playerId}さんが振るのを待っています</span>
          </span>
          <button onClick={() => setPickAgain(true)} className="btn btn-dark h-11 shrink-0 rounded-lg px-2 text-[12px] font-bold">
            選び直す
          </button>
        </div>
      );
    }
    if (!roller) return null;
    return (
      <div className="mx-2 mt-1.5 flex shrink-0 flex-col gap-0.5" data-explore-roll>
        {shared && (
          <div className="flex items-center gap-1.5 text-[12px] text-amber-100" data-explore-chosen>
            <span className="min-w-0 flex-1">みんなで決めた振る人：<b>{roller.name}</b></span>
            <button onClick={() => setPickAgain(true)} className="btn btn-dark h-11 shrink-0 rounded-lg px-2 text-[12px] font-bold">
              選び直す
            </button>
          </div>
        )}
        <button
          onClick={() => dispatchGame({ type: 'EXPLORE_ROLL', playerId: roller.playerId, heroId: roller.id })}
          className="btn btn-gold font-display flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl text-[17px]"
          data-explore-roll-button
        >
          <Dices size={19} /> サイコロを振る
          <span className="text-[13px] tabular-nums">扉 1〜{BALANCE.exploreDiceSides}つ</span>
        </button>
        <span className="text-center text-[12px] leading-4 text-zinc-400">
          出た目の数だけ扉を選べる・{roller.name}のフォーカス1で1回振り直せる（残り{roller.focus}）
        </span>
      </div>
    );
  }
  const d = run.exploreDice;
  const diceHero = d?.heroId ? party.find((h) => h.id === d.heroId) : undefined;
  const canReroll = !!d && !d.rerolled && run.explore === d.total && game.mode === 'dungeon' && !!diceHero && isLocalPlayer(diceHero.playerId) && diceHero.focus >= 1;
  return (
    <div className="mx-2 mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-amber-300/40 bg-black/50 px-2 py-1.5" style={{ pointerEvents: busy ? 'none' : undefined }} data-explore-left={run.explore}>
      <div className="flex shrink-0 flex-col items-center rounded-lg bg-black/40 px-2 py-0.5">
        <span className="text-[12px] text-zinc-400">選べる扉</span>
        <b className="font-display text-[22px] leading-6 text-amber-200 tabular-nums">{run.explore}</b>
      </div>
      <div className="min-w-0 flex-1">
        {watchedHere && run.watchRoll ? <RollStrip results={run.watchRoll} small /> : d && <DiceResult dice={d} unit="" />}
        <div className="truncate text-[12px] leading-4 text-zinc-400">{run.explore > 0 ? '扉1つで1回分' : canWatch ? '選び終えた（警戒できる）' : '選び終えた'}</div>
      </div>
      {canReroll && (
        <button onClick={() => diceHero && dispatchGame({ type: 'EXPLORE_REROLL', playerId: diceHero.playerId, heroId: diceHero.id })} className="btn btn-dark flex h-11 shrink-0 flex-col items-center justify-center rounded-lg px-2 text-[12px] leading-4 font-bold" data-reroll>
          <span className="flex items-center gap-0.5">
            <Star size={11} className="fill-amber-400/70 text-amber-300" />1で
          </span>
          振り直す
        </button>
      )}
      <button
        onClick={() => setWatching(true)}
        disabled={!canWatch}
        className="btn btn-dark flex h-11 min-w-[48px] shrink-0 flex-col items-center justify-center rounded-lg px-2 text-[12px] leading-4 font-bold disabled:opacity-40"
        data-watch-open
      >
        <Eye size={15} className="text-sky-200" />
        警戒
      </button>
      {watching && <WatchPanel onClose={() => setWatching(false)} />}
      <button onClick={() => dispatchGame({ type: 'EXPLORE_END', playerId: LOCAL_PLAYER })} className="btn btn-dark h-11 shrink-0 rounded-lg px-3 text-[13px] font-bold" data-explore-end>
        手番を終える
        <VoteChips cmd={{ type: 'EXPLORE_END', playerId: LOCAL_PLAYER }} />
      </button>
    </div>
  );
}
