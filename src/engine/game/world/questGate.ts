// ===== ダンジョンの扉の関門（鍵・町の依頼） =====
// 2つ目の鍵のダンジョンは1つ目の鍵、3つ目は2つ目の鍵と「町の依頼を1つ果たすこと」が要る（冒険を長くする。町に寄る理由を作る）
import { DUNGEONS } from '../../../data/dungeons';
import { getScenario } from '../../../data/scenarios';
import { QUESTS } from '../../../data/world';
import type { DungeonDef, GameState } from '../../../types';
import { dungeonTile, whereText } from './guide';

/** 報告まで済ませた町の依頼の数（船を借りる依頼は、海を渡るのに必ず受けるので数えない） */
export function finishedQuestCount(game: GameState): number {
  return (game.world?.quests ?? []).filter((q) => q.reported && !QUESTS.get(q.id).reward.some((o) => o.kind === 'ship')).length;
}

/** あといくつ依頼を果たせば扉が開くか（0 = 依頼の関門は無い・もう満たした） */
export function questsShort(game: GameState, def: DungeonDef): number {
  return Math.max(0, (def.requiresQuests ?? 0) - finishedQuestCount(game));
}

/** 扉が開かない理由（開く時は undefined）。鍵が先、依頼が後。from = キャラのいるマス（鍵のダンジョンの方角を足す。回1） */
export function dungeonGateError(game: GameState, def: DungeonDef, from?: number): string | undefined {
  const w = game.world!;
  const missing = (def.requiresKeys ?? []).filter((k) => !w.keys.includes(k));
  if (missing.length) {
    const names = getScenario(game.scenarioId).story?.keys ?? {};
    const keyNames = missing.map((k) => names[k] ?? k).join('・');
    // 最後のダンジョン以外は、どこで鍵が手に入るかも伝える（§4 C）
    if (!def.finale) {
      // 回1: 鍵のダンジョンの方角と地域も足す（「静寂の地下墓地」（南東・嘆きの沼の東））
      const places = missing.flatMap((k) => {
        const d = DUNGEONS.forScenario(game.scenarioId).find((x) => x.rewardKey === k);
        if (!d) return [];
        const at = dungeonTile(w, d.id);
        const where = at >= 0 ? whereText(game, w, from, at) : '';
        return [`「${d.name}」${where ? `（${where}）` : ''}`];
      });
      if (places.length) return `扉が開かない…。${keyNames}が要る。先に${places.join('・')}を制覇しよう`;
    }
    return `扉が開かない…（必要: ${keyNames}）`;
  }
  const short = questsShort(game, def);
  if (short > 0) return `扉が開かない…。町の依頼をあと${short}つ果たして、報告してから来よう`;
  return undefined;
}

/** 鍵はそろったのに、依頼が足りなくて開かないダンジョン（制覇の物語で次にすることを伝える） */
export function questGatedNext(game: GameState): DungeonDef | undefined {
  const w = game.world!;
  return DUNGEONS.forScenario(game.scenarioId).find(
    (d) => !d.random && !game.clearedDungeons.includes(d.id) && (d.requiresKeys ?? []).every((k) => w.keys.includes(k)) && questsShort(game, d) > 0,
  );
}
