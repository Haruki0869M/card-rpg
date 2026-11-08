// ===== ダンジョンの一人称の通路（第3段階B） =====
// エンジンの viewSlices（見たマスだけから決めた「何が見えるか」）を、CSS の遠近法で四角形を並べて描く。
// 絵（src/assets/art/dungeon/<背景>-<wall|floor|ceiling|door>.webp）があれば使い、無ければダンジョンごとの色の仮の見た目。
import { Crown, Flame, Gem, Gift, Leaf, Lock, Skull, Sparkles, Swords } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { DUNGEON_TONE } from '../../art/dungeonTone';
import { artImage } from '../../art/images';
import { getRoomType } from '../../data/rules';
import { OMEN_INFO, viewSlices, type DoorOmen, type ViewFace } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import type { DungeonRun } from '../../types';

/** ダンジョンの背景ごとの仮の色（壁・床・天井・扉・松明の光） */
const THEMES: Record<string, { wall: string; wallLine: string; floor: string; ceil: string; door: string; glow: string }> = {
  temple: { wall: '#5d6658', wallLine: '#3a4038', floor: '#4a4a40', ceil: '#2c302a', door: '#5a3a22', glow: '255,190,110' },
  volcano: { wall: '#5a2e26', wallLine: '#2e1410', floor: '#3e2420', ceil: '#24100c', door: '#3a2016', glow: '255,120,60' },
  catacomb: { wall: '#7a7060', wallLine: '#4a4236', floor: '#544a3c', ceil: '#302a22', door: '#4a3424', glow: '230,200,150' },
  castle: { wall: '#4a3e5a', wallLine: '#261e32', floor: '#3a3244', ceil: '#1e1828', door: '#3a2030', glow: '220,150,255' },
  forestCave: { wall: '#4a5a3a', wallLine: '#2a3420', floor: '#3e4630', ceil: '#222a1a', door: '#4a3420', glow: '255,200,120' },
  // 2〜7本目のダンジョン（K4）: 通路の絵の平均色から作った色（絵が無い部分と、松明の光の色に使う）
  crystalCave: { wall: '#5e737b', wallLine: '#2f393d', floor: '#8695a0', ceil: '#15354a', door: '#7c817f', glow: '170,215,255' },
  sunkenCathedral: { wall: '#657988', wallLine: '#323d44', floor: '#809ab1', ceil: '#50687b', door: '#294254', glow: '170,215,255' },
  giantMine: { wall: '#424548', wallLine: '#212224', floor: '#6c6c6d', ceil: '#505154', door: '#3d3936', glow: '255,190,120' },
  iceCastle: { wall: '#9fc0cf', wallLine: '#4f6067', floor: '#94b9c9', ceil: '#9bb5c4', door: '#83a2b0', glow: '170,215,255' },
  echoIceVault: { wall: '#9dadd5', wallLine: '#4e566a', floor: '#b7c7de', ceil: '#8773c3', door: '#94afdf', glow: '170,215,255' },
  wreckCave: { wall: '#4a453b', wallLine: '#25221e', floor: '#465d65', ceil: '#183135', door: '#464d3f', glow: '150,230,200' },
  pirateIsland: { wall: '#3c352f', wallLine: '#1e1b17', floor: '#735742', ceil: '#3f261b', door: '#48342b', glow: '255,200,120' },
  sunkenTemple: { wall: '#3e675b', wallLine: '#1f332e', floor: '#62807b', ceil: '#2f5e66', door: '#4e6b64', glow: '150,230,200' },
  ghostFlagship: { wall: '#404a48', wallLine: '#202524', floor: '#a0a6a7', ceil: '#3a4c55', door: '#a6aca2', glow: '150,230,200' },
  scorpionTomb: { wall: '#ad9173', wallLine: '#57483a', floor: '#b18363', ceil: '#2c231d', door: '#3f626e', glow: '255,200,120' },
  shadowLibrary: { wall: '#463a2d', wallLine: '#231d16', floor: '#6d584a', ceil: '#a07e5b', door: '#3c2b27', glow: '255,200,120' },
  statueTemple: { wall: '#605243', wallLine: '#302922', floor: '#5d4129', ceil: '#7a654c', door: '#b7a58e', glow: '255,215,140' },
  sandPalace: { wall: '#a38968', wallLine: '#524434', floor: '#c28f60', ceil: '#5f4b36', door: '#5a3623', glow: '255,215,140' },
  echoSandTomb: { wall: '#9e8283', wallLine: '#4f4142', floor: '#bca6bc', ceil: '#663a51', door: '#b596bc', glow: '255,215,140' },
  windmillTower: { wall: '#95897d', wallLine: '#4b453f', floor: '#94897f', ceil: '#5c3f27', door: '#89867a', glow: '255,235,160' },
  observatory: { wall: '#2a3538', wallLine: '#151a1c', floor: '#333d45', ceil: '#23231f', door: '#151f2b', glow: '255,235,160' },
  moonlitGarden: { wall: '#666842', wallLine: '#333421', floor: '#586972', ceil: '#a2a48d', door: '#a89f93', glow: '220,235,255' },
  skyCastle: { wall: '#ccc7be', wallLine: '#66645f', floor: '#cec3b0', ceil: '#d5cab8', door: '#ddd5c6', glow: '255,235,160' },
  gearFactory: { wall: '#3f3933', wallLine: '#1f1d1a', floor: '#575756', ceil: '#5b4c3d', door: '#7f786f', glow: '255,150,70' },
  steamPlant: { wall: '#3b2820', wallLine: '#1d1410', floor: '#484d46', ceil: '#361c15', door: '#664634', glow: '255,150,70' },
  clockTower: { wall: '#554b39', wallLine: '#2b251d', floor: '#43311d', ceil: '#5c4022', door: '#322a20', glow: '255,190,100' },
  machineHeart: { wall: '#2f1e1e', wallLine: '#180f0f', floor: '#1d0808', ceil: '#1a181b', door: '#1d1b17', glow: '255,120,70' },
  echoGhostShip: { wall: '#758d9a', wallLine: '#3a464d', floor: '#7e648a', ceil: '#8946b3', door: '#7c728f', glow: '210,170,255' },
  dreamEaterLair: { wall: '#41364f', wallLine: '#201b28', floor: '#362a54', ceil: '#080d14', door: '#0a0a13', glow: '210,170,255' },
};
const themeOf = (bg: string) => THEMES[bg] ?? THEMES.temple;

/** 部屋の種類のアイコン（通った部屋の床の印） */
const ROOM_ICONS: Record<string, typeof Swords> = { swords: Swords, skull: Skull, crown: Crown, gift: Gift, sparkles: Sparkles, flame: Flame };

type Part = 'wall' | 'floor' | 'ceiling' | 'door';

function surface(bg: string, part: Part, shade: number, themeBg: string = bg): CSSProperties {
  const t = themeOf(themeBg);
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

/**
 * 暗い絵のダンジョンでの扉の縁の明るさ（0〜1）。壁の絵の平均の明るさ（DUNGEON_TONE、build_art.py が測る）が
 * 90 より暗いほど強くする（溶岩の洞窟の壁53 → 約0.74）。明るい壁（翠の神殿・地下墓所）や、絵が無い時は 0。
 */
export function doorRimStrength(bg: string) {
  const wall = artImage(`dungeon/${bg}-wall`) ? DUNGEON_TONE[bg]?.wall : undefined;
  if (wall === undefined) return 0;
  return Math.max(0, Math.min(1, (90 - wall) / 50));
}

/**
 * 通路の暗さ（奥ほど暗くする量）の倍率（0.45〜1）。壁・床・天井の絵の平均の明るさ（DUNGEON_TONE）が 100 より暗いほど弱める。
 * 絵がもともと暗いダンジョン（溶岩の洞窟・魔王城・森の洞窟）で、奥が真っ暗になって見づらくならないように。絵が無い時は 1（今までどおり）
 */
export function corridorShadeScale(bg: string) {
  const t = artImage(`dungeon/${bg}-wall`) ? DUNGEON_TONE[bg] : undefined;
  const v = [t?.wall, t?.floor, t?.ceiling].filter((x): x is number => x !== undefined);
  if (!v.length) return 1;
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.max(0.45, Math.min(1, avg / 100));
}

/** 扉の縁（ふつうの扉）: 暗いダンジョンでは、松明に照らされたような明るい縁と淡い光にする */
function doorRim(bg: string) {
  const k = doorRimStrength(bg);
  if (!k) return { border: '#2a1a10', glow: undefined as string | undefined };
  return {
    border: `rgba(255,214,150,${(0.35 + 0.55 * k).toFixed(2)})`,
    glow: `0 0 ${Math.round(6 + 10 * k)}px rgba(255,180,100,${(0.5 * k).toFixed(2)}), inset 0 0 ${Math.round(4 + 6 * k)}px rgba(255,190,120,${(0.35 * k).toFixed(2)})`,
  };
}

/** 扉（壁の面の中に描く） */
function Door({ bg, themeBg = bg, face, shade, opening, omen }: { bg: string; /** 絵が無い時の色を決める背景（通路の絵の名前と、部屋の背景が違う時） */ themeBg?: string; face: ViewFace; shade: number; opening?: number; omen?: DoorOmen }) {
  const t = themeOf(themeBg);
  const boss = face === 'boss';
  // ボスの門は専用の絵（両開きの門）があれば使い、無ければふつうの扉の絵
  const img = (boss && artImage(`dungeon/${bg}-bossdoor`)) || artImage(`dungeon/${bg}-door`);
  const bossArt = boss && !!artImage(`dungeon/${bg}-bossdoor`);
  const rim = doorRim(bg);
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
      <div className="absolute bottom-0 overflow-hidden rounded-t-[30%] bg-black" style={{ left: boss ? '12%' : '22%', right: boss ? '12%' : '22%', top: boss ? '10%' : '22%', border: `3px solid ${boss ? '#d8a830' : rim.border}`, boxShadow: boss ? undefined : rim.glow }}>
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
        border: `3px solid ${boss ? '#d8a830' : omen ? OMEN_INFO[omen].color : rim.border}`,
        backgroundColor: t.door,
        backgroundImage: img
          ? `linear-gradient(rgba(0,0,0,${shade}), rgba(0,0,0,${shade})), url(${img})`
          : `linear-gradient(rgba(0,0,0,${shade}), rgba(0,0,0,${shade})), repeating-linear-gradient(90deg, rgba(0,0,0,.35) 0 2px, transparent 2px 25%)`,
        backgroundSize: 'cover',
        boxShadow: boss ? '0 0 18px rgba(255,200,80,.45)' : omen ? `0 0 16px ${OMEN_INFO[omen].color}, inset 0 0 10px ${OMEN_INFO[omen].color}` : rim.glow,
        filter: face === 'locked' ? 'grayscale(.7) brightness(.6)' : undefined,
      }}
    >
      {/* ボスの扉は両開きの門（真ん中に合わせ目） */}
      {boss && !bossArt && <span className="absolute inset-y-0 left-1/2 w-[4px] -translate-x-1/2 bg-[#120804] shadow-[0_0_3px_#000]" />}
      {boss && <Crown className="relative text-amber-300" style={{ width: '34%', height: '34%' }} />}
      {face === 'locked' && <Lock className="text-zinc-300/80" style={{ width: '24%', height: '24%' }} />}
      {face === 'door' && <span className="absolute right-[14%] top-1/2 h-[7%] w-[7%] rounded-full bg-amber-300/80" />}
      {/* 気配（第3段階C1）: 扉の上に小さな印 */}
      {omen && <OmenMark omen={omen} />}
    </div>
  );
}

/** 気配の印（危険＝牙・財宝＝宝石・安らぎ＝葉・不思議＝星）。扉の上でゆっくり光る */
const OMEN_ICONS: Record<DoorOmen, typeof Swords> = { danger: Skull, treasure: Gem, rest: Leaf, mystery: Sparkles };
export function OmenMark({ omen, className = 'absolute left-1/2 top-[6%] -translate-x-1/2' }: { omen: DoorOmen; className?: string }) {
  const Icon = OMEN_ICONS[omen];
  const c = OMEN_INFO[omen].color;
  return (
    <span className={`glow-pulse flex items-center justify-center rounded-full ${className}`} style={{ width: '26%', aspectRatio: '1', background: 'rgba(0,0,0,.55)', boxShadow: `0 0 10px ${c}` }} data-omen={omen}>
      <Icon style={{ width: '70%', height: '70%', color: c }} />
    </span>
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

/**
 * 通路の絵を読む名前。そのダンジョンのIDの通路の絵（dungeon/<ダンジョンID>-wall）があればそれ、無ければ部屋の背景（background）の名前。
 * 部屋の背景（bg/<名前>）と通路の絵を別々に切り替えられる（K4: 通路の絵だけ先に届いたダンジョンのため）
 */
export function corridorArt(dungeonId: string | undefined, background: string): string {
  return dungeonId && artImage(`dungeon/${dungeonId}-wall`) ? dungeonId : background;
}

/** 一人称の通路 */
export function DungeonView({ run, background, opening, omens }: { run: DungeonRun; background: string; /** 正面の扉が開く演出の秒数（扉が開く演出の時だけ） */ opening?: number; /** 扉の気配（部屋のID → 種類） */ omens?: Record<string, DoorOmen> }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const { slices, end } = viewSlices(run);
  const art = corridorArt(run.dungeonId, background);
  // 1マスの大きさ（通路の幅・高さ・奥行き）。画面の小さい方の辺に合わせる
  const U = Math.max(120, Math.min(size.width * 0.92 || 300, size.height * 0.95 || 300));
  const dim = corridorShadeScale(art);
  const shade = (d: number) => Math.min(0.85, 0.12 + d * 0.2) * dim;
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
    face(`f${s.depth}`, `translate3d(0, ${U / 2}px, ${z}px) rotateX(90deg)`, surface(art, 'floor', sh), undefined, s.depth + 0.5);
    face(`c${s.depth}`, `translate3d(0, ${-U / 2}px, ${z}px) rotateX(-90deg)`, surface(art, 'ceiling', sh), undefined, s.depth + 0.5);
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
        face(`${side}w${s.depth}`, `translate3d(${sign * U * 1.5}px, 0, ${z}px) rotateY(${rot}deg)`, f === 'dark' ? { background: '#050505' } : surface(art, 'wall', sh2), undefined, s.depth + 0.9);
        face(`${side}f${s.depth}`, `translate3d(${sign * U}px, ${U / 2}px, ${z}px) rotateX(90deg)`, surface(art, 'floor', sh2), undefined, s.depth + 0.8);
        face(`${side}c${s.depth}`, `translate3d(${sign * U}px, ${-U / 2}px, ${z}px) rotateX(-90deg)`, surface(art, 'ceiling', sh2), undefined, s.depth + 0.8);
        // 隣のマスの正面（壁・扉・さらに続く暗がり）
        const ahead = side === 'left' ? s.leftAhead : s.rightAhead;
        const shA = Math.min(0.9, shade(s.depth + 1) + 0.15 * dim);
        if (ahead && ahead !== 'far' && ahead !== 'dark')
          face(`${side}a${s.depth}`, `translate3d(${sign * U}px, 0, ${-(s.depth + 1) * U}px)`, surface(art, 'wall', shA), ahead === 'wall' ? null : <Door bg={art} themeBg={background} face={ahead} shade={shA} omen={omens?.[(side === 'left' ? s.leftAheadRoomId : s.rightAheadRoomId) ?? '']} />, s.depth + 1.2);
        else face(`${side}a${s.depth}`, `translate3d(${sign * U}px, 0, ${-(s.depth + 1) * U}px)`, { background: '#030303' }, undefined, s.depth + 1.2);
        continue;
      }
      face(
        `${side}${s.depth}`,
        `translate3d(${(sign * U) / 2}px, 0, ${z}px) rotateY(${rot}deg)`,
        surface(art, 'wall', sh),
        f === 'wall' ? (s.torch && s.depth <= 2 && side === (s.depth % 2 ? 'right' : 'left') ? <Torch bg={background} /> : null) : <Door bg={art} themeBg={background} face={f} shade={sh} omen={omens?.[(side === 'left' ? s.leftRoomId : s.rightRoomId) ?? '']} />,
        s.depth + 0.45,
      );
    }
  }
  // 正面の突き当たり
  const endZ = -end.depth * U;
  const endShade = shade(end.depth);
  if (end.face === 'far' || end.face === 'dark') face('end', `translate3d(0, 0, ${endZ}px)`, { background: '#030303' }, undefined, 99);
  else face('end', `translate3d(0, 0, ${endZ}px)`, surface(art, 'wall', endShade), end.face === 'wall' ? null : <Door bg={art} themeBg={background} face={end.face} shade={endShade} opening={opening} omen={omens?.[end.roomId ?? '']} />, 99);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-black" data-dungeon-view data-end={end.face}>
      {[...faces].sort((a, b) => b.dist - a.dist).map((f) => f.node)}
      {/* 奥ほど暗く・まわりを少し暗く */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,.55) 100%)' }} />
    </div>
  );
}
