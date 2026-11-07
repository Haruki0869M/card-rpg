import { useEffect, useState } from 'react';

/** 画面の高さが十分あるか（選んだカードを大きく浮かせる余裕があるか）。回転や大きさの変更にもついていく */
export const TALL_SCREEN = 700;
export function useTallScreen(): boolean {
  const get = () => typeof window === 'undefined' || window.innerHeight >= TALL_SCREEN;
  const [tall, setTall] = useState(get);
  useEffect(() => {
    const on = () => setTall(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return tall;
}
