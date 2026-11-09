// ===== うちの子図鑑・マイペット（伝承の書。K5） =====
// 自分のキャラが連れていたお供を1匹ずつ残し、♡5か「ダンジョンを一緒に3回クリア」でマイペットに登録できる。
// マイペットは、次の冒険のスタートの町で30G払うと、最初から連れて行ける（強さは変わらない）。
import { Heart, PawPrint } from 'lucide-react';
import { createContext, useContext, useState } from 'react';
import { BALANCE } from '../../data/balance';
import { getPet, PETS } from '../../data/pets';
import { SCENARIOS } from '../../data/scenarios';
import { petLoveLevel } from '../../engine';
import { inStartTown } from '../../engine/game/world/town';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { canBeMyPet, setMyPet, uchinokoTotals, uchinokoUid, type UchinokoEntry } from '../../store/profile';
import { useProfile } from '../../store/profileStore';
import type { GameState, Hero } from '../../types';
import { PetToken } from '../ui/PetToken';

const colorOf = (e: Pick<UchinokoEntry, 'petId' | 'color'>) => {
  const def = PETS.tryGet(e.petId);
  return def?.colors.find((c) => c.id === e.color) ?? def?.colors[0];
};
const known = (e: UchinokoEntry) => PETS.has(e.petId);
const hearts = (love: number) => '♥'.repeat(petLoveLevel(love)) + '♡'.repeat(Math.max(0, 5 - petLoveLevel(love)));

/** 登録の条件の残り（例「ダンジョンをあと2回」） */
function conditionText(e: UchinokoEntry): string {
  const dc = uchinokoTotals(e).dungeonClears;
  return `♡5になるか、ダンジョンを一緒に${BALANCE.myPetDungeonClears}回クリアで登録できます（今 ${Math.min(dc, BALANCE.myPetDungeonClears)}/${BALANCE.myPetDungeonClears}回）`;
}

/** 冒険の途中にメニューから開いた伝承の書（読むだけ。Step C ②） */
export const LoreReadOnly = createContext(false);

/** マイペットの登録ボタン（登録済みなら外すボタン） */
export function MyPetToggle({ e, compact }: { e: UchinokoEntry; compact?: boolean }) {
  const isMy = useProfile((s) => s.profile.myPets.includes(e.uid));
  const update = useProfile((s) => s.update);
  const readOnly = useContext(LoreReadOnly);
  if (readOnly) return compact ? null : <div className="text-[12px] leading-4 text-zinc-400" data-mypet-readonly>{isMy ? 'マイペットに登録ずみ。' : ''}登録・解除は、タイトル画面の伝承の書でできます。</div>;
  if (isMy)
    return (
      <button onClick={() => update((p) => setMyPet(p, e.uid, false))} className={`btn btn-dark flex min-h-11 items-center justify-center gap-1 rounded-lg px-3 text-[13px] ${compact ? '' : 'w-full'}`} data-mypet-toggle="off">
        マイペットから外す
      </button>
    );
  if (!canBeMyPet(e)) return compact ? null : <div className="text-[12px] leading-4 text-zinc-400">{conditionText(e)}</div>;
  return (
    <button onClick={() => update((p) => setMyPet(p, e.uid, true))} className={`btn btn-gold flex min-h-11 items-center justify-center gap-1 rounded-lg px-3 text-[14px] font-bold ${compact ? '' : 'w-full'}`} data-mypet-toggle="on">
      <Heart size={16} /> マイペットに登録
    </button>
  );
}

/** うちの子1匹の詳細（伝承の書の下から出る板） */
export function UchinokoDetail({ uid }: { uid: string }) {
  const e = useProfile((s) => s.profile.uchinoko.find((x) => x.uid === uid));
  const isMy = useProfile((s) => s.profile.myPets.includes(uid));
  if (!e || !known(e)) return null;
  const def = getPet(e.petId);
  const col = colorOf(e)!;
  const t = uchinokoTotals(e);
  const met = SCENARIOS.tryGet(e.scenarioId)?.name;
  return (
    <div className="text-[13px] leading-5" data-uchinoko-detail>
      <div className="flex items-center gap-3">
        <div className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full bg-pink-300/10">
          <PetToken pet={e} size={84} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[20px] leading-7 text-amber-100">{e.name}</div>
          <div className="text-zinc-300">
            {def.name}・{col.name}
            {col.rarity === 'rare' ? '✨' : ''}
          </div>
          <div className="text-[15px] text-pink-300" aria-label={`懐き度 ${petLoveLevel(e.love)}`}>{hearts(e.love)}</div>
          {isMy && <span className="rounded-full bg-pink-700/60 px-2 py-0.5 text-[12px] text-pink-100">マイペット</span>}
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-black/30 p-2">
        <div className="font-display text-[14px] text-pink-200">思い出</div>
        {met && <div>「{met}」で出会った</div>}
        <div>一緒の冒険 {t.adventures}回・クリア {t.clears}回</div>
        <div>一緒にクリアしたダンジョン {t.dungeonClears}回・戦闘で活躍 {t.acts}回</div>
      </div>
      <div className="mt-2">
        <MyPetToggle e={e} />
      </div>
    </div>
  );
}

/** 伝承の書「お供」のタブの上の方: マイペットと、うちの子図鑑 */
export function UchinokoSection({ onOpen }: { onOpen: (uid: string) => void }) {
  const list = useProfile((s) => s.profile.uchinoko).filter(known);
  const myPets = useProfile((s) => s.profile.myPets);
  const mine = myPets.map((uid) => list.find((e) => e.uid === uid)).filter((e): e is UchinokoEntry => !!e);
  const others = [...list].reverse();
  return (
    <div className="mb-3 flex flex-col gap-2" data-uchinoko>
      <div>
        <div className="font-display mb-1 flex items-center gap-1 text-[15px] text-pink-200">
          <Heart size={15} /> マイペット
        </div>
        {mine.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1" data-mypets>
            {mine.map((e) => (
              <button key={e.uid} onClick={() => onOpen(e.uid)} className="btn flex w-[76px] shrink-0 flex-col items-center gap-0.5 rounded-xl bg-pink-300/10 px-1 py-1.5" data-mypet={e.uid}>
                <PetToken pet={e} size={44} />
                <span className="w-full truncate text-center text-[12px] text-amber-50">{e.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-black/30 p-2 text-[12px] leading-4 text-zinc-400">
            まだいません。♡5になるか、ダンジョンを一緒に{BALANCE.myPetDungeonClears}回クリアした子を登録すると、次の冒険のスタートの町で{BALANCE.myPetCost}Gで呼べます。
          </p>
        )}
      </div>
      <div>
        <div className="font-display mb-1 flex items-center gap-1 text-[15px] text-pink-200">
          <PawPrint size={15} /> うちの子図鑑 <span className="text-[12px] text-zinc-400">{list.length}匹</span>
        </div>
        {others.length === 0 && <p className="rounded-lg bg-black/30 p-2 text-[12px] leading-4 text-zinc-400">冒険でお供を迎えると、ここに1匹ずつ記録されます。</p>}
        <div className="flex flex-col gap-1">
          {others.map((e) => {
            const def = getPet(e.petId);
            const t = uchinokoTotals(e);
            return (
              <button key={e.uid} onClick={() => onOpen(e.uid)} className="btn flex min-h-[52px] items-center gap-2 rounded-lg bg-black/30 px-2 py-1 text-left" data-uchinoko-row={e.uid}>
                <PetToken pet={e} size={36} />
                <span className="min-w-0 flex-1 leading-4">
                  <b className="block truncate text-[14px] text-amber-50">{e.name}</b>
                  <span className="block truncate text-[12px] text-zinc-400">
                    {def.name}・{colorOf(e)?.name}・冒険{t.adventures}回
                  </span>
                </span>
                <span className="shrink-0 text-right text-[12px] leading-4">
                  <span className="block text-pink-300">{hearts(e.love)}</span>
                  {myPets.includes(e.uid) ? <span className="text-pink-200">マイペット</span> : canBeMyPet(e) ? <span className="text-amber-200">登録できます</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 町の画面: スタートの町で、マイペットを呼ぶ（1人1回・30G） */
export function MyPetCall({ game, hero }: { game: GameState; hero: Hero }) {
  const [open, setOpen] = useState(false);
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const profile = useProfile((s) => s.profile);
  if (!inStartTown(game) || !isLocalPlayer(hero.playerId) || hero.myPetCalled) return null;
  const busy = new Set(game.heroes.map((h) => h.pet?.myPetUid).filter(Boolean));
  const list = profile.myPets.map((uid) => profile.uchinoko.find((e) => e.uid === uid)).filter((e): e is UchinokoEntry => !!e && known(e) && !busy.has(e.uid));
  if (!list.length) return null;
  const poor = hero.gold < BALANCE.myPetCost;
  return (
    <div className="mx-3 mt-1 shrink-0 rounded-lg border border-pink-300/30 bg-pink-950/40 p-1.5" data-mypet-call>
      <button onClick={() => setOpen((v) => !v)} className="btn flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg text-[14px] font-bold text-pink-100">
        <Heart size={16} className="text-pink-300" /> マイペットを呼ぶ（{BALANCE.myPetCost}G）
      </button>
      {open && (
        <div className="mt-1 flex flex-col gap-1">
          {hero.pet && <p className="text-[12px] leading-4 text-zinc-300">今のお供（{hero.pet.name}）とはお別れになります。</p>}
          {poor && <p className="text-[12px] text-red-300">{hero.name}のお金が足りません</p>}
          {list.map((e) => (
            <button
              key={e.uid}
              disabled={poor}
              onClick={() => {
                const err = dispatchGame({ type: 'BRING_MY_PET', playerId: hero.playerId, heroId: hero.id, pet: { uid: e.uid, petId: e.petId, color: e.color, name: e.name, love: e.love } });
                if (!err) setOpen(false);
              }}
              className="btn flex min-h-[52px] items-center gap-2 rounded-lg bg-black/40 px-2 text-left"
              data-mypet-pick={e.uid}
            >
              <PetToken pet={e} size={36} />
              <span className="min-w-0 flex-1 leading-4">
                <b className="block truncate text-[14px] text-amber-50">{e.name}</b>
                <span className="block truncate text-[12px] text-zinc-400">{getPet(e.petId).name}・{colorOf(e)?.name}</span>
              </span>
              <span className="shrink-0 text-[12px] text-pink-300">{hearts(e.love)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 冒険の終わり（クリア・全滅）: この端末のキャラのお供を、うちの子図鑑に記録したことと、登録のボタン */
export function EndPetRecord({ game }: { game: GameState }) {
  const uchinoko = useProfile((s) => s.profile.uchinoko);
  const rows = game.heroes
    .filter((h) => h.pet && isLocalPlayer(h.playerId))
    .map((h) => ({ h, e: uchinoko.find((x) => x.uid === uchinokoUid(game, h)) }))
    .filter((r): r is { h: Hero; e: UchinokoEntry } => !!r.e && known(r.e));
  if (!rows.length) return null;
  return (
    <div className="mt-2 flex flex-col gap-1" data-end-pet-record>
      <div className="text-[12px] text-pink-200">うちの子図鑑に記録しました</div>
      {rows.map(({ h, e }) => (
        <div key={h.id} className="flex items-center gap-2 rounded-lg bg-pink-950/40 px-2 py-1">
          <PetToken pet={e} size={28} />
          <span className="min-w-0 flex-1 truncate text-[13px]">{e.name}</span>
          <MyPetToggle e={e} compact />
        </div>
      ))}
    </div>
  );
}
