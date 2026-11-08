// 自動で作るファイル（scripts/art/build_art.py の write_dungeon_tone）。手で直さない。
// 通路の絵の明るさ（0〜255 の平均）。暗い絵のダンジョンで扉の縁を明るくするのに使う。
export const DUNGEON_TONE: Record<string, { wall?: number; floor?: number; ceiling?: number; door?: number }> = {
  catacomb: { wall: 137, floor: 113, ceiling: 52, door: 95 },
  temple: { wall: 127, floor: 140, ceiling: 68, door: 56 },
  volcano: { wall: 53, floor: 52, ceiling: 33, door: 43 },
};
