// ===== 宝箱・イベント・休憩の画面 =====
import { motion } from 'framer-motion';
import { Coins, Flame, Gift, Lock, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { BattleBackground } from '../../art';
import { BALANCE } from '../../data/balance';
import { EVENTS } from '../../data/events';
import { getItem } from '../../data/items';
import { eventOptionState, heroFocusMax, heroMaxHp, statChance } from '../../engine';
import { LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { Hero, Loot, Rarity } from '../../types';
import { CheckPanel, RollStrip } from '../ui/CheckPanel';
import { HeroFace, ItemIcon, itemSummary, RARITY_STYLE, Screen } from '../ui/game';

/** 判定に一番向いている、この端末のキャラ */
function bestHero(heroes: Hero[], score: (h: Hero) => number): string {
  const mine = heroes.filter((h) => h.hp > 0 && h.playerId === LOCAL_PLAYER);
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
              <span className="block truncate text-[12px] text-zinc-300">{itemSummary(def)}</span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

const CHEST_LOOK: Record<Rarity, string> = { common: '木の宝箱', rare: '鉄の宝箱', epic: '装飾の宝箱', legend: '黄金の宝箱' };

export function ChestScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const chest = game.chest!;
  const locked = !chest.unlocked;
  const [heroId, setHeroId] = useState(() => bestHero(game.heroes, (h) => statChance(h, locked ? 'dex' : 'luk')));
  const [focus, setFocus] = useState(0);
  const r = RARITY_STYLE[chest.spec.rarity];
  const opened = !!chest.contents;
  const rollHero = chest.lastRoll ? game.heroes.find((h) => h.id === chest.lastRoll!.heroId) : undefined;

  return (
    <Screen>
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <BattleBackground kind={game.dungeon?.background} className="absolute inset-0 h-full w-full opacity-35" />
        <div className="relative flex flex-col items-center px-3 pt-4">
          <div className="font-display text-outline text-[24px]" style={{ color: r.color }}>
            {chest.spec.big ? '大宝箱' : CHEST_LOOK[chest.spec.rarity]}
          </div>
          <div className="text-[13px] text-zinc-300">
            中身の格：<b style={{ color: r.color }}>{r.name}</b>
            {locked && (
              <span className="ml-1 text-amber-200">
                <Lock size={13} className="inline" /> 鍵がかかっている
              </span>
            )}
          </div>
          <motion.div
            key={opened ? 'open' : chest.lastRoll ? `r${chest.lastRoll.results.join()}` : 'closed'}
            initial={opened ? { scale: 0.8, rotate: -6 } : { scale: 1 }}
            animate={opened ? { scale: [0.8, 1.15, 1], rotate: [-6, 6, 0] } : { rotate: [0, -3, 3, 0] }}
            transition={{ duration: opened ? 0.5 : 0.4 }}
            className="relative my-3 flex h-[120px] w-[150px] items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(closest-side, ${r.glow}, transparent)` }} />
            <span className="relative flex h-[96px] w-[120px] items-center justify-center rounded-2xl border-4" style={{ borderColor: r.color, background: r.bg }}>
              <Gift size={60} style={{ color: r.color }} />
              {locked && <Lock size={26} className="absolute -bottom-3 rounded-full bg-zinc-900 p-1 text-amber-200" />}
            </span>
          </motion.div>
          {chest.lastRoll && (
            <div className="flex flex-col items-center gap-1">
              <RollStrip results={chest.lastRoll.results} />
              <div className={`text-[14px] font-bold ${chest.lastRoll.success ? 'text-emerald-300' : 'text-red-300'}`}>
                {chest.lastRoll.kind === 'lock'
                  ? chest.lastRoll.success
                    ? `${rollHero?.name}が鍵を開けた！`
                    : chest.lastRoll.trap
                  : chest.lastRoll.upgraded
                    ? `完全成功！ 中身が「${r.name}」に格上げされた！`
                    : `${rollHero?.name}が宝箱を開けた`}
              </div>
            </div>
          )}
          {opened && (
            <div className="mt-2 w-full">
              <LootList loot={chest.contents!} />
              <div className="mt-1 text-center text-[12px] text-zinc-400">装備品は「パーティ・装備」から誰にでも装備できます</div>
            </div>
          )}
        </div>
      </div>
      <div className="panel shrink-0 rounded-t-2xl px-3 pt-2 pb-3">
        {!opened ? (
          <>
            <CheckPanel
              heroes={game.heroes}
              heroId={heroId}
              setHeroId={setHeroId}
              focus={focus}
              setFocus={setFocus}
              stat={locked ? 'dex' : 'luk'}
              tag={locked ? 'lock' : 'luck'}
              slots={locked ? BALANCE.lockSlots : BALANCE.chestLuckSlots}
              need={locked ? BALANCE.lockNeed : BALANCE.chestLuckSlots}
              successLabel={locked ? '鍵が開く（0成功は罠：全員5ダメージ）' : '中身の格が1段階上がる（失敗しても損はしない）'}
            />
            <div className="mt-2 grid grid-cols-[1fr_2fr] gap-2">
              <button onClick={() => dispatchGame({ type: 'LEAVE_CHEST', playerId: LOCAL_PLAYER })} className="btn btn-dark h-12 rounded-xl text-[14px] font-bold">
                {chest.spec.big ? '開けずに去る' : '立ち去る'}
              </button>
              <button
                onClick={() => {
                  dispatchGame({ type: 'OPEN_CHEST', playerId: LOCAL_PLAYER, heroId, focusUsed: focus });
                  setFocus(0);
                }}
                className="btn btn-gold font-display h-12 rounded-xl text-[18px]"
              >
                {locked ? '鍵を開ける' : '開ける'}
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => dispatchGame({ type: 'LEAVE_CHEST', playerId: LOCAL_PLAYER })} className="btn btn-gold font-display h-12 w-full rounded-xl text-[18px]">
            {chest.spec.big ? 'ダンジョン制覇！' : '先へ進む'}
          </button>
        )}
      </div>
    </Screen>
  );
}

export function EventScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const ev = game.event!;
  const def = EVENTS.get(ev.eventId);
  const [chosen, setChosen] = useState<number | null>(null);
  const opt = chosen !== null ? def.options[chosen] : undefined;
  const [heroId, setHeroId] = useState(game.heroes[0].id);
  const [focus, setFocus] = useState(0);

  const choose = (i: number) => {
    const o = def.options[i];
    if (o.check) {
      setChosen(i);
      setHeroId(bestHero(game.heroes, (h) => statChance(h, o.check!.stat, o.check!.tag)));
      setFocus(0);
    } else dispatchGame({ type: 'CHOOSE_EVENT', playerId: LOCAL_PLAYER, optionIndex: i, focusUsed: 0 });
  };

  return (
    <Screen>
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <BattleBackground kind={game.dungeon?.background} className="absolute inset-0 h-full w-full opacity-30" />
        <div className="relative px-3 pt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-sky-300 bg-sky-950/60">
              <Sparkles size={26} className="text-sky-200" />
            </span>
            <div className="font-display text-outline text-[24px] text-amber-100">{def.title}</div>
          </div>
          <div className="panel mt-3 rounded-xl p-3 text-[15px] leading-6">{def.text}</div>
          {ev.result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-col items-center gap-2">
              {ev.result.results && <RollStrip results={ev.result.results} />}
              <div className={`text-center text-[15px] font-bold ${ev.result.success ? 'text-emerald-300' : 'text-red-300'}`}>{ev.result.text}</div>
              {ev.result.loot.length > 0 && (
                <div className="w-full">
                  <LootList loot={ev.result.loot} />
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
      <div className="panel shrink-0 rounded-t-2xl px-3 pt-2 pb-3">
        {ev.result ? (
          <button onClick={() => dispatchGame({ type: 'FINISH_EVENT', playerId: LOCAL_PLAYER })} className="btn btn-gold font-display h-12 w-full rounded-xl text-[18px]">
            先へ進む
          </button>
        ) : opt?.check ? (
          <>
            <div className="font-display mb-1 text-[16px] text-amber-100">「{opt.label}」</div>
            <CheckPanel
              heroes={game.heroes}
              heroId={heroId}
              setHeroId={setHeroId}
              focus={focus}
              setFocus={setFocus}
              stat={opt.check.stat}
              tag={opt.check.tag}
              slots={opt.check.slots}
              need={opt.check.need}
              successLabel="成功"
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
        ) : (
          <div className="flex flex-col gap-2">
            {def.options.map((o, i) => {
              const st = eventOptionState(game, ev.eventId, i);
              if (!st.visible) return null;
              return (
                <button
                  key={i}
                  disabled={!!st.reason}
                  onClick={() => choose(i)}
                  className={`btn flex min-h-12 flex-col items-start justify-center rounded-xl px-3 py-1 text-left ${o.requiresTag ? 'border border-sky-300/60 bg-sky-950/60' : 'btn-dark'}`}
                >
                  <span className="text-[15px] font-bold">{o.label}</span>
                  {o.check && <span className="text-[12px] text-zinc-400">能力値で判定（成功率は次の画面で確認できます）</span>}
                  {st.reason && <span className="text-[12px] text-red-300">{st.reason}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Screen>
  );
}

export function RestScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  return (
    <Screen>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <BattleBackground kind={game.dungeon?.background} className="absolute inset-0 h-full w-full opacity-40" />
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
            {game.heroes.map((h) => (
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
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 px-3 pt-2 pb-3">
        <button onClick={() => dispatchGame({ type: 'REST', playerId: LOCAL_PLAYER, kind: 'hp' })} className="btn btn-gold flex h-16 flex-col items-center justify-center rounded-xl">
          <span className="font-display text-[18px]">休む</span>
          <span className="text-[12px]">全員のHPを最大の{Math.round(BALANCE.restHpRatio * 100)}%回復</span>
        </button>
        <button onClick={() => dispatchGame({ type: 'REST', playerId: LOCAL_PLAYER, kind: 'focus' })} className="btn btn-dark flex h-16 flex-col items-center justify-center rounded-xl">
          <span className="font-display text-[18px] text-amber-200">瞑想する</span>
          <span className="text-[12px]">全員のフォーカス+{BALANCE.restFocus}</span>
        </button>
      </div>
    </Screen>
  );
}
