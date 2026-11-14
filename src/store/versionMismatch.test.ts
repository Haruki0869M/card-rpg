// 版の違う2台（点検 F2）: ずれの直しが同じ番号で続いたら、読み込み直しを頼む
import { describe, expect, it } from 'vitest';
import { noteResync, type ResyncLoop } from './onlineStore';

describe('版の違う2台の見分け', () => {
  it('同じ番号への取り直し（通らない操作・ずれ）が2回続いたら1回だけ知らせる', () => {
    const st: ResyncLoop = { seq: -1, count: 0, shown: false };
    expect(noteResync(st, 10, 'join')).toBe(false);
    expect(noteResync(st, 10, 'error')).toBe(false);
    expect(noteResync(st, 10, 'error')).toBe(true);
    expect(noteResync(st, 10, 'hash')).toBe(false);
  });

  it('番号が進んでいれば知らせない（ふつうのずれの直し）', () => {
    const st: ResyncLoop = { seq: -1, count: 0, shown: false };
    expect(noteResync(st, 10, 'error')).toBe(false);
    expect(noteResync(st, 20, 'hash')).toBe(false);
    expect(noteResync(st, 30, 'error')).toBe(false);
  });

  it('切断から戻った（gap）・入った（join）時は数え直す', () => {
    const st: ResyncLoop = { seq: -1, count: 0, shown: false };
    expect(noteResync(st, 10, 'error')).toBe(false);
    expect(noteResync(st, 10, 'gap')).toBe(false);
    expect(noteResync(st, 10, 'error')).toBe(false);
  });
});
