import { predictCard } from '../../engine/battle/battle';
import { tierIndex } from '../../engine';
import { findUnit, nameOf, unitName } from '../../engine/battle/units';
import { cardOf } from '../../data/cards';
import { findAlly } from '../../engine';
import { isLocalPlayer, LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';

/** 保存された判定結果だけを表示する。抽選・支払いはコマンドで行う。 */
export function SlotPreviewDialog() {
  const battle = useBattle(s => s.battle), dispatch = useBattle(s => s.dispatch);
  const p = battle.slotPreview;
  if (!p) return null;
  const ally = findAlly(battle, p.characterId), inst = ally?.hand.find(c => c.uid === p.cardInstanceId);
  if (!ally || !inst) return null;
  const card = cardOf(inst), mine = isLocalPlayer(ally.playerId);
  const results = p.rerolled ? p.rerollResults : p.results;
  const target = p.targetId ? findUnit(battle, p.targetId) : undefined;
  return <div className="absolute inset-0 z-[190] flex items-center justify-center bg-black/80 p-3" onClick={e => e.stopPropagation()}>
    <section role="dialog" aria-modal="true" aria-label="星読みの結果" data-slot-preview className="panel panel-gold-edge max-h-[90%] w-full max-w-[440px] overflow-y-auto rounded-2xl p-4">
      <h2 className="font-display text-[24px] text-amber-100">星読み</h2>
      <p className="mt-1 text-[14px] text-zinc-200">{ally.name}の「{card.name}」</p>
      {target && <p className="mt-1 text-[14px] text-zinc-300">対象：{nameOf(target)}</p>}
      {p.allyTargetId && <p className="mt-1 text-[14px] text-sky-100">回復・支援先：{findAlly(battle, p.allyTargetId)?.name}</p>}
      <p className="mt-2 text-[14px]">成功率{p.chance}%・{results.filter(r => r !== 'miss').length}/{results.length}成功</p>
      <div className="my-3 flex flex-wrap justify-center gap-2" data-preview-results>
        {results.map((r, i) => <span key={i} className={`flex h-12 min-w-12 items-center justify-center rounded-xl border-2 px-2 text-[14px] font-bold ${r === 'miss' ? 'border-zinc-500 bg-zinc-900 text-zinc-300' : 'border-amber-300 bg-amber-950 text-amber-100'}`}>{r === 'focus' ? '確定' : r === 'hit' ? '成功' : '不成功'}</span>)}
      </div>
      <p className="text-[13px] leading-5 text-zinc-300">{p.rerolled ? '振り直し済みです。この結果でカードを使います。' : 'この結果を使うか、1回だけ振り直せます。フォーカス枠は確定成功のままです。'}</p>
      {predictCard(battle, ally.id, inst.uid, p.targetId, p.focusUsed, tierIndex(card, results.filter(r => r !== 'miss').length), p.allyTargetId).map(x => <p key={x.id} className="mt-1 text-[13px] text-sky-100">予測：{unitName(battle, x.id)} {x.text}（追加抽選の効果は目安）</p>)}
      <p className="mt-2 text-[12px] leading-5 text-zinc-400">確定時にマナ{card.cost}・フォーカス{p.focusUsed}を消費します。結果確認中はこの戦闘が待機します。</p>
      <div className="mt-3 flex flex-col gap-2">
        <button disabled={!mine || p.rerolled} onClick={() => dispatch({ type: 'REROLL_PREVIEW', playerId: LOCAL_PLAYER, characterId: ally.id })} className="btn btn-dark min-h-12 rounded-xl px-2 text-[15px] font-bold">振り直す（残り{p.rerolled ? 0 : 1}回）</button>
        <button disabled={!mine} onClick={() => dispatch({ type: 'CONFIRM_PREVIEW', playerId: LOCAL_PLAYER, characterId: ally.id })} className="btn btn-gold min-h-12 rounded-xl px-2 text-[15px] font-bold">この結果で使う</button>
      </div>
      {!mine && <p className="mt-2 text-center text-[14px] text-sky-200">{ally.name}の担当者が確認しています</p>}
    </section>
  </div>;
}
