// ===== みんなで決める操作の表示（M3-C）: だれがどれを選んだか・だれを待っているか =====
import { PLAYER_COLOR } from '../../data/theme';
import { currentVote, needsVote, notVoted, voters, votesFor } from '../../engine';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { EVENTS } from '../../data/events';
import type { GameCommand, GameState, PlayerId } from '../../types';

const name = (p: PlayerId) => useOnline.getState().room?.seatName(p) ?? p;

/** 選んだ操作の短い説明 */
function voteLabel(game: GameState, cmd: GameCommand): string {
  switch (cmd.type) {
    case 'ENTER_ROOM':
      // 第3段階: 部屋の中身は開けるまで分からないので、種類は出さない
      return '扉を開ける';
    case 'RETREAT':
      return '撤退';
    case 'CHOOSE_EVENT':
      return game.event ? `「${EVENTS.get(game.event.eventId).options[cmd.optionIndex]?.label ?? ''}」` : '選択';
    case 'REST':
      return cmd.kind === 'hp' ? '休む' : '瞑想';
    case 'LEAVE_CHEST':
      return '先へ進む';
    case 'CHEST_OPENER':
    case 'EXPLORE_ROLLER':
      return `${game.heroes.find((h) => h.id === cmd.heroId)?.name ?? ''}に任せる`;
    default:
      return '続ける';
  }
}

/** その選択肢を選んだ人の席の印（ボタンの中に置く） */
export function VoteChips({ cmd }: { cmd: GameCommand }) {
  const game = useBattle((s) => s.game);
  useOnline((s) => s.tick);
  if (!game || !needsVote(game, cmd)) return null;
  const who = votesFor(game, cmd);
  if (!who.length) return null;
  return (
    <span className="ml-1 inline-flex gap-0.5 align-middle" aria-label={`${who.join('・')}が選択`}>
      {who.map((p) => (
        <span key={p} className="rounded px-1 text-[12px] leading-4 font-bold text-black" style={{ background: PLAYER_COLOR[p] }}>
          {p}
        </span>
      ))}
    </span>
  );
}

/**
 * みんなの選択を待っている時の枠。
 * 画面全体に重ねるのではなく、各画面の選択肢のボタンの上（パネルの中）に普通の要素として置く
 * （重ねていた時、オンラインで宝箱の「任せる」などのボタンが隠れて見えなくなった。2026-11-10 の実機の不具合）
 */
export function VoteStatus({ className = '' }: { className?: string }) {
  const game = useBattle((s) => s.game);
  useOnline((s) => s.tick);
  if (!game) return null;
  const v = currentVote(game);
  if (!v || !Object.keys(v.picks).length) return null;
  const waiting = notVoted(game);
  if (!waiting.length || voters(game).length < 2) return null;
  const meWaiting = waiting.filter((p) => isLocalPlayer(p));
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl border border-sky-300/50 bg-black/70 px-3 py-1.5 text-[13px] text-sky-50 ${className}`} data-vote-status>
      <div className="text-center font-bold">{meWaiting.length ? 'あなたの選択を待っています' : 'みんなの選択を待っています'}</div>
      {voters(game).map((p) => (
        <div key={p} className="flex items-center gap-1.5">
          <span className="rounded px-1 text-[12px] font-bold text-black" style={{ background: PLAYER_COLOR[p] }}>
            {p}
          </span>
          <span className="min-w-0 flex-1 truncate">{name(p)}</span>
          <span className={v.picks[p] ? 'text-amber-200' : 'text-zinc-500'}>{v.picks[p] ? voteLabel(game, v.picks[p]!) : '考え中…'}</span>
        </div>
      ))}
    </div>
  );
}
