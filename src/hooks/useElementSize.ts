import { useLayoutEffect, useRef, useState } from 'react';

/** 要素の大きさ（ResizeObserver）。変化が1px未満なら更新しない */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((s) => (Math.abs(s.width - w) < 1 && Math.abs(s.height - h) < 1 ? s : { width: w, height: h }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
