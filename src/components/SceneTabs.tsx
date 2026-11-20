// ===== 場面の切り替え（世界マップと、ダンジョンに入ったキャラたちの場面。M3-C） =====
// ダンジョンの場面があるときだけ、画面の上に出す。この端末の操作を待っている場面には印を付ける
import { Map as MapIcon } from 'lucide-react';
import { WORLD_SCENE, viewOf } from '../engine';
import { isLocalPlayer } from '../store/battleConfig';
import { useBattle } from '../store/battleStore';
import { useOnline } from '../store/onlineStore';
import type { GameState } from '../types';
import { HeroFace } from './ui/game';
import { sceneTabLabels } from './sceneTabLabels';

/** その場面が、この端末の操作を待っているか */
export function sceneNeedsMe(full: GameState, scene: string): boolean {
  const v = viewOf(full, scene);
  const mine = (id: string) => {
    const h = full.heroes.find((x) => x.id === id);
    return !!h && isLocalPlayer(h.playerId);
  };
  const turnInExp = (id: string) => !!full.expeditions?.some((x) => x.heroes.includes(id));
  if (scene === WORLD_SCENE) {
    if (v.mode === 'world') return !!v.world?.turn && mine(v.world.turn) && !turnInExp(v.world.turn);
    return (v.party ?? (v.world ? [v.world.turn] : [])).some(mine) || (!!v.town && mine(v.town.heroId)) || (!!v.shrine && mine(v.shrine.heroId));
  }
  if (v.mode === 'battle' && v.battle?.phase === 'enemy') return false;
  // 世界マップのあるシナリオ: ダンジョンのパーティの番の時だけ
  if (full.world && !(v.party ?? []).includes(full.world.turn)) return false;
  return (v.party ?? []).some(mine);
}

export function SceneTabs() {
  const full = useBattle((s) => s.full);
  const scene = useBattle((s) => s.scene);
  const screen = useBattle((s) => s.screen);
  const setScene = useBattle((s) => s.setScene);
  useOnline((s) => s.tick);
  const exps = full?.expeditions ?? [];
  if (!full || screen !== 'game' || !exps.length || full.mode === 'gameover' || full.mode === 'ending') return null;
  const tabs = [
    {
      id: WORLD_SCENE,
      label: '世界マップ',
      heroes: full.heroes.filter((h) => h.hp > 0 && !h.retired && !exps.some((x) => x.heroes.includes(h.id))),
    },
    ...exps.map((x, i) => ({
      id: x.id,
      label: sceneTabLabels(exps, full.heroes)[i],
      heroes: full.heroes.filter((h) => x.heroes.includes(h.id)),
    })),
  ].filter((t) => t.id !== WORLD_SCENE || t.heroes.length > 0);
  return (
    <div role="tablist" aria-label="場面の切り替え" className="flex shrink-0 gap-1 border-b border-amber-300/40 bg-gradient-to-b from-[#07060c] to-[#120f20] px-1 pt-1">
      {tabs.map((t) => {
        const on = t.id === scene;
        const need = !on && sceneNeedsMe(full, t.id);
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => setScene(t.id)}
            data-scene-tab={t.id}
            data-scene-need={need ? '' : undefined}
            className={`btn relative flex h-11 min-w-0 flex-1 items-center gap-1 rounded-t-xl border-x border-t px-1.5 text-[12px] font-bold ${on ? 'border-amber-300/80 bg-gradient-to-b from-[#3a3258] to-[#1c1830] text-amber-50 shadow-[0_-2px_10px_rgba(255,200,90,.25)]' : 'border-white/10 bg-black/40 text-zinc-400'}`}
          >
            {t.id === WORLD_SCENE && <MapIcon size={14} className="shrink-0 text-emerald-300" />}
            <span className="min-w-0 truncate">{t.label}</span>
            <span className="ml-auto flex shrink-0 -space-x-2">
              {t.heroes.slice(0, 3).map((h) => (
                <HeroFace key={h.id} hero={h} size={22} />
              ))}
            </span>
            {need && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-black" aria-label="操作を待っています" />}
          </button>
        );
      })}
    </div>
  );
}
