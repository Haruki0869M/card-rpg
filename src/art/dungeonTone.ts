// 自動で作るファイル（scripts/art/build_art.py の write_dungeon_tone）。手で直さない。
// 通路の絵の明るさ（0〜255 の平均）。暗い絵のダンジョンで、扉の縁を明るくし、通路の奥の暗さを弱めるのに使う。
export const DUNGEON_TONE: Record<string, { wall?: number; floor?: number; ceiling?: number; door?: number }> = {
  castle: { wall: 54, floor: 41, ceiling: 30, door: 48 },
  catacomb: { wall: 137, floor: 113, ceiling: 52, door: 95 },
  forestCave: { wall: 51, floor: 62, ceiling: 51, door: 51 },
  temple: { wall: 127, floor: 140, ceiling: 68, door: 56 },
  volcano: { wall: 53, floor: 52, ceiling: 33, door: 43 },
};
