// ===== 確認の画面（取り返しのつかない操作の前に出す） =====
import { Crest } from './game';
import { motion } from 'framer-motion';

export function ConfirmDialog({ title, text, detail, ok, onOk, onCancel, danger = true }: { title: string; text: string; /** 何をするのかの1行（例: 取り除くカードの効果。回2） */ detail?: string; ok: string; onOk: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 px-6"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} className="panel panel-gold-edge panel-ornate w-full max-w-xs rounded-2xl p-4 pt-5">
        <Crest />
        <div className="font-display text-[18px]">{title}</div>
        <div className="mt-1 text-[13px] leading-5 text-zinc-300">{text}</div>
        {detail && <div className="mt-1 rounded-lg bg-black/35 px-2 py-1 text-[14px] leading-5 font-bold text-amber-200" data-confirm-detail>{detail}</div>}
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="btn btn-dark h-12 flex-1 rounded-lg font-bold">
            やめる
          </button>
          <button onClick={onOk} className={`btn h-12 flex-1 rounded-lg font-bold ${danger ? 'border border-red-300/60 bg-red-700' : 'btn-gold'}`}>
            {ok}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
