// アートの登録表。職業・敵の絵はここから引く。無ければ汎用の仮の絵を使う。
import type { ComponentType } from 'react';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import type { Gender } from '../types';
import { FallbackEnemy, FallbackHero } from './fallback';
import { Hero } from './hero/Hero';
import { heroLookFor } from './hero/looks';

import { ChaosShaman } from './enemies/ChaosShaman';
import { GoblinBrute } from './enemies/GoblinBrute';
import { GoblinScout } from './enemies/GoblinScout';

type EnemyArtComponent = ComponentType<{ className?: string }>;

/** 敵の絵の登録表。敵を増やすときは絵のファイルを作ってここに1行追加する（無ければ汎用の仮の絵） */
const ENEMY_ART: Record<string, EnemyArtComponent> = {
  goblinBrute: GoblinBrute,
  goblinScout: GoblinScout,
  chaosShaman: ChaosShaman,
};

export function CharacterArt({ classId, gender, className }: { classId: string; gender: Gender; className?: string }) {
  const look = heroLookFor(classId, gender);
  if (look) return <Hero look={look} className={className} />;
  const name = CLASSES.tryGet(classId)?.name ?? '?';
  return <FallbackHero label={name.slice(0, 1)} className={className} />;
}

export function EnemyArt({ defId, className }: { defId: string; className?: string }) {
  const Comp = ENEMY_ART[defId];
  if (Comp) return <Comp className={className} />;
  const name = ENEMIES.tryGet(defId)?.name ?? '?';
  return <FallbackEnemy label={name.slice(0, 1)} className={className} />;
}
