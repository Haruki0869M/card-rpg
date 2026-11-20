// ===== 災厄の中ボスの札（段階7b・overhaul-plan-v2 §3-1）=====
// 上の帯（侵食度など）のすぐ下に「💀盗賊王：店+25%」・場所・倒すと手に入る専用の装備の効果（1行。2026-11-13）。2体以上の時、狭い画面（400px 未満）は「💀×2：店+25%・野営 半分」にまとめる。
// 押すと、悪さの中身・倒した時の報酬・場所が分かっているかを出す（見るだけ。だれでも開ける。ゲームの状態は変えない）
// 狭い画面 回1（低い画面 = data-low の時だけ）: 世界マップでは仲間の列の「💀×N」の小さなボタン（variant="button"）、
// 町・神殿・祠の画面では1行の短い帯（variant="line" か full。低い画面では1行になる）。どちらも押すと、今と同じ説明の窓が開く（情報は消さない）。
// 低い町の画面（2026-11-20 オーナーの決定 A・検証 bot の指摘）: 町の画面が低い形（Places.tsx の SHORT_TOWN）の時は、1行の帯の代わりに、上の棒の中の「💀×N」の小さなボタン（variant="button"・compact）にまとめる。
// 帯の1行ぶん、店の一覧が広がる（390×540 で 105px → 150px 以上）。押すと、今と同じ説明の窓が開く（情報は消さない）。
// 低い画面の窓は、アプリのいちばん外の層に出す（LAYER.scourgeDialog。待ちの帯・通信の知らせより手前で、閉じるボタンが隠れない）
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { placeName, scourgeList, scourgePlaceText } from '../../engine';
import type { GameState } from '../../types';
import { useLowScreen } from '../../hooks/useLowScreen';
import { LAYER } from '../ui/layers';

export function ScourgeStrip({ game, variant = 'full', compact = false, className = '' }: { game: GameState; /** full = 今の4行の札（低い画面では1行の短い帯）・button = 💀×N の小さなボタン（低い画面の世界マップの仲間の列だけ） */ variant?: 'full' | 'button'; /** 低い画面でなくても、小さなボタンの形にする（低い町の画面の上の棒。360×640 は「低い画面」ではないが、町は低い形になる） */ compact?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const lowScreen = useLowScreen();
  // 小さなボタンの形の時は、窓も低い画面と同じ出し方（アプリのいちばん外の層）にする
  const low = lowScreen || (compact && variant === 'button');
  const list = scourgeList(game);
  if (!list.length) return null;
  const one = list.length === 1;
  const w = game.world!;
  // 回1（決定 4A）: 場所は、地域（「嘆きの沼の東」）までは最初から分かる。正確なマスは、塔に登るか近づくまで出さない
  const hidden = list.filter((s) => !s.seen);
  const placeLine = hidden.length
    ? `場所: ${hidden.map((s) => (one ? '' : `${s.short}は`) + placeName(game, w, s.tile)).join('・')}（くわしい場所は、塔に登ると分かる）`
    : '場所: 地図の💀の所';
  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 flex justify-center bg-black/70 px-4 ${low ? 'items-end pt-[110px] pb-2' : 'z-[60] items-center'}`}
          style={low ? { zIndex: LAYER.scourgeDialog } : undefined}
          onClick={() => setOpen(false)}
          data-scourge-backdrop
        >
          <div role="dialog" aria-label="災厄の中ボス" onClick={(e) => e.stopPropagation()} className={`panel panel-gold-edge flex w-full ${low ? 'max-h-full' : 'max-h-[85%]'} max-w-sm flex-col rounded-2xl p-3`} data-scourge-dialog>
            <div className="flex items-center gap-2">
              <div className="font-display flex-1 text-[17px] text-fuchsia-100">💀 災厄の中ボス</div>
              <button onClick={() => setOpen(false)} aria-label="閉じる" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-full" data-scourge-close>
                <X size={20} />
              </button>
            </div>
            <div className="mt-1 text-[12px] leading-4 text-zinc-400">生きている間、世界に悪さをし、鍵と最後のダンジョンのボス・中ボスに加護を掛ける。倒すと両方消え、専用の装備を必ず落とす。逃げても巣に残る。</div>
            <div className="mt-2 flex min-h-0 flex-col gap-1.5 overflow-y-auto">
              {list.map((s) => (
                <div key={s.id} className="rounded-xl border border-fuchsia-400/40 bg-black/40 p-2 text-[13px] leading-5" data-scourge-row={s.id}>
                  <div className="font-bold text-fuchsia-100">💀 {s.name}</div>
                  <div className="text-zinc-200">悪さ: {s.curseText}</div>
                  <div className="text-violet-200" data-scourge-row-boon>加護（ボス・中ボスの戦闘）: 《{s.boonName}》{s.boonText}</div>
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
  );
  // 低い画面: 窓はアプリのいちばん外の柱（[data-app-root] の中）に出す。見つからなければ、その場に出す
  const host = low && typeof document !== 'undefined' ? document.querySelector('[data-app-root] > div') : null;
  const dialogOut = host ? createPortal(dialog, host) : dialog;
  // 短い形の字（「💀×3：店+25%・野営 半分・…」。1体なら「💀盗賊王：店+25%」）
  const summary = `${one ? `💀${list[0].short}` : `💀×${list.length}`}：${list.map((s) => s.curseShort).join('・')}`;
  if (low && variant === 'button') {
    // 世界マップの仲間の列: 💀×N の小さなボタン。押すと開き、もう1度押す（= 窓の外）か×で閉じる
    return (
      <>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`btn flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-fuchsia-400/60 bg-fuchsia-950/80 px-1.5 text-[13px] leading-4 font-bold whitespace-nowrap text-fuchsia-100 ${className}`}
          aria-label={`災厄の中ボス${list.length}体（${summary}）。押すと説明`}
          aria-expanded={open}
          data-scourge-strip={list.length}
          data-scourge-button
        >
          💀×{list.length}
        </button>
        {dialogOut}
      </>
    );
  }
  if (low) {
    // 町・神殿・祠の画面（と、仲間の列が無い所）: 1行の短い帯（店の値段などの悪さがいつも見える）
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="btn z-10 mx-2 mt-1 flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-fuchsia-400/60 bg-fuchsia-950/80 px-2 text-left text-[12px] leading-4 font-bold text-fuchsia-100"
          aria-label={`災厄の中ボスの説明（${summary}）`}
          data-scourge-strip={list.length}
          data-scourge-line
        >
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <span className="ml-auto shrink-0 text-[12px] font-normal text-fuchsia-300">説明</span>
        </button>
        {dialogOut}
      </>
    );
  }
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
        {/* 寄り道の値打ち（2026-11-14 柱1）: 生きている間、ボス・中ボスに掛かる加護（1行） */}
        <span className="min-w-0 truncate text-[12px] font-normal text-violet-200" data-scourge-boon>
          💀加護: ボスに{list.map((s) => `「${s.boonName}」`).join('')}
        </span>
        </span>
        <span className="ml-auto shrink-0 text-[12px] font-normal text-fuchsia-300">説明</span>
      </button>
      {dialog}
    </>
  );
}
