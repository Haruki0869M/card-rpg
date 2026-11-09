import { followingGroup } from '../../engine/game/world/group';
// ===== 世界マップの画面（spec §8・§20.3）=====
// 上: 侵食度・命の灯火・ゴールド・時間帯 / 中: 地図 / 下: 手番のキャラの操作（移動力の判定・移動・入る・野営・待機）
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Coins, Flame, Footprints, Hourglass, Menu, Minus, Moon, Plus, ScrollText, Star, Sun, Sunrise, Sunset, Tent, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { getEnemy } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getScenario } from '../../data/scenarios';
import { corruptionName } from '../../data/scenarios';
import { PLAYER_COLOR } from '../../data/theme';
import { getTerrain, SANCTUARIES, SHRINES, TOWNS } from '../../data/world';
import {
  campAmbushChance,
  climateAt,
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
  moveSlotsOf,
  moveBonusOf,
} from '../../engine';
import { isLocalPlayer, isOnlinePlay } from '../../store/battleConfig';
import { useBattle, type WorldMovePresentation } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { useHelp } from '../../store/help';
import type { GameState, Hero, PlayerId, TimeOfDay } from '../../types';
import { autoAgreeCommands } from './companionMove';
import { SpinRollStrip, useFreshRoll } from '../ui/CheckPanel';
import { Bar, HeroFace, Screen } from '../ui/game';
import { WorldMap } from './WorldMap';
import { arrivalView, moveButtonText, MoveStatus, useMovePlayback } from './WorldMoveScene';
import { canChangeNow } from '../JobSheet';
import { useElementSize } from '../../hooks/useElementSize';

const TIME_ICON: Record<TimeOfDay, typeof Sun> = { morning: Sunrise, noon: Sun, evening: Sunset, night: Moon };

/** 上部のバー: 侵食度・命の灯火・ゴールド・時間帯・メニュー */
export function WorldTopBar({ game, goldHeroId }: { game: GameState; /** 所持金を出すキャラ（町・神殿・祠では切り替えたキャラ。無ければ世界マップの手番のキャラ） */ goldHeroId?: string }) {
  const openSheet = useBattle((s) => s.openSheet);
  const w = game.world!;
  const time = timeOfDay(w.worldTurn);
  const TimeIcon = TIME_ICON[time];
  const until = turnsUntilNightChange(w.worldTurn);
  const next = nextCorruptionStage(game);
  const cName = corruptionName(game.scenarioId);
  return (
    <div className="panel z-10 flex shrink-0 items-center gap-1.5 px-2 py-1" data-cutin-anchor>
      <button
        // 押すと遊び方の「侵食度」（一番上に今の値と次の段階）を開く。以前のトーストの代わり
        onClick={() => useHelp.getState().openHelp('corruption')}
        className="btn flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg bg-black/30 px-1.5 py-0.5 text-left"
        aria-label={`${cName}の説明`}
        data-help-open="corruption"
      >
        <span className="flex items-center justify-between text-[12px] leading-4">
          <span className="font-display text-fuchsia-200">{cName}</span>
          <b className="tabular-nums text-fuchsia-100">{w.corruption}%</b>
        </span>
        <Bar value={w.corruption} max={100} color="linear-gradient(90deg,#6a2a9a,#e04aff)" height={6} />
        {/* 次の段階は省略せずに全文（2行まで） */}
        <span className="text-[12px] leading-[15px] text-zinc-400">{next ? `次: ${next.at}%で${next.text}` : ''}</span>
      </button>
      {/* 命の灯火と所持金の列。押すと遊び方の「命の灯火」を開く（押しやすいように列ごと1つのボタン） */}
      <button
        onClick={() => useHelp.getState().openHelp('lives')}
        className="btn flex min-h-11 min-w-11 shrink-0 flex-col items-end justify-center gap-0.5 text-[12px] leading-4 font-bold tabular-nums"
        aria-label="命の灯火の説明"
        data-help-open="lives"
      >
        <span className="flex items-center gap-0.5 text-orange-300">
          <Flame size={14} className="fill-orange-500/60" />×{game.lives}
        </span>
        <span className="flex items-center gap-0.5 text-amber-200" aria-label={goldHeroId ? '表示中のキャラの所持金' : '手番のキャラの所持金'} data-top-gold>
          <Coins size={14} />
          {game.heroes.find((h) => h.id === (goldHeroId ?? game.world?.turn))?.gold ?? 0}G
        </span>
      </button>
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

/**
 * 他の人のキャラと一緒に動く時の、移動先の提案（指摘1）。
 * 同行しているキャラの担当の人が全員「一緒に行く」を押したら動く。「同行をやめる」でその人のキャラは残る
 */
function MoveProposal({ game }: { game: GameState }) {
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const w = game.world!;
  const pr = w.moveProposal!;
  const leader = game.heroes.find((h) => h.id === pr.heroId)!;
  const mineToAnswer = pr.owners.filter((p) => !pr.agreed.includes(p) && isLocalPlayer(p));
  return (
    <div className="panel panel-gold-edge relative z-20 mx-2 -mt-2 shrink-0 rounded-xl p-2" data-move-proposal>
      <div className="flex items-center gap-2 text-[13px]">
        <HeroFace hero={leader} size={28} />
        <span className="min-w-0 flex-1 leading-4">
          <b>{leader.name}</b>が光っているマスへ一緒に動こうとしています（同行している人が全員同意したら動きます）
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-[12px]">
        {pr.owners.map((p) => (
          <span key={p} className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5">
            <span className="h-[9px] w-[9px] rotate-45" style={{ background: PLAYER_COLOR[p as PlayerId] }} />
            {p} {pr.agreed.includes(p) ? <b className="text-emerald-300">同意</b> : <span className="text-zinc-400">返事待ち</span>}
          </span>
        ))}
      </div>
      {mineToAnswer.map((p) => {
        // 1台を回して遊ぶ時も、今の手番の人ではなく、その同行キャラの担当として返事を送る（store の actorOf が heroId から決める）
        const heroId = pr.companions.find((id) => game.heroes.find((h) => h.id === id)?.playerId === p);
        const answer = (accept: boolean) => dispatchGame({ type: 'WORLD_MOVE_AGREE', playerId: p as PlayerId, heroId, accept });
        return (
        <div key={p} className="mt-1.5 grid grid-cols-2 gap-1.5">
          <button onClick={() => answer(false)} className="btn btn-dark h-11 rounded-lg text-[13px] font-bold">
            {p}: 同行をやめる
          </button>
          <button onClick={() => answer(true)} className="btn btn-gold h-11 rounded-lg text-[14px] font-bold">
            {p}: 一緒に行く
          </button>
        </div>
        );
      })}
    </div>
  );
}

/** パーティの小さな状態（顔のアイコンと細いHP。地図を広くとるため小さく） */
function PartyRow({ game }: { game: GameState }) {
  const openSheet = useBattle((s) => s.openSheet);
  const setScene = useBattle((s) => s.setScene);
  const w = game.world!;
  return (
    <div className="flex shrink-0 items-center gap-1.5 bg-black/50 px-2 py-0.5" data-party-row>
      {game.heroes.map((h) => {
        const max = heroMaxHp(h);
        const active = h.id === w.turn;
        // ダンジョンの中のキャラ: タップでその場面を見る
        const exp = game.expeditions?.find((x) => x.heroes.includes(h.id));
        const status = h.retired ? '退場' : exp ? (exp.dungeon?.name ?? 'ダンジョン') : w.acted.includes(h.id) && !active ? '行動済' : '';
        return (
          <button
            key={h.id}
            onClick={() => (exp ? setScene(exp.id) : openSheet('party'))}
            aria-label={`${h.name}${status ? `（${status}）` : ''} HP${h.hp}/${max}`}
            className={`btn relative flex h-11 w-11 shrink-0 flex-col items-center justify-center ${w.acted.includes(h.id) && !active ? 'opacity-55' : ''}`}
          >
            <span className={`rounded-full ${active ? 'shadow-[0_0_0_2px_#ffd76a,0_0_10px_#ffd76a]' : ''}`}>
              <HeroFace hero={h} size={32} dim={h.hp <= 0 || !!h.retired} />
            </span>
            <span className="mt-[2px] block w-[34px]">
              <Bar value={h.hp} max={max} color="linear-gradient(90deg,#22b45a,#7dffa8)" height={4} />
            </span>
            {exp && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border border-black bg-sky-400" />}
            {!exp && canChangeNow(game, h) && (
              <span className="absolute -top-1 -left-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-black bg-amber-300 text-[12px] font-bold text-black" aria-label="転職できます">
                ↑
              </span>
            )}
          </button>
        );
      })}
      <span className="ml-auto truncate text-[12px] text-zinc-400">タップで詳しく</span>
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

/**
 * 手番の受け渡し（1台を回して遊ぶ時。spec §7.3）。フェーズ2-C: 手番のカットインと同じ見た目（プレイヤーの色の帯が滑り込む）にして、
 * この画面1枚だけを出す（カットインは store の側で出さない。src/store/handoff.ts）。盗み見を防ぐため、タップで始める
 */
function HandoffOverlay({ hero, onStart }: { hero: Hero; onStart: () => void }) {
  const reduced = useReducedMotion();
  const fast = useBattle((s) => s.settings.fastMode || s.settings.cutinMode === 'simple');
  const short = fast || !!reduced;
  const color = PLAYER_COLOR[hero.playerId];
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: short ? 0.08 : 0.15 }}
      onClick={onStart}
      className="absolute inset-0 z-50 flex flex-col items-stretch justify-center bg-black/90"
      aria-label="手番を始める"
      data-handoff={hero.id}
    >
      <motion.div
        className="relative w-full py-3 text-left"
        initial={short ? { opacity: 0 } : { x: '-110%' }}
        animate={short ? { opacity: 1 } : { x: 0 }}
        transition={short ? { duration: 0.08 } : { type: 'spring', stiffness: 420, damping: 34 }}
        style={{ background: `linear-gradient(90deg, ${color}ee 0%, ${color}cc 55%, ${color}33 100%)`, boxShadow: `0 0 24px ${color}88` }}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-white/70" />
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/70" />
        <div className="flex items-center gap-3 px-4">
          <span className="shrink-0 rounded-full border-2 border-white/90 shadow-lg">
            <HeroFace hero={hero} size={64} />
          </span>
          <div className="min-w-0 flex-1 text-black">
            <span className="rounded bg-black/80 px-1.5 text-[13px] font-bold text-white">{hero.playerId}</span>
            <div className="font-display truncate text-[26px] leading-8 drop-shadow-[0_1px_0_rgba(255,255,255,.6)]">{hero.name}の番！</div>
            <div className="truncate text-[14px] font-bold">世界マップ</div>
          </div>
        </div>
      </motion.div>
      <span className="mt-4 text-center text-[15px] font-bold text-white">スマホを {hero.playerId} さんに渡してください</span>
      <span className="mt-1 text-center text-[14px] text-zinc-300">スマホを渡して、タップで始める</span>
    </motion.button>
  );
}

/** 地図のマスの説明（タップしたマス） */
function tileInfo(game: GameState, i: number): string {
  const w = game.world!;
  const t = w.tiles[i];
  if (!t.seen) return 'まだ霧に包まれている';
  const terr = getTerrain(t.t);
  const parts = [terr.sea ? `${terr.name}（${w.ship ? `船で移動力${terr.shipCost ?? 1}` : '船が必要です'}）` : `${terr.name}（移動力${terr.moveCost || '×'}）`];
  const f = t.f;
  if (f?.kind === 'town') parts.push(TOWNS.get(f.id).name + (w.fallenTowns.includes(f.id) ? '（陥落）' : ''));
  if (f?.kind === 'dungeon') parts.push(DUNGEONS.get(f.id).name);
  if (f?.kind === 'temple' || f?.kind === 'altar') parts.push(SANCTUARIES.get(f.id).name);
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
  if (f.kind === 'temple' || f.kind === 'altar') return `${SANCTUARIES.get(f.id).name}に入る`;
  if (f.used) return undefined;
  return { shrine: '祠で祈る', event: '調べる', landmark: '調べる', chest: '宝箱を開ける' }[f.kind];
}

export function WorldScreen({ movement }: { movement?: WorldMovePresentation } = {}) {
  const storeGame = useBattle((s) => s.game)!;
  // 移動の演出中は、移動を押す前の状態（視界・敵・手番・パネル）を見せ続ける。
  // 画面を差し替えないので、地図と駒は同じまま・大きさもカメラも変わらない。
  const playback = useMovePlayback(movement);
  const game = movement ? (movement.before ?? movement.game) : storeGame;
  const mapGame = movement && playback?.arrived ? arrivalView(movement) : game;
  // 下の操作パネルは地図の上に重ねる。地図の枠はパネルの高さによらず同じ大きさで、1pxも動かない。
  // 移動中は、パネルを外さずに見えなくして、その上に小さな「移動中…」の帯を重ねる（パネルの高さが変わらないので、カメラも合わせ直さない）
  const [panelBox, panelSize] = useElementSize<HTMLDivElement>();
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
  // 手番がダンジョンの中のパーティ（M3-D）: 世界マップでは待つ
  const turnExp = game.expeditions?.find((x) => x.heroes.includes(w.turn));
  const setScene = useBattle((s) => s.setScene);
  const mine = !turnExp && (!hero || isLocalPlayer(hero.playerId));
  useEffect(() => {
    if (hero && shownFor !== w.turn && !needHandoff) setShownFor(w.turn);
  }, [hero, shownFor, w.turn, needHandoff]);

  useEffect(() => {
    setSelected(undefined);
    setInfo(undefined);
    setFocus(0);
  }, [w.turn, w.move]);

  // 移動力の判定のスロット（フェーズ2-D）: この画面を開いた後に新しく判定した時だけ回す
  const moveRollKey = w.moveRoll ? `move:${game.seed}:${w.worldTurn}:${w.turn}` : undefined;
  const freshRoll = useFreshRoll(moveRollKey);

  // 1台で遊ぶ時（フェーズ2-C）: 同行している仲間の担当も全員この端末にいるので、「一緒に行く」の確認を出さずに、
  // その担当の同行キャラとして返事を送ってすぐ一緒に動く（オンラインで別の端末の人を連れて動く時だけ同意を取る）
  const proposal = w.moveProposal;
  const [autoAgreeFailed, setAutoAgreeFailed] = useState(false);
  useEffect(() => {
    if (!proposal || movement || isOnlinePlay()) return;
    const cmds = autoAgreeCommands(useBattle.getState().game ?? game, isLocalPlayer);
    let failed = false;
    for (const c of cmds) if (dispatchGame(c)) failed = true;
    setAutoAgreeFailed(failed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal, movement]);

  const reach = useMemo(() => {
    if (here === undefined || w.move === null || w.move <= 0) return undefined;
    const r = reachable(w, here, w.move);
    return new Map([...r].map(([i, v]) => [i, v.cost]));
  }, [w, here]);
  const path = useMemo(() => (selected !== undefined && here !== undefined && w.move ? pathTo(reachable(w, here, w.move), selected) : undefined), [selected, here, w]);

  if (!hero || here === undefined) return null;
  const companions = heroesAt(game, here).filter((h) => h.id !== hero.id);
  // 同行: 自分（同じ担当）のキャラはタップで選ぶ。他の人のキャラは誘って、承知してもらった時だけ
  const ownMate = (h: { playerId: PlayerId }) => h.playerId === hero.playerId;
  const chosenCompanions = companions.filter((h) => (ownMate(h) ? (withMe[h.id] ?? true) : followingGroup(game, hero.id).includes(h.id))).map((h) => h.id);
  const invite = (c: { id: string; playerId: PlayerId }) => {
    dispatchGame({ type: 'WORLD_INVITE', playerId: hero.playerId, heroId: hero.id, targetId: c.id });
    // 誘われた人もこの端末で遊んでいる（1台を回して遊ぶ）なら、その場で答えてもらう
    if (isLocalPlayer(c.playerId) && !isOnlinePlay()) dispatchGame({ type: 'WORLD_INVITE_ANSWER', playerId: c.playerId, heroId: c.id, accept: true });
  };
  const label = interactLabel(game, here);
  const chance = statChance(hero, 'agi', 'move');
  const moveSlots = moveSlotsOf(hero);
  const maxFocus = Math.min(moveSlots, hero.focus);
  const dist = successDistribution(moveSlots, Math.min(focus, maxFocus), chance);
  const moveBase = BALANCE.moveBase + moveBonusOf(hero);
  const avg = moveBase + dist.reduce((n, p, k) => n + p * k, 0);
  const ambush = campAmbushChance(game, hero.id);
  const climate = climateAt(game, here);
  const onTown = w.tiles[here].f?.kind === 'town';
  const canCamp = !onTown && (w.move === null || w.move >= BALANCE.moveBase);
  const pid = hero.playerId;

  const tapTile = (i: number) => {
    if (mine && reach?.has(i) && i !== here) {
      if (selected === i) {
        // 選んだマスと説明は、移動の演出が終わるまで残す（パネルの高さが変わると地図の大きさが変わるため）。
        // 手番か移動力が変わった時に上の useEffect で消える。
        dispatchGame({ type: 'WORLD_MOVE', playerId: pid, heroId: hero.id, to: i, companions: chosenCompanions });
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
      {/* 地図。タップしたマスの説明は、地図の上に重ねたパネルのすぐ上に出す（行が増えて地図が狭くならないように。フェーズ2-D） */}
      <div className="relative flex min-h-0 flex-1 flex-col" data-world-area>
        <WorldMap
          game={mapGame}
          reach={playback ? undefined : reach}
          selected={playback ? undefined : w.moveProposal?.to ?? selected}
          path={playback ? undefined : path}
          movement={playback}
          onTapTile={playback ? () => {} : tapTile}
          bottomInset={panelSize.height}
        />
        {info && !playback && (
          <div className="pointer-events-none absolute inset-x-0 z-10 bg-black/75 py-1 pr-14 pl-3 text-[12px] leading-4 text-zinc-100" style={{ bottom: panelSize.height }} data-tile-info>
            {info}
          </div>
        )}
      {/* 地図の下の端に重ねる操作パネル（高さが変わっても地図は動かない） */}
      <div ref={panelBox} className="absolute inset-x-0 bottom-0 z-20" data-world-panel>
      {w.moveProposal && (isOnlinePlay() || autoAgreeFailed) && <MoveProposal game={game} />}

      {/* 手番の表示と操作パネル。移動の演出中は、パネルを見えなくして小さな「移動中…」の帯だけを見せ、地図を広く見せる（フェーズ2-D） */}
      {movement && playback && (
        <div className="absolute inset-x-0 bottom-0 z-40">
          <MoveStatus move={movement} playback={playback} />
        </div>
      )}
      <div className={`relative shrink-0 ${movement && playback ? 'invisible' : ''}`} aria-hidden={movement && playback ? true : undefined} data-world-controls>
      <div className="shrink-0 bg-sky-950 px-3 py-1 text-center text-[14px] font-bold" data-current-turn>現在は {hero.playerId}（{hero.name}）の手番です</div>
      {/* 手番のキャラの操作 */}
      <div className="panel relative z-10 shrink-0 rounded-t-2xl px-3 pt-2 pb-3">
        {turnExp && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-t-2xl bg-[#0b0910]/95 px-3 text-[14px] text-zinc-100">
            <span className="flex items-center gap-1.5">
              <span className="flex -space-x-2">
                {game.heroes
                  .filter((h) => turnExp.heroes.includes(h.id))
                  .map((h) => (
                    <HeroFace key={h.id} hero={h} size={30} />
                  ))}
              </span>
              {game.heroes.find((h) => h.id === w.turn)?.name}たちが{turnExp.dungeon?.name ?? 'ダンジョン'}を探索中です
            </span>
            <button onClick={() => setScene(turnExp.id)} className="btn btn-gold h-11 rounded-lg px-4 text-[14px] font-bold">
              ダンジョンを見る
            </button>
          </div>
        )}
        {!mine && !turnExp && (
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
            <SpinRollStrip results={w.moveRoll} small spinKey={moveRollKey ?? ''} fresh={freshRoll} />
            <span className="text-[12px] leading-4 text-zinc-300">{w.move ? (selected !== undefined ? 'もう一度タップか下のボタンで決定' : 'マスの数字は、そこまでに使う移動力') : '移動力を使い切った'}</span>
          </div>
        )}

        {mine && followingGroup(game, hero.id).length > 1 && <button className="btn btn-dark my-1 min-h-11 w-full rounded-lg text-[13px]" onClick={() => { dispatchGame({ type: 'WORLD_UNFOLLOW', playerId: pid, heroId: hero.id }); setWithMe(Object.fromEntries(companions.map(h => [h.id, false]))); }}>同行を解除して単独行動する</button>}
        {companions.length > 0 && (w.move === null || (w.move ?? 0) > 0) && (
          <div className="mt-1 flex items-center gap-1">
            <span className="flex shrink-0 items-center gap-0.5 text-[12px] text-zinc-300">
              <Users size={14} />
              同行
            </span>
            {companions.map((c) => {
              if (!ownMate(c)) {
                const st = followingGroup(game, hero.id).includes(c.id) ? 'yes' : w.invites?.[c.id] === hero.id ? 'wait' : 'no';
                return (
                  <button
                    key={c.id}
                    disabled={!mine || st !== 'no'}
                    onClick={() => invite(c)}
                    aria-label={`${c.name}を誘う`}
                    className={`btn relative flex h-11 min-w-11 shrink-0 items-center gap-1 rounded-full border-2 px-1 disabled:opacity-100 ${st === 'yes' ? 'sel-on' : 'border-sky-300/50 bg-black/30'}`}
                  >
                    <HeroFace hero={c} size={30} dim={st !== 'yes'} />
                    <span className="pr-1 text-[12px] font-bold text-sky-200">{st === 'yes' ? '同行' : st === 'wait' ? '返事待ち' : '誘う'}</span>
                  </button>
                );
              }
              const on = withMe[c.id] ?? true;
              return (
                <button
                  key={c.id}
                  onClick={() => setWithMe({ ...withMe, [c.id]: !on })}
                  aria-label={`${c.name}を${on ? '残す' : '連れて行く'}`}
                  className={`btn relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'sel-on' : 'border-white/10 bg-black/30'}`}
                >
                  <HeroFace hero={c} size={34} dim={!on} />
                  {on && <span className="absolute -right-1 -bottom-1 rounded-full bg-amber-300 px-1 text-[12px] leading-4 font-black text-black">✓</span>}
                </button>
              );
            })}
            <span className="truncate text-[12px] text-zinc-500">{companions.some((c) => !ownMate(c)) ? '他の人のキャラは誘って承知してもらう' : 'タップで一緒に行くか選ぶ'}</span>
          </div>
        )}

        {/* その場の施設に入る（省略せずに全文で、広いボタン） */}
        {label && (
            <button
              onClick={() => dispatchGame({ type: 'WORLD_INTERACT', playerId: pid, heroId: hero.id, party: [hero.id, ...chosenCompanions] })}
              className="btn btn-dark font-display mt-1.5 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-[16px] leading-5 text-amber-100 shadow-[0_0_12px_rgba(255,200,90,.35)]"
              data-interact
            >
              {label}
            </button>
          )}
        {w.move === null && (
          <div className="mt-1.5 flex items-center gap-2">
            <button onClick={() => setFocus(Math.max(0, focus - 1))} disabled={focus <= 0} aria-label="フォーカスを減らす" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
              <Minus size={18} />
            </button>
            <div className="flex flex-1 flex-col items-center leading-4">
              <span className="text-[12px] text-zinc-300">
                素早さ{chance}%×{moveSlots}枠・フォーカス<b className="text-amber-200">{Math.min(focus, maxFocus)}</b>
              </span>
              <span className="text-[12px] text-zinc-400">
                移動力 {moveBase + Math.min(focus, maxFocus)}〜{moveBase + moveSlots}（平均{avg.toFixed(1)}）
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
            <button onClick={() => tapTile(selected)} className="btn btn-gold font-display h-12 rounded-xl text-[17px] leading-5">
              {moveButtonText(reach?.get(selected), path?.length)}
            </button>
          ) : (w.move ?? 0) > 0 && mine ? (
            // 行き先を選ぶ前も同じ高さのボタンの場所を取っておく（選んだ時にパネルが高くならないように）
            <button disabled className="btn btn-dark h-12 rounded-xl text-[15px] font-bold disabled:opacity-60" data-move-placeholder>
              光るマスをタップして行き先を選ぶ
            </button>
          ) : null}
          {/* 同じマスに倒れている仲間（M3-C5）: 手番を使って助け起こす */}
          {Object.entries(w.downed ?? {})
            .filter(([, t]) => t === w.pos[hero.id])
            .map(([id]) => {
              const d = game.heroes.find((x) => x.id === id);
              return d ? (
                <button
                  key={id}
                  onClick={() => dispatchGame({ type: 'WORLD_REVIVE', playerId: pid, heroId: hero.id, targetId: id })}
                  className="btn btn-gold flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-bold"
                >
                  <HeroFace hero={d} size={30} dim /> {d.name}を助け起こす（手番を使う）
                </button>
              ) : null;
            })}
          {climate && (
            <p className="text-[12px] leading-4 text-sky-200" data-climate-note>
              {climate.kind === 'cold' ? '❄️ 寒さ' : '☀️ 暑さ'}で毎ターン体力が減る（野営すれば防げる。ただし回復は半分）
            </p>
          )}
          <div className="grid grid-cols-2 gap-1.5">
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
      </div>
      </div>
      </div>

      {/* 移動の演出中は、上の情報欄・仲間の列・地図のタップも受け付けない（以前の移動画面と同じ） */}
      {movement && <div className="absolute inset-0 z-30" aria-hidden data-move-blocker />}
      <AnimatePresence>
        {w.story && <StoryOverlay key="story" title={w.story.title} lines={w.story.lines} onNext={() => dispatchGame({ type: 'STORY_CONTINUE', playerId: pid })} />}
        {!w.story && needHandoff && (
          <HandoffOverlay
            key="handoff"
            hero={hero}
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
