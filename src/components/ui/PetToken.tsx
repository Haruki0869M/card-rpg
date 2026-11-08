// ===== お供（ペット）の小さな表示。世界マップ・ダンジョン・戦闘・パーティで共通（設計 v2.1 §4-2） =====
// 絵ができるまでは記号（絵文字）＋色の点で表示する。懐き度♡3でリボン、♡5でハートがふわっと出る
import { useBattle, speedFactor } from '../../store/battleStore';
import { TIMING } from '../../data/balance';
import { Heart } from 'lucide-react';
import { getPet } from '../../data/pets';
import { artImage } from '../../art/images';
import { describeAbility, isPetMaster, petAbilities, petExplore, petLoveLevel } from '../../engine';
import type { Hero } from '../../types';

export interface PetLook {
  petId: string;
  color: string;
  name: string;
  love: number;
}

/** 表示する場所の位置（キャラの大きさ size に対して）: 鳥は肩、小竜は浮く、それ以外は足元 */
export function petSpot(petId: string, size: number) {
  const perch = getPet(petId).perch;
  if (perch === 'shoulder') return { left: size * 0.58, top: -size * 0.22, size: size * 0.6 };
  if (perch === 'float') return { left: -size * 0.4, top: -size * 0.3, size: size * 0.6 };
  return { left: -size * 0.5, top: size * 0.45, size: size * 0.66 };
}

export function PetToken({ pet, size, hop, hopKey, hopDuration, ownerId }: { pet: PetLook; size: number; /** 移動の時に1歩遅れて跳ねる */ ownerId?: string; hop?: boolean; hopDuration?: number; hopKey?: string | number }) {
  const pulse = useBattle(s => ownerId ? s.petPulses[ownerId]?.id : undefined);
  const settings = useBattle(s => s.settings);
  const active = !!pulse && settings.cutinMode === 'standard';
  const def = getPet(pet.petId);
  const col = def.colors.find((c) => c.id === pet.color) ?? def.colors[0];
  const lv = petLoveLevel(pet.love);
  // 描いた絵（pet/<お供ID>-<色ID>.webp）があればそれを、無ければ記号（絵文字）＋色の点
  const img = artImage(`pet/${pet.petId}-${col.id}`);
  const anim = hop || active ? 'pet-hop' : def.perch === 'float' ? 'pet-float' : def.perch === 'shoulder' ? 'pet-perch' : 'pet-bob';
  return (
    <span className="pointer-events-none relative block" style={{ width: size, height: size }} aria-label={`${pet.name}（${def.name}）`} data-pet={pet.petId} data-pet-owner={ownerId} data-pet-pulse={pulse}>
      <span key={`${hopKey ?? 'idle'}:${pulse ?? 'idle'}`} className={`absolute inset-0 flex items-center justify-center ${anim}`} style={{ fontSize: Math.max(12, size * 0.82), lineHeight: 1, ...(active ? { animationDuration: `${TIMING.petPulse / speedFactor(settings)}s`, animationDelay: '0s' } : {}), ...(pulse && !active ? { outline: '2px solid #ffe9a8', borderRadius: '50%' } : {}), ...(hop && hopDuration ? { animationDuration: `${hopDuration * 0.8}s`, animationDelay: `${hopDuration * 0.15}s` } : {}), filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.8))' }}>
        {img ? <img src={img} alt="" draggable={false} className="h-full w-full object-contain" style={{ fontSize: 0 }} /> : def.icon}
      </span>
      {/* 色違いの印（絵がある時は絵そのものが色を表すので付けない） */}
      {!img && <span className="absolute rounded-full border border-black/70" style={{ right: 0, bottom: 0, width: size * 0.3, height: size * 0.3, background: col.color }} />}
      {lv >= 3 && (
        <span className="absolute" style={{ left: -size * 0.08, top: -size * 0.12, fontSize: Math.max(12, size * 0.38), lineHeight: 1 }} aria-hidden>
          🎀
        </span>
      )}
      {lv >= 5 && (
        <span className="pet-heart absolute text-pink-300" style={{ left: size * 0.35, top: -size * 0.35, fontSize: Math.max(12, size * 0.36), lineHeight: 1 }} aria-hidden>
          ♥
        </span>
      )}
    </span>
  );
}

/** 戦績の功労賞（旅のお供と活躍の回数） */
export function PetAwards({ heroes }: { heroes: { id: string; name: string; pet?: PetLook & { acts: number } }[] }) {
  const list = heroes.filter((h) => h.pet);
  if (!list.length) return null;
  return (
    <div className="mt-3 flex flex-col gap-1" data-pet-awards>
      <div className="font-display text-[15px] text-pink-200">旅のお供 功労賞</div>
      {list.map((h) => {
        const p = h.pet!;
        const def = getPet(p.petId);
        const col = def.colors.find((c) => c.id === p.color) ?? def.colors[0];
        return (
          <div key={h.id} className="flex items-center gap-2 rounded-lg bg-black/35 px-2 py-1 text-[13px]">
            <PetToken pet={p} size={30} />
            <span className="min-w-0 flex-1 leading-4">
              <b className="text-amber-100">{p.name}</b>（{def.name}・{col.name}）<span className="text-zinc-400">{h.name}のお供</span>
            </span>
            <span className="shrink-0 text-right leading-4">
              <span className="block text-pink-300">{'♡'.repeat(petLoveLevel(p.love))}</span>
              <span className="block tabular-nums">活躍 {p.acts}回</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** パーティ画面のお供の欄（名前・懐き度・効果・撫でる） */
export function PetPanel({ hero, canPat, onPat }: { hero: Hero; canPat: boolean; onPat: () => void }) {
  const p = hero.pet!;
  const def = getPet(p.petId);
  const col = def.colors.find((c) => c.id === p.color) ?? def.colors[0];
  const ex = petExplore(hero);
  const bird = def.perch === 'shoulder';
  const exText = [
    ex.vision && `視界+${ex.vision}`,
    ex.nightVision && '夜でも視界が狭くならない',
    ex.moveBonus && `移動力の判定の成功数+${ex.moveBonus}`,
    ex.luckBonus && `宝箱の運の判定+${ex.luckBonus}%`,
    ex.eventBonus && `イベントの判定+${ex.eventBonus}%`,
    ex.campHeal && `野営の回復+${Math.round(ex.campHeal * 100)}%`,
  ].filter(Boolean);
  return (
    <div className="mt-1 rounded-lg border border-pink-300/30 bg-pink-950/20 p-1.5" data-pet-panel>
      <div className="flex items-center gap-2">
        <PetToken pet={p} size={40} />
        <div className="min-w-0 flex-1 leading-4">
          <div className="text-[15px] font-bold text-pink-100">
            {p.name} <span className="text-[12px] font-normal text-zinc-300">（{def.name}・{col.name}）</span>
          </div>
          <div className="text-[12px] text-pink-300">
            {'♡'.repeat(petLoveLevel(p.love))}
            <span className="ml-1 text-zinc-400">活躍 {p.acts}回{isPetMaster(hero) ? '・獣使いで効果2倍' : ''}</span>
          </div>
        </div>
        {canPat && (
          <button onClick={onPat} className="btn btn-dark flex h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-[13px] font-bold text-pink-100">
            <Heart size={15} className="fill-pink-300 text-pink-300" />
            {bird ? 'カキカキ' : 'なでる'}
          </button>
        )}
      </div>
      <div className="mt-1 text-[12px] leading-4 text-zinc-200">
        {petAbilities(hero).map((a) => (
          <div key={a.name}>
            <span className="text-pink-200">《{a.name}》</span>
            {describeAbility(a)}
          </div>
        ))}
        {exText.length > 0 && <div className="text-sky-200">探索：{exText.join('・')}</div>}
        {!p.patted && canPat && <div className="text-zinc-400">撫でると、この冒険で1回だけフォーカス+1</div>}
      </div>
    </div>
  );
}
