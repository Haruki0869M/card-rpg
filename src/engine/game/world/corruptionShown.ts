// ===== 画面に出す侵食度 =====
// 侵食度は 0.25 刻みの小数で上がることがある（ダンジョンが長くなったので、1回の番の量を小さくした）。画面では切り捨てて整数%で出す
export const corruptionShown = (corruption: number) => Math.floor(corruption);
