// ===== ダンジョンの地図（下から上へ進む。部屋の中身は入る前から見える） =====
import { VoteChips } from '../ui/Votes';
import { AnimatePresence, motion } from 'framer-motion';
import { Backpack, Check, Coins, Crown, Flame, Gift, Lock, LogOut, Menu, Sparkles, Swords, Skull, Users, X } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BattleBackground, EnemyArt } from '../../art';
import { DUNGEONS } from '../../data/dungeons';
import { getEnemy } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getItem } from '../../data/items';
import { chestOdds, currentVote, heroMaxHp, notVoted, partyGold, reachableRooms, retreatLoss, statChance, voters, votesFor } from '../../engine';
import { BALANCE } from '../../data/balance';
import { PLAYER_COLOR } from '../../data/theme';
import { isLocalPlayer } from '../../store/battleConfig';
import { useOnline } from '../../store/onlineStore';
import { RollStrip } from '../ui/CheckPanel';
import { HeroFace } from '../ui/game';
import { PetToken } from '../ui/PetToken';
import { Footprints, Minus, Plus } from 'lucide-react';
import type { GameState } from '../../types';
import { useElementSize } from '../../hooks/useElementSize';
import { LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { getRoomType } from '../../data/rules';
import type { Room } from '../../types';
import { CHEST_NAME, OddsBar } from '../ui/ChestOdds';
import { Bar, ItemIcon, RARITY_STYLE, Screen } from '../ui/game';

/** 部屋のアイコン（部屋の種類のデータの icon のキー → アイコン）。新しいアイコンが要る時はここに1行足す */
const ROOM_ICONS: Record<string, typeof Swords> = { swords: Swords, skull: Skull, crown: Crown, gift: Gift, sparkles: Sparkles, flame: Flame };

/** 部屋の種類の見た目（データから） */
function roomStyle(type: string) {
  const t = getRoomType(type);
  return { name: t.name, Icon: ROOM_ICONS[t.icon] ?? Sparkles, color: t.color, bg: t.bg, behavior: t.behavior, boss: !!t.battle?.boss };
}

const ROW_H = 92;

function RoomInfo({ room }: { room: Room }) {
  const t = roomStyle(room.type);
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
              {t.boss && getEnemy(e.defId).phases ? '（HPが減ると姿を変える）' : ''}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (t.behavior === 'chest' && room.chest) {
    const r = RARITY_STYLE[room.chest.rarity];
    return (
      <div className="text-[13px] leading-5">
        <div className="font-display text-[16px]" style={{ color: t.color }}>
          宝箱
        </div>
        <div>
          <span style={{ color: r.color }}>{CHEST_NAME[room.chest.rarity]}</span>
          {room.chest.locked && (
            <span className="ml-1 text-amber-200">
              <Lock size={12} className="inline" /> 鍵付き（器用で判定・失敗すると罠）
            </span>
          )}
        </div>
        <div className="mt-0.5">
          <OddsBar odds={chestOdds(room.chest.rarity, 0)} label="中身の格の確率（運のスロットで上げられる）" height={8} />
        </div>
      </div>
    );
  }
  if (t.behavior === 'event')
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
  const hasTabs = useBattle((s) => (s.full?.expeditions?.length ?? 0) > 0);
  const partyHeroes = game.heroes.filter((h) => !game.party || game.party.includes(h.id));
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
        {/* 名前は上の場面のタブに出ているので、タブがある時は出さない（2回出さない） */}
        <div className="font-display text-outline min-w-0 flex-1 truncate text-[18px] text-amber-100">{hasTabs ? '' : run.name}</div>
        <div className="panel flex h-9 items-center gap-1 rounded-full px-3 text-[14px] font-bold text-amber-200 tabular-nums">
          <Coins size={16} /> {partyGold(game)}G
        </div>
        <button onClick={() => openSheet('menu')} aria-label="メニュー" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
          <Menu size={22} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden border-y border-amber-500/30">
        <BattleBackground kind={DUNGEONS.tryGet(run.dungeonId)?.mapBackground ?? run.background} className="absolute inset-0 h-full w-full opacity-40" />
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overscroll-contain" onClick={() => setSelected(null)}>
          <div ref={mapRef} className="relative mx-auto w-full" style={{ height: H }}>
            <svg className="absolute inset-0" width={W} height={H}>
              {run.rooms.flatMap((r) =>
                r.next.map((nid) => {
                  const n = run.rooms.find((x) => x.id === nid)!;
                  const a = pos(r);
                  const b = pos(n);
                  // 進める道: 太く明るい実線と光 / 通った道: 落ち着いた金 / それ以外: 暗い破線
                  const next = r.cleared && reach.has(n.id);
                  const walked = r.cleared && n.cleared;
                  return (
                    <line
                      key={r.id + nid}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={next ? '#ffe08a' : walked ? '#a8853e' : 'rgba(220,200,170,.25)'}
                      strokeWidth={next ? 5 : walked ? 3 : 2}
                      strokeDasharray={next || walked ? undefined : '5 7'}
                      style={next ? { filter: 'drop-shadow(0 0 4px #ffd36a)' } : undefined}
                    />
                  );
                }),
              )}
            </svg>
            {run.rooms.map((r) => {
              const t = roomStyle(r.type);
              const p = pos(r);
              const canGo = reach.has(r.id);
              const isCur = r.id === run.currentRoomId;
              const big = t.boss;
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
                    borderColor: isCur ? '#fff3c4' : canGo ? t.color : 'rgba(255,255,255,.2)',
                    opacity: r.cleared && !isCur ? 0.45 : canGo || isCur ? 1 : 0.6,
                    filter: r.cleared && !isCur ? 'grayscale(.6)' : undefined,
                    boxShadow: isCur ? '0 0 0 3px rgba(255,220,140,.5), 0 0 22px #ffd36a' : canGo ? `0 0 16px ${t.color}` : selected === r.id ? '0 0 0 3px #fff' : undefined,
                  }}
                  aria-label={t.name}
                >
                  {canGo && <span className="glow-pulse absolute -inset-1.5 rounded-full border-2" style={{ borderColor: t.color }} />}
                  {/* みんなが選んでいる部屋（席の色の印）。全員が同じ部屋を選ぶと進む */}
                  {canGo && (
                    <span className="absolute -bottom-[14px] left-1/2 flex -translate-x-1/2 gap-0.5" data-room-votes={votesFor(game, { type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId: r.id }).join(',')}>
                      {votesFor(game, { type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId: r.id }).map((p) => (
                        <span key={p} className="h-[11px] w-[11px] rotate-45 border border-white/80" style={{ background: PLAYER_COLOR[p], boxShadow: `0 0 6px ${PLAYER_COLOR[p]}` }} />
                      ))}
                    </span>
                  )}
                  {/* 今いる部屋: パーティの顔 */}
                  {isCur && (
                    <span className="absolute -top-[22px] left-1/2 flex -translate-x-1/2 -space-x-2" data-party-here>
                      {partyHeroes.map((h) => (
                        <HeroFace key={h.id} hero={h} size={24} dim={h.hp <= 0} />
                      ))}
                      {/* お供は顔の横にちょこんと座る（2匹まで） */}
                      {partyHeroes
                        .filter((h) => h.pet)
                        .slice(0, 2)
                        .map((h) => (
                          <span key={`pet${h.id}`} className="ml-2.5 self-end">
                            <PetToken pet={h.pet!} size={16} />
                          </span>
                        ))}
                    </span>
                  )}
                  <t.Icon size={big ? 32 : 24} strokeWidth={2.4} style={{ color: t.color }} />
                  {r.cleared && (
                    <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                  {t.behavior === 'chest' && r.chest?.locked && !r.cleared && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-amber-200">
                      <Lock size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* 2人以上で遊ぶ時: 部屋は全員一致で決まる */}
        {voters(game).length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 top-1 z-10 flex justify-center">
            <span className="rounded-full bg-black/70 px-3 py-0.5 text-[12px] text-zinc-200" data-vote-hint>
              {currentVote(game) && notVoted(game).length === 0 ? '意見が分かれています。同じ部屋を選び直してください' : '全員が同じ部屋を選ぶと進みます'}
            </span>
          </div>
        )}
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
              {reach.has(sel.id) && game.world && (!dungeonTurnHere(game) || !run.explore) ? (
                <div className="mt-2 text-center text-[13px] text-zinc-400">{!dungeonTurnHere(game) ? '今はほかの人の番です' : run.explore === 0 ? '探索力を使い切りました' : '先に探索力を判定してください'}</div>
              ) : reach.has(sel.id) ? (
                <button
                  onClick={() => {
                    setSelected(null);
                    dispatchGame({ type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId: sel.id });
                  }}
                  className="btn btn-gold font-display mt-2 h-12 w-full rounded-xl text-[18px]"
                >
                  この部屋へ進む
                  <VoteChips cmd={{ type: 'ENTER_ROOM', playerId: LOCAL_PLAYER, roomId: sel.id }} />
                </button>
              ) : (
                <div className="mt-1 text-center text-[12px] text-zinc-400">{sel.cleared ? '通過済みの部屋' : 'まだ進めない部屋（光っている部屋から選ぶ）'}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ExplorePanel />
      {/* パーティ（顔と細いHP）と、装備・道具・撤退を1行に */}
      <div className="flex shrink-0 items-center gap-1 px-2 pt-1.5 pb-3" data-dungeon-bar>
        <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
          {partyHeroes.map((h) => (
            <button key={h.id} onClick={() => openSheet('party')} aria-label={`${h.name} HP${h.hp}/${heroMaxHp(h)}`} className="btn flex h-11 w-11 shrink-0 flex-col items-center justify-center">
              <HeroFace hero={h} size={30} dim={h.hp <= 0} />
              <span className="mt-[2px] block w-[32px]">
                <Bar value={h.hp} max={heroMaxHp(h)} color="linear-gradient(90deg,#22b45a,#7dffa8)" height={4} />
              </span>
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
 * 番が来たら素早さで探索力（2〜4）を決め、部屋に入るたびに1使う。使い切るか「手番を終える」で次の人の番
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
              {BALANCE.exploreBase + f}〜{BALANCE.exploreBase + BALANCE.exploreSlots}
            </span>
          </button>
          <button onClick={() => setFocus(Math.min(max, f + 1))} disabled={f >= max} aria-label="フォーカスを増やす" className="btn btn-dark flex h-12 w-11 shrink-0 items-center justify-center rounded-xl">
            <Plus size={18} />
          </button>
        </div>
        <span className="text-center text-[12px] leading-4 text-zinc-400">
          {roller.name}の素早さ{chance}%×{BALANCE.exploreSlots}枠・フォーカス<b className="text-amber-200">{f}</b>（探索力＝入れる部屋の数）
        </span>
      </div>
    );
  }
  return (
    <div className="mx-2 mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-amber-300/40 bg-black/50 px-2 py-1.5">
      <div className="flex shrink-0 flex-col items-center rounded-lg bg-black/40 px-2 py-0.5">
        <span className="text-[12px] text-zinc-400">探索力</span>
        <b className="font-display text-[22px] leading-6 text-amber-200 tabular-nums">{run.explore}</b>
      </div>
      <div className="min-w-0 flex-1">
        {run.exploreRoll && <RollStrip results={run.exploreRoll} small />}
        <div className="text-[12px] text-zinc-400">{run.explore > 0 ? '光っている部屋をタップして進む' : '探索力を使い切った'}</div>
      </div>
      <button onClick={() => dispatchGame({ type: 'EXPLORE_END', playerId: LOCAL_PLAYER })} className="btn btn-dark h-11 shrink-0 rounded-lg px-3 text-[13px] font-bold">
        手番を終える
        <VoteChips cmd={{ type: 'EXPLORE_END', playerId: LOCAL_PLAYER }} />
      </button>
    </div>
  );
}
