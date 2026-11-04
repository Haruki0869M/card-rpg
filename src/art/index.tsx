// アートの登録表。職業・敵の絵はここから引く。無ければ汎用の仮の絵を使う。
import type { ComponentType, CSSProperties } from 'react';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import type { Gender, Rarity } from '../types';
import { ChestArt, ItemArt } from './items';
import { FallbackEnemy, FallbackHero } from './fallback';
import { HERO_FACE_VIEWBOX, Hero } from './hero/Hero';
import { heroLookFor } from './hero/looks';
import { ArtImage, generateArt, useArtUrl } from './rasterize';
import { PlainsBackground } from './backgrounds/Plains';
import { TempleBackground } from './backgrounds/Temple';
import { CastleBackground } from './backgrounds/Castle';

import { ChaosShaman } from './enemies/ChaosShaman';
import { GoblinBrute } from './enemies/GoblinBrute';
import { GoblinScout } from './enemies/GoblinScout';
import { ForestWolf, ToxicShroom, TreantKing, TreeWarden } from './enemies/Forest';

type EnemyArtComponent = ComponentType<{ className?: string; phase?: number }>;

/** 敵の絵の登録表。敵を増やすときは絵のファイルを作ってここに1行追加する（無ければ汎用の仮の絵） */
const ENEMY_ART: Record<string, EnemyArtComponent> = {
  goblinBrute: GoblinBrute,
  goblinScout: GoblinScout,
  chaosShaman: ChaosShaman,
  forestWolf: ForestWolf,
  toxicShroom: ToxicShroom,
  treeWarden: TreeWarden,
  treantKing: TreantKing,
};

const heroKey = (classId: string, gender: Gender, face?: boolean, weapon?: Rarity) =>
  `hero:${classId}:${gender}:${face ? 'face' : 'full'}:${weapon ?? '-'}`;

/** 武器のレア度に合わせて光の色を変える */
const WEAPON_GLOW: Record<Rarity, string> = { common: '#cfd6e6', rare: '#4ab0ff', epic: '#c070ff', legend: '#ffb02a' };

function renderHero(classId: string, gender: Gender, face?: boolean, weapon?: Rarity) {
  const base = heroLookFor(classId, gender);
  const look = base && weapon ? { ...base, weaponTier: weapon, gem: WEAPON_GLOW[weapon] } : base;
  const viewBox = face ? HERO_FACE_VIEWBOX : undefined;
  if (look) return <Hero look={look} viewBox={viewBox} />;
  const name = CLASSES.tryGet(classId)?.name ?? '?';
  return <FallbackHero label={name.slice(0, 1)} viewBox={viewBox} />;
}
function renderEnemy(defId: string, phase = 0) {
  const Comp = ENEMY_ART[defId];
  if (Comp) return <Comp phase={phase} />;
  const name = ENEMIES.tryGet(defId)?.name ?? '?';
  return <FallbackEnemy label={name.slice(0, 1)} />;
}

/** 起動時に、登録されている全職業・全敵・背景の絵を画像にしておく（React の描画より前に呼ぶ） */
export function prepareArt() {
  for (const c of CLASSES.all)
    for (const g of ['male', 'female'] as const) {
      generateArt(heroKey(c.id, g), () => renderHero(c.id, g));
      generateArt(heroKey(c.id, g, false, 'common'), () => renderHero(c.id, g, false, 'common'));
      generateArt(heroKey(c.id, g, true), () => renderHero(c.id, g, true));
    }
  for (const e of ENEMIES.all) for (let p = 0; p <= (e.phases?.length ?? 0); p++) generateArt(enemyKey(e.id, p), () => renderEnemy(e.id, p));
  for (const [k, Bg] of Object.entries(BACKGROUNDS)) generateArt(`bg:${k}`, () => <Bg />);
}

export function CharacterArt({
  classId,
  gender,
  className,
  face,
  style,
  weapon,
}: {
  classId: string;
  gender: Gender;
  className?: string;
  style?: CSSProperties;
  /** 装備中の武器のレア度（見た目の武器の光り方が変わる） */
  weapon?: Rarity;
  /** true なら顔まわりだけ（小さな顔アイコン用） */
  face?: boolean;
}) {
  const w = face ? undefined : weapon;
  const src = useArtUrl(heroKey(classId, gender, face, w), () => renderHero(classId, gender, face, w));
  return <ArtImage src={src} className={className} style={style} />;
}

const enemyKey = (defId: string, phase: number) => `enemy:${defId}:${phase}`;

export function EnemyArt({ defId, phase = 0, className }: { defId: string; phase?: number; className?: string }) {
  const src = useArtUrl(enemyKey(defId, phase), () => renderEnemy(defId, phase));
  return <ArtImage src={src} className={className} />;
}

/** 背景の登録表（ダンジョンの background の値で選ぶ。無ければ平原） */
const BACKGROUNDS: Record<string, ComponentType> = {
  plains: PlainsBackground,
  temple: TempleBackground,
  castle: CastleBackground,
};

export function BattleBackground({ kind = 'plains', className }: { kind?: string; className?: string }) {
  const key = BACKGROUNDS[kind] ? kind : 'plains';
  const src = useArtUrl(`bg:${key}`, () => {
    const Bg = BACKGROUNDS[key];
    return <Bg />;
  });
  return <ArtImage src={src} className={className} cover />;
}

/** アイテムの絵 */
export function ItemImage({ icon, rarity, className }: { icon: string; rarity: Rarity; className?: string }) {
  const src = useArtUrl(`item:${icon}:${rarity}`, () => <ItemArt icon={icon} rarity={rarity} />);
  return <ArtImage src={src} className={className} />;
}

/** 宝箱の絵 */
export function ChestImage({ rarity, open, className }: { rarity: Rarity; open?: boolean; className?: string }) {
  const src = useArtUrl(`chest:${rarity}:${open ? 1 : 0}`, () => <ChestArt rarity={rarity} open={open} />);
  return <ArtImage src={src} className={className} />;
}
