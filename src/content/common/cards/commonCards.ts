// 共通カード（K1）: どのジョブの報酬・ショップにも出る（common: true）。コモン10・レア8・エピック6。
// ID は cm + 名前。ジョブや武器に縛られない、冒険の基本の道具立て。
import type { CardDef, CardTarget, Effect, Rarity, StatId, AbilityDef, CardCategory } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const el = (element: string, amount: number): Effect => ({ kind: 'damage', amount, element });
const b = (amount: number): Effect => ({ kind: 'block', amount });
const ba = (amount: number): Effect => ({ kind: 'block', amount, to: 'allies' });
const bt = (amount: number): Effect => ({ kind: 'block', amount, to: 'target' });
const st = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const all = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount, to: 'foes' });
const heal = (amount: number): Effect => ({ kind: 'heal', amount });
const focus = (amount: number): Effect => ({ kind: 'gainFocus', amount });
const mana = (amount: number): Effect => ({ kind: 'gainMana', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });

type Opt = { rarity?: Rarity; stat?: StatId; trait?: AbilityDef; tags?: string[] };
/** 共通カードを1枚作る（common: true が付く）。tiers は成功数0から順に */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt = {}): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), common: true, ...o };
}

export const COMMON_CARDS: CardDef[] = [
  // ===== コモン =====
  { ...c('cmProbe', '小手調べ', 'physical', 0, 85, 'enemy', [[d(2)], [d(3)]]), weaponTypes: ['dagger'], lineages: ['gi'], stat: 'dex', tags: ['combo'] }, // 区切りD: 小手調べ＝素早い一突き＝刻み突き＝逆手斬り をまとめた
  c('cmPrepare', '備え', 'skill', 1, 85, 'self', [[b(4)], [b(6)], [b(8)]]),
  c('cmRecover', '立て直し', 'skill', 1, 80, 'self', [[heal(3)], [heal(5)], [heal(7), b(2)]]),
  { ...c('cmBreather', '一息つく', 'skill', 0, 85, 'self', [[focus(1)], [focus(1), b(2)]]), weaponTypes: ['fist'] }, // 区切りD: 一息つく＝息吹 をまとめた
  { ...c('cmSpirit', '気合', 'skill', 0, 80, 'self', [[mana(1)], [mana(1), b(2)]]), lineages: ['bu'] }, // 区切りD: 気合＝戦士の矜持 をまとめた
  { ...c('cmInstinct', '冒険者の勘', 'skill', 0, 85, 'self', [[draw(1)], [draw(1), mana(1)]]), lineages: ['ma'] }, // 区切りD: 冒険者の勘＝魔導の探求 をまとめた
  c('cmTackle', '体当たり', 'physical', 1, 75, 'enemy', [[d(3)], [d(5)], [d(7), st('vulnerable', 1)]]),
  c('cmFirstAid', '応急処置', 'skill', 1, 80, 'ally', [[heal(4)], [heal(6)], [heal(9)]], { tags: ['support'] }),
  c('cmCover', 'かばう構え', 'skill', 1, 80, 'ally', [[bt(4)], [bt(6)], [bt(8)]], { tags: ['support'] }),

  // ===== レア =====
  c('cmAllOut', '全力の一撃', 'physical', 2, 65, 'enemy', [[d(6)], [d(11)], [d(17)]], { rarity: 'rare', tags: ['heavy'] }),
  c('cmStratagem', '奇策', 'skill', 1, 80, 'self', [[draw(1), mana(1)], [draw(2), mana(1)], [draw(2), mana(2)]], { rarity: 'rare' }),
  c('cmIntimidate', '威嚇', 'skill', 1, 80, 'allEnemies', [[all('weak', 1)], [all('weak', 1), all('vulnerable', 1)], [all('weak', 2), all('vulnerable', 1)]], { rarity: 'rare' }),
  c('cmArcaneArrow', '魔力の矢', 'magic', 1, 80, 'enemy', [[d(3)], [d(6)], [d(8)]], { rarity: 'rare' }),
  c('cmGrit', '不屈の闘志', 'skill', 1, 80, 'self', [[b(5)], [b(7), focus(1)], [b(9), focus(1)]], { rarity: 'rare' }),
  { ...c('cmRally', '仲間の鼓舞', 'skill', 1, 80, 'self', [[ba(3)], [ba(5)], [ba(7)]], { rarity: 'rare', tags: ['support'] }), weaponTypes: ['scepter'], lineages: ['bu', 'sei'] }, // 区切りD: 仲間の鼓舞＝鼓舞の号令＝集団の加護＝加護 をまとめた
  c('cmResonance', '属性共鳴', 'magic', 2, 65, 'enemy', [[el('fire', 5)], [el('ice', 9)], [el('thunder', 14)]], { rarity: 'rare' }),

  // ===== エピック =====
  c('cmLastStand', '起死回生', 'skill', 2, 55, 'self', [[heal(5), b(3)], [heal(8), b(5)], [heal(12), b(6)]], { rarity: 'epic', trait: { name: '底力', effect: { when: 'hurt', do: [heal(2)] } } }),
  c('cmAllOrNothing', '乾坤一擲', 'physical', 3, 50, 'enemy', [[d(7)], [d(14)], [d(21)], [d(30)]], { rarity: 'epic', tags: ['heavy'], trait: { name: '決死', effect: { modifier: 'damageDealt', multiplier: 1.5, if: [{ kind: 'targetHpAtMost', pct: 30 }] } } }),
  c('cmSage', '賢者の叡智', 'skill', 1, 85, 'self', [[draw(1), mana(1)], [draw(2), mana(1)], [draw(2), mana(2), focus(1)]], { rarity: 'epic', trait: { name: '深謀', effect: { when: 'perfect', do: [draw(1)] } } }),
  c('cmCharge', '全軍突撃', 'physical', 3, 55, 'allEnemies', [[d(3)], [d(6)], [d(10)], [d(13)]], { rarity: 'epic', trait: { name: '勢い', effect: { when: 'kill', do: [mana(1)] } } }),
  c('cmOath', '守護の誓い', 'skill', 2, 60, 'self', [[ba(3)], [ba(5)], [ba(7)]], { rarity: 'epic', tags: ['support'], trait: { name: '誓いの盾', effect: { when: 'hurt', do: [b(2)] } } }),
  c('cmFate', '運命の一手', 'skill', 1, 80, 'self', [[focus(2)], [focus(2), mana(1)], [focus(3), mana(2)]], { rarity: 'epic', trait: { name: '巡り合わせ', effect: { when: 'perfect', do: [draw(1)] } } }),
];
