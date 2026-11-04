// アートの登録表。職業・敵の絵はここから引く。無ければ汎用の仮の絵を使う。
import type { ComponentType, CSSProperties } from 'react';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import type { Gender } from '../types';
import { FallbackEnemy, FallbackHero } from './fallback';
import { HERO_FACE_VIEWBOX, Hero } from './hero/Hero';
import { heroLookFor } from './hero/looks';
import { ArtImage, generateArt, useArtUrl } from './rasterize';
import { PlainsBackground } from './backgrounds/Plains';

import { ChaosShaman } from './enemies/ChaosShaman';
import { GoblinBrute } from './enemies/GoblinBrute';
import { GoblinScout } from './enemies/GoblinScout';

type EnemyArtComponent = ComponentType<{ className?: string; phase?: number }>;

/** 敵の絵の登録表。敵を増やすときは絵のファイルを作ってここに1行追加する（無ければ汎用の仮の絵） */
const ENEMY_ART: Record<string, EnemyArtComponent> = {
  goblinBrute: GoblinBrute,
  goblinScout: GoblinScout,
  chaosShaman: ChaosShaman,
};

const heroKey = (classId: string, gender: Gender, face?: boolean) => `hero:${classId}:${gender}:${face ? 'face' : 'full'}`;
function renderHero(classId: string, gender: Gender, face?: boolean) {
  const look = heroLookFor(classId, gender);
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
}: {
  classId: string;
  gender: Gender;
  className?: string;
  style?: CSSProperties;
  /** true なら顔まわりだけ（小さな顔アイコン用） */
  face?: boolean;
}) {
  const src = useArtUrl(heroKey(classId, gender, face), () => renderHero(classId, gender, face));
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
};

export function BattleBackground({ kind = 'plains', className }: { kind?: string; className?: string }) {
  const key = BACKGROUNDS[kind] ? kind : 'plains';
  const src = useArtUrl(`bg:${key}`, () => {
    const Bg = BACKGROUNDS[key];
    return <Bg />;
  });
  return <ArtImage src={src} className={className} cover />;
}
