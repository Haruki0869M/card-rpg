# 生成した絵（Midjourney の元画像）を、ゲームで使う形に加工して src/assets/art/ に書き出す。
#   SRC=元画像のフォルダ  python3 scripts/art/build_art.py [名前の一部…]
# 必要なもの: pip install "rembg[cpu]" opencv-python-headless pillow numpy
# 元画像は番号のファイル名（1.webp〜77.webp）。どの番号を何に使うかは下の表に書く。
# 背景の切り抜き結果は CACHE に保存して使い回す（2回目からは速い）。
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageEnhance

SRC = os.environ.get('SRC', '/home/user/card-rpg-assets')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'assets', 'art')
CACHE = os.environ.get('CACHE', os.path.join(SRC, '.cut'))
ONLY = sys.argv[1:]

def src(n):
    for ext in ('webp', 'png', 'jpg'):
        p = os.path.join(SRC, f'{n}.{ext}')
        if os.path.exists(p):
            return p
    raise FileNotFoundError(n)

def want(name):
    return not ONLY or any(o in name for o in ONLY)

_session = None
def cutout(n):
    """背景を切り抜いた RGBA（結果は保存して使い回す）"""
    global _session
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, f'{n}.png')
    if os.path.exists(p):
        return Image.open(p).convert('RGBA')
    from rembg import remove, new_session
    if _session is None:
        _session = new_session('isnet-general-use')
    im = remove(Image.open(src(n)).convert('RGB'), session=_session)
    im.save(p)
    return im

def trim(im, th=10):
    a = np.array(im.getchannel('A'))
    ys, xs = np.where(a > th)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def save(im, rel, q=80):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p, 'WEBP', quality=q, method=6)
    print(f'{rel:32s} {im.size[0]}x{im.size[1]} {os.path.getsize(p)//1024}KB')

def place(fig, W, H, fill=0.96, bottom=0.985, cx=None, scale=1.0):
    """切り抜いた絵を W×H のキャンバスに、下をそろえて置く"""
    k = min(W * 0.98 / fig.width, H * fill / fig.height) * scale
    f = fig.resize((max(1, round(fig.width * k)), max(1, round(fig.height * k))), Image.LANCZOS)
    c = Image.new('RGBA', (W, H))
    x = round((cx if cx is not None else W / 2) - f.width / 2)
    c.paste(f, (x, round(H * bottom - f.height)), f)
    return c

def body_center(fig):
    """武器を除いた体の中心（下半分の不透明な部分の重心）"""
    a = np.array(fig.getchannel('A')).astype(float)
    h = a.shape[0]
    part = a[int(h * 0.35):, :]
    xs = np.arange(a.shape[1])
    return float((part.sum(0) * xs).sum() / max(1, part.sum()))

def rim(im, color=(255, 240, 210), strength=0.55, r=3):
    """暗い画面でも形が分かるように、ふちを薄く光らせる"""
    a = im.getchannel('A')
    halo = a.filter(ImageFilter.MaxFilter(2 * r + 1)).filter(ImageFilter.GaussianBlur(r))
    g = Image.new('RGBA', im.size, color + (0,))
    g.putalpha(halo.point(lambda v: int(v * strength)))
    g.alpha_composite(im)
    return g

# ---------------- 主人公（職業×性別） ----------------
HEROES = {
    ('hunter', 'female'): 37, ('hunter', 'male'): 38,
    ('guardian', 'female'): 39, ('guardian', 'male'): 40,
    ('mage', 'female'): 41, ('mage', 'male'): 42,
    ('warrior', 'female'): 43, ('warrior', 'male'): 45,
}
# 顔の位置（切り抜いて余白を除いた絵の中の割合: 中心x, 中心y, 大きさ）。目で確認して決めた値
FACES = {
    ('hunter', 'female'): (0.5, 0.085, 0.17), ('hunter', 'male'): (0.5, 0.085, 0.17),
    ('guardian', 'female'): (0.5, 0.085, 0.17), ('guardian', 'male'): (0.5, 0.085, 0.17),
    ('mage', 'female'): (0.5, 0.13, 0.17), ('mage', 'male'): (0.5, 0.135, 0.17),
    ('warrior', 'female'): (0.5, 0.085, 0.17), ('warrior', 'male'): (0.5, 0.085, 0.17),
}

def head_center(fig, top=0.03, bot=0.12):
    """頭のあたり（上から3〜12%の高さ）で、体の中心に近い不透明な部分の中心"""
    a = np.array(fig.getchannel('A')) > 40
    h, w = a.shape
    bc = body_center(fig)
    rows = a[int(h * top):int(h * bot), :]
    col = rows.sum(0)
    # 体の中心からつながった範囲
    x0 = x1 = int(bc)
    lim = max(1, col.max() * 0.15)
    while x0 > 0 and col[x0 - 1] > lim: x0 -= 1
    while x1 < w - 1 and col[x1 + 1] > lim: x1 += 1
    return (x0 + x1) / 2 / w

def build_heroes():
    for (cls, g), n in HEROES.items():
        name = f'hero/{cls}-{g}'
        if not want(name): continue
        fig = trim(cutout(n))
        save(rim(place(fig, 480, 660), (8, 6, 12), 0.75, 2), f'{name}.webp')
        fx, fy, fs = FACES[(cls, g)]
        if fx == 0.5: fx = head_center(fig)
        s = fs * fig.height
        cx, cy = fx * fig.width, fy * fig.height
        face = fig.crop((round(cx - s / 2), round(cy - s / 2), round(cx + s / 2), round(cy + s / 2))).resize((192, 192), Image.LANCZOS)
        save(face, f'{name}-face.webp', 82)

# ---------------- 敵 ----------------
# 番号, 大きさ（1 = 枠いっぱい。敵どうしの大きさの差は敵のデータの size で決まる）
ENEMIES = {
    'goblinScout': (36, 1.0), 'goblinBrute': (35, 1.0), 'chaosShaman': (34, 1.0),
    'forestWolf': (33, 1.0), 'toxicShroom': (32, 1.0), 'treeWarden': (31, 1.0),
    'treantKing': (30, 1.0), 'treantKing-1': (29, 1.0),
    'bogGhoul': (28, 1.0), 'mireSlime': (27, 1.0), 'bogWraith': (26, 1.0),
    'mordea': (25, 1.0), 'mordea-1': (24, 1.0),
    'fireSalamander': (23, 1.0), 'ashBat': (22, 1.0), 'magmaGolem': (21, 1.0),
    'ignavarl': (19, 1.0), 'ignavarl-1': (19, 1.0),
    'darkKnight': (18, 1.0), 'gatekeeper': (17, 1.0),
    'valgrim': (16, 1.0), 'valgrim-1': (15, 1.0),
}

def flame_tint(im):
    """炎をまとった姿（第2形態）: 赤橙に染めて、ふちを光らせる"""
    a = im.getchannel('A')
    rgb = np.array(im.convert('RGB')).astype(float)
    lum = rgb.mean(2, keepdims=True) / 255
    fire = np.concatenate([np.clip(lum * 1.6 + 0.25, 0, 1) * 255, np.clip(lum * 1.1, 0, 1) * 150, np.clip(lum * 0.6, 0, 1) * 60], 2)
    out = rgb * 0.62 + fire * 0.38
    res = Image.fromarray(out.clip(0, 255).astype(np.uint8)).convert('RGBA')
    res.putalpha(a)
    glow = Image.new('RGBA', im.size, (255, 120, 30, 0))
    glow.putalpha(a.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.8)))
    base = Image.new('RGBA', im.size)
    base.alpha_composite(glow)
    base.alpha_composite(res)
    return base

def build_enemies():
    for key, (n, size) in ENEMIES.items():
        name = f'enemy/{key}'
        if not want(name): continue
        fig = trim(cutout(n))
        if key == 'ignavarl-1':
            fig = flame_tint(fig)
        save(rim(place(fig, 520, 620, fill=0.97 * size, bottom=0.98), (8, 6, 12), 0.8, 3), f'{name}.webp')

# ---------------- 背景 ----------------
# 番号, 暗さ（1 = そのまま）, ぼかし, 周りを暗く
BGS = {
    'castle': (10, 0.62, 1.2, 0.55), 'volcano': (11, 0.62, 1.2, 0.55), 'swamp': (12, 0.66, 1.2, 0.55),
    'forest': ('forest', 0.62, 1.2, 0.55), 'plains': (14, 0.66, 1.2, 0.5), 'temple': (47, 0.62, 1.2, 0.55),
    'forestCave': (49, 0.64, 1.2, 0.55), 'catacomb': (77, 0.7, 1.2, 0.55),
    'catacombMap': (48, 0.85, 0, 0.35), 'town': (50, 0.8, 0.6, 0.45), 'shrine': (51, 0.8, 0.6, 0.45),
    'title': (44, 1.0, 0, 0.3),
}

def forest_without_people():
    """森の背景（13）: 道にいる小さな2人を、左右の茂みで上書きして消す"""
    orig = Image.open(src(13)).convert('RGB')
    im = orig.copy()
    def patch(box, dx):
        x0, y0, x1, y1 = box
        piece = orig.crop((x0 + dx, y0, x1 + dx, y1))
        m = Image.new('L', piece.size, 0)
        ImageDraw.Draw(m).rectangle((6, 6, piece.width - 7, piece.height - 7), fill=255)
        im.paste(piece, (x0, y0), m.filter(ImageFilter.GaussianBlur(6)))
    patch((160, 1160, 245, 1300), -80)
    patch((245, 1160, 318, 1300), 75)
    return im

def vignette(im, strength):
    w, h = im.size
    y, x = np.ogrid[:h, :w]
    d = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2) / np.sqrt(2)
    k = 1 - strength * np.clip((d - 0.35) / 0.65, 0, 1) ** 1.5
    a = np.array(im).astype(float) * k[..., None]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

def build_bgs():
    for key, (n, dark, blur, vig) in BGS.items():
        name = f'bg/{key}'
        if not want(name): continue
        im = forest_without_people() if n == 'forest' else Image.open(src(n)).convert('RGB')
        im = im.resize((600, round(600 * im.height / im.width)), Image.LANCZOS)
        if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
        if dark != 1: im = ImageEnhance.Brightness(im).enhance(dark)
        if dark != 1: im = ImageEnhance.Color(im).enhance(0.85)
        im = vignette(im, vig)
        save(im, f'{name}.webp', 74)

# ---------------- 地形（つなぎ目の無い模様にして、地形の色に寄せる） ----------------
# 番号, 寄せる色, 寄せる強さ, 明るさ
TERRAINS = {
    'plains': (8, '#6f9a4a', 0.5, 1.0), 'forest': (9, '#2f6a3a', 0.2, 1.05), 'swamp': (5, '#4a5a3e', 0.45, 0.8),
    'hills': (4, '#8a7a52', 0.45, 0.95), 'mountain': (7, '#6a6066', 0.45, 0.85), 'ash': (3, '#5a4a46', 0.3, 0.85),
    'lava': (2, '#c24a1a', 0.2, 1.0), 'water': (52, '#2a5a8a', 0.3, 0.9),
    'road': (8, '#c8ae78', 0.92, 1.18), 'blight': (3, '#5a2a78', 0.8, 0.85),
}

def seamless(im):
    """半分ずらした絵と、ふちに向かって混ぜ合わせる（並べてもつなぎ目が出ない）"""
    a = np.array(im).astype(float)
    h, w = a.shape[:2]
    s = np.roll(np.roll(a, h // 2, 0), w // 2, 1)
    y = np.abs(np.linspace(-1, 1, h))[:, None]
    x = np.abs(np.linspace(-1, 1, w))[None, :]
    m = np.clip(1 - np.maximum(x, y), 0, 1) ** 0.6
    m = np.clip(m * 2.2, 0, 1)[..., None]
    return Image.fromarray((a * m + s * (1 - m)).clip(0, 255).astype(np.uint8))

def colorize(im, color, amount, bright):
    rgb = np.array(im).astype(float)
    c = np.array([int(color[i:i + 2], 16) for i in (1, 3, 5)], float)
    lum = (rgb @ [0.3, 0.59, 0.11])[..., None] / 255
    tinted = lum * c * 1.7
    out = (rgb * (1 - amount) + tinted * amount) * bright
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))

def build_terrains():
    for key, (n, color, amount, bright) in TERRAINS.items():
        name = f'terrain/{key}'
        if not want(name): continue
        im = Image.open(src(n)).convert('RGB').resize((256, 256), Image.LANCZOS)
        im = seamless(colorize(im, color, amount, bright))
        save(im, f'{name}.webp', 72)

# ---------------- 道具・宝箱・地図の場所 ----------------
ITEMS = {'hammer': 53, 'bow': 54, 'staff': 55, 'sword': 56, 'armor': 57, 'robe': 58, 'boots': 59, 'ring': 60,
         'amulet': 61, 'charm': 62, 'crest': 63, 'potion': 64, 'ether': 65, 'antidote': 66, 'smoke': 67}
# 細長い物は斜めにして、枠いっぱいに見せる（角度は反時計回り）
TILT = {'hammer': -40, 'bow': -45, 'staff': -45, 'sword': -45, 'charm': -40}
CHESTS = {'common': (68, False), 'rare': (69, False), 'epic': (70, True), 'legend': (71, True)}
PLACES = {'shrine': 72, 'dungeon': 73, 'landmark': 74, 'capital': 75, 'town': 76}

def square(fig, size, pad=0.04):
    k = size * (1 - 2 * pad) / max(fig.width, fig.height)
    f = fig.resize((max(1, round(fig.width * k)), max(1, round(fig.height * k))), Image.LANCZOS)
    c = Image.new('RGBA', (size, size))
    c.alpha_composite(f, ((size - f.width) // 2, (size - f.height) // 2))
    return c

def soft_key(n, tol=48, soft=50):
    """明るい無地の背景を、色の差で透明にする（水彩のにじみを残したい絵用）"""
    im = Image.open(src(n)).convert('RGB')
    a = np.array(im).astype(float)
    h, w = a.shape[:2]
    corners = np.array([a[4, 4], a[4, w - 5], a[h - 5, 4], a[h - 5, w - 5]]).mean(0)
    d = np.abs(a - corners).sum(2)
    yy, xx = np.ogrid[:h, :w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    alpha = np.clip((d - tol) / soft, 0, 1) * np.clip((0.92 - r) / 0.2, 0, 1) * 255
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)))
    return out

def build_items():
    for key, n in ITEMS.items():
        name = f'item/{key}'
        if not want(name): continue
        fig = trim(cutout(n), 24)
        if key in TILT:
            fig = trim(fig.rotate(TILT[key], resample=Image.BICUBIC, expand=True), 24)
        save(rim(square(fig, 192, 0.06)), f'{name}.webp', 82)
    for key, (n, flip) in CHESTS.items():
        name = f'chest/{key}'
        if not want(name): continue
        fig = trim(cutout(n), 24)
        if flip: fig = ImageOps.mirror(fig)
        save(square(fig, 320, 0.03), f'{name}.webp', 82)
    for key, n in PLACES.items():
        name = f'place/{key}'
        if not want(name): continue
        fig = trim(soft_key(n) if key == 'town' else cutout(n), 24)
        save(rim(square(fig, 224, 0.04), strength=0.4), f'{name}.webp', 82)

# ---------------- 画面の枠（UIの部品集 6 から切り出す） ----------------
def key_out(im, bg=(60, 52, 55), tol=26):
    """部品集の無地の背景色を透明にする"""
    a = np.array(im.convert('RGB')).astype(int)
    d = np.abs(a - np.array(bg)).sum(2)
    alpha = np.clip((d - tol) * 6, 0, 255).astype(np.uint8)
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray(alpha))
    return out

def gold_only(im):
    """金色の飾りだけを残す（紺色の地は透明に。中身の文字を隠さないように）"""
    a = np.array(im.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gold = np.clip((r - b - 25) * 6, 0, 255) * np.clip((r + g - 150) * 3, 0, 255) / 255
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray(gold.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)))
    return out

def build_ui():
    kit = Image.open(src(6)).convert('RGB')
    parts = {
        # 大きな枠の上の飾り（宝石つき）
        'ornament-top': (150, 36, 360, 270),
        # 大きな枠の左上の角
        'corner': (62, 96, 160, 200),
    }
    for key, box in parts.items():
        name = f'ui/{key}'
        if not want(name): continue
        im = trim(gold_only(kit.crop(box)) if key == 'corner' else key_out(kit.crop(box)), 30)
        if key == 'corner':
            # 4つの角（左上を反転して作る）。画面では 28px 前後で使うので、2倍の大きさで保存
            im = im.resize((64, round(64 * im.height / im.width)), Image.LANCZOS)
            save(im, 'ui/corner-tl.webp', 88)
            save(ImageOps.mirror(im), 'ui/corner-tr.webp', 88)
            save(ImageOps.flip(im), 'ui/corner-bl.webp', 88)
            save(ImageOps.flip(ImageOps.mirror(im)), 'ui/corner-br.webp', 88)
        else:
            im = im.resize((128, round(128 * im.height / im.width)), Image.LANCZOS)
            save(im, f'{name}.webp', 88)
    if want('ui/panel'):
        # 大きな枠の内側の、模様のある紺色（つなぎ目無しにして、パネルの地に使う）
        im = kit.crop((150, 300, 350, 560)).resize((256, 256), Image.LANCZOS)
        save(seamless(im), 'ui/panel.webp', 70)

if __name__ == '__main__':
    build_heroes(); build_enemies(); build_bgs(); build_terrains(); build_items(); build_ui()
