# 砂塵の王朝：敵の絵の指示文

> Midjourney に貼る形（`docs/art/prompts-enemies-frozenKingdom-mj.md` と同じ書き方）。敵のデータは `src/content/scenarios/sandDynasty/enemies/` が正。

新規23体分。亜種5体（熾火の砂蠍・呪詛のミイラ・雷禿鷲・毒槍のジャッカル・呪詛の書記官の影）は元の絵を使い回す。ボスの変身5段階を含め、画像は計28枚。

参照: 今ゲームに入っている敵の絵（森の狼・樹木の番人など、細かく描き込んだ手描き風のファンタジー画）に合わせる。`docs/art/style-reference.png` は使わない。お手本は `--sref` で公開中の敵の絵2枚を指定。画面の「Style References」は空にする。
このシナリオの雰囲気: 金色の砂、褪せた赤土、古い青銅と包帯の白。ミイラは包帯と錆びた金の装飾。石像は砂岩の質感。
持たせない物は文の中に書かず、最後の `--no` にまとめた。白背景・1体のみ・左向きの3/4・全身。切り抜きは `scripts/art/build_art.py`。

### sandScarab 砂甲虫（砂塵の王朝・入口・通常・size 0.8）
置き場所: src/assets/art/enemy/sandScarab.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandScarab.png`

```
full body creature illustration of one small sand scarab beetle, domed golden brown shell with faint bronze sheen, six short sturdy legs, small horned head, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, humanoid limbs, weapon, shield, ball of dung, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### desertViper 砂漠の毒蛇（砂塵の王朝・入口・廃墟・通常・size 0.85）
置き場所: src/assets/art/enemy/desertViper.webp
元画像: `C:\dev\card-rpg-assets\enemy\desertViper.png`

```
full body creature illustration of one coiled desert viper, sandy tan scales with faded red diamond pattern, small horns above the eyes, mouth open showing two fangs dripping green venom, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, legs, wings, weapon, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### jackalWarrior ジャッカルの戦士（砂塵の王朝・廃墟・通常・size 1）
置き場所: src/assets/art/enemy/jackalWarrior.webp
元画像: `C:\dev\card-rpg-assets\enemy\jackalWarrior.png`

```
full body creature illustration of one lean jackal headed warrior standing upright, tall pointed ears, short linen kilt and bronze collar, exactly one long bronze spear held in both hands, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, shield, bow, sword, extra weapons, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### tombRobber 盗掘者の亡霊（砂塵の王朝・廃墟・通常・size 1）
置き場所: src/assets/art/enemy/tombRobber.webp
元画像: `C:\dev\card-rpg-assets\enemy\tombRobber.png`

```
full body creature illustration of one translucent ghost of a tomb robber, hooded ragged desert cloak, gaunt pale face, a small bulging sack of stolen gold coins in one hand, exactly one short curved dagger in the other hand, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, bow, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### sandScorpion 砂蠍（砂塵の王朝・廃墟・砂丘・通常・size 0.95）
置き場所: src/assets/art/enemy/sandScorpion.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandScorpion.png`

```
full body creature illustration of one large sand scorpion, golden tan segmented armor, two big pincers raised, long curled tail with a glistening stinger, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, humanoid limbs, weapon, rider, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### vulture 禿鷲（砂塵の王朝・砂丘・通常・size 0.9）
置き場所: src/assets/art/enemy/vulture.webp
元画像: `C:\dev\card-rpg-assets\enemy\vulture.png`

```
full body creature illustration of one gaunt desert vulture, bald wrinkled pink head, ragged dark brown wings half spread, hooked beak and sharp talons, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapon, perch, rider, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### mummy ミイラ（砂塵の王朝・砂丘・通常・size 1）
置き場所: src/assets/art/enemy/mummy.webp
元画像: `C:\dev\card-rpg-assets\enemy\mummy.png`

```
full body creature illustration of one shambling mummy wrapped in old off-white bandages, loose trailing strips, rusted gold collar and armbands, glowing pale eyes in the wrappings, empty clawed hands reaching forward, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapon, shield, sarcophagus, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### sandSprite 砂の精（砂塵の王朝・砂丘・通常・size 0.8）
置き場所: src/assets/art/enemy/sandSprite.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandSprite.png`

```
full body creature illustration of one tiny hovering sand sprite, body made of swirling golden sand grains, mischievous glowing eyes, small trailing whirl of sand instead of legs, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, staff, weapon, wings, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### dustDevil 砂旋風（砂塵の王朝・砂丘・通常・size 0.95）
置き場所: src/assets/art/enemy/dustDevil.webp
元画像: `C:\dev\card-rpg-assets\enemy\dustDevil.png`

```
full body creature illustration of one small living dust devil, tall spinning funnel of golden sand and dust, a pair of angry glowing eyes in the middle of the whirl, a few pebbles caught in the spin, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, humanoid body, weapon, rider, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### sandWorm 砂虫（砂塵の王朝・谷・通常・size 1.1）
置き場所: src/assets/art/enemy/sandWorm.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandWorm.png`

```
full body creature illustration of one huge sand worm rising from the ground in an S curve, ringed segmented tan hide, round mouth full of circular rows of teeth, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, legs, rider, weapon, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### clayGolem 土人形（砂塵の王朝・谷・通常・size 1.05）
置き場所: src/assets/art/enemy/clayGolem.webp
元画像: `C:\dev\card-rpg-assets\enemy\clayGolem.png`

```
full body creature illustration of one stout clay golem, cracked faded red clay body, crude carved face with two glowing slits, thick heavy fists, simple painted glyphs on the chest, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapon, shield, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### mummyArcher ミイラの弓兵（砂塵の王朝・谷・通常・size 1）
置き場所: src/assets/art/enemy/mummyArcher.webp
元画像: `C:\dev\card-rpg-assets\enemy\mummyArcher.png`

```
full body creature illustration of one mummy archer wrapped in old off-white bandages, rusted gold bracers, exactly one short recurve bow held ready with one arrow nocked, a small quiver on the back, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, spear, extra weapons, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### cursedPriest 呪われた神官（砂塵の王朝・谷・王宮前・通常・size 1）
置き場所: src/assets/art/enemy/cursedPriest.webp
元画像: `C:\dev\card-rpg-assets\enemy\cursedPriest.png`

```
full body creature illustration of one cursed temple priest, gaunt grey skin, faded red and gold robes with a tall headdress, dark purple curse smoke around his hands, exactly one short bronze ankh staff, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, bow, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### stoneCat 石の猫像（砂塵の王朝・王宮前・通常・size 0.95）
置き場所: src/assets/art/enemy/stoneCat.webp
元画像: `C:\dev\card-rpg-assets\enemy\stoneCat.png`

```
full body creature illustration of one animated sandstone cat statue, sleek seated temple cat shape, carved sandstone texture with fine cracks, gold earring and gold collar, glowing amber eyes, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapon, shield, rider, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### royalGuardMummy 王家の衛兵ミイラ（砂塵の王朝・砂丘・蠍の墓所・エリート・size 1.2）
置き場所: src/assets/art/enemy/royalGuardMummy.webp
元画像: `C:\dev\card-rpg-assets\enemy\royalGuardMummy.png`

```
full body creature illustration of one tall royal guard mummy, off-white bandages under rusted gold and lapis armor plates, striped royal headcloth, exactly one large bronze tower shield and one short khopesh sword, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, bow, spear, extra weapons, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### scribeShade 書記官の影（砂塵の王朝・砂丘・影の書庫・エリート・size 1.2）
置き場所: src/assets/art/enemy/scribeShade.webp
元画像: `C:\dev\card-rpg-assets\enemy\scribeShade.png`

```
full body creature illustration of one floating shade of an ancient royal scribe, smoky dark body with a pale mask like face, faded linen robe, exactly one papyrus scroll unrolled in its hands, glowing ink glyphs around it, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, staff, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### sphinxCub スフィンクスの子（砂塵の王朝・谷・エリート・size 1.2）
置き場所: src/assets/art/enemy/sphinxCub.webp
元画像: `C:\dev\card-rpg-assets\enemy\sphinxCub.png`

```
full body creature illustration of one young sphinx cub, lion body with golden fur and small feathered wings, a calm wise childlike human face, striped royal headcloth, sitting with a riddling expression, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, weapon, crown, rider, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### sandSerpentLord 砂の大蛇（砂塵の王朝・谷・石像の神殿・エリート・size 1.2）
置き場所: src/assets/art/enemy/sandSerpentLord.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandSerpentLord.png`

```
full body creature illustration of one giant sand serpent lord, thick coiled body with golden and faded red bands, cobra hood spread wide, glittering bronze scales on the hood, venom on the fangs, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, legs, crown, rider, weapon, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### colossusStatue 石像の巨兵（砂塵の王朝・王宮前・砂塵の王宮・エリート・size 1.2）
置き場所: src/assets/art/enemy/colossusStatue.webp
元画像: `C:\dev\card-rpg-assets\enemy\colossusStatue.png`

```
full body creature illustration of one huge animated sandstone colossus statue of a pharaoh guard, weathered carved sandstone with cracks, faded painted details, exactly one massive stone shield on one arm, other fist clenched, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, spear, bow, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### sandScorpionKing 砂蠍王（砂塵の王朝・蠍の墓所・ボス・size 1.4）
置き場所: src/assets/art/enemy/sandScorpionKing.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandScorpionKing.png`

```
full body creature illustration of one enormous scorpion king, heavy golden brown armor plates with bronze edges, two massive pincers, long tail with a huge dripping stinger, a crown shaped crest of spikes on its head, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, humanoid limbs, carried weapon, rider, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### sandScorpionKing-1 毒を撒く蠍王（HP50%以下）
置き場所: src/assets/art/enemy/sandScorpionKing-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandScorpionKing-1.png`

```
full body creature illustration of one enormous scorpion king, heavy golden brown armor plates with bronze edges, two massive pincers, long tail with a huge dripping stinger, a crown shaped crest of spikes on its head, same scorpion king, cracked armor oozing green venom, tail raised high spraying a mist of poison, pincers spread wide, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, humanoid limbs, carried weapon, rider, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### shadowVizier 影の宰相（砂塵の王朝・影の書庫・ボス・size 1.5）
置き場所: src/assets/art/enemy/shadowVizier.webp
元画像: `C:\dev\card-rpg-assets\enemy\shadowVizier.png`

```
full body creature illustration of one tall sinister shadow vizier, thin dark figure in long faded red and gold court robes, high collar and tall headdress, pale mask like face with glowing eyes, exactly one serpent headed bronze staff, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, bow, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### shadowVizier-1 影を分ける宰相（HP50%以下）
置き場所: src/assets/art/enemy/shadowVizier-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\shadowVizier-1.png`

```
full body creature illustration of one tall sinister shadow vizier, thin dark figure in long faded red and gold court robes, high collar and tall headdress, pale mask like face with glowing eyes, exactly one serpent headed bronze staff, same vizier, body splitting into dark shadow silhouettes around him like a protective wall, robes dissolving into smoke, same staff, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, bow, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### stoneGuardianBeast 砂の守護獣（砂塵の王朝・石像の神殿・ボス・size 1.6）
置き場所: src/assets/art/enemy/stoneGuardianBeast.webp
元画像: `C:\dev\card-rpg-assets\enemy\stoneGuardianBeast.png`

```
full body creature illustration of one massive guardian beast statue, lion like sandstone body with a jackal head, carved sandstone texture with cracks and faded paint, heavy paws, glowing amber eyes, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, carried weapon, rider, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### stoneGuardianBeast-1 咆哮する守護獣（HP50%以下）
置き場所: src/assets/art/enemy/stoneGuardianBeast-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\stoneGuardianBeast-1.png`

```
full body creature illustration of one massive guardian beast statue, lion like sandstone body with a jackal head, carved sandstone texture with cracks and faded paint, heavy paws, glowing amber eyes, same guardian beast, mouth wide open in a roar, sandstone shell cracking with glowing amber light inside, rearing up on hind legs, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, carried weapon, rider, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### sandPharaoh 砂塵の王（砂塵の王朝・砂塵の王宮・ボス・size 1.6）
置き場所: src/assets/art/enemy/sandPharaoh.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandPharaoh.png`

```
full body creature illustration of one imposing undead pharaoh, tall regal figure wrapped in aged bandages under gold and lapis royal regalia, striped royal headcloth with a cobra crest, a weary noble face, exactly one crook scepter in one hand, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, bow, throne, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### sandPharaoh-1 民のために永遠を求めた王（HP60%以下）
置き場所: src/assets/art/enemy/sandPharaoh-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandPharaoh-1.png`

```
full body creature illustration of one imposing undead pharaoh, tall regal figure wrapped in aged bandages under gold and lapis royal regalia, striped royal headcloth with a cobra crest, a weary noble face, exactly one crook scepter in one hand, same pharaoh, bandages loosening, gold regalia tarnished, sand pouring from cracks in his body, sorrowful determined face, same crook scepter, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, bow, throne, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### sandPharaoh-2 砂嵐に呑まれた王（HP30%以下）
置き場所: src/assets/art/enemy/sandPharaoh-2.webp
元画像: `C:\dev\card-rpg-assets\enemy\sandPharaoh-2.png`

```
full body creature illustration of one imposing undead pharaoh, tall regal figure wrapped in aged bandages under gold and lapis royal regalia, striped royal headcloth with a cobra crest, a weary noble face, exactly one crook scepter in one hand, same pharaoh almost turned into a living sandstorm, lower body dissolving into swirling golden sand, face still recognizable, arms spread for a final sandstorm, same crook scepter, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with warm golden sand, faded red clay, aged bronze and bandage white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no blood, red stains, dark background, black background, sword, shield, bow, throne, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## build_art.py の ENEMIES 表へ追記する行

番号はオーナーが画像を選んだ後で決める。`None` を実際の番号に置き換えてから転記する（ここではスクリプト本体を変更しない）。

```python
    'sandScarab': (None, 1.0),  # 番号未定
    'desertViper': (None, 1.0),  # 番号未定
    'jackalWarrior': (None, 1.0),  # 番号未定
    'tombRobber': (None, 1.0),  # 番号未定
    'sandScorpion': (None, 1.0),  # 番号未定
    'vulture': (None, 1.0),  # 番号未定
    'mummy': (None, 1.0),  # 番号未定
    'sandSprite': (None, 1.0),  # 番号未定
    'dustDevil': (None, 1.0),  # 番号未定
    'sandWorm': (None, 1.0),  # 番号未定
    'clayGolem': (None, 1.0),  # 番号未定
    'mummyArcher': (None, 1.0),  # 番号未定
    'cursedPriest': (None, 1.0),  # 番号未定
    'stoneCat': (None, 1.0),  # 番号未定
    'royalGuardMummy': (None, 1.0),  # 番号未定
    'scribeShade': (None, 1.0),  # 番号未定
    'sphinxCub': (None, 1.0),  # 番号未定
    'sandSerpentLord': (None, 1.0),  # 番号未定
    'colossusStatue': (None, 1.0),  # 番号未定
    'sandScorpionKing': (None, 1.0),  # 番号未定
    'sandScorpionKing-1': (None, 1.0),  # 番号未定
    'shadowVizier': (None, 1.0),  # 番号未定
    'shadowVizier-1': (None, 1.0),  # 番号未定
    'stoneGuardianBeast': (None, 1.0),  # 番号未定
    'stoneGuardianBeast-1': (None, 1.0),  # 番号未定
    'sandPharaoh': (None, 1.0),  # 番号未定
    'sandPharaoh-1': (None, 1.0),  # 番号未定
    'sandPharaoh-2': (None, 1.0),  # 番号未定
```
