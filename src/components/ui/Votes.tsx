// ===== みんなで決める操作の表示（M3-C）: だれがどれを選んだか・だれを待っているか =====
import { PLAYER_COLOR } from '../../data/theme';
import { currentVote, needsVote, notVoted, voters, votesFor } from '../../engine';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { EVENTS } from '../../data/events';
import { getRoomType } from '../../data/rules';
import type { GameCommand, GameState, PlayerId } from '../../types';

const name = (p: PlayerId) => useOnline.getState().room?.seatName(p) ?? p;

/** 選んだ操作の短い説明 */
function voteLabel(game: GameState, cmd: GameCommand): string {
  switch (cmd.type) {
    case 'ENTER_ROOM': {
      const r = game.dungeon?.rooms.find((x) => x.id === cmd.roomId);
      return r ? `${getRoomType(r.type).name}の部屋へ` : '部屋へ';
    }
    case 'RETREAT':
      return '撤退';
    case 'CHOOSE_EVENT':
      return game.event ? `「${EVENTS.get(game.event.eventId).options[cmd.optionIndex]?.label ?? ''}」` : '選択';
    case 'REST':
      return cmd.kind === 'hp' ? '休む' : '瞑想';
    case 'LEAVE_CHEST':
      return '先へ進む';
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

/** みんなの選択を待っている時の帯（画面の下に出す） */
export function VoteStatus() {
  const game = useBattle((s) => s.game);
  useOnline((s) => s.tick);
  if (!game) return null;
  const v = currentVote(game);
  if (!v || !Object.keys(v.picks).length) return null;
  const waiting = notVoted(game);
  if (!waiting.length || voters(game).length < 2) return null;
  const meWaiting = waiting.filter((p) => isLocalPlayer(p));
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-24 z-[65] flex flex-col gap-0.5 rounded-xl border border-sky-300/50 bg-black/90 px-3 py-2 text-[13px] text-sky-50">
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
