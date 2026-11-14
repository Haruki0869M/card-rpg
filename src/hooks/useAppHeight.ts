// ===== アプリの高さ（実機の不具合② 2026-11-14） =====
// LINE 内ブラウザ（Android の WebView）は、上下の帯の分だけ「見えている高さ」が 100dvh より短い事がある。
// その時は下から出るシートの下が画面の外に切れるので、見えている高さ（visualViewport）を測って --app-h に入れる。
// 点検 F6: 指で拡大している時（scale > 1）と、文字入力のキーボードが出ている時は、測り直さない（前の値のまま）。
import { useEffect } from 'react';

type Env = {
  innerHeight: number;
  visualViewport?: { height: number; scale: number } | null;
  /** 文字を入力中か（キーボードが出ている疑い） */
  typing: boolean;
};

/** 見えている高さ（px）。測り直さない時は null */
export function visibleHeight(env: Env): number | null {
  const vv = env.visualViewport;
  if (!vv) return env.innerHeight > 0 ? Math.round(env.innerHeight) : null;
  if (vv.scale > 1.01 || env.typing) return null;
  const h = Math.min(env.innerHeight || vv.height, vv.height);
  return h > 0 ? Math.round(h) : null;
}

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
};

export function useAppHeight() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const h = visibleHeight({ innerHeight: window.innerHeight, visualViewport: window.visualViewport, typing: isTyping() });
      if (h !== null) root.style.setProperty('--app-h', `${h}px`);
    };
    apply();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    // キーボードが閉じた後に測り直す
    document.addEventListener('focusout', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      document.removeEventListener('focusout', apply);
    };
  }, []);
}

/** 画面の情報（メニューの「画面の情報」。実機で切れた時に、写真で数字をもらうため） */
export function screenInfo(): { lines: string[] } {
  const vv = window.visualViewport;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:100dvh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const dvh = Math.round(probe.getBoundingClientRect().height);
  probe.style.height = '100vh';
  const vh = Math.round(probe.getBoundingClientRect().height);
  probe.remove();
  const appH = getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim() || '（未設定）';
  const ua = navigator.userAgent;
  const browser = /\bLine\//i.test(ua) ? 'LINE 内ブラウザ' : /\bwv\b/.test(ua) ? 'アプリ内ブラウザ（WebView）' : 'ふつうのブラウザ';
  return {
    lines: [
      `画面 ${window.innerWidth}×${window.innerHeight}（横×縦）`,
      `見えている高さ ${vv ? `${Math.round(vv.height)}（拡大 ${vv.scale.toFixed(2)}倍）` : '測れない'}`,
      `100dvh = ${dvh}・100vh = ${vh}・使っている高さ ${appH}`,
      `ブラウザ: ${browser}`,
      `UA: ${ua}`,
    ],
  };
}
