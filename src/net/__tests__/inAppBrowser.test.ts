// ===== LINE などアプリの中のブラウザの見分けと、招待リンクの印（実機の不具合③・点検 F4） =====
import { afterEach, describe, expect, it, vi } from 'vitest';
import { inviteUrl } from '../../components/screens/OnlineScreens';
import { inAppBrowser, inAppBrowserNote, OPEN_EXTERNAL_PARAM } from '../inAppBrowser';
import { normalizeCode } from '../room';

afterEach(() => vi.unstubAllGlobals());

describe('アプリの中のブラウザの見分け', () => {
  it('LINE（User-Agent に Line/）は LINE の案内', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 Line/14.9.0/IAB';
    expect(inAppBrowser(ua)).toBe('line');
    expect(inAppBrowserNote('line')).toContain('ほかのブラウザで開く');
    expect(inAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.10.0')).toBe('line');
  });
  it('Facebook・Instagram はほかのアプリの案内。ふつうのブラウザ・Android の WebView だけの物には出さない', () => {
    expect(inAppBrowser('Mozilla/5.0 (iPhone) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0]')).toBe('other');
    expect(inAppBrowser('Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36 Instagram 300.0')).toBe('other');
    expect(inAppBrowser('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36')).toBeNull();
    expect(inAppBrowser('Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Version/4.0 Chrome/129.0 Mobile Safari/537.36')).toBeNull();
    expect(inAppBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0 Safari/537.36 Edg/129.0')).toBeNull();
    expect(inAppBrowser(undefined)).toBeNull();
    expect(inAppBrowserNote(null)).toBeNull();
  });
});

describe('招待のリンク', () => {
  it('openExternalBrowser=1 を付ける。合言葉の読み取り（room）はそのまま。as は外す', () => {
    vi.stubGlobal('location', new URL('https://card-rpg-1aa60.web.app/?as=b&emu=1#x'));
    const url = new URL(inviteUrl('KX7P'));
    expect(url.searchParams.get(OPEN_EXTERNAL_PARAM)).toBe('1');
    expect(url.searchParams.get('room')).toBe('KX7P');
    expect(url.searchParams.has('as')).toBe(false);
    expect(url.hash).toBe('');
    // 部屋に入る画面は room だけを読む（印は無視される）
    expect(normalizeCode(new URLSearchParams(url.search).get('room') ?? '')).toBe('KX7P');
  });
  it('印の付いたページから、もう一度招待しても印は1つ', () => {
    vi.stubGlobal('location', new URL(`https://card-rpg-1aa60.web.app/?room=AAAA&${OPEN_EXTERNAL_PARAM}=1`));
    const url = new URL(inviteUrl('KX7P'));
    expect(url.searchParams.getAll(OPEN_EXTERNAL_PARAM)).toEqual(['1']);
    expect(url.searchParams.get('room')).toBe('KX7P');
  });
});
