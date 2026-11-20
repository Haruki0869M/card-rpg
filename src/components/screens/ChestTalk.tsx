// ===== 2人以上で宝箱を開ける時の相談（ステップ2） =====
// 開ける前: 候補ごとの成功率・器用・運・フォーカスを全員に見せ、だれでも「〇〇に任せる」を出せる（全員一致で決まる。扉と同じ形）
// 開けた後: 品物は戦闘の装備と同じ「欲しい／余れば／いらない」で取り合う（ClaimPanel）
import { Hand } from 'lucide-react';
import { BALANCE } from '../../data/balance';
import { PLAYER_COLOR } from '../../data/theme';
import { heroStats, sealStep, statChance } from '../../engine';
import { isLocalPlayer, LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import type { ChestState, Hero } from '../../types';
import { chanceAtLeast } from '../ui/CheckPanel';
import { HeroFace } from '../ui/game';
import { OutsiderNote, VoteChips } from '../ui/Votes';
import { voteOutsider } from './worldTurnGate';

/** 候補が開けた時の成功の確率（%）。鍵つき = 鍵が開く、鍵なし = 運のスロットの完全成功 */
export function openerChance(h: Hero, locked: boolean, focus: number): number {
  const slots = locked ? BALANCE.lockSlots : BALANCE.chestLuckSlots;
  const need = locked ? BALANCE.lockNeed : slots;
  const chance = statChance(h, locked ? 'dex' : 'luk', locked ? 'lock' : 'luck');
  return Math.round(chanceAtLeast(slots, Math.min(focus, slots, h.focus), chance, need) * 100);
}

/** 「だれが開けるか」の一覧（全員の画面に出る） */
export function OpenerPicker({ chest, heroes }: { chest: ChestState; heroes: Hero[] }) {
  const dispatchGame = useBattle((s) => s.dispatchGame);
  useOnline((s) => s.tick);
  // 封魔の宝箱の封印を解く判定は、鍵開けと同じ（器用）
  const sealed = sealStep(chest) === 'sealed';
  const locked = !chest.unlocked || sealed;
  const slots = locked ? BALANCE.lockSlots : BALANCE.chestLuckSlots;
  const best = [...heroes].sort((a, b) => openerChance(b, locked, b.focus) - openerChance(a, locked, a.focus))[0]?.id;
  const seatName = (h: Hero) => useOnline.getState().room?.seatName(h.playerId);
  // この宝箱に出ていない人の画面: 押しても票が入らないので、薄くして押せなくし、だれが選んでいるかを出す（2026-11-19）
  const game = useBattle((s) => s.game)!;
  const probe = { type: 'CHEST_OPENER', playerId: LOCAL_PLAYER, heroId: heroes[0]?.id ?? '' } as const;
  const outsider = voteOutsider(game, probe, isLocalPlayer);
  return (
    <div className="flex flex-col gap-1" data-opener-picker>
      <OutsiderNote cmd={probe} />
      <div className="text-[12px] leading-4 text-zinc-300">
        だれが開ける？ 全員が同じ人を選ぶと決まります（{sealed ? `封印を解く人。器用の判定・${slots}枠のうち${BALANCE.lockNeed}つで罠を避ける。その後、番人との戦闘` : locked ? `器用の判定・${slots}枠のうち${BALANCE.lockNeed}つで鍵が開く` : `運の判定・${slots}枠。成功が多いほど中身の格が上がる`}）
      </div>
      {heroes.map((h) => {
        const st = heroStats(h);
        const p0 = openerChance(h, locked, 0);
        const pMax = openerChance(h, locked, h.focus);
        const cmd = { type: 'CHEST_OPENER', playerId: LOCAL_PLAYER, heroId: h.id } as const;
        const chosen = chest.opener === h.id;
        return (
          // 自動の確認用の見えない印（B9）: 「おすすめ」の字が出ている人・フォーカス0の時の成功率（太字の％と同じ数）
          <div key={h.id} className={`flex items-center gap-1.5 rounded-lg p-1 ${chosen ? 'bg-amber-500/25 ring-1 ring-amber-300' : 'bg-black/35'}`} data-opener={h.id} data-opener-best={h.id === best ? 1 : undefined} data-opener-chance={p0}>
            <HeroFace hero={h} size={32} />
            <span className="min-w-0 flex-1 leading-4">
              <span className="flex items-center gap-1 text-[13px] font-bold">
                <span className="rounded px-1 text-[12px] text-black" style={{ background: PLAYER_COLOR[h.playerId] }}>
                  {h.playerId}
                </span>
                <span className="truncate">{h.name}</span>
                {h.id === best && <span className="shrink-0 text-[12px] text-amber-300">おすすめ</span>}
              </span>
              <span className="block text-[12px] text-zinc-300 tabular-nums">
                {sealed ? '罠を避ける' : locked ? '鍵が開く' : '完全成功'} <b className="text-amber-200">{p0}%</b>
                {pMax !== p0 && <>（フォーカス{Math.min(slots, h.focus)}で{pMax}%）</>}
              </span>
              <span className="block truncate text-[12px] text-zinc-400 tabular-nums">
                器用{st.dex}・運{st.luk}・フォーカス{h.focus}
                {seatName(h) ? `・${seatName(h)}` : ''}
              </span>
            </span>
            <button onClick={() => dispatchGame(cmd)} disabled={outsider} data-option-wait={outsider ? 1 : undefined} className={`btn flex h-11 shrink-0 items-center gap-0.5 rounded-lg px-2 text-[13px] font-bold ${chosen ? 'btn-gold' : 'btn-dark'}`}>
              <Hand size={14} />
              任せる
              <VoteChips cmd={cmd} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
