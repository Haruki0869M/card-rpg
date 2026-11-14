// ===== 宝箱・イベント・休憩の画面 =====
import { ItemInfoArea } from '../ItemDetail';
import { VoteChips, VoteStatus } from '../ui/Votes';
import { motion } from 'framer-motion';
import { ArrowUpCircle, Coins, Flame, Hammer, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { BattleBackground } from '../../art';
import { BALANCE, TIMING } from '../../data/balance';
import { EVENTS } from '../../data/events';
import { getItem } from '../../data/items';
import { canHoneCards, challengeFocusMax, currentVote, eventChallenger, eventChallengers, eventOptionState, eventPayer, eventShared, heroFocusMax, heroMaxHp, statChance, sceneBackground, sceneHeroes, voters } from '../../engine';
import { PLAYER_COLOR } from '../../data/theme';
import { useOnline } from '../../store/onlineStore';
import { STAT_LABEL } from '../../data/terms';
import { LOCAL_PLAYER, isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { EventOption, Hero, Loot, PlayerId } from '../../types';
import { chanceAtLeast, CheckPanel, RollStrip } from '../ui/CheckPanel';
import { Crest, HeroFace, ItemIcon, itemSummary, RARITY_STYLE, Screen } from '../ui/game';
import { canChangeNow } from '../JobSheet';
import { PetToken } from '../ui/PetToken';
import { PartyBar } from '../ui/PartyBar';
import { TURN_LOCK_RATIO } from '../ui/TurnLock';
import { showTurnLock } from './worldTurnGate';

/** 判定に一番向いている、この端末のキャラ */
function bestHero(heroes: Hero[], score: (h: Hero) => number): string {
  const mine = heroes.filter((h) => h.hp > 0 && isLocalPlayer(h.playerId));
  return [...mine].sort((a, b) => score(b) - score(a))[0]?.id ?? heroes[0].id;
}

export function LootList({ loot }: { loot: Loot[] }) {
  const game = useBattle((s) => s.game)!;
  const localHero = game.heroes.find((h) => isLocalPlayer(h.playerId) && !h.retired)?.id;
  return (
    <div className="flex flex-col gap-1">
      {loot.map((l, i) => {
        if (l.kind === 'gold')
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="flex items-center gap-2 rounded-lg bg-black/30 p-1.5 text-[14px]">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-amber-300 bg-amber-900/40">
                <Coins size={24} className="text-amber-300" />
              </span>
              <b className="text-amber-200">{l.amount} ゴールド</b>
              {l.to && <span className="text-[12px] text-zinc-400">{l.to.length > 1 ? `${l.to.length}人で山分け` : `→ ${game.heroes.find((x) => x.id === l.to![0])?.name}`}</span>}
            </motion.div>
          );
        if (l.kind === 'card') {
          const h = game.heroes.find((x) => x.id === l.heroId);
          return (
            <div key={i} className="rounded-lg bg-black/30 p-1.5 text-[13px]">
              {h?.name}の山札にカードが加わった
            </div>
          );
        }
        const def = getItem(l.item.itemId);
        const r = RARITY_STYLE[def.rarity];
        return (
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="flex rounded-lg bg-black/30 p-1.5">
            {/* 受け取ったキャラ（分からなければこの端末のキャラ）の今の装備と比べる */}
            <ItemInfoArea itemId={def.id} heroId={l.to ?? localHero} className="flex flex-1 items-center gap-2">
              <ItemIcon item={def} size={44} />
              <span className="min-w-0 flex-1 leading-4">
                <span className="block text-[14px] font-bold" style={{ color: r.color }}>
                  {/* ランダムダンジョンの専用の装備（段階7a）: 黄金箱と闇商人でしか手に入らない */}
                  {def.source && <span className="mr-1 rounded bg-amber-500/80 px-1 text-[12px] text-black" data-exclusive-tag>✨専用</span>}
                  {def.name} <span className="text-[12px] font-normal opacity-80">{r.name}</span>
                </span>
                {l.to && <span className="block text-[12px] text-sky-200">→ {game.heroes.find((x) => x.id === l.to)?.name}が受け取った</span>}
                <span className="block truncate text-[12px] text-zinc-300">{itemSummary(def)}</span>
              </span>
            </ItemInfoArea>
          </motion.div>
        );
      })}
    </div>
  );
}

/** 席の名前（オンラインの部屋の名前。無ければ P1 など） */
const seatLabel = (p: PlayerId) => useOnline.getState().room?.seatName(p) ?? p;

/** 選択肢の成功率（キャラ・フォーカスの数で） */
function optionPct(h: Hero, c: NonNullable<EventOption['check']>, focus = 0): number {
  return Math.round(chanceAtLeast(c.slots, focus, statChance(h, c.stat, c.tag, true), c.need) * 100);
}

export function EventScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  useOnline((s) => s.tick);
  const ev = game.event!;
  const def = EVENTS.get(ev.eventId);
  // 2人以上（ダンジョンの中）: 2段階の合意（選ぶ段 → 挑む段。実機の不具合① 2026-11-14・案A）。1人・世界マップのマスは今までどおり
  const shared = eventShared(game);
  // 選んだ番号は、この場面（イベント）の物だけ使う（次のイベントで前のパネルが出たままにならない）
  const sceneKey = `${ev.eventId}:${ev.roomId ?? ''}:${ev.tile ?? ''}`;
  const [pick, setPick] = useState<{ key: string; index: number } | null>(null);
  const chosen = !shared && pick?.key === sceneKey ? pick.index : null;
  const opt = chosen !== null ? def.options[chosen] : undefined;
  const candidates = sceneHeroes(game).filter(h => !game.world || game.activeScene || ev.tile === undefined || h.id === game.world.turn);
  const [heroId, setHeroId] = useState(candidates[0].id);
  const [focus, setFocus] = useState(0);

  // みんなで決める時の、この端末の席の票
  const myVoters = shared ? voters(game).filter((p) => isLocalPlayer(p)) : [];
  const vote = currentVote(game);
  const myPick = myVoters.map((p) => vote?.picks[p]).find((c) => c?.type === 'CHOOSE_EVENT');
  const myIndex = myPick?.type === 'CHOOSE_EVENT' ? myPick.optionIndex : null;

  const choose = (i: number) => {
    const o = def.options[i];
    if (shared) {
      // 選ぶ段: 押すとすぐ1票（判定つきでもパネルは開かない）。自分が入れた選択肢をもう一度押すと取り消し
      if (myIndex === i) for (const p of myVoters) dispatchGame({ type: 'VOTE', playerId: p, command: null });
      else dispatchGame({ type: 'CHOOSE_EVENT', playerId: LOCAL_PLAYER, optionIndex: i, focusUsed: 0 });
      return;
    }
    if (o.check) {
      setPick({ key: sceneKey, index: i });
      setHeroId(bestHero(candidates, (h) => statChance(h, o.check!.stat, o.check!.tag, true)));
      setFocus(0);
    } else dispatchGame({ type: 'CHOOSE_EVENT', playerId: LOCAL_PLAYER, optionIndex: i, focusUsed: 0 });
  };

  // 選択肢の成功率（フォーカス0の時）。行動の前に確率が見えるように（spec §2.1）。
  // みんなで決める時は、実際に挑む役（場面の全員の中でいちばん得意なキャラ）の数字（点検 憲章3）
  const optionChance = (i: number) => {
    const c = def.options[i].check;
    if (!c) return null;
    const h = shared ? eventChallengers(game, i)[0] : candidates.find((x) => x.id === bestHero(candidates, (y) => statChance(y, c.stat, c.tag, true)));
    if (!h) return null;
    return { stat: STAT_LABEL[c.stat], pct: optionPct(h, c), hero: h };
  };
  const options = (
    <div className="mt-3 flex flex-col gap-2">
      <VoteStatus />
      {def.options.map((o, i) => {
        const st = eventOptionState(game, ev.eventId, i);
        if (!st.visible) return null;
        const ch = optionChance(i);
        const mine = myIndex === i;
        const payer = shared ? eventPayer(game, i) : undefined;
        return (
          <button
            key={i}
            disabled={!!st.reason}
            onClick={() => choose(i)}
            aria-pressed={shared ? mine : undefined}
            data-event-option={i}
            data-my-vote={mine ? 1 : undefined}
            className={`btn flex min-h-12 items-center gap-2 rounded-xl px-3 py-1 text-left ${mine ? 'border-2 border-amber-300 bg-amber-950/60 shadow-[0_0_10px_rgba(255,200,80,.35)]' : o.requiresTag ? 'border border-sky-300/60 bg-sky-950/60' : 'btn-dark'}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-5 font-bold">
                {o.label}
                <VoteChips cmd={{ type: 'CHOOSE_EVENT', playerId: LOCAL_PLAYER, optionIndex: i, focusUsed: 0 }} />
              </span>
              {(o.cost || o.costFocus || o.costItem) && (
                <span className="block text-[12px] text-amber-300">
                  {[o.cost && `${o.cost}G`, o.costFocus && `フォーカス${o.costFocus}`, o.costItem && getItem(o.costItem).name].filter(Boolean).join('・')}を払う
                  {payer && <span className="text-zinc-300">（{payer.name}が払う）</span>}
                  {shared && o.check && ch && <span className="text-zinc-300">（挑む{ch.hero.name}が払う）</span>}
                </span>
              )}
              {shared && o.check && ch && !(o.cost || o.costFocus || o.costItem) && <span className="block text-[12px] text-zinc-400">挑む役：{ch.hero.name}</span>}
              {mine && <span className="block text-[12px] font-bold text-amber-200" data-my-vote-note>✓ あなたが選択中（もう一度押すと取り消し）</span>}
              {st.reason && <span className="block text-[12px] text-red-300">{st.reason}</span>}
            </span>
            {ch && (
              <span className="flex shrink-0 flex-col items-end leading-4" data-option-chance={ch.pct}>
                <span className="text-[12px] text-zinc-400">{ch.stat}</span>
                <b className={`text-[16px] tabular-nums ${ch.pct >= 70 ? 'text-emerald-300' : ch.pct >= 40 ? 'text-amber-200' : 'text-red-300'}`}>{ch.pct}%</b>
              </span>
            )}
          </button>
        );
      })}
      {def.options.some((o) => o.check) && (
        <div className="text-[12px] leading-4 text-zinc-500">
          {shared
            ? '％はいちばん得意なキャラ（挑む役）・フォーカス0の時。選択肢が決まると、挑む役の人がフォーカスを決めます'
            : '％は一番得意なキャラ・フォーカス0の時。選ぶとキャラとフォーカスを変えられます'}
        </div>
      )}
    </div>
  );

  const challenge = shared && !!ev.decided && !ev.result;

  return (
    <Screen>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-4" data-event-scroll>
        <BattleBackground kind={sceneBackground(game)} className="absolute inset-0 h-full w-full opacity-30" />
        {/* 突発イベント: 「！」の短いカットイン（TIMING.eventBang） */}
        {ev.random && !ev.result && (
          <motion.div
            initial={{ opacity: 1, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: TIMING.eventBang, ease: 'easeOut' }}
            className="font-display text-outline pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[96px] text-amber-300"
            aria-hidden
          >
            ！
          </motion.div>
        )}
        {/* イベントの窓: 絵・本文・選択肢（または結果）を中央の1枚にまとめる */}
        {/* 突発イベントは「！」のカットインが消えてから窓を出す（「！」と窓を重ねない） */}
        {/* 縦の中央寄せは my-auto で（justify-center だと、低い画面で上がはみ出した時にスクロールで戻れない） */}
        <motion.div
          initial={ev.random && !ev.result ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: TIMING.eventBang, duration: TIMING.eventWindowIn }}
          className="panel panel-ornate relative my-auto rounded-2xl p-3 pt-4"
          data-event-window
        >
          <Crest />
          <div className="flex items-center gap-2">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-sky-300 bg-sky-950/60 shadow-[0_0_10px_rgba(120,200,255,.35)]">
              <Sparkles size={26} className="text-sky-200" />
            </span>
            <div className="font-display text-outline text-[22px] leading-7 text-amber-100">
              {ev.random && <span className="mr-1 rounded-full bg-amber-500 px-1.5 align-middle text-[12px] text-black">突発</span>}
              {def.title}
            </div>
          </div>
          <div className="mt-2 rounded-xl bg-black/35 p-2.5 text-[15px] leading-6">{def.text}</div>
          {ev.result ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-col items-center gap-2">
              {ev.result.results && <RollStrip results={ev.result.results} />}
              <div className={`text-center text-[15px] font-bold ${ev.result.success ? 'text-emerald-300' : 'text-red-300'}`}>{ev.result.text}</div>
              {ev.result.loot.length > 0 && (
                <div className="w-full">
                  <LootList loot={ev.result.loot} />
                </div>
              )}
            </motion.div>
          ) : challenge ? (
            <div className="mt-3 rounded-xl border border-amber-300/50 bg-black/40 px-3 py-2 text-[14px] text-amber-100" data-event-decided>
              みんなで決めた選択肢：<b>「{def.options[ev.decided!.optionIndex]?.label}」</b>
            </div>
          ) : (
            !opt?.check && options
          )}
        </motion.div>
      </div>
      {(ev.result || opt?.check || challenge) && (
        // 低い画面（390×540）でもボタンが全部押せるよう、はみ出したら下のパネルの中をスクロール
        <div className="panel max-h-[70%] shrink-0 overflow-y-auto overscroll-contain rounded-t-2xl px-3 pt-2 pb-3" data-event-panel>
          {ev.result && <VoteStatus className="mb-2" />}
          {ev.result ? (
            <button onClick={() => dispatchGame({ type: 'FINISH_EVENT', playerId: LOCAL_PLAYER })} className="btn btn-gold font-display h-12 w-full rounded-xl text-[18px]">
              {ev.battle ? '戦闘を始める' : '先へ進む'}
              <VoteChips cmd={{ type: 'FINISH_EVENT', playerId: LOCAL_PLAYER }} />
            </button>
          ) : challenge ? (
            <ChallengePanel />
          ) : (
            opt?.check && (
              <>
                <div className="font-display mb-1 text-[16px] text-amber-100">「{opt.label}」</div>
                <CheckPanel
                  heroes={candidates}
                  heroId={heroId}
                  setHeroId={setHeroId}
                  focus={focus}
                  setFocus={setFocus}
                  stat={opt.check.stat}
                  tag={opt.check.tag}
                  slots={opt.check.slots}
                  need={opt.check.need}
                  successLabel="成功"
                  event
                />
                <div className="mt-2 grid grid-cols-[1fr_2fr] gap-2">
                  <button onClick={() => setPick(null)} className="btn btn-dark h-12 rounded-xl text-[14px] font-bold">
                    戻る
                  </button>
                  <button
                    onClick={() => dispatchGame({ type: 'CHOOSE_EVENT', playerId: LOCAL_PLAYER, optionIndex: chosen!, heroId, focusUsed: focus })}
                    className="btn btn-gold font-display h-12 rounded-xl text-[18px]"
                  >
                    挑戦する
                  </button>
                </div>
              </>
            )
          )}
        </div>
      )}
      {/* 装備・道具（扉を選ぶ画面と同じ帯）。投票中・挑む段・待ちの間も押せる。開いて閉じても、票・フォーカスの指定はそのまま。
          世界マップのマスで手番でない時は、下の「〇〇さんが選んでいます」の覆いの上に出す（覆いに重ねない） */}
      <PartyBar heroes={sceneHeroes(game)} style={showTurnLock(game, isLocalPlayer) ? { marginBottom: `calc(var(--app-h, 100dvh) * ${TURN_LOCK_RATIO})` } : undefined} />
    </Screen>
  );
}

/**
 * 挑む段（2人以上。実機の不具合① 2026-11-14・案A）: 挑む役・成功率・フォーカスを全員の画面に出す。
 * 挑む役の持ち主の画面だけ、フォーカスを決めて「挑戦する」・「任せる」・「選び直す」。ほかの人には「○○さんが、△△のフォーカスを決めています」。
 * 3つの操作は、どれも heroId = 今の挑む役で送る（1台で2人・代わりに操作でも、挑む役の持ち主として送られる。点検 F1）
 */
function ChallengePanel() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const ev = game.event!;
  const d = ev.decided!;
  const opt = EVENTS.get(ev.eventId).options[d.optionIndex];
  const who = eventChallenger(game);
  // フォーカスの指定は、挑む役ごとに覚える（相手の操作で画面が書き直されても、勝手に0に戻らない）
  const [sel, setSel] = useState<{ key: string; n: number } | null>(null);
  const key = `${ev.eventId}:${ev.roomId ?? ''}:${d.optionIndex}:${who?.id ?? ''}`;
  if (!opt?.check) return null;
  if (!who) {
    return (
      <div className="flex flex-col gap-2" data-challenge-none>
        <div className="font-display text-[16px] text-amber-100">「{opt.label}」</div>
        <div className="rounded-lg bg-black/35 p-2 text-[13px] text-zinc-200">挑めるキャラがいません。選択肢を選び直してください</div>
        <button onClick={() => dispatchGame({ type: 'EVENT_RECHOOSE', playerId: LOCAL_PLAYER })} className="btn btn-dark h-12 rounded-xl text-[14px] font-bold" data-challenge-rechoose>
          選び直す
        </button>
      </div>
    );
  }
  const c = opt.check;
  const max = challengeFocusMax(who, opt);
  const focus = Math.min(sel?.key === key ? sel.n : 0, max);
  const setFocus = (n: number) => setSel({ key, n: Math.max(0, Math.min(max, n)) });
  const mine = isLocalPlayer(who.playerId);
  const others = eventChallengers(game, d.optionIndex).filter((h) => h.id !== who.id);
  return (
    <div className="flex flex-col gap-1.5" data-challenge data-challenge-hero={who.id} data-challenge-mine={mine ? 1 : 0}>
      <div className="font-display text-[16px] text-amber-100">「{opt.label}」に挑む</div>
      <div className="flex items-center gap-2 rounded-lg bg-black/35 p-1.5 text-[13px]">
        <HeroFace hero={who} size={32} />
        <span className="min-w-0 flex-1 leading-5">
          <span className="rounded px-1 text-[12px] font-bold text-black" style={{ background: PLAYER_COLOR[who.playerId] }}>
            {who.playerId}
          </span>{' '}
          挑む役：<b>{who.name}</b>
          <span className="block text-[12px] text-zinc-300">
            {STAT_LABEL[c.stat]}の判定・フォーカス残り{who.focus}・成功率（フォーカス0）<b className="tabular-nums">{optionPct(who, c)}%</b>
          </span>
        </span>
      </div>
      {mine ? (
        <>
          <CheckPanel heroes={[who]} heroId={who.id} setHeroId={() => {}} focus={focus} setFocus={setFocus} stat={c.stat} tag={c.tag} slots={c.slots} need={c.need} successLabel="成功" event />
          <div className="mt-1 grid grid-cols-[1fr_2fr] gap-2">
            <button onClick={() => dispatchGame({ type: 'EVENT_RECHOOSE', playerId: LOCAL_PLAYER, heroId: who.id })} className="btn btn-dark h-12 rounded-xl text-[14px] font-bold" data-challenge-rechoose>
              選び直す
            </button>
            <button
              onClick={() => dispatchGame({ type: 'EVENT_CHALLENGE', playerId: LOCAL_PLAYER, heroId: who.id, focusUsed: focus })}
              className="btn btn-gold font-display h-12 rounded-xl text-[18px]"
              data-challenge-go
            >
              挑戦する
            </button>
          </div>
          {others.length > 0 && (
            <div className="mt-1 flex flex-col gap-1" data-challenge-handover>
              <div className="text-[12px] text-zinc-400">ほかのキャラに任せる（％はフォーカス0の時）</div>
              <div className="flex flex-wrap gap-1">
                {others.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => dispatchGame({ type: 'EVENT_HANDOVER', playerId: LOCAL_PLAYER, heroId: who.id, toHeroId: h.id })}
                    className="btn btn-dark flex h-11 items-center gap-1 rounded-lg px-2 text-[12px] font-bold"
                    data-challenge-to={h.id}
                  >
                    <span className="rounded px-1 text-[12px] text-black" style={{ background: PLAYER_COLOR[h.playerId] }}>
                      {h.playerId}
                    </span>
                    {h.name}に任せる（{optionPct(h, c)}%）
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-sky-300/50 bg-black/60 px-3 py-2 text-center text-[13px] text-sky-50" data-challenge-wait>
          {seatLabel(who.playerId)}さんが、{who.name}のフォーカスを決めています
        </div>
      )}
    </div>
  );
}

export function RestScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);
  const party = sceneHeroes(game);
  const hpFull = party.every((h) => h.hp >= heroMaxHp(h));
  const focusFull = party.every((h) => h.focus >= heroFocusMax(h));
  const canHone = party.some(canHoneCards);
  return (
    <Screen>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <BattleBackground kind={sceneBackground(game)} className="absolute inset-0 h-full w-full opacity-40" />
        <div className="relative flex flex-col items-center px-3 pt-6">
          <motion.span
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="flex h-24 w-24 items-center justify-center rounded-full"
            style={{ background: 'radial-gradient(closest-side,rgba(255,170,80,.65),transparent)' }}
          >
            <Flame size={56} className="text-amber-300" />
          </motion.span>
          <div className="font-display text-outline mt-2 text-[26px] text-amber-100">休憩所</div>
          <div className="text-[13px] text-zinc-300">焚き火の前で、ひと息つける。3つから1つを選ぼう。</div>
          <div className="mt-4 flex w-full flex-col gap-2">
            {sceneHeroes(game).map((h) => (
              <div key={h.id} className="panel flex items-center gap-2 rounded-lg p-1.5 text-[13px]">
                <HeroFace hero={h} size={32} dim={h.hp <= 0} />
                <span className="w-16 truncate font-bold">{h.name}</span>
                <span className="flex-1 tabular-nums">
                  HP {h.hp}/{heroMaxHp(h)}
                  <span className="text-emerald-300"> → {Math.min(heroMaxHp(h), h.hp + Math.ceil(heroMaxHp(h) * BALANCE.restHpRatio))}</span>
                </span>
                <span className="flex items-center gap-0.5 tabular-nums text-amber-300">
                  <Star size={13} />
                  {h.focus}/{heroFocusMax(h)}
                </span>
                {h.pet && isLocalPlayer(h.playerId) && (
                  <button onClick={() => dispatchGame({ type: 'PET_PAT', playerId: h.playerId, heroId: h.id })} className="btn btn-dark flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-1.5 text-[12px] font-bold text-pink-100" aria-label={`${h.pet.name}を撫でる`}>
                    <PetToken ownerId={h.id} pet={h.pet} size={20} />
                    {h.pet.patted ? '' : '+1'}
                  </button>
                )}
                {canChangeNow(game, h) && (
                  <button onClick={() => openSheet('jobs')} className="btn btn-gold flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-2 text-[12px] font-bold">
                    <ArrowUpCircle size={14} />
                    転職
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* 休憩の3択（みんなで1つ選ぶ）。HP・フォーカスが満タンの時は、その選択肢を薄くして「満タン」と出す（押すことはできる） */}
      <div className="grid shrink-0 grid-cols-3 gap-1.5 px-2 pt-2 pb-3" data-rest-choices>
        <VoteStatus className="col-span-3" />
        <button onClick={() => dispatchGame({ type: 'REST', playerId: LOCAL_PLAYER, kind: 'hp' })} className={`btn btn-gold flex min-h-16 min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1 ${hpFull ? 'opacity-55' : ''}`} data-rest="hp" data-rest-full={hpFull ? '' : undefined}>
          <span className="font-display text-[17px]">
            休む
            <VoteChips cmd={{ type: 'REST', playerId: LOCAL_PLAYER, kind: 'hp' }} />
          </span>
          <span className="text-center text-[12px] leading-4">{hpFull ? '全員のHPは満タン' : `全員のHPを${Math.round(BALANCE.restHpRatio * 100)}%回復`}</span>
        </button>
        <button onClick={() => dispatchGame({ type: 'REST', playerId: LOCAL_PLAYER, kind: 'focus' })} className={`btn btn-dark flex min-h-16 min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1 ${focusFull ? 'opacity-55' : ''}`} data-rest="focus" data-rest-full={focusFull ? '' : undefined}>
          <span className="font-display text-[17px] text-amber-200">
            瞑想する
            <VoteChips cmd={{ type: 'REST', playerId: LOCAL_PLAYER, kind: 'focus' }} />
          </span>
          <span className="text-center text-[12px] leading-4">{focusFull ? '全員のフォーカスは満タン' : `全員のフォーカス+${BALANCE.restFocus}`}</span>
        </button>
        <button onClick={() => dispatchGame({ type: 'REST', playerId: LOCAL_PLAYER, kind: 'upgrade' })} disabled={!canHone} className="btn btn-dark flex min-h-16 min-w-0 flex-col items-center justify-center rounded-xl border border-sky-300/50 px-1 py-1 disabled:opacity-40" data-rest="upgrade">
          <span className="font-display flex items-center gap-0.5 text-[17px] text-sky-100">
            <Hammer size={15} className="shrink-0" />
            技を磨く
            <VoteChips cmd={{ type: 'REST', playerId: LOCAL_PLAYER, kind: 'upgrade' }} />
          </span>
          <span className="text-center text-[12px] leading-4">{canHone ? '1人1枚、カードを＋に強化' : '磨けるカードが無い'}</span>
        </button>
      </div>
    </Screen>
  );
}
