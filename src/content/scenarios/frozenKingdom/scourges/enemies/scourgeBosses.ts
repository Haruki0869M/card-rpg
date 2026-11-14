// シナリオ2「凍てつく王国」だけの災厄3体の本体（2026-11-14 区切り3b）。
// ふだんの姿は docs/tasks/scenario2-scourge-enemies-proposal.md（オーナーの返事 5つとも A）、段階は docs/tasks/scenario2-theme-scourge-proposal.md
// §2-2（鐘のこだま A）・§2-3（灯喰い A）・§5（吹雪に隠れる A）。数字は全部【提案】（案のまま。難しさの調整は後でまとめて）。
// 作りは今の5体（common/scourges/enemies/scourgeBosses.ts）と同じ: 基準 Lv7・経験値90・お金60・HP50%で段階1つ・開幕の一手つき・
// 大技は1〜2個で全部に予告の文・味方の番を止める状態異常（凍結など）は使わない・絵は今ある敵の絵を借りて、足元の光の色で見分ける（専用の絵は後で）
import type { EnemyDef } from '../../../../../types';

/**
 * 白狼王（元の絵: 雪狼を大きく・銀色の光）: 「群れの数が、そのまま牙の数。手下を減らすか王を急ぐかを、王が隠れるたびに選び直す戦い」。
 * ブロックも回復も持たない。1ターン目は必ず「群れの牙」（群れが全員そろった、いちばん痛い時を最初に見せる）
 */
export const scourgeWhiteWolfKing: EnemyDef = {
  id: 'scourgeWhiteWolfKing',
  name: '白狼王',
  icon: '💀',
  variantOf: 'frostWolf',
  aura: 'iron',
  maxHp: 170,
  baseLevel: 7,
  size: 1.4,
  exp: 90,
  gold: 60,
  weak: ['fire'],
  resist: ['ice'],
  pattern: 'sequence',
  firstActionId: 'wkPack',
  actions: [
    { id: 'wkPack', name: '群れの牙', big: true, hint: '狙った1人に、生きている敵の数（王も数える）だけ噛みつく。手下の狼を先に倒すと回数が減る。ブロックで受けるか、火の弱点で BREAK する', effects: [{ kind: 'damage', amount: 6, packHits: true }] },
    { id: 'wkHunt', name: '追い立てる', big: true, behavior: 'hunt', brief: '最後に殴った人を狙う', hint: '前のターンに王を最後に攻撃した味方を狙う（だれもいなければHPの割合がいちばん低い味方）。HPが半分以下だと×1.5。守りの固い人が最後に殴る', effects: [{ kind: 'damage', amount: 13, lowHpMul: 1.5, huntBy: 'lastHit' }] },
    { id: 'wkRend', name: '噛み裂く', effects: [{ kind: 'damage', amount: 7, hits: 2 }] },
  ],
  phases: [
    {
      belowHpPct: 50,
      name: '吹雪をまとう白狼王',
      pattern: 'sequence',
      openingActionId: 'wkHide',
      rule: '吹雪に隠れる: 次の敵の番まで、単体のカードは白狼王に外れる（ダメージ0）。全体攻撃・お供・召喚・毒・反撃・道具は当たる。隠れる予告を火の弱点で BREAK すると隠れられない',
      actions: [
        { id: 'wkHide', name: '吹雪に隠れる', big: true, hint: '次の敵の番まで、単体のカードは白狼王に外れる（全体攻撃・お供・召喚・毒・反撃・道具は当たる）。火の弱点で BREAK すると隠れられない', effects: [{ kind: 'hide' }] },
        { id: 'wkAmbush', name: '吹雪からの奇襲', big: true, hint: '吹雪の中からの大きな氷の一撃。ブロックで受けるか、火の弱点で BREAK して半分にする（隠れている間も、単体のカードで崩せる）', effects: [{ kind: 'damage', amount: 22, element: 'ice' }] },
        { id: 'wkPack2', name: '群れの牙', big: true, hint: '狙った1人に、生きている敵の数（王も数える）だけ噛みつく。手下の狼を先に倒すと回数が減る。ブロックで受けるか、火の弱点で BREAK する', effects: [{ kind: 'damage', amount: 7, packHits: true }] },
      ],
    },
  ],
};

/**
 * 凍て鐘の亡霊（元の絵: 霜鈴の亡霊騎士・淡い金色の光）: 「前半は『手下を倒すと弔いの鐘が鳴り始める』、後半は『大きく殴るほど自分に返る』」。
 * ふだんも段階も、自分にブロックを張る行動・回復を1つも持たない（こだまで小さく刻んだ分がブロックに吸われない）
 */
export const scourgeBellWraith: EnemyDef = {
  id: 'scourgeBellWraith',
  name: '凍て鐘の亡霊',
  icon: '💀',
  variantOf: 'frostBellKnight',
  aura: 'holy',
  maxHp: 150,
  baseLevel: 7,
  size: 1.3,
  exp: 90,
  gold: 60,
  weak: ['holy', 'thunder'],
  resist: ['ice', 'dark'],
  pattern: 'sequence',
  actions: [
    { id: 'bwStrike', name: '霜の鐘打ち', effects: [{ kind: 'damage', amount: 13, element: 'ice' }] },
    { id: 'bwDouble', name: '二度打ち', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
    { id: 'bwChime', name: '霜の響き', effects: [{ kind: 'damage', amount: 5, element: 'ice', to: 'foes' }] },
    // 割り込み（手下が1体でも倒れていると、3ターンに1回）。順番では選ばない。段階に入ると鳴らない（段階の行動に入れない）
    { id: 'bwFuneral', name: '葬送の鐘', big: true, scripted: true, cutIn: { when: 'allyDown' }, hint: '手下が倒れていると、3ターンに1回割り込んで鳴らす。味方全員に氷7と「痺れ」1（カードの成功率−15%）。段階に入ると鳴らなくなる。聖か雷の弱点で BREAK すると半分', effects: [{ kind: 'damage', amount: 7, element: 'ice', to: 'foes' }, { kind: 'applyStatus', status: 'paralysis', amount: 1, to: 'foes' }] },
  ],
  phases: [
    {
      belowHpPct: 50,
      name: '鳴り止まぬ弔鐘',
      pattern: 'sequence',
      openingActionId: 'bwToll',
      rule: '鐘のこだま: こだまの予告が出ているターンに亡霊へ当てた「いちばん大きな一撃」が、敵の番に味方全員へ返る（最大40。ブロックで防げる。毒・火傷は数えない）。小さく刻む・守る・こだまの無いターンに大技を撃つ',
      actions: [
        { id: 'bwToll', name: '弔鐘を構える', big: true, scripted: true, hint: 'このターンに亡霊へ当てた「いちばん大きな一撃」が、敵の番に味方全員へ返る（最大40。ブロックで防げる。毒・火傷は数えない）。小さく刻むか、守る。聖か雷の弱点で BREAK すると半分', effects: [{ kind: 'echoBlow', max: 40 }] },
        { id: 'bwIceStrike', name: '氷の鐘打ち', effects: [{ kind: 'damage', amount: 15, element: 'ice' }] },
        { id: 'bwFreezeChime', name: '凍える響き', effects: [{ kind: 'damage', amount: 7, element: 'ice', to: 'foes' }] },
        { id: 'bwEcho', name: '鐘のこだま', big: true, hint: 'このターンに亡霊へ当てた「いちばん大きな一撃」が、敵の番に味方全員へ返る（最大40。ブロックで防げる。毒・火傷は数えない）。小さく刻むか、守る。聖か雷の弱点で BREAK すると半分', effects: [{ kind: 'echoBlow', max: 40 }] },
      ],
    },
  ],
};

/**
 * 灯を喰らう影（元の絵: 霜蛾を大きく・紫の光）: 「順番を覚えても読めない影。前半は『啜られないよう守る』、後半は『フォーカスを切るターンを自分で決める』」。
 * 行動の決め方はランダム（同じ行動は2回続かない）。毎ターンの予告は全部見える。段階では「灯を啜る」（回復）を使わない
 */
export const scourgeLightEater: EnemyDef = {
  id: 'scourgeLightEater',
  name: '灯を喰らう影',
  icon: '💀',
  variantOf: 'frostMoth',
  aura: 'shadow',
  maxHp: 160,
  baseLevel: 7,
  size: 1.5,
  exp: 90,
  gold: 60,
  weak: ['holy', 'fire'],
  resist: ['dark', 'ice'],
  pattern: 'random',
  maxConsecutive: 1,
  actions: [
    { id: 'leClaw', name: '影の爪', effects: [{ kind: 'damage', amount: 12, element: 'dark' }] },
    { id: 'leSip', name: '灯を啜る', big: true, hint: 'HPに通ったダメージと同じだけ、影が回復する（最大14）。ブロックで全部受ければ1も回復しない。聖か火の弱点で BREAK すると半分', effects: [{ kind: 'damage', amount: 14, element: 'dark' }, { kind: 'healPctOfDealt', pct: 100, max: 14 }] },
    { id: 'leWave', name: '闇の波', big: true, hint: '味方全員に闇のダメージ。ブロックで受けるか、聖か火の弱点で BREAK する', effects: [{ kind: 'damage', amount: 7, element: 'dark', to: 'foes' }] },
  ],
  phases: [
    {
      belowHpPct: 50,
      name: '灯を喰らい尽くす影',
      pattern: 'random',
      maxConsecutive: 1,
      openingActionId: 'leReach',
      // 灯喰い: 味方がフォーカスを1つ使うたび「喰った灯」+1（最大6）。1つにつき影の攻撃+2。BREAK で0に戻る
      focusFeed: { per: 2, max: 6 },
      rule: '灯喰い: 味方がフォーカスを1つ使うたび「喰った灯」+1（最大6）。1つにつき影の攻撃が+2。影を BREAK すると0に戻る。フォーカスを使うターンを選ぶ',
      actions: [
        { id: 'leReach', name: '灯に手を伸ばす', big: true, scripted: true, hint: '味方全員に闇のダメージ。ここから、味方がフォーカスを1つ使うたび影の攻撃が+2（最大6つ）。BREAK すると0に戻る', effects: [{ kind: 'damage', amount: 6, element: 'dark', to: 'foes' }] },
        { id: 'leGreatClaw', name: '影の大爪', effects: [{ kind: 'damage', amount: 14, element: 'dark' }] },
        { id: 'leGreatJaw', name: '影の大顎', big: true, hint: '大きな闇の一撃（喰った灯の分だけ強い）。聖か火の弱点で BREAK すると半分になり、喰った灯も0に戻る', effects: [{ kind: 'damage', amount: 20, element: 'dark' }] },
        { id: 'leGreatWave', name: '闇の大波', big: true, hint: '味方全員に闇のダメージ（喰った灯の分だけ強い）。聖か火の弱点で BREAK すると半分になり、喰った灯も0に戻る', effects: [{ kind: 'damage', amount: 8, element: 'dark', to: 'foes' }] },
      ],
    },
  ],
};
