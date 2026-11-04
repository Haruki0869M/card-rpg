// ===== ダンジョンの地図（下から上へ進む。部屋の中身は入る前から見える） =====
import { AnimatePresence, motion } from 'framer-motion';
import { Backpack, Check, Coins, Crown, Flame, Gift, Lock, LogOut, Menu, Sparkles, Swords, Skull, Users, X } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BattleBackground, EnemyArt } from '../../art';
import { getEnemy } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getItem } from '../../data/items';
import { reachableRooms, retreatLoss } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import { LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { Room, RoomType } from '../../types';
import { HeroMini, ItemIcon, RARITY_STYLE, Screen } from '../ui/game';

const ROOM: Record<RoomType, { name: string; Icon: typeof Swords; color: string; bg: string }> = {
  battle: { name: '戦闘', Icon: Swords, color: '#ff9a7a', bg: '#3a1418' },
  elite: { name: '強敵', Icon: Skull, color: '#ff5a6a', bg: '#4a0c18' },
  boss: { name: 'ボス', Icon: Crown, color: '#ffcf4a', bg: '#4a2a06' },
  chest: { name: '宝箱', Icon: Gift, color: '#ffd76a', bg: '#3a2a0a' },
  event: { name: 'イベント', Icon: Sparkles, color: '#9ad8ff', bg: '#10304a' },
  rest: { name: '休憩', Icon: Flame, color: '#7dffa8', bg: '#0f3a24' },
};

const ROW_H = 92;

function RoomInfo({ room }: { room: Room }) {
  const t = ROOM[room.type];
  if (room.enemies) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex -space-x-3">
          {room.enemies.map((e, i) => (
            <EnemyArt key={i} defId={e.defId} className="h-[54px] w-[46px]" />
          ))}
        </span>
        <div className="min-w-0 text-[13px] leading-5">
          <div className="font-display text-[16px]" style={{ color: t.color }}>
            {t.name}
          </div>
          {room.enemies.map((e, i) => (
            <div key={i} className="truncate">
              <span className="text-amber-300">Lv{e.level}</span> {getEnemy(e.defId).name}
              {room.type === 'boss' && getEnemy(e.defId).phases ? '（HPが減ると姿を変える）' : ''}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (room.type === 'chest' && room.chest) {
    const r = RARITY_STYLE[room.chest.rarity];
    return (
      <div className="text-[13px] leading-5">
        <div className="font-display text-[16px]" style={{ color: t.color }}>
          宝箱
        </div>
        <div>
          中身の格：<span style={{ color: r.color }}>{r.name}</span>
          {room.chest.locked && (
            <span className="ml-1 text-amber-200">
              <Lock size={12} className="inline" /> 鍵付き（器用で判定・失敗すると罠）
            </span>
          )}
        </div>
      </div>
    );
  }
  if (room.type === 'event')
    return (
      <div className="text-[13px] leading-5">
        <div className="font-display text-[16px]" style={{ color: t.color }}>
          イベント
        </div>
        <div>{room.eventId ? `「${EVENTS.get(room.eventId).title}」` : '何かが起きる…'}</div>
      </div>
    );
  return (
    <div className="text-[13px] leading-5">
      <div className="font-display text-[16px]" style={{ color: t.color }}>
        休憩所
      </div>
      <div>HPかフォーカスを回復できる</div>
    </div>
  );
}

export function DungeonScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);
  const run = game.dungeon!;
  const reach = useMemo(() => new Set(reachableRooms(run).map((r) => r.id)), [run]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showRetreat, setShowRetreat] = useState(false);
  const [mapRef, size] = useElementSize<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = Math.max(...run.rooms.map((r) => r.row)) + 1;
  const W = size.width || 340;
  const H = rows * ROW_H + 40;
  const pos = (r: Room) => {
    const w = run.rooms.filter((x) => x.row === r.row).length;
    return { x: ((r.col + 0.5) / w) * W, y: H - 40 - r.row * ROW_H };
  };
  const current = run.rooms.find((r) => r.id === run.currentRoomId);
  const sel = selected ? run.rooms.find((r) => r.id === selected) : undefined;
  const loss = retreatLoss(game);

  // 今いる行が見えるようにスクロール
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const row = current?.row ?? 0;
    el.scrollTop = Math.max(0, H - 40 - row * ROW_H - el.clientHeight * 0.65);
  }, [current?.row, H]);

  return (
    <Screen>
      <div className="flex h-12 shrink-0 items-center gap-2 px-2">
        <div className="font-display text-outline min-w-0 flex-1 truncate text-[18px] text-amber-100">{run.name}</div>
        <div className="panel flex h-9 items-center gap-1 rounded-full px-3 text-[14px] font-bold text-amber-200 tabular-nums">
          <Coins size={16} /> {game.gold}G
        </div>
        <button onClick={() => openSheet('menu')} aria-label="メニュー" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
          <Menu size={22} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden border-y border-amber-500/30">
        <BattleBackground kind={run.background} className="absolute inset-0 h-full w-full opacity-40" />
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overscroll-contain" onClick={() => setSelected(null)}>
          <div ref={mapRef} className="relative mx-auto w-full" style={{ height: H }}>
            <svg className="absolute inset-0" width={W} height={H}>
              {run.rooms.flatMap((r) =>
                r.next.map((nid) => {
                  const n = run.rooms.find((x) => x.id === nid)!;
                  const a = pos(r);
                  const b = pos(n);
                  const lit = r.cleared && (n.cleared || reach.has(n.id));
                  return (
                    <line
                      key={r.id + nid}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={lit ? '#ffd36a' : 'rgba(220,200,170,.35)'}
                      strokeWidth={lit ? 3.5 : 2.5}
                      strokeDasharray={lit ? undefined : '6 6'}
                    />
                  );
                }),
              )}
            </svg>
            {run.rooms.map((r) => {
              const t = ROOM[r.type];
              const p = pos(r);
              const canGo = reach.has(r.id);
              const isCur = r.id === run.currentRoomId;
              const big = r.type === 'boss';
              const s = big ? 66 : 52;
              return (
                <button
                  key={r.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(r.id);
                  }}
                  className="absolute flex items-center justify-center rounded-full border-[3px] transition-transform active:scale-95"
                  style={{
                    left: p.x - s / 2,
                    top: p.y - s / 2,
                    width: s,
                    height: s,
                    background: t.bg,
                    borderColor: isCur ? '#ffffff' : canGo ? t.color : 'rgba(255,255,255,.2)',
                    opacity: r.cleared && !isCur ? 0.55 : canGo || isCur ? 1 : 0.75,
                    boxShadow: canGo ? `0 0 16px ${t.color}` : selected === r.id ? '0 0 0 3px #fff' : undefined,
                  }}
                  aria-label={t.name}
                >
                  {canGo && <span className="glow-pulse absolute -inset-1.5 rounded-full border-2" style={{ borderColor: t.color }} />}
                  <t.Icon size={big ? 32 : 24} strokeWidth={2.4} style={{ color: t.color }} />
                  {r.cleared && (
                    <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                  {r.type === 'chest' && r.chest?.locked && !r.cleared && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-amber-200">
                      <Lock size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* 選んだ部屋の情報と「進む」 */}
        <AnimatePresence>
          {sel && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="panel panel-gold-edge absolute inset-x-2 bottom-2 z-10 rounded-xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <RoomInfo room={sel} />
                </div>
                <button onClick={() => setSelected(null)} aria-label="閉じる" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
                  <X size={20} />
                </button>
              </div>
              {reach.has(sel.id) ? (
                <button
                  onClick={() => {
                    setSelected(null);
                    dispatchGame({ type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId: sel.id });
                  }}
                  className="btn btn-gold font-display mt-2 h-12 w-full rounded-xl text-[18px]"
                >
                  この部屋へ進む
                </button>
              ) : (
                <div className="mt-1 text-center text-[12px] text-zinc-400">{sel.cleared ? '通過済みの部屋' : 'まだ進めない部屋（光っている部屋から選ぶ）'}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 gap-1 px-2 pt-2">
        {game.heroes.map((h) => (
          <HeroMini key={h.id} hero={h} onTap={() => openSheet('party')} />
        ))}
      </div>
      <div className="grid shrink-0 grid-cols-3 gap-2 px-2 pt-2 pb-3">
        <button onClick={() => openSheet('party')} className="btn btn-dark flex h-12 items-center justify-center gap-1 rounded-xl text-[14px] font-bold">
          <Users size={17} className="text-amber-300" /> 装備
        </button>
        <button onClick={() => openSheet('pouch')} className="btn btn-dark flex h-12 items-center justify-center gap-1 rounded-xl text-[14px] font-bold">
          <Backpack size={17} className="text-amber-300" /> 道具（{game.pouch.length}）
        </button>
        <button onClick={() => setShowRetreat((v) => !v)} className="btn btn-dark flex h-12 items-center justify-center gap-1 rounded-xl text-[14px] font-bold">
          <LogOut size={17} className="text-red-300" /> 撤退
        </button>
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
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
