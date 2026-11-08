# 2〜7本目（K4）の絵を、ゲームで使う形に加工して src/assets/art/ に書き出す。
#   SRC=元画像のフォルダ  python3 scripts/art/build_k4_art.py [名前の一部…]
# build_art.py（敵・立ち絵・お供などの加工）とぶつからないよう、別のファイルにしてある。
# 加工の部品（seamless・colorize・vignette・save）は build_art.py のものをそのまま使う。
#
# 元画像（SRC の下。切り抜きは不要）:
#   terrain/<snow|ice|desert|cloud|metal|steam|sea>.webp   地形の模様（正方形・つなぎ目なし）→ 256×256
#   bg/<snow|desert|cloud|machine|sea>.webp                戦闘の背景（縦長。上下に黒い帯が入っていたら切り取る）→ 600×1071
#   bg/card-<シナリオID>.webp                              シナリオ選択のカード（横長。下に黒い帯が入っていたら切り取る）→ 幅600
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import build_art as B

SRC = B.SRC

# 地形: 寄せる色（地形のデータの color）, 寄せる強さ, 明るさ。元の絵の模様を残すので、寄せる強さは弱め
TERRAINS = {
    'snow': ('#c9d8e6', 0.18, 1.0), 'ice': ('#8fc4de', 0.18, 1.0), 'desert': ('#d8b46a', 0.18, 1.0),
    'cloud': ('#d9e4f4', 0.15, 1.0), 'metal': ('#7c8794', 0.18, 1.0), 'steam': ('#b7c2cc', 0.18, 1.0),
    'sea': ('#245f8f', 0.2, 0.95),
}
# 戦闘の背景: 暗さ・ぼかし・ふちの暗さ（今の屋外の背景 plains と同じ決まり。上に文字やカードが乗るため）
BGS = {
    'snow': (0.66, 1.2, 0.5), 'desert': (0.7, 1.2, 0.5), 'cloud': (0.66, 1.2, 0.5),
    'machine': (0.68, 1.2, 0.55), 'sea': (0.64, 1.2, 0.55),
}
CARDS = ['frozenKingdom', 'cursedArchipelago', 'sandDynasty', 'starCastle', 'clockworkEmpire', 'dreamLabyrinth']


def find(rel):
    for ext in ('webp', 'png', 'jpg'):
        p = os.path.join(SRC, f'{rel}.{ext}')
        if os.path.exists(p):
            return p
    return None


def cut_black_bands(im, th=6):
    """絵のまわり（上下・左右）の黒い帯を切り取る。行・列の平均の明るさが th 以下の所を帯とみなす"""
    g = np.array(im.convert('L')).astype(float)
    rows = np.where(g.mean(axis=1) > th)[0]
    cols = np.where(g.mean(axis=0) > th)[0]
    if not len(rows) or not len(cols):
        return im
    return im.crop((int(cols.min()), int(rows.min()), int(cols.max()) + 1, int(rows.max()) + 1))


def build_terrains():
    for key, (color, amount, bright) in TERRAINS.items():
        name = f'terrain/{key}'
        p = find(f'terrain/{key}')
        if not p or not B.want(name):
            continue
        im = Image.open(p).convert('RGB').resize((256, 256), Image.LANCZOS)
        im = B.seamless(B.colorize(im, color, amount, bright))
        B.save(im, f'{name}.webp', 72)


def build_bgs():
    for key, (dark, blur, vig) in BGS.items():
        name = f'bg/{key}'
        p = find(f'bg/{key}')
        if not p or not B.want(name):
            continue
        im = cut_black_bands(Image.open(p).convert('RGB'))
        im = ImageOps.fit(im, (600, 1071), Image.LANCZOS, centering=(0.5, 0.5))
        if blur:
            im = im.filter(ImageFilter.GaussianBlur(blur))
        im = ImageEnhance.Brightness(im).enhance(dark)
        im = ImageEnhance.Color(im).enhance(0.85)
        im = B.vignette(im, vig)
        B.save(im, f'{name}.webp', 74)


def build_cards():
    for sid in CARDS:
        name = f'bg/card-{sid}'
        p = find(f'bg/card-{sid}')
        if not p or not B.want(name):
            continue
        im = cut_black_bands(Image.open(p).convert('RGB'))
        im = im.resize((600, round(600 * im.height / im.width)), Image.LANCZOS)
        im = B.vignette(im, 0.3)
        B.save(im, f'{name}.webp', 76)


# ---------------- ダンジョンの部屋・戦闘の背景（bg/<ダンジョンID>.webp） ----------------
# 元画像は SRC/bg/<ダンジョンID>.webp（縦長 9:16）。今の屋内の背景（temple・catacomb・castle）と同じ決まりで、
# 暗く・少しぼかし・ふちを暗くして 600×1071 にする（上に文字やカードが乗るため）。
DUNGEON_BG = (0.64, 1.2, 0.55)
# 元画像の上に余計な帯がある背景は、上を切り落とす割合（_notes.txt: sandPalace は上の暗い帯の下に横一直線の境目がある）
BG_CUT_TOP = {'sandPalace': 0.14}
DUNGEON_IDS = ['clockTower', 'crystalCave', 'dreamEaterLair', 'echoGhostShip', 'echoIceVault', 'echoSandTomb', 'gearFactory',
               'ghostFlagship', 'giantMine', 'iceCastle', 'machineHeart', 'moonlitGarden', 'observatory', 'pirateIsland',
               'sandPalace', 'scorpionTomb', 'shadowLibrary', 'skyCastle', 'statueTemple', 'steamPlant', 'sunkenCathedral',
               'sunkenTemple', 'windmillTower', 'wreckCave']


def build_dungeon_bgs():
    dark, blur, vig = DUNGEON_BG
    for key in DUNGEON_IDS:
        name = f'bg/{key}'
        p = find(f'bg/{key}')
        if not p or not B.want(name):
            continue
        im = cut_black_bands(Image.open(p).convert('RGB'))
        cut = BG_CUT_TOP.get(key, 0)
        if cut:
            im = im.crop((0, round(im.height * cut), im.width, im.height))
        im = ImageOps.fit(im, (600, 1071), Image.LANCZOS, centering=(0.5, 0.5))
        im = im.filter(ImageFilter.GaussianBlur(blur))
        im = ImageEnhance.Brightness(im).enhance(dark)
        im = ImageEnhance.Color(im).enhance(0.85)
        im = B.vignette(im, vig)
        B.save(im, f'{name}.webp', 74)


# ---------------- ダンジョンの通路（壁・床・天井・扉・ボスの門） ----------------
# 元画像は SRC/dungeon/<背景ID>-<wall|floor|ceiling|door|bossdoor>.webp。加工は build_art.py の build_dungeon と同じ
# （面は 512×512、扉・ボスの門は 384×512）。すでに src/assets/art/dungeon にある物は触らない（上書きしない）。
# 元画像のまわりに余計な縁が入っている扉は、割合で外側を切り落としてから 3:4 に合わせる
# （_notes.txt: statueTemple-door は外側に細い黒い縁、skyCastle-door は外側にベージュの壁が少し見える）。
DOOR_CROP = {'statueTemple-door': 0.032, 'skyCastle-door': 0.032}
# ボスの門: 元画像（928×1232）のまわりに枠や壁が見える物は、扉の部分だけ切り抜く（_notes.txt の位置。左・上・右・下）
BOSSDOOR_BOX = {
    'crystalCave-bossdoor': (110, 125, 830, 1140), 'statueTemple-bossdoor': (95, 95, 835, 1195),
    'windmillTower-bossdoor': (145, 140, 775, 1205), 'observatory-bossdoor': (65, 60, 865, 1180),
    'scorpionTomb-bossdoor': (80, 95, 845, 1175), 'clockTower-bossdoor': (80, 90, 850, 1175),
    'machineHeart-bossdoor': (50, 50, 880, 1185), 'echoSandTomb-bossdoor': (130, 20, 800, 1200),
}


def build_dungeon():
    import glob, re
    for f in sorted(glob.glob(os.path.join(SRC, 'dungeon', '*'))):
        m = re.match(r'(.+)-(wall|floor|ceiling|door|bossdoor)\.(webp|png|jpg)$', os.path.basename(f))
        if not m:
            continue
        key = f'{m.group(1)}-{m.group(2)}'
        name = f'dungeon/{key}'
        out = os.path.join(B.OUT, f'{name}.webp')
        if not B.want(name) or os.path.exists(out):
            continue
        im = Image.open(f).convert('RGB')
        if m.group(2) in ('door', 'bossdoor'):
            box = BOSSDOOR_BOX.get(key)
            if box:
                im = im.crop(box)
            c = DOOR_CROP.get(key, 0)
            if c:
                dx, dy = round(im.width * c), round(im.height * c)
                im = im.crop((dx, dy, im.width - dx, im.height - dy))
            im = ImageOps.fit(im, B.DUNGEON_DOOR, Image.LANCZOS)
        else:
            im = im.resize((B.DUNGEON_FACE, B.DUNGEON_FACE), Image.LANCZOS)
        B.save(im, f'{name}.webp', 78)
    B.write_dungeon_tone()


if __name__ == '__main__':
    build_terrains()
    build_bgs()
    build_cards()
    build_dungeon_bgs()
    build_dungeon()
