import { useEffect, useRef } from 'react';

/**
 * Android の「戻る」で選択やシートを閉じる。
 * 閉じられるものが開いた時に履歴を1つ積み、戻る操作が来たら closeTop() を呼んで積み直す。
 * history.back() は呼ばない（非同期で競合しやすいため）。
 */
export function useBackButton(hasClosable: boolean, closeTop: () => boolean) {
  const armed = useRef(false);
  const closeRef = useRef(closeTop);
  closeRef.current = closeTop;

  useEffect(() => {
    if (hasClosable && !armed.current) {
      try {
        history.pushState({ cardRpgGuard: true }, '');
        armed.current = true;
      } catch {
        /* noop */
      }
    }
  }, [hasClosable]);

  useEffect(() => {
    const onPop = () => {
      armed.current = false;
      if (closeRef.current()) {
        // まだ閉じるものが残っているかもしれないので再度積んでおく
        try {
          history.pushState({ cardRpgGuard: true }, '');
          armed.current = true;
        } catch {
          /* noop */
        }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
