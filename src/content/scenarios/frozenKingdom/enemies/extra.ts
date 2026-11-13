// 凍てつく王国：追加の敵（K3 D）。湖・雪林・山脈の組み合わせを増やす
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { snowOwl } from './forest';

export const iceFisher: EnemyDef = {
  id: 'iceFisher',
  name: '氷の釣り人',
  icon: '🎣',
  maxHp: 30,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ['fire'],
  resist: ['ice'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 手数読みを1ターン目に予告する（2ターン目からは釣り針の一撃・糸を巻く・手数読みの順）
  firstActionId: 'hole',
  actions: [
    { id: 'hook', name: '釣り針の一撃', effects: [{ kind: 'damage', amount: 9 }] },
    { id: 'reel', name: '糸を巻く', effects: [{ kind: 'damage', amount: 4 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    // 「氷の穴にこもる」を手数読みに置き換えた。ID は古い保存のために残す。3つ目の地域なのでブロック8（BREAK されると付かない）
    { id: 'hole', name: '糸を張って待つ', big: true, behavior: 'punish', hint: 'このターンにカードを4枚以上使った味方に、枚数×2のダメージ', effects: [{ kind: 'punishPlays', amount: 2, min: 4 }, { kind: 'block', amount: 8 }] },
  ],
};

export const frostMoth: EnemyDef = {
  id: 'frostMoth',
  name: '霜蛾',
  icon: '🦋',
  maxHp: 20,
  baseLevel: 3,
  size: 0.8,
  exp: 7,
  gold: 4,
  weak: ['fire'],
  resist: ['ice'],
  pattern: 'sequence',
  actions: [
    { id: 'scale', name: '霜の鱗粉', effects: [{ kind: 'damage', amount: 3 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'flutter', name: '冷たい羽ばたき', effects: [{ kind: 'damage', amount: 3, hits: 2 }] },
    { id: 'drift', name: '雪に紛れる', effects: [{ kind: 'block', amount: 5 }] },
  ],
};

export const stormSnowOwl: EnemyDef = makeVariant(snowOwl, {
  id: 'stormSnowOwl',
  name: '雷の白梟',
  aura: 'storm',
  maxHp: 34,
  baseLevel: 7,
  exp: 13,
  gold: 9,
  weak: ['fire'],
  resist: ['ice', 'thunder'],
  actions: [
    { id: 'talons', name: '雷の鉤爪', effects: [{ kind: 'damage', amount: 5, hits: 2, element: 'thunder' }] },
    { id: 'wings', name: '雷雲の羽ばたき', effects: [{ kind: 'block', amount: 6 }, { kind: 'damage', amount: 4, element: 'thunder', to: 'foes' }] },
    { id: 'swoop', name: '落雷の急襲', effects: [{ kind: 'damage', amount: 10, element: 'thunder' }] },
  ],
});
