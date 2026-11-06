// 遭遇の組み合わせ（タイトルの「テスト戦闘」・テスト用）
import type { EncounterSpec } from '../../../types';

export const testBattles: EncounterSpec[] = [
  { id: 'goblinBand', name: '獣人の一団（3体）', enemies: [{ defId: 'goblinBrute' }, { defId: 'chaosShaman' }, { defId: 'goblinScout' }] },
  { id: 'bruteAlone', name: '重装兵（1体）', enemies: [{ defId: 'goblinBrute' }] },
  { id: 'scoutPair', name: '斥候の二人組（2体）', enemies: [{ defId: 'goblinScout' }, { defId: 'goblinScout' }] },
  {
    id: 'warband',
    name: '獣人の軍勢（4体）',
    enemies: [{ defId: 'goblinBrute' }, { defId: 'chaosShaman' }, { defId: 'goblinScout' }, { defId: 'goblinScout' }],
  },
];
