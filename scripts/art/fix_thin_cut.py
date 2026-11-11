# 使い方: py scripts/art/fix_thin_cut.py <元画像のフォルダ> <名前> [広げるpx] [背景との色の差のしきい値]
# （先に build_art.py を1回動かして、<フォルダ>/.cut/<名前>.png（rembg の切り抜き）を作っておく。直した物で上書きする）
# 細い槍が薄くなる・槍と足の間に背景が残る切り抜きを直す。
# rembg の切り抜き（.cut/<n>.png）の近く（少し広げた範囲）だけで、背景の色との差から不透明さを決め直す。
import sys
import numpy as np
from PIL import Image, ImageFilter

src_dir, name, grow = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 9
orig = Image.open(f'{src_dir}/{name}.png').convert('RGB')
cut = Image.open(f'{src_dir}/.cut/{name}.png').convert('RGBA')
a = np.array(orig).astype(float)
h, w, _ = a.shape
# 背景の色: 四隅の近くの中央値
corners = np.concatenate([a[:20, :20].reshape(-1, 3), a[:20, -20:].reshape(-1, 3), a[-20:, :20].reshape(-1, 3), a[-20:, -20:].reshape(-1, 3)])
bg = np.median(corners, 0)
d = np.sqrt(((a - bg) ** 2).sum(2))
t0 = float(sys.argv[4]) if len(sys.argv) > 4 else 14.0
t1 = t0 + 26
key = np.clip((d - t0) / (t1 - t0), 0, 1)
ra = np.array(cut.getchannel('A'))
mask = Image.fromarray(((ra > 8) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * grow + 1))
m = np.array(mask) > 0
rows = np.arange(h)[:, None] < h * 0.86
alpha = ra.astype(float)
# 背景の色そのもの（槍と足の間に残った背景）は消す
alpha = np.where(d < t0, 0, alpha)
# 細い物（槍）: rembg が薄くした所を、足元（下の14%。床の影がある）以外で、色の差から戻す
dark = a.mean(2) < bg.mean() - 50
alpha = np.where(m & rows & dark & (key * 255 > alpha), key * 255, alpha).astype(np.uint8)
out = Image.fromarray(np.array(orig)).convert('RGBA')
out.putalpha(Image.fromarray(alpha))
out.save(f'{src_dir}/.cut/{name}.png')
print(name, 'bg', bg.round(), 'done')
