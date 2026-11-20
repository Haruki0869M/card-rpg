import { followingGroup } from '../../engine/game/world/group';
import { spawnAt, spawnTurnsLeft, SPAWN_NAME } from '../../engine/game/world/explore';
// ===== 世界マップの画面（spec §8・§20.3）=====
// 上: 侵食度・命の灯火・ゴールド・時間帯 / 中: 地図 / 下: 手番のキャラの操作（移動力の判定・移動・入る・野営・待機）
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Coins, Compass, Dices, Flame, Hourglass, Menu, Moon, ScrollText, Star, Sun, Sunrise, Sunset, Tent, Users } from 'lucide-react';
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
  TIME_NAME,
  timeOfDay,
  turnsUntilNightChange,
  worldDiceBonus,
  terrainDiceBonus,
  diceAverage,
  corruptionShown,
  dungeonJoin,
  randomDungeonView,
  dungeonDetourLines,
  scourgeCurse,
  scourgesWith,
  scourgeList,
  guideGoal,
  goalLineText,
  goalShortText,
  routeToward,
  dungeonGateError,
  dungeonTile,
  laneDefOfTile,
  signposts,
  signpostText,
  warmthNote,
  tideStatus,
  tideTileNote,
  type GuideGoal,
} from '../../engine';
// 狭い画面 回2（C）: 雪に埋もれた街道の知らせ（エンジンの文を読むだけ。engine の入口には出ていないので直に読む）
import { roadBuriedNote } from '../../engine/game/world/lanes';
import { isLocalPlayer, isOnlinePlay } from '../../store/battleConfig';
import { useBattle, type WorldMovePresentation } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { useHelp } from '../../store/help';
import type { GameState, Hero, PlayerId, TimeOfDay } from '../../types';
import { autoAgreeCommands } from './companionMove';
import { PlayerTag, showOwners } from '../Sheets';
import { DiceOverlay, DiceResult, bonusText } from '../ui/DiceRoll';
import { Bar, HeroFace, Screen } from '../ui/game';
import { WorldMap } from './WorldMap';
import { ScourgeStrip } from './ScourgeBadge';
import { arrivalView, moveButtonText, MoveStatus, useMovePlayback } from './WorldMoveScene';
import { canChangeNow } from '../JobSheet';
import { useElementSize } from '../../hooks/useElementSize';
import { useLowScreen } from '../../hooks/useLowScreen';

const TIME_ICON: Record<TimeOfDay, typeof Sun> = { morning: Sunrise, noon: Sun, evening: Sunset, night: Moon };

/** 上部のバー: 侵食度・命の灯火・ゴールド・時間帯・メニュー */
export function WorldTopBar({ game, goldHeroId, goalLine, scourgeInParty, scourgeInBar }: { game: GameState; /** 所持金を出すキャラ（町・神殿・祠では切り替えたキャラ。無ければ世界マップの手番のキャラ） */ goldHeroId?: string; /** 「次の目的」の行（回1。世界マップだけ。上の帯のすぐ下、💀の札の上に出す） */ goalLine?: React.ReactNode; /** 狭い画面 回1: 低い画面では、災厄の札を仲間の列の 💀×N に畳む（世界マップだけ） */ scourgeInParty?: boolean; /** 低い町の画面（2026-11-20 オーナーの決定 A）: 災厄の帯を、この棒の中の 💀×N の小さなボタンにまとめる（店の一覧を広げるため） */ scourgeInBar?: boolean }) {
  const openSheet = useBattle((s) => s.openSheet);
  // 狭い画面 回1: 低い画面（data-low）では、帯を1行にする（「次: 25%で…」は帯を押すと遊び方の一番上に出る）
  const low = useLowScreen();
  const w = game.world!;
  const time = timeOfDay(w.worldTurn);
  const TimeIcon = TIME_ICON[time];
  const until = turnsUntilNightChange(w.worldTurn);
  const next = nextCorruptionStage(game);
  const cName = corruptionName(game.scenarioId);
  const curse = scourgeCurse(game);
  const tide = tideStatus(w);
  return (
    <>
    <div className="panel z-10 flex shrink-0 items-center gap-1.5 px-2 py-1" data-cutin-anchor>
      <button
        // 押すと遊び方の「侵食度」（一番上に今の値と次の段階）を開く。以前のトーストの代わり
        onClick={() => useHelp.getState().openHelp('corruption')}
        className="btn flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg bg-black/30 px-1.5 py-0.5 text-left"
        aria-label={`${cName}の説明`}
        data-help-open="corruption"
        data-corruption={corruptionShown(w.corruption)}
      >
        <span className="flex items-center justify-between text-[12px] leading-4">
          <span className="font-display whitespace-nowrap text-fuchsia-200">{cName}</span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            {/* 災厄（瘴気を紡ぐ死霊術師）が生きている間は、世界マップの番ごとの伸びが増える（2026-11-13） */}
            {curse.corruptionPerTurn > 0 && <span className="text-[12px] font-normal text-fuchsia-300" aria-label={`災厄のせいで、番ごとに+${curse.corruptionPerTurn}%`} data-corruption-scourge>💀+{curse.corruptionPerTurn}%</span>}
            <b className="tabular-nums text-fuchsia-100">{corruptionShown(w.corruption)}%</b>
          </span>
        </span>
        <Bar value={w.corruption} max={100} color="linear-gradient(90deg,#6a2a9a,#e04aff)" height={6} />
        {/* 次の段階は省略せずに全文（2行まで）。低い画面は出さない（押すと遊び方の一番上に「次: …」が出る）。低い町の画面（💀×N を棒に入れる時）も出さない: 棒が狭くなって5行に折れるため（2026-11-20） */}
        <span className={`text-[12px] leading-[15px] text-zinc-400 low:hidden ${scourgeInBar ? 'hidden' : ''}`} data-corruption-next>{next ? `次: ${next.at}%で${next.text}` : ''}</span>
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
      <div className="flex shrink-0 flex-col items-center text-[12px] leading-4" data-time={time}>
        <span className="flex items-center gap-0.5 font-bold text-sky-100">
          <TimeIcon size={14} className={time === 'night' ? 'text-indigo-300' : 'text-amber-300'} />
          {dayOf(w.worldTurn)}日目{TIME_NAME[time]}
          {/* 潮の印（シナリオ3の作り直し §3-1。潮のマスのある地図だけ）。くわしくは下のパネルの札・マスの説明 */}
          {tide && <span aria-label={tide.text} data-tide-icon={tide.tide}>{tide.icon}</span>}
        </span>
        <span className="flex items-center gap-0.5 text-zinc-400">
          <Hourglass size={12} />
          {until.night ? `朝まで${until.turns}` : `夜まで${until.turns}`}
        </span>
        {/* 災厄（氷嵐の魔女）が生きている間は、夜の魔物のレベルがさらに上がる（夜の間だけ出す。2026-11-13） */}
        {time === 'night' && curse.nightLevel > 0 && <span className="text-fuchsia-300" data-night-scourge>💀敵Lv+{curse.nightLevel}</span>}
      </div>
      {scourgeInBar && <ScourgeStrip game={game} variant="button" compact />}
      <button onClick={() => openSheet('quests')} aria-label="依頼" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
        <ScrollText size={20} />
      </button>
      <button onClick={() => openSheet('menu')} aria-label="メニュー" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
        <Menu size={22} />
      </button>
    </div>
    {goalLine}
    {/* 災厄の中ボスの札（段階7b）。いる時だけ。低い画面の世界マップは仲間の列の 💀×N に畳む（町などは1行の帯） */}
    {!(low && scourgeInParty) && !scourgeInBar && <ScourgeStrip game={game} />}
    </>
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
  const low = useLowScreen();
  const answerOf = (p: string) => {
    // 1台を回して遊ぶ時も、今の手番の人ではなく、その同行キャラの担当として返事を送る（store の actorOf が heroId から決める）
    const heroId = pr.companions.find((id) => game.heroes.find((h) => h.id === id)?.playerId === p);
    return (accept: boolean) => dispatchGame({ type: 'WORLD_MOVE_AGREE', playerId: p as PlayerId, heroId, accept });
  };
  const ownerChips = pr.owners.map((p) => (
    <span key={p} className="flex shrink-0 items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[12px] leading-4 whitespace-nowrap">
      <span className="h-[9px] w-[9px] rotate-45" style={{ background: PLAYER_COLOR[p as PlayerId] }} />
      {p} {pr.agreed.includes(p) ? <b className="text-emerald-300">同意</b> : <span className="text-zinc-400">返事待ち</span>}
    </span>
  ));
  if (low) {
    // 狭い画面 回2（D）: 低い画面は、文を1行（12px）にして、返事のボタン（44px）を担当の札と同じ行に置く（地図を 150px 以上残す）。
    // 文は短くするが「光るマスへ一緒に動く」「全員の同意で動く」「同意／返事待ち」はそのまま残す
    return (
      <div className="panel panel-gold-edge relative z-20 mx-2 -mt-1 shrink-0 rounded-xl px-2 py-1" data-move-proposal>
        {mineToAnswer.length === 1 ? (
          // 返事をする端末: 文（担当の返事の様子も文の中に）と、返事のボタン2つを1行に（窓の高さ ≒ ボタン1段）
          <div className="flex items-center gap-1">
            <span className="min-w-0 flex-1 text-[12px] leading-4">
              <b>{leader.name}</b>と光るマスへ一緒に動く（全員の同意で動く）
              {pr.owners.map((p) => (
                <span key={p} className="ml-1 whitespace-nowrap">
                  {p} {pr.agreed.includes(p) ? <b className="text-emerald-300">同意</b> : <span className="text-zinc-400">返事待ち</span>}
                </span>
              ))}
            </span>
            <button onClick={() => answerOf(mineToAnswer[0])(false)} className="btn btn-dark flex h-11 shrink-0 flex-col items-center justify-center rounded-lg px-1.5 text-[12px] leading-4 font-bold" data-move-agree="no">
              <span>{mineToAnswer[0]}:</span>
              <span>同行をやめる</span>
            </button>
            <button onClick={() => answerOf(mineToAnswer[0])(true)} className="btn btn-gold flex h-11 shrink-0 flex-col items-center justify-center rounded-lg px-1.5 text-[13px] leading-4 font-bold" data-move-agree="yes">
              <span>{mineToAnswer[0]}:</span>
              <span>一緒に行く</span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[12px] leading-4">
              <HeroFace hero={leader} size={22} />
              <span className="min-w-0 flex-1">
                <b>{leader.name}</b>と光るマスへ一緒に動く（全員の同意で動く）
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">{ownerChips}</div>
            {mineToAnswer.map((p) => (
              <div key={p} className="mt-1 grid grid-cols-2 gap-1.5">
                <button onClick={() => answerOf(p)(false)} className="btn btn-dark h-11 rounded-lg text-[12px] font-bold" data-move-agree="no">
                  {p}: 同行をやめる
                </button>
                <button onClick={() => answerOf(p)(true)} className="btn btn-gold h-11 rounded-lg text-[13px] font-bold" data-move-agree="yes">
                  {p}: 一緒に行く
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }
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
          <button onClick={() => answer(false)} className="btn btn-dark h-11 rounded-lg text-[13px] font-bold" data-move-agree="no">
            {p}: 同行をやめる
          </button>
          <button onClick={() => answer(true)} className="btn btn-gold h-11 rounded-lg text-[14px] font-bold" data-move-agree="yes">
            {p}: 一緒に行く
          </button>
        </div>
        );
      })}
    </div>
  );
}

/**
 * 「次の目的」の行（回1）: 上の帯のすぐ下に、いつも1行（災厄の💀の札がある時は、その上）。押すと、その場所へ地図を動かす（霧の中でも）。
 * 方角は、自分のキャラ（手番のキャラが自分のならそれ、ちがえば自分の最初のキャラ）の場所から
 */
function GoalLine({ game, goal, from, onFocus }: { game: GameState; goal: GuideGoal; from: number | undefined; onFocus: () => void }) {
  const text = goalLineText(game, goal, from);
  return (
    <button
      onClick={onFocus}
      // 高さ700px未満の画面（360×640 など）では出さない: 1行（44px）を足すと、操作パネルに隠れていない地図がほとんど無くなるため（回1の報告に案を書いた）
      className="btn z-10 mx-2 mt-1 hidden min-h-11 shrink-0 items-center gap-1 rounded-lg border border-amber-200/50 bg-[#2a1c06]/85 px-2 text-left text-[13px] leading-4 font-bold text-amber-100 [@media(min-height:700px)]:flex low:hidden"
      aria-label={`${text}。押すと地図がその場所へ動きます`}
      data-goal-line={goal.dungeonId}
    >
      <Compass size={15} className="shrink-0 text-amber-300" />
      <span className="min-w-0 flex-1 truncate">{text}</span>
    </button>
  );
}

/** パーティの小さな状態（顔のアイコンと細いHP。地図を広くとるため小さく） */
function PartyRow({ game }: { game: GameState }) {
  const openSheet = useBattle((s) => s.openSheet);
  // 狭い画面 回1: 低い画面では、災厄の札を「💀×N」の小さなボタンにしてこの列に入れる。4人・狭い幅で入りきらない時は横に送れる
  const low = useLowScreen();
  const scourgeN = low ? scourgeList(game).length : 0;
  const setScene = useBattle((s) => s.setScene);
  const w = game.world!;
  const owners = showOwners(game);
  // 「ステータス」で開くキャラ: 手番のキャラが自分のならそれ、ちがえば自分の最初のキャラ
  const self = game.heroes.find((h) => h.id === w.turn && isLocalPlayer(h.playerId)) ?? game.heroes.find((h) => isLocalPlayer(h.playerId)) ?? game.heroes[0];
  return (
    <div className={`flex shrink-0 items-center bg-black/50 px-2 py-0.5 ${low ? 'gap-1 overflow-x-auto [scrollbar-width:none]' : 'gap-1.5'}`} data-party-row>
      {game.heroes.map((h) => {
        const max = heroMaxHp(h);
        const active = h.id === w.turn;
        // ダンジョンの中のキャラ: タップでその場面を見る
        const exp = game.expeditions?.find((x) => x.heroes.includes(h.id));
        const status = h.retired ? '退場' : exp ? (exp.dungeon?.name ?? 'ダンジョン') : w.acted.includes(h.id) && !active ? '行動済' : '';
        return (
          <button
            key={h.id}
            onClick={() => (exp ? setScene(exp.id) : openSheet('party', h.id))}
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
            {owners && (
              <span className="absolute right-[-3px] bottom-[5px]">
                <PlayerTag hero={h} />
              </span>
            )}
            {!exp && canChangeNow(game, h) && (
              <span className="absolute -top-1 -left-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-black bg-amber-300 text-[12px] font-bold text-black" aria-label="転職できます">
                ↑
              </span>
            )}
          </button>
        );
      })}
      {scourgeN > 0 && <ScourgeStrip game={game} variant="button" className="ml-auto" />}
      <StatusButton game={game} self={self} className={scourgeN > 0 ? '' : 'ml-auto'} fixed={low} />
    </div>
  );
}

/**
 * 「ステータス」のボタン（自分のキャラのステータス・装備の付け替え・仲間への受け渡しの窓を開く）。
 * 世界マップの下の列と、町・神殿・祭壇の画面の上（回2）で同じ物を使う。窓はこの端末だけで開く（ほかの人の操作は止めない）
 */
export function StatusButton({ game, self, className = '', fixed }: { game: GameState; self: Hero; className?: string; /** 縮めない（低い画面の仲間の列。入りきらない時は列を横に送る） */ fixed?: boolean }) {
  const openSheet = useBattle((s) => s.openSheet);
  const owners = showOwners(game);
  return (
    <button
      onClick={() => openSheet('party', self.id)}
      aria-label={`${self.name}のステータスを見る`}
      className={`btn flex h-11 ${fixed ? 'shrink-0' : 'min-w-0 shrink'} items-center gap-1 rounded-lg border border-amber-200/40 bg-[#2a2040]/90 px-2 text-amber-100 shadow ${className}`}
      data-status-button
    >
      <HeroFace hero={self} size={22} />
      <span className="flex min-w-0 flex-col items-start leading-[15px]">
        <span className="text-[13px] font-bold whitespace-nowrap">ステータス</span>
        <span className="max-w-[88px] truncate text-[12px] text-zinc-300">
          {owners ? `${isOnlinePlay() && isLocalPlayer(self.playerId) ? '自分' : self.playerId}・` : ''}
          {self.name}
        </span>
      </span>
    </button>
  );
}

/**
 * 物語（冒頭・地域の紹介・災厄の知らせ）。
 * 文が長くて画面に入りきらない時（390×540 の災厄の出現）は、文の欄だけを縦にスクロールし、「つづける」は下に固定する
 * （2026-11-19 検証 bot の指摘: 題の上が切れ、「つづける」が画面の外へはみ出して縮んでいた）
 */
function StoryOverlay({ title, lines, onNext }: { title: string; lines: string[]; onNext: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex flex-col bg-black/85" data-story-overlay>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5" data-story-body>
        <div className="flex min-h-full flex-col justify-center py-4">
          <div className="font-display text-outline mb-3 text-center text-[26px] text-amber-100">{title}</div>
          {lines.map((l, i) => (
            <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.5 }} className="mb-2 text-[15px] leading-7 text-zinc-100">
              {l}
            </motion.p>
          ))}
        </div>
      </div>
      <div className="shrink-0 px-5 pt-2 pb-4">
        <button onClick={onNext} className="btn btn-gold font-display h-12 w-full shrink-0 rounded-xl text-[18px]" data-story-next>
          つづける
        </button>
      </div>
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
function tileInfo(game: GameState, i: number, goal?: GuideGoal): string {
  const w = game.world!;
  const t = w.tiles[i];
  if (!t.seen) {
    // 回1: 霧の上に見えている物（塔の先・次の目的地の印）は、何かが分かる
    if (t.f?.kind === 'tower') return '見晴らしの塔: 登ると、まわりが見える';
    if (goal && goal.tile === i) return `まだ霧に包まれている（次の目的: ${goal.name}）`;
    return 'まだ霧に包まれている';
  }
  const terr = getTerrain(t.t);
  // 潮のマス（シナリオ3の作り直し §3-1）: 「満ち潮の間だけ船で通れる。今は引き潮: あと3ターンで開く」
  const parts = [terr.tide ? `${terr.name}（${tideTileNote(w, terr)}）` : terr.sea ? `${terr.name}（${w.ship ? `船で移動力${terr.shipCost ?? 1}` : '船が必要です'}）` : `${terr.name}（移動力${terr.moveCost || '×'}）`];
  const f = t.f;
  if (f?.kind === 'town') parts.push(TOWNS.get(f.id).name + (w.fallenTowns.includes(f.id) ? '（陥落）' : ''));
  // ランダムダンジョン（段階7a）: テーマの印と名前・全5行・黄金箱・テーマの特徴。踏破済みならそう書く
  const rd = randomDungeonView(w, i);
  if (rd) parts.push(rd.done ? `${rd.theme?.mark ?? ''}${rd.name}（踏破済み）` : `${rd.theme?.mark ?? ''}${rd.name}：全5行・最奥に黄金箱。${rd.theme?.description ?? ''}`);
  else if (f?.kind === 'dungeon') parts.push(DUNGEONS.get(f.id).name);
  // 寄り道の値打ち（2026-11-14）: 行く前に分かる手がかり（ランダムダンジョンのご褒美・掛かっている加護・見破り）
  parts.push(...dungeonDetourLines(game, i));
  if (f?.kind === 'temple' || f?.kind === 'altar') parts.push(SANCTUARIES.get(f.id).name);
  if (f?.kind === 'shrine') parts.push(SHRINES.get(f.id).name + (f.used ? '（祈り済み）' : ''));
  if (f?.kind === 'event' || f?.kind === 'landmark') parts.push((EVENTS.tryGet(f.id)?.title ?? '何かがある') + (f.used ? '（調べた）' : ''));
  if (f?.kind === 'chest') parts.push(f.used ? '空の宝箱' : '宝箱');
  if (f?.kind === 'tower') parts.push(f.used ? '見晴らしの塔（登った）' : '見晴らしの塔（登ると、まわりの霧が晴れる）');
  const sp = spawnAt(w, i);
  if (sp) parts.push(`${SPAWN_NAME[sp.kind]}（あと${spawnTurnsLeft(w, sp)}ターン）`);
  const wd = w.wanderers.find((x) => x.tile === i);
  if (wd) parts.push(`敵: ${wd.enemies.map((e) => `${getEnemy(e.defId).name} Lv${e.level ?? 1}`).join('・')}${wd.raidTown ? '（町を襲撃中）' : ''}`);
  // 回1: 分かれ道の立て札
  for (const p of signposts(game, w)) if (p.tile === i) parts.push(`立て札「${signpostText(p)}」`);
  // 3つの道（2026-11-14）: 広い地図の帯の性質（行く前に違いが分かるように）
  const lane = laneDefOfTile(game, w, i);
  if (lane?.hint) parts.push(`${lane.mark ?? ''}${lane.name}: ${lane.hint}${lane.ambush && lane.ambush !== 1 ? `（夜の野営の夜襲×${lane.ambush}）` : ''}`);
  return parts.join(' / ');
}

/** 今いるマスで「入る」ボタンの文字（入れる物が無ければ undefined） */
function interactLabel(game: GameState, tile: number): string | undefined {
  const f = game.world!.tiles[tile].f;
  const sp = spawnAt(game.world!, tile);
  if (!f && sp) return sp.kind === 'peddler' ? '行商人と話す' : sp.kind === 'thief' ? 'コソ泥に近づく' : '落ちた星を調べる';
  if (!f) return undefined;
  if (f.kind === 'town') return game.world!.fallenTowns.includes(f.id) ? undefined : `${TOWNS.get(f.id).name}に入る`;
  if (f.kind === 'dungeon') {
    // 先に入った仲間の組がいれば、合流する（組が通路にいる時だけ。戦闘中などは、押すと「終わってから」と知らせる）
    const join = dungeonJoin(game, tile);
    const lead = join ? game.heroes.find((h) => join.exp.heroes.includes(h.id) && h.hp > 0) : undefined;
    // ランダムダンジョン（段階7a）: テーマの名前で出す。踏破済みは入れない（ボタンを出さない）
    const rd = randomDungeonView(game.world!, tile);
    if (rd?.done && !join) return undefined;
    const name = rd ? `${rd.theme?.mark ?? ''}${rd.name}` : DUNGEONS.get(f.id).name;
    return join ? `${lead?.name ?? '仲間'}たちに合流する（${name}）` : `${name}に入る`;
  }
  if (f.kind === 'temple' || f.kind === 'altar') return `${SANCTUARIES.get(f.id).name}に入る`;
  if (f.used) return undefined;
  return { shrine: '祠で祈る', event: '調べる', landmark: '調べる', chest: '宝箱を開ける', tower: '見晴らしの塔に登る' }[f.kind];
}

/** 自動の確認用の見えない印: 「入る」ボタンが何に入るか（施設の種類と id。出現スポットは spawn と種類）。interactLabel と同じ物を見る */
function interactTarget(game: GameState, tile: number): { kind: string; id: string } | undefined {
  const f = game.world!.tiles[tile].f;
  if (f) return { kind: f.kind, id: f.id };
  const sp = spawnAt(game.world!, tile);
  return sp ? { kind: 'spawn', id: sp.kind } : undefined;
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
  // 狭い画面 回1: 低い画面（見えている高さ 640px 未満。data-low）では、上と下を細い形にして地図を広くする（情報は消さず、置き場所を変える）
  const low = useLowScreen();
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const continueStory = useBattle((s) => s.continueStory);
  const heldStories = useBattle((s) => s.heldStories);
  const w = game.world!;
  // 出す物語の窓: この端末でまだ押していない（ほかの人が閉じた）窓を先に、無ければ今の窓（点検 F6）
  const storyPage = heldStories[0] ?? w.story;
  const hero = game.heroes.find((h) => h.id === w.turn);
  const here = hero ? w.pos[hero.id] : undefined;
  const [selected, setSelected] = useState<number | undefined>();
  const [info, setInfo] = useState<string | undefined>();
  // 回1: 地図をそのマスへ動かす頼み（「次の目的」の行・扉が開かない時の「場所を見る」）と、扉が開かない時の知らせ
  const [focus, setFocus] = useState<{ tile: number; seq: number } | undefined>();
  const focusOn = (tile: number) => setFocus((f) => ({ tile, seq: (f?.seq ?? 0) + 1 }));
  const [gateNote, setGateNote] = useState<{ text: string; tile?: number } | undefined>();
  // 回1: 見取り図のボタンの最初の案内（この端末で1回だけ。出した時に覚えて、閉じるか手番が変わるまで出す）
  const hintSeen = useBattle((s) => s.settings.overviewHintSeen);
  const setSettings = useBattle((s) => s.setSettings);
  const [hintOn, setHintOn] = useState(false);
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
    setGateNote(undefined);
  }, [w.turn, w.move]);
  useEffect(() => {
    setHintOn(false);
  }, [w.turn]);

  // 移動のサイコロ: この画面を開いた後に新しく振った時だけ、真ん中で転がす（オンラインの仲間の画面でも）
  const moveDiceKey = w.moveDice ? `move:${game.seed}:${w.moveDice.seq}` : undefined;

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

  // 回1: 冒険の最初の自分の番に、見取り図の案内を1回だけ（物語・受け渡しの窓が閉じてから）
  const hintReady = !hintSeen && !!hero && here !== undefined && !turnExp && isLocalPlayer(hero.playerId) && !storyPage && !needHandoff && !movement;
  useEffect(() => {
    if (!hintReady) return;
    setHintOn(true);
    setSettings({ overviewHintSeen: true });
  }, [hintReady, setSettings]);

  if (!hero || here === undefined) return null;
  // 回1: 次の目的（方角は自分のキャラの場所から）
  const selfHero = isLocalPlayer(hero.playerId) ? hero : (game.heroes.find((h) => isLocalPlayer(h.playerId) && !h.retired && w.pos[h.id] !== undefined) ?? hero);
  const goal = guideGoal(game);
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
  const target = label ? interactTarget(game, here) : undefined;
  const chance = statChance(hero, 'agi', 'move');
  // 広い地図では、街道の上で振ると +1（段階6a。エンジンの rollMove と同じ足し方）
  const roadBonus = terrainDiceBonus(game, w, here);
  const diceBonus = [...worldDiceBonus(hero), ...roadBonus];
  const bonusSum = diceBonus.reduce((n, b) => n + b.value, 0);
  // 狭い画面 回2（C）: 凍て鐘の亡霊の悪さで、街道の +1 が無い時の知らせ（エンジンの文）。短い札は「❄街道 +1なし」、押すと全文
  const buried = roadBuriedNote(game, w, here);
  const buriedShort = buried ? /^❄ (.+?)が雪に埋もれている.*ボーナス (\+\d+) が無い/.exec(buried) : null;
  const avg = diceAverage(BALANCE.moveDiceSides, diceBonus);
  // フォーカスで振り直せるか（目を見た後・まだ動く前・1回だけ）
  const md = w.moveDice;
  const canReroll = mine && !!md && !md.rerolled && w.move === md.total && w.pos[hero.id] === w.prevTile && hero.focus >= 1;
  const ambush = campAmbushChance(game, hero.id);
  // 悪夢の魔獣（災厄の中ボス・段階7b）が生きている間は、野営のHPの回復が半分
  const nightmare = scourgesWith(game, 'campHeal')[0];
  const climate = climateAt(game, here);
  // 潮の札（シナリオ3の作り直し §3-1）。潮のマスの無い地図では undefined（何も出さない）
  const tide = tideStatus(w);
  // 温泉で温まっている間は、寒さの注意の代わりに「温まっている」と出す（暑さの注意はそのまま）
  const warm = warmthNote(game, hero.id);
  const onTown = w.tiles[here].f?.kind === 'town';
  const canCamp = !onTown && (w.move === null || w.move >= BALANCE.moveBase);
  const pid = hero.playerId;

  const tapTile = (i: number) => {
    // 回1の追加: 移動力が足りない施設を押した時（自分の番だけ）。届かない施設へ向かう道のうち、この番で行ける一番先のマスを選ぶ（動かすのは、今までどおり確かめてから）
    const place = w.tiles[i]?.seen && !!w.tiles[i].f && i !== here;
    if (mine && place && !reach?.has(i)) {
      if (w.move === null) {
        setSelected(undefined);
        setInfo(`${tileInfo(game, i, goal)} / サイコロを振ると、進める`);
        return;
      }
      if (w.move > 0) {
        const route = routeToward(w, here, i, w.move);
        if (!route) {
          setSelected(undefined);
          setInfo(`ここへは、回り道が要る（${tileInfo(game, i, goal)}）`);
          return;
        }
        if (route.stop === undefined) {
          setSelected(undefined);
          setInfo(`あと${route.total}マス。この番は、この道を進めない（${tileInfo(game, i, goal)}）`);
          return;
        }
        setSelected(route.stop);
        setInfo(`あと${route.total}マス。この番は、ここまで進める（${tileInfo(game, i, goal)}）`);
        return;
      }
    }
    if (mine && reach?.has(i) && i !== here) {
      if (selected === i) {
        // 選んだマスと説明は、移動の演出が終わるまで残す（パネルの高さが変わると地図の大きさが変わるため）。
        // 手番か移動力が変わった時に上の useEffect で消える。
        dispatchGame({ type: 'WORLD_MOVE', playerId: pid, heroId: hero.id, to: i, companions: chosenCompanions });
      } else {
        setSelected(i);
        setInfo(tileInfo(game, i, goal));
      }
    } else {
      setSelected(undefined);
      setInfo(tileInfo(game, i, goal));
    }
  };

  const scenario = getScenario(game.scenarioId);
  // 狭い画面 回1（低い画面だけ）: 下のパネルの部品
  const unfollow = mine && followingGroup(game, hero.id).length > 1;
  const doUnfollow = () => {
    dispatchGame({ type: 'WORLD_UNFOLLOW', playerId: pid, heroId: hero.id });
    setWithMe(Object.fromEntries(companions.map((h) => [h.id, false])));
  };
  const showCompanions = companions.length > 0 && (w.move === null || (w.move ?? 0) > 0);
  const climateText = climate && !(warm && climate.kind === 'cold') ? `${climate.kind === 'cold' ? '❄️ 寒さ' : '☀️ 暑さ'}で毎ターン体力が減る（野営すれば防げる。ただし回復は半分）` : undefined;
  const warmLeft = warm ? /あと(\d+)ターン/.exec(warm)?.[1] : undefined;
  // 短い札を押すと、全文をパネルのすぐ上の帯（マスの説明と同じ所）に出す。もう1度押すと消える
  const toggleInfo = (text: string) => setInfo((cur) => (cur === text ? undefined : text));
  const diceHint = w.move ? (selected !== undefined ? 'もう一度タップか下のボタンで決定' : 'マスの数字は使う移動力') : '移動力を使い切った';
  const campButton = (
    <button
      onClick={() => canCamp && dispatchGame({ type: 'WORLD_CAMP', playerId: pid, heroId: hero.id })}
      disabled={!canCamp}
      className={low ? 'btn btn-dark flex h-11 shrink-0 flex-col items-center justify-center rounded-lg px-2 text-[12px] leading-4 font-bold whitespace-nowrap' : 'btn btn-dark flex h-11 items-center justify-center gap-0.5 rounded-lg text-[12px] font-bold'}
      aria-label={low ? `野営する${ambush ? `（夜襲${ambush}%）` : ''}${nightmare ? '（災厄のせいで回復半分）' : ''}` : undefined}
      data-camp
    >
      {low ? (
        <>
          <span className="flex items-center gap-0.5"><Tent size={14} /> 野営{ambush ? `${ambush}%` : ''}</span>
          {nightmare && <span className="text-[12px] text-fuchsia-300" data-camp-scourge>💀回復半分</span>}
        </>
      ) : (
        <>
          <Tent size={15} /> 野営{ambush ? `${ambush}%` : ''}
          {nightmare && <span className="ml-0.5 text-[12px] text-fuchsia-300" data-camp-scourge>💀回復半分</span>}
        </>
      )}
    </button>
  );
  // 狭い画面 回2（C）: 街道ボーナスの札の場所（振るボタンのすぐ右）に出す、雪に埋もれた街道の短い札。押すと全文がパネルのすぐ上に出る（寒さ・温泉の札と同じ形）
  const buriedChip = buried && w.move === null && (
    <button
      onClick={() => toggleInfo(buried)}
      className={`btn flex shrink-0 flex-col items-center justify-center rounded-lg border border-sky-300/50 bg-sky-950/60 px-1.5 text-[12px] leading-4 font-bold whitespace-nowrap text-sky-200 ${low ? 'h-11' : 'h-12 min-w-14'}`}
      aria-label={buried}
      data-road-buried
    >
      <span>❄{buriedShort?.[1] ?? '街道'}</span>
      <span>{buriedShort?.[2] ?? '+1'}なし</span>
    </button>
  );
  const waitButton = (
    <button
      onClick={() => dispatchGame({ type: 'WORLD_WAIT', playerId: pid, heroId: hero.id })}
      className={low ? 'btn btn-dark h-11 min-w-11 shrink-0 rounded-lg px-2 text-[12px] leading-4 font-bold' : 'btn btn-dark h-11 rounded-lg text-[12px] font-bold'}
      data-world-wait={w.move === null ? 'wait' : 'end'}
    >
      {w.move === null ? '待機' : '手番を終える'}
    </button>
  );
  return (
    <Screen>
      <WorldTopBar game={game} scourgeInParty goalLine={goal && <GoalLine game={game} goal={goal} from={w.pos[selfHero.id] ?? here} onFocus={() => focusOn(goal.tile)} />} />
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
          goalTile={goal?.tile}
          focusRequest={focus}
          overviewHint={hintOn}
          onOverviewHintClose={() => setHintOn(false)}
        />
        {info && !playback && (
          <div className="pointer-events-none absolute inset-x-0 z-10 bg-black/75 py-1 pr-14 pl-3 text-[12px] leading-4 text-zinc-100" style={{ bottom: panelSize.height }} data-tile-info>
            {info}
          </div>
        )}
        {/* 回1: 扉が開かない時の知らせ（鍵のダンジョンの方角と地域。「場所を見る」で、そこへ地図を動かす）。
            操作パネルの高さを変えないように、地図の下の端（パネルのすぐ上）に重ねる。右の「戻る」のボタンは避ける */}
        {gateNote && !playback && (
          <div className="panel panel-gold-edge absolute left-2 right-[60px] z-30 flex items-center gap-1.5 rounded-xl p-1.5 text-[13px] leading-[18px]" style={{ bottom: panelSize.height + 6 }} role="alert" data-gate-note>
            <span className="min-w-0 flex-1">{gateNote.text}</span>
            <span className="flex shrink-0 flex-col gap-1">
              {gateNote.tile !== undefined && (
                <button onClick={() => focusOn(gateNote.tile!)} className="btn btn-gold h-11 rounded-lg px-2 text-[13px] font-bold" data-gate-look>
                  場所を見る
                </button>
              )}
              <button onClick={() => setGateNote(undefined)} className="btn btn-dark h-11 rounded-lg px-2 text-[13px] font-bold" data-gate-close>
                閉じる
              </button>
            </span>
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
      <div className="shrink-0 bg-sky-950 px-3 py-1 text-center text-[14px] font-bold low:hidden" data-current-turn>現在は {hero.playerId}（{hero.name}）の手番です</div>
      {/* 手番のキャラの操作 */}
      <div className="panel relative z-10 shrink-0 rounded-t-2xl px-3 pt-2 pb-3 low:pb-1.5">
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
            {/* 高さ700px以上の画面（と、次の目的が無い時）は、今までどおり地形と地域 */}
            <div className={`text-[12px] text-zinc-400 ${goal ? '[@media(max-height:699.98px)]:hidden low:hidden' : ''}`}>{getTerrain(w.tiles[here].t).name}・{scenario.map!.regions[w.tiles[here].r].name}</div>
            {/* 回1の追加: 高さ700px未満の画面は、この行に「次: 沈黙の地下墓所（東）」（押すと、そこへ地図が動く）。
                入りきらない時は、右の地形と地域から先に切る（それでも入らなければ、次の目的も …で切る） */}
            {goal && (
              <button
                onClick={() => focusOn(goal.tile)}
                // 押せる所は44pxの高さ（上の名前の行に重ねる。下のボタンには重ねない）。行の高さは変えない
                className="btn relative -mt-7 hidden min-h-11 w-full min-w-0 items-end gap-1 text-left text-[12px] leading-4 [@media(max-height:699.98px)]:flex low:flex"
                aria-label={`${goalLineText(game, goal, w.pos[selfHero.id] ?? here)}。押すと地図がその場所へ動きます`}
                data-goal-short={goal.dungeonId}
              >
                <Compass size={13} className="shrink-0 text-amber-300" />
                <span className="max-w-full shrink-0 truncate font-bold text-amber-200 underline decoration-amber-300/50 underline-offset-2" data-goal-short-text>{goalShortText(game, goal, w.pos[selfHero.id] ?? here)}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-400">・{getTerrain(w.tiles[here].t).name}・{scenario.map!.regions[w.tiles[here].r].name}</span>
              </button>
            )}
          </div>
          {/* 狭い画面 回1: 低い画面は、温泉・寒さを短い札に（押すと全文がパネルのすぐ上に出る。もう1度押すと消える） */}
          {low && warm && (
            <button onClick={() => toggleInfo(warm)} className="btn flex h-11 shrink-0 items-center rounded-lg border border-orange-300/50 bg-orange-950/60 px-1.5 text-[12px] leading-4 font-bold whitespace-nowrap text-orange-200" aria-label={warm} data-warmth-chip>
              ♨{warmLeft ? `あと${warmLeft}` : ''}
            </button>
          )}
          {/* 潮（シナリオ3の作り直し §3-1）: 低い画面は短い札（押すと全文がパネルのすぐ上に出る。寒さ・温泉の札と同じ形） */}
          {low && tide && (
            <button onClick={() => toggleInfo(tide.text)} className="btn flex h-11 shrink-0 flex-col items-center justify-center rounded-lg border border-cyan-300/50 bg-cyan-950/60 px-1.5 text-[12px] leading-4 font-bold whitespace-nowrap text-cyan-200" aria-label={tide.text} data-tide-chip={tide.tide}>
              <span>{tide.short[0]}</span>
              <span>{tide.short[1]}</span>
            </button>
          )}
          {low && climateText && (
            <button onClick={() => toggleInfo(climateText)} className="btn flex h-11 shrink-0 items-center rounded-lg border border-sky-300/50 bg-sky-950/60 px-1.5 text-[12px] leading-4 font-bold whitespace-nowrap text-sky-200" aria-label={climateText} data-climate-chip={climate!.kind}>
              {climate!.kind === 'cold' ? '❄️寒さ' : '☀️暑さ'}
            </button>
          )}
          {/* 狭い画面 回1: 低い画面は、振る前もここに「移動力 1〜6・平均3.5」（サイコロの説明の行を1行に収めるため） */}
          {w.move === null && low && (
            <div className="flex shrink-0 flex-col items-center rounded-lg bg-black/40 px-1.5 py-0.5 text-[12px] leading-[13px] whitespace-nowrap" data-dice-range>
              <span className="text-zinc-400">移動力</span>
              <b className="text-[14px] leading-4 text-amber-200 tabular-nums">{1 + bonusSum}〜{BALANCE.moveDiceSides + bonusSum}</b>
              <span className="text-zinc-400 tabular-nums">平均{avg.toFixed(1)}</span>
            </div>
          )}
          {w.move !== null && (
            <div className="flex shrink-0 flex-col items-center rounded-lg bg-black/40 px-2 py-0.5">
              <span className="text-[12px] text-zinc-400">移動力</span>
              <b className="font-display text-[22px] leading-6 text-amber-200 tabular-nums">{w.move}</b>
            </div>
          )}
        </div>

        {md && low && (
          // 狭い画面 回1: 低い画面は、サイコロの結果と説明を字だけの1行に（振り直しのボタンは下の1段へ）
          <div className="mt-0.5 flex min-h-[26px] items-center gap-2" data-dice-line>
            <DiceResult dice={md} unit="移動力" />
            <span className="ml-auto min-w-0 shrink text-right text-[12px] leading-4 text-zinc-300">{diceHint}</span>
          </div>
        )}
        {md && !low && (
          <div className="mt-1 flex items-center gap-2">
            <DiceResult dice={md} unit="移動力" />
            {canReroll ? (
              <button onClick={() => dispatchGame({ type: 'WORLD_REROLL_MOVE', playerId: pid, heroId: hero.id })} className="btn btn-dark ml-auto flex h-11 shrink-0 flex-col items-center justify-center rounded-lg px-2 text-[12px] leading-4 font-bold" data-reroll>
                <span className="flex items-center gap-0.5"><Star size={11} className="fill-amber-400/70 text-amber-300" />1で</span>振り直す
              </button>
            ) : (
              <span className="ml-auto max-w-[45%] shrink-0 text-right text-[12px] leading-4 text-zinc-300">{w.move ? (selected !== undefined ? 'もう一度タップか下のボタンで決定' : 'マスの数字は使う移動力') : '移動力を使い切った'}</span>
            )}
          </div>
        )}

        {unfollow && !(low && showCompanions) && <button className="btn btn-dark my-1 min-h-11 w-full rounded-lg text-[13px] low:my-0.5" onClick={doUnfollow} data-unfollow>同行を解除して単独行動する</button>}
        {showCompanions && (
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
                    data-companion={c.id}
                    data-invite={st}
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
                  data-companion={c.id}
                  className={`btn relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'sel-on' : 'border-white/10 bg-black/30'}`}
                >
                  <HeroFace hero={c} size={34} dim={!on} />
                  {on && <span className="absolute -right-1 -bottom-1 rounded-full bg-amber-300 px-1 text-[12px] leading-4 font-black text-black">✓</span>}
                </button>
              );
            })}
            <span className="truncate text-[12px] text-zinc-500">{companions.some((c) => !ownMate(c)) ? '他の人のキャラは誘って承知してもらう' : 'タップで一緒に行くか選ぶ'}</span>
            {/* 狭い画面 回1: 低い画面は「同行を解除」をこの行の右に（字は2行に折り返す。全文のまま） */}
            {low && unfollow && (
              <button className="btn btn-dark ml-auto flex h-11 w-[104px] shrink-0 items-center justify-center rounded-lg px-1 text-[12px] leading-4" onClick={doUnfollow} data-unfollow>
                同行を解除して単独行動する
              </button>
            )}
          </div>
        )}

        {/* その場の施設に入る（省略せずに全文で、広いボタン） */}
        {label && (
            <button
              onClick={() => {
                // 回1: 鍵が足りなくて扉が開かない時は、地図の上に知らせを出す（「場所を見る」で、鍵のダンジョンへ地図を動かす）。
                // エンジンも同じ理由で断るので、送らずに知らせだけ出す
                const f = w.tiles[here].f;
                const def = f?.kind === 'dungeon' ? DUNGEONS.get(f.id) : undefined;
                const gate = def && !def.random ? dungeonGateError(game, def, here) : undefined;
                if (gate) {
                  const missing = def!.requiresKeys?.find((k) => !w.keys.includes(k));
                  const keyDungeon = missing && !def!.finale ? DUNGEONS.forScenario(game.scenarioId).find((d) => d.rewardKey === missing) : undefined;
                  const keyTile = keyDungeon ? dungeonTile(w, keyDungeon.id) : -1;
                  setGateNote({ text: gate, tile: keyTile >= 0 ? keyTile : undefined });
                  return;
                }
                dispatchGame({ type: 'WORLD_INTERACT', playerId: pid, heroId: hero.id, party: [hero.id, ...chosenCompanions] });
              }}
              className="btn btn-dark font-display mt-1.5 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-[16px] leading-5 text-amber-100 shadow-[0_0_12px_rgba(255,200,90,.35)] low:mt-1 low:min-h-11"
              data-interact
              data-interact-kind={target?.kind}
              data-interact-id={target?.id}
            >
              {label}
            </button>
          )}
        {w.move === null && low && (
          // 狭い画面 回1: 低い画面は、サイコロの説明を1行に（移動力の幅と平均は名前の行の右。入らない時だけ折り返す。省かない）
          <div className="mt-1 text-center text-[12px] leading-4 text-zinc-300" data-dice-preview>
            {diceBonus.length ? <b className="text-sky-200">サイコロ{bonusText({ bonus: diceBonus } as never)}</b> : `素早さ${chance}%: ボーナスなし`}・<Star size={12} className="inline fill-amber-400/70 text-amber-300" />1で1回振り直せる
          </div>
        )}
        {w.move === null && !low && (
          <div className="mt-1.5 flex flex-col items-center leading-4" data-dice-preview>
            <span className="text-[12px] text-zinc-300">
              サイコロ1つ{diceBonus.length ? <b className="text-sky-200">{bonusText({ bonus: diceBonus } as never)}</b> : `（素早さ${chance}%: ボーナスなし）`}
            </span>
            <span className="text-[12px] text-zinc-400">
              移動力 {1 + bonusSum}〜{BALANCE.moveDiceSides + bonusSum}（平均{avg.toFixed(1)}）・フォーカス1で1回振り直せる
            </span>
          </div>
        )}

        {low && (
          // 狭い画面 回1: 低い画面は、助け起こす（あれば）＋ ボタン1段（振る／行き先・★振り直す・野営・待機／手番を終える）
          <div className="mt-1 flex flex-col gap-1" data-low-actions>
            {Object.entries(w.downed ?? {})
              .filter(([, t]) => t === w.pos[hero.id])
              .map(([id]) => {
                const d = game.heroes.find((x) => x.id === id);
                return d ? (
                  <button
                    key={id}
                    onClick={() => dispatchGame({ type: 'WORLD_REVIVE', playerId: pid, heroId: hero.id, targetId: id })}
                    className="btn btn-gold flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-bold"
                    data-revive={id}
                  >
                    <HeroFace hero={d} size={28} dim /> {d.name}を助け起こす（手番を使う）
                  </button>
                ) : null;
              })}
            <div className="flex gap-1.5">
              {w.move === null ? (
                <button
                  onClick={() => dispatchGame({ type: 'WORLD_ROLL_MOVE', playerId: pid, heroId: hero.id })}
                  className="btn btn-gold font-display flex h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-xl leading-5"
                  data-roll-move
                >
                  <span className="flex items-center gap-1 text-[17px] whitespace-nowrap"><Dices size={19} /> サイコロを振る</span>
                  {roadBonus.length > 0 && <span className="rounded-full bg-black/25 px-2 text-[12px] leading-4" data-road-bonus>{roadBonus.map((b) => `${b.label}ボーナス +${b.value}`).join('・')}</span>}
                </button>
              ) : selected !== undefined ? (
                <button onClick={() => tapTile(selected)} className="btn btn-gold font-display h-11 min-w-0 flex-1 rounded-xl px-1.5 text-[13px] leading-4" data-move-go>
                  {moveButtonText(reach?.get(selected), path?.length)}
                </button>
              ) : (w.move ?? 0) > 0 && mine ? (
                <button disabled className="btn btn-dark h-11 min-w-0 flex-1 rounded-xl px-1.5 text-[12px] leading-4 font-bold disabled:opacity-60" data-move-placeholder>
                  光るマスをタップして行き先を選ぶ
                </button>
              ) : null}
              {buriedChip}
              {canReroll && (
                <button onClick={() => dispatchGame({ type: 'WORLD_REROLL_MOVE', playerId: pid, heroId: hero.id })} className="btn btn-dark flex h-11 shrink-0 flex-col items-center justify-center rounded-lg px-1.5 text-[12px] leading-4 font-bold" data-reroll>
                  <span className="flex items-center gap-0.5"><Star size={11} className="fill-amber-400/70 text-amber-300" />1で</span>振り直す
                </button>
              )}
              {campButton}
              {waitButton}
            </div>
          </div>
        )}
        {!low && (
        <div className="mt-2 flex flex-col gap-1.5">
          {w.move === null ? (
            <div className="flex gap-1.5">
            <button
              onClick={() => dispatchGame({ type: 'WORLD_ROLL_MOVE', playerId: pid, heroId: hero.id })}
              className="btn btn-gold font-display flex h-12 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl text-[18px]"
              data-roll-move
            >
              <Dices size={20} /> サイコロを振る
              {roadBonus.length > 0 && <span className="ml-1 rounded-full bg-black/25 px-2 text-[13px] leading-6" data-road-bonus>{roadBonus.map((b) => `${b.label}ボーナス +${b.value}`).join('・')}</span>}
            </button>
            {buriedChip}
            </div>
          ) : selected !== undefined ? (
            <button onClick={() => tapTile(selected)} className="btn btn-gold font-display h-12 rounded-xl text-[17px] leading-5" data-move-go>
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
                  data-revive={id}
                >
                  <HeroFace hero={d} size={30} dim /> {d.name}を助け起こす（手番を使う）
                </button>
              ) : null;
            })}
          {warm && (
            <p className="text-[12px] leading-4 text-orange-200" data-warmth-note>
              {warm}
            </p>
          )}
          {tide && (
            <p className="text-[12px] leading-4 text-cyan-200" data-tide-note={tide.tide}>
              {tide.text}
            </p>
          )}
          {climate && !(warm && climate.kind === 'cold') && (
            <p className="text-[12px] leading-4 text-sky-200" data-climate-note>
              {climate.kind === 'cold' ? '❄️ 寒さ' : '☀️ 暑さ'}で毎ターン体力が減る（野営すれば防げる。ただし回復は半分）
            </p>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {campButton}
            {waitButton}
          </div>
        </div>
        )}
      </div>
      </div>
      </div>
      </div>

      <DiceOverlay dice={w.moveDice} diceKey={moveDiceKey} title={`${hero.name}の移動のサイコロ`} />
      {/* 移動の演出中は、上の情報欄・仲間の列・地図のタップも受け付けない（以前の移動画面と同じ） */}
      {movement && <div className="absolute inset-0 z-30" aria-hidden data-move-blocker />}
      <AnimatePresence>
        {/* 点検 F6: ほかの人の「つづける」で閉じた窓は、この端末で押すまで先に出す（heldStories。オンラインだけ） */}
        {storyPage && <StoryOverlay key="story" title={storyPage.title} lines={storyPage.lines} onNext={() => continueStory(pid)} />}
        {!storyPage && needHandoff && (
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
