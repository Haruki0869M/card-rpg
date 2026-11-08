import { getPet } from '../data/pets';
import { getStatus } from '../data/statuses';
import { getElement } from '../data/elements';
import { STAT_LABEL } from '../data/terms';
// ===== 長押しで出る詳細（指を離すと閉じる。操作はブロックしない） =====
import { CharacterArt, EnemyArt } from '../art';
import { getCard } from '../data/cards';
import { getItem } from '../data/items';
import { getClass } from '../data/classes';
import { getEnemy } from '../data/enemies';
import { affinityOf, chanceFor, describeEffect, describeAbility, enemyName, findAlly, findEnemy, incomingDamage, statsOf, tierDistribution, toPercents } from '../engine';
import { type Detail, useDetail } from '../hooks/usePress';
import { useBattle } from '../store/battleStore';
import type { BattleState, StatId } from '../types';
import { CATEGORY_LABEL, intentView, longEffect, tierTitle } from './format';
import { itemSummary, RARITY_STYLE } from './ui/game';
import { CATEGORY_STYLE, ElementTag, statusStyle } from './ui/icons';
import { BALANCE } from '../data/balance';

function signed(n: number) {
  return n > 0 ? `+${n}%` : n < 0 ? `${n}%` : '±0%';
}


function Title({ children }: { children: React.ReactNode }) {
  return <div className="font-display text-[17px] leading-6 text-amber-100">{children}</div>;
}

function Content({ d, battle }: { d: Detail; battle: BattleState }) {
  switch (d.type) {
    case 'card': {
      const card = getCard(d.cardId, d.upgraded);
      const ally = findAlly(battle, d.allyId);
      if (!ally) return null;
      const cls = getClass(ally.classId);
      const chance = chanceFor(ally, card);
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
              （基礎{card.baseChance}% ・{cls.name}の{CATEGORY_LABEL[card.category]}適性{signed(affinityOf(ally)[card.category])}）
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
      const e = findEnemy(battle, d.uid);
      if (!e) return null;
      const def = getEnemy(e.defId);
      const iv = intentView(battle, e);
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
                {iv.details.map((t, i) => (
                  <div key={i}>・{t}</div>
                ))}
              </div>
            ) : (
              <div className="mt-1 text-[13px] text-zinc-400">{e.dead ? '撃破済み' : '行動済み'}</div>
            )}
            {e.tauntedBy && <div className="text-[13px] text-amber-300">{findAlly(battle, e.tauntedBy)?.name}に挑発されている</div>}
            {(def.weak?.length || def.resist?.length) && (
              <div className="mt-1 flex flex-wrap gap-x-2 text-[12px]">
                {def.weak?.length ? (
                  <span>
                    弱点（×{BALANCE.elementWeakMul}）：
                    {def.weak.map((x) => (
                      <span key={x} className="mr-1">
                        <ElementTag id={x} />
                      </span>
                    ))}
                  </span>
                ) : null}
                {def.resist?.length ? (
                  <span className="text-zinc-300">
                    耐性（×{BALANCE.elementResistMul}・状態異常なし）：
                    {def.resist.map((x) => (
                      <span key={x} className="mr-1">
                        <ElementTag id={x} />
                      </span>
                    ))}
                  </span>
                ) : null}
              </div>
            )}
            <div className="mt-1 text-[12px] text-zinc-500">
              {def.pattern === 'sequence'
                ? `行動順：${def.actions.map((a) => a.name).join(' → ')} → 最初に戻る`
                : `ランダム行動：${def.actions.map((a) => a.name).join(' / ')}`}
            </div>
          </div>
        </div>
      );
    }
    case 'ally': {
      const a = findAlly(battle, d.id);
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
      const it = getItem(d.itemId);
      return (
        <>
          <Title>{it.name}</Title>
          <div className="text-[13px]">{itemSummary(it)}</div>
          <div className="text-[12px] text-zinc-400">{it.description}</div>
          {it.ability && (
            <div className="mt-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[12px]">
              <span className="font-display" style={{ color: RARITY_STYLE[it.rarity].color }}>
                《{it.ability.name}》
              </span>{' '}
              {describeAbility(it.ability)}
            </div>
          )}
        </>
      );
    }
    case 'pet': {
      const a = findAlly(battle, d.allyId), p = a?.pet;
      if (!p) return null;
      const def = getPet(p.petId);
      return <><Title>{p.name}（{def.name}）</Title><div className="text-[13px]">懐き度：{p.love}</div>{def.abilities.map(ab => <p key={ab.name} className="text-[13px]">{ab.name}：{describeAbility(ab)}</p>)}{a?.abilities?.filter(ab => ab.source?.kind === 'pet').map(ab => <p key={ab.name} className="text-[13px]">現在の能力：{describeAbility(ab)}</p>)}</>;
    }
    case 'tokens': {
      const a = findAlly(battle, d.allyId);
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
      const by = d.by ? findAlly(battle, d.by) : undefined;
      return (
        <>
          <Title>
            <span className="inline-flex items-center gap-1" style={{ color: st.color }}>
              <st.Icon size={18} /> {st.name}
              {d.status !== 'taunt' && ` ${d.amount}`}
            </span>
          </Title>
          <div className="text-[13px]">{st.text}</div>
          {by && <div className="text-[13px] text-amber-300">挑発した味方：{by.name}</div>}
          {d.status !== 'taunt' && (
            <div className="mt-1 text-[12px] text-zinc-400">
              {getStatus(d.status).decay === 0 ? `蓄積量${d.amount}。自然には減りません。` : `残り${Math.ceil(d.amount / (getStatus(d.status).decay ?? 1))}ターン相当（現在値${d.amount}）。${d.side === 'enemy' ? '敵' : '味方'}フェーズ終了時に${getStatus(d.status).decay ?? 1}減少。`}追加の消費条件は上の効果説明を確認してください。
            </div>
          )}
        </>
      );
    }
  }
}

export function DetailPopup() {
  const detail = useDetail((s) => s.detail);
  const battle = useBattle((s) => s.battle);
  if (!detail) return null;
  return (
    <div className="panel panel-gold-edge absolute inset-x-2 top-12 z-[200] max-h-[75%] overflow-y-auto rounded-xl p-3 leading-5 shadow-[0_8px_24px_rgba(0,0,0,.6)]">
      <button className="btn btn-dark mb-2 min-h-10 w-full rounded text-[13px]" onClick={() => useDetail.getState().hide()}>詳細を閉じる</button>
      <Content d={detail} battle={battle} />
    </div>
  );
}
