// ===== 戦闘の報酬（ゴールド → 経験値 → レベルアップ → カード → ドロップ） =====
import { VoteChips } from '../ui/Votes';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpCircle, Coins, Gift, Heart, Sparkles, Star, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { REVEAL_TIMING, VIBRATION } from '../../data/balance';
import { cardOf, getCard } from '../../data/cards';
import { cardOfferHeroes, expToNext, findHero, growthHandler, heroStats } from '../../engine';
import { finalChance } from '../../engine';
import { affinityFromStats } from '../../engine';
import { isLocalPlayer, LOCAL_PLAYER } from '../../store/battleConfig';
import { speedFactor, useBattle, vibrate } from '../../store/battleStore';
import { playSound } from '../../audio/player';
import type { GrowthOption, Hero, Rarity } from '../../types';
import { CardFace } from '../ui/CardFace';
import { CardPickPanel } from '../ui/CardPickPanel';
import { Bar, Crest, HeroFace, ItemIcon, itemSummary, RARITY_STYLE, Screen } from '../ui/game';
import { getItem } from '../../data/items';
import { LootList } from './RoomScreens';

/** 成長ボーナスのアイコン（成長の種類の icon のキー → アイコン） */
const GROWTH_ICONS: Record<string, typeof TrendingUp> = { trendingUp: TrendingUp, heart: Heart, star: Star, arrowUp: ArrowUpCircle };

function growthText(o: GrowthOption) {
  const h = growthHandler(o.kind);
  return { title: h.title(o), Icon: GROWTH_ICONS[h.icon] ?? Sparkles, text: h.text };
}

const CARD_BACK: Record<string, { color: string; glow: string }> = {
  common: { color: '#8a7a5a', glow: 'transparent' },
  rare: { color: RARITY_STYLE.rare.color, glow: RARITY_STYLE.rare.glow },
  epic: { color: RARITY_STYLE.epic.color, glow: RARITY_STYLE.epic.glow },
  legend: { color: RARITY_STYLE.legend.color, glow: RARITY_STYLE.legend.glow },
};

/** カードの裏面。charge = めくる前の溜め（レア以上のときだけ、その格の色で光る） */
function CardBack({ width, height, charge }: { width: number; height: number; charge?: Rarity }) {
  const c = CARD_BACK[charge ?? 'common'];
  return (
    <div
      className={`relative flex items-center justify-center rounded-[10px] border-2 ${charge ? 'chest-shake' : ''}`}
      style={{
        width,
        height,
        borderColor: charge ? c.color : '#6a5a40',
        background: 'repeating-linear-gradient(45deg,#2a1e30 0 8px,#22182a 8px 16px)',
        boxShadow: charge ? `0 0 22px ${c.glow}, inset 0 0 18px ${c.glow}` : '0 3px 6px rgba(0,0,0,.6)',
      }}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2" style={{ borderColor: charge ? c.color : '#8a7a5a', background: '#140e18' }}>
        <Sparkles size={24} style={{ color: charge ? c.color : '#8a7a5a' }} />
      </span>
    </div>
  );
}

/** カード報酬: 裏向きで並び、左から順にめくれる。レア以上は格の色で溜めてからめくれ、エピックは光の柱が立つ */
function RewardCards({ heroId }: { heroId: string }) {
  const game = useBattle((s) => s.game)!;
  const settings = useBattle((s) => s.settings);
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const r = game.reward!;
  const speed = speedFactor(settings);
  // このキャラの分のカード（元の番号を覚えておく）
  const offers = r.cardOffers.map((o, index) => ({ ...o, index })).filter((o) => o.heroId === heroId);
  const hero = findHero(game, heroId)!;
  const n = offers.length;
  const [shown, setShown] = useState(0);
  const [charging, setCharging] = useState(-1);
  const done = shown >= n;
  // 押したカード（説明の窓を開く。決めるのは窓の「このカードを選ぶ」だけ。フェーズ3）
  const [sel, setSel] = useState<number | null>(null);
  const picked = sel !== null ? offers[sel] : undefined;
  const closePanel = useCallback(() => setSel(null), []);

  useEffect(() => {
    if (shown >= n) return;
    const rarity = getCard(offers[shown].cardId).rarity ?? 'common';
    const special = rarity !== 'common';
    if (special && charging !== shown) {
      const t = setTimeout(() => setCharging(shown), (REVEAL_TIMING.cardFlip * 1000) / speed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => {
        setShown((x) => x + 1);
        playSound(special ? 'sfx_card_flip_rare' : 'sfx_card_flip');
        if (rarity === 'epic' || rarity === 'legend') vibrate(settings, VIBRATION.chestReach);
        else if (special) vibrate(settings, VIBRATION.chestStep);
      },
      ((special ? REVEAL_TIMING.cardFlipRare : REVEAL_TIMING.cardFlip) * 1000) / speed,
    );
    return () => clearTimeout(t);
  }, [shown, charging, n, speed]);

  const odds = r.cardOdds;
  return (
    <div className="mt-3" onClick={() => !done && setShown(n)}>
      <div className="font-display flex items-center justify-center gap-1.5 text-center text-[17px] text-amber-100">
        <HeroFace hero={hero} size={26} />
        {hero.name}の山札に1枚加える
      </div>
      {odds && (
        <div className="text-center text-[12px] text-zinc-400">
          1枚ごとの格の確率：
          {(['common', 'rare', 'epic'] as Rarity[]).map((g, i) => (
            <span key={g} className="ml-1" style={{ color: RARITY_STYLE[g].color }}>
              {RARITY_STYLE[g].name}
              {odds[i]}%
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-center gap-1.5">
        {offers.map((o, i) => {
          const h = hero;
          const card = getCard(o.cardId);
          const rarity = card.rarity ?? 'common';
          const open = i < shown;
          const big = rarity === 'epic' || rarity === 'legend';
          return (
            <button
              key={i}
              disabled={!done}
              onClick={(e) => {
                e.stopPropagation();
                if (done) setSel((x) => (x === i ? null : i));
                else setShown(n);
              }}
              className="btn relative flex flex-col items-center gap-1 transition-transform duration-150 disabled:opacity-100 disabled:filter-none"
              style={sel === i ? { transform: 'scale(1.15) translateY(-4px)', zIndex: 2 } : sel !== null ? { opacity: 0.7 } : undefined}
              aria-pressed={sel === i}
              aria-label={card.name}
              data-pick-card={i}
            >
              {open && big && (
                <motion.span
                  initial={{ opacity: 0, scaleY: 0.2 }}
                  animate={{ opacity: [0, 1, 0.55], scaleY: 1 }}
                  transition={{ duration: 0.5 }}
                  className="pointer-events-none absolute -top-6 bottom-6 left-1/2 w-16 -translate-x-1/2 origin-bottom"
                  style={{ background: `linear-gradient(0deg, ${RARITY_STYLE[rarity].glow}, transparent)` }}
                />
              )}
              <AnimatePresence mode="wait" initial={false}>
                {open ? (
                  <motion.div key="front" initial={{ scaleX: 0 }} animate={{ scaleX: big ? [0, 1.12, 1] : 1 }} transition={{ duration: big ? 0.32 : 0.14 }}>
                    <CardFace card={card} chance={chanceOf(h, o.cardId)} width={104} height={156} />
                  </motion.div>
                ) : (
                  <motion.div key="back" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ scaleX: 0 }} transition={{ duration: 0.12 }}>
                    <CardBack width={104} height={156} charge={charging === i && rarity !== 'common' ? rarity : undefined} />
                  </motion.div>
                )}
              </AnimatePresence>
              {open && rarity !== 'common' && (
                <span className="font-display text-[13px] leading-4" style={{ color: RARITY_STYLE[rarity].color }}>
                  {RARITY_STYLE[rarity].name}
                  {big ? '！' : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!done && <div className="mt-1 text-center text-[12px] text-zinc-400">タップですぐにめくる</div>}
      {done && !picked && <div className="mt-2 text-center text-[12px] text-zinc-400">カードを押すと、くわしい説明が出ます</div>}
      {picked && (
        <CardPickPanel
          card={getCard(picked.cardId)}
          chance={chanceOf(hero, picked.cardId)}
          who={`${hero.name}の成功率`}
          action="このカードを選ぶ"
          onAction={() => dispatchGame({ type: 'PICK_CARD', playerId: LOCAL_PLAYER, offerIndex: picked.index })}
          onClose={closePanel}
        />
      )}
    </div>
  );
}

const CLAIM_LABEL = { need: '欲しい', greed: '余れば', pass: 'いらない' } as const;

/** 落とした装備の取り合い（M3-C5）: 全員が選んだら、欲しい人の中で運の判定が一番高い人へ */
function ClaimPanel() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const c = game.reward!.claim!;
  const def = getItem(c.item.itemId);
  const roll = (id: string) => c.rolls?.find((x) => x.heroId === id)?.roll;
  return (
    <div className="panel panel-gold-edge mt-3 rounded-xl p-2" data-claim>
      <div className="font-display text-center text-[16px] text-amber-100">戦利品を取り合う</div>
      <div className="mt-1 flex items-center gap-2">
        <ItemIcon item={def} size={52} />
        <div className="min-w-0">
          <div className="font-bold" style={{ color: RARITY_STYLE[def.rarity].color }}>
            {def.name}
          </div>
          <div className="text-[12px] leading-4 text-zinc-300">{itemSummary(def)}</div>
        </div>
      </div>
      <div className="mt-1 text-[12px] text-zinc-400">「欲しい」人がいればその中で、いなければ「余れば」の人の中で、運の判定（1〜100＋運の半分）が一番高い人がもらう</div>
      <div className="mt-1.5 flex flex-col gap-1">
        {c.heroes.map((id) => {
          const h = findHero(game, id)!;
          const mine = isLocalPlayer(h.playerId);
          const ch = c.choices[id];
          const win = c.winner === id;
          return (
            <div key={id} className={`flex items-center gap-1.5 rounded-lg p-1 ${win ? 'bg-amber-500/25 ring-1 ring-amber-300' : 'bg-black/30'}`}>
              <HeroFace hero={h} size={30} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{h.name}</span>
              {c.rolls ? (
                <span className="text-[13px] tabular-nums text-zinc-200">
                  {CLAIM_LABEL[ch]}
                  {roll(id) !== undefined && <b className="ml-1 text-amber-200">運 {roll(id)}</b>}
                  {win && <b className="ml-1 text-amber-300">獲得！</b>}
                </span>
              ) : mine ? (
                (['need', 'greed', 'pass'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => dispatchGame({ type: 'CLAIM_LOOT', playerId: LOCAL_PLAYER, heroId: id, choice: k })}
                    className={`btn h-11 rounded-lg px-2 text-[13px] font-bold ${ch === k ? 'btn-gold' : 'btn-dark'}`}
                  >
                    {CLAIM_LABEL[k]}
                  </button>
                ))
              ) : (
                <span className="text-[12px] text-zinc-400">{ch ? '選んだ' : '選んでいます…'}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const chanceOf = (hero: Hero, cardId: string, upgraded?: boolean) => finalChance(getCard(cardId, upgraded), affinityFromStats(heroStats(hero)));

export function RewardScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const r = game.reward!;
  const [upgradeFor, setUpgradeFor] = useState<number | null>(null);
  const lu = r.levelUps[0];
  const luHero = lu ? findHero(game, lu.heroId) : undefined;
  // カード報酬（M3-C4）: 生き残ったキャラごとに、担当の人が同時に選ぶ。この端末のキャラから順に
  const pending = cardOfferHeroes(r).filter((id) => !r.cardDone?.includes(id));
  const minePending = pending.filter((id) => isLocalPlayer(findHero(game, id)?.playerId ?? LOCAL_PLAYER));
  const cardHero = minePending[0];
  const othersPicking = pending.filter((id) => !minePending.includes(id)).map((id) => findHero(game, id)!);

  return (
    <Screen>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-2">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div
            className="font-display text-[34px] leading-10"
            style={{ background: 'linear-gradient(180deg,#fff6d0,#f2c24a 55%,#a86a12)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.8))' }}
          >
            勝利！
          </div>
          <div className="flex items-center justify-center gap-1 text-[16px] font-bold text-amber-200">
            <Coins size={18} /> +{r.gold} G{r.exp.length > 1 ? `（${r.exp.length}人で山分け）` : ''}
          </div>
        </motion.div>

        {/* 経験値 */}
        <div className="mt-2 flex flex-col gap-1.5">
          {r.exp.map((e, i) => {
            const h = findHero(game, e.heroId)!;
            const up = e.toLevel > e.fromLevel;
            return (
              <motion.div key={e.heroId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="panel flex items-center gap-2 rounded-lg p-1.5">
                <HeroFace hero={h} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-bold">{h.name}</span>
                    <span className="tabular-nums text-violet-200">
                      EXP +{e.gained}
                      {up && <span className="font-display ml-1 text-amber-300">Lv{e.toLevel}！</span>}
                    </span>
                  </div>
                  <Bar value={e.toExp} max={expToNext(e.toLevel, h.classId)} color="linear-gradient(90deg,#8a6aff,#c8b0ff)" height={7} />
                </div>
              </motion.div>
            );
          })}
          {game.heroes
            .filter((h) => (!game.party || game.party.includes(h.id)) && !r.exp.some((e) => e.heroId === h.id))
            .map((h) => (
              <div key={h.id} className="flex items-center gap-2 rounded-lg bg-black/30 p-1.5 text-[12px] text-zinc-400">
                <HeroFace hero={h} size={26} dim /> {h.name}は戦闘不能だったため経験値なし（HP1で復帰）
              </div>
            ))}
        </div>

        {/* カード報酬（裏向きで並び、1枚ずつめくれる。spec §13） */}
        {!lu && cardHero && <RewardCards key={cardHero} heroId={cardHero} />}
        {!lu && othersPicking.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[13px] text-zinc-300">
            {othersPicking.map((h) => (
              <span key={h.id} className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5">
                <HeroFace hero={h} size={20} /> {h.name}
              </span>
            ))}
            がカードを選んでいます
          </div>
        )}

        {!lu && r.claim && <ClaimPanel />}

        {/* ドロップ */}
        {r.loot.length > 0 && (
          <div className="mt-3">
            <div className="font-display mb-1 text-[15px] text-amber-200">戦利品</div>
            <LootList loot={r.loot} />
          </div>
        )}
        {r.hiddenChest && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-900/30 p-2 text-[14px] font-bold text-amber-100">
            <Gift size={22} className="text-amber-300" /> 隠し宝箱を見つけた！
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pt-1 pb-3">
        {lu ? null : cardHero ? (
          <button onClick={() => dispatchGame({ type: 'PICK_CARD', playerId: LOCAL_PLAYER, offerIndex: null, heroId: cardHero })} className="btn btn-dark h-12 w-full rounded-xl text-[15px] font-bold">
            {findHero(game, cardHero)?.name}はカードを選ばない
          </button>
        ) : r.claim && !r.claim.rolls ? (
          <div className="flex h-12 items-center justify-center rounded-xl bg-black/40 text-[14px] text-zinc-300">戦利品の取り合いが終わるのを待っています</div>
        ) : pending.length ? (
          <div className="flex h-12 items-center justify-center rounded-xl bg-black/40 text-[14px] text-zinc-300">ほかの人がカードを選び終えるのを待っています</div>
        ) : (
          <button onClick={() => dispatchGame({ type: 'FINISH_REWARD', playerId: LOCAL_PLAYER })} className="btn btn-gold font-display h-12 w-full rounded-xl text-[18px]">
            {r.hiddenChest ? '隠し宝箱へ' : '先へ進む'}
            <VoteChips cmd={{ type: 'FINISH_REWARD', playerId: LOCAL_PLAYER }} />
          </button>
        )}
      </div>

      {/* レベルアップの成長ボーナス */}
      <AnimatePresence>
        {lu && luHero && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex flex-col justify-center bg-black/75 px-3">
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="panel panel-gold-edge panel-ornate rounded-2xl p-3 pt-4">
              <Crest />
              <div className="flex items-center gap-2">
                <HeroFace hero={luHero} size={46} />
                <div>
                  <div className="font-display text-[24px] leading-7 text-amber-200">
                    <Sparkles size={20} className="mr-1 inline" />
                    レベルアップ！
                  </div>
                  <div className="text-[13px] text-zinc-300">
                    {luHero.name}が Lv{lu.level} になった。成長ボーナスを1つ選ぼう。
                  </div>
                </div>
              </div>
              {upgradeFor === null ? (
                <div className="mt-3 flex flex-col gap-2">
                  {lu.options.map((o, i) => {
                    const g = growthText(o);
                    return (
                      <button
                        key={i}
                        onClick={() => (o.kind === 'upgradeCard' ? setUpgradeFor(i) : dispatchGame({ type: 'CHOOSE_GROWTH', playerId: LOCAL_PLAYER, optionIndex: i }))}
                        className="btn btn-dark flex min-h-14 items-center gap-3 rounded-xl px-3 text-left"
                      >
                        <g.Icon size={26} className="shrink-0 text-amber-300" />
                        <span>
                          <span className="font-display block text-[17px] text-amber-50">{g.title}</span>
                          <span className="block text-[12px] text-zinc-400">{g.text}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2">
                  <div className="text-[13px] text-zinc-300">強化するカードを選ぶ</div>
                  <div className="mt-1 flex max-h-[52dvh] flex-wrap justify-center gap-1.5 overflow-y-auto">
                    {[...new Map(luHero.deck.filter((c) => !c.upgraded).map((c) => [c.cardId, c])).values()].map((c) => (
                      <button key={c.uid} onClick={() => dispatchGame({ type: 'CHOOSE_GROWTH', playerId: LOCAL_PLAYER, optionIndex: upgradeFor, cardUid: c.uid })} className="btn">
                        <CardFace card={cardOf({ cardId: c.cardId, upgraded: true })} chance={chanceOf(luHero, c.cardId, true)} width={96} height={150} />
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setUpgradeFor(null)} className="btn btn-dark mt-2 h-11 w-full rounded-lg font-bold">
                    戻る
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
