# 共通の敵（K3 B）の絵の指示文（Midjourney に貼る形）

新しい共通の敵15体のうち、**絵が新しく要るのは12体**。亜種3体（影の野盗・炎の荒れ猪・雷の大蜘蛛）は、元の敵の絵を使い回し、足元のオーラ（影・炎・雷）で見分けるので、指示文は書かない。

- 作風・参照・書き方は `prompts-enemies-common.md` と、`prompts-enemies-frozenKingdom-mj.md`（ブランチ `claude/j4-prompts-9ade08` のコミット bb920ce）と同じ。今ゲームに入っている敵の絵（細かく描き込んだ手描き風のファンタジー画）に合わせる。`docs/art/style-reference.png` は古い作風なので使わない。
- お手本は `--sref` で公開中の敵の絵2枚を指定する。画面の「Style References」は空にする。
- 持たせない物は、文の中に書かず、最後の `--no` にまとめる。
- 白背景・1体のみ・左向きの3/4・全身。切り抜きは `scripts/art/build_art.py`。
- 元画像は、オーナーが `C:\dev\card-rpg-assets\enemy\<敵ID>.png` に置く。

## 野盗（bandits）

### banditThug 野盗のごろつき（共通・通常・size 0.95）
置き場所: src/assets/art/enemy/banditThug.webp
元画像: `C:\dev\card-rpg-assets\enemy\banditThug.png`

```
full body creature illustration of one scruffy human bandit thug, patched leather vest and a ragged brown hood, exactly one chipped short sword held low in the right hand, scarred cheek and a menacing grin, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dull brown and olive tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, bow, second weapon, armor plates, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### banditArcher 野盗の弓手（共通・通常・size 0.9）
置き場所: src/assets/art/enemy/banditArcher.webp
元画像: `C:\dev\card-rpg-assets\enemy\banditArcher.png`

```
full body creature illustration of one lean human bandit archer, dark green hooded cloak with a cloth mask over the lower face, exactly one worn wooden shortbow drawn with an arrow, a small quiver on the back, crouching stance, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dull brown and olive tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, shield, crossbow, second bow, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### banditChief 野盗の頭目（共通・エリート・size 1.2）
置き場所: src/assets/art/enemy/banditChief.webp
元画像: `C:\dev\card-rpg-assets\enemy\banditChief.png`

```
full body creature illustration of one large brutish human bandit chief, fur-trimmed leather coat over rough iron shoulder guards, an eye patch, a tattered red sash, exactly one huge notched cleaver-sword held in both hands, broad stance and a confident sneer, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dull brown and rust red tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, bow, second weapon, helmet, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## 野の獣と虫（beasts）

### wildBoar 荒れ猪（共通・通常・size 1）
置き場所: src/assets/art/enemy/wildBoar.webp
元画像: `C:\dev\card-rpg-assets\enemy\wildBoar.png`

```
full body creature illustration of one stocky wild boar with bristly dark brown fur, two thick curved tusks and a lowered head ready to charge, four visible hooves, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dull brown and olive tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no armor, saddle, rider, flames, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### giantSpider 大蜘蛛（共通・通常・size 0.95）
置き場所: src/assets/art/enemy/giantSpider.webp
元画像: `C:\dev\card-rpg-assets\enemy\giantSpider.png`

```
full body creature illustration of one large dark brown spider with a bulbous abdomen marked with a pale yellow pattern, eight long hairy legs, glistening fangs and clusters of small red eyes, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dull brown and olive tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no web, spider web background, lightning, second spider, ground shadow, scenery, pedestal, signature, text, watermark
```

### caveBat 洞窟蝙蝠（共通・通常・size 0.75）
置き場所: src/assets/art/enemy/caveBat.webp
元画像: `C:\dev\card-rpg-assets\enemy\caveBat.png`

```
full body creature illustration of one cave bat with leathery dark grey wings spread wide, a small furry body, big pointed ears and tiny sharp fangs in an open mouth, hanging claws, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dull grey and brown tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no cave ceiling, stalactites, second bat, glowing eyes, ground shadow, scenery, pedestal, signature, text, watermark
```

### stoneTortoise 岩亀（共通・通常・size 1.1）
置き場所: src/assets/art/enemy/stoneTortoise.webp
元画像: `C:\dev\card-rpg-assets\enemy\stoneTortoise.png`

```
full body creature illustration of one huge tortoise whose shell is made of rough grey stone plates with a little moss, thick scaly legs, a blunt beaked head half withdrawn, slow and heavy stance, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dull grey and moss green tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no rider, crystals, lava, flames, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### greatBear 大熊（共通・エリート・size 1.3）
置き場所: src/assets/art/enemy/greatBear.webp
元画像: `C:\dev\card-rpg-assets\enemy\greatBear.png`

```
full body creature illustration of one enormous brown bear rearing up on its hind legs with both front paws raised, thick shaggy fur with old scars across the chest, a few small leaves caught in the mane, a wide roaring mouth with heavy fangs, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm brown and olive tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no armor, saddle, weapon, cub, trees, ground shadow, scenery, pedestal, signature, text, watermark
```

## 亡者・亡霊・小鬼（spirits）

### shambler 彷徨う死体（共通・通常・size 1）
置き場所: src/assets/art/enemy/shambler.webp
元画像: `C:\dev\card-rpg-assets\enemy\shambler.png`

```
full body creature illustration of one shambling undead corpse in torn rotting peasant clothes, grey-green decayed skin, hollow eyes, one arm hanging low and the other reaching forward with bony fingers, hunched stiff posture, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dull grey and sickly green tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapon, armor, helmet, graveyard, crowd, ground shadow, scenery, pedestal, signature, text, watermark
```

### wanderingGhost 迷える亡霊（共通・通常・size 0.9）
置き場所: src/assets/art/enemy/wanderingGhost.webp
元画像: `C:\dev\card-rpg-assets\enemy\wanderingGhost.png`

```
full body creature illustration of one pale translucent ghost of a sorrowful woman in a long tattered gown that fades into mist at the bottom, long drifting hair, hollow sad eyes, both hands reaching forward, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with pale blue-grey and faint violet tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapon, chains, skull, candle, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### imp 小鬼（共通・通常・size 0.8）
置き場所: src/assets/art/enemy/imp.webp
元画像: `C:\dev\card-rpg-assets\enemy\imp.png`

```
full body creature illustration of one small mischievous red imp with little black horns, bat-like small wings, a thin pointed tail and a wide toothy grin, holding a tiny ball of flame in one clawed hand, crouching playful pose, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dull red and dark brown tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no trident, weapon, armor, large flames, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### hauntedKnight 呪われた亡霊騎士（共通・エリート・size 1.25）
置き場所: src/assets/art/enemy/hauntedKnight.webp
元画像: `C:\dev\card-rpg-assets\enemy\hauntedKnight.png`

```
full body creature illustration of one tall ghostly knight in rusted full plate armor with a closed helm and faintly glowing violet eyes behind the visor, tattered dark cloak, exactly one long rusty sword held low in the right hand and exactly one battered round shield on the left arm, mist drifting from the armor joints, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with rust brown and dull violet tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no bow, spear, second sword, horse, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```
