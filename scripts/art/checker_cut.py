# 絵の中に描かれた市松模様（透明のふり）を、ふちからつながる明るい灰色・白だけ消す
import sys, numpy as np, cv2
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
a = np.array(Image.open(src).convert('RGB')).astype(int)
mn, mx = a.min(2), a.max(2)
bgish = ((mn > 196) & (mx - mn < 22)).astype(np.uint8)
n, lab = cv2.connectedComponents(bgish, connectivity=4)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge))
alpha = np.where(bg, 0, 255).astype(np.uint8)
alpha = cv2.erode(alpha, np.ones((3, 3), np.uint8))   # ふちの白いにじみを1画素削る
alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
im = Image.fromarray(a.astype(np.uint8)).convert('RGBA'); im.putalpha(Image.fromarray(alpha)); im.save(out)
print(out, 'bg', round(float(bg.mean()), 2))
