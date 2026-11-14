# 箱庭の部品の絵（白い背景に物が並んだ1枚）を、1つずつに切り分けて src/assets/art/landscape/ に置く。
# 使い方: py scripts/art/split_diorama.py <元の絵> <大きさpx> <名前1> <名前2> ...
#   名前の順 = 上の段の左から（行は物の足元の高さでまとめる）。名前に "-" を付けると、その物は捨てる。
# 背景: 絵のふちにつながった白っぽい所だけを透明にする（物の中の白は残す）。
# そろえ方: 物を正方形の左右の真ん中に置き、足元を下の端（余白 1%）に合わせる。webp。
import sys, os
import numpy as np
import cv2
from PIL import Image

src, size, names = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'assets', 'art', 'landscape')

im = np.array(Image.open(src).convert('RGB')).astype(int)
mn, mx = im.min(2), im.max(2)
bg = ((mn > 228) & (mx - mn < 18)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(bg, connectivity=4)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
outside = np.isin(lab, list(edge))
alpha = np.where(outside, 0, 255).astype(np.uint8)
# ふちのにじみを少し削る
alpha = cv2.erode(alpha, np.ones((3, 3), np.uint8))
alpha = cv2.GaussianBlur(alpha, (3, 3), 0)

# 物のかたまり（小さなごみは捨てる。近いかたまりはまとめる）
solid = (alpha > 128).astype(np.uint8)
k = int(os.environ.get("MERGE", "25"))  # 近いかたまりをまとめる幅（px）
merged = cv2.dilate(solid, np.ones((k, k), np.uint8))
n2, lab2, st2, _ = cv2.connectedComponentsWithStats(merged, connectivity=8)
blobs = [i for i in range(1, n2) if st2[i, 4] > merged.size * 0.004]
if len(blobs) != len(names):
    sys.exit(f'物の数が合わない: 見つかった {len(blobs)} 個、名前 {len(names)} 個')
# 並べ方: 足元の高さで段に分け、段の中は左から
H = im.shape[0]
info = [(st2[i, 1] + st2[i, 3], st2[i, 0], i) for i in blobs]
info.sort(key=lambda t: (round(t[0] / (H * 0.25)), t[1]))
rgba = np.dstack([im.astype(np.uint8), alpha])
for (bottom, left, i), name in zip(info, names):
    if name == '-':
        continue
    mask = (lab2 == i)
    piece = rgba.copy()
    piece[..., 3] = np.where(mask, piece[..., 3], 0)
    ys, xs = np.where(piece[..., 3] > 8)
    crop = Image.fromarray(piece[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')
    pad = 0.04
    k = min(size * (1 - pad * 2) / crop.width, size * (1 - pad * 2) / crop.height)
    crop = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
    c = Image.new('RGBA', (size, size))
    # 足元は絵の下の端（前の箱庭の絵と同じ決まり。ゲームは絵の下の真ん中を足元として置く）
    c.alpha_composite(crop, ((size - crop.width) // 2, size - max(1, round(size * 0.01)) - crop.height))
    c.save(os.path.join(OUT, f'{name}.webp'), quality=85, method=6)
    print(name, crop.size)
