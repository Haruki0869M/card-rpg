import { getPet } from '../data/pets';
import { guardStyleText } from '../engine/battle/effects/kinds/guardAllies';
import { getStatus } from '../data/statuses';
import { getElement } from '../data/elements';
import { STAT_LABEL } from '../data/terms';
// ===== 詳細の窓（長押し・タップで開く。指を離しても残る。閉じるボタン・外の暗い所・窓そのもの・戻るボタンで閉じる） =====
import { CharacterArt, EnemyArt } from '../art';
import { getCard } from '../data/cards';
import { getClass } from '../data/classes';
import { getEnemy, phasesOf } from '../data/enemies';
import { affinityFromStats, affinityOf, chanceFor, describeEffect, describeAbility, enemyHitDamage, enemyName, finalChance, findAlly, findEnemy, heroStats, incomingDamage, statsOf, targetOf, tierDistribution, toPercents } from '../engine';
import { getEnemyAction } from '../data/enemies';
import { enemyResist, enemyWeak, phaseDefOf, phaseMarks } from '../engine/battle/phases';
import { battleBoonViews } from '../engine/game/world/detour';
import { currentActionSet } from '../engine/battle/intents';
import { AnimatePresence, motion } from 'framer-motion';
import { ItemDetailContent } from './ItemDetail';
import { type Detail, useDetail } from '../hooks/usePress';
import { useBattle } from '../store/battleStore';
import type { Affinity, BattleState, EnemyActionDef, EnemyState, GameState, StatId } from '../types';
import { CATEGORY_LABEL, intentView, longEffect, tierTitle } from './format';
import { RARITY_STYLE } from './ui/game';
import { CATEGORY_STYLE, ElementTag, MARK_STATUSES, statusStyle } from './ui/icons';
import { BALANCE } from '../data/balance';

function signed(n: number) {
  return n > 0 ? `+${n}%` : n < 0 ? `${n}%` : '±0%';
}


function Title({ children }: { children: React.ReactNode }) {
  return <div className="font-display text-[17px] leading-6 text-amber-100">{children}</div>;
}

function Content({ d, battle, game }: { d: Detail; battle: BattleState; game: GameState | null }) {
  const inBattle = game?.mode === 'battle';
  switch (d.type) {
    case 'card': {
      const card = getCard(d.cardId, d.upgraded);
      // 戦闘中は味方の成功率、戦闘の外ではキャラの能力値からの成功率（キャラが分からなければ基礎の成功率）
      const ally = d.allyId && inBattle ? findAlly(battle, d.allyId) : undefined;
      const hero = !ally && d.allyId ? game?.heroes.find((h) => h.id === d.allyId) : undefined;
      const cls = ally ? getClass(ally.classId) : hero ? getClass(hero.classId) : null;
      const aff: Affinity | null = ally ? affinityOf(ally) : hero ? affinityFromStats(heroStats(hero)) : null;
      const chance = ally ? chanceFor(ally, card) : aff ? finalChance(card, aff) : card.baseChance;
      const focus = d.focus ?? 0;
      const pcts = toPercents(tierDistribution(card, focus, chance));
      const cat = CATEGORY_STYLE[card.category];
      return (
        <>
          <Title>
            <span className="inline-flex items-center gap-1">
              <cat.Icon size={16} style={{ color: cat.glow }} /> {card.name}
            </span>
          </Title>
          <div className="text-[13px] text-zinc-300">
            {CATEGORY_LABEL[card.category]} / コスト{card.cost} / {card.slots}枠 / 対象：{({ enemy: '敵単体', self: '自分（全体・自動効果は各説明）', allEnemies: '敵全体', ally: '味方単体', otherAlly: '自分以外の味方単体', fallenAlly: '戦闘不能の味方単体' })[card.target]}
          </div>
          <div className="mt-1 text-[13px]">
            成功率 <b className="text-amber-200">{chance}%</b>
            <span className="text-zinc-400">
              （基礎{card.baseChance}%{cls && aff ? ` ・${(ally ?? hero)!.name}（${cls.name}）の${CATEGORY_LABEL[card.category]}適性${signed(aff[card.category])}` : ''}）
            </span>
          </div>
          {card.trait && (
            <div className="mt-1 rounded px-1.5 py-0.5 text-[12px]" style={{ background: 'rgba(190,120,255,.14)' }}>
              <span className="font-display" style={{ color: RARITY_STYLE[card.rarity ?? 'epic'].color }}>
                《{card.trait.name}》
              </span>{' '}
              {describeAbility(card.trait)}
            </div>
          )}
          {focus > 0 && <div className="text-[12px] text-amber-300">★フォーカス{focus}使用時の確率</div>}
          <table className="mt-1 w-full text-[13px]">
            <tbody>
              {card.tiers.map((t, i) => (
                <tr key={i} className={t.minSuccesses === card.slots ? 'text-amber-300' : ''}>
                  <td className="py-0.5 pr-2 align-top whitespace-nowrap">{tierTitle(card, i)}</td>
                  <td className="py-0.5 pr-2 text-right align-top font-bold tabular-nums">{pcts[i]}%</td>
                  <td className="py-0.5 align-top">{t.effects.map((x) => longEffect(x, card)).join('＋')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }
    case 'enemy':
    case 'intent': {
      const e = inBattle ? findEnemy(battle, d.uid) : undefined;
      if (!e) return null;
      const iv = intentView(battle, e);
      // ボスの段階（2026-11-14）: 今の弱点・耐性（段階と予告で変わる）・今の段階の決まり・まだ越えていない境目
      const weak = enemyWeak(e);
      const resist = enemyResist(e);
      const ph = phaseDefOf(e);
      const marks = e.dead ? [] : phaseMarks(e);
      const set = currentActionSet(e);
      return (
        <div className="flex gap-2">
          <EnemyArt defId={e.defId} className="h-[78px] w-[66px] shrink-0" />
          <div className="min-w-0 flex-1">
            <Title>
              {enemyName(e)} <span className="text-[13px] text-amber-300">Lv{e.level}</span>
            </Title>
            <div className="text-[13px] text-zinc-300">
              HP {e.hp}/{e.maxHp} {e.block > 0 && `/ ブロック${e.block}`}
            </div>
            {iv ? (
              <div className="mt-1 text-[13px]">
                <div className="font-bold text-red-300">次の行動：「{iv.name}」</div>
                {/* 敵の特殊な行動: 何が起きるか・どうすれば止まるか */}
                {/* 強敵の本気: なぜ強いか・どう受けるか */}
                {iv.frenzy && !iv.broken && <div className="my-0.5 rounded bg-orange-500/20 px-1.5 py-0.5 font-bold text-orange-200" data-intent-frenzy-hint>{iv.frenzy.icon}{iv.frenzy.label}: {iv.frenzy.long}</div>}
                {iv.opening && <div className="my-0.5 rounded bg-indigo-500/25 px-1.5 py-0.5 font-bold text-indigo-100" data-intent-opening-hint>🌀{iv.opening.label}: {iv.opening.long}</div>}
                {iv.hint && <div className="my-0.5 rounded bg-amber-400/15 px-1.5 py-0.5 font-bold text-amber-200" data-intent-hint>{iv.hint}</div>}
                {iv.details.map((t, i) => (
                  <div key={i}>・{t}</div>
                ))}
              </div>
            ) : (
              <div className="mt-1 text-[13px] text-zinc-400">{e.dead ? '撃破済み' : '行動済み'}</div>
            )}
            {e.tauntedBy && <div className="text-[13px] text-amber-300">{findAlly(battle, e.tauntedBy)?.name}に挑発されている</div>}
            {/* 2026-11-14: かばう形は敵ごと（傷ついた仲間だけ・崩れるまで・半分・返す） */}
            {e.guarding && !e.dead && <div className="text-[13px] text-sky-300">仲間をかばっている: {guardStyleText(e.guardStyle ?? {})}</div>}
            {/* ボスの段階: 今の段階の決まりと、この先の境目（HPバーの線） */}
            {ph?.rule && <div className="mt-1 text-[12px] text-indigo-200" data-phase-rule>🌀今の段階「{ph.name}」: {ph.rule}</div>}
            {marks.map((m) => (
              <div key={m.phase} className="text-[12px] text-sky-200" data-phase-ahead={m.phase}>
                ▼HP{Math.round(m.at * 100)}%を切る{m.partner ? 'か、相方が倒れる' : ''}と「{m.name}」になる。{m.opening ? `最初に「${m.opening}」をしてくる` : ''}{m.rule ? `（${m.rule}）` : ''}
              </div>
            ))}
            {/* 寄り道の値打ち（2026-11-14）: この大物に掛かっている災厄の加護と、見破り */}
            {battle.boon?.uid === e.uid &&
              battleBoonViews(battle).map((b) => (
                <div key={b.name} className="mt-0.5 text-[12px] leading-4 text-violet-200" data-boon-row>
                  💀加護《{b.name}》（{b.scourge}）: {b.text}
                </div>
              ))}
            {battle.insight === e.uid && <div className="mt-0.5 text-[12px] leading-4 text-emerald-200" data-insight-row>👁見破り: この敵の大技と開幕の一手は、弱点でなくても完全成功だけで崩せる</div>}
            {(weak.length > 0 || resist.length > 0) && (
              <div className="mt-1 flex flex-wrap gap-x-2 text-[12px]">
                {weak.length ? (
                  <span>
                    弱点（×{BALANCE.elementWeakMul}）：
                    {weak.map((x) => (
                      <span key={x} className="mr-1">
                        <ElementTag id={x} />
                      </span>
                    ))}
                  </span>
                ) : null}
                {resist.length ? (
                  <span className="text-zinc-300">
                    耐性（×{BALANCE.elementResistMul}・状態異常なし）：
                    {resist.map((x) => (
                      <span key={x} className="mr-1">
                        <ElementTag id={x} />
                      </span>
                    ))}
                  </span>
                ) : null}
              </div>
            )}
            <EnemyStats e={e} />
            <div className="mt-1 text-[12px] text-zinc-500">
              {set.pattern === 'sequence'
                ? `行動順：${set.actions.map((a) => a.name).join(' → ')} → 最初に戻る`
                : `ランダム行動：${set.actions.map((a) => a.name).join(' / ')}`}
            </div>
          </div>
        </div>
      );
    }
    case 'ally': {
      const a = inBattle ? findAlly(battle, d.id) : undefined;
      if (!a) return null;
      const cls = getClass(a.classId);
      const aff = affinityOf(a);
      const stats = statsOf(a);
      return (
        <div className="flex gap-2">
          <CharacterArt classId={a.classId} gender={a.gender} className="h-[96px] w-[72px] shrink-0" />
          <div className="min-w-0 flex-1">
            <Title>
              {a.name} <span className="text-[13px] text-zinc-400">{cls.name}・{cls.role}</span>
            </Title>
            {a.dead && <div className="text-[13px] font-bold text-red-300" data-fallen-detail>戦闘不能（勝利でHP1復帰。この戦闘の経験値はもらえない）</div>}
            <div className="text-[13px]">
              HP {a.hp}/{a.maxHp} ・ ブロック{a.block} ・ マナ{a.mana} ・ フォーカス{a.focus}
            </div>
            <div className="text-[12px] text-zinc-300">
              {(Object.keys(STAT_LABEL) as StatId[]).map((k) => `${STAT_LABEL[k]}${stats[k]}`).join(' ')}
            </div>
            <div className="text-[12px] text-zinc-400">
              適性：物理{signed(aff.physical)} 魔法{signed(aff.magic)} スキル{signed(aff.skill)}
            </div>
            <div className="mt-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[12px]">
              <span className="font-display text-amber-200">《{cls.battleAbility.name}》</span> {describeAbility(cls.battleAbility)}
            </div>
            {a.abilities?.map((ab) => (
              <div key={ab.name} className="mt-0.5 rounded bg-fuchsia-500/10 px-1.5 py-0.5 text-[12px]">
                <span className="font-display text-fuchsia-200">《{ab.name}》</span> {describeAbility(ab)}
              </div>
            ))}
            <div className="mt-0.5 text-[13px] text-red-300">被弾予定 {incomingDamage(battle, a)}（ブロック差し引き後）</div>
          </div>
        </div>
      );
    }
    case 'item': {
      const hero = d.heroId ? game?.heroes.find((h) => h.id === d.heroId) : undefined;
      return <ItemDetailContent d={d} hero={hero} />;
    }
    case 'pet': {
      const a = inBattle ? findAlly(battle, d.allyId) : undefined;
      const p = a?.pet ?? game?.heroes.find((h) => h.id === d.allyId)?.pet;
      if (!p) return null;
      const def = getPet(p.petId);
      return <><Title>{p.name}（{def.name}）</Title><div className="text-[13px]">懐き度：{p.love}</div>{def.abilities.map(ab => <p key={ab.name} className="text-[13px]">{ab.name}：{describeAbility(ab)}</p>)}{a?.abilities?.filter(ab => ab.source?.kind === 'pet').map(ab => <p key={ab.name} className="text-[13px]">現在の能力：{describeAbility(ab)}</p>)}</>;
    }
    case 'tokens': {
      const a = inBattle ? findAlly(battle, d.allyId) : undefined;
      if (!a) return null;
      return <><Title>{a.name}の特殊効果</Title>
        {a.attackCharge && <p className="text-[13px]">居合：次の{a.attackCharge.category === 'physical' ? '物理' : '攻撃'}カード×{a.attackCharge.multiplier}。使用まで持続。</p>}
        {a.imbuedElement && <p className="text-[13px]">魔法剣：次の物理攻撃に{getElement(a.imbuedElement).name}属性。使用まで持続。</p>}
        {a.airborne && <p className="text-[13px]">跳躍：次の味方ターンに着地し、対象へ{a.airborne.amount}を基準とする攻撃。</p>}
        {a.summons?.map((m, i) => <p key={`${m.id}:${i}`} className="text-[13px]">{m.icon}{m.name}：{m.echoPct ? `攻撃時に${m.echoPct}%で追撃` : `${m.trigger === 'enemyBeforeAction' ? '対象の敵が行動する直前' : 'ターン終了時'}に${m.damage}の攻撃`}{m.targetId && `／対象：${battle.enemies.find(e => e.uid === m.targetId)?.defId ? enemyName(battle.enemies.find(e => e.uid === m.targetId)!) : '不在'}`}{m.effects?.length ? `／${m.effects.map(e => describeEffect(e)).join('・')}` : ''}{m.intercept ? '／被弾を一度防いで消える' : ''}。{m.turns >= 99 ? '戦闘中持続' : `残り${m.turns}ターン`}。</p>)}
      </>;
    }
    case 'status': {
      const st = statusStyle(d.status);
      const by = d.by && inBattle ? findAlly(battle, d.by) : undefined;
      return (
        <>
          <Title>
            <span className="inline-flex items-center gap-1" style={{ color: st.color }}>
              <st.Icon size={18} /> {st.name}
              {!MARK_STATUSES.has(d.status) && ` ${d.amount}`}
            </span>
          </Title>
          <div className="text-[13px]">{st.text}</div>
          {by && <div className="text-[13px] text-amber-300">挑発した味方：{by.name}</div>}
          {!MARK_STATUSES.has(d.status) && (
            <div className="mt-1 text-[12px] text-zinc-400">
              {getStatus(d.status).decay === 0 ? `蓄積量${d.amount}。自然には減りません。` : `残り${Math.ceil(d.amount / (getStatus(d.status).decay ?? 1))}ターン相当（現在値${d.amount}）。${d.side === 'enemy' ? '敵' : '味方'}フェーズ終了時に${getStatus(d.status).decay ?? 1}減少。`}追加の消費条件は上の効果説明を確認してください。
            </div>
          )}
        </>
      );
    }
  }
}

/** 敵の行動1つの短い説明（今の攻撃力で計算したダメージ） */
function actionText(e: EnemyState, a: EnemyActionDef): string {
  const parts = a.effects.map((eff) => {
    if (eff.kind === 'damage') {
      const hits = eff.hits ?? 1;
      return `${targetOf(eff) === 'target' ? '' : '全体に'}${enemyHitDamage(e, eff.amount, undefined)}ダメージ${hits > 1 ? `×${hits}` : ''}${eff.lowHpMul ? `（HPが半分以下の相手に×${eff.lowHpMul}）` : ''}`;
    }
    return describeEffect(eff, 'enemy');
  });
  return `${a.name}（${parts.join('・')}）`;
}

/** 敵の強さ（レベルによる攻撃力・行動ごとのダメージ・特殊能力・段階） */
function EnemyStats({ e }: { e: EnemyState }) {
  const def = getEnemy(e.defId);
  const ids = [...new Set(def.actions.map((a) => a.id))];
  return (
    <div className="mt-1 text-[12px] leading-4" data-enemy-stats>
      <div>
        <span className="text-zinc-400">攻撃力</span> <b className="tabular-nums">×{Math.round(e.attackMul * 100)}%</b>
        <span className="text-zinc-500">（レベル・難易度による。下のダメージは今の値で、状態異常の前）</span>
      </div>
      <div className="text-zinc-300">
        {ids.map((id) => (
          <div key={id}>・{actionText(e, getEnemyAction(e.defId, id))}</div>
        ))}
      </div>
      {def.abilities?.map((ab) => (
        <div key={ab.name} className="mt-0.5 rounded bg-fuchsia-500/10 px-1.5 py-0.5">
          <span className="font-display text-fuchsia-200">《{ab.name}》</span> {describeAbility(ab)}
        </div>
      ))}
      {phasesOf(e)?.length ? (
        <div className="mt-0.5 text-amber-200">{phasesOf(e)!.map((ph) => `HP${ph.belowHpPct}%以下${ph.onPartnerDown ? 'か、相方が倒れると' : 'で'}「${ph.name}」に変わる`).join('／')}</div>
      ) : null}
    </div>
  );
}

export function DetailPopup() {
  const detail = useDetail((s) => s.detail);
  const canBack = useDetail((s) => s.stack.length > 0);
  const battle = useBattle((s) => s.battle);
  const game = useBattle((s) => s.game);
  const hide = () => useDetail.getState().hide();
  return (
    <AnimatePresence>
      {detail && (
        <motion.div
          key="detail"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="absolute inset-0 z-[200] bg-black/55"
          data-detail-backdrop
          role="presentation"
          // 外の暗い所を押したら閉じる。下の画面へは届かせない
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            hide();
          }}
        >
          <div
            role="dialog"
            aria-label="詳細"
            data-detail-popup
            className="panel panel-gold-edge absolute inset-x-2 top-12 max-h-[75%] overflow-y-auto overscroll-contain rounded-xl p-3 leading-5 shadow-[0_8px_24px_rgba(0,0,0,.6)]"
            // 窓そのものを押しても閉じる（中のカードの名前・戻るのボタンは別の動き）
            onClick={(e) => {
              e.stopPropagation();
              hide();
            }}
          >
            <div className="mb-2 flex gap-1">
              {canBack && (
                <button
                  className="btn btn-dark min-h-10 shrink-0 rounded px-3 text-[13px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    useDetail.getState().back();
                  }}
                >
                  ← 戻る
                </button>
              )}
              <button
                className="btn btn-dark min-h-10 flex-1 rounded text-[13px]"
                onClick={(e) => {
                  e.stopPropagation();
                  hide();
                }}
              >
                詳細を閉じる
              </button>
            </div>
            <Content d={detail} battle={battle} game={game} />
            <div className="mt-2 text-center text-[12px] text-zinc-500">窓か外の暗い所を押すと閉じます</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
