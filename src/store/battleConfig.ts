// テスト戦闘の設定（M2でタイトル〜キャラクター作成に置き換える）
import { CLASSES } from '../data/classes';
import { ENCOUNTERS } from '../data/enemies';
import type { BattleSetup, Gender, PartyMemberSpec, PlayerId } from '../types';

export interface BattleConfig {
  party: PartyMemberSpec[];
  encounterId: string;
}

/** この端末のプレイヤー（M3のオンライン協力で部屋ごとに決まる） */
export const LOCAL_PLAYER: PlayerId = 'P1';

/** 職業と性別に合った名前（同じ名前が並ばないよう index でずらす） */
export function autoName(classId: string, gender: Gender, index: number): string {
  const list = CLASSES.get(classId).names[gender];
  return list[index % list.length];
}

export function member(classId: string, gender: Gender, index: number): PartyMemberSpec {
  return { classId, gender, name: autoName(classId, gender, index), playerId: LOCAL_PLAYER };
}

export function defaultConfig(): BattleConfig {
  return { party: [member('warrior', 'male', 0), member('mage', 'female', 1)], encounterId: 'goblinBand' };
}

/** 保存データなどから読んだ設定が今のデータで使えるか確認し、使えなければ既定値にする */
export function sanitizeConfig(c: BattleConfig | undefined): BattleConfig {
  if (!c || !Array.isArray(c.party) || c.party.length < 1 || c.party.length > 4) return defaultConfig();
  if (!ENCOUNTERS.has(c.encounterId)) return defaultConfig();
  if (c.party.some((m) => !CLASSES.has(m.classId) || (m.gender !== 'male' && m.gender !== 'female'))) return defaultConfig();
  return c;
}

export function toSetup(seed: number, c: BattleConfig): BattleSetup {
  return { seed, party: c.party, encounter: ENCOUNTERS.get(c.encounterId) };
}
