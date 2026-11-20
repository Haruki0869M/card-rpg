# 星降る天空城：敵の絵の指示文

> 作業書 `docs/archive/tasks/K4-star-enemies.md` の §4。形は `prompts-enemies-frozenKingdom-mj.md` と同じ（Midjourney に貼る形）。

新規23体分。亜種5体は元の絵を使い回す。ボスの変身5段階を含め、画像は計28枚。

参照: 今ゲームに入っている敵の絵（森の狼・樹木の番人など、細かく描き込んだ手描き風のファンタジー画）に合わせる。`docs/art/style-reference.png` は使わない。お手本は `--sref` で公開中の敵の絵2枚を指定。画面の「Style References」は空にする。
持たせない物は文の中に書かず、最後の `--no` にまとめた。
白背景・1体のみ・左向きの3/4・全身。切り抜きは `scripts/art/build_art.py`。
このシナリオの雰囲気: 夜空の紺と金、白い雲、淡い月光。天使の像は白い大理石と金の縁。時計仕掛けは真鍮と歯車。

### cloudSheep 雲羊（星降る天空城・港・通常・size 0.85）
置き場所: src/assets/art/enemy/cloudSheep.webp
元画像: `C:\dev\card-rpg-assets\enemy\cloudSheep.png`

```
full body creature illustration of one plump fluffy sheep made of soft white cloud wool, small curled gold horns lowered for a charge, short dark hooves, sleepy gentle eyes, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapons, armor, rider, lightning, wings, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### skyGull 空カモメ（星降る天空城・港・通常・size 0.8）
置き場所: src/assets/art/enemy/skyGull.webp
元画像: `C:\dev\card-rpg-assets\enemy\skyGull.png`

```
full body creature illustration of one large sky gull with white and pale grey feathers, wings spread mid flap, sharp yellow hooked beak and gold tipped wing feathers, two visible webbed feet, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapons, armor, fish, second bird, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### windSprite 風の精（星降る天空城・回廊・通常・size 0.8）
置き場所: src/assets/art/enemy/windSprite.webp
元画像: `C:\dev\card-rpg-assets\enemy\windSprite.png`

```
full body creature illustration of one small hovering wind sprite, a slim pale blue translucent body trailing into a swirl of wind, wispy hair blown back and tiny gold eyes, small open hands, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, staff, wand, weapon, wings, clouds, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### clockworkSoldier 時計仕掛けの兵（星降る天空城・回廊・通常・size 1.0）
置き場所: src/assets/art/enemy/clockworkSoldier.webp
元画像: `C:\dev\card-rpg-assets\enemy\clockworkSoldier.png`

```
full body creature illustration of one clockwork soldier automaton of polished brass plates and visible turning gears, a round clock face set into its chest, a large wind up key on its back, exactly one short brass spear held upright, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, shield, sword, bow, human face, extra weapons, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### starJelly 星くらげ（星降る天空城・回廊・通常・size 0.85）
置き場所: src/assets/art/enemy/starJelly.webp
元画像: `C:\dev\card-rpg-assets\enemy\starJelly.png`

```
full body creature illustration of one floating star jellyfish, a translucent deep navy bell speckled with tiny glowing gold stars, long trailing tentacles crackling with faint sparks, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapon, eyes, mouth, water, bubbles, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### gearBeetle 歯車の甲虫（星降る天空城・回廊・丘・通常・size 0.9）
置き場所: src/assets/art/enemy/gearBeetle.webp
元画像: `C:\dev\card-rpg-assets\enemy\gearBeetle.png`

```
full body creature illustration of one heavy beetle with a thick domed brass shell made of interlocking cog wheels, six jointed metal legs, short blunt horn, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, rider, wings spread, weapon, rust, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### shootingStarBird 流れ星の鳥（星降る天空城・丘・通常・size 0.9）
置き場所: src/assets/art/enemy/shootingStarBird.webp
元画像: `C:\dev\card-rpg-assets\enemy\shootingStarBird.png`

```
full body creature illustration of one swift slender bird made of gold starlight, a long glowing comet tail of white and gold sparks streaming behind, sharp diving pose with wings swept back, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapon, armor, rider, fire, second bird, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### moonRabbit 月のウサギ（星降る天空城・丘・通常・size 0.85）
置き場所: src/assets/art/enemy/moonRabbit.webp
元画像: `C:\dev\card-rpg-assets\enemy\moonRabbit.png`

```
full body creature illustration of one white rabbit with long ears and pale silver fur, a faint crescent moon mark glowing on its forehead, mysterious violet eyes, a small wooden rice cake mallet held in its front paws, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, clothing, carrot, second rabbit, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### angelStatue 天使の像（星降る天空城・丘・通常・size 1.0）
置き場所: src/assets/art/enemy/angelStatue.webp
元画像: `C:\dev\card-rpg-assets\enemy\angelStatue.png`

```
full body creature illustration of one living angel statue of cracked white marble with gold trim, folded feathered stone wings, blank serene marble eyes, exactly one marble sword held in both hands pointing down, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, shield, bow, halo of fire, real skin, wooden parts, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### starFragment 星のかけら（星降る天空城・丘・通常・size 0.75）
置き場所: src/assets/art/enemy/starFragment.webp
元画像: `C:\dev\card-rpg-assets\enemy\starFragment.png`

```
full body creature illustration of one small hovering five pointed star shard of faceted pale gold crystal, a faint navy core and a tiny frowning face, little sparkles orbiting it, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, limbs, weapon, wings, second star, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### windGuardianHawk 風の守りの鷹（星降る天空城・回廊・風車の塔・エリート・size 1.2）
置き場所: src/assets/art/enemy/windGuardianHawk.webp
元画像: `C:\dev\card-rpg-assets\enemy\windGuardianHawk.png`

```
full body creature illustration of one large guardian hawk with navy and white plumage, a small gold crest helm on its head, broad wings spread wide with wind swirling under them, huge sharp talons, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, rider, saddle, weapon, lightning, second bird, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### windKeeper 風の番人（星降る天空城・風車の塔・ボス・size 1.4）
置き場所: src/assets/art/enemy/windKeeper.webp
元画像: `C:\dev\card-rpg-assets\enemy\windKeeper.png`

```
full body creature illustration of one tall armored wind keeper, a hollow suit of pale blue and gold armor with no face inside, a swirling whirlwind for a lower body, a long flowing white scarf, exactly one large windmill vane shaped halberd, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, shield, bow, legs, horse, second weapon, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### windKeeper-1 竜巻をまとう番人（HP50%以下）
置き場所: src/assets/art/enemy/windKeeper-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\windKeeper-1.png`

```
full body creature illustration of one tall armored wind keeper, a hollow suit of pale blue and gold armor with no face inside, a swirling whirlwind for a lower body, a long flowing white scarf, exactly one large windmill vane shaped halberd, same wind keeper wrapped in a raging tornado, armor plates lifted apart by the wind, scarf torn wide, the same single windmill vane halberd raised high, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, shield, bow, legs, horse, second weapon, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### starDustScribe 星屑の書記（星降る天空城・丘・天文台・エリート・size 1.2）
置き場所: src/assets/art/enemy/starDustScribe.webp
元画像: `C:\dev\card-rpg-assets\enemy\starDustScribe.png`

```
full body creature illustration of one hunched scribe spirit in a long navy robe embroidered with gold constellations, a hood hiding all but two glowing eyes, exactly one quill pen trailing star dust and one open floating book, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, staff, sword, shield, glasses, second book, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### starLibrarian 星の司書（星降る天空城・星見の天文台・ボス・size 1.4）
置き場所: src/assets/art/enemy/starLibrarian.webp
元画像: `C:\dev\card-rpg-assets\enemy\starLibrarian.png`

```
full body creature illustration of one serene tall librarian of the stars, a gentle woman with long silver hair and gold spectacles, a flowing navy gown with gold star charts, exactly one large star atlas book held open in one hand, several loose pages circling her, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, staff, sword, shield, crown, wings, desk, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### starLibrarian-1 星の雨を呼ぶ司書（HP50%以下）
置き場所: src/assets/art/enemy/starLibrarian-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\starLibrarian-1.png`

```
full body creature illustration of one serene tall librarian of the stars, a gentle woman with long silver hair and gold spectacles, a flowing navy gown with gold star charts, exactly one large star atlas book held open in one hand, several loose pages circling her, same star librarian floating upward, the same single star atlas blazing gold, loose pages turning into falling shooting stars around her, hair lifted by starlight, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, staff, sword, shield, crown, wings, desk, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### moonWolf 月の狼（星降る天空城・庭園・通常・size 1.0）
置き場所: src/assets/art/enemy/moonWolf.webp
元画像: `C:\dev\card-rpg-assets\enemy\moonWolf.png`

```
full body creature illustration of one lean silver blue wolf with fur glowing faintly in moonlight, a pale crescent shaped mark on its shoulder, bright pale yellow eyes and white fangs, four visible paws, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, armor, weapons, rider, collar, second wolf, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### thornFairy 茨の妖精（星降る天空城・庭園・通常・size 0.8）
置き場所: src/assets/art/enemy/thornFairy.webp
元画像: `C:\dev\card-rpg-assets\enemy\thornFairy.png`

```
full body creature illustration of one small mischievous fairy with a body woven from dark green thorny vines, pale moonflower petals as a skirt, thin translucent wings, a single thorn needle held like a tiny spear, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, staff, bow, flower crown of fire, second fairy, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### hourglassGolem 砂時計のゴーレム（星降る天空城・庭園・通常・size 1.1）
置き場所: src/assets/art/enemy/hourglassGolem.webp
元画像: `C:\dev\card-rpg-assets\enemy\hourglassGolem.png`

```
full body creature illustration of one slow heavy golem whose torso is a giant brass framed hourglass with glowing gold sand flowing inside, thick stone arms and legs etched with clock numerals, empty fists, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapon, shield, face, gears for head, second hourglass, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### clockworkKnight 時計仕掛けの騎士（星降る天空城・庭園・天文台・エリート・size 1.2）
置き場所: src/assets/art/enemy/clockworkKnight.webp
元画像: `C:\dev\card-rpg-assets\enemy\clockworkKnight.png`

```
full body creature illustration of one tall clockwork knight in heavy brass and navy enamel armor with exposed gears at the joints, a clock face visor, exactly one large brass tower shield and one short brass sword, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, spear, bow, cape, horse, human face, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### moonGardener 月の庭師（星降る天空城・庭園・エリート・size 1.2）
置き場所: src/assets/art/enemy/moonGardener.webp
元画像: `C:\dev\card-rpg-assets\enemy\moonGardener.png`

```
full body creature illustration of one tall slender gardener spirit with a pale moonlit face under a wide straw brimmed hat woven with silver vines, long robes of leaves, exactly one long pair of garden shears, thorny vines coiling from its sleeves, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, bow, watering can, second tool, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### moonMaiden 月の乙女（星降る天空城・月光の庭・ボス・size 1.5）
置き場所: src/assets/art/enemy/moonMaiden.webp
元画像: `C:\dev\card-rpg-assets\enemy\moonMaiden.png`

```
full body creature illustration of one graceful moon maiden with long pale silver hair, a flowing white and pale blue gown covered in moonflower petals, a crescent moon ornament in her hair, thorny rose vines winding around her arms, open empty hands, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, staff, shield, crown, wings, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### moonMaiden-1 満月の力に目覚めた乙女（HP50%以下）
置き場所: src/assets/art/enemy/moonMaiden-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\moonMaiden-1.png`

```
full body creature illustration of one graceful moon maiden with long pale silver hair, a flowing white and pale blue gown covered in moonflower petals, a crescent moon ornament in her hair, thorny rose vines winding around her arms, open empty hands, same moon maiden glowing with full moon power, a large pale full moon halo behind her head, gown and hair lifted upward, the thorny rose vines grown long and wild, open empty hands, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, staff, shield, crown, wings, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### skyKnight 空の騎士（星降る天空城・前庭・通常・size 1.05）
置き場所: src/assets/art/enemy/skyKnight.webp
元画像: `C:\dev\card-rpg-assets\enemy\skyKnight.png`

```
full body creature illustration of one sky knight in white and navy plate armor with small gold feathered wings on the helmet, a long white cape, exactly one long silver lance couched for a charge, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, shield, sword, bow, horse, real wings, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### skyPaladin 空の聖騎士（星降る天空城・前庭・天空城・エリート・size 1.25）
置き場所: src/assets/art/enemy/skyPaladin.webp
元画像: `C:\dev\card-rpg-assets\enemy\skyPaladin.png`

```
full body creature illustration of one towering sky paladin in ornate white and gold plate armor, a radiant gold halo ring behind the helm, large white feathered wings, exactly one gold longsword and one round white shield with a star emblem, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, spear, bow, horse, banner, second sword, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### starSeerQueen 星読みの女王（星降る天空城・天空城・ボス・size 1.6）
置き場所: src/assets/art/enemy/starSeerQueen.webp
元画像: `C:\dev\card-rpg-assets\enemy\starSeerQueen.png`

```
full body creature illustration of one regal star seer queen with a calm far seeing gaze, long midnight blue hair scattered with tiny stars, a tall gold crown shaped like a constellation, a sweeping navy gown with a gold starry hem, open empty hands with a small glowing star orb floating above one palm, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, staff, shield, throne, scepter, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### starSeerQueen-1 予知の涙を流す女王（HP60%以下）
置き場所: src/assets/art/enemy/starSeerQueen-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\starSeerQueen-1.png`

```
full body creature illustration of one regal star seer queen with a calm far seeing gaze, long midnight blue hair scattered with tiny stars, a tall gold crown shaped like a constellation, a sweeping navy gown with a gold starry hem, open empty hands with a small glowing star orb floating above one palm, same star seer queen with glowing gold tear tracks of starlight, eyes shining white with foresight, the gown hem dissolving into falling stars, the star orb grown larger above her open hand, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, staff, shield, throne, scepter, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### starSeerQueen-2 流星群を呼ぶ女王（HP30%以下）
置き場所: src/assets/art/enemy/starSeerQueen-2.webp
元画像: `C:\dev\card-rpg-assets\enemy\starSeerQueen-2.png`

```
full body creature illustration of one regal star seer queen with a calm far seeing gaze, long midnight blue hair scattered with tiny stars, a tall gold crown shaped like a constellation, a sweeping navy gown with a gold starry hem, open empty hands with a small glowing star orb floating above one palm, same star seer queen fully overtaken by the stars, the constellation crown blazing, arms spread wide to call a meteor shower, streaks of gold meteors trailing around her silhouette, open empty hands, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep night navy and soft gold accents, white clouds and pale moonlight, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, staff, shield, throne, wings, extra figure, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## build_art.py の ENEMIES 表へ追記する行

番号はオーナーが画像を選んだ後で決める。`None` を実際の番号に置き換えてから転記する（ここではスクリプト本体を変更しない）。

```python
    'cloudSheep': (None, 1.0),  # 番号未定
    'skyGull': (None, 1.0),  # 番号未定
    'windSprite': (None, 1.0),  # 番号未定
    'clockworkSoldier': (None, 1.0),  # 番号未定
    'starJelly': (None, 1.0),  # 番号未定
    'gearBeetle': (None, 1.0),  # 番号未定
    'shootingStarBird': (None, 1.0),  # 番号未定
    'moonRabbit': (None, 1.0),  # 番号未定
    'angelStatue': (None, 1.0),  # 番号未定
    'starFragment': (None, 1.0),  # 番号未定
    'windGuardianHawk': (None, 1.0),  # 番号未定
    'windKeeper': (None, 1.0),  # 番号未定
    'windKeeper-1': (None, 1.0),  # 番号未定
    'starDustScribe': (None, 1.0),  # 番号未定
    'starLibrarian': (None, 1.0),  # 番号未定
    'starLibrarian-1': (None, 1.0),  # 番号未定
    'moonWolf': (None, 1.0),  # 番号未定
    'thornFairy': (None, 1.0),  # 番号未定
    'hourglassGolem': (None, 1.0),  # 番号未定
    'clockworkKnight': (None, 1.0),  # 番号未定
    'moonGardener': (None, 1.0),  # 番号未定
    'moonMaiden': (None, 1.0),  # 番号未定
    'moonMaiden-1': (None, 1.0),  # 番号未定
    'skyKnight': (None, 1.0),  # 番号未定
    'skyPaladin': (None, 1.0),  # 番号未定
    'starSeerQueen': (None, 1.0),  # 番号未定
    'starSeerQueen-1': (None, 1.0),  # 番号未定
    'starSeerQueen-2': (None, 1.0),  # 番号未定
```

## 亜種（画像不要）

- stormWindSprite → windSprite（storm）
- shadowMoonRabbit → moonRabbit（shadow）
- holyAngelStatue → angelStatue（holy）
- venomThornFairy → thornFairy（venom）
- shadowStarDustScribe → starDustScribe（shadow）
