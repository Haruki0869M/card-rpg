import { BALANCE } from '../../data/balance';
import type { Statuses } from '../../types';

/**
 * ダメージ計算: 基礎値 × 攻撃側の倍率（特殊能力・レベル）→ 攻撃側の弱体 → 防御側の脆弱 → 端数切り捨て
 * （ブロック吸収前の値）。切り捨ては最後に1回だけ行う。
 */
export function calcDamage(
  base: number,
  attacker: Statuses | undefined,
  defender: Statuses | undefined,
  attackerMultiplier = 1,
): number {
  let v = base * attackerMultiplier;
  if (attacker && attacker.weak > 0) v *= BALANCE.weakMultiplier;
  if (defender && defender.vulnerable > 0) v *= BALANCE.vulnerableMultiplier;
  // 浮動小数の誤差（例: 11.999999）で1減らないように微小値を足す
  return Math.max(0, Math.floor(v + 1e-9));
}

/** ブロックで吸収 → 残りをHPへ */
export function absorb(
  damage: number,
  block: number,
  hp: number,
): { block: number; hp: number; blocked: number; hpLoss: number } {
  const blocked = Math.min(block, damage);
  const rest = damage - blocked;
  const hpLoss = Math.min(hp, rest);
  return { block: block - blocked, hp: hp - hpLoss, blocked, hpLoss };
}
