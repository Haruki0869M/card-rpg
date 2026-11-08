# 凍てつく王国：敵の絵の指示文

> この文書は、Codex が書いた主ブランチの `docs/art/prompts-enemies-frozenKingdom.md` を、Midjourney に貼る形に直したもの（中身・持たせる物は同じ。作風と `--no` の書き方だけ変えた）。データの説明は元の文書を正とする。

新規23体分。亜種5体は元の絵を使い回す。ボスの変身5段階を含め、画像は計28枚。

参照（2026-11-08 絵の担当が変更）: 今ゲームに入っている敵の絵（森の狼・樹木の番人など、細かく描き込んだ手描き風のファンタジー画）に合わせる。`docs/art/style-reference.png` は初期の太い線のカートゥーン調で今の絵と違うため使わない（`prompts-enemies-common.md` と同じ決まり）。お手本は `--sref` で公開中の敵の絵2枚を指定。画面の「Style References」は空にする。
持たせない物は文の中に書かず、最後の `--no` にまとめた（文の中の no は逆効果になることがあるため）。
白背景・1体のみ・左向きの3/4・全身。切り抜きは `scripts/art/build_art.py`。

### snowHare 雪ウサギ（凍てつく王国・麓・通常・size 0.8）
置き場所: src/assets/art/enemy/snowHare.webp
元画像: `C:\dev\card-rpg-assets\enemy\snowHare.png`

```
full body creature illustration of a small white snow hare, long frost tipped ears, stout hind legs raised for one kick, bare paws, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no clothes, weapons, shield, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frostWolf 雪狼（凍てつく王国・麓・通常・size 0.95）
置き場所: src/assets/art/enemy/frostWolf.webp
元画像: `C:\dev\card-rpg-assets\enemy\frostWolf.png`

```
full body creature illustration of a lean white frost wolf, pale blue eyes, thick winter fur and bare fangs, four visible paws, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no armor, weapons, rider, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frostSprite 霜の精（凍てつく王国・麓・通常・size 0.8）
置き場所: src/assets/art/enemy/frostSprite.webp
元画像: `C:\dev\card-rpg-assets\enemy\frostSprite.png`

```
full body creature illustration of one tiny hovering frost sprite, one round blue body with two small translucent ice wings and short arms, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no staff, weapon, shield, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### iceBat 氷の蝙蝠（凍てつく王国・雪林・通常・size 0.8）
置き場所: src/assets/art/enemy/iceBat.webp
元画像: `C:\dev\card-rpg-assets\enemy\iceBat.png`

```
full body creature illustration of one small icy bat with wide translucent blue wings and a furry white torso, pointed ears and tiny fangs, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no humanoid hands, weapon, armor, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frozenSoldier 凍った兵士（凍てつく王国・雪林・通常・size 1）
置き場所: src/assets/art/enemy/frozenSoldier.webp
元画像: `C:\dev\card-rpg-assets\enemy\frozenSoldier.png`

```
full body creature illustration of one frozen human soldier, weathered steel helmet, rigid icy blue coat of mail, exactly one short steel sword and one round wooden shield, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no bow, spear, extra weapons, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### snowOwl 白梟（凍てつく王国・雪林・通常・size 0.85）
置き場所: src/assets/art/enemy/snowOwl.webp
元画像: `C:\dev\card-rpg-assets\enemy\snowOwl.png`

```
full body creature illustration of one compact snowy owl with white feathered wings partly spread and black speckles, round amber eyes, large talons, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no clothing, weapon, perch, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### icicleBug 氷柱の虫（凍てつく王国・雪林・通常・size 0.85）
置き場所: src/assets/art/enemy/icicleBug.webp
元画像: `C:\dev\card-rpg-assets\enemy\icicleBug.png`

```
full body creature illustration of one six legged ice beetle, broad faceted blue carapace and a single long icicle horn, insect mandibles, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no humanoid limbs, weapon, shield, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### snowWitch 雪の魔女（凍てつく王国・雪林・エリート・size 1.2）
置き場所: src/assets/art/enemy/snowWitch.webp
元画像: `C:\dev\card-rpg-assets\enemy\snowWitch.png`

```
full body creature illustration of one snow witch, pale face under a white fur hood, flowing blue winter robe, exactly one short crystal wand in her right hand, left hand open, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, shield, broom, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### crystalLord 氷晶の主（凍てつく王国・雪林・ボス・size 1.4）
置き場所: src/assets/art/enemy/crystalLord.webp
元画像: `C:\dev\card-rpg-assets\enemy\crystalLord.png`

```
full body creature illustration of one imposing crystalline ice golem, squat broad torso made of pale blue quartz plates, two thick arms ending in jagged crystal fists, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no carried weapon, shield, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### crystalLord-1 増殖する氷晶（HP50%以下）
置き場所: src/assets/art/enemy/crystalLord-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\crystalLord-1.png`

```
full body creature illustration of one imposing crystalline ice golem, squat broad torso made of pale blue quartz plates, two thick arms ending in jagged crystal fists, same creature transformed with additional tall ice crystals growing from both shoulders and back, wider armored silhouette, same two empty crystal fists, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no carried weapon, shield, crown, separate crystal creatures, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### iceSlime 氷結のスライム（凍てつく王国・湖・通常・size 0.9）
置き場所: src/assets/art/enemy/iceSlime.webp
元画像: `C:\dev\card-rpg-assets\enemy\iceSlime.png`

```
full body creature illustration of one round translucent pale blue ice slime, a single visible frosty core and simple eyes, small frozen surface spikes, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no humanoid limbs, weapons, armor, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frozenGhoul 凍える亡者（凍てつく王国・湖・通常・size 1）
置き場所: src/assets/art/enemy/frozenGhoul.webp
元画像: `C:\dev\card-rpg-assets\enemy\frozenGhoul.png`

```
full body creature illustration of one shivering frozen ghoul in ragged burial cloth, icy gray skin, hunched back and long empty clawed hands, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapon, shield, blood, gore, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### iceArcher 極寒の弓兵（凍てつく王国・湖・通常・size 1）
置き場所: src/assets/art/enemy/iceArcher.webp
元画像: `C:\dev\card-rpg-assets\enemy\iceArcher.png`

```
full body creature illustration of one lean winter archer in a frost crusted leather coat and hood, exactly one longbow with one arrow drawn, a closed quiver on the back, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, shield, crossbow, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frostMage 霜の魔法使い（凍てつく王国・湖・通常・size 1）
置き場所: src/assets/art/enemy/frostMage.webp
元画像: `C:\dev\card-rpg-assets\enemy\frostMage.png`

```
full body creature illustration of one frost mage in a long pale blue robe and angular hood, exactly one tall staff topped by a single six pointed ice crystal, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, shield, book, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### iceKnight 氷の騎士（凍てつく王国・湖・エリート・size 1.2）
置き場所: src/assets/art/enemy/iceKnight.webp
元画像: `C:\dev\card-rpg-assets\enemy\iceKnight.png`

```
full body creature illustration of one stocky ice knight, full faceted blue plate armor with closed helmet, exactly one broad ice sword, empty left hand, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, bow, extra blade, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frozenBishop 凍れる司教（凍てつく王国・湖・ボス・size 1.5）
置き場所: src/assets/art/enemy/frozenBishop.webp
元画像: `C:\dev\card-rpg-assets\enemy\frozenBishop.png`

```
full body creature illustration of one imposing frozen bishop in ornate white and blue vestments, tall split ceremonial mitre, exactly one silver crozier with an icy circular head, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, shield, book, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### frozenBishop-1 冬への祈り（HP50%以下）
置き場所: src/assets/art/enemy/frozenBishop-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\frozenBishop-1.png`

```
full body creature illustration of one imposing frozen bishop in ornate white and blue vestments, tall split ceremonial mitre, exactly one silver crozier with an icy circular head, same bishop transformed with a halo of thin frozen prayer shards joined behind his mitre, robes fused into rigid ice plates, same single crozier, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, shield, book, extra figure, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### yeti 雪男（凍てつく王国・山脈・通常・size 1.1）
置き場所: src/assets/art/enemy/yeti.webp
元画像: `C:\dev\card-rpg-assets\enemy\yeti.png`

```
full body creature illustration of one broad white yeti with long shaggy fur, blue face, heavy bare fists and stout legs, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no club, carried weapon, armor, rider, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### blizzardSnake 吹雪の蛇（凍てつく王国・山脈・通常・size 1）
置き場所: src/assets/art/enemy/blizzardSnake.webp
元画像: `C:\dev\card-rpg-assets\enemy\blizzardSnake.png`

```
full body creature illustration of one large coiled white snow snake with icy blue scales along its spine, one head with two small fangs, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no legs, wings, weapon, armor, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### iceSwordsman 氷の剣士（凍てつく王国・山脈・通常・size 1）
置き場所: src/assets/art/enemy/iceSwordsman.webp
元画像: `C:\dev\card-rpg-assets\enemy\iceSwordsman.png`

```
full body creature illustration of one slender ice swordsman in blue padded armor and a white scarf, exactly one straight steel sword gripped with both hands, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, bow, spare sword, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### blizzardBeast 吹雪の獣（凍てつく王国・山脈・エリート・size 1.2）
置き場所: src/assets/art/enemy/blizzardBeast.webp
元画像: `C:\dev\card-rpg-assets\enemy\blizzardBeast.png`

```
full body creature illustration of one massive four legged snow beast, broad feline face with two saber fangs, shaggy white fur and pale blue shoulder crystals, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no wings, rider, weapon, armor, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frostDrakeling 凍土の竜の幼体（凍てつく王国・山脈・エリート・size 1.2）
置き場所: src/assets/art/enemy/frostDrakeling.webp
元画像: `C:\dev\card-rpg-assets\enemy\frostDrakeling.png`

```
full body creature illustration of one juvenile frost dragon, stout four legged body, short folded wings, pale blue scales and small swept horns, curled heavy tail, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no rider, armor, carried weapon, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frostGiant 霜の巨人（凍てつく王国・山脈・ボス・size 1.6）
置き場所: src/assets/art/enemy/frostGiant.webp
元画像: `C:\dev\card-rpg-assets\enemy\frostGiant.png`

```
full body creature illustration of one towering frost giant, huge blue gray muscular body, white beard and heavy fur belt, exactly one oversized stone mining hammer held in both hands, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, sword, helmet, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### frostGiant-1 怒れる霜の巨人（HP50%以下）
置き場所: src/assets/art/enemy/frostGiant-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\frostGiant-1.png`

```
full body creature illustration of one towering frost giant, huge blue gray muscular body, white beard and heavy fur belt, exactly one oversized stone mining hammer held in both hands, same giant enraged, frost cracks glowing blue across his skin, shoulders raised and the same single mining hammer lifted overhead, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, sword, helmet, second hammer, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frostGuardian 霜の守護者（凍てつく王国・城・エリート・size 1.2）
置き場所: src/assets/art/enemy/frostGuardian.webp
元画像: `C:\dev\card-rpg-assets\enemy\frostGuardian.png`

```
full body creature illustration of one broad faceless guardian golem, blue white stone blocks bound with ice, rectangular shoulders and massive empty fists, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no carried weapon, shield, bow, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### whiteQueen 白の女王（凍てつく王国・城・ボス・size 1.6）
置き場所: src/assets/art/enemy/whiteQueen.webp
元画像: `C:\dev\card-rpg-assets\enemy\whiteQueen.png`

```
full body creature illustration of one imposing tragic ice queen with a youthful sorrowful human face, a single delicate ice crown and a long blue white royal gown with crystalline hem, open empty hands, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, staff, shield, throne, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### whiteQueen-1 帰らぬ春を待つ姫（HP60%以下）
置き場所: src/assets/art/enemy/whiteQueen-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\whiteQueen-1.png`

```
full body creature illustration of one imposing tragic ice queen with a youthful sorrowful human face, a single delicate ice crown and a long blue white royal gown with crystalline hem, open empty hands, same tragic young queen, icy tear tracks and a wider fractured crown, royal dress turning into rigid jagged ice, same empty open hands, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, staff, shield, throne, weapon, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### whiteQueen-2 永遠の冬に呑まれた女王（HP30%以下）
置き場所: src/assets/art/enemy/whiteQueen-2.webp
元画像: `C:\dev\card-rpg-assets\enemy\whiteQueen-2.png`

```
full body creature illustration of one imposing tragic ice queen with a youthful sorrowful human face, a single delicate ice crown and a long blue white royal gown with crystalline hem, open empty hands, same queen completely overtaken by winter, face still recognizable inside a broad ice crown, long gown transformed into a jagged crystalline royal silhouette, arms spread for a final blizzard, same empty hands, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, staff, shield, throne, wings, extra figure, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## build_art.py の ENEMIES 表へ追記する行

番号はオーナーが画像を選んだ後で決める。`None` を実際の番号に置き換えてから転記する（ここではスクリプト本体を変更しない）。
`1.0` は切り抜き画像の収まり。戦闘中の大きさは敵データの `size` が調整する。

```python
    'snowHare': (None, 1.0),  # 番号未定
    'frostWolf': (None, 1.0),  # 番号未定
    'frostSprite': (None, 1.0),  # 番号未定
    'iceBat': (None, 1.0),  # 番号未定
    'frozenSoldier': (None, 1.0),  # 番号未定
    'snowOwl': (None, 1.0),  # 番号未定
    'icicleBug': (None, 1.0),  # 番号未定
    'snowWitch': (None, 1.0),  # 番号未定
    'crystalLord': (None, 1.0),  # 番号未定
    'crystalLord-1': (None, 1.0),  # 番号未定
    'iceSlime': (None, 1.0),  # 番号未定
    'frozenGhoul': (None, 1.0),  # 番号未定
    'iceArcher': (None, 1.0),  # 番号未定
    'frostMage': (None, 1.0),  # 番号未定
    'iceKnight': (None, 1.0),  # 番号未定
    'frozenBishop': (None, 1.0),  # 番号未定
    'frozenBishop-1': (None, 1.0),  # 番号未定
    'yeti': (None, 1.0),  # 番号未定
    'blizzardSnake': (None, 1.0),  # 番号未定
    'iceSwordsman': (None, 1.0),  # 番号未定
    'blizzardBeast': (None, 1.0),  # 番号未定
    'frostDrakeling': (None, 1.0),  # 番号未定
    'frostGiant': (None, 1.0),  # 番号未定
    'frostGiant-1': (None, 1.0),  # 番号未定
    'frostGuardian': (None, 1.0),  # 番号未定
    'whiteQueen': (None, 1.0),  # 番号未定
    'whiteQueen-1': (None, 1.0),  # 番号未定
    'whiteQueen-2': (None, 1.0),  # 番号未定
```

## 亜種（画像不要）

- emberFrostWolf → frostWolf（ember）
- cursedFrozenSoldier → frozenSoldier（shadow）
- venomIceSlime → iceSlime（venom）
- stormIceArcher → iceArcher（storm）
- shadowSnowWitch → snowWitch（shadow）

## 実装上の判断

- 麓の3種は指定どおり全員が氷耐性・火弱点。麓だけは耐性分散の例外とし、雪林・湖では火耐性や闇耐性の亜種も配置する。
- 白の女王の火弱点は共通仕様の1.5倍。個別の「少しだけ」の倍率は既存データにないため追加しない。
- 氷属性ダメージ自体にも凍結抽選がある。無属性の打撃も混ぜ、凍結の明示付与は1、順番行動で連発を避ける。

## 実装・確認の記録（2026-11-08）

- 敵は通常18・エリート6・ボス4。亜種5体は内数（17.9%）。通常HP20〜52、エリート48〜95、ボス150/210/270/400。通常の単発攻撃5〜12（全体・連撃の1発はこれより小さくする）。経験値・ゴールドは同レベルの侵食の魔王の敵に揃えた。
- 白梟は開幕にランダムな相手1人へ3ダメージの先制特性を持つ。対象の抽選は既存の効果のRngを使う。毒氷のスライムは開幕毒1、毒耐性を外し、凍結を連発しない毒攻撃中心の行動にした。
- 敵を弱くしてクリア率を合わせる変更はしていない。最初の自動プレイは両シナリオとも10%で、町の入退場を繰り返していた。検証用botが施設の先頭だけを宿泊させていたため、施設の各メンバーを本人のheroId・本人のお金で宿泊させるよう修正した。傷ついた本人が宿代を払える町だけを選び、回帰テスト2件を追加した。プレイヤー向けの宿泊・寒さ・制限時間は変更していない。
- 型チェック成功。全テストは605成功・3スキップ（追加7件）。通常実行は1回、既存のランダム地図300回生成で5秒を約0.3秒超過したため、最終全件は`--maxWorkers=2`で成功した。既存テストの時間制限は変更していない。
- 既存のgame.testは19件成功。最終ビルド成功。重い確認はすべて`node C:/dev/card-rpg-tools/heavy.mjs`経由。

自動プレイ：種1001〜1010、戦士＋魔法使いの2人、ふつう、同じ修正済みbotで比較。

| シナリオ | クリア率 | 日数平均 | 戦闘数平均 | 部屋数平均 | 失敗 |
|---|---:|---:|---:|---:|---|
| 凍てつく王国 | 90% | 5.2 | 39.1 | 44.6 | 全滅1 |
| 侵食の魔王 | 80% | 5.7 | 34.0 | 33.5 | 全滅1・侵食度100%1 |

クリア率の目安は満たすが、部屋数は比較対象より11.1部屋多い。10種の確認結果であり、最終調整時の確認点として残す。既存の部屋配置は変更していない（ランダム洞窟のボスだけ指定の組に置き換えた）。
実行結果：`screenshots/balance.md`（凍てつく王国）、`screenshots/balance-frozenKingdom.md`、`screenshots/balance-corruptionKing.md`。
