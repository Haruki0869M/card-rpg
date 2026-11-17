// 賢い検証 bot の入口（&seed=）: エミュレーターにつないだ時（?emu=）だけ働く。本番・?debug だけの URL では何もしない
import { afterEach, describe, expect, it, vi } from 'vitest';

const at = (url: string) => vi.stubGlobal('location', new URL(url));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

// 最初の読み込み（エンジン・ストア）が重いので、時間に余裕を持たせる
describe('確認用の入口 &seed=', { timeout: 30_000 }, () => {
  it('?emu= の無い URL では、&seed= があっても種を決めない（口も入らない）', async () => {
    at('https://card-rpg-1aa60.web.app/?seed=12345');
    const { debugSeed } = await import('./onlineDebug');
    const { startSeedHook } = await import('../store/onlineStore');
    expect(debugSeed()).toBeUndefined();
    expect(startSeedHook.seed).toBeUndefined();
  });

  it('?debug だけでも働かない', async () => {
    at('https://card-rpg-1aa60.web.app/?debug&seed=12345');
    const { debugSeed } = await import('./onlineDebug');
    const { startSeedHook } = await import('../store/onlineStore');
    expect(debugSeed()).toBeUndefined();
    expect(startSeedHook.seed).toBeUndefined();
  });

  it('?emu= の時は、&seed=数字 を種にする（数字でなければ使わない）', async () => {
    at('http://127.0.0.1:4191/card-rpg/?emu=127.0.0.1&seed=12345');
    const { debugSeed } = await import('./onlineDebug');
    const { startSeedHook } = await import('../store/onlineStore');
    expect(debugSeed()).toBe(12345);
    expect(startSeedHook.seed?.()).toBe(12345);
    at('http://127.0.0.1:4191/card-rpg/?emu=1&seed=abc');
    expect(debugSeed()).toBeUndefined();
    at('http://127.0.0.1:4191/card-rpg/?emu=1');
    expect(debugSeed()).toBeUndefined();
  });
});
