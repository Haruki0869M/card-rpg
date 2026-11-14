// ===== ワールドマップの駒（チェスの駒のようなミニチュア） =====
// 丸い台座（2026-11-15 作り直し）:
//   - 側面の帯 = プレイヤーの色。ふちの金属 = 今のジョブの段（基本 = 銅・中位 = 銀・最上位 = 金・特殊 = 紫の水晶）
//   - 前に盾の形の銘板。中に、今のジョブの得意な武器の絵（item/<武器のアイコン>）。転職すると変わる
//   - 描いた台座の絵（ui/piece-base と、帯の形 ui/piece-base-band）・銘板の枠の絵（ui/piece-plate-<段>）が
//     あれば使い、無ければプログラムで描く
// 台座の上に立つのは:
//   - src/assets/art/piece/<基本職ID>-<male|female>.webp があれば、そのミニチュアの絵
//     （駒は基本職の16人分だけ。転職しても、転職の元をたどった基本職の駒を使う。2026-11-14 オーナーの決定）
//   - 無ければ、今の顔の絵をメダルにして立てる（仮の見た目）
// 移動では「持ち上げる → 隣のマスへ → カツンと置く」。見た目だけで、ゲームの状態や乱数には関係しない。
import { useId } from 'react';
import { artImage, CharacterArt } from '../../art';
import { CLASSES } from '../../data/classes';
import { WEAPON_TYPES } from '../../data/rules';
import type { Hero, JobTier } from '../../types';

/** 仮の見た目の顔のメダルの直径（駒の箱の大きさに対する割合） */
export const MEDAL = 0.72;

/** 転職の元（from）をたどって、基本職のIDを返す（元が無ければ、そのジョブ自身） */
export function baseClassId(classId: string): string {
  let id = classId;
  for (let i = 0; i < 8; i++) {
    const from = CLASSES.tryGet(id)?.from?.[0];
    if (!from) break;
    id = from;
  }
  return id;
}

export function pieceImage(hero: Pick<Hero, 'classId' | 'gender'>) {
  return artImage(`piece/${baseClassId(hero.classId)}-${hero.gender}`);
}

/** 段ごとの金属の色（明るい・中・暗い） */
export const TIER_METAL: Record<JobTier, { light: string; mid: string; dark: string }> = {
  base: { light: '#f0b384', mid: '#b8703c', dark: '#5e3216' },
  mid: { light: '#f4f7fb', mid: '#a9b4c2', dark: '#4c5664' },
  top: { light: '#fff1b0', mid: '#d9a93c', dark: '#6e4a10' },
  special: { light: '#ead2ff', mid: '#9a5ad6', dark: '#3e1866' },
};

/** 描いた台座の絵の寸法（scripts/art/build_pedestal.py が表示する値）: 横:縦と、上面のだ円の真ん中の高さ（絵の高さに対する割合） */
const BASE_ART = { aspect: 3.232, topCy: 0.341 };

/** 絵の形でくり抜く（白い所だけ残す） */
const maskOf = (url: string) => ({ WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' });

/** 台座の見た目に使う、今のジョブの段と、得意な武器の絵 */
export function pedestalLook(classId: string): { tier: JobTier; icon?: string } {
  const c = CLASSES.tryGet(classId);
  const tier = c?.tier ?? 'base';
  const wt = c?.weaponType ? WEAPON_TYPES.tryGet(c.weaponType) : undefined;
  return { tier, icon: wt?.icon ? artImage(`item/${wt.icon}`) : undefined };
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
  const { tier, icon } = pedestalLook(hero.classId);
  const metal = TIER_METAL[tier];
  const baseArt = artImage('ui/piece-base');
  const bandArt = artImage('ui/piece-base-band');
  const rimArt = artImage('ui/piece-base-rim');
  const plateArt = artImage(`ui/piece-plate-${tier}`);
  const gems = tier === 'top' || tier === 'special';
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
        {/* 台座: 描いた絵があれば絵（側面の帯だけプレイヤーの色に染める）、無ければプログラムで描く */}
        {baseArt ? (
          // 描いた台座（scripts/art/build_pedestal.py）。横:縦 = BASE_ART.aspect。上面のだ円の真ん中を、前の台座と同じ高さ（0.746s）に置く
          <span
            className="absolute"
            style={{ left: s * 0.02, top: s * (0.746 - (0.96 / BASE_ART.aspect) * BASE_ART.topCy), width: s * 0.96, height: (s * 0.96) / BASE_ART.aspect }}
            data-piece-base={tier}
          >
            <img src={baseArt} alt="" draggable={false} decoding="async" className="absolute inset-0 h-full w-full" />
            {/* 側面の帯をプレイヤーの色に（灰色の陰影が残るように、かけ合わせる） */}
            {bandArt && <span className="absolute inset-0" style={{ background: ringColor, mixBlendMode: 'multiply', ...maskOf(bandArt) }} />}
            {/* ふちを段の金属の色に（明るさは絵のまま、色だけ変える）。金の段は絵のまま */}
            {rimArt && tier !== 'top' && <span className="absolute inset-0" style={{ background: metal.mid, mixBlendMode: 'color', ...maskOf(rimArt) }} />}
            {gems && (
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {[16, 84].map((gx) => <ellipse key={gx} cx={gx} cy={70} rx="2.6" ry="8.4" fill={tier === 'special' ? '#e6b8ff' : '#ff6b6b'} stroke="#1a1208" strokeWidth="0.8" />)}
              </svg>
            )}
          </span>
        ) : (
          <svg className="absolute" style={{ left: s * 0.06, top: s * 0.62, width: s * 0.88, height: s * 0.36, overflow: 'visible' }} viewBox="0 0 100 40" aria-hidden data-piece-base={tier}>
            <defs>
              <linearGradient id={`top${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
                <stop offset="0.5" stopColor="#fff" stopOpacity="0.05" />
                <stop offset="1" stopColor="#000" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id={`side${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#000" stopOpacity="0.45" />
                <stop offset="0.35" stopColor="#fff" stopOpacity="0.25" />
                <stop offset="1" stopColor="#000" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id={`metal${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={metal.dark} />
                <stop offset="0.4" stopColor={metal.light} />
                <stop offset="1" stopColor={metal.dark} />
              </linearGradient>
            </defs>
            {/* 側面: プレイヤーの色の帯（いちばん広く。人数が多い時の見分け）と、上のふち（段の金属） */}
            <ellipse cx="50" cy="28" rx="47" ry="12" fill={ringColor} stroke="#1a1208" strokeWidth="2" />
            <rect x="3" y="14" width="94" height="14" fill={`url(#metal${uid})`} />
            <rect x="3" y="16" width="94" height="12" fill={ringColor} />
            <rect x="3" y="16" width="94" height="12" fill={`url(#side${uid})`} />
            <line x1="3" y1="14" x2="3" y2="28" stroke="#1a1208" strokeWidth="2" />
            <line x1="97" y1="14" x2="97" y2="28" stroke="#1a1208" strokeWidth="2" />
            {/* 上面: 濃い木の色（駒の絵が引き立つように）。ふちは段の金属 */}
            <ellipse cx="50" cy="14" rx="47" ry="12" fill="#4a3220" stroke={metal.mid} strokeWidth="3" />
            <ellipse cx="50" cy="14" rx="46" ry="11" fill={`url(#top${uid})`} />
            <ellipse cx="50" cy="13" rx="34" ry="7.5" fill="none" stroke={metal.light} strokeOpacity="0.5" strokeWidth="1.2" />
            {/* 最上位・特殊は、ふちに小さな宝石 */}
            {gems && [18, 82].map((gx) => <circle key={gx} cx={gx} cy={21} r="2.6" fill={tier === 'special' ? '#e6b8ff' : '#ff6b6b'} stroke="#1a1208" strokeWidth="1" />)}
          </svg>
        )}
        {img ? (
          // ミニチュアの絵: 正方形（1.25s）。足の裏が絵の下端にあり、それを台座の上面の中ほど（0.78s）に置く。
          // 横に長い武器は箱の左右へ少しはみ出す（体の大きさをそろえるため）。加工は scripts/art/build_art.py の build_pieces
          <img
            src={img}
            alt=""
            draggable={false}
            decoding="async"
            className="absolute"
            style={{ left: -s * 0.125, top: -s * 0.47, width: s * 1.25, height: s * 1.25, filter: 'drop-shadow(0 1px 1px #000)' }}
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
      {/* 台座の前の銘板（駒の絵より手前に描く）。台座といっしょに持ち上がる */}
      <span key={`pl${stepKey}`} className={`pointer-events-none absolute inset-0 block ${lift}`} style={{ animationDuration: dur }}>
        <svg className="absolute" style={{ left: s * 0.39, top: s * 0.71, width: s * 0.22, height: s * 0.26, overflow: 'visible' }} viewBox="0 0 22 26" aria-hidden data-piece-plate={tier}>
          {plateArt ? (
            <image href={plateArt} x="-1" y="-1" width="24" height="28" preserveAspectRatio="xMidYMid meet" />
          ) : (
            <>
              <defs>
                <linearGradient id={`plate${uid}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={metal.light} />
                  <stop offset="0.5" stopColor={metal.mid} />
                  <stop offset="1" stopColor={metal.dark} />
                </linearGradient>
              </defs>
              <path d="M1 1 H21 V11 Q21 20 11 25 Q1 20 1 11 Z" fill={`url(#plate${uid})`} stroke="#1a1208" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M4 4 H18 V11 Q18 17.5 11 21.5 Q4 17.5 4 11 Z" fill="#1d2440" />
            </>
          )}
          {icon && <image href={icon} x="4" y="3.5" width="14" height="14" preserveAspectRatio="xMidYMid meet" />}
        </svg>
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
