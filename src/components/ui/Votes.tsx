// ===== みんなで決める操作の表示（M3-C）: だれがどれを選んだか・だれを待っているか =====
import { PLAYER_COLOR } from '../../data/theme';
import { currentVote, doorKind, needsVote, notVoted, omenInfoOf, voters, votesFor } from '../../engine';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { EVENTS } from '../../data/events';
import { getItem } from '../../data/items';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { voteOutsider } from '../screens/worldTurnGate';

const name = (p: PlayerId) => useOnline.getState().room?.seatName(p) ?? p;

/** 扉の票の説明（予兆の名前で。例「魔物の群れの扉」「ボスの扉」） */
function doorVoteLabel(game: GameState, roomId: string): string {
  const room = game.dungeon?.rooms.find((r) => r.id === roomId);
  if (!room) return '扉を開ける';
  const kind = doorKind(room);
  if (kind !== 'door') return kind === 'boss' ? 'ボスの扉' : '中ボスの扉';
  const info = omenInfoOf(room.type);
  return info ? `${info.name}の扉` : '扉を開ける';
}

/** 選んだ操作の短い説明 */
function voteLabel(game: GameState, cmd: GameCommand): string {
  switch (cmd.type) {
    case 'ENTER_ROOM':
      // 扉の予兆の名前で出す（例「魔物の群れの扉」。どの扉に票が入ったか分かるように）
      return doorVoteLabel(game, cmd.roomId);
    case 'RETREAT':
      return '撤退';
    case 'CHOOSE_EVENT':
      return game.event ? `「${EVENTS.get(game.event.eventId).options[cmd.optionIndex]?.label ?? ''}」` : '選択';
    case 'REST':
      return cmd.kind === 'hp' ? '休む' : cmd.kind === 'focus' ? '瞑想' : '技を磨く';
    case 'LEAVE_CHEST':
      return '先へ進む';
    case 'CHEST_OPENER':
      return `${game.heroes.find((h) => h.id === cmd.heroId)?.name ?? ''}に任せる`;
    // 寄り道の値打ち（2026-11-14）: 秘宝の3択・抜け道
    case 'PICK_RELIC': {
      const r = game.chest?.relics?.[cmd.optionIndex];
      return r ? `「${getItem(r.itemId).name}」` : '秘宝';
    }
    case 'RETURN_TO_HUB':
      return cmd.kind === 'shortcut' ? '抜け道を通る' : '入口へ戻る';
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
    <span className="ml-1 inline-flex gap-0.5 align-middle" aria-label={`${who.join('・')}が選択`} data-vote-seats={who.join(',')}>
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

/**
 * その場面にいない人の画面に出す短い1行「P1 〇〇さん・P2 △△さんが選んでいます」（2026-11-19 検証 bot の指摘）。
 * 票のボタンは薄くして押せなくする（voteOutsider）。この端末が票を入れられる時は何も出さない
 */
export function OutsiderNote({ cmd, className = '' }: { cmd: GameCommand; className?: string }) {
  const game = useBattle((s) => s.game);
  useOnline((s) => s.tick);
  if (!game || !voteOutsider(game, cmd, isLocalPlayer)) return null;
  const who = voters(game);
  return (
    <div className={`flex flex-wrap items-center justify-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[13px] leading-5 text-zinc-100 ${className}`} role="status" data-vote-outsider={who.join(',')}>
      {who.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          <span className="rounded px-1 text-[12px] font-bold text-black" style={{ background: PLAYER_COLOR[p] }}>
            {p}
          </span>
          {name(p)}さん{i < who.length - 1 ? '・' : ''}
        </span>
      ))}
      <span>が選んでいます</span>
    </div>
  );
}
