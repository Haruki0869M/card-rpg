// 夢の再来（K4 夢幻の大迷宮）: 過去のシナリオの敵を「夢の形」で蘇らせる部品。
// 絵は元の敵のものを使い回す（makeVariant の variantOf）。元の敵より少し強く（HP+10%・攻撃+1）、
// 攻撃の属性か開幕の特性を必ず1つ変える（亜種の決まり）。亜種2割の決まりは、このシナリオの再来だけ例外（オーナー承認済み）
import { makeVariant } from '../../../../data/enemyVariant';
import type { AbilityDef, EnemyActionDef, EnemyDef } from '../../../../types';

export interface EchoOptions {
  id: string;
  name: string;
  /** 足元のオーラ（属性の色に合わせる） */
  aura: string;
  /** ダメージの攻撃を、この属性に変える（省略すると属性は変えない） */
  element?: string;
  /** 開幕の特性などを足す（元の特性は残す） */
  abilities?: AbilityDef[];
  /**
   * 元の敵の行動の代わりに、この行動を土台にする（ダメージ+1・属性の変更は同じにかける）。
   * 敵の特殊な行動・第2弾: 元の敵の行動を置き換えた時に、表に無い夢の再来へ伝わらないよう、置き換える前の行動をここに書く
   */
  actions?: EnemyActionDef[];
  /** 戦闘の1ターン目に必ず予告する行動（元の敵の firstActionId は引き継がない。表に載っている夢の再来だけ書く） */
  firstActionId?: string;
}

/** 攻撃のダメージを+1し、element があれば属性を変える（ブロック・状態異常はそのまま） */
function strengthen(action: EnemyActionDef, element?: string): EnemyActionDef {
  return {
    ...action,
    effects: action.effects.map((e) => (e.kind === 'damage' ? ({ ...e, amount: e.amount + 1, ...(element ? { element } : {}) } as typeof e) : e)),
  };
}

export function dreamEcho(base: EnemyDef, o: EchoOptions): EnemyDef {
  return makeVariant(base, {
    id: o.id,
    name: o.name,
    aura: o.aura,
    maxHp: Math.round(base.maxHp * 1.1),
    exp: Math.round(base.exp * 1.1),
    gold: Math.round(base.gold * 1.1),
    actions: (o.actions ?? base.actions).map((a) => strengthen(a, o.element)),
    firstActionId: o.firstActionId,
    phases: base.phases?.map((p) => ({ ...p, actions: p.actions.map((a) => strengthen(a, o.element)) })),
    abilities: o.abilities ? [...(base.abilities ?? []), ...o.abilities] : base.abilities,
  });
}
