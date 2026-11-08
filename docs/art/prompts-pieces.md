# ワールドマップの駒（ミニチュア）の Midjourney 指示文

第2段階で、世界マップのキャラを「チェスの駒のようなミニチュア」にした。台座とプレイヤーの色の輪はゲームが描く。
この文書は、台座の上に立つ**ミニチュアの絵**を Midjourney で作るための指示文。

- 見本: `docs/art/reference/gemini-mock-dungeon-and-piece.jpg` の右上「ルーシア（魔道士）」（オーナーのイメージに近い）
- 置き場所: `src/assets/art/piece/<職業ID>-<male|female>.webp`（置くだけで台座の上に立つ。無い職は顔のメダルの仮の見た目）
- 試しの2枚（剣士の男・魔道士の女）は合格（2026-11-08）。残りの86枚は下の「残りの86枚」。

## 共通の決まり

- ちびキャラ（2〜2.5頭身）の**色を塗った樹脂フィギュア**。顔と持ち物が大きめで、小さくても職が分かる。
- **台座は描かない**（2026-11-08 オーナー決定）。金色の台座とプレイヤーの色の輪はゲームが描くので、絵はキャラだけ。足の裏が絵の一番下になるようにする。`--no` に pedestal・base・stand を入れてある。
- 全身・やや斜め前（3/4）・**白い無地の背景**（切り抜きやすくするため）・柔らかい照明。縦長 `--ar 3:4`。
- **持たせる武器はゲームの最初の武器と同じ**にする。持たせない物（盾・2本目の武器・別の種類の武器）は、最後の `--no` の後ろにまとめる（文の中に「no shield」と書くと、かえって描かれることがあるため。立ち絵と同じ決まり）。
- `--sref` は付けない（立ち絵を参照すると、ちびキャラではなくリアルな作風になるため）。画面の「Style References」も空にする。
- 服の色は、今の立ち絵（`src/assets/art/hero/<職>-<性別>.webp`）に合わせる。

## 試しの2枚

### 1. 剣士・男（レオン）`piece/warrior-male`
- 最初の装備: 銅の剣（片手剣）・皮の鎧
- 立ち絵の特徴: 赤茶の髪、赤いマント・赤い布、銀の鎧に赤の飾り

```
chibi tabletop miniature figurine of a young male swordsman, short reddish-brown hair, silver plate armor with red trim, flowing red cape and red scarf, holding only one plain copper one-handed sword in his right hand pointed down, his left hand empty and open, confident gentle expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, dual wielding, two swords, second weapon, second sword, sheathed sword, scabbard, bow, arrows, quiver, spear, signature, text, watermark, scenery
```

### 2. 魔道士・女（ルーシア）`piece/mage-female`
- 最初の装備: 樫の杖（先に小さな紫の宝玉）・旅人の服
- 立ち絵の特徴: 黒髪のショート、つばの広いとんがり帽子、紫と淡いピンクのローブ

```
chibi tabletop miniature figurine of a young female mage, short dark hair, wide-brimmed pointed witch hat, layered purple and dusty pink robes with gold embroidery, holding a tall gnarled oak wooden staff topped with a small violet crystal in one hand, calm kind expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, shield, book, second weapon, bow, arrows, quiver, spear, signature, text, watermark, scenery
```

## できた絵の渡し方（オーナー → Claude）

1. Midjourney で4枚出た中から、一番良い1枚を選んで拡大（Upscale）する。
2. 元の画像を `warrior-male.png`・`mage-female.png` のような名前で渡す。
3. Claude が背景を切り抜き（`scripts/art/build_art.py` に駒の表を足す）、`src/assets/art/piece/` に置いて、盤の上での見え方を確かめる。
4. 見え方に合わせて指示文を直してから、残りの職をまとめて作る（J4の指示文の一覧に入れる）。

## 試しの結果（2026-11-08）
- 1回目: 剣士・男、魔道士・女とも、立ち絵と同じ服・武器のかわいいミニチュアになった（`C:\dev\card-rpg-assets\j4\piece-trial1\`）。ただし金の台座まで描かれ、ゲームの台座と2重になるため、**台座なし**に変えて作り直す。
- 2回目: 魔道士・女は台座なしで**合格**（`C:\dev\card-rpg-assets\j4\piece\mage-female.webp`）。剣士・男は白い薄い円盤の台が残り、剣も2本（手と腰）になった → 「足が白い背景に直接つく」を足し、`--no` に円盤・2本目の剣・鞘を追加。
- 3回目: 剣士・男は台が消えて合格に近いが、両手に1本ずつ剣を持った → 「右手に1本だけ・左手は空」にし、`--no` に二刀流・2本の剣（立ち絵の短剣・本と同じ直し方）。
- 4回目: 剣士・男は台なし・剣1本で**合格**（`C:\dev\card-rpg-assets\j4\piece\warrior-male.webp`）。

## 残りの86枚（2026-11-08 作成）

試しで決まった形: 台座なし・足が背景に直接つく・片手で持つ武器は「もう片方の手は空」・`--no` に円盤・二刀流・サイン。
服と武器は立ち絵（`prompts-jobs-pets.md`）と同じ。基本4職は、今ゲームに入っている立ち絵を見て書いた。
元画像は `C:\dev\card-rpg-assets\j4\piece\<職ID>-<male|female>.(png|webp)` に置く（試しの2枚と同じ場所）。

### 基本8職（残り6枚）

#### 剣士・女（`piece/warrior-female`）→ 元画像 `piece/warrior-female.png`
- 持たせる物: 銅の剣1本　／　見た目: 銀の胸当て・赤いマントと赤い刺繍のスカート

```
chibi tabletop miniature figurine of a young female swordswoman, short dark brown bob hair, silver breastplate, red cape and a red embroidered skirt over cream trousers, holding only one plain copper one-handed sword in one hand, the other hand empty and open, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, bow, arrows, quiver, spear, dual wielding, two swords, second sword, sheathed sword, scabbard, second weapon, signature, text, watermark, scenery
```

#### 守護者・男（`piece/guardian-male`）→ 元画像 `piece/guardian-male.png`
- 持たせる物: 鉄の槍　／　見た目: 青い鋼の鎧・クリーム色の前垂れ・大きな丸い木の盾

```
chibi tabletop miniature figurine of a young male guardian knight, short black hair, blue steel plate armor with a cream tabard, a large round brown wooden shield on the other arm, holding a long spear with a clearly visible leaf-shaped iron spearhead on a long wooden shaft, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, axe, bow, arrows, second spear, second weapon, signature, text, watermark, scenery
```

#### 守護者・女（`piece/guardian-female`）→ 元画像 `piece/guardian-female.png`
- 持たせる物: 鉄の槍　／　見た目: 銀と青の鎧・青いスカート・大きな丸い赤い盾

```
chibi tabletop miniature figurine of a young female guardian knight, long wavy light blue hair, silver and blue armor with a blue skirt and armored boots, a large round red shield on the other arm, holding a long spear with a clearly visible leaf-shaped iron spearhead on a long wooden shaft, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, axe, bow, arrows, second spear, second weapon, signature, text, watermark, scenery
```

#### 狩人・男（`piece/hunter-male`）→ 元画像 `piece/hunter-male.png`
- 持たせる物: 狩人の弓　／　見た目: 緑のフード付きの長いマント・赤茶の服・背中に矢筒

```
chibi tabletop miniature figurine of a young male hunter, short silver-gray hair, long green hooded cloak over a reddish-brown outfit with a red sash, quiver of arrows on the back, holding a simple wooden longbow in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, dagger in hand, shield, spear, second bow, slingshot, stick in hand, second weapon, signature, text, watermark, scenery
```

#### 狩人・女（`piece/hunter-female`）→ 元画像 `piece/hunter-female.png`
- 持たせる物: 狩人の弓　／　見た目: 緑のフードとマント・緑の短い上着・背中に矢筒

```
chibi tabletop miniature figurine of a young female hunter, short brown hair under a green hood, green hooded cloak and short green tunic with a red sash, quiver of arrows on the back, holding a simple wooden longbow in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, dagger in hand, shield, spear, second bow, slingshot, stick in hand, second weapon, signature, text, watermark, scenery
```

#### 魔道士・男（`piece/mage-male`）→ 元画像 `piece/mage-male.png`
- 持たせる物: 樫の杖（先に紫の宝玉）　／　見た目: 星の付いたくすんだピンクのとんがり帽子・ピンクと紫のローブ

```
chibi tabletop miniature figurine of a young male mage, short brown hair, wide-brimmed pointed dusty pink hat with a gold star, layered dusty pink and purple robes, holding a tall gnarled oak wooden staff topped with a small violet crystal in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, shield, book, bow, arrows, quiver, spear, second staff, wand, second weapon, signature, text, watermark, scenery
```

#### 武闘家・男（`piece/monk-male`）→ 元画像 `piece/monk-male.png`
- 持たせる物: 布の手甲（素手）　／　見た目: 橙の道着・黒い帯・素手

```
chibi tabletop miniature figurine of a young male martial artist, short spiky black hair, orange sleeveless martial arts gi with a dark sash, bandaged forearms, cloth shoes, both fists wrapped in worn cloth hand wraps, bare hands, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, staff, pole, claws, metal gauntlets, shield, bow, arrows, quiver, weapon in hand, second weapon, signature, text, watermark, scenery
```

#### 武闘家・女（`piece/monk-female`）→ 元画像 `piece/monk-female.png`
- 持たせる物: 布の手甲（素手）　／　見た目: 橙の道着・黒い帯・素手

```
chibi tabletop miniature figurine of a young female martial artist, black hair in two round buns, orange sleeveless martial arts gi with a dark sash, bandaged forearms, cloth shoes, both fists wrapped in worn cloth hand wraps, bare hands, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, staff, pole, claws, metal gauntlets, shield, bow, arrows, quiver, weapon in hand, second weapon, signature, text, watermark, scenery
```

#### 盗賊・男（`piece/thief-male`）→ 元画像 `piece/thief-male.png`
- 持たせる物: 古びた短剣1本　／　見た目: ミント色のフード付き短いマント・革のベスト

```
chibi tabletop miniature figurine of a young male nimble thief, messy brown hair, mint green hooded short cloak, fitted leather vest, belts with small pouches, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, second dagger, sword, bow, shield, arrows, quiver, dual wielding, two daggers, second weapon, signature, text, watermark, scenery
```

#### 盗賊・女（`piece/thief-female`）→ 元画像 `piece/thief-female.png`
- 持たせる物: 古びた短剣1本　／　見た目: ミント色のフード付き短いマント・革のベスト

```
chibi tabletop miniature figurine of a young female nimble thief, short ash-blonde bob hair, mint green hooded short cloak, fitted leather vest, belts with small pouches, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, second dagger, sword, bow, shield, arrows, quiver, dual wielding, two daggers, second weapon, signature, text, watermark, scenery
```

#### 僧侶・男（`piece/priest-male`）→ 元画像 `piece/priest-male.png`
- 持たせる物: 木の錫杖（鈴と輪）　／　見た目: 白と淡い金の法衣・鈴の付いた錫杖

```
chibi tabletop miniature figurine of a young male gentle priest healer, neat light brown hair, white and pale gold clergy robe with a simple stole, small holy symbol pendant, holding a wooden ringed prayer staff (shakujo) with small brass rings and bells at the top in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, hammer, mace, book, shield, bow, arrows, quiver, crystal staff, second staff, second weapon, signature, text, watermark, scenery
```

#### 僧侶・女（`piece/priest-female`）→ 元画像 `piece/priest-female.png`
- 持たせる物: 木の錫杖（鈴と輪）　／　見た目: 白と淡い金の法衣・鈴の付いた錫杖

```
chibi tabletop miniature figurine of a young female gentle priest healer, long wavy blonde hair under a short white veil, white and pale gold clergy robe with a simple stole, small holy symbol pendant, holding a wooden ringed prayer staff (shakujo) with small brass rings and bells at the top in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, hammer, mace, book, shield, bow, arrows, quiver, crystal staff, second staff, second weapon, signature, text, watermark, scenery
```

#### 召喚士・男（`piece/summoner-male`）→ 元画像 `piece/summoner-male.png`
- 持たせる物: 魔導書1冊　／　見た目: 紫のフード付きローブ・光る紋様

```
chibi tabletop miniature figurine of a young male young summoner, silver-lilac hair, violet hooded robe with faintly glowing summoning sigils on the hem, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, wand, sword, shield, creatures, animals, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

#### 召喚士・女（`piece/summoner-female`）→ 元画像 `piece/summoner-female.png`
- 持たせる物: 魔導書1冊　／　見た目: 紫のフード付きローブ・光る紋様

```
chibi tabletop miniature figurine of a young female young summoner, long lavender hair, violet hooded robe with faintly glowing summoning sigils on the hem, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, wand, sword, shield, creatures, animals, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

### 中位13職（26枚）

#### 剣豪・男（`piece/swordmaster-male`）→ 元画像 `piece/swordmaster-male.png`
- 持たせる物: 銅の剣1本　／　見た目: 赤い長いコート＋軽い革鎧・落ち着いた構え

```
chibi tabletop miniature figurine of a young male seasoned swordmaster, long dark red hair tied back, long crimson coat over light leather armor, red hair tie, calm focused stance, holding only one plain copper one-handed sword in one hand, the other hand empty and open, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, katana, second sword, bow, arrows, quiver, dual wielding, two swords, sheathed sword, scabbard, second weapon, signature, text, watermark, scenery
```

#### 剣豪・女（`piece/swordmaster-female`）→ 元画像 `piece/swordmaster-female.png`
- 持たせる物: 銅の剣1本　／　見た目: 赤い長いコート＋軽い革鎧・落ち着いた構え

```
chibi tabletop miniature figurine of a young female seasoned swordmaster, high ponytail of crimson hair, long crimson coat over light leather armor, red hair tie, calm focused stance, holding only one plain copper one-handed sword in one hand, the other hand empty and open, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, katana, second sword, bow, arrows, quiver, dual wielding, two swords, sheathed sword, scabbard, second weapon, signature, text, watermark, scenery
```

#### 狂戦士・男（`piece/berserker-male`）→ 元画像 `piece/berserker-male.png`
- 持たせる物: 木こりの斧　／　見た目: 毛皮つきの革鎧・赤い戦化粧・両手で斧

```
chibi tabletop miniature figurine of a young male wild berserker warrior, wild crimson mane of hair, fur-trimmed leather armor with dark red cloth, muscular, battle scars, tribal war paint, holding a heavy thick-bladed woodcutter's axe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, sword, bow, arrows, quiver, second axe, second weapon, signature, text, watermark, scenery
```

#### 狂戦士・女（`piece/berserker-female`）→ 元画像 `piece/berserker-female.png`
- 持たせる物: 木こりの斧　／　見た目: 毛皮つきの革鎧・赤い戦化粧・両手で斧

```
chibi tabletop miniature figurine of a young female wild berserker warrior, wild long red hair with small braids, fur-trimmed leather armor with dark red cloth, muscular, battle scars, tribal war paint, holding a heavy thick-bladed woodcutter's axe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, sword, bow, arrows, quiver, second axe, second weapon, signature, text, watermark, scenery
```

#### 闘士・男（`piece/brawler-male`）→ 元画像 `piece/brawler-male.png`
- 持たせる物: 布の手甲（素手）　／　見た目: 橙のベスト・赤い鉢巻・拳を構える

```
chibi tabletop miniature figurine of a young male street-fighting brawler, short black hair, open orange vest, wide dark trousers, red headband, fighting stance with raised fists, both fists wrapped in worn cloth hand wraps, bare hands, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, weapon in hand, second weapon, signature, text, watermark, scenery
```

#### 闘士・女（`piece/brawler-female`）→ 元画像 `piece/brawler-female.png`
- 持たせる物: 布の手甲（素手）　／　見た目: 橙のベスト・赤い鉢巻・拳を構える

```
chibi tabletop miniature figurine of a young female street-fighting brawler, short brown hair, fitted orange sleeveless martial jacket closed at the front, wide dark trousers, red headband, fighting stance with raised fists, both fists wrapped in worn cloth hand wraps, bare hands, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, weapon in hand, second weapon, signature, text, watermark, scenery
```

#### 大魔導士・男（`piece/archmage-male`）→ 元画像 `piece/archmage-male.png`
- 持たせる物: 樫の杖（先に紫の宝玉）　／　見た目: 濃い青紫の重ねたローブ・金の星の刺繍

```
chibi tabletop miniature figurine of a young male powerful archmage, long silver hair, layered deep violet robes with gold star embroidery and a tall high collar, holding a tall gnarled oak wooden staff topped with a small violet crystal in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, book, shield, wand, bow, arrows, quiver, second staff, second weapon, signature, text, watermark, scenery
```

#### 大魔導士・女（`piece/archmage-female`）→ 元画像 `piece/archmage-female.png`
- 持たせる物: 樫の杖（先に紫の宝玉）　／　見た目: 濃い青紫の重ねたローブ・金の星の刺繍

```
chibi tabletop miniature figurine of a young female powerful archmage, long dark blue hair with an ornate circlet, layered deep violet robes with gold star embroidery and a tall high collar, holding a tall gnarled oak wooden staff topped with a small violet crystal in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, book, shield, wand, bow, arrows, quiver, second staff, second weapon, signature, text, watermark, scenery
```

#### 呪術師・男（`piece/hexer-male`）→ 元画像 `piece/hexer-male.png`
- 持たせる物: 錆びた大鎌　／　見た目: すそのほつれた紫のローブ・骨の飾り

```
chibi tabletop miniature figurine of a young male sinister hexer, black hair falling over one eye, tattered dark purple hooded robe with small bone and skull charms, pale skin, holding a large rusty scythe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, staff, sword, shield, bow, arrows, quiver, second scythe, second weapon, signature, text, watermark, scenery
```

#### 呪術師・女（`piece/hexer-female`）→ 元画像 `piece/hexer-female.png`
- 持たせる物: 錆びた大鎌　／　見た目: すそのほつれた紫のローブ・骨の飾り

```
chibi tabletop miniature figurine of a young female sinister hexer, long straight black hair, tattered dark purple hooded robe with small bone and skull charms, pale skin, holding a large rusty scythe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, staff, sword, shield, bow, arrows, quiver, second scythe, second weapon, signature, text, watermark, scenery
```

#### 幻獣使い・男（`piece/phantomTamer-male`）→ 元画像 `piece/phantomTamer-male.png`
- 持たせる物: 魔導書1冊　／　見た目: 紫と白のローブ・羽根の短いマント

```
chibi tabletop miniature figurine of a young male phantom beast tamer, teal-silver hair, violet and white robe with a feathered short cape and crystal ornaments, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, sword, shield, creatures, animals, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

#### 幻獣使い・女（`piece/phantomTamer-female`）→ 元画像 `piece/phantomTamer-female.png`
- 持たせる物: 魔導書1冊　／　見た目: 紫と白のローブ・羽根の短いマント

```
chibi tabletop miniature figurine of a young female phantom beast tamer, long white hair with lavender tips, violet and white robe with a feathered short cape and crystal ornaments, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, sword, shield, creatures, animals, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

#### 聖騎士・男（`piece/paladin-male`）→ 元画像 `piece/paladin-male.png`
- 持たせる物: 樫の槌　／　見た目: 白と金の鎧・青い陣羽織・丸い盾（提案F: 盾あり）

```
chibi tabletop miniature figurine of a young male holy paladin knight, short blond hair, white and gold plate armor over leather, blue tabard with a sun emblem, a round knight shield on the other arm, holding a sturdy plain oak wooden war hammer in one hand, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, spear, second weapon, bow, arrows, quiver, second hammer, signature, text, watermark, scenery
```

#### 聖騎士・女（`piece/paladin-female`）→ 元画像 `piece/paladin-female.png`
- 持たせる物: 樫の槌　／　見た目: 白と金の鎧・青い陣羽織・丸い盾（提案F: 盾あり）

```
chibi tabletop miniature figurine of a young female holy paladin knight, long golden braided hair, white and gold plate armor over leather, blue tabard with a sun emblem, a round knight shield on the other arm, holding a sturdy plain oak wooden war hammer in one hand, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, spear, second weapon, bow, arrows, quiver, second hammer, signature, text, watermark, scenery
```

#### 槍騎士・男（`piece/lancer-male`）→ 元画像 `piece/lancer-male.png`
- 持たせる物: 鉄の槍　／　見た目: 青と鋼の半鎧・短い青いマント

```
chibi tabletop miniature figurine of a young male lance knight, short dark blue hair, blue and steel half-plate armor over leather, short blue cape, winged ornaments, holding a long spear with a clearly visible leaf-shaped iron spearhead on a long wooden shaft, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, sword, bow, arrows, quiver, second spear, second weapon, signature, text, watermark, scenery
```

#### 槍騎士・女（`piece/lancer-female`）→ 元画像 `piece/lancer-female.png`
- 持たせる物: 鉄の槍　／　見た目: 青と鋼の半鎧・短い青いマント

```
chibi tabletop miniature figurine of a young female lance knight, long blue hair with a winged hair ornament, blue and steel half-plate armor over leather, short blue cape, winged ornaments, holding a long spear with a clearly visible leaf-shaped iron spearhead on a long wooden shaft, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, sword, bow, arrows, quiver, second spear, second weapon, signature, text, watermark, scenery
```

#### 司祭・男（`piece/bishop-male`）→ 元画像 `piece/bishop-male.png`
- 持たせる物: 木の錫杖（鈴と輪）　／　見た目: 白と金の重ねた祭服・刺繍の襟帯

```
chibi tabletop miniature figurine of a young male high priest bishop, short brown hair, layered white and gold vestments with an embroidered stole, holding a wooden ringed prayer staff (shakujo) with small brass rings and bells at the top in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, sword, hammer, shield, bow, arrows, quiver, crystal staff, second staff, second weapon, signature, text, watermark, scenery
```

#### 司祭・女（`piece/bishop-female`）→ 元画像 `piece/bishop-female.png`
- 持たせる物: 木の錫杖（鈴と輪）　／　見た目: 白と金の重ねた祭服・刺繍の襟帯

```
chibi tabletop miniature figurine of a young female high priest bishop, long silver-blonde hair under a white veil with gold trim, layered white and gold vestments with an embroidered stole, holding a wooden ringed prayer staff (shakujo) with small brass rings and bells at the top in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, sword, hammer, shield, bow, arrows, quiver, crystal staff, second staff, second weapon, signature, text, watermark, scenery
```

#### 弓術士・男（`piece/archer-male`）→ 元画像 `piece/archer-male.png`
- 持たせる物: 狩人の弓　／　見た目: 緑の上着・革の腕当て・背中に矢筒

```
chibi tabletop miniature figurine of a young male skilled archer, short blond hair, fitted forest green tunic, leather bracers, quiver of arrows on the back, holding a simple wooden longbow in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, dagger in hand, shield, second bow, second weapon, signature, text, watermark, scenery
```

#### 弓術士・女（`piece/archer-female`）→ 元画像 `piece/archer-female.png`
- 持たせる物: 狩人の弓　／　見た目: 緑の上着・革の腕当て・背中に矢筒

```
chibi tabletop miniature figurine of a young female skilled archer, long light blonde hair in a side braid, fitted forest green tunic, leather bracers, quiver of arrows on the back, holding a simple wooden longbow in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, dagger in hand, shield, second bow, second weapon, signature, text, watermark, scenery
```

#### 獣使い・男（`piece/tamer-male`）→ 元画像 `piece/tamer-male.png`
- 持たせる物: 革の鞭　／　見た目: 毛皮の襟の黄緑のベスト・牙の首飾り

```
chibi tabletop miniature figurine of a young male beast tamer, messy brown hair, fur-collared leaf green vest, rugged trousers and boots, fang necklace, holding a coiled leather whip in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, animals, creatures, sword, bow, shield, arrows, quiver, second whip, second weapon, signature, text, watermark, scenery
```

#### 獣使い・女（`piece/tamer-female`）→ 元画像 `piece/tamer-female.png`
- 持たせる物: 革の鞭　／　見た目: 毛皮の襟の黄緑のベスト・牙の首飾り

```
chibi tabletop miniature figurine of a young female beast tamer, short orange-brown hair with a fur hood, fur-collared leaf green vest, rugged trousers and boots, fang necklace, holding a coiled leather whip in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, animals, creatures, sword, bow, shield, arrows, quiver, second whip, second weapon, signature, text, watermark, scenery
```

#### 隠密・男（`piece/shadow-male`）→ 元画像 `piece/shadow-male.png`
- 持たせる物: 古びた短剣1本　／　見た目: 紺のフード付きの忍び装束・逆手に短剣

```
chibi tabletop miniature figurine of a young male stealthy shadow agent, black hair, dark slate blue fitted hooded garb, face visible, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, katana, second dagger, shuriken, shield, bow, arrows, quiver, dual wielding, two daggers, second weapon, signature, text, watermark, scenery
```

#### 隠密・女（`piece/shadow-female`）→ 元画像 `piece/shadow-female.png`
- 持たせる物: 古びた短剣1本　／　見た目: 紺のフード付きの忍び装束・逆手に短剣

```
chibi tabletop miniature figurine of a young female stealthy shadow agent, black hair in a low ponytail, dark slate blue fitted hooded garb, face visible, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, katana, second dagger, shuriken, shield, bow, arrows, quiver, dual wielding, two daggers, second weapon, signature, text, watermark, scenery
```

#### 怪盗・男（`piece/phantomThief-male`）→ 元画像 `piece/phantomThief-male.png`
- 持たせる物: 古びた短剣1本　／　見た目: 金の縁取りの黒い燕尾服・小さなシルクハット

```
chibi tabletop miniature figurine of a young male elegant phantom thief, neat dark hair, black tailcoat with gold trim, short cape, white gloves, small top hat, monocle, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, gun, sword, shield, bow, arrows, quiver, dual wielding, two daggers, second dagger, second weapon, signature, text, watermark, scenery
```

#### 怪盗・女（`piece/phantomThief-female`）→ 元画像 `piece/phantomThief-female.png`
- 持たせる物: 古びた短剣1本　／　見た目: 金の縁取りの黒い燕尾服・小さなシルクハット

```
chibi tabletop miniature figurine of a young female elegant phantom thief, black bob hair, black tailcoat with gold trim, short cape, white gloves, small top hat, monocle, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, gun, sword, shield, bow, arrows, quiver, dual wielding, two daggers, second dagger, second weapon, signature, text, watermark, scenery
```

### 最上位13職（26枚）

#### 剣聖・男（`piece/swordSaint-male`）→ 元画像 `piece/swordSaint-male.png`
- 持たせる物: 銅の剣1本　／　見た目: 白と赤の立派な長いコート・金の刺繍

```
chibi tabletop miniature figurine of a young male legendary sword saint, long dark red hair tied back, flowing white and crimson ornate long coat over light armor with gold embroidery, serene master aura, holding only one plain copper one-handed sword in one hand, the other hand empty and open, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, katana, second sword, bow, arrows, quiver, dual wielding, two swords, sheathed sword, scabbard, second weapon, signature, text, watermark, scenery
```

#### 剣聖・女（`piece/swordSaint-female`）→ 元画像 `piece/swordSaint-female.png`
- 持たせる物: 銅の剣1本　／　見た目: 白と赤の立派な長いコート・金の刺繍

```
chibi tabletop miniature figurine of a young female legendary sword saint, very long crimson hair in a high ponytail, flowing white and crimson ornate long coat over light armor with gold embroidery, serene master aura, holding only one plain copper one-handed sword in one hand, the other hand empty and open, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, katana, second sword, bow, arrows, quiver, dual wielding, two swords, sheathed sword, scabbard, second weapon, signature, text, watermark, scenery
```

#### 覇王・男（`piece/overlord-male`）→ 元画像 `piece/overlord-male.png`
- 持たせる物: 木こりの斧　／　見た目: 黒と濃い赤の重い鎧・毛皮のマント・角の冠

```
chibi tabletop miniature figurine of a young male imposing warlord overlord, wild crimson mane of hair, black and dark red heavy armor with a thick fur mantle and a horned crown-like circlet, commanding presence, holding a heavy thick-bladed woodcutter's axe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, sword, bow, arrows, quiver, second axe, second weapon, signature, text, watermark, scenery
```

#### 覇王・女（`piece/overlord-female`）→ 元画像 `piece/overlord-female.png`
- 持たせる物: 木こりの斧　／　見た目: 黒と濃い赤の重い鎧・毛皮のマント・角の冠

```
chibi tabletop miniature figurine of a young female imposing warlord overlord, long wild red hair, black and dark red heavy armor with a thick fur mantle and a horned crown-like circlet, commanding presence, holding a heavy thick-bladed woodcutter's axe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, sword, bow, arrows, quiver, second axe, second weapon, signature, text, watermark, scenery
```

#### 拳王・男（`piece/fistKing-male`）→ 元画像 `piece/fistKing-male.png`
- 持たせる物: 布の手甲（素手）　／　見た目: 白と橙の道着・金刺繍の黒帯・長い腰布

```
chibi tabletop miniature figurine of a young male martial arts master king of fists, short black hair tied in a small topknot, no headband, sleeveless deep orange gi with gold trim and a gold-embroidered black belt, long flowing orange sash, powerful stance, both fists wrapped in worn cloth hand wraps, bare hands, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, headband, white gi, spiky hair, sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, weapon in hand, second weapon, signature, text, watermark, scenery
```

#### 拳王・女（`piece/fistKing-female`）→ 元画像 `piece/fistKing-female.png`
- 持たせる物: 布の手甲（素手）　／　見た目: 白と橙の道着・金刺繍の黒帯・長い腰布

```
chibi tabletop miniature figurine of a young female martial arts master king of fists, long black hair in a high ponytail with a red headband, white and orange gi with a gold-embroidered black belt, long flowing sash, powerful stance, both fists wrapped in worn cloth hand wraps, bare hands, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, weapon in hand, second weapon, signature, text, watermark, scenery
```

#### 大賢者・男（`piece/greatSage-male`）→ 元画像 `piece/greatSage-male.png`
- 持たせる物: 樫の杖（先に紫の宝玉）　／　見た目: 白と濃い青紫の立派なローブ・まわりに光る文字

```
chibi tabletop miniature figurine of a young male great sage, long silver hair, grand white and deep violet robes with gold celestial embroidery, small glowing runes floating around, holding a tall gnarled oak wooden staff topped with a small violet crystal in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, book, shield, wand, bow, arrows, quiver, second staff, second weapon, signature, text, watermark, scenery
```

#### 大賢者・女（`piece/greatSage-female`）→ 元画像 `piece/greatSage-female.png`
- 持たせる物: 樫の杖（先に紫の宝玉）　／　見た目: 白と濃い青紫の立派なローブ・まわりに光る文字

```
chibi tabletop miniature figurine of a young female great sage, very long dark blue hair with a gold circlet, grand white and deep violet robes with gold celestial embroidery, small glowing runes floating around, holding a tall gnarled oak wooden staff topped with a small violet crystal in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, book, shield, wand, bow, arrows, quiver, second staff, second weapon, signature, text, watermark, scenery
```

#### 冥王・男（`piece/hadesLord-male`）→ 元画像 `piece/hadesLord-male.png`
- 持たせる物: 錆びた大鎌　／　見た目: 黒と紫の王のローブ・骨の冠・足もとに黒い霧

```
chibi tabletop miniature figurine of a young male lord of the underworld, black hair falling over one eye, regal black and violet robe with a bone crown and a long dark cape, faint dark mist at the feet, holding a large rusty scythe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, staff, sword, shield, skeleton minions, bow, arrows, quiver, second scythe, second weapon, signature, text, watermark, scenery
```

#### 冥王・女（`piece/hadesLord-female`）→ 元画像 `piece/hadesLord-female.png`
- 持たせる物: 錆びた大鎌　／　見た目: 黒と紫の王のローブ・骨の冠・足もとに黒い霧

```
chibi tabletop miniature figurine of a young female lord of the underworld, long straight black hair, regal black and violet robe with a bone crown and a long dark cape, faint dark mist at the feet, holding a large rusty scythe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, staff, sword, shield, skeleton minions, bow, arrows, quiver, second scythe, second weapon, signature, text, watermark, scenery
```

#### 幻獣王・男（`piece/phantomKing-male`）→ 元画像 `piece/phantomKing-male.png`
- 持たせる物: 魔導書1冊　／　見た目: 紫と白の王のローブ・大きな羽根のマント・金の冠

```
chibi tabletop miniature figurine of a young male king of phantom beasts, teal-silver hair, regal violet and white robe with a large feathered mantle and a gold circlet, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, sword, shield, creatures, animals, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

#### 幻獣王・女（`piece/phantomKing-female`）→ 元画像 `piece/phantomKing-female.png`
- 持たせる物: 魔導書1冊　／　見た目: 紫と白の王のローブ・大きな羽根のマント・金の冠

```
chibi tabletop miniature figurine of a young female king of phantom beasts, long white hair with lavender tips, regal violet and white robe with a large feathered mantle and a gold circlet, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, sword, shield, creatures, animals, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

#### 聖王・男（`piece/holyKing-male`）→ 元画像 `piece/holyKing-male.png`
- 持たせる物: 樫の槌　／　見た目: 白と金の立派な鎧・青いマント・小さな冠・丸い盾（提案F）

```
chibi tabletop miniature figurine of a young male radiant holy king, short blond hair, radiant white and gold ornate plate armor, royal blue cape, small crown, a round knight shield on the other arm, holding a sturdy plain oak wooden war hammer in one hand, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, spear, second weapon, bow, arrows, quiver, second hammer, signature, text, watermark, scenery
```

#### 聖王・女（`piece/holyKing-female`）→ 元画像 `piece/holyKing-female.png`
- 持たせる物: 樫の槌　／　見た目: 白と金の立派な鎧・青いマント・小さな冠・丸い盾（提案F）

```
chibi tabletop miniature figurine of a young female radiant holy king, long golden braided hair, radiant white and gold ornate plate armor, royal blue cape, small crown, a round knight shield on the other arm, holding a sturdy plain oak wooden war hammer in one hand, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, spear, second weapon, bow, arrows, quiver, second hammer, signature, text, watermark, scenery
```

#### 竜騎士・男（`piece/dragoon-male`）→ 元画像 `piece/dragoon-male.png`
- 持たせる物: 鉄の槍　／　見た目: 濃い青の竜の鱗の鎧・竜の兜は脇に抱える

```
chibi tabletop miniature figurine of a young male dragon knight dragoon, short dark blue hair, dark blue dragon-scale armor with spiky pauldrons, dragon-head helmet held under the arm so the face is visible, holding a long spear with a clearly visible leaf-shaped iron spearhead on a long wooden shaft, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, sword, dragon creature, bow, arrows, quiver, second spear, second weapon, signature, text, watermark, scenery
```

#### 竜騎士・女（`piece/dragoon-female`）→ 元画像 `piece/dragoon-female.png`
- 持たせる物: 鉄の槍　／　見た目: 濃い青の竜の鱗の鎧・竜の兜は脇に抱える

```
chibi tabletop miniature figurine of a young female dragon knight dragoon, long blue hair, dark blue dragon-scale armor with spiky pauldrons, dragon-head helmet held under the arm so the face is visible, holding a long spear with a clearly visible leaf-shaped iron spearhead on a long wooden shaft, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, sword, dragon creature, bow, arrows, quiver, second spear, second weapon, signature, text, watermark, scenery
```

#### 教皇・男（`piece/pope-male`）→ 元画像 `piece/pope-male.png`
- 持たせる物: 木の錫杖（鈴と輪）　／　見た目: 白と金の立派な祭服・高い司教冠

```
chibi tabletop miniature figurine of a young male holy pope, short brown hair, grand white and gold vestments with a tall mitre and a long embroidered stole, gentle radiant halo light, holding a wooden ringed prayer staff (shakujo) with small brass rings and bells at the top in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, sword, hammer, shield, bow, arrows, quiver, crystal staff, second staff, second weapon, signature, text, watermark, scenery
```

#### 教皇・女（`piece/pope-female`）→ 元画像 `piece/pope-female.png`
- 持たせる物: 木の錫杖（鈴と輪）　／　見た目: 白と金の立派な祭服・高い司教冠

```
chibi tabletop miniature figurine of a young female holy pope, long silver-blonde hair, grand white and gold vestments with a tall mitre and a long embroidered stole, gentle radiant halo light, holding a wooden ringed prayer staff (shakujo) with small brass rings and bells at the top in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, sword, hammer, shield, bow, arrows, quiver, crystal staff, second staff, second weapon, signature, text, watermark, scenery
```

#### 弓聖・男（`piece/bowSaint-male`）→ 元画像 `piece/bowSaint-male.png`
- 持たせる物: 狩人の弓　／　見た目: 緑と白の上品な狩装束・金の葉の刺繍・羽根のマント

```
chibi tabletop miniature figurine of a young male legendary bow saint, short blond hair, elegant green and white hunter attire with gold leaf embroidery, feathered cape, quiver on the back, holding a simple wooden longbow in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, dagger in hand, shield, second bow, second weapon, signature, text, watermark, scenery
```

#### 弓聖・女（`piece/bowSaint-female`）→ 元画像 `piece/bowSaint-female.png`
- 持たせる物: 狩人の弓　／　見た目: 緑と白の上品な狩装束・金の葉の刺繍・羽根のマント

```
chibi tabletop miniature figurine of a young female legendary bow saint, long light blonde hair in a side braid, elegant green and white hunter attire with gold leaf embroidery, feathered cape, quiver on the back, holding a simple wooden longbow in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, dagger in hand, shield, second bow, second weapon, signature, text, watermark, scenery
```

#### ビーストマスター・男（`piece/beastMaster-male`）→ 元画像 `piece/beastMaster-male.png`
- 持たせる物: 革の鞭　／　見た目: 狼の毛皮のマント・骨と牙の飾り

```
chibi tabletop miniature figurine of a young male wild beast master, messy brown hair, large wolf-pelt mantle over a leaf green leather outfit, bone and fang accessories, holding a coiled leather whip in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, animals, creatures, sword, bow, shield, arrows, quiver, second whip, second weapon, signature, text, watermark, scenery
```

#### ビーストマスター・女（`piece/beastMaster-female`）→ 元画像 `piece/beastMaster-female.png`
- 持たせる物: 革の鞭　／　見た目: 狼の毛皮のマント・骨と牙の飾り

```
chibi tabletop miniature figurine of a young female wild beast master, short orange-brown hair, large wolf-pelt mantle over a leaf green leather outfit, bone and fang accessories, holding a coiled leather whip in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, animals, creatures, sword, bow, shield, arrows, quiver, second whip, second weapon, signature, text, watermark, scenery
```

#### 忍者・男（`piece/ninja-male`）→ 元画像 `piece/ninja-male.png`
- 持たせる物: 古びた短剣1本　／　見た目: 黒と紺の忍び装束・長い赤いマフラー

```
chibi tabletop miniature figurine of a young male master ninja, black hair, black and dark slate blue shinobi garb, long flowing red scarf, face visible, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, katana, shuriken, second blade, shield, clones, bow, arrows, quiver, dual wielding, two daggers, second dagger, second weapon, signature, text, watermark, scenery
```

#### 忍者・女（`piece/ninja-female`）→ 元画像 `piece/ninja-female.png`
- 持たせる物: 古びた短剣1本　／　見た目: 黒と紺の忍び装束・長い赤いマフラー

```
chibi tabletop miniature figurine of a young female master ninja, black hair in a high ponytail, black and dark slate blue shinobi garb, long flowing red scarf, face visible, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, katana, shuriken, second blade, shield, clones, bow, arrows, quiver, dual wielding, two daggers, second dagger, second weapon, signature, text, watermark, scenery
```

#### 大怪盗・男（`piece/grandThief-male`）→ 元画像 `piece/grandThief-male.png`
- 持たせる物: 古びた短剣1本　／　見た目: 黒と金の燕尾服・裏が赤の長いマント・シルクハット

```
chibi tabletop miniature figurine of a young male legendary grand phantom thief, neat dark hair, black and gold tailcoat with a long cape lined in crimson, top hat, monocle, white gloves, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, gun, sword, shield, bow, arrows, quiver, dual wielding, two daggers, second dagger, second weapon, signature, text, watermark, scenery
```

#### 大怪盗・女（`piece/grandThief-female`）→ 元画像 `piece/grandThief-female.png`
- 持たせる物: 古びた短剣1本　／　見た目: 黒と金の燕尾服・裏が赤の長いマント・シルクハット

```
chibi tabletop miniature figurine of a young female legendary grand phantom thief, black bob hair, black and gold tailcoat with a long cape lined in crimson, top hat, monocle, white gloves, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, gun, sword, shield, bow, arrows, quiver, dual wielding, two daggers, second dagger, second weapon, signature, text, watermark, scenery
```

### 特殊10職（20枚）

#### 侍・男（`piece/samurai-male`）→ 元画像 `piece/samurai-male.png`
- 持たせる物: 無銘の刀1本（腰の鞘）　／　見た目: 紺の着物と赤い袴・抜く前の居合の構え

```
chibi tabletop miniature figurine of a young male calm samurai, black hair in a topknot, dark navy kimono and crimson hakama with simple lacquered shoulder plates, holding one long plain katana in a long black scabbard in the left hand at the waist, the right hand gripping the hilt, the katana clearly visible and long, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, second sword, western sword, bow, shield, arrows, quiver, two katanas, empty hands without sword, second weapon, signature, text, watermark, scenery
```

#### 侍・女（`piece/samurai-female`）→ 元画像 `piece/samurai-female.png`
- 持たせる物: 無銘の刀1本（腰の鞘）　／　見た目: 紺の着物と赤い袴・抜く前の居合の構え

```
chibi tabletop miniature figurine of a young female calm samurai, long black hair tied high with a red cord, dark navy kimono and crimson hakama with simple lacquered shoulder plates, holding one long plain katana in a long black scabbard in the left hand at the waist, the right hand gripping the hilt, the katana clearly visible and long, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, second sword, western sword, bow, shield, arrows, quiver, two katanas, empty hands without sword, second weapon, signature, text, watermark, scenery
```

#### 魔剣士・男（`piece/magicKnight-male`）→ 元画像 `piece/magicKnight-male.png`
- 持たせる物: 銅の剣1本　／　見た目: 赤と青の鎧のコート・光る文字・刃にうっすら属性の光

```
chibi tabletop miniature figurine of a young male magic swordsman, dark red hair, red and blue armored coat with softly glowing elemental rune lines, faint elemental glow along the blade, holding only one plain copper one-handed sword in one hand, the other hand empty and open, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, shield, book, second sword, bow, arrows, quiver, dual wielding, two swords, sheathed sword, scabbard, second weapon, signature, text, watermark, scenery
```

#### 魔剣士・女（`piece/magicKnight-female`）→ 元画像 `piece/magicKnight-female.png`
- 持たせる物: 銅の剣1本　／　見た目: 赤と青の鎧のコート・光る文字・刃にうっすら属性の光

```
chibi tabletop miniature figurine of a young female magic swordsman, crimson hair in a braid, red and blue armored coat with softly glowing elemental rune lines, faint elemental glow along the blade, holding only one plain copper one-handed sword in one hand, the other hand empty and open, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, shield, book, second sword, bow, arrows, quiver, dual wielding, two swords, sheathed sword, scabbard, second weapon, signature, text, watermark, scenery
```

#### 時魔道士・男（`piece/timeMage-male`）→ 元画像 `piece/timeMage-male.png`
- 持たせる物: 魔導書1冊　／　見た目: 濃い青と金のローブ・時計と砂時計の模様

```
chibi tabletop miniature figurine of a young male time mage, neat silver hair, deep blue and gold robe with clock-face and hourglass motifs, small floating gears of light, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, sword, shield, large clock, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

#### 時魔道士・女（`piece/timeMage-female`）→ 元画像 `piece/timeMage-female.png`
- 持たせる物: 魔導書1冊　／　見た目: 濃い青と金のローブ・時計と砂時計の模様

```
chibi tabletop miniature figurine of a young female time mage, long dark blue hair with a clock-shaped hair ornament, deep blue and gold robe with clock-face and hourglass motifs, small floating gears of light, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, sword, shield, large clock, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

#### 死霊術師・男（`piece/necromancer-male`）→ 元画像 `piece/necromancer-male.png`
- 持たせる物: 錆びた大鎌　／　見た目: 黒と淡い緑のぼろのローブ・骨の飾り・青白い霊の光

```
chibi tabletop miniature figurine of a young male necromancer, pale skin and white hair, black and sickly green tattered robes with bone ornaments, pale ghostly wisps around, holding a large rusty scythe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, staff, sword, shield, skeleton minions, bow, arrows, quiver, second scythe, second weapon, signature, text, watermark, scenery
```

#### 死霊術師・女（`piece/necromancer-female`）→ 元画像 `piece/necromancer-female.png`
- 持たせる物: 錆びた大鎌　／　見た目: 黒と淡い緑のぼろのローブ・骨の飾り・青白い霊の光

```
chibi tabletop miniature figurine of a young female necromancer, pale skin and long black hair, black and sickly green tattered robes with bone ornaments, pale ghostly wisps around, holding a large rusty scythe, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, book, staff, sword, shield, skeleton minions, bow, arrows, quiver, second scythe, second weapon, signature, text, watermark, scenery
```

#### 暗黒騎士・男（`piece/darkKnight-male`）→ 元画像 `piece/darkKnight-male.png`
- 持たせる物: 銅の剣1本　／　見た目: 黒いとげの鎧・ぼろの黒マント・刃に黒いもや

```
chibi tabletop miniature figurine of a young male dark knight, short silver hair, black spiked plate armor with dark red accents and a tattered black cape, face visible, faint dark aura around the blade, holding only one plain copper one-handed sword in one hand, the other hand empty and open, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, hammer, bow, arrows, quiver, dual wielding, two swords, second sword, sheathed sword, scabbard, second weapon, signature, text, watermark, scenery
```

#### 暗黒騎士・女（`piece/darkKnight-female`）→ 元画像 `piece/darkKnight-female.png`
- 持たせる物: 銅の剣1本　／　見た目: 黒いとげの鎧・ぼろの黒マント・刃に黒いもや

```
chibi tabletop miniature figurine of a young female dark knight, long black hair, black spiked plate armor with dark red accents and a tattered black cape, face visible, faint dark aura around the blade, holding only one plain copper one-handed sword in one hand, the other hand empty and open, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, shield, hammer, bow, arrows, quiver, dual wielding, two swords, second sword, sheathed sword, scabbard, second weapon, signature, text, watermark, scenery
```

#### 巫女・男（`piece/shrineMaiden-male`）→ 元画像 `piece/shrineMaiden-male.png`
- 持たせる物: 木の錫杖（鈴と輪）　／　見た目: 白い小袖と赤い袴（男は神主風の白と赤）

```
chibi tabletop miniature figurine of a young male shrine maiden, black hair tied back with white paper ribbon (male shrine priest attire), white kosode top and red hakama with white ribbons and paper charms, holding a wooden ringed prayer staff (shakujo) with small brass rings and bells at the top in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, bow, shield, gohei wand, arrows, quiver, crystal staff, second staff, second weapon, signature, text, watermark, scenery
```

#### 巫女・女（`piece/shrineMaiden-female`）→ 元画像 `piece/shrineMaiden-female.png`
- 持たせる物: 木の錫杖（鈴と輪）　／　見た目: 白い小袖と赤い袴（男は神主風の白と赤）

```
chibi tabletop miniature figurine of a young female shrine maiden, long straight black hair tied low with a white paper ribbon, white kosode top and red hakama with white ribbons and paper charms, holding a wooden ringed prayer staff (shakujo) with small brass rings and bells at the top in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, sword, bow, shield, gohei wand, arrows, quiver, crystal staff, second staff, second weapon, signature, text, watermark, scenery
```

#### 占星術師・男（`piece/astrologer-male`）→ 元画像 `piece/astrologer-male.png`
- 持たせる物: 魔導書1冊　／　見た目: 星座模様の紺のローブ・星の冠

```
chibi tabletop miniature figurine of a young male astrologer star reader, wavy silver hair, midnight blue robe with constellation patterns and a small star circlet, star chart pages on the book, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, telescope, crystal ball, sword, shield, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

#### 占星術師・女（`piece/astrologer-female`）→ 元画像 `piece/astrologer-female.png`
- 持たせる物: 魔導書1冊　／　見た目: 星座模様の紺のローブ・星の冠

```
chibi tabletop miniature figurine of a young female astrologer star reader, long wavy navy hair with star hairpins, midnight blue robe with constellation patterns and a small star circlet, star chart pages on the book, holding only one leather-bound spellbook in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, staff, telescope, crystal ball, sword, shield, bow, arrows, quiver, second book, stack of books, second weapon, signature, text, watermark, scenery
```

#### 機工士・男（`piece/machinist-male`）→ 元画像 `piece/machinist-male.png`
- 持たせる物: 古式銃　／　見た目: おでこにゴーグル・茶色の革の作業コート・真鍮の歯車

```
chibi tabletop miniature figurine of a young male clever machinist engineer, messy ginger hair, goggles on the forehead, brown leather work coat with brass gears, utility belts with small tools, holding an antique long flintlock rifle with a wooden stock, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, bow, sword, shield, mechanical arm, dual pistols, arrows, quiver, pistol, two guns, second weapon, signature, text, watermark, scenery
```

#### 機工士・女（`piece/machinist-female`）→ 元画像 `piece/machinist-female.png`
- 持たせる物: 古式銃　／　見た目: おでこにゴーグル・茶色の革の作業コート・真鍮の歯車

```
chibi tabletop miniature figurine of a young female clever machinist engineer, short ginger hair in a small ponytail, goggles on the forehead, brown leather work coat with brass gears, utility belts with small tools, holding an antique long flintlock rifle with a wooden stock, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, bow, sword, shield, mechanical arm, dual pistols, arrows, quiver, pistol, two guns, second weapon, signature, text, watermark, scenery
```

#### 吟遊詩人・男（`piece/bard-male`）→ 元画像 `piece/bard-male.png`
- 持たせる物: 旅人のリュート　／　見た目: 羽根つきのベレー帽・緑と金の旅の服

```
chibi tabletop miniature figurine of a young male cheerful traveling bard, wavy chestnut hair, feathered beret, colorful green and gold traveling outfit, short cape, holding a small wooden lute, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, dagger in hand, sword, shield, flute, bow, arrows, quiver, second instrument, second weapon, signature, text, watermark, scenery
```

#### 吟遊詩人・女（`piece/bard-female`）→ 元画像 `piece/bard-female.png`
- 持たせる物: 旅人のリュート　／　見た目: 羽根つきのベレー帽・緑と金の旅の服

```
chibi tabletop miniature figurine of a young female cheerful traveling bard, long wavy chestnut hair, feathered beret, colorful green and gold traveling outfit, short cape, holding a small wooden lute, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, dagger in hand, sword, shield, flute, bow, arrows, quiver, second instrument, second weapon, signature, text, watermark, scenery
```

#### 賭博師・男（`piece/gambler-male`）→ 元画像 `piece/gambler-male.png`
- 持たせる物: 古びた短剣1本　／　見た目: 濃い赤のベスト・帽子にトランプ・腰にサイコロ

```
chibi tabletop miniature figurine of a young male confident gambler, slicked-back dark hair, dark red waistcoat over a white shirt with loosened tie, playing cards tucked in the hat band, dice on the belt, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, gun, sword, second dagger, shield, bow, arrows, quiver, dual wielding, two daggers, second weapon, signature, text, watermark, scenery
```

#### 賭博師・女（`piece/gambler-female`）→ 元画像 `piece/gambler-female.png`
- 持たせる物: 古びた短剣1本　／　見た目: 濃い赤のベスト・帽子にトランプ・腰にサイコロ

```
chibi tabletop miniature figurine of a young female confident gambler, dark wavy hair, dark red waistcoat over a white shirt with loosened tie, playing cards tucked in the hat band, dice on the belt, holding only one short dagger in one hand, the other hand empty, cute expression, standing on its own feet with no base, boots touching the plain white background directly, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no pedestal, base, stand, round disc, gun, sword, second dagger, shield, bow, arrows, quiver, dual wielding, two daggers, second weapon, signature, text, watermark, scenery
```
