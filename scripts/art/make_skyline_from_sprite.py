# 地平線の絵が無いシナリオの「仮の地平線」: 箱庭の部品の絵を、遠くにかすんだ形にする（青みがかった灰色・やわらかく）。
# 使い方: py scripts/art/make_skyline_from_sprite.py <部品の名前> <出力の名前> [色 r,g,b]
#   例: py scripts/art/make_skyline_from_sprite.py sea-wreck skyline-wreck-haze 150,165,190
# 本番の地平線の絵（ChatGPT）が届いたら、そちらを使う（LandscapeLayer.tsx の SKYLINE_ART は、先に書いた物から使う）
import sys, os
import numpy as np
from PIL import Image, ImageFilter

D = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'assets', 'art', 'landscape')
name, out = sys.argv[1], sys.argv[2]
tone = tuple(int(v) for v in (sys.argv[3] if len(sys.argv) > 3 else '150,165,190').split(','))
im = Image.open(os.path.join(D, f'{name}.webp')).convert('RGBA')
im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox())
a = np.array(im).astype(float)
g = a[..., :3].mean(2, keepdims=True)
rgb = a[..., :3] * 0.3 + g * 0.7  # 色を薄く
rgb = rgb * 0.45 + np.array(tone) * 0.55  # 遠くの空気の色に寄せる
a[..., :3] = rgb
a[..., 3] *= 0.92
im = Image.fromarray(a.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
W, H = 1024, 768
k = min(W * 0.78 / im.width, H * 0.9 / im.height)
im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
c = Image.new('RGBA', (W, H))
c.alpha_composite(im, ((W - im.width) // 2, H - im.height))
c.save(os.path.join(D, f'{out}.webp'), quality=86, method=6)
print(out, im.size)
