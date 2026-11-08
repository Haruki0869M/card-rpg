// ===== ダンジョンの通路（第3段階: 歩いて回り、見た所が地図に描き足される。部屋の中身は扉を開けるまで分からない） =====
// 段階B: 一人称の通路の絵（DungeonView）・右上のミニマップ（タップで大きな地図と「ここまで歩く」）・絵に重ねた歩くボタン
import { VoteChips } from '../ui/Votes';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUp, Backpack, Check, Coins, Compass, Crown, DoorClosed, DoorClosedLocked, Flame, Gift, LogOut, Menu, Sparkles, Swords, Skull, Undo2, Users, X } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DungeonView } from '../dungeon/DungeonView';
import { DUNGEONS } from '../../data/dungeons';
import { getItem } from '../../data/items';
import {
  canMove,
  cellKey,
  currentVote,
  doorAhead,
  doorFront,
  doorNorthOf,
  dungeonGrid,
  dungeonNavigator,
  exploredPercent,
  findPath,
  heroMaxHp,
  notVoted,
  partyGold,
  posOf,
  reachableRooms,
  retreatLoss,
  statChance,
  turnTo,
  voters,
  walkableKeys,
  type MapCell,
} from '../../engine';
import { BALANCE } from '../../data/balance';
import { PLAYER_COLOR } from '../../data/theme';
import { isLocalPlayer } from '../../store/battleConfig';
import { useOnline } from '../../store/onlineStore';
import { RollStrip } from '../ui/CheckPanel';
import { HeroFace } from '../ui/game';
import { PetToken } from '../ui/PetToken';
import { Footprints, Minus, Plus } from 'lucide-react';
import type { DungeonRun, Facing, GameState, Room } from '../../types';
import { useElementSize } from '../../hooks/useElementSize';
import { LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { getRoomType } from '../../data/rules';
import { Bar, ItemIcon, Screen } from '../ui/game';

/** 部屋のアイコン（部屋の種類のデータの icon のキー → アイコン）。新しいアイコンが要る時はここに1行足す */
const ROOM_ICONS: Record<string, typeof Swords> = { swords: Swords, skull: Skull, crown: Crown, gift: Gift, sparkles: Sparkles, flame: Flame };

/** 部屋の種類の見た目（データから） */
function roomStyle(type: string) {
  const t = getRoomType(type);
  return { name: t.name, Icon: ROOM_ICONS[t.icon] ?? Sparkles, color: t.color, bg: t.bg, behavior: t.behavior, boss: !!t.battle?.boss };
}

/** 目の前の扉（中身は入るまで分からない。ボスの扉だけは見て分かる） */
function DoorPanel({ room, openable }: { room: Room; openable: boolean }) {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const t = roomStyle(room.type);
  const known = room.cleared || room.id === game.dungeon?.currentRoomId;
  const turnHere = dungeonTurnHere(game);
  const noSteps = !!game.world && !game.dungeon?.explore;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-black/70 px-2 py-1.5 backdrop-blur-[2px]" data-door-ahead>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: known ? t.bg : '#2a2018' }}>
        {known ? <t.Icon size={22} style={{ color: t.color }} /> : t.boss ? <Crown size={22} className="text-amber-300" /> : <DoorClosed size={22} className="text-amber-200" />}
      </span>
      <div className="min-w-0 flex-1 text-[13px] leading-5">
        <div className="font-bold text-amber-100">{known ? `${t.name}の部屋（通った）` : t.boss ? '重い扉（ボス）' : openable ? '扉' : '開かない扉'}</div>
        <div className="truncate text-[12px] text-zinc-400">
          {known ? 'もう何もない' : t.boss ? '奥から強い気配がする…' : openable ? '中身は開けるまで分からない' : '別の道を選んだので開かない'}
        </div>
      </div>
      {openable && !known && (
        <button
          onClick={() => dispatchGame({ type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId: room.id })}
          disabled={!turnHere || noSteps}
          className="btn btn-gold font-display h-11 shrink-0 rounded-lg px-3 text-[16px] disabled:opacity-40"
        >
          扉を開ける
          <VoteChips cmd={{ type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId: room.id }} />
        </button>
      )}
    </div>
  );
}

/** 地図のマス（見たマスだけ。北が上）。大きな地図とミニマップで使う。x0 = 左端のマス、yTop = 上端のマス */
function MapCells({ run, cell, x0, yTop, left = 0, top = 0, only, target, onTap }: {
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
}) {
  const grid = dungeonGrid(run);
  const pos = posOf(run);
  const seen = new Set(run.seen ?? []);
  const walk = walkableKeys(run);
  const reach = new Set(reachableRooms(run).map((r) => r.id));
  const small = cell < 28;
  return (
    <>
      {grid.cells.map((c) => {
        const k = cellKey(c.x, c.y);
        if (!seen.has(k) || (only && !only(c))) return null;
        const here = c.x === pos.x && c.y === pos.y;
        const isTarget = !!target && target.x === c.x && target.y === c.y;
        const room = c.roomId ? run.rooms.find((r) => r.id === c.roomId) : undefined;
        const known = !!room && (room.cleared || room.id === run.currentRoomId);
        const t = room ? roomStyle(room.type) : undefined;
        const openable = !!room && !known && reach.has(room.id);
        // 中身は入るまで分からない（ボスの扉だけは見て分かる）
        const Icon = !room || !t ? null : known ? t.Icon : t.boss ? Crown : openable ? DoorClosed : DoorClosedLocked;
        const Tag = onTap ? 'button' : 'span';
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
              border: `${small ? 1 : 2}px solid ${isTarget ? '#fff' : openable ? '#ffd76a' : room ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.08)'}`,
              boxShadow: openable && !small ? '0 0 10px rgba(255,215,106,.6)' : undefined,
              opacity: room && t && !known && !openable && !t.boss ? 0.55 : 1,
            }}
            data-cell={onTap ? k : undefined}
            data-door={onTap && room && !known ? (openable ? 'open' : 'closed') : undefined}
            aria-label={onTap ? (room && t ? (known ? t.name : t.boss ? 'ボスの扉' : openable ? '扉' : '開かない扉') : '通路') : undefined}
          >
            {Icon && t && !here && <Icon size={Math.round(cell * 0.55)} strokeWidth={2.2} style={{ color: known ? t.color : t.boss ? '#ffcf4a' : openable ? '#ffd76a' : '#9a9080' }} />}
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
function MiniMap({ run, onOpen }: { run: DungeonRun; onOpen: () => void }) {
  const pos = posOf(run);
  const R = 2;
  const cell = 17;
  const size = (R * 2 + 1) * cell;
  return (
    <button
      onClick={onOpen}
      aria-label="地図を開く"
      className="panel panel-gold-edge absolute right-2 top-2 z-20 overflow-hidden rounded-lg p-0"
      style={{ width: size + 8, height: size + 8 }}
      data-minimap
    >
      <span className="absolute" style={{ left: 4, top: 4, width: size, height: size }}>
        <MapCells run={run} cell={cell} x0={pos.x - R} yTop={pos.y + R} only={(c) => Math.abs(c.x - pos.x) <= R && Math.abs(c.y - pos.y) <= R} />
      </span>
    </button>
  );
}

/** 大きな地図（ミニマップをタップで開く）。見えている場所をタップして「ここまで歩く」 */
function MapOverlay({ run, onClose, canWalk, myTurn, stepsLeft, onWalk }: {
  run: DungeonRun;
  onClose: () => void;
  canWalk: boolean;
  myTurn: boolean;
  stepsLeft: number;
  onWalk: (t: { x: number; y: number; face?: Facing }) => void;
}) {
  const grid = dungeonGrid(run);
  const pos = posOf(run);
  const seen = new Set(run.seen ?? []);
  const walk = walkableKeys(run);
  const [target, setTarget] = useState<{ x: number; y: number; face?: Facing; label: string } | null>(null);
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
  const targetPath = target ? findPath(run, target) : undefined;
  const tapCell = (c: MapCell) => {
    if (c.kind === 'room') {
      const f = doorFront(run, c.roomId!);
      if (f && walk.has(cellKey(f.x, f.y)) && seen.has(cellKey(f.x, f.y))) setTarget({ ...f, face: 0, label: '扉の前まで歩く' });
      else setTarget(null);
      return;
    }
    if (walk.has(cellKey(c.x, c.y))) setTarget({ x: c.x, y: c.y, label: 'ここまで歩く' });
    else setTarget(null);
  };
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#0c0a08]/95" data-map-overlay>
      <div className="flex h-11 shrink-0 items-center gap-2 px-2">
        <span className="font-display min-w-0 flex-1 text-[16px] text-amber-100">地図（探索度 {exploredPercent(run)}%）</span>
        <button onClick={onClose} aria-label="地図を閉じる" className="btn btn-dark flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <X size={20} />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overscroll-contain" onClick={() => setTarget(null)}>
          <div ref={mapRef} className="relative mx-auto w-full" style={{ height: mapH + 20 }} data-dungeon-map>
            <MapCells run={run} cell={cell} x0={0} yTop={grid.height - 1} left={left} top={10} target={target} onTap={tapCell} />
          </div>
        </div>
        {target && myTurn && (
          <div className="panel panel-gold-edge absolute inset-x-2 top-2 z-10 flex items-center gap-2 rounded-xl p-2" onClick={(e) => e.stopPropagation()} data-walk-panel>
            <div className="min-w-0 flex-1 text-[13px]">
              {targetPath ? (targetPath.length === 0 ? 'ここにいます' : `${target.label}（${targetPath.length}歩）`) : 'そこへは歩いて行けません'}
              {targetPath && targetPath.length > stepsLeft && <span className="block text-[12px] text-red-300">歩数が足りません（あと{stepsLeft}歩）</span>}
            </div>
            <button
              disabled={!canWalk || !targetPath || targetPath.length === 0 || targetPath.length > stepsLeft}
              onClick={() => onWalk(target)}
              className="btn btn-gold h-11 shrink-0 rounded-lg px-4 font-bold disabled:opacity-40"
            >
              歩く
            </button>
            <button onClick={() => setTarget(null)} aria-label="閉じる" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
              <X size={20} />
            </button>
          </div>
        )}
      </div>
      <div className="shrink-0 px-3 pb-2 pt-1 text-center text-[12px] text-zinc-400">見えている通路や扉をタップすると、そこまで歩けます</div>
    </div>
  );
}

export function DungeonScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);
  useOnline((s) => s.tick);
  const run = game.dungeon!;
  const pos = posOf(run);
  const reach = useMemo(() => new Set(reachableRooms(run).map((r) => r.id)), [run]);
  const [showMap, setShowMap] = useState(false);
  const [showRetreat, setShowRetreat] = useState(false);
  const hasTabs = useBattle((s) => (s.full?.expeditions?.length ?? 0) > 0);
  const partyHeroes = game.heroes.filter((h) => !game.party || game.party.includes(h.id));
  const loss = retreatLoss(game);
  const nav = dungeonNavigator(game);
  // 歩けるか（手番・担当・歩数）。向きを変えるのは歩数0でもできる
  const myTurn = dungeonTurnHere(game) && !!nav && isLocalPlayer(nav.playerId);
  const stepsLeft = game.world ? (run.explore ?? 0) : Infinity;
  const canWalk = myTurn && game.mode === 'dungeon' && (!game.world || (run.explore != null && run.explore > 0));
  const ahead = doorAhead(run);
  const step = (dir: 'forward' | 'left' | 'right' | 'back') => nav && dispatchGame({ type: 'DUNGEON_STEP', playerId: nav.playerId, heroId: nav.id, dir });
  const turn = (dir: 'left' | 'right' | 'back') => nav && dispatchGame({ type: 'DUNGEON_TURN', playerId: nav.playerId, heroId: nav.id, dir });
  const moveOk = (rel: 'forward' | 'left' | 'right' | 'back') => canWalk && canMove(run, pos, turnTo(pos.facing, rel));
  // 左右に扉がある時は、歩く代わりにその扉の方を向く（0歩）
  const doorSide = (rel: 'left' | 'right') => turnTo(pos.facing, rel) === 0 && !!doorNorthOf(run, pos);
  const side = (rel: 'left' | 'right') => (moveOk(rel) ? step(rel) : doorSide(rel) ? turn(rel) : undefined);
  const sideOk = (rel: 'left' | 'right') => moveOk(rel) || (myTurn && game.mode === 'dungeon' && doorSide(rel));
  const background = DUNGEONS.tryGet(run.dungeonId)?.background ?? run.background;
  return (
    <Screen>
      <div className="flex h-12 shrink-0 items-center gap-1.5 px-2">
        {/* 名前は上の場面のタブに出ているので、タブがある時は出さない（2回出さない） */}
        <div className="font-display text-outline min-w-0 flex-1 truncate text-[18px] text-amber-100">{hasTabs ? '' : run.name}</div>
        <div className="panel flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold text-sky-200 tabular-nums" data-explored>
          <Compass size={15} /> 探索度 {exploredPercent(run)}%
        </div>
        <div className="panel flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold text-amber-200 tabular-nums">
          <Coins size={15} /> {partyGold(game)}G
        </div>
        <button onClick={() => openSheet('menu')} aria-label="メニュー" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
          <Menu size={22} />
        </button>
      </div>
      <div className="relative min-h-[200px] flex-1 overflow-hidden border-y border-amber-500/30">
        {/* 一人称の通路 */}
        <DungeonView run={run} background={background} />
        <MiniMap run={run} onOpen={() => setShowMap(true)} />
        {/* 2人以上で遊ぶ時: 扉は全員一致で開く */}
        {voters(game).length > 1 && (
          <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-130px)]">
            <span className="inline-block rounded-lg bg-black/70 px-2 py-0.5 text-[12px] leading-4 text-zinc-200" data-vote-hint>
              {currentVote(game) && notVoted(game).length === 0 ? '意見が分かれています。選び直してください' : '扉は全員が「開ける」を選ぶと開きます'}
            </span>
          </div>
        )}
        {/* 下端: 目の前の扉と、歩くボタン（絵に重ねる）。歩くのは手番のキャラの担当の人 */}
        <div className="absolute inset-x-2 bottom-2 z-10 flex flex-col gap-1.5">
          {ahead && game.mode === 'dungeon' && <DoorPanel room={ahead} openable={reach.has(ahead.id)} />}
          <div className="grid grid-cols-4 gap-1.5" data-dungeon-moves>
            {(
              [
                [doorSide('left') && !moveOk('left') ? '扉を向く' : '左へ', ArrowLeft, () => side('left'), sideOk('left')],
                ['前進', ArrowUp, () => step('forward'), moveOk('forward')],
                [doorSide('right') && !moveOk('right') ? '扉を向く' : '右へ', ArrowRight, () => side('right'), sideOk('right')],
                ['振り向く', Undo2, () => turn('back'), myTurn && game.mode === 'dungeon'],
              ] as const
            ).map(([label, Icon, on, ok], i) => (
              <button key={i} onClick={on} disabled={!ok} className="btn flex h-12 flex-col items-center justify-center rounded-xl border border-amber-200/30 bg-black/55 text-[12px] leading-4 font-bold text-amber-50 backdrop-blur-[2px] disabled:opacity-40">
                <Icon size={18} className="text-amber-200" />
                {label}
              </button>
            ))}
          </div>
        </div>
        {showMap && (
          <MapOverlay
            run={run}
            onClose={() => setShowMap(false)}
            canWalk={canWalk}
            myTurn={myTurn}
            stepsLeft={stepsLeft}
            onWalk={(t) => {
              setShowMap(false);
              if (nav) dispatchGame({ type: 'DUNGEON_WALK', playerId: nav.playerId, heroId: nav.id, x: t.x, y: t.y, face: t.face });
            }}
          />
        )}
      </div>
      <ExplorePanel />
      {/* パーティ（顔と細いHP）と、装備・道具・撤退を1行に */}
      <div className="flex shrink-0 items-center gap-1 px-2 pt-1.5 pb-3" data-dungeon-bar>
        <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
          {partyHeroes.map((h) => (
            <button key={h.id} onClick={() => openSheet('party')} aria-label={`${h.name} HP${h.hp}/${heroMaxHp(h)}`} className="btn relative flex h-11 w-11 shrink-0 flex-col items-center justify-center">
              <HeroFace hero={h} size={30} dim={h.hp <= 0} />
              <span className="mt-[2px] block w-[32px]">
                <Bar value={h.hp} max={heroMaxHp(h)} color="linear-gradient(90deg,#22b45a,#7dffa8)" height={4} />
              </span>
              {h.pet && (
                <span className="absolute -top-1 -right-1">
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

/** このダンジョンのパーティの番か（世界マップが無いシナリオは、いつでも） */
export const dungeonTurnHere = (game: GameState) => !game.world || (game.party ?? []).includes(game.world.turn);

/**
 * 探索力（M3-D）: ダンジョンのパーティも世界マップの手番の順番で動く。
 * 番が来たら素早さで探索力（2〜4）を決め、歩数はその2倍。1歩・扉を開けるたびに1使う。使い切るか「手番を終える」で次の人の番
 */
function ExplorePanel() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  useOnline((s) => s.tick);
  const [focus, setFocus] = useState(0);
  const run = game.dungeon!;
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
  const roller = party.filter((h) => isLocalPlayer(h.playerId)).sort((a, b) => statChance(b, 'agi', 'move') - statChance(a, 'agi', 'move'))[0];
  if (run.explore == null) {
    if (!roller) return null;
    const chance = statChance(roller, 'agi', 'move');
    const max = Math.min(BALANCE.exploreSlots, roller.focus);
    const f = Math.min(focus, max);
    return (
      <div className="mx-2 mt-1.5 flex shrink-0 flex-col gap-0.5" data-explore-roll>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFocus(Math.max(0, f - 1))} disabled={f <= 0} aria-label="フォーカスを減らす" className="btn btn-dark flex h-12 w-11 shrink-0 items-center justify-center rounded-xl">
            <Minus size={18} />
          </button>
          <button
            onClick={() => {
              dispatchGame({ type: 'EXPLORE_ROLL', playerId: roller.playerId, heroId: roller.id, focusUsed: f });
              setFocus(0);
            }}
            className="btn btn-gold font-display flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl text-[17px]"
          >
            <Footprints size={19} /> 探索力の判定
            <span className="text-[13px] tabular-nums">
              {(BALANCE.exploreBase + f) * BALANCE.dungeonStepsPerExplore}〜{(BALANCE.exploreBase + BALANCE.exploreSlots) * BALANCE.dungeonStepsPerExplore}歩
            </span>
          </button>
          <button onClick={() => setFocus(Math.min(max, f + 1))} disabled={f >= max} aria-label="フォーカスを増やす" className="btn btn-dark flex h-12 w-11 shrink-0 items-center justify-center rounded-xl">
            <Plus size={18} />
          </button>
        </div>
        <span className="text-center text-[12px] leading-4 text-zinc-400">
          {roller.name}の素早さ{chance}%×{BALANCE.exploreSlots}枠・フォーカス<b className="text-amber-200">{f}</b>（歩数＝探索力×{BALANCE.dungeonStepsPerExplore}）
        </span>
      </div>
    );
  }
  return (
    <div className="mx-2 mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-amber-300/40 bg-black/50 px-2 py-1.5">
      <div className="flex shrink-0 flex-col items-center rounded-lg bg-black/40 px-2 py-0.5">
        <span className="text-[12px] text-zinc-400">残り歩数</span>
        <b className="font-display text-[22px] leading-6 text-amber-200 tabular-nums">{run.explore}</b>
      </div>
      <div className="min-w-0 flex-1">
        {run.exploreRoll && <RollStrip results={run.exploreRoll} small />}
        <div className="text-[12px] text-zinc-400">{run.explore > 0 ? '歩くと1歩、扉を開けると1歩使う（向きを変えるのは0歩）' : '歩数を使い切った'}</div>
      </div>
      <button onClick={() => dispatchGame({ type: 'EXPLORE_END', playerId: LOCAL_PLAYER })} className="btn btn-dark h-11 shrink-0 rounded-lg px-3 text-[13px] font-bold">
        手番を終える
        <VoteChips cmd={{ type: 'EXPLORE_END', playerId: LOCAL_PLAYER }} />
      </button>
    </div>
  );
}
