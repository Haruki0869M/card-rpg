# 立て札の試し: 今ある2方向の看板の絵（spawn-signpost）から、「柱」と「矢印の板1枚」を取り出し、8つの向きを組み立てる
import sys, math
import numpy as np
from PIL import Image, ImageDraw

S = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else None  # 素材の置き場（指定した時だけ webp を書く）
src = Image.open('src/assets/art/landscape/spawn-signpost.webp').convert('RGBA')
A = np.array(src)
H, W = A.shape[:2]

# --- 板（左上の矢印）---
poly = [(40, 132), (90, 70), (102, 86), (232, 44), (247, 58), (241, 78), (250, 98), (246, 113), (206, 123), (172, 137), (114, 154), (108, 167), (70, 152)]
m = Image.new('L', (W, H), 0)
ImageDraw.Draw(m).polygon(poly, fill=255)
board = A.copy()
board[..., 3] = np.minimum(board[..., 3], np.array(m))
board = Image.fromarray(board, 'RGBA')
# まっすぐ右向きに直す: 今は左向きで、先が少し下がっている（しっぽ (240,80) → 先 (42,132)）
ang = math.degrees(math.atan2(132 - 80, 42 - 240))  # 画面の角度（下が＋）
pivot = (150, 105)
board = board.rotate(ang - 180, center=pivot, resample=Image.BICUBIC, expand=False)  # 左向きの水平に
board = board.transpose(Image.FLIP_LEFT_RIGHT)  # 右向きに
bb = board.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
board = board.crop(bb)
print('board', board.size)

# --- 柱（板に隠れていた所は、下の柱の木目をずらして埋める）---
post = np.zeros_like(A)
slope = (216 - 182) / (330 - 45)  # 柱の傾き（下ほど右）
top_keep, fill_from, fill_to = 60, 60, 222
post[:top_keep] = A[:top_keep]
post[fill_to:] = A[fill_to:]
# 上の頭の部分で、柱でない所（板のはし）を消す
xs = np.arange(W)
for y in range(top_keep):
    cx = 182 + slope * (y - 45)
    post[y, np.abs(xs - cx) > 27, 3] = 0
for y in range(fill_from, fill_to):
    sy = 228 + ((y - fill_from) % 86)
    dx = int(round(slope * (y - sy)))
    row = np.roll(A[sy], dx, axis=0)
    cx = 182 + slope * (y - 45)
    row = row.copy()
    row[np.abs(xs - cx) > 26, 3] = 0
    post[y] = row
# 下: 柱と台だけ（板の残りが無いように）
for y in range(fill_to, 316):
    cx = 182 + slope * (y - 45)
    post[y, np.abs(xs - cx) > 27, 3] = 0
post = Image.fromarray(post, 'RGBA')
pb = post.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
post = post.crop(pb)
print('post', post.size, pb)
# 板を付ける場所（柱の絵の中の座標）: 柱の上から少し下
hang = (182 + slope * (100 - 45) - pb[0], 100 - pb[1])

def compose(dir8, size=384):
    """dir8: 東・北東・北・北西・西・南西・南・南東"""
    left = '西' in dir8
    tilt = {'東': 0, '西': 0, '北東': -32, '北西': -32, '南東': 32, '南西': 32, '北': -78, '南': 78}[dir8]
    b = board
    if left:
        b = b.transpose(Image.FLIP_LEFT_RIGHT)
        tilt = -tilt
    b = b.rotate(-tilt, resample=Image.BICUBIC, expand=True)
    c = Image.new('RGBA', (size, size))
    px, py = (size - post.width) // 2, size - post.height - 4
    c.alpha_composite(post, (px, py))
    c.alpha_composite(b, (int(px + hang[0] - b.width / 2), int(py + hang[1] - b.height / 2)))
    return c

DIRS = ['西', '北西', '北', '北東', '東', '南東', '南', '南西']
sheet = Image.new('RGB', (4 * 200, 2 * 230), (96, 134, 84))
d = ImageDraw.Draw(sheet)
from PIL import ImageFont
f = ImageFont.truetype('C:/Windows/Fonts/meiryob.ttc', 22)
for n, k in enumerate(DIRS):
    c = compose(k).resize((190, 190), Image.LANCZOS)
    x, y = (n % 4) * 200 + 5, (n // 4) * 230 + 34
    sheet.paste(c, (x, y), c)
    d.text((x + 6, y - 30), k, font=f, fill=(255, 245, 200))
sheet.save(S + '/sign-trial.png')
# 地図で見る大きさ（高さ約 46px）
small = Image.new('RGB', (8 * 60, 70), (96, 134, 84))
for n, k in enumerate(DIRS):
    c = compose(k).resize((52, 52), Image.LANCZOS)
    small.paste(c, (n * 60 + 4, 10), c)
small.save(S + '/sign-trial-small.png')
if OUT:
    post.save(OUT + '/sign-post.webp', quality=88, method=6)
    board.save(OUT + '/sign-board.webp', quality=88, method=6)
    print('hang', hang, 'post', post.size, 'board', board.size)
