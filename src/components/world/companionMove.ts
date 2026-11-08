// ===== 同行して動く時の返事（フェーズ2-C） =====
// 1台で遊ぶ時は、移動先の提案（moveProposal）に、この端末の担当の人の「一緒に行く」をまとめて送る。
// heroId には「その担当の同行キャラ」を入れる（store の actorOf が heroId から担当を決めるので、P2 以降の番でも止まらない）。
import type { GameCommand, GameState, PlayerId } from '../../types';

export function autoAgreeCommands(game: GameState, isLocal: (p: PlayerId) => boolean): GameCommand[] {
  const pr = game.world?.moveProposal;
  if (!pr) return [];
  return pr.owners
    .filter((p) => !pr.agreed.includes(p) && isLocal(p as PlayerId))
    .map((p) => ({
      type: 'WORLD_MOVE_AGREE' as const,
      playerId: p as PlayerId,
      heroId: pr.companions.find((id) => game.heroes.find((h) => h.id === id)?.playerId === p),
      accept: true,
    }));
}
