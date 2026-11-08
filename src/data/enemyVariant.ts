// 亜種の敵の作り方（K3）。元の敵のデータを土台に、属性か開幕の特性を変えた敵を作る。
// 使い方: export const forestWolfFire: EnemyDef = makeVariant(forestWolf, { id: 'forestWolfFire', name: '炎の森の狼', aura: 'ember', ... })
// 絵は元の敵の絵を使い回す（variantOf）。変えた所（属性・開幕の特性）は data.test.ts が確かめる
import type { EnemyDef } from '../types';

export function makeVariant(base: EnemyDef, changes: Partial<EnemyDef> & Pick<EnemyDef, 'id' | 'name' | 'aura'>): EnemyDef {
  const { id: _baseId, ...rest } = base;
  return { ...rest, ...changes, variantOf: base.variantOf ?? base.id };
}
