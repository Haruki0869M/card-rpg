// ===== ダンジョンの一人称の通路（第3段階B） =====
// エンジンの viewSlices（見たマスだけから決めた「何が見えるか」）を、CSS の遠近法で四角形を並べて描く。
// 絵（src/assets/art/dungeon/<背景>-<wall|floor|ceiling|door>.webp）があれば使い、無ければダンジョンごとの色の仮の見た目。
import { Crown, Flame, Gift, Lock, Skull, Sparkles, Swords } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { artImage } from '../../art/images';
import { getRoomType } from '../../data/rules';
import { viewSlices, type ViewFace } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import type { DungeonRun } from '../../types';

/** ダンジョンの背景ごとの仮の色（壁・床・天井・扉・松明の光） */
const THEMES: Record<string, { wall: string; wallLine: string; floor: string; ceil: string; door: string; glow: string }> = {
  temple: { wall: '#5d6658', wallLine: '#3a4038', floor: '#4a4a40', ceil: '#2c302a', door: '#5a3a22', glow: '255,190,110' },
  volcano: { wall: '#5a2e26', wallLine: '#2e1410', floor: '#3e2420', ceil: '#24100c', door: '#3a2016', glow: '255,120,60' },
  catacomb: { wall: '#7a7060', wallLine: '#4a4236', floor: '#544a3c', ceil: '#302a22', door: '#4a3424', glow: '230,200,150' },
  castle: { wall: '#4a3e5a', wallLine: '#261e32', floor: '#3a3244', ceil: '#1e1828', door: '#3a2030', glow: '220,150,255' },
  forestCave: { wall: '#4a5a3a', wallLine: '#2a3420', floor: '#3e4630', ceil: '#222a1a', door: '#4a3420', glow: '255,200,120' },
};
const themeOf = (bg: string) => THEMES[bg] ?? THEMES.temple;

/** 部屋の種類のアイコン（通った部屋の床の印） */
const ROOM_ICONS: Record<string, typeof Swords> = { swords: Swords, skull: Skull, crown: Crown, gift: Gift, sparkles: Sparkles, flame: Flame };

type Part = 'wall' | 'floor' | 'ceiling' | 'door';

function surface(bg: string, part: Part, shade: number): CSSProperties {
  const t = themeOf(bg);
  const img = artImage(`dungeon/${bg}-${part}`);
  const dark = `linear-gradient(rgba(0,0,0,${shade}), rgba(0,0,0,${shade}))`;
  if (img) return { backgroundImage: `${dark}, url(${img})`, backgroundSize: 'cover' };
  if (part === 'wall')
    return {
      backgroundColor: t.wall,
      backgroundImage: `${dark}, repeating-linear-gradient(0deg, ${t.wallLine} 0 2px, transparent 2px 25%), repeating-linear-gradient(90deg, ${t.wallLine} 0 2px, transparent 2px 33.3%)`,
    };
  if (part === 'floor') return { backgroundColor: t.floor, backgroundImage: `${dark}, repeating-linear-gradient(90deg, rgba(0,0,0,.25) 0 2px, transparent 2px 50%), repeating-linear-gradient(0deg, rgba(0,0,0,.25) 0 2px, transparent 2px 50%)` };
  return { backgroundColor: t.ceil, backgroundImage: dark };
}

/** 扉（壁の面の中に描く） */
function Door({ bg, face, shade, opening }: { bg: string; face: ViewFace; shade: number; opening?: number }) {
  const t = themeOf(bg);
  const img = artImage(`dungeon/${bg}-door`);
  const boss = face === 'boss';
  if (face === 'arch') return <div className="absolute inset-x-[22%] top-[22%] bottom-0 rounded-t-[40%] bg-black/85" style={{ boxShadow: 'inset 0 0 12px #000' }} />;
  // 扉が開く（第3段階B2）: 奥へ開いて暗がりが見える。ふつうの扉は片開き（左の蝶番・右に取っ手）、ボスの扉は両開きの門
  if (opening) {
    const leaf = (side: 'left' | 'right', whole = false) => (
      <div
        className={`door-leaf absolute inset-y-0 ${whole ? 'w-full' : 'w-1/2'}`}
        style={{
          [side]: 0,
          transformOrigin: side,
          animationName: `door-open-${side}`,
          animationDuration: `${opening}s`,
          backgroundColor: t.door,
          backgroundImage: img ? `url(${img})` : 'repeating-linear-gradient(90deg, rgba(0,0,0,.35) 0 2px, transparent 2px 50%)',
          backgroundSize: img ? (whole ? 'cover' : '200% 100%') : undefined,
          backgroundPosition: side === 'left' ? 'left' : 'right',
          borderRight: side === 'left' && !whole ? '2px solid #1a0e08' : undefined,
        }}
      >
        {whole && <span className="absolute right-[14%] top-1/2 h-[7%] w-[7%] rounded-full bg-amber-300/80" />}
      </div>
    );
    return (
      <div className="absolute bottom-0 overflow-hidden rounded-t-[30%] bg-black" style={{ left: boss ? '12%' : '22%', right: boss ? '12%' : '22%', top: boss ? '10%' : '22%', border: `3px solid ${boss ? '#d8a830' : '#2a1a10'}` }}>
        {boss ? (
          <>
            {leaf('left')}
            {leaf('right')}
          </>
        ) : (
          leaf('left', true)
        )}
      </div>
    );
  }
  return (
    <div
      className="absolute bottom-0 flex items-center justify-center rounded-t-[30%]"
      style={{
        left: boss ? '12%' : '22%',
        right: boss ? '12%' : '22%',
        top: boss ? '10%' : '22%',
        border: `3px solid ${boss ? '#d8a830' : '#2a1a10'}`,
        backgroundColor: t.door,
        backgroundImage: img
          ? `linear-gradient(rgba(0,0,0,${shade}), rgba(0,0,0,${shade})), url(${img})`
          : `linear-gradient(rgba(0,0,0,${shade}), rgba(0,0,0,${shade})), repeating-linear-gradient(90deg, rgba(0,0,0,.35) 0 2px, transparent 2px 25%)`,
        backgroundSize: 'cover',
        boxShadow: boss ? '0 0 18px rgba(255,200,80,.45)' : undefined,
        filter: face === 'locked' ? 'grayscale(.7) brightness(.6)' : undefined,
      }}
    >
      {/* ボスの扉は両開きの門（真ん中に合わせ目） */}
      {boss && <span className="absolute inset-y-0 left-1/2 w-[4px] -translate-x-1/2 bg-[#120804] shadow-[0_0_3px_#000]" />}
      {boss && <Crown className="relative text-amber-300" style={{ width: '34%', height: '34%' }} />}
      {face === 'locked' && <Lock className="text-zinc-300/80" style={{ width: '24%', height: '24%' }} />}
      {face === 'door' && <span className="absolute right-[14%] top-1/2 h-[7%] w-[7%] rounded-full bg-amber-300/80" />}
    </div>
  );
}

/** 壁に付いた松明（小さく揺れる。動作軽減では止まる） */
function Torch({ bg }: { bg: string }) {
  const g = themeOf(bg).glow;
  return (
    <div className="absolute left-1/2 top-[30%] h-[22%] w-[10%] -translate-x-1/2">
      <div className="absolute inset-x-[30%] bottom-0 h-[55%] rounded-sm bg-[#3a2410]" />
      <div className="dungeon-torch absolute inset-x-0 top-0 h-[55%] rounded-full" style={{ background: `radial-gradient(circle at 50% 60%, #fff3c0 0 20%, rgb(${g}) 45%, transparent 72%)` }} />
      <div className="pointer-events-none absolute -inset-[180%] rounded-full" style={{ background: `radial-gradient(circle, rgba(${g},.28), transparent 60%)` }} />
    </div>
  );
}

/** 一人称の通路 */
export function DungeonView({ run, background, opening }: { run: DungeonRun; background: string; /** 正面の扉が開く演出の秒数（扉が開く演出の時だけ） */ opening?: number }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const { slices, end } = viewSlices(run);
  // 1マスの大きさ（通路の幅・高さ・奥行き）。画面の小さい方の辺に合わせる
  const U = Math.max(120, Math.min(size.width * 0.92 || 300, size.height * 0.95 || 300));
  const shade = (d: number) => Math.min(0.85, 0.12 + d * 0.2);
  // 面は1枚ずつ同じカメラ（perspective）で遠近をかけ、奥から手前の順に描く。
  // ブラウザの3Dの並べ替え（preserve-3d）に任せると、壁の一部が消えることがあったため使わない
  const P = U * 0.75;
  const cam = U * 0.45;
  const faces: { key: string; dist: number; node: ReactNode }[] = [];
  const face = (key: string, transform: string, style: CSSProperties, children?: ReactNode, dist = 0) =>
    faces.push({
      key,
      dist,
      node: (
        <div
          key={key}
          className="absolute overflow-hidden"
          style={{ left: '50%', top: '50%', width: U, height: U, marginLeft: -U / 2, marginTop: -U / 2, transform: `perspective(${P}px) translateZ(${cam}px) ${transform}`, ...style }}
        >
          {children}
        </div>
      ),
    });
  const zMid = (d: number) => -(d + 0.5) * U;
  for (const s of slices) {
    const z = zMid(s.depth);
    const sh = shade(s.depth);
    face(`f${s.depth}`, `translate3d(0, ${U / 2}px, ${z}px) rotateX(90deg)`, surface(background, 'floor', sh), undefined, s.depth + 0.5);
    face(`c${s.depth}`, `translate3d(0, ${-U / 2}px, ${z}px) rotateX(-90deg)`, surface(background, 'ceiling', sh), undefined, s.depth + 0.5);
    // 部屋の中の床には、通った部屋の種類の印
    if (s.depth === 0 && s.inRoom && run.currentRoomId) {
      const room = run.rooms.find((r) => r.id === run.currentRoomId);
      const t = room && getRoomType(room.type);
      const Icon = t ? (ROOM_ICONS[t.icon] ?? Sparkles) : null;
      if (Icon && t)
        face(
          'emblem',
          `translate3d(0, ${U / 2 - 1}px, ${z}px) rotateX(90deg)`,
          {},
          <div className="flex h-full w-full items-center justify-center opacity-40">
            <Icon style={{ width: '40%', height: '40%', color: t.color }} />
          </div>,
          0.4,
        );
    }
    for (const side of ['left', 'right'] as const) {
      const f = s[side];
      const sign = side === 'left' ? -1 : 1;
      const rot = side === 'left' ? 90 : -90;
      if (f === 'open' || f === 'dark') {
        // 横に開いた口: 隣のマスの床・天井・奥の壁（暗め）
        const sh2 = f === 'dark' ? 0.92 : Math.min(0.9, sh + 0.25);
        face(`${side}w${s.depth}`, `translate3d(${sign * U * 1.5}px, 0, ${z}px) rotateY(${rot}deg)`, f === 'dark' ? { background: '#050505' } : surface(background, 'wall', sh2), undefined, s.depth + 0.9);
        face(`${side}f${s.depth}`, `translate3d(${sign * U}px, ${U / 2}px, ${z}px) rotateX(90deg)`, surface(background, 'floor', sh2), undefined, s.depth + 0.8);
        face(`${side}c${s.depth}`, `translate3d(${sign * U}px, ${-U / 2}px, ${z}px) rotateX(-90deg)`, surface(background, 'ceiling', sh2), undefined, s.depth + 0.8);
        // 隣のマスの正面（壁・扉・さらに続く暗がり）
        const ahead = side === 'left' ? s.leftAhead : s.rightAhead;
        const shA = Math.min(0.9, shade(s.depth + 1) + 0.15);
        if (ahead && ahead !== 'far' && ahead !== 'dark')
          face(`${side}a${s.depth}`, `translate3d(${sign * U}px, 0, ${-(s.depth + 1) * U}px)`, surface(background, 'wall', shA), ahead === 'wall' ? null : <Door bg={background} face={ahead} shade={shA} />, s.depth + 1.2);
        else face(`${side}a${s.depth}`, `translate3d(${sign * U}px, 0, ${-(s.depth + 1) * U}px)`, { background: '#030303' }, undefined, s.depth + 1.2);
        continue;
      }
      face(
        `${side}${s.depth}`,
        `translate3d(${(sign * U) / 2}px, 0, ${z}px) rotateY(${rot}deg)`,
        surface(background, 'wall', sh),
        f === 'wall' ? (s.torch && s.depth <= 2 && side === (s.depth % 2 ? 'right' : 'left') ? <Torch bg={background} /> : null) : <Door bg={background} face={f} shade={sh} />,
        s.depth + 0.45,
      );
    }
  }
  // 正面の突き当たり
  const endZ = -end.depth * U;
  const endShade = shade(end.depth);
  if (end.face === 'far' || end.face === 'dark') face('end', `translate3d(0, 0, ${endZ}px)`, { background: '#030303' }, undefined, 99);
  else face('end', `translate3d(0, 0, ${endZ}px)`, surface(background, 'wall', endShade), end.face === 'wall' ? null : <Door bg={background} face={end.face} shade={endShade} opening={opening} />, 99);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-black" data-dungeon-view data-end={end.face}>
      {[...faces].sort((a, b) => b.dist - a.dist).map((f) => f.node)}
      {/* 奥ほど暗く・まわりを少し暗く */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,.55) 100%)' }} />
    </div>
  );
}
