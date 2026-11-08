# 武器のアイコン（11種）の Midjourney 指示文

装備の一覧・報酬・持ち物で出る、武器の種類ごとの小さな絵（`src/assets/art/item/<アイコンID>.webp`、192×192）。
今ある絵は剣・杖・槌・弓の4つだけです。残りの11種は、仮の絵（記号）で表示されています。

- **1種類に1枚**です。同じ種類の武器（例: 銅の剣もミスリルソードも）は、同じ絵を使います。なので、特定の武器ではなく、**その種類だと一目で分かる、ふつうの形**にします。
- 作風は、今の4枚（剣・杖）に合わせます。指示文の `--sref` に、公開中の剣と杖のアイコンを入れてあります。
  - `https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp`
  - `https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp`
- 画面の「Style References」には何も入れません（立ち絵と同じです）。
- 細長い物（斧・短剣・槍・刀・鎌・錫杖・銃）は、**まっすぐ縦**に描かせます。今の剣・杖と同じく、加工の時に斜めに傾けます（`build_art.py` の `TILT`）。
- 本・拳・鞭・楽器は、傾けずにそのまま置きます。
- 白い背景・物だけ（手や人は描かない）・1つだけ。`--no` に、文字とサインも入れてあります。

## 指示文（11本）

### 1. 斧（`axe`）→ 元画像 `icon-axe.png`
```
a single heavy single-bladed battle axe with a thick steel blade and a wooden haft wrapped in leather, standing vertically upright, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, double-headed axe, second weapon, signature, text, watermark, scenery
```

### 2. 拳（`fist`）→ 元画像 `icon-fist.png`
```
a single leather fighting glove with worn cloth hand wraps and small brass knuckle studs, empty glove with no hand inside, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, fingers, arm, person, claws, blades, signature, text, watermark, scenery
```

### 3. 短剣（`dagger`）→ 元画像 `icon-dagger.png`
```
a single short dagger with a slightly curved steel blade, a simple crossguard and a leather-wrapped grip, standing vertically upright point down, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, second dagger, sheath, long sword, signature, text, watermark, scenery
```

### 4. 槍（`spear`）→ 元画像 `icon-spear.png`
```
a single long spear with a leaf-shaped steel spearhead and a straight wooden shaft with a small red tassel below the head, standing vertically upright, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, axe blade, halberd, trident, flag, signature, text, watermark, scenery
```

### 5. 刀（`katana`）→ 元画像 `icon-katana.png`
```
a single unsheathed japanese katana with a gently curved steel blade, a round iron tsuba and a black silk-wrapped handle, standing vertically upright point up, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, scabbard, second sword, western sword, signature, text, watermark, scenery
```

### 6. 魔導書（`tome`）→ 元画像 `icon-tome.png`
```
a single closed thick leather-bound spellbook with brass corner guards, a brass clasp and a softly glowing violet rune on the cover, slightly angled three-quarter view, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, second book, stack of books, open pages, letters, signature, text, watermark, scenery
```

### 7. 鎌（`scythe`）→ 元画像 `icon-scythe.png`
```
a single large war scythe with a long curved dark steel blade and a long dark wooden handle, standing vertically upright with the blade at the top, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, skull, sickle, second blade, signature, text, watermark, scenery
```

### 8. 錫杖（`scepter`）→ 元画像 `icon-scepter.png`
```
a single wooden ringed prayer staff (shakujo) topped with a brass ring loop holding several small brass rings and tiny bells, standing vertically upright, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, crystal, gem orb, mace, signature, text, watermark, scenery
```

### 9. 鞭（`whip`）→ 元画像 `icon-whip.png`
```
a single coiled brown leather whip with a braided leather-wrapped handle and a brass pommel, the lash neatly coiled in loops, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, rope, chain, snake, signature, text, watermark, scenery
```

### 10. 楽器（`instrument`）→ 元画像 `icon-instrument.png`
```
a single small wooden traveling lute with a rounded body, a carved sound hole and a bent-back pegbox, slightly angled three-quarter view, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, guitar, violin, bow, music notes, signature, text, watermark, scenery
```

### 11. 銃（`gun`）→ 元画像 `icon-gun.png`
```
a single antique flintlock musket shown in full side profile, laid diagonally, with a clearly visible curved dark wooden shoulder stock, an exposed trigger and trigger guard, a flintlock hammer and a long steel barrel with brass bands, fantasy RPG item icon, detailed hand-painted illustration, isolated object, centered, soft even lighting, plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/sword-CPSjpUbp.webp https://card-rpg-1aa60.web.app/assets/staff-J1mfh1eS.webp --no hands, person, pistol, modern gun, scope, bayonet, signature, text, watermark, scenery
```

## 組み込み（組み込み担当のセッションへ）
- 元画像は `C:\dev\card-rpg-assets\j4\icon-<アイコンID>.(png|webp)` に置く。
- `scripts/art/build_art.py` の `ITEMS` に `'axe': 'icon-axe'` のように名前で足す。
- 傾け（`TILT`）は、元画像の向きを見て決める。1回目（2026-11-08）は「縦に」と書いても、斧・槍・刀は最初から斜めに描かれたので傾けない。短剣だけ縦なので `TILT` に足す（-45 くらい）。鎌・錫杖・銃は、できた絵を見て決める。
- 拳の絵は、下に水色の影が描かれている。切り抜きで残ったら消す。
- **11枚の元画像は 2026-11-08 にすべてそろった**（`C:\dev\card-rpg-assets\j4\icon-*.png`）。銃は2回目（横向きで肩当てが見える形）を採用。斧・槍・刀・鎌・錫杖・銃・短剣以外の楽器も斜めに描かれているので、傾けが要るのは短剣だけ。
- 書き出し先は `src/assets/art/item/<アイコンID>.webp`。置けばゲームが読む（`src/art/index.tsx` の `artImage('item/…')`）。

## 確認表
| アイコン | ID | 元画像 | 加工・画面で確認 |
|---|---|---|---|
| 斧 | `axe` | ☑ | ☐ |
| 拳 | `fist` | ☑ | ☐ |
| 短剣 | `dagger` | ☑ | ☐ |
| 槍 | `spear` | ☑ | ☐ |
| 刀 | `katana` | ☑ | ☐ |
| 魔導書 | `tome` | ☑ | ☐ |
| 鎌 | `scythe` | ☑ | ☐ |
| 錫杖 | `scepter` | ☑ | ☐ |
| 鞭 | `whip` | ☑ | ☐ |
| 楽器 | `instrument` | ☑ | ☐ |
| 銃 | `gun` | ☑ | ☐ |
