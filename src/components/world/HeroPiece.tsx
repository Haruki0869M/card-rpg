// ===== ワールドマップの駒（チェスの駒のようなミニチュア） =====
// 金色の丸い台座に、プレイヤーの色の輪。台座の上に立つのは:
//   - src/assets/art/piece/<職業ID>-<male|female>.webp があれば、そのミニチュアの絵
//   - 無ければ、今の顔の絵をメダルにして立てる（仮の見た目）
// 移動では「持ち上げる → 隣のマスへ → カツンと置く」。見た目だけで、ゲームの状態や乱数には関係しない。
import { useId } from 'react';
import { artImage, CharacterArt } from '../../art';
import type { Hero } from '../../types';

/** 仮の見た目の顔のメダルの直径（駒の箱の大きさに対する割合） */
export const MEDAL = 0.72;

export function pieceImage(hero: Pick<Hero, 'classId' | 'gender'>) {
  return artImage(`piece/${hero.classId}-${hero.gender}`);
}

interface Props {
  hero: Pick<Hero, 'classId' | 'gender' | 'name'>;
  /** 駒の箱の大きさ（px）。台座はこの箱の下の方、絵は上へはみ出して立つ */
  size: number;
  /** 台座の輪の色（プレイヤーの色） */
  ringColor: string;
  active?: boolean;
  /** 1歩ごとの持ち上げ演出をするか */
  hopping?: boolean;
  /** 1歩ごとに変わる値（演出をやり直すため） */
  stepKey?: string | number;
  /** 1歩にかける時間（ms） */
  stepMs?: number;
  /** 簡易表示: 持ち上げを小さくし、土ぼこりを出さない */
  simple?: boolean;
}

export function HeroPiece({ hero, size: s, ringColor, active, hopping, stepKey, stepMs = 170, simple }: Props) {
  const uid = useId().replace(/:/g, '');
  const img = pieceImage(hero);
  const dur = `${Math.round(stepMs * 0.8)}ms`;
  const lift = hopping ? (simple ? 'piece-lift-simple' : 'piece-lift') : '';
  return (
    <>
      {/* 床の影（駒を持ち上げると小さく薄くなる。影は床に残る） */}
      <span
        key={`sh${stepKey}`}
        className={`absolute rounded-[50%] bg-black/60 ${hopping ? 'piece-shadow' : ''}`}
        style={{ left: s * 0.08, top: s * 0.82, width: s * 0.84, height: s * 0.2, filter: 'blur(1.5px)', animationDuration: dur }}
      />
      {/* 手番の光（台座のまわり） */}
      {active && (
        <span
          className="glow-pulse absolute rounded-[50%]"
          data-piece-active
          style={{ left: -s * 0.02, top: s * 0.6, width: s * 1.04, height: s * 0.4, boxShadow: '0 0 0 2px #ffd76a, 0 0 12px 3px #ffd76a' }}
        />
      )}
      <span key={`lf${stepKey}`} className={`absolute inset-0 block ${lift}`} style={{ animationDuration: dur }}>
        {/* 台座: 金色の上面と、プレイヤーの色の側面の輪 */}
        <svg className="absolute" style={{ left: s * 0.06, top: s * 0.62, width: s * 0.88, height: s * 0.36, overflow: 'visible' }} viewBox="0 0 100 40" aria-hidden>
          <defs>
            <linearGradient id={`top${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff1b8" />
              <stop offset="0.55" stopColor="#d9a93c" />
              <stop offset="1" stopColor="#8a5d16" />
            </linearGradient>
            <linearGradient id={`side${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity="0.45" />
              <stop offset="0.35" stopColor="#fff" stopOpacity="0.25" />
              <stop offset="1" stopColor="#000" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <ellipse cx="50" cy="27" rx="47" ry="12" fill={ringColor} stroke="#1a1208" strokeWidth="2" />
          <rect x="3" y="14" width="94" height="13" fill={ringColor} />
          <rect x="3" y="14" width="94" height="13" fill={`url(#side${uid})`} />
          <line x1="3" y1="14" x2="3" y2="27" stroke="#1a1208" strokeWidth="2" />
          <line x1="97" y1="14" x2="97" y2="27" stroke="#1a1208" strokeWidth="2" />
          <ellipse cx="50" cy="14" rx="47" ry="12" fill={`url(#top${uid})`} stroke="#5a3c0c" strokeWidth="2" />
          <ellipse cx="50" cy="13" rx="34" ry="7.5" fill="none" stroke="#fff6cf" strokeOpacity="0.7" strokeWidth="1.5" />
        </svg>
        {img ? (
          // ミニチュアの絵（下を台座の上面にそろえる）
          <img
            src={img}
            alt=""
            draggable={false}
            className="absolute object-contain object-bottom"
            style={{ left: s * 0.0, top: -s * 0.47, width: s, height: s * 1.25, filter: 'drop-shadow(0 1px 1px #000)' }}
          />
        ) : (
          <>
            {/* 仮の見た目: 顔のメダルを金の軸で台座に立てる */}
            <span className="absolute rounded-sm" style={{ left: s * 0.43, top: s * 0.5, width: s * 0.14, height: s * 0.22, background: 'linear-gradient(90deg,#7a5214,#f3d27a,#7a5214)' }} />
            <span
              className="absolute flex items-center justify-center rounded-full"
              style={{ left: s * (0.5 - MEDAL / 2), top: -s * 0.14, width: s * MEDAL, height: s * MEDAL, background: 'linear-gradient(160deg,#fff1b8,#c9932c 60%,#6e4a10)', boxShadow: '0 1px 2px #000' }}
            >
              {/* 縁は金色にそろえる（色は台座の輪＝プレイヤーの色だけにして、見分けやすくする） */}
              <span className="block overflow-hidden rounded-full bg-[#1d2440]" style={{ width: s * (MEDAL - 0.08), height: s * (MEDAL - 0.08), boxShadow: 'inset 0 0 0 1px #5a3c0c' }}>
                <CharacterArt classId={hero.classId} gender={hero.gender} face className="h-full w-full" />
              </span>
            </span>
          </>
        )}
      </span>
      {/* カツンと置いた時の小さな土ぼこり */}
      {hopping && !simple && (
        <span
          key={`dust${stepKey}`}
          className="piece-dust absolute rounded-[50%] border-2 border-amber-100/70"
          style={{ left: s * 0.02, top: s * 0.7, width: s * 0.96, height: s * 0.3, animationDelay: `${Math.round(stepMs * 0.6)}ms` }}
        />
      )}
    </>
  );
}
