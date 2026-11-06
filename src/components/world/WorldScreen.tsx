// ===== 世界マップの画面（spec §8・§20.3）=====
// 上: 侵食度・命の灯火・ゴールド・時間帯 / 中: 地図 / 下: 手番のキャラの操作（移動力の判定・移動・入る・野営・待機）
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Flame, Footprints, Hourglass, Menu, Minus, Moon, Plus, ScrollText, Star, Sun, Sunrise, Sunset, Tent, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { getEnemy } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getScenario } from '../../data/scenarios';
import { TERMS } from '../../data/terms';
import { PLAYER_COLOR } from '../../data/theme';
import { getTerrain, SHRINES, TOWNS } from '../../data/world';
import {
  campAmbushChance,
  dayOf,
  heroesAt,
  heroFocusMax,
  heroMaxHp,
  livingHeroes,
  nextCorruptionStage,
  pathTo,
  reachable,
  statChance,
  successDistribution,
  TIME_NAME,
  timeOfDay,
  turnsUntilNightChange,
} from '../../engine';
import { isLocalPlayer, isOnlinePlay } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import type { GameState, PlayerId, TimeOfDay } from '../../types';
import { RollStrip } from '../ui/CheckPanel';
import { Bar, HeroFace, Screen } from '../ui/game';
import { WorldMap } from './WorldMap';

const TIME_ICON: Record<TimeOfDay, typeof Sun> = { morning: Sunrise, noon: Sun, evening: Sunset, night: Moon };

/** 上部のバー: 侵食度・命の灯火・ゴールド・時間帯・メニュー */
export function WorldTopBar({ game }: { game: GameState }) {
  const openSheet = useBattle((s) => s.openSheet);
  const toast = useBattle((s) => s.showToast);
  const w = game.world!;
  const time = timeOfDay(w.worldTurn);
  const TimeIcon = TIME_ICON[time];
  const until = turnsUntilNightChange(w.worldTurn);
  const next = nextCorruptionStage(game);
  return (
    <div className="panel z-10 flex shrink-0 items-center gap-1.5 px-2 py-1">
      <button
        onClick={() => toast(next ? `${TERMS.corruption}${next.at}%: ${next.text}` : '侵食度')}
        className="btn flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg bg-black/30 px-1.5 py-0.5 text-left"
        aria-label={TERMS.corruption}
      >
        <span className="flex items-center justify-between text-[12px] leading-4">
          <span className="font-display text-fuchsia-200">{TERMS.corruption}</span>
          <b className="tabular-nums text-fuchsia-100">{w.corruption}%</b>
        </span>
        <Bar value={w.corruption} max={100} color="linear-gradient(90deg,#6a2a9a,#e04aff)" height={6} />
        <span className="truncate text-[12px] leading-4 text-zinc-400">{next ? `次: ${next.at}%で${next.text}` : ''}</span>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-[12px] leading-4 font-bold tabular-nums">
        <span className="flex items-center gap-0.5 text-orange-300" aria-label="命の灯火">
          <Flame size={14} className="fill-orange-500/60" />×{game.lives}
        </span>
        <span className="flex items-center gap-0.5 text-amber-200">
          <Coins size={14} />
          {game.gold}G
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-center text-[12px] leading-4">
        <span className="flex items-center gap-0.5 font-bold text-sky-100">
          <TimeIcon size={14} className={time === 'night' ? 'text-indigo-300' : 'text-amber-300'} />
          {dayOf(w.worldTurn)}日目{TIME_NAME[time]}
        </span>
        <span className="flex items-center gap-0.5 text-zinc-400">
          <Hourglass size={12} />
          {until.night ? `朝まで${until.turns}` : `夜まで${until.turns}`}
        </span>
      </div>
      <button onClick={() => openSheet('quests')} aria-label="依頼" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
        <ScrollText size={20} />
      </button>
      <button onClick={() => openSheet('menu')} aria-label="メニュー" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
        <Menu size={22} />
      </button>
    </div>
  );
}

/** パーティの小さな状態（顔・HP・行動済み） */
function PartyRow({ game }: { game: GameState }) {
  const openSheet = useBattle((s) => s.openSheet);
  const setScene = useBattle((s) => s.setScene);
  const w = game.world!;
  return (
    <div className="flex shrink-0 gap-1 bg-black/40 px-2 py-1">
      {game.heroes.map((h) => {
        const max = heroMaxHp(h);
        const active = h.id === w.turn;
        // ダンジョンの中のキャラ: タップでその場面を見る
        const exp = game.expeditions?.find((x) => x.heroes.includes(h.id));
        return (
          <button
            key={h.id}
            onClick={() => (exp ? setScene(exp.id) : openSheet('party'))}
            className={`btn flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-lg border px-1 py-0.5 ${active ? 'border-amber-300 bg-amber-500/15' : 'border-white/10 bg-black/30'}`}
          >
            <HeroFace hero={h} size={26} dim={h.hp <= 0 || !!h.retired} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] leading-4 font-bold">
                {h.retired ? '退場' : exp ? (exp.dungeon?.name ?? 'ダンジョン') : w.acted.includes(h.id) && !active ? '行動済' : h.name}
              </span>
              <Bar value={h.hp} max={max} color="linear-gradient(90deg,#22b45a,#7dffa8)" height={5} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 物語（冒頭・地域の紹介） */
function StoryOverlay({ title, lines, onNext }: { title: string; lines: string[]; onNext: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex flex-col justify-center bg-black/85 px-5">
      <div className="font-display text-outline mb-3 text-center text-[26px] text-amber-100">{title}</div>
      {lines.map((l, i) => (
        <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.5 }} className="mb-2 text-[15px] leading-7 text-zinc-100">
          {l}
        </motion.p>
      ))}
      <button onClick={onNext} className="btn btn-gold font-display mt-4 h-12 rounded-xl text-[18px]">
        つづける
      </button>
    </motion.div>
  );
}

/** 手番の受け渡し（1台を回して遊ぶ時。spec §7.3） */
function HandoffOverlay({ player, name, onStart }: { player: PlayerId; name: string; onStart: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onStart}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90"
      aria-label="手番を始める"
    >
      <span className="font-display rounded-full px-5 py-1 text-[28px] text-black" style={{ background: PLAYER_COLOR[player] }}>
        {player}
      </span>
      <span className="font-display text-outline text-[24px] text-amber-50">{name}の番です</span>
      <span className="text-[14px] text-zinc-300">スマホを渡して、タップで始める</span>
    </motion.button>
  );
}

/** 地図のマスの説明（タップしたマス） */
function tileInfo(game: GameState, i: number): string {
  const w = game.world!;
  const t = w.tiles[i];
  if (!t.seen) return 'まだ霧に包まれている';
  const parts = [`${getTerrain(t.t).name}（移動力${getTerrain(t.t).moveCost || '×'}）`];
  const f = t.f;
  if (f?.kind === 'town') parts.push(TOWNS.get(f.id).name + (w.fallenTowns.includes(f.id) ? '（陥落）' : ''));
  if (f?.kind === 'dungeon') parts.push(DUNGEONS.get(f.id).name);
  if (f?.kind === 'shrine') parts.push(SHRINES.get(f.id).name + (f.used ? '（祈り済み）' : ''));
  if (f?.kind === 'event' || f?.kind === 'landmark') parts.push((EVENTS.tryGet(f.id)?.title ?? '何かがある') + (f.used ? '（調べた）' : ''));
  if (f?.kind === 'chest') parts.push(f.used ? '空の宝箱' : '宝箱');
  const wd = w.wanderers.find((x) => x.tile === i);
  if (wd) parts.push(`敵: ${wd.enemies.map((e) => `${getEnemy(e.defId).name} Lv${e.level ?? 1}`).join('・')}${wd.raidTown ? '（町を襲撃中）' : ''}`);
  return parts.join(' / ');
}

/** 今いるマスで「入る」ボタンの文字（入れる物が無ければ undefined） */
function interactLabel(game: GameState, tile: number): string | undefined {
  const f = game.world!.tiles[tile].f;
  if (!f) return undefined;
  if (f.kind === 'town') return game.world!.fallenTowns.includes(f.id) ? undefined : `${TOWNS.get(f.id).name}に入る`;
  if (f.kind === 'dungeon') return `${DUNGEONS.get(f.id).name}に入る`;
  if (f.used) return undefined;
  return { shrine: '祠で祈る', event: '調べる', landmark: '調べる', chest: '宝箱を開ける' }[f.kind];
}

export function WorldScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const w = game.world!;
  const hero = game.heroes.find((h) => h.id === w.turn);
  const here = hero ? w.pos[hero.id] : undefined;
  const [focus, setFocus] = useState(0);
  const [selected, setSelected] = useState<number | undefined>();
  const [info, setInfo] = useState<string | undefined>();
  const [withMe, setWithMe] = useState<Record<string, boolean>>({});
  // 手番の受け渡し: 担当プレイヤーが変わったら画面を隠す
  const players = new Set(livingHeroes(game).map((h) => h.playerId));
  const [shownFor, setShownFor] = useState<string>(w.turn);
  const [lastPlayer, setLastPlayer] = useState<PlayerId | undefined>(hero?.playerId);
  useOnline((s) => s.tick);
  const seatName = useOnline((s) => (hero ? s.room?.seatName(hero.playerId) : undefined));
  // オンライン協力では受け渡しはいらない（自分のスマホで遊ぶ）
  const needHandoff = !isOnlinePlay() && players.size > 1 && !!hero && shownFor !== w.turn && lastPlayer !== hero.playerId;
  const mine = !hero || isLocalPlayer(hero.playerId);
  useEffect(() => {
    if (hero && shownFor !== w.turn && !needHandoff) setShownFor(w.turn);
  }, [hero, shownFor, w.turn, needHandoff]);

  useEffect(() => {
    setSelected(undefined);
    setFocus(0);
  }, [w.turn, w.move]);

  const reach = useMemo(() => {
    if (here === undefined || w.move === null || w.move <= 0) return undefined;
    const r = reachable(w, here, w.move);
    return new Map([...r].map(([i, v]) => [i, v.cost]));
  }, [w, here]);
  const path = useMemo(() => (selected !== undefined && here !== undefined && w.move ? pathTo(reachable(w, here, w.move), selected) : undefined), [selected, here, w]);

  if (!hero || here === undefined) return null;
  const companions = heroesAt(game, here).filter((h) => h.id !== hero.id && !w.acted.includes(h.id));
  const chosenCompanions = companions.filter((h) => withMe[h.id] ?? true).map((h) => h.id);
  const label = interactLabel(game, here);
  const chance = statChance(hero, 'agi', 'move');
  const maxFocus = Math.min(BALANCE.moveSlots, hero.focus);
  const dist = successDistribution(BALANCE.moveSlots, Math.min(focus, maxFocus), chance);
  const avg = BALANCE.moveBase + dist.reduce((n, p, k) => n + p * k, 0);
  const ambush = campAmbushChance(game, hero.id);
  const onTown = w.tiles[here].f?.kind === 'town';
  const canCamp = !onTown && (w.move === null || w.move >= BALANCE.moveBase);
  const pid = hero.playerId;

  const tapTile = (i: number) => {
    if (mine && reach?.has(i) && i !== here) {
      if (selected === i) {
        dispatchGame({ type: 'WORLD_MOVE', playerId: pid, heroId: hero.id, to: i, companions: chosenCompanions });
        setSelected(undefined);
        setInfo(undefined);
      } else {
        setSelected(i);
        setInfo(tileInfo(game, i));
      }
    } else {
      setSelected(undefined);
      setInfo(tileInfo(game, i));
    }
  };

  const scenario = getScenario(game.scenarioId);
  return (
    <Screen>
      <WorldTopBar game={game} />
      <PartyRow game={game} />
      <WorldMap game={game} reach={reach} selected={selected} path={path} onTapTile={tapTile} />
      {info && <div className="shrink-0 bg-black/70 px-3 py-1 text-[12px] leading-4 text-zinc-200">{info}</div>}

      {/* 手番のキャラの操作 */}
      <div className="panel relative z-10 shrink-0 rounded-t-2xl px-3 pt-2 pb-3">
        {!mine && (
          <div className="absolute inset-x-0 top-[52px] bottom-0 z-20 flex flex-col items-center justify-center gap-1 rounded-b-none bg-[#0b0910]/90 text-[14px] text-zinc-200">
            <span className="flex items-center gap-1.5">
              <span className="rounded px-1 text-[12px] font-bold text-black" style={{ background: PLAYER_COLOR[hero.playerId] }}>
                {hero.playerId}
              </span>
              {seatName ?? hero.playerId}さんが{hero.name}を操作しています
            </span>
            <span className="text-[12px] text-zinc-500">地図をタップするとマスの説明が見られます</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <HeroFace hero={hero} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[14px] font-bold">
              {players.size > 1 && (
                <span className="rounded px-1 text-[12px] text-black" style={{ background: PLAYER_COLOR[hero.playerId] }}>
                  {hero.playerId}
                </span>
              )}
              <span className="truncate">{hero.name}の番</span>
              <span className="ml-auto text-[12px] font-normal text-zinc-400 tabular-nums">
                HP {hero.hp}/{heroMaxHp(hero)}・<Star size={12} className="inline fill-amber-400/70 text-amber-300" />
                {hero.focus}/{heroFocusMax(hero)}
              </span>
            </div>
            <div className="text-[12px] text-zinc-400">{getTerrain(w.tiles[here].t).name}・{scenario.map!.regions[w.tiles[here].r].name}</div>
          </div>
          {w.move !== null && (
            <div className="flex shrink-0 flex-col items-center rounded-lg bg-black/40 px-2 py-0.5">
              <span className="text-[12px] text-zinc-400">移動力</span>
              <b className="font-display text-[22px] leading-6 text-amber-200 tabular-nums">{w.move}</b>
            </div>
          )}
        </div>

        {w.moveRoll && (
          <div className="mt-1 flex items-center gap-2">
            <RollStrip results={w.moveRoll} small />
            <span className="text-[12px] text-zinc-300">{w.move ? (selected !== undefined ? 'もう一度タップか「移動する」で決定' : '光るマスをタップして行き先を選ぶ') : '移動力を使い切った'}</span>
          </div>
        )}

        {companions.length > 0 && (w.move === null || (w.move ?? 0) > 0) && (
          <div className="mt-1 flex items-center gap-1">
            <span className="flex shrink-0 items-center gap-0.5 text-[12px] text-zinc-300">
              <Users size={14} />
              同行
            </span>
            {companions.map((c) => {
              const on = withMe[c.id] ?? true;
              return (
                <button
                  key={c.id}
                  onClick={() => setWithMe({ ...withMe, [c.id]: !on })}
                  aria-label={`${c.name}を${on ? '残す' : '連れて行く'}`}
                  className={`btn relative flex h-11 w-11 items-center justify-center rounded-full border-2 ${on ? 'border-amber-300 bg-amber-500/20' : 'border-white/10 bg-black/30'}`}
                >
                  <HeroFace hero={c} size={34} dim={!on} />
                  {on && <span className="absolute -right-1 -bottom-1 rounded-full bg-amber-300 px-1 text-[12px] leading-4 font-black text-black">✓</span>}
                </button>
              );
            })}
            <span className="truncate text-[12px] text-zinc-500">タップで一緒に行くか選ぶ</span>
          </div>
        )}

        {w.move === null && (
          <div className="mt-1.5 flex items-center gap-2">
            <button onClick={() => setFocus(Math.max(0, focus - 1))} disabled={focus <= 0} aria-label="フォーカスを減らす" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
              <Minus size={18} />
            </button>
            <div className="flex flex-1 flex-col items-center leading-4">
              <span className="text-[12px] text-zinc-300">
                素早さ{chance}%×{BALANCE.moveSlots}枠・フォーカス<b className="text-amber-200">{Math.min(focus, maxFocus)}</b>
              </span>
              <span className="text-[12px] text-zinc-400">
                移動力 {BALANCE.moveBase + Math.min(focus, maxFocus)}〜{BALANCE.moveBase + BALANCE.moveSlots}（平均{avg.toFixed(1)}）
              </span>
            </div>
            <button onClick={() => setFocus(Math.min(maxFocus, focus + 1))} disabled={focus >= maxFocus} aria-label="フォーカスを増やす" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
              <Plus size={18} />
            </button>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-1.5">
          {w.move === null ? (
            <button
              onClick={() => dispatchGame({ type: 'WORLD_ROLL_MOVE', playerId: pid, heroId: hero.id, focusUsed: Math.min(focus, maxFocus) })}
              className="btn btn-gold font-display flex h-12 items-center justify-center gap-1 rounded-xl text-[18px]"
            >
              <Footprints size={20} /> 移動力の判定
            </button>
          ) : selected !== undefined ? (
            <button onClick={() => tapTile(selected)} className="btn btn-gold font-display h-12 rounded-xl text-[18px]">
              移動する（移動力 {reach?.get(selected)}）
            </button>
          ) : null}
          <div className="grid grid-cols-3 gap-1.5">
            {label ? (
              <button
                onClick={() => dispatchGame({ type: 'WORLD_INTERACT', playerId: pid, heroId: hero.id, party: [hero.id, ...chosenCompanions] })}
                className="btn btn-gold h-11 truncate rounded-lg px-1 text-[12px] font-bold"
              >
                {label}
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={() => canCamp && dispatchGame({ type: 'WORLD_CAMP', playerId: pid, heroId: hero.id })}
              disabled={!canCamp}
              className="btn btn-dark flex h-11 items-center justify-center gap-0.5 rounded-lg text-[12px] font-bold"
            >
              <Tent size={15} /> 野営{ambush ? `${ambush}%` : ''}
            </button>
            <button onClick={() => dispatchGame({ type: 'WORLD_WAIT', playerId: pid, heroId: hero.id })} className="btn btn-dark h-11 rounded-lg text-[12px] font-bold">
              {w.move === null ? '待機' : '手番を終える'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {w.story && <StoryOverlay key="story" title={w.story.title} lines={w.story.lines} onNext={() => dispatchGame({ type: 'STORY_CONTINUE', playerId: pid })} />}
        {!w.story && needHandoff && (
          <HandoffOverlay
            key="handoff"
            player={hero.playerId}
            name={hero.name}
            onStart={() => {
              setShownFor(w.turn);
              setLastPlayer(hero.playerId);
            }}
          />
        )}
      </AnimatePresence>
    </Screen>
  );
}
