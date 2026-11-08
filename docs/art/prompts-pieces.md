# ワールドマップの駒（ミニチュア）の Midjourney 指示文

第2段階で、世界マップのキャラを「チェスの駒のようなミニチュア」にした。台座とプレイヤーの色の輪はゲームが描く。
この文書は、台座の上に立つ**ミニチュアの絵**を Midjourney で作るための指示文。

- 見本: `docs/art/reference/gemini-mock-dungeon-and-piece.jpg` の右上「ルーシア（魔道士）」（オーナーのイメージに近い）
- 置き場所: `src/assets/art/piece/<職業ID>-<male|female>.webp`（置くだけで台座の上に立つ。無い職は顔のメダルの仮の見た目）
- **まず2枚で試す**（剣士の男・魔道士の女）。盤の上で小さく表示しても見分けられるかを確かめてから、残り86枚を作る。

## 共通の決まり

- ちびキャラ（2〜2.5頭身）の**色を塗った樹脂フィギュア**。顔と持ち物が大きめで、小さくても職が分かる。
- **丸い金色（真鍮）の台座**に立つ。台座は全員同じ金色（プレイヤーの色はゲームが付ける）。
- 全身・やや斜め前（3/4）・**白い無地の背景**（切り抜きやすくするため）・柔らかい照明。縦長 `--ar 3:4`。
- **持たせる武器はゲームの最初の武器と同じ**にする。持たせない物（盾・2本目の武器・別の種類の武器）は、最後の `--no` の後ろにまとめる（文の中に「no shield」と書くと、かえって描かれることがあるため。立ち絵と同じ決まり）。
- `--sref` は付けない（立ち絵を参照すると、ちびキャラではなくリアルな作風になるため）。画面の「Style References」も空にする。
- 服の色は、今の立ち絵（`src/assets/art/hero/<職>-<性別>.webp`）に合わせる。

## 試しの2枚

### 1. 剣士・男（レオン）`piece/warrior-male`
- 最初の装備: 銅の剣（片手剣）・皮の鎧
- 立ち絵の特徴: 赤茶の髪、赤いマント・赤い布、銀の鎧に赤の飾り

```
chibi tabletop miniature figurine of a young male swordsman, short reddish-brown hair, silver plate armor with red trim, flowing red cape and red scarf, holding a single plain copper one-handed sword pointed down at his side, confident gentle expression, standing on a round polished brass pedestal base, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no shield, second weapon, bow, arrows, quiver, spear, signature, text, watermark, scenery
```

### 2. 魔道士・女（ルーシア）`piece/mage-female`
- 最初の装備: 樫の杖（先に小さな紫の宝玉）・旅人の服
- 立ち絵の特徴: 黒髪のショート、つばの広いとんがり帽子、紫と淡いピンクのローブ

```
chibi tabletop miniature figurine of a young female mage, short dark hair, wide-brimmed pointed witch hat, layered purple and dusty pink robes with gold embroidery, holding a tall gnarled oak wooden staff topped with a small violet crystal in one hand, calm kind expression, standing on a round polished brass pedestal base, hand-painted resin board game figure, full body, front three-quarter view, soft studio lighting, plain white background --ar 3:4 --no sword, shield, book, second weapon, bow, arrows, quiver, spear, signature, text, watermark, scenery
```

## できた絵の渡し方（オーナー → Claude）

1. Midjourney で4枚出た中から、一番良い1枚を選んで拡大（Upscale）する。
2. 元の画像を `warrior-male.png`・`mage-female.png` のような名前で渡す。
3. Claude が背景を切り抜き（`scripts/art/build_art.py` に駒の表を足す）、`src/assets/art/piece/` に置いて、盤の上での見え方を確かめる。
4. 見え方に合わせて指示文を直してから、残りの職をまとめて作る（J4の指示文の一覧に入れる）。
