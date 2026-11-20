// ===== 画面に出す侵食度 =====
// 侵食度は小数で上がることがある（今の値は 0.5 刻み）（ダンジョンが長くなったので、1回の番の量を小さくした）。画面では切り捨てて整数%で出す
export const corruptionShown = (corruption: number) => Math.floor(corruption);
