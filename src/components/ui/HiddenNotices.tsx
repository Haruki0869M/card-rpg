// ===== 【提案】隠れている通信の知らせの印（実機の不具合⑤・前の作業者の報告） =====
// 通信の知らせ（代わりに操作する・同行の誘い・ホストの引き継ぎ。OnlineOverlay、LAYER.online）は、
// シート（LAYER.sheet）や転職のカード選び（LAYER.cardPick）の後ろに回るので、開いている間は見えない。
// 知らせが出ている時だけ、シートやカード選びの見出しに小さな「お知らせ N」を出す。押すと閉じて（隠して）知らせが見える。
// 通信の部品（onlineStore・OnlineScreens）は別の作業者が直している最中なので触らず、画面に出ている知らせの数を数える。
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';

/** 今、画面に出ている通信の知らせの数（1秒ごとに数える。1台で遊ぶ時はいつも 0） */
export function useOnlineNoticeCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const count = () => setN(document.querySelector('[data-online-overlay]')?.childElementCount ?? 0);
    count();
    const t = setInterval(count, 1000);
    return () => clearInterval(t);
  }, []);
  return n;
}

/** 「お知らせ N」の小さな印。知らせが無い時は何も出さない */
export function HiddenNoticeBadge({ onOpen, className = '' }: { onOpen: () => void; className?: string }) {
  const n = useOnlineNoticeCount();
  if (!n) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={`btn flex h-11 shrink-0 items-center gap-1 rounded-full border border-amber-300/60 bg-amber-900/70 px-2.5 text-[12px] font-bold text-amber-100 ${className}`}
      aria-label={`お知らせ ${n}件。押すと閉じて見られます`}
      data-hidden-notice={n}
    >
      <Bell size={14} />
      お知らせ {n}
    </button>
  );
}
