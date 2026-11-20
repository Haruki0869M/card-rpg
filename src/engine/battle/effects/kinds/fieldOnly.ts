// 区切りE: 戦闘の外でだけ使う道具の効果（浄化の聖結晶・テントの設営具・カード鍛錬の砥石・お供の特上ごちそう）。
// 戦闘の中では使えない（中身は冒険の側: engine/game/outcomes/kinds/ と usePouchItem で働く）
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** what: purify = 侵食度を下げて全員のフォーカス / tent = その場で野営 / whetstone = カード1枚を強化 / petFeast = 次の戦闘の1ターン目にお供が何回も行動 */
    /** elixir = 選んだキャラの能力値を1つ、この冒険の間 +amount（災厄討ちの秘薬。段階7b） */
    fieldOnly: { what: 'purify' | 'tent' | 'whetstone' | 'petFeast' | 'elixir'; amount?: number; focus?: number };
  }
}

const TEXT: Record<string, (e: { amount?: number; focus?: number }) => string> = {
  purify: (e) => `侵食度-${e.amount}%・味方全員のフォーカス+${e.focus}（戦闘の外で使う）`,
  tent: () => 'その場で野営する。夜の魔物に襲われず、HPとフォーカスを50%回復して、手番を終える（世界マップで使う）',
  whetstone: () => '山札のカード1枚を選んで強化版にする（この冒険の間だけ。戦闘の外で使う）',
  petFeast: (e) => `次の戦闘の1ターン目に、お供が${e.amount}回行動する（戦闘の外で使う）`,
  elixir: (e) => `選んだキャラの能力値を1つ、この冒険の間+${e.amount}（戦闘の外で使う）`,
};

export const effect: EffectHandler<'fieldOnly'> = {
  kind: 'fieldOnly',
  defaultTo: 'self',
  apply: () => false,
  check: () => '戦闘の外で使う道具です',
  describe: (e) => TEXT[e.what]?.(e) ?? '',
};
