import type { SanctuaryDef } from '../../../types';

// 対応する職の altar に同じ印を持たせる。ジョブ本体はJ3dの後続段階で追加する。
export const sanctuaries: SanctuaryDef[] = [
  { id: 'pilgrimTemple', kind: 'temple', name: '巡礼の神殿', text: '新しい道へ進む者を迎える神殿。最上位職と特殊職へ転職できる。', progress: 0.3 },
  { id: 'summitTemple', kind: 'temple', name: '天望の神殿', text: '旅の果てを見守る神殿。最上位職と特殊職へ転職できる。', progress: 0.7 },
  { id: 'samuraiAltar', kind: 'altar', altar: 'samurai', name: '侍の祭壇', text: '静かな刃に誓う場所。侍への転職ができる。', progress: 0.25 },
  { id: 'magicKnightAltar', kind: 'altar', altar: 'magicKnight', name: '魔剣士の祭壇', text: '魔力と剣を重ねる場所。魔剣士への転職ができる。', progress: 0.35 },
  { id: 'timeMageAltar', kind: 'altar', altar: 'timeMage', name: '時魔道士の祭壇', text: '時の流れを感じる場所。時魔道士への転職ができる。', progress: 0.5 },
  { id: 'necromancerAltar', kind: 'altar', altar: 'necromancer', name: '死霊術師の祭壇', text: '亡者の声を聞く場所。死霊術師への転職ができる。', progress: 0.55 },
  { id: 'darkKnightAltar', kind: 'altar', altar: 'darkKnight', name: '暗黒騎士の祭壇', text: '闇の誓いを結ぶ場所。暗黒騎士への転職ができる。', progress: 0.65 },
  { id: 'shrineMaidenAltar', kind: 'altar', altar: 'shrineMaiden', name: '巫女の祭壇', text: '神々へ祈りを捧げる場所。巫女への転職ができる。', progress: 0.2 },
  { id: 'astrologerAltar', kind: 'altar', altar: 'astrologer', name: '占星術師の祭壇', text: '星の巡りを読む場所。占星術師への転職ができる。', progress: 0.45 },
  { id: 'machinistAltar', kind: 'altar', altar: 'machinist', name: '機工士の祭壇', text: '古い機構を伝える場所。機工士への転職ができる。', progress: 0.4 },
  { id: 'bardAltar', kind: 'altar', altar: 'bard', name: '吟遊詩人の祭壇', text: '旅の歌を奏でる場所。吟遊詩人への転職ができる。', progress: 0.15 },
  { id: 'gamblerAltar', kind: 'altar', altar: 'gambler', name: '賭博師の祭壇', text: '運命と向き合う場所。賭博師への転職ができる。', progress: 0.6 },
];
