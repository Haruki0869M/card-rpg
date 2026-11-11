# 生成した絵（Midjourney の元画像）を、ゲームで使う形に加工して src/assets/art/ に書き出す。
#   SRC=元画像のフォルダ  python3 scripts/art/build_art.py [名前の一部…]
# 必要なもの: pip install "rembg[cpu]" opencv-python-headless pillow numpy
# 元画像は番号のファイル名（1.webp〜77.webp）。どの番号を何に使うかは下の表に書く。
# J4 からは名前のファイル名（例 monk-male.webp）。立ち絵は <職ID>-<male|female> で置けば HEROES に自動で入る。
# 元画像が SRC に無い物は飛ばす（番号の古い絵と、名前の新しい絵を別のフォルダで加工できる）。
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
    p = os.path.join(CACHE, f'{n}.png')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    if os.path.exists(p):
        return Image.open(p).convert('RGBA')
    from rembg import remove, new_session
    if _session is None:
        _session = new_session('isnet-general-use')
    im = remove(Image.open(src(n)).convert('RGB'), session=_session)
    im.save(p)
    return im

def has_src(n):
    try:
        src(n)
        return True
    except FileNotFoundError:
        return False

def despeckle(im, keep=0.02, th=24, m=0.18):
    """本体から離れた小さなかたまり（隅のサイン・文字・ごみ）を消す。
    一番大きいかたまりの keep 倍より小さく、かつ絵の外側 18% の帯の中だけにある物を透明にする。
    杖の先の宝玉のような、体の近くに浮いた小物は残る"""
    import cv2
    a = np.array(im.getchannel('A'))
    n, lab, stats, _ = cv2.connectedComponentsWithStats((a > th).astype(np.uint8), 8)
    if n <= 2:
        return im
    h, w = a.shape
    big = stats[1:, cv2.CC_STAT_AREA].max()
    # m = 外側の帯の幅（0.5 にすると、場所に関係なく小さなかたまりを全部消す）
    out = a.copy()
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if area >= big * keep:
            continue
        inner = x + bw > w * m and x < w * (1 - m) and y + bh > h * m and y < h * (1 - m)
        if not inner:
            out[lab == i] = 0
    res = im.copy()
    res.putalpha(Image.fromarray(out))
    return res

def fill_holes(im, n, always=False, th=18, grow=2, edge=3, solid=8, light=0.75):
    """背景の切り抜き（rembg）で、体の中の白っぽい所まで透明になった「穴」を、元画像の色で戻す。
    （2026-11 に、お供・主人公の絵に穴があいていたのを直した手順。Node 版は scripts/art/fill-holes.mjs。
     PIL・opencv が無いパソコンでは、そちらで同じ結果を作れる）
    - 穴 = 不透明度 128 未満で、絵のふちとつながっていない所。
      always=True（お供）なら全部埋める。False（主人公）なら、元画像のその所の色が四隅の背景と
      平均で th より違う時だけ埋める（背景と同じ色なら、腕と体の間などの本当の隙間なので残す）。
    - 穴のまわり grow px も元画像の色で不透明にする（後で付けるふちの影が、穴のふちに出ないように）。
    - 体の内側で半分すけている所は、外側から edge〜solid px の間で少しずつ不透明に戻す。
      主人公は、元画像の色が背景の明るさの light 倍以上の所だけ（床の影まで濃くならないように）。
    ふちの影（rim）は、この後に付けるので外側の輪郭にだけ付く"""
    import cv2
    cut = np.array(im.convert('RGBA'))
    o = np.array(Image.open(src(n)).convert('RGB')).astype(np.int32)
    if o.shape[:2] != cut.shape[:2]:
        return im
    h, w = cut.shape[:2]
    bg = o[[4, 4, h - 5, h - 5], [4, w - 5, 4, w - 5]].mean(0)
    low = (cut[..., 3] < 128).astype(np.uint8)
    nl, lab = cv2.connectedComponents(low, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    dev = np.abs(o - bg).sum(2)
    mask = np.zeros((h, w), bool)
    for i in range(1, nl):
        if i in border:
            continue
        part = lab == i
        if always or dev[part].mean() > th:
            mask |= part
    outside = (low > 0) & ~mask
    if grow:
        mask = cv2.dilate(mask.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=grow) > 0
    dist = cv2.distanceTransform((~outside).astype(np.uint8), cv2.DIST_L2, 3)
    a = cut[..., 3].astype(np.float32)
    ramp = np.clip((dist - edge) / (solid - edge), 0, 1) * 255
    ok = ~outside
    if not always:
        lum = o @ np.array([0.299, 0.587, 0.114])
        ok &= lum >= light * (bg @ np.array([0.299, 0.587, 0.114]))
    na = np.where(ok, np.maximum(a, ramp), a)
    na[mask] = 255
    up = na > a
    out = cut.copy()
    out[up, :3] = o[up]
    out[..., 3] = np.round(na).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

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
# J4（2026-11）: 残り40職×男女。元画像は名前（例 monk-male.webp）。指示文は docs/art/prompts-jobs-pets.md
J4_JOBS = ['monk', 'thief', 'priest', 'summoner',
           'swordmaster', 'berserker', 'brawler', 'archmage', 'hexer', 'phantomTamer', 'paladin', 'lancer',
           'bishop', 'archer', 'tamer', 'shadow', 'phantomThief',
           'swordSaint', 'overlord', 'fistKing', 'greatSage', 'hadesLord', 'phantomKing', 'holyKing', 'dragoon',
           'pope', 'bowSaint', 'beastMaster', 'ninja', 'grandThief',
           'samurai', 'magicKnight', 'timeMage', 'necromancer', 'darkKnight', 'shrineMaiden', 'astrologer',
           'machinist', 'bard', 'gambler']
# 区切りF の新ジョブ4職（2026-11-12。jobId は仮）。元画像は C:/dev/card-rpg-assets/new-jobs/。指示文は docs/art/prompts-new-jobs-and-chatgpt-trial.md
NEW_JOBS_F = ['fistSaint', 'bulwark', 'dragonVein', 'petTrainer']
for _cls in J4_JOBS + NEW_JOBS_F:
    for _g in ('male', 'female'):
        HEROES[(_cls, _g)] = f'{_cls}-{_g}'
# 顔の位置（切り抜いて余白を除いた絵の中の割合: 中心x, 中心y, 大きさ）。目で確認して決めた値
FACES = {
    ('hunter', 'female'): (0.5, 0.085, 0.17), ('hunter', 'male'): (0.5, 0.085, 0.17),
    ('guardian', 'female'): (0.5, 0.085, 0.17), ('guardian', 'male'): (0.5, 0.085, 0.17),
    ('mage', 'female'): (0.5, 0.13, 0.17), ('mage', 'male'): (0.5, 0.135, 0.17),
    ('warrior', 'female'): (0.5, 0.085, 0.17), ('warrior', 'male'): (0.5, 0.085, 0.17),
}
# 帽子・冠・鎌などで自動の位置がずれる職は、目で確認して決めた値（J4）
FACES.update({
    ('hadesLord', 'female'): (0.543, 0.158, 0.157), ('hadesLord', 'male'): (0.443, 0.136, 0.156),
    ('necromancer', 'female'): (0.421, 0.153, 0.156), ('necromancer', 'male'): (0.571, 0.139, 0.155),
    ('overlord', 'female'): (0.598, 0.196, 0.156),
    ('pope', 'female'): (0.50, 0.172, 0.156), ('pope', 'male'): (0.553, 0.178, 0.156),
    ('lancer', 'female'): (0.559, 0.168, 0.156), ('hexer', 'female'): (0.535, 0.192, 0.156),
    # 区切りF（槍の先が頭より上にあるため）
    ('bulwark', 'male'): (0.466, 0.158, 0.156), ('bulwark', 'female'): (0.485, 0.118, 0.156),
})
# 穴埋め（fill_holes）をしない元画像。重装衛士は、細い槍を戻すため切り抜きを直している（.cut の絵を
# scripts/art/fix_thin_cut.py で作り直し済み）。槍と足の間の背景が穴として埋まるので、穴埋めをしない
NO_FILL_HOLES = {'bulwark-female', 'bulwark-male'}
# 表に無い職は、この値（x=0.5 は頭の位置を自動で探す）
FACE_DEFAULT = (0.5, 0.085, 0.17)

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
        if not has_src(n):
            print(f'{name:32s} (元画像 {n} が無いので飛ばす)')
            continue
        cut = cutout(n)
        # 槍と足の間の背景（明るい色むら）を「穴」と見て埋めてしまう絵は、穴埋めをしない
        fig = trim(despeckle(cut if n in NO_FILL_HOLES else fill_holes(cut, n)))
        save(rim(place(fig, 480, 660), (8, 6, 12), 0.75, 2), f'{name}.webp')
        fx, fy, fs = FACES.get((cls, g), FACE_DEFAULT)
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

# 名前のファイル名の敵（元画像は enemy/<敵ID>.webp。SRC=C:/dev/card-rpg-assets で動かす）。
# 凍てつく王国（docs/art/prompts-enemies-frozenKingdom.md）: 新規23体＋変身後5枚。亜種5体は元の絵を使い回す（art/index.tsx の artIdOf）。
# 変身後は <敵ID>-<段階>（1 = HP50%以下など。戦闘で enemy/<ID>-<段階> を探し、無ければ元の絵）
FROZEN_ENEMIES = ['snowHare', 'frostWolf', 'frostSprite', 'iceBat', 'frozenSoldier', 'snowOwl', 'icicleBug', 'snowWitch',
                  'crystalLord', 'crystalLord-1', 'iceSlime', 'frozenGhoul', 'iceArcher', 'frostMage', 'frozenBishop', 'frozenBishop-1',
                  'blizzardSnake', 'yeti', 'frostDrakeling', 'blizzardBeast', 'frostGiant', 'frostGiant-1',
                  'iceKnight', 'iceSwordsman', 'frostGuardian', 'whiteQueen', 'whiteQueen-1', 'whiteQueen-2']
# 共通の敵（docs/art/prompts-enemies-common.md）
COMMON_ENEMIES = ['goldenThief', 'guardDog', 'banditThug', 'banditArcher', 'banditChief', 'wildBoar', 'giantSpider', 'caveBat',
                  'stoneTortoise', 'greatBear', 'shambler', 'wanderingGhost', 'imp', 'hauntedKnight']
# 侵食の魔王の新しい敵（Codex の T7）
CORRUPTION_ENEMIES = ['thornBoar', 'mossCarapace', 'rootImp', 'reedStalker', 'fenGuardian', 'cinderHound', 'basaltCrawler',
                      'chainWraith', 'siegeImp', 'cursedHound']
# 機械仕掛けの帝国（docs/art/prompts-enemies-clockworkEmpire.md）: 新規23体＋変身後5枚
CLOCKWORK_ENEMIES = ['gearBug', 'steamRat', 'brokenAutomaton', 'conveyorBot', 'riveter', 'oilSlime', 'sparkTurret', 'foremanBot',
                     'foremanGolem', 'foremanGolem-1', 'steamSprite', 'boilerCrab', 'wrenchGolem', 'clockworkDog', 'steamTurretLord',
                     'runawayBoiler', 'runawayBoiler-1', 'pistonFist', 'furnaceImp', 'ironButler', 'chainSaw', 'clockworkSage',
                     'clockworkSage-1', 'copperKnight', 'furnaceGolem', 'greatMachine', 'greatMachine-1', 'greatMachine-2']
# 呪われた群島（docs/art/prompts-enemies-cursedArchipelago.md）
ARCHIPELAGO_ENEMIES = ['seaCrab', 'jellyfish', 'seaSerpentFry', 'merfolkSpearman', 'pirateGrunt', 'drownedSailor', 'ghostDeckhand',
                       'pirateGunner', 'siren', 'shark', 'conchKnight', 'stormPetrel', 'octopusLarva', 'barnacleBeast',
                       'pirateQuartermaster', 'coralGolem', 'drownedKnight', 'seaWitch', 'krakenTentacle', 'seaSerpentQueen',
                       'seaSerpentQueen-1', 'pirateCaptainGuld', 'pirateCaptainGuld-1', 'tideHighPriest', 'tideHighPriest-1',
                       'ghostAdmiral', 'ghostAdmiral-1', 'ghostAdmiral-2']
# 砂塵の王朝（docs/art/prompts-enemies-sandDynasty.md）
SAND_ENEMIES = ['sandScarab', 'desertViper', 'jackalWarrior', 'tombRobber', 'sandScorpion', 'vulture', 'mummy', 'sandSprite',
                'dustDevil', 'sandWorm', 'clayGolem', 'mummyArcher', 'cursedPriest', 'stoneCat', 'royalGuardMummy', 'scribeShade',
                'sphinxCub', 'sandSerpentLord', 'colossusStatue', 'sandScorpionKing', 'sandScorpionKing-1', 'shadowVizier',
                'shadowVizier-1', 'stoneGuardianBeast', 'stoneGuardianBeast-1', 'sandPharaoh', 'sandPharaoh-1', 'sandPharaoh-2']
# 星降る天空城（docs/art/prompts-enemies-starCastle.md）
STAR_ENEMIES = ['cloudSheep', 'skyGull', 'windSprite', 'clockworkSoldier', 'starJelly', 'gearBeetle', 'shootingStarBird', 'moonRabbit',
                'angelStatue', 'starFragment', 'windGuardianHawk', 'windKeeper', 'windKeeper-1', 'starDustScribe', 'starLibrarian',
                'starLibrarian-1', 'moonWolf', 'thornFairy', 'hourglassGolem', 'clockworkKnight', 'moonGardener', 'moonMaiden',
                'moonMaiden-1', 'skyKnight', 'skyPaladin', 'starSeerQueen', 'starSeerQueen-1', 'starSeerQueen-2']
# 各シナリオに足す敵（K3 D。docs/art/prompts-enemies-extra.md）。亜種は元の絵を使い回す
EXTRA_ENEMIES = ['iceFisher', 'frostMoth', 'driftwoodSpirit', 'lanternAngler', 'desertFennec', 'obeliskSentinel', 'cometFox',
                 'harpGuardian', 'smokeStackCrow', 'pressGolem']
# 夢幻の大迷宮の新しい敵（夢の再来は元の敵の絵を使い回す）
DREAM_ENEMIES = ['nightmareMote', 'sleepwalker', 'pillowGolem', 'lullabyBird', 'shadowChild', 'lostMemory', 'mirrorKnight', 'dreamWeaver',
                 'memoryEater', 'dreamEater', 'dreamEater-1', 'dreamEater-2']
# レアの敵（K3 C）と隠しボス（変身後は -1）
RARE_ENEMIES = ['goldenWolf', 'crystalGhoul', 'whiteStag', 'frostBellKnight', 'pearlCrab', 'lanternGhostCaptain', 'goldenScarab', 'starlitSwan',
                'brassClockCat', 'crimsonSteamHound', 'hollowDemonLord', 'hollowDemonLord-1', 'drownedBride', 'drownedBride-1',
                'fallenStarSerpent', 'fallenStarSerpent-1', 'ancientEngineHeart', 'ancientEngineHeart-1']
for _k in CORRUPTION_ENEMIES + CLOCKWORK_ENEMIES + ARCHIPELAGO_ENEMIES + SAND_ENEMIES + STAR_ENEMIES + EXTRA_ENEMIES + DREAM_ENEMIES + RARE_ENEMIES:
    ENEMIES[_k] = (f'enemy/{_k}', 1.0)
# 隅に文字・サインがある絵（元画像のフォルダの _corner-text.txt）。サインが内側寄りにもあるので、離れた小さなかたまりを場所に関係なく消す
CORNER_TEXT = {'iceBat', 'frozenSoldier', 'whiteQueen-2', 'foremanGolem-1', 'pirateGunner', 'coralGolem', 'sandScorpion',
               'starLibrarian', 'moonGardener', 'skyKnight', 'iceFisher'}
# 足元に地面（白っぽい灰色）が描かれている絵
GROUND = {'stoneTortoise', 'fenGuardian', 'riveter', 'pistonFist'}

# 足元に砂（体と同じ色）が広がっている絵。色では分けられないので、形で取る（desand）
SAND = {'sandScorpion', 'dustDevil', 'sandWorm', 'stoneCat', 'stoneGuardianBeast', 'stoneGuardianBeast-1'}

def desand(im, band=0.12, haze=0.4):
    """足元の砂・土ぼこりを消す。
    1) 下から haze の高さの中の半透明（もや・煙）を消す
    2) 一番下の band の帯では、その少し上の行の体の幅より外へ広がった所（砂の台）を消す"""
    a = np.array(im).astype(int)
    al = a[..., 3]
    ys = np.where(al.max(1) > 24)[0]
    top, bot = ys.min(), ys.max()
    hgt = bot - top
    y_haze = int(bot - hgt * haze)
    low = al[y_haze:] < 170
    al[y_haze:][low] = 0
    y_band = int(bot - hgt * band)
    ref = al[max(top, y_band - int(hgt * 0.12)):y_band] > 128
    cols = np.where(ref.any(0))[0]
    if len(cols):
        pad = int(im.width * 0.03)
        x0, x1 = max(0, cols.min() - pad), min(im.width, cols.max() + pad + 1)
        al[y_band:, :x0] = 0
        al[y_band:, x1:] = 0
    a[..., 3] = al
    return despeckle(Image.fromarray(a.astype(np.uint8)), m=0.5)

def deground(im, band=0.22):
    """足元の地面を消す: 体の下から band の高さの中で、白っぽく色の薄い所と、半透明の所を透明にする"""
    a = np.array(im).astype(int)
    ys = np.where(a[..., 3].max(1) > 24)[0]
    top, bot = ys.min(), ys.max()
    rgb = a[..., :3]
    mx, mn = rgb.max(2), rgb.min(2)
    g = ((mn > 150) & ((mx - mn) < 28)) | (a[..., 3] < 170)
    g[:int(bot - (bot - top) * band)] = False
    a[..., 3][g] = 0
    return despeckle(Image.fromarray(a.astype(np.uint8)), m=0.5)
for _k in FROZEN_ENEMIES + COMMON_ENEMIES:
    ENEMIES[_k] = (f'enemy/{_k}', 1.0)

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
        if not want(name) or not has_src(n): continue
        # 名前の絵は、隅の文字・サイン（_corner-text.txt の iceBat・frozenSoldier・whiteQueen-2）も消す
        if key in GROUND:
            fig = trim(deground(cutout(n)))
        elif key in SAND:
            fig = trim(desand(cutout(n)))
        else:
            fig = trim(despeckle(cutout(n), m=0.5 if key in CORNER_TEXT else 0.18) if isinstance(n, str) else cutout(n))
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
# J4 の武器のアイコン（元画像は icon-<アイコンID>.png。指示文は docs/art/prompts-weapon-icons.md）
WEAPON_ICONS = ['axe', 'fist', 'dagger', 'spear', 'katana', 'tome', 'scythe', 'scepter', 'whip', 'instrument', 'gun']
ITEMS.update({k: f'icon-{k}' for k in WEAPON_ICONS})
# 細長い物は斜めにして、枠いっぱいに見せる（角度は反時計回り）
TILT = {'hammer': -40, 'bow': -45, 'staff': -45, 'sword': -45, 'charm': -40,
        # 武器のアイコン: 元画像の傾き（形の長い向き）を測って、剣と同じ「左下→右上」の斜め45度くらいにそろえる。
        # 短剣は切っ先が下なので、半回転させて切っ先を右上に。刀（右下がり）・本・拳・鞭・楽器は元のまま
        'axe': -25, 'spear': -20, 'scepter': -20, 'scythe': -50, 'gun': 13, 'dagger': 140}
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

# 切り抜きで床の影（白い背景が少し暗くなった、薄い茶色がかった灰色）が残る絵
SHADOW = {'dagger'}

def deshadow(im, n):
    """元画像の色で床の影を見つけて消す。影は残った本体と先の方でつながるので、
    細いつながりを切ってから一番大きいかたまりだけを残す（刃の灰色・青みは影の色の範囲に入らない）"""
    import cv2
    s = np.array(Image.open(src(n)).convert('RGB')).astype(int)
    r, g, b = s[..., 0], s[..., 1], s[..., 2]
    sh = ((r - b >= 10) & (r - b <= 45) & (r >= 115) & (r <= 235) & (g <= r) & (g >= b)).astype(np.uint8)
    sh = cv2.dilate(cv2.morphologyEx(sh, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)), np.ones((5, 5), np.uint8))
    a = np.array(im.getchannel('A'))
    a[sh > 0] = 0
    m = cv2.morphologyEx((a > 24).astype(np.uint8), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    _, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = cv2.dilate((lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8), np.ones((7, 7), np.uint8))
    a[keep == 0] = 0
    res = im.copy()
    res.putalpha(Image.fromarray(a))
    return res

def build_items():
    for key, n in ITEMS.items():
        name = f'item/{key}'
        if not want(name) or not has_src(n): continue
        cut = cutout(n)
        fig = trim(deshadow(cut, n) if key in SHADOW else cut, 24)
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


# ---------------- お供（ペット） ----------------
# 元画像は pet-<お供ID>-<色ID>.(webp|png)。SRC に有る物を全部、pet/<お供ID>-<色ID>.webp にする（無い色は飛ばす）
def build_pets():
    import glob, re
    for f in sorted(glob.glob(os.path.join(SRC, 'pet-*'))):
        m = re.match(r'pet-(.+)\.(webp|png|jpg)$', os.path.basename(f))
        if not m: continue
        key = m.group(1)
        name = f'pet/{key}'
        if not want(name): continue
        fig = trim(despeckle(fill_holes(cutout(f'pet-{key}'), f'pet-{key}', always=True)), 24)
        save(rim(square(fig, 160, 0.04), (8, 6, 12), 0.6, 2), f'{name}.webp', 82)

# ---------------- ワールドマップの駒（ちびキャラのミニチュア） ----------------
# 元画像は piece/<職ID>-<male|female>.(webp|png)（台座なし・白い背景。指示文は docs/art/prompts-pieces.md）。
# HeroPiece.tsx が、ゲームで描く金の台座の上に立たせる。絵は正方形（幅・高さとも 1.25s。下端＝台座の上面の中ほど）。
# ここでは: 切り抜く → 床の影を落とす → 足の裏を下端に、体の中心を左右の真ん中にそろえる。
# 大きさは「高さ」でそろえる。正方形なので、横に長い武器（剣・鎌・槍）も体を小さくせずに収まる
PIECE_W, PIECE_H = 180, 180

def sole_row(fig, th=160, frac=0.04):
    """足の裏の高さ: 濃い（不透明な）部分が、ある程度の幅で残っている一番下の行。
    その下に残る薄い床の影は切り捨てる"""
    a = np.array(fig.getchannel('A'))
    rows = (a > th).sum(1)
    need = max(2, fig.width * frac)
    ys = np.where(rows >= need)[0]
    return int(ys.max()) + 1 if len(ys) else fig.height

def mass_center(fig):
    """左右の中心: 不透明な部分の量を左右半分ずつに分ける位置（中央値）。
    ちびキャラは頭と体が大きいので、細い武器が片側に長く伸びていても、ほぼ体の真ん中になる"""
    col = np.array(fig.getchannel('A')).astype(float).sum(0)
    c = np.cumsum(col)
    return float(np.searchsorted(c, c[-1] / 2))

def build_pieces():
    import glob, re
    for f in sorted(glob.glob(os.path.join(SRC, 'piece', '*'))):
        m = re.match(r'(.+)-(male|female)\.(webp|png|jpg)$', os.path.basename(f))
        if not m: continue
        key = f'{m.group(1)}-{m.group(2)}'
        name = f'piece/{key}'
        if not want(name): continue
        fig = trim(despeckle(cutout(f'piece/{key}')), 24)
        fig = fig.crop((0, 0, fig.width, sole_row(fig)))
        fig = trim(fig, 24)
        cx = mass_center(fig)
        # 高さで合わせる。左右は体の中心を真ん中にした時に、はみ出さない大きさまで縮める
        k = PIECE_H * 0.98 / fig.height
        half = max(cx, fig.width - cx)
        k = min(k, PIECE_W / 2 * 0.99 / half)
        f2 = fig.resize((max(1, round(fig.width * k)), max(1, round(fig.height * k))), Image.LANCZOS)
        c = Image.new('RGBA', (PIECE_W, PIECE_H))
        c.alpha_composite(f2, (round(PIECE_W / 2 - cx * k), PIECE_H - f2.height))
        save(c, f'{name}.webp', 80)

# ---------------- ダンジョンの通路（第3段階。指示文は docs/art/prompts-dungeon.md） ----------------
# 元画像は dungeon/<背景>-<wall|floor|ceiling|door>.webp（SRC の下。切り抜きは不要）。
# 通路の面は1マス＝画面の短い辺くらい（スマホで最大 450px 前後）で、奥へ行くほど小さく暗くなるので、512px で足りる。
# 扉は壁の面の中の 56%×78% に描くので、3:4 の 384×512。暗さはゲーム側（DungeonView の shade）で合わせる
# ボスの門（<背景>-bossdoor）も 384×512。真っ黒な帯（翠の神殿の上下）を取り、ふちに写った壁を少し（4.5%）切る
DUNGEON_FACE, DUNGEON_DOOR = 512, (384, 512)

def cut_black_bands(im, th=3):
    """上下左右の、真っ黒（平均の明るさ th 未満）な帯を取る"""
    a = np.array(im.convert('L')).astype(float)
    rows = np.where(a.mean(1) >= th)[0]
    cols = np.where(a.mean(0) >= th)[0]
    return im.crop((cols.min(), rows.min(), cols.max() + 1, rows.max() + 1))

def inset(im, k=0.045):
    dx, dy = round(im.width * k), round(im.height * k)
    return im.crop((dx, dy, im.width - dx, im.height - dy))

def build_dungeon():
    import glob, re
    for f in sorted(glob.glob(os.path.join(SRC, 'dungeon', '*'))):
        m = re.match(r'(.+)-(wall|floor|ceiling|door|bossdoor)\.(webp|png|jpg)$', os.path.basename(f))
        if not m: continue
        name = f'dungeon/{m.group(1)}-{m.group(2)}'
        if not want(name): continue
        im = Image.open(f).convert('RGB')
        if m.group(2) == 'bossdoor':
            im = ImageOps.fit(inset(cut_black_bands(im)), DUNGEON_DOOR, Image.LANCZOS)
        elif m.group(2) == 'door':
            im = ImageOps.fit(im, DUNGEON_DOOR, Image.LANCZOS)
        else:
            im = im.resize((DUNGEON_FACE, DUNGEON_FACE), Image.LANCZOS)
        save(im, f'{name}.webp', 78)
    write_dungeon_tone()

def write_dungeon_tone():
    """置いてある通路の絵の明るさ（0〜255 の平均）を src/art/dungeonTone.ts に書く。
    暗い絵のダンジョンで、扉の縁を明るくして見つけやすくするのに使う（DungeonView）"""
    import glob, re
    from PIL import ImageStat
    tone = {}
    for f in sorted(glob.glob(os.path.join(OUT, 'dungeon', '*.webp'))):
        m = re.match(r'(.+)-(wall|floor|ceiling|door)\.webp$', os.path.basename(f))
        if not m: continue
        v = round(ImageStat.Stat(Image.open(f).convert('L')).mean[0])
        tone.setdefault(m.group(1), {})[m.group(2)] = v
    lines = ['// 自動で作るファイル（scripts/art/build_art.py の write_dungeon_tone）。手で直さない。',
             '// 通路の絵の明るさ（0〜255 の平均）。暗い絵のダンジョンで、扉の縁を明るくし、通路の奥の暗さを弱めるのに使う。',
             'export const DUNGEON_TONE: Record<string, { wall?: number; floor?: number; ceiling?: number; door?: number }> = {']
    for bg, v in tone.items():
        lines.append(f'  {bg}: {{ ' + ', '.join(f'{k}: {v[k]}' for k in ('wall', 'floor', 'ceiling', 'door') if k in v) + ' },')
    lines.append('};')
    p = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'art', 'dungeonTone.ts')
    with open(p, 'w', encoding='utf-8', newline='\n') as fp:
        fp.write('\n'.join(lines) + '\n')
    print('src/art/dungeonTone.ts', tone)

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
    if not has_src(6): return
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
    build_heroes(); build_enemies(); build_bgs(); build_terrains(); build_items(); build_ui(); build_pets(); build_pieces(); build_dungeon()
