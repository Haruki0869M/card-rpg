// ===== 災厄の中ボスの札（段階7b・overhaul-plan-v2 §3-1）=====
// 上の帯（侵食度など）のすぐ下に「💀盗賊王：店+25%」・場所・倒すと手に入る専用の装備の効果（1行。2026-11-13）。2体以上の時、狭い画面（400px 未満）は「💀×2：店+25%・野営 半分」にまとめる。
// 押すと、悪さの中身・倒した時の報酬・場所が分かっているかを出す（見るだけ。だれでも開ける。ゲームの状態は変えない）
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import { placeName, scourgeList, scourgePlaceText } from '../../engine';
import type { GameState } from '../../types';

export function ScourgeStrip({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false);
  const list = scourgeList(game);
  if (!list.length) return null;
  const one = list.length === 1;
  const w = game.world!;
  // 回1（決定 4A）: 場所は、地域（「嘆きの沼の東」）までは最初から分かる。正確なマスは、塔に登るか近づくまで出さない
  const hidden = list.filter((s) => !s.seen);
  const placeLine = hidden.length
    ? `場所: ${hidden.map((s) => (one ? '' : `${s.short}は`) + placeName(game, w, s.tile)).join('・')}（くわしい場所は、塔に登ると分かる）`
    : '場所: 地図の💀の所';
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn z-10 mx-2 mt-1 flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-fuchsia-400/60 bg-fuchsia-950/80 px-2 text-left text-[12px] leading-4 font-bold text-fuchsia-100"
        aria-label="災厄の中ボスの説明"
        data-scourge-strip={list.length}
      >
        <span className="flex min-w-0 flex-1 flex-col">
        {one ? (
          <span className="min-w-0 truncate">💀{list[0].short}：{list[0].curseShort}</span>
        ) : (
          <>
            {/* 狭い画面: まとめる */}
            <span className="min-w-0 truncate min-[400px]:hidden" data-scourge-compact>
              💀×{list.length}：{list.map((s) => s.curseShort).join('・')}
            </span>
            {/* 広い画面: 1体ずつ */}
            <span className="hidden min-w-0 gap-2 min-[400px]:flex">
              {list.map((s) => (
                <span key={s.id} className="truncate">💀{s.short}：{s.curseShort}</span>
              ))}
            </span>
          </>
        )}
        <span className="min-w-0 truncate text-[12px] font-normal text-fuchsia-200" data-scourge-place>{placeLine}</span>
        {/* 倒すと手に入る専用の装備の効果（1行。はみ出す分は「…」。全文は押した時の説明に出す） */}
        <span className="min-w-0 truncate text-[12px] font-normal text-amber-100" data-scourge-gear>
          倒すと: {list.map((s) => `「${s.gearName}」${s.gearText}`).join('／')}
        </span>
        </span>
        <span className="ml-auto shrink-0 text-[12px] font-normal text-fuchsia-300">説明</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
            onClick={() => setOpen(false)}
          >
            <div role="dialog" aria-label="災厄の中ボス" onClick={(e) => e.stopPropagation()} className="panel panel-gold-edge flex max-h-[85%] w-full max-w-sm flex-col rounded-2xl p-3" data-scourge-dialog>
              <div className="flex items-center gap-2">
                <div className="font-display flex-1 text-[17px] text-fuchsia-100">💀 災厄の中ボス</div>
                <button onClick={() => setOpen(false)} aria-label="閉じる" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="mt-1 text-[12px] leading-4 text-zinc-400">生きている間、世界に悪さをする。倒すと悪さが消え、専用の装備を必ず落とす。逃げても巣に残る。</div>
              <div className="mt-2 flex min-h-0 flex-col gap-1.5 overflow-y-auto">
                {list.map((s) => (
                  <div key={s.id} className="rounded-xl border border-fuchsia-400/40 bg-black/40 p-2 text-[13px] leading-5" data-scourge-row={s.id}>
                    <div className="font-bold text-fuchsia-100">💀 {s.name}</div>
                    <div className="text-zinc-200">悪さ: {s.curseText}</div>
                    <div className="text-amber-100">倒すと: {s.rewardText}</div>
                    <div className="text-[12px] leading-4 text-amber-200/90" data-scourge-row-gear>装備の効果: {s.gearText}</div>
                    <div className={s.seen ? 'text-emerald-200' : 'text-zinc-300'} data-scourge-row-place>{scourgePlaceText(game, w, s.tile, s.seen)}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
