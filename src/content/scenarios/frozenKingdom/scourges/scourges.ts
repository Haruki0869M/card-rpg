// シナリオ2「凍てつく王国」だけの災厄3体（2026-11-14 区切り3b。区切り3a の下書き scourgeDrafts.ts をここへ移して登録した）。
// 悪さ・加護・専用の装備・文: docs/tasks/scenario2-rework-plan.md §2-2・§8・§9、docs/tasks/scenario2-theme-scourge-proposal.md §3・§4・§7（オーナーの返事は全て A）。
// 本体・手下・出た時と倒した時の文: docs/tasks/scenario2-scourge-enemies-proposal.md（オーナーの返事 5つとも A）。数字は全部【提案】（案のまま）。
// どのシナリオに出るかは地図の一覧（frozenKingdom/map.ts の scourges）で決める。シナリオ1の地図には今の5体の一覧を書いてあるので、ここの3体は出ない。
// order は今の5体（1〜5）の後ろ（選ぶ時の乱数の順番は、この順で決まる）
import type { ScourgeDef } from '../../../../types';

export const frozenScourges: ScourgeDef[] = [
  {
    id: 'whiteWolfKing',
    order: 6,
    name: '白狼王',
    short: '白狼王',
    boss: 'scourgeWhiteWolfKing',
    // 4人の冒険は3体目の熾火の雪狼も（決める事3-A: 3体とも狼）
    minions: ['frostWolf', 'frostWolf', 'emberFrostWolf'],
    // 悪さ: 寒さのダメージ ×2（寒さだけ。帯の倍率と掛け算。HPは1で止まる・温泉と野営で防げるのは今のまま）
    curse: { coldMul: 2 },
    curseShort: '寒さ×2',
    curseText: '寒さで減るHPが2倍になる（野営・温泉で防げるのは今までどおり。HPは1で止まる）',
    // 報酬【提案】: 専用の装備と秘薬1つ（悪夢の魔獣・氷嵐の魔女・業火の魔人と同じ形）
    reward: { elixir: 1 },
    gear: 'springWaitCloak',
    boon: {
      kind: 'frostBreath',
      status: 'freeze',
      soloStatus: 'weak',
      amount: 1,
      name: '白い息',
      text: '戦闘の始めに、味方1人が「凍結」1（2ターン目のマナ−1）。1人の時は代わりに「弱体」1（1ターン目に与えるダメージ×0.75）。灯火のランタンで防げる（凍結は雪解けの指輪でも）',
    },
    appearText: '白い大きな狼が、雪原の群れを率いて遠吠えを上げた。風が刺すように冷たくなる。',
    clearText: '白狼王が倒れ、群れは山へ散っていった。寒さが元の強さに戻った。',
  },
  {
    id: 'frostBellWraith',
    order: 7,
    name: '凍て鐘の亡霊',
    short: '亡霊',
    boss: 'scourgeBellWraith',
    minions: ['frozenSoldier', 'iceSwordsman', 'frozenSoldier'],
    // 悪さ: 街道が雪に埋もれる（街道の移動ボーナス +1 だけが無くなる。湖の氷の +2 は残る）
    curse: { buryRoad: true },
    curseShort: '街道 雪',
    curseText: '街道が雪に埋もれ、街道の上で振るサイコロの+1が無くなる（湖の氷の+2は残る）',
    reward: { elixir: 1 },
    gear: 'everIceBracer',
    boon: {
      kind: 'bellToll',
      every: 3,
      pct: 50,
      name: '鐘の響き',
      text: '3ターンごと（3・6・9…ターン目）の「🔔鐘の番」に、ボス・中ボスの単体攻撃が、ほかの味方全員にも半分響く（ブロックで防げる。鐘の番は全員で守る・BREAK する）',
    },
    appearText: '雪の向こうで、だれも撞かないはずの鐘が鳴りはじめた。鳴るたびに雪が降り積もり、街道が埋もれていく。',
    clearText: '鐘の音がやんだ。雪が片付けられ、街道をまた速く歩けるようになった。',
  },
  {
    id: 'lampEaterShade',
    order: 8,
    name: '灯を喰らう影',
    short: '影',
    boss: 'scourgeLightEater',
    minions: ['frozenGhoul', 'frostSprite', 'frozenGhoul'],
    // 悪さ: 昼も夜も視界 −1（最低1マス。見晴らしの塔・見取り図は今のまま働く）
    curse: { visionDown: 1 },
    curseShort: '視界−1',
    curseText: '昼も夜も、見える広さが1マス狭くなる（最低1マス。見晴らしの塔・見取り図は今までどおり）',
    reward: { elixir: 1 },
    // 錫杖。使えるジョブ（転職で届くジョブも）がいないパーティには出ない（scourgeFits）
    gear: 'springbringerScepter',
    boon: {
      kind: 'darkVeil',
      seeItems: ['lampLantern'],
      name: '闇の帳',
      text: 'ボス・中ボスの最初の予告は、名前と数字が見えない（攻撃・守り・特殊と、大技かどうかは見える）。見るには: 影を倒す・ランダムダンジョンの主を倒して見破る（ボスだけ）・灯火のランタンを着ける',
    },
    appearText: 'たいまつの灯が、ひとりでに細くなった。大きな影が灯りを喰らい、遠くまで見通せなくなる。',
    clearText: '影が散り、灯りが元の明るさに戻った。遠くまで見通せるようになった。',
  },
];
