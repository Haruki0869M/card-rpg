// ホストの引き継ぎの直し（2026-11-14）: 「代わりに操作する」が押せるまでの待ち
import { describe, expect, it } from 'vitest';
import { BEAT_MS, STALE_MS } from '../net/room';
import { PROXY_GRACE_MS, PROXY_HOLD_MS, proxyReadyAt, proxyWaitLeft } from './onlineStore';

describe('代わりに操作できるまでの待ち', () => {
  it('ホストが眠った: 止まったとみなされて引き継いだ時には、5秒ほどで押せる（前は、そこから60秒）', () => {
    // 眠る直前に「動いている」を書いた（最悪の場合）。止まったとみなすのは 35秒後、相方が気づくのは見回りの間隔の分だけ後
    const sleep = 0;
    const noticed = sleep + STALE_MS + BEAT_MS / 2;
    const ready = proxyReadyAt({ beat: sleep }, noticed);
    expect(ready - sleep).toBe(STALE_MS + BEAT_MS / 2 + PROXY_GRACE_MS);
    expect(ready - sleep).toBeLessThanOrEqual(45_000);
    expect(proxyWaitLeft(noticed, ready)).toBe(5);
    expect(proxyWaitLeft(ready, ready)).toBe(0);
  });

  it('通信が切れた（すぐ気づく）: 最後に動いていた時から35秒たつまで待つ', () => {
    const ready = proxyReadyAt({ beat: 1_000 }, 3_000);
    expect(ready).toBe(1_000 + STALE_MS);
  });

  it('「動いている」を書かない古い端末: 気づいてから35秒', () => {
    expect(proxyReadyAt(undefined, 10_000)).toBe(10_000 + STALE_MS);
    expect(proxyReadyAt({}, 10_000)).toBe(10_000 + STALE_MS);
  });

  it('「もう少し待つ」を押したら、その30秒後まで出さない', () => {
    const now = 100_000;
    expect(proxyReadyAt({ beat: 0 }, 50_000, now + PROXY_HOLD_MS)).toBe(now + PROXY_HOLD_MS);
  });
});
