import { CLASSES } from '../../data/classes';
import { ENCOUNTERS } from '../../data/enemies';
import type { BattleSetup, BattleState, CardInstance, Command, PartyMemberSpec } from '../../types';
import { applyCommand } from '../battle/battle';

/** テスト用のパーティ（職業IDの並び） */
export function party(...classIds: string[]): PartyMemberSpec[] {
  return classIds.map((classId, i) => ({
    classId,
    gender: i % 2 ? 'female' : 'male',
    name: `${CLASSES.get(classId).name}${i}`,
    playerId: 'P1',
  }));
}

export function setup(seed: number, classIds: string[] = ['warrior', 'mage'], encounterId = 'goblinBand'): BattleSetup {
  return { seed, party: party(...classIds), encounter: ENCOUNTERS.get(encounterId) };
}

/** 指定キャラの手札を差し替える */
export function giveHand(state: BattleState, allyId: string, cardIds: string[]): CardInstance[] {
  const ally = state.allies.find((a) => a.id === allyId)!;
  ally.hand = cardIds.map((cardId, i) => ({ uid: `t${i}`, cardId }));
  return ally.hand;
}

export const play = (characterId: string, cardInstanceId: string, targetId: string | undefined, focusUsed: number): Command => ({
  type: 'PLAY_CARD',
  playerId: 'P1',
  characterId,
  cardInstanceId,
  targetId,
  focusUsed,
});

export const END: Command = { type: 'END_TURN', playerId: 'P1' };

/** ターン終了 → 敵フェーズを最後まで進める */
export function nextTurn(s: BattleState): BattleState {
  let st = applyCommand(s, END).state;
  let guard = 0;
  while (st.phase === 'enemy' && guard++ < 20) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}

/** 敵を倒されないよう味方のHPを大きくする */
export function makeImmortal(s: BattleState) {
  s.allies.forEach((a) => (a.hp = a.maxHp = 99999));
}
