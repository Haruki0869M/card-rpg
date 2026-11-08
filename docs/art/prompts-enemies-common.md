# 敵の絵の Midjourney 指示文 — 共通の敵（突発イベント）2枚と、K3 の書式

この文書は、**今ゲームにいる敵のうち、絵がまだ無いもの**の指示文です。あわせて、K3（敵の量産）で地域ごとに指示文を作る時の**書式の手本**と、**亜種の絵の使い回し・オーラの見分け方**を決めます。
J4（立ち絵・お供）の指示文 `prompts-jobs-pets.md`（ブランチ `claude/j4-prompts-9ade08`）と同じ形式です。

## 対象の選び方（提案 — オーナーの OK 待ち）

調べた結果（2026-11-08 時点、`src/content` の敵 20体と `src/assets/art/enemy/` の絵を突き合わせ）:

- 最初の地域（森・沼・火山・魔王城）の敵 15体と共通の敵 5体のうち、**絵があるのは 18体**。ボスの変身後の絵（`mordea-1`・`treantKing-1`・`valgrim-1`・`ignavarl-1`）も揃っています。
- **絵が無いのは 2体だけ**: 黄金のコソ泥（`goldenThief`）・護衛の野犬（`guardDog`）。どちらも「共通の敵」で、突発イベントでしか出ません。
- そこで（提案）、この文書は**共通の敵の2枚**を対象にします。最初の地域は描き直さず、そのまま使います。
- K3 の新しい敵（約165枚）は、シナリオ／地域ごとに、この文書と同じ書式で別の文書（`prompts-enemies-<地域名>.md`）にします。敵の中身（名前・属性・姿）が決まってからでないと書けないため、今は作りません。

## 共通の決まり

- **作風**: 今ゲームに入っている敵の絵（細かく描き込んだ手描き風のファンタジー画。落ち着いた色に、金や赤茶の細かい装飾）。※ `docs/art/style-reference.png` は初期の太い線のカートゥーン調で、**今の絵とは違う**ので参考にしません。
- **お手本（`--sref`）**: 公開中のゲーム（Firebase Hosting）の今の敵の絵2枚を使います。画面の「Style References」には何も入れません（J4と同じ理由）。
  - `https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp`（森の狼）
  - `https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp`（樹木の番人）
  - 末尾の英数字は絵の中身で決まります。敵の絵を描き直して公開し直した時は、`curl` などで新しい名前を調べて直してください（2026-11-08 に200で開けることを確認済み）。
  - 強すぎる・弱すぎる時は、最後に `--sw 100`（ふつう）〜`--sw 300`（強め）を足します。
- **背景は無地の明るい色**（`plain off-white background`）。切り抜きは `scripts/art/build_art.py`（背景を抜く）が行うので、**影・地面・周りの景色を描かせない**。
- **向き**: 敵は画面の左向き〜正面の3/4。縦横 `--ar 4:5`（今の絵は 520×620 ＝ 約 5:6。切り抜き後に置き直すので 4:5 で十分）。全身が入り、足先まで切れない。
- **持たせる物・持たせない物を必ず書く**（J4と同じ）。持たせない物は文に書かず、最後の `--no` にまとめる。
- **文字・署名・透かし・景色** は `--no` に入れる。
- 敵の大きさ（`size`）は絵の大きさではなく、ゲームが拡大縮小します。**どの敵も、絵の中では枠いっぱいに描かせる**。

## 指示文（2枚）

### 黄金のコソ泥（`goldenThief`）
- データ: HP34・Lv2・`size` 0.85。突発イベントで出る。「硬くて素早い。3ターン以内に倒さないと逃げる」「金袋で守る」「ちょっかい」。
- 見た目: 背の低い小柄な泥棒。**全身が金色**の布の服とずきん。背中に**ぱんぱんの大きな金貨の袋**を背負い、片手で金袋を抱える。にやけた顔、逃げ足の速そうな前かがみ。
- 持たせる物: 金貨でふくらんだ袋（1つ）。
- 持たせない物: 剣・短剣・弓などの武器、2つ目の袋、地面に散らばる金貨、財宝の山。
- 元画像 `enemy-goldenThief.png`

```
full body creature illustration of a small sly goblin-like thief wearing a golden hood and golden cloth clothes, hunched forward in a running-away pose, cheeky grin, big pointed ears, one clutched bulging sack full of gold coins on his back held tight with one hand, golden yellow as the main color, detailed hand-painted fantasy RPG monster art, fine ornamental embroidery, muted earthy palette with warm gold accents, entire body visible from head to feet, facing left three-quarter view, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, dagger, bow, weapon, second sack, scattered coins on the ground, treasure pile, ground shadow, scenery, signature, text, watermark
```

### 護衛の野犬（`guardDog`）
- データ: HP20・Lv2・`size` 0.85。突発イベント「珍獣商人」で出る。「噛みつき」「うなり声」。
- 見た目: 痩せて毛並みの荒い**茶色の野犬**。歯をむいて低くうなる姿勢。首に**切れた古い鎖つきの首輪**（商人に飼われていた）。目つきが鋭い。
- 持たせる物: なし（首輪と短く切れた鎖だけ）。
- 持たせない物: 鎧・服、人間の持ち物、2匹目の犬、背景の商人や荷車。
- 元画像 `enemy-guardDog.png`

```
full body creature illustration of a lean scruffy brown guard dog, bared teeth, low growling stance with head lowered, sharp wary eyes, an old worn leather collar with a short broken chain, rough matted fur with lighter chest, brown as the main color, detailed hand-painted fantasy RPG monster art, fine detail in the fur, muted earthy palette, entire body visible from nose to paws and tail, facing left three-quarter view, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no armor, clothes, human, merchant, cart, second dog, ground shadow, scenery, signature, text, watermark
```

注意: 森の狼（既にある）と似るので、**灰緑の苔ではなく茶色の短い毛・首輪の鎖**で見分けます。似すぎたら `--no moss, leaves, ornate armor` を足してください。

## 試す順番（おすすめ）

1. 2枚を1回ずつ作る。**今の森の狼と並べて**、作風・大きさ・白い背景を見る。
2. 作風が合わなければ `--sw` を調整する。合ったら残りの敵（K3）もこの書式で作る。

## 組み込みの手順（Claude／Codex）

1. 元画像を `enemy-goldenThief.png`・`enemy-guardDog.png` の名前で置く（番号ではなく名前）。
2. `scripts/art/build_art.py` の `ENEMIES` に、元画像と大きさを足して実行（背景切り抜き → `src/assets/art/enemy/<敵ID>.webp`）。
3. `src/assets/art/enemy/<敵ID>.webp` を置くと自動で使われます（`src/art/index.tsx` の `artImage('enemy/<敵ID>')`）。コードは変えません。
4. 画面で確認（突発イベントの戦闘）。確認表は次の通り。

| 敵 | 元画像 | 組み込み | 画面で確認 |
|---|---|---|---|
| goldenThief | ☐ | ☐ | ☐ |
| guardDog | ☐ | ☐ | ☐ |

## 亜種（K3）の絵の使い回しとオーラの見分け方（計画案より）

亜種は**絵を新しく作りません**。元の敵の絵を使い回し（`variantOf` をさかのぼる）、**足元のオーラ**で見分けます。亜種の指示文は不要です。

- 亜種は敵全体の2割まで。元の敵から、**属性か開幕の特性を1つだけ**変える。
- 足元に、オーラの色の光る楕円を描く（絵そのものは変えず、ゲーム側の描画）。戦闘の画面でも敵の名前の横に同じ色の点を出す（提案）。
- オーラの色（提案・6〜8色）。**属性が変わる亜種は、その属性の色**を使うので、見ただけで弱点の見当が付く。

| オーラ | 色 | 使い方 |
|---|---|---|
| 炎 | 橙〜赤 | 火属性に変えた亜種 |
| 氷 | 水色 | 氷属性 |
| 雷 | 黄 | 雷属性 |
| 毒 | 紫がかった緑 | 毒属性 |
| 聖 | 白金 | 聖属性 |
| 闇 | 暗い紫（黒に近い） | 闇属性 |
| 赤い光 | 赤 | 開幕の特性が変わる亜種（攻撃的な特性）。属性は元のまま |
| 青い光 | 青 | 開幕の特性が変わる亜種（防御的な特性）。属性は元のまま |

- 色覚への配慮として、色だけに頼らず、オーラの**形**（炎＝ゆらめく、氷＝とがる、雷＝ぎざぎざ…）も変える（提案）。
- 新しい敵の指示文（K3）を作る時の書式チェック: ①今の敵の絵を `--sref` に ②武器・持たせない物を明記 ③`plain off-white background`・影を描かせない ④`--ar 4:5` ⑤亜種の元になる敵は、オーラが足元に重なっても読めるように**足元をすっきり**描かせる。
