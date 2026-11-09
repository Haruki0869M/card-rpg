// ===== 伝承の書の敵の節（Step C ②）: めったに会えない敵・隠しボス =====
// データから数える（手で一覧を書かない）。読むだけの純粋な関数。
import { ENEMIES } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { SCENARIOS } from '../../data/scenarios';

export interface HiddenBossInfo {
  enemyId: string;
  scenarioId: string;
  scenarioName: string;
  regionName: string;
  /** まだ見ていない時に出すうわさ（どの地域に出るか） */
  hint: string;
}

/** めったに会えない敵（敵のデータの rare） */
export function rareEnemyIds(): string[] {
  return ENEMIES.all.filter((e) => e.rare).map((e) => e.id);
}

/** 隠しボス: 「隠しボスの名所」（地図のイベントで hiddenIn がある物）の戦闘に出る敵。地域とシナリオもデータから */
export function hiddenBosses(): HiddenBossInfo[] {
  const out: HiddenBossInfo[] = [];
  for (const ev of EVENTS.all) {
    if (ev.where !== 'map' || !ev.hiddenIn) continue;
    const scenarioId = EVENTS.scenarioOf(ev.id);
    const sc = scenarioId ? SCENARIOS.tryGet(scenarioId) : undefined;
    const region = sc?.map?.regions.find((r) => r.id === ev.hiddenIn);
    if (!sc || !region) continue;
    for (const opt of ev.options)
      for (const o of opt.success as { kind: string; enemies?: { defId: string }[] }[]) {
        if (o.kind !== 'battle') continue;
        for (const e of o.enemies ?? []) {
          if (!ENEMIES.has(e.defId) || out.some((x) => x.enemyId === e.defId)) continue;
          out.push({ enemyId: e.defId, scenarioId: sc.id, scenarioName: sc.name, regionName: region.name, hint: `${region.name}の地域のどこかに眠るという…` });
        }
      }
  }
  return out;
}
