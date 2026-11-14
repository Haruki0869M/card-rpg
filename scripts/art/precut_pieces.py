# 駒の元の絵の背景を消して、build_art.py の切り抜きの置き場（<SRC>/.cut/piece/<名前>.png）に置く。
# ChatGPT の駒の絵は、背景が3通りで届く: 透明・真っ黒・「市松模様の絵」（透明に見える模様を描きこんだ物）。
# どれでもない物（背景にもやが混じった物など）は、ここでは置かず、build_art.py の rembg に任せる。
# 使い方: py scripts/art/precut_pieces.py <SRC>   （<SRC>/piece/*.png を全部見る）
import sys, os, glob
import numpy as np
import cv2
from PIL import Image

SRC = sys.argv[1]
OUT = os.path.join(SRC, '.cut', 'piece')
os.makedirs(OUT, exist_ok=True)


def edge_mask(bg: np.ndarray) -> np.ndarray:
    """bg（背景らしい所の印）のうち、絵のふちにつながった所だけ"""
    n, lab, st, _ = cv2.connectedComponentsWithStats(bg.astype(np.uint8), connectivity=4)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(edge)), lab, st, edge


def soften(alpha: np.ndarray, k: int = 3) -> np.ndarray:
    alpha = cv2.erode(alpha, np.ones((k, k), np.uint8))
    return cv2.GaussianBlur(alpha, (3, 3), 0)


for f in sorted(glob.glob(os.path.join(SRC, 'piece', '*.png'))):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f)
    rgba = np.array(im.convert('RGBA'))
    rgb = rgba[..., :3].astype(int)
    a = rgba[..., 3]
    mn, mx = rgb.min(2), rgb.max(2)
    kind = None
    if im.mode == 'RGBA' and (a == 0).mean() > 0.3:
        # 透明の背景: 透明をそのまま使う（ふちのにじみを少し削る）
        kind = 'transparent'
        alpha = soften(np.where(a > 200, 255, 0).astype(np.uint8), 5)
    elif im.mode == 'RGB' and (mx[:8, :8] < 12).all():
        # 真っ黒の背景: ふちにつながった真っ黒だけ
        kind = 'black'
        out, *_ = edge_mask(mx < 28)
        alpha = soften(np.where(out, 0, 255).astype(np.uint8))
    elif im.mode == 'RGB' and (mn[:8, :8] > 240).all():
        # 市松模様の絵: ふちにつながった白と薄い灰色。囲まれた所でも、白と灰色が混じる所は背景
        kind = 'checker'
        bg = (mx - mn < 10) & (mn > 190)
        out, lab, st, edge = edge_mask(bg)
        gray = bg & (mx < 225)
        for i in range(1, st.shape[0]):
            if i in edge or st[i, 4] < 150:
                continue
            m = lab == i
            if gray[m].mean() > 0.15:
                out |= m
        alpha = soften(np.where(out, 0, 255).astype(np.uint8))
    if kind is None:
        print(f'{name:18s} 背景が分からない → rembg に任せる')
        p = os.path.join(OUT, f'{name}.png')
        if os.path.exists(p):
            os.remove(p)
        continue
    Image.fromarray(np.dstack([rgba[..., :3], alpha]), 'RGBA').save(os.path.join(OUT, f'{name}.png'))
    print(f'{name:18s} {kind:12s} 残した割合 {(alpha > 128).mean():.3f}')
