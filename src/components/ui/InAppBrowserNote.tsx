// ===== LINE などアプリの中のブラウザで開いた時の小さな案内（部屋に入る前だけ: タイトル・部屋に参加。点検 F4） =====
import { ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { inAppBrowser, inAppBrowserNote } from '../../net/inAppBrowser';

/** 閉じたら、このページを開いている間は出さない */
let dismissed = false;

export function InAppBrowserNote() {
  const [hidden, setHidden] = useState(dismissed);
  const text = inAppBrowserNote(inAppBrowser());
  if (!text || hidden) return null;
  return (
    <div className="flex items-start gap-1.5 rounded-lg border border-sky-300/40 bg-black/70 px-2 py-1.5 text-[12px] leading-4 text-sky-50" role="note" data-inapp-note>
      <ExternalLink size={14} className="mt-0.5 shrink-0 text-sky-300" />
      <span className="min-w-0 flex-1">{text}</span>
      <button
        aria-label="案内を閉じる"
        onClick={() => {
          dismissed = true;
          setHidden(true);
        }}
        className="btn -my-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-400"
      >
        <X size={14} />
      </button>
    </div>
  );
}
