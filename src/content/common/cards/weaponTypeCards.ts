// 武器種カード（K1。1種類×7枚）: その武器を装備できるジョブなら誰でも報酬・ショップで出会う。
// 得意武器は出やすく、使える武器（副）は出にくい（balance.cardPoolWeight）。ID は wt + 武器種 + 名前。
// 7枚の役割: 単体・連撃・守り（コモン3）／全体・状態異常（レア2）／特殊（エピック2）
import type { CardDef, CardTarget, Effect, Rarity, StatId, AbilityDef, CardCategory } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const dh = (amount: number, hits: number): Effect => ({ kind: 'damage', amount, hits });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const st = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const focus = (amount: number): Effect => ({ kind: 'gainFocus', amount });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[]; weaponType?: string };
/** カードを1枚作る。tiers は成功数0から順に（成功数 i の効果） */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), ...o };
}

const W = (weaponType: string) => ({ weaponType });

export const WEAPON_TYPE_CARDS: CardDef[] = [
  // ===== 剣（正統派。バランスと一撃） =====
  c('wtSwordLunge', '踏み込み斬り', 'physical', 1, 80, 'enemy', [[d(3)], [d(6)], [d(8)]], W('sword')),
  c('wtSwordSwallow', '返し斬り', 'physical', 1, 70, 'enemy', [[d(2)], [dh(3, 2)], [dh(4, 2)]], { ...W('sword'), stat: 'dex', tags: ['combo'] }),
  c('wtSwordGuard', '剣の構え', 'skill', 1, 80, 'self', [[b(4)], [b(6), focus(1)], [b(8), focus(1)]], W('sword')),
  c('wtSwordWhirl', '大回転斬り', 'physical', 2, 65, 'allEnemies', [[d(3)], [d(6)], [d(9)]], { ...W('sword'), rarity: 'rare' }),
  c('wtSwordNotch', '刃こぼし', 'physical', 1, 75, 'enemy', [[d(3)], [d(5), st('vulnerable', 1)], [d(7), st('vulnerable', 2)]], { ...W('sword'), rarity: 'rare' }),
  c('wtSwordAura', '剣気解放', 'physical', 2, 60, 'enemy', [[d(5)], [d(9)], [d(14)]], { ...W('sword'), rarity: 'epic', trait: { name: '剣気', effect: { when: 'perfect', do: [focus(1)] } } }),
  c('wtSwordHelmSplit', '兜割り', 'physical', 3, 55, 'enemy', [[d(6)], [d(12)], [d(18)], [d(27), st('vulnerable', 2)]], { ...W('sword'), rarity: 'epic', stat: 'str', tags: ['heavy'], trait: { name: '止めの一太刀', effect: { modifier: 'damageDealt', multiplier: 1.5, if: [{ kind: 'targetHpAtMost', pct: 30 }] } } }),
];
