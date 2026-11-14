# 駒の台座と銘板の絵（ChatGPT）を、ゲームの素材にする。docs/art/prompts-chatgpt-pedestal.md
# 使い方: py scripts/art/build_pedestal.py C:/dev/card-rpg-assets/chatgpt-pedestal
#   <SRC>/piece-base.png   台座（まわりに光のもやが描きこまれていても、rembg で台座だけにする）
#   <SRC>/piece-plates.png 銘板の枠4つ（横2×縦2。左上から 銅・銀・金・紫）
# 出力: src/assets/art/ui/piece-base.webp・piece-base-band.webp（側面の灰色の帯の形。白 = 帯）・piece-base-rim.webp（金のふちの形）・piece-plate-<段>.webp
# 台座の上面のだ円の寸法（絵の大きさに対する割合）を表示する。HeroPiece.tsx の BASE_ART に写す
import sys, os
import numpy as np
import cv2
from PIL import Image

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'assets', 'art', 'ui')
CACHE = os.path.join(SRC, '.cut')
os.makedirs(CACHE, exist_ok=True)


def largest(mask: np.ndarray) -> np.ndarray:
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n <= 1:
        return mask
    i = 1 + int(np.argmax(st[1:, 4]))
    m = lab == i
    # 中の穴は埋める
    inv = (~m).astype(np.uint8)
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    edge = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]])))
    for j in range(1, n2):
        if j not in edge:
            m |= lab2 == j
    return m


# ---------- 台座 ----------
cut = os.path.join(CACHE, 'piece-base.png')
if not os.path.exists(cut):
    from rembg import remove, new_session
    im = Image.open(os.path.join(SRC, 'piece-base.png')).convert('RGB')
    remove(im, session=new_session('isnet-general-use')).save(cut)
base = np.array(Image.open(cut).convert('RGBA'))
src = np.array(Image.open(os.path.join(SRC, 'piece-base.png')).convert('RGB'))
m = largest(base[..., 3] > 128)
alpha = cv2.GaussianBlur(cv2.erode(m.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)), (3, 3), 0)
ys, xs = np.where(alpha > 16)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
rgba = np.dstack([src, alpha])[y0:y1, x0:x1]
H, W = rgba.shape[:2]
# 側面の帯: 明るい灰色（色みが少なく明るい）で、台座の中の所。上面の木は赤茶なので入らない
rgb = rgba[..., :3].astype(int)
mn, mx = rgb.min(2), rgb.max(2)
# 左右の端は陰で暗いので、明るさの下限は低め。金のふち（赤と青の差が大きい）は入らない
band = (mx - mn < 40) & (mn > 60) & (rgb[..., 0] - rgb[..., 2] < 34) & (rgba[..., 3] > 128)
band = cv2.morphologyEx(band.astype(np.uint8) * 255, cv2.MORPH_CLOSE, np.ones((7, 21), np.uint8))
band = cv2.morphologyEx(band, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
band = largest(band > 128)
# 広げた分を、台座の中・金のふちの外に戻す
gold = (rgb[..., 0] - rgb[..., 2] > 50) & (mx > 110) & (rgb[..., 1] > rgb[..., 0] * 0.66)  # 木（緑が少ない赤茶）は入れない
band = band & (rgba[..., 3] > 200) & ~gold
band = np.where(band, 255, 0).astype(np.uint8)
band = cv2.GaussianBlur(band, (3, 3), 0)
# 金のふちの形（段の金属の色に染めるため）
rim = cv2.dilate(np.where(gold & (rgba[..., 3] > 128), 255, 0).astype(np.uint8), np.ones((3, 3), np.uint8))
rim = cv2.GaussianBlur(rim, (3, 3), 0)

# 台座を高くする（2026-11-15 オーナーの依頼）: 側面の帯だけを、列ごとに縦に引きのばす（上面のだ円の形は変えない）
TALL = float(os.environ.get('TALL', '1.7'))
cols = np.arange(W)
has = band.max(0) > 128
tt = np.array([np.argmax(band[:, x] > 128) if has[x] else -1 for x in cols], float)
bb = np.array([H - 1 - np.argmax(band[::-1, x] > 128) if has[x] else -1 for x in cols], float)
xs_ok = cols[has]
tt = np.interp(cols, xs_ok, tt[has])
bb = np.interp(cols, xs_ok, bb[has])
k5 = np.ones(15) / 15
tt = np.convolve(np.pad(tt, 7, mode='edge'), k5, 'valid')
bb = np.convolve(np.pad(bb, 7, mode='edge'), k5, 'valid')
L = bb - tt
dh = int(round(np.median(L[has]) * (TALL - 1)))
H2 = H + dh
yy = np.arange(H2)[:, None].astype(np.float32)
T, B = tt[None, :], bb[None, :]
sy = np.where(yy < T, yy, np.where(yy < B + dh, T + (yy - T) * (L[None, :] / (L[None, :] + dh)), yy - dh)).astype(np.float32)
sx = np.broadcast_to(cols[None, :].astype(np.float32), sy.shape).copy()
stretch = lambda a: cv2.remap(a, sx, sy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
rgba = stretch(rgba)
band = stretch(band)
rim = stretch(rim)
H = H2
rgb = rgba[..., :3].astype(int)
# 上面（木）: 赤みが強い所。だ円の寸法を測る
wood = (rgb[..., 0] - rgb[..., 2] > 40) & (rgb[..., 1] < rgb[..., 0] * 0.62) & (rgba[..., 3] > 128)
wood = largest(cv2.morphologyEx(wood.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0)
wy, wx = np.where(wood)
k = 512 / W
Image.fromarray(rgba).resize((512, round(H * k)), Image.LANCZOS).save(os.path.join(OUT, 'piece-base.webp'), quality=88, method=6)
bm = np.dstack([np.full_like(band, 255)] * 3 + [band])
Image.fromarray(bm).resize((512, round(H * k)), Image.LANCZOS).save(os.path.join(OUT, 'piece-base-band.webp'), quality=90, method=6)
rm = np.dstack([np.full_like(rim, 255)] * 3 + [rim])
Image.fromarray(rm).resize((512, round(H * k)), Image.LANCZOS).save(os.path.join(OUT, 'piece-base-rim.webp'), quality=90, method=6)
print('base', (512, round(H * k)), 'aspect', round(W / H, 3))
print('top face: cx %.3f cy %.3f rx %.3f ry %.3f (幅・高さに対する割合)' % (
    (wx.min() + wx.max()) / 2 / W, (wy.min() + wy.max()) / 2 / H, (wx.max() - wx.min()) / 2 / W, (wy.max() - wy.min()) / 2 / H))
print('band rows %.3f-%.3f' % (np.where(band.max(1) > 128)[0].min() / H, np.where(band.max(1) > 128)[0].max() / H))
cx = W // 2
cb = np.where(band[:, cx] > 128)[0]
print('band at center: %.3f-%.3f mid %.3f' % (cb.min() / H, cb.max() / H, (cb.min() + cb.max()) / 2 / H))

# ---------- 銘板 ----------
pl = np.array(Image.open(os.path.join(SRC, 'piece-plates.png')).convert('RGBA'))
solid = (pl[..., 3] > 200).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(solid, np.ones((9, 9), np.uint8)), connectivity=8)
blobs = sorted([i for i in range(1, n) if st[i, 4] > solid.size * 0.03], key=lambda i: (round(st[i, 1] / (pl.shape[0] / 2)), st[i, 0]))
assert len(blobs) == 4, len(blobs)
for i, tier in zip(blobs, ['base', 'mid', 'top', 'special']):
    m = (lab == i) & (pl[..., 3] > 200)
    a = cv2.GaussianBlur(cv2.erode(m.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)), (3, 3), 0)
    ys, xs = np.where(a > 16)
    crop = np.dstack([pl[..., :3], a])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    im = Image.fromarray(crop)
    im = im.resize((128, round(128 * im.height / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, f'piece-plate-{tier}.webp'), quality=90, method=6)
    print('plate', tier, im.size)
