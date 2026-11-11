import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { PETS } from '../../data/pets';
import { applyGameCommand, createGame, createRng, migrateGame } from '../index';
import { rollPetColor, rollPetOfferColors } from '../game/pets';

const fresh = () => createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', name: '確認', gender: 'male', playerId: 'P1' }] });
function encounter() {
  const g = fresh(); g.world!.story = undefined; g.heroes[0].gold = 200;
  g.mode = 'event'; g.party = ['h0']; g.event = { eventId: 'rStrayBird', tile: g.world!.pos.h0, random: true };
  const r = applyGameCommand(g, { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 2, focusUsed: 0 });
  expect(r.error).toBeUndefined(); return r.state;
}
describe('出会った時点で決まる毛色', () => {
  it.each(PETS.all.map(p => p.id))('%sに通常2色・珍しい2色があり、境界35/35/15/15で抽選する', id => {
    const p = PETS.get(id);
    expect(p.colors.map(c => c.rarity)).toEqual(['normal', 'normal', 'rare', 'rare']);
    expect(BALANCE.petColorWeights).toEqual([35, 35, 15, 15]);
    for (const [r, i] of [[0, 0], [0.349999, 0], [0.35, 1], [0.699999, 1], [0.7, 2], [0.849999, 2], [0.85, 3], [0.999999, 3]]) {
      expect(rollPetColor(id, { next: () => r, int: () => 0, state: 1 })).toBe(p.colors[i].id);
    }
  });
  it('同じ種で候補と色を20回生成しても同じ状態・乱数になる', () => {
    const expected = encounter();
    expect(expected.heroes[0].petOffer?.length).toBeGreaterThan(0);
    expect(Object.keys(expected.heroes[0].petOfferColors!)).toEqual(expected.heroes[0].petOffer);
    for (let n = 0; n < 20; n++) expect(encounter()).toEqual(expected);
  });
  it('10000回の分布が通常各35%・珍しい各15%付近となる', () => {
    const rng = createRng(23), counts = [0, 0, 0, 0], p = PETS.get('cockatiel');
    for (let n = 0; n < 10000; n++) { const color = rollPetColor(p.id, rng); counts[p.colors.findIndex(c => c.id === color)]++; }
    counts.forEach((v, i) => expect(Math.abs(v / 100 - BALANCE.petColorWeights[i])).toBeLessThan(2));
  });
  it('候補切替・保存再開・採用で引き直さず、名前を残し、再送は拒否する', () => {
    let g = fresh(); const h = g.heroes[0];
    h.petOffer = ['cockatiel', 'rabbit']; h.petOfferColors = rollPetOfferColors(h.petOffer, createRng(17));
    const saved = JSON.stringify(g), col = h.petOfferColors.rabbit, rng = g.rngState;
    g = migrateGame(JSON.parse(saved))!;
    const r = applyGameCommand(g, { type: 'ADOPT_PET', playerId: 'P1', heroId: 'h0', petId: 'rabbit', name: 'もち' });
    expect(r.error).toBeUndefined(); expect(r.state.heroes[0].pet).toMatchObject({ petId: 'rabbit', color: col, name: 'もち' });
    expect(r.state.rngState).toBe(rng); expect(r.state.heroes[0].petOfferColors).toBeUndefined();
    expect(applyGameCommand(r.state, { type: 'ADOPT_PET', playerId: 'P1', heroId: 'h0', petId: 'rabbit' }).error).toBeTruthy();
  });
  it('任意の色と他人の採用は拒否し候補・乱数を維持する', () => {
    const g = fresh(); g.heroes[0].petOffer = ['cockatiel']; g.heroes[0].petOfferColors = { cockatiel: 'pearl' };
    const before = structuredClone(g);
    for (const [playerId, color] of [['P1', 'lutino'], ['P2', 'pearl']] as const) {
      const r = applyGameCommand(g, { type: 'ADOPT_PET', playerId, heroId: 'h0', petId: 'cockatiel', color });
      expect(r.error).toBeTruthy(); expect(r.state).toEqual(before);
    }
  });
  it.each(['normal', 'pearl'])('%sの採用ログは珍しい色の時だけお祝いを出す', color => {
    const g = fresh(); g.heroes[0].petOffer = ['cockatiel']; g.heroes[0].petOfferColors = { cockatiel: color };
    const r = applyGameCommand(g, { type: 'ADOPT_PET', playerId: 'P1', heroId: 'h0', petId: 'cockatiel' });
    expect(r.error).toBeUndefined(); expect(r.state.log.some(l => l.text.includes('✨珍しい毛色！'))).toBe(color === 'pearl');
  });
});
