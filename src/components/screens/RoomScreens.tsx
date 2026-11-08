// ===== 宝箱・イベント・休憩の画面 =====
import { VoteChips } from '../ui/Votes';
import { motion } from 'framer-motion';
import { ArrowUpCircle, Coins, Flame, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { BattleBackground } from '../../art';
import { BALANCE } from '../../data/balance';
import { EVENTS } from '../../data/events';
import { getItem } from '../../data/items';
import { eventOptionState, heroFocusMax, heroMaxHp, statChance, sceneBackground, sceneHeroes, successDistribution } from '../../engine';
import { STAT_LABEL } from '../../data/terms';
import { LOCAL_PLAYER, isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { Hero, Loot } from '../../types';
import { CheckPanel, RollStrip } from '../ui/CheckPanel';
import { Crest, HeroFace, ItemIcon, itemSummary, RARITY_STYLE, Screen } from '../ui/game';
import { canChangeNow } from '../JobSheet';
import { PetToken } from '../ui/PetToken';

/** 判定に一番向いている、この端末のキャラ */
function bestHero(heroes: Hero[], score: (h: Hero) => number): string {
  const mine = heroes.filter((h) => h.hp > 0 && isLocalPlayer(h.playerId));
  return [...mine].sort((a, b) => score(b) - score(a))[0]?.id ?? heroes[0].id;
}

export function LootList({ loot }: { loot: Loot[] }) {
  const game = useBattle((s) => s.game)!;
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
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="flex items-center gap-2 rounded-lg bg-black/30 p-1.5">
            <ItemIcon item={def} size={44} />
            <span className="min-w-0 flex-1 leading-4">
              <span className="block text-[14px] font-bold" style={{ color: r.color }}>
                {def.name} <span className="text-[12px] font-normal opacity-80">{r.name}</span>
              </span>
              {l.to && <span className="block text-[12px] text-sky-200">→ {game.heroes.find((x) => x.id === l.to)?.name}が受け取った</span>}
              <span className="block truncate text-[12px] text-zinc-300">{itemSummary(def)}</span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function EventScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const ev = game.event!;
  const def = EVENTS.get(ev.eventId);
  const [chosen, setChosen] = useState<number | null>(null);
  const opt = chosen !== null ? def.options[chosen] : undefined;
  const candidates = sceneHeroes(game).filter(h => !game.world || game.activeScene || ev.tile === undefined || h.id === game.world.turn);
  const [heroId, setHeroId] = useState(candidates[0].id);
  const [focus, setFocus] = useState(0);

  const choose = (i: number) => {
    const o = def.options[i];
    if (o.check) {
      setChosen(i);
      setHeroId(bestHero(candidates, (h) => statChance(h, o.check!.stat, o.check!.tag, true)));
      setFocus(0);
    } else dispatchGame({ type: 'CHOOSE_EVENT', playerId: LOCAL_PLAYER, optionIndex: i, focusUsed: 0 });
  };

  // 選択肢の成功率（一番得意なキャラ・フォーカス0の時）。行動の前に確率が見えるように（spec §2.1）
  const optionChance = (i: number) => {
    const c = def.options[i].check;
    if (!c) return null;
    const heroes = candidates;
    const h = heroes.find((x) => x.id === bestHero(heroes, (y) => statChance(y, c.stat, c.tag, true)))!;
    const dist = successDistribution(c.slots, 0, statChance(h, c.stat, c.tag, true));
    const p = dist.slice(c.need).reduce((n, x) => n + x, 0);
    return { stat: STAT_LABEL[c.stat], pct: Math.round(p * 100), hero: h };
  };
  const options = (
    <div className="mt-3 flex flex-col gap-2">
      {def.options.map((o, i) => {
        const st = eventOptionState(game, ev.eventId, i);
        if (!st.visible) return null;
        const ch = optionChance(i);
        return (
          <button
            key={i}
            disabled={!!st.reason}
            onClick={() => choose(i)}
            className={`btn flex min-h-12 items-center gap-2 rounded-xl px-3 py-1 text-left ${o.requiresTag ? 'border border-sky-300/60 bg-sky-950/60' : 'btn-dark'}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-5 font-bold">
                {o.label}
                <VoteChips cmd={{ type: 'CHOOSE_EVENT', playerId: LOCAL_PLAYER, optionIndex: i, focusUsed: 0 }} />
              </span>
              {(o.cost || o.costFocus || o.costItem) && (
                <span className="block text-[12px] text-amber-300">
                  {[o.cost && `${o.cost}G`, o.costFocus && `フォーカス${o.costFocus}`, o.costItem && getItem(o.costItem).name].filter(Boolean).join('・')}を払う
                </span>
              )}
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
      {def.options.some((o) => o.check) && <div className="text-[12px] leading-4 text-zinc-500">％は一番得意なキャラ・フォーカス0の時。選ぶとキャラとフォーカスを変えられます</div>}
    </div>
  );

  return (
    <Screen>
      <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overscroll-contain px-3 py-4">
        <BattleBackground kind={sceneBackground(game)} className="absolute inset-0 h-full w-full opacity-30" />
        {/* 突発イベント: 「！」の短いカットイン（0.3秒） */}
        {ev.random && !ev.result && (
          <motion.div
            initial={{ opacity: 1, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="font-display text-outline pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[96px] text-amber-300"
            aria-hidden
          >
            ！
          </motion.div>
        )}
        {/* イベントの窓: 絵・本文・選択肢（または結果）を中央の1枚にまとめる */}
        <div className="panel panel-ornate relative rounded-2xl p-3 pt-4" data-event-window>
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
          ) : (
            !opt?.check && options
          )}
        </div>
      </div>
      {(ev.result || opt?.check) && (
        <div className="panel shrink-0 rounded-t-2xl px-3 pt-2 pb-3">
          {ev.result ? (
            <button onClick={() => dispatchGame({ type: 'FINISH_EVENT', playerId: LOCAL_PLAYER })} className="btn btn-gold font-display h-12 w-full rounded-xl text-[18px]">
              {ev.battle ? '戦闘を始める' : '先へ進む'}
              <VoteChips cmd={{ type: 'FINISH_EVENT', playerId: LOCAL_PLAYER }} />
            </button>
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
                  <button onClick={() => setChosen(null)} className="btn btn-dark h-12 rounded-xl text-[14px] font-bold">
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
    </Screen>
  );
}

export function RestScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);
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
          <div className="text-[13px] text-zinc-300">焚き火の前で、ひと息つける。どちらか1つを選ぼう。</div>
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
      <div className="grid shrink-0 grid-cols-2 gap-2 px-3 pt-2 pb-3">
        <button onClick={() => dispatchGame({ type: 'REST', playerId: LOCAL_PLAYER, kind: 'hp' })} className="btn btn-gold flex h-16 flex-col items-center justify-center rounded-xl">
          <span className="font-display text-[18px]">
            休む
            <VoteChips cmd={{ type: 'REST', playerId: LOCAL_PLAYER, kind: 'hp' }} />
          </span>
          <span className="text-[12px]">全員のHPを最大の{Math.round(BALANCE.restHpRatio * 100)}%回復</span>
        </button>
        <button onClick={() => dispatchGame({ type: 'REST', playerId: LOCAL_PLAYER, kind: 'focus' })} className="btn btn-dark flex h-16 flex-col items-center justify-center rounded-xl">
          <span className="font-display text-[18px] text-amber-200">
            瞑想する
            <VoteChips cmd={{ type: 'REST', playerId: LOCAL_PLAYER, kind: 'focus' }} />
          </span>
          <span className="text-[12px]">全員のフォーカス+{BALANCE.restFocus}</span>
        </button>
      </div>
    </Screen>
  );
}
