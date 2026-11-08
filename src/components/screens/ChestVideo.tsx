// ===== 宝箱が開く動画（Midjourney 製。格＝宝箱の見た目ごとに1本） =====
// 動画は src/assets/video/chest-<格>.mp4（約2.8秒・300px・音なし。元は C:\dev\card-rpg-assets\chest-video\）。
// URL だけを登録し、ファイルは宝箱を開ける時に初めて読む（最初の読み込みは増えない）。
// 灰色の背景は、羊皮紙のような額の中で見せ、ふちを暗くぼかしてなじませる。
// 読めない・再生できない時は onDone を呼んで、今までの演出（光がはじける）に戻る。
import { useEffect, useRef } from 'react';
import type { Rarity } from '../../types';

const files = import.meta.glob('../../assets/video/chest-*.mp4', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const VIDEOS: Partial<Record<Rarity, string>> = {};
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/chest-(\w+)\.mp4$/);
  if (m) VIDEOS[m[1] as Rarity] = url;
}

/** その格の宝箱の動画の URL（無ければ undefined） */
export const chestVideoUrl = (rarity: Rarity): string | undefined => VIDEOS[rarity];

/** 動画の長さ（秒）。演出の段取りでは、少し余裕をみて待つ（読み込みが遅い時は、時間切れで先へ進む） */
export const CHEST_VIDEO_SECONDS = 2.8;

interface Props {
  src: string;
  /** true の間だけ見せて再生する。false の間も、読み込みのために置いておく */
  playing: boolean;
  /** 再生の速さ（高速モードでは速く） */
  speed: number;
  /** 再生が終わった（再生中だけ呼ぶ） */
  onDone: () => void;
  /** 読めなかった・再生できなかった（読み込み中にも呼ぶ） */
  onFail: () => void;
}

export function ChestVideo({ src, playing, speed, onDone, onFail }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const fail = useRef(onFail);
  fail.current = onFail;
  const live = useRef(playing);
  live.current = playing;
  useEffect(() => {
    const v = ref.current;
    if (!v || !playing) return;
    // iPhone の Safari で自動再生するには、音なし（muted）と画面内の再生（playsinline）が要る
    v.muted = true;
    v.currentTime = 0;
    v.playbackRate = speed;
    v.play().catch(() => fail.current());
  }, [playing, speed]);
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/55 ${playing ? '' : 'invisible'}`}
      data-chest-video={playing ? 'playing' : 'loading'}
      aria-hidden
    >
      {/* 羊皮紙の額 */}
      <div
        className="relative aspect-square rounded-lg p-2"
        style={{
          width: 'min(78vw, 300px)',
          background: 'linear-gradient(135deg, #ecdcb0, #c9a86a 48%, #e6d29c 70%, #b8935a)',
          border: '2px solid #6a4a1c',
          boxShadow: '0 0 0 1px #2a1a08, 0 6px 28px rgba(0,0,0,.85), inset 0 0 14px rgba(90,60,20,.6)',
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded">
          <video
            ref={ref}
            src={src}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            className="h-full w-full object-cover"
            style={{ filter: 'sepia(.18) saturate(1.05)' }}
            onEnded={() => live.current && done.current()}
            onError={() => fail.current()}
          />
          {/* 灰色の背景を羊皮紙の色に寄せ、ふちを暗くぼかす */}
          <span className="absolute inset-0" style={{ background: 'rgba(214,186,128,.22)', mixBlendMode: 'multiply' }} />
          <span className="absolute inset-0" style={{ background: 'radial-gradient(closest-side, transparent 58%, rgba(60,38,12,.55) 84%, rgba(30,18,6,.92) 100%)' }} />
        </div>
      </div>
    </div>
  );
}
