import { getCard } from '../data/cards';
import { getCharacter } from '../data/characters';
import { getEnemy } from '../data/enemies';
import { chanceFor, findAlly, findEnemy, incomingDamage, tierDistribution, toPercents } from '../engine';
import { type Detail, useDetail } from '../hooks/usePress';
import { useBattle } from '../store/battleStore';
import type { BattleState } from '../types';
import { CATEGORY_LABEL, intentView, longEffect, STATUS_INFO, tierTitle } from './format';

function signed(n: number) {
  return n > 0 ? `+${n}%` : n < 0 ? `${n}%` : '±0%';
}

function Content({ d, battle }: { d: Detail; battle: BattleState }) {
  switch (d.type) {
    case 'card': {
      const card = getCard(d.cardId);
      const ally = findAlly(battle, d.allyId)!;
      const ch = getCharacter(ally.id);
      const chance = chanceFor(ally, card);
      const focus = d.focus ?? 0;
      const pcts = toPercents(tierDistribution(card, focus, chance));
      return (
        <>
          <div className="text-[16px] font-bold text-amber-100">{card.name}</div>
          <div className="text-[13px] text-zinc-300">
            {CATEGORY_LABEL[card.category]} / コスト{card.cost} / {card.slots}枠 / 対象：{card.target === 'enemy' ? '敵単体' : '自分'}
          </div>
          <div className="mt-1 text-[13px]">
            成功率 <b className="text-amber-200">{chance}%</b>
            <span className="text-zinc-400">
              （基礎{card.baseChance}% {ch.name}の{CATEGORY_LABEL[card.category]}適性{signed(ch.affinity[card.category])}）
            </span>
          </div>
          {focus > 0 && <div className="text-[12px] text-amber-300">🌟{focus}使用時の確率</div>}
          <table className="mt-1 w-full text-[13px]">
            <tbody>
              {card.tiers.map((t, i) => (
                <tr key={i} className={t.minSuccesses === card.slots ? 'text-amber-300' : ''}>
                  <td className="py-0.5 pr-2 align-top whitespace-nowrap">{tierTitle(card, i)}</td>
                  <td className="py-0.5 pr-2 text-right align-top font-bold tabular-nums">{pcts[i]}%</td>
                  <td className="py-0.5 align-top">{t.effects.map(longEffect).join('＋')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }
    case 'enemy':
    case 'intent': {
      const e = findEnemy(battle, d.uid)!;
      const def = getEnemy(e.defId);
      const iv = intentView(battle, e);
      return (
        <>
          <div className="text-[16px] font-bold text-amber-100">
            {def.icon} {def.name}
          </div>
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
          {e.tauntedBy && <div className="text-[13px] text-amber-300">😤 {getCharacter(e.tauntedBy).name}に挑発されている</div>}
          {(e.statuses.vulnerable > 0 || e.statuses.weak > 0) && (
            <div className="mt-1 text-[12px] text-zinc-300">
              {e.statuses.vulnerable > 0 && <div>💔脆弱{e.statuses.vulnerable}：{STATUS_INFO.vulnerable.text}</div>}
              {e.statuses.weak > 0 && <div>🥀弱体{e.statuses.weak}：{STATUS_INFO.weak.text}</div>}
            </div>
          )}
          <div className="mt-1 text-[12px] text-zinc-500">
            {def.pattern === 'sequence'
              ? `行動順：${def.actions.map((a) => a.name).join(' → ')} → 最初に戻る`
              : `ランダム行動：${def.actions.map((a) => a.name).join(' / ')}`}
          </div>
        </>
      );
    }
    case 'ally': {
      const a = findAlly(battle, d.id)!;
      const def = getCharacter(a.id);
      return (
        <>
          <div className="text-[16px] font-bold text-amber-100">
            {def.icon} {def.name} <span className="text-[12px] text-zinc-400">{def.role}</span>
          </div>
          <div className="text-[13px]">
            HP {a.hp}/{a.maxHp} / ブロック{a.block} / マナ{a.mana} / フォーカス{a.focus}
          </div>
          <div className="text-[13px] text-zinc-300">
            適性：物理{signed(def.affinity.physical)} 魔法{signed(def.affinity.magic)} スキル{signed(def.affinity.skill)}
          </div>
          <div className="text-[13px] text-red-300">被弾予定 {incomingDamage(battle, a)}（ブロック差し引き後）</div>
          {a.statuses.weak > 0 && <div className="text-[12px]">🥀弱体{a.statuses.weak}：{STATUS_INFO.weak.text}</div>}
          {a.statuses.vulnerable > 0 && <div className="text-[12px]">💔脆弱{a.statuses.vulnerable}：{STATUS_INFO.vulnerable.text}</div>}
          <div className="text-[12px] text-zinc-500">
            山札{a.drawPile.length} / 手札{a.hand.length} / 捨札{a.discard.length}
          </div>
        </>
      );
    }
    case 'status': {
      const info = STATUS_INFO[d.status];
      return (
        <>
          <div className="text-[16px] font-bold text-amber-100">
            {info.icon} {info.name}
            {d.status !== 'taunt' && ` ${d.amount}`}
          </div>
          <div className="text-[13px]">{info.text}</div>
          {d.status === 'taunt' && d.by && <div className="text-[13px] text-amber-300">挑発した味方：{getCharacter(d.by).name}</div>}
          {d.status !== 'taunt' && (
            <div className="mt-1 text-[12px] text-zinc-400">
              残り{d.amount}ターン。{d.side === 'enemy' ? '敵' : '味方'}フェーズ終了時に1減る。
            </div>
          )}
        </>
      );
    }
  }
}

/** 長押し中だけ出る詳細（操作はブロックしない） */
export function DetailPopup() {
  const detail = useDetail((s) => s.detail);
  const battle = useBattle((s) => s.battle);
  if (!detail) return null;
  return (
    <div className="pointer-events-none absolute inset-x-3 top-14 z-[70] rounded-xl border border-amber-400/60 bg-stone-950/97 p-3 leading-5">
      <Content d={detail} battle={battle} />
    </div>
  );
}
