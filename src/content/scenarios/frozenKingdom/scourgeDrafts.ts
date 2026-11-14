// シナリオ2「凍てつく王国」の災厄3体の、悪さ・加護・専用の装備・文（区切り3a。docs/tasks/scenario2-rework-plan.md §2-2・§8・§9、
// docs/tasks/scenario2-theme-scourge-proposal.md §3・§4・§7。オーナーの返事は全て A）。
// ★ まだ登録しない（このファイルは scourges/ のフォルダの外なので、自動では登録されない）。
//   次の区切り（敵の表をオーナーに見せて OK をもらった後）で、敵（boss・minions）・報酬・出た時と倒した時の文を足して
//   frozenKingdom/scourges/*.ts に移し、地図の scourges の一覧（frozenKingdom/map.ts）に id を足す。それまでは、テストだけがここを読む。
// 数字（寒さ ×2・鐘の番 3ターンごと・響き 50%・凍結1／弱体1）は案のまま【提案】。文は画面に出す日本語そのまま
import type { ScourgeDef } from '../../../types';

/** 次の区切りで足す欄（boss・minions・reward・appearText・clearText・order）を除いた、災厄のデータ */
export type ScourgeDraft = Omit<ScourgeDef, 'boss' | 'minions' | 'reward' | 'appearText' | 'clearText' | 'order'>;

export const frozenScourgeDrafts: ScourgeDraft[] = [
  {
    id: 'whiteWolfKing',
    name: '白狼王',
    short: '白狼王',
    // 悪さ: 寒さのダメージ ×2（寒さだけ。帯の倍率と掛け算。HPは1で止まる・温泉と野営で防げるのは今のまま）
    curse: { coldMul: 2 },
    curseShort: '寒さ×2',
    curseText: '寒さで減るHPが2倍になる（野営・温泉で防げるのは今までどおり。HPは1で止まる）',
    gear: 'springWaitCloak',
    boon: {
      kind: 'frostBreath',
      status: 'freeze',
      soloStatus: 'weak',
      amount: 1,
      name: '白い息',
      text: '戦闘の始めに、味方1人が「凍結」1（2ターン目のマナ−1）。1人の時は代わりに「弱体」1（1ターン目に与えるダメージ×0.75）。灯火のランタンで防げる（凍結は雪解けの指輪でも）',
    },
  },
  {
    id: 'frostBellWraith',
    name: '凍て鐘の亡霊',
    short: '亡霊',
    // 悪さ: 街道が雪に埋もれる（街道の移動ボーナス +1 だけが無くなる。湖の氷の +2 は残る）
    curse: { buryRoad: true },
    curseShort: '街道 雪',
    curseText: '街道が雪に埋もれ、街道の上で振るサイコロの+1が無くなる（湖の氷の+2は残る）',
    gear: 'everIceBracer',
    boon: {
      kind: 'bellToll',
      every: 3,
      pct: 50,
      name: '鐘の響き',
      text: '3ターンごと（3・6・9…ターン目）の「🔔鐘の番」に、ボス・中ボスの単体攻撃が、ほかの味方全員にも半分響く（ブロックで防げる。鐘の番は全員で守る・BREAK する）',
    },
  },
  {
    id: 'lampEaterShade',
    name: '灯を喰らう影',
    short: '影',
    // 悪さ: 昼も夜も視界 −1（最低1マス。見晴らしの塔・見取り図は今のまま働く）
    curse: { visionDown: 1 },
    curseShort: '視界−1',
    curseText: '昼も夜も、見える広さが1マス狭くなる（最低1マス。見晴らしの塔・見取り図は今までどおり）',
    gear: 'springbringerScepter',
    boon: {
      kind: 'darkVeil',
      seeItems: ['lampLantern'],
      name: '闇の帳',
      text: 'ボス・中ボスの最初の予告は、名前と数字が見えない（攻撃・守り・特殊と、大技かどうかは見える）。見るには: 影を倒す・ランダムダンジョンの主を倒して見破る（ボスだけ）・灯火のランタンを着ける',
    },
  },
];
