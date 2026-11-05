// ===== 戦闘の報酬（ゴールド → 経験値 → レベルアップ → カード → ドロップ） =====
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpCircle, Coins, Gift, Heart, Sparkles, Star, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { cardOf, getCard } from '../../data/cards';
import { expToNext, findHero, heroStats } from '../../engine';
import { finalChance } from '../../engine';
import { affinityFromStats } from '../../engine';
import { LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { GrowthOption, Hero } from '../../types';
import { CardFace } from '../ui/CardFace';
import { Bar, HeroFace, Screen, STAT_LABEL } from '../ui/game';
import { LootList } from './RoomScreens';

function growthText(o: GrowthOption) {
  switch (o.kind) {
    case 'stat':
      return { title: `${STAT_LABEL[o.stat!]} +${o.amount}`, Icon: TrendingUp, text: '能力値が上がり、関係する成功率も上がる' };
    case 'maxHp':
      return { title: `最大HP +${o.amount}`, Icon: Heart, text: '打たれ強くなる' };
    case 'focusMax':
      return { title: 'フォーカス最大 +1', Icon: Star, text: '確定成功をもっと使えるようになる' };
    case 'upgradeCard':
      return { title: 'カード強化', Icon: ArrowUpCircle, text: '山札のカード1枚を強化（成功率+10%・効果アップ）' };
  }
}

const chanceOf = (hero: Hero, cardId: string, upgraded?: boolean) => finalChance(getCard(cardId, upgraded), affinityFromStats(heroStats(hero)));

export function RewardScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const r = game.reward!;
  const [upgradeFor, setUpgradeFor] = useState<number | null>(null);
  const lu = r.levelUps[0];
  const luHero = lu ? findHero(game, lu.heroId) : undefined;

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
            <Coins size={18} /> +{r.gold} G
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
                  <Bar value={e.toExp} max={expToNext(e.toLevel)} color="linear-gradient(90deg,#8a6aff,#c8b0ff)" height={7} />
                </div>
              </motion.div>
            );
          })}
          {game.heroes
            .filter((h) => !r.exp.some((e) => e.heroId === h.id))
            .map((h) => (
              <div key={h.id} className="flex items-center gap-2 rounded-lg bg-black/30 p-1.5 text-[12px] text-zinc-400">
                <HeroFace hero={h} size={26} dim /> {h.name}は戦闘不能だったため経験値なし（HP1で復帰）
              </div>
            ))}
        </div>

        {/* カード報酬 */}
        {!lu && !r.cardPicked && r.cardOffers.length > 0 && (
          <div className="mt-3">
            <div className="font-display text-center text-[17px] text-amber-100">カードを1枚、山札に加える</div>
            <div className="mt-2 flex justify-center gap-1.5">
              {r.cardOffers.map((o, i) => {
                const h = findHero(game, o.heroId)!;
                return (
                  <motion.button
                    key={i}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    onClick={() => dispatchGame({ type: 'PICK_CARD', playerId: LOCAL_PLAYER, offerIndex: i })}
                    className="btn flex flex-col items-center gap-1"
                  >
                    <CardFace card={getCard(o.cardId)} chance={chanceOf(h, o.cardId)} width={104} height={156} glow={getCard(o.cardId).rarity === 'rare' ? 'rgba(80,170,255,.7)' : undefined} />
                    <span className="flex items-center gap-1 text-[12px]">
                      <HeroFace hero={h} size={20} /> {h.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

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
        {lu ? null : !r.cardPicked && r.cardOffers.length > 0 ? (
          <button onClick={() => dispatchGame({ type: 'PICK_CARD', playerId: LOCAL_PLAYER, offerIndex: null })} className="btn btn-dark h-12 w-full rounded-xl text-[15px] font-bold">
            カードを選ばない
          </button>
        ) : (
          <button onClick={() => dispatchGame({ type: 'FINISH_REWARD', playerId: LOCAL_PLAYER })} className="btn btn-gold font-display h-12 w-full rounded-xl text-[18px]">
            {r.hiddenChest ? '隠し宝箱へ' : '先へ進む'}
          </button>
        )}
      </div>

      {/* レベルアップの成長ボーナス */}
      <AnimatePresence>
        {lu && luHero && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex flex-col justify-center bg-black/75 px-3">
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="panel panel-gold-edge rounded-2xl p-3">
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
