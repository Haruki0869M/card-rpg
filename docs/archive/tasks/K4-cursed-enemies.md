# K4 作業書：呪われた群島 手順2「敵28体と絵の指示文」（Codex 向け）

シナリオ3「呪われた群島」の敵を作る。**先に `docs/archive/tasks/K3-enemies.md` と `docs/archive/tasks/K4-frozen-enemies.md` を読む**（書き方・亜種の決まり・絵の指示文・確認の方法は同じ。この文書は、このシナリオだけの決め事）。

前提: `src/content/scenarios/cursedArchipelago/` に `scenario.ts`・`map.ts`・`dungeons/`・`towns/`・`quests/`・`shrines/`・`events/` がある（Claude が作成済み）。敵の組み合わせは**仮**（共通の敵）。この作業で本物に置き換える。

## 1. 世界観と戦い方

- 舞台は海霧の呪いに閉ざされた群島。敵は「海の生き物・海賊・溺れた幽霊」。
- **幽霊（溺れた水夫・幽霊水夫・亡霊提督など）は聖（holy）が弱点、闇・毒に耐性。** 海の生き物は**雷（thunder）が弱点**の敵が多い。火に弱い敵は少なめ。水は属性ではない（水の生き物でも氷が弱点とは限らない）。
- 状態異常: 毒・呪い・脆弱を使う敵を混ぜる。凍結は使わない（凍てつく王国と差をつける）。
- 数値は侵食の魔王の同じレベルの敵と同じ水準（難しめのまま）。

## 2. 作る28体

置き場所: `src/content/scenarios/cursedArchipelago/enemies/`。地域ごとに1ファイル（`harbor.ts`・`coral.ts`・`mist.ts`・`isles.ts`・`wreck.ts`）。

### 通常18体（うち亜種4）
| ID | 名前 | 地域 | Lv | 弱点 | 耐性 | メモ |
|---|---|---|---|---|---|---|
| `seaCrab` | 大蟹 | 港・珊瑚 | 1 | thunder | — | 硬い（ブロック）。はさみの二連撃 |
| `jellyfish` | クラゲ | 港・珊瑚 | 2 | thunder, fire | poison | 麻痺ではなく毒を付ける |
| `seaSerpentFry` | 海蛇の子 | 珊瑚 | 2 | thunder | — | 毒の噛みつき |
| `merfolkSpearman` | 半魚人の槍兵 | 珊瑚 | 3 | thunder | — | 槍の突き。2体で出やすい |
| `pirateGrunt` | 海賊の下っ端 | 珊瑚・霧 | 3 | — | — | 平均的。サーベルと投げナイフ |
| `drownedSailor` | 溺れた水夫 | 霧 | 5 | holy | dark, poison | 呪いを付ける。倒した後に仲間を呼ぶ行動はなし |
| `ghostDeckhand` | 幽霊水夫 | 霧 | 5 | holy, fire | dark | 攻撃をすり抜ける特性（開幕にブロック） |
| `pirateGunner` | 海賊の砲手 | 霧 | 5 | thunder | — | 全体に砲撃（小ダメージ） |
| `siren` | セイレーン | 霧 | 5 | thunder | — | 歌で脆弱・呪いを付ける |
| `shark` | 人喰い鮫 | 霧・島々 | 7 | thunder | — | 一撃が重い |
| `conchKnight` | 貝の騎士 | 島々 | 7 | thunder | — | 硬い。反撃の特性 |
| `stormPetrel` | 嵐の海鳥 | 島々 | 7 | fire | thunder | 雷属性の攻撃 |
| `octopusLarva` | 小ダコ | 島々 | 7 | thunder | — | 墨で脆弱を付ける |
| `barnacleBeast` | フジツボの怪物 | 沈没船 | 9 | fire | poison | HPが多い |
| 亜種 `emberSeaCrab` | 熾火の大蟹 | 珊瑚 | 3 | — | — | `seaCrab` の亜種。はさみを火属性に。オーラ `ember` |
| 亜種 `cursedDrownedSailor` | 呪われた溺れた水夫 | 島々 | 7 | holy | dark, poison | `drownedSailor` の亜種。攻撃を闇属性に。オーラ `shadow` |
| 亜種 `stormJellyfish` | 雷クラゲ | 霧 | 5 | fire | thunder, poison | `jellyfish` の亜種。触手を雷属性に。オーラ `storm` |
| 亜種 `venomShark` | 毒鮫 | 沈没船 | 9 | thunder | poison | `shark` の亜種。牙に毒。オーラ `venom` |

（14体＋亜種4体＝18体）

### エリート6体（うち亜種1）
| ID | 名前 | 出る場所 | Lv | メモ |
|---|---|---|---|---|
| `pirateQuartermaster` | 海賊の操舵手 | 霧・海賊の隠れ島 | 5 | HP 約50。号令で味方を強化 |
| `coralGolem` | 珊瑚のゴーレム | 珊瑚・難破船の洞窟 | 5 | HP 約75。ブロックが高い |
| `drownedKnight` | 溺れた騎士 | 島々 | 8 | HP 約85。聖が弱点。呪い |
| `seaWitch` | 海の魔女 | 島々・沈んだ神殿 | 8 | HP 約60。毒と呪い |
| `krakenTentacle` | クラーケンの触腕 | 沈没船・嘆きの王冠号 | 9 | HP 約95。全体攻撃 |
| 亜種 `stormSeaWitch` | 嵐の海の魔女 | 沈没船 | 9 | `seaWitch` の亜種。属性を雷に。オーラ `storm` |

### ボス4体（`phases` あり）
| ID | 名前 | 場所 | Lv | HP目安 | メモ |
|---|---|---|---|---|---|
| `seaSerpentQueen` | 海蛇の女王 | 難破船の洞窟 | 5 | 150 | 毒と締め付け。50%以下で全体の毒 |
| `pirateCaptainGuld` | 海賊船長ガルド | 海賊の隠れ島 | 7 | 210 | 砲撃と剣。死んでも略奪を続ける。50%以下で幽霊の部下を呼ぶ行動 |
| `tideHighPriest` | 潮の神官 | 沈んだ神殿 | 9 | 270 | 潮の波で全体攻撃。50%以下で大潮 |
| `ghostAdmiral` | 亡霊提督 | 嘆きの王冠号 | 11 | 400 | 3段階（100〜60% / 60〜30% / 30%以下）。聖が弱点。最後は大砲の一斉射撃。物語（婚礼の船を守れなかった提督）を行動名に込める |

## 3. ダンジョンと地域に置く（`pools.ts` の代わりに `dungeons/dungeons.ts` と `map.ts` を書き換える）

- `dungeons/dungeons.ts` の `POOLS` を、ダンジョンごとの本物に分ける。難破船の洞窟は珊瑚の敵とエリート `coralGolem`、`boss: ['seaSerpentQueen']`。海賊の隠れ島は霧の敵と `pirateQuartermaster`、`boss: ['pirateCaptainGuld']`。沈んだ神殿は島々の敵と `seaWitch`、`boss: ['tideHighPriest']`。嘆きの王冠号は沈没船の敵と `krakenTentacle`・`stormSeaWitch`、`boss: ['ghostAdmiral']`。`tideCave`（ランダム）の `boss` は `['krakenTentacle', 'drownedKnight']`。
- `map.ts` の `encounters`（陸の敵）と `seaEncounters`（海を動く敵。幽霊船・鮫・クラゲなど、**船に乗っている間に出会う敵**）を本物に置き換える。陸に出す敵は海賊・半魚人・蟹など、海に出す敵は鮫・クラゲ・幽霊水夫・セイレーン・海鳥・溺れた水夫。
- 組み合わせは2〜3体。弱点が同じ敵だけにならないようにする。

## 4. 絵の指示文

`docs/art/prompts-enemies-cursedArchipelago.md` に書く（亜種は絵を使い回すので不要。**23体分**）。

**書き方（絵の担当が直した形に合わせる。見本は `prompts-enemies-frozenKingdom-mj.md`）**:
- 1体1ブロック。見出し `### 敵ID 名前（呪われた群島・地域・通常/エリート/ボス・size 値）`、`置き場所: src/assets/art/enemy/<敵ID>.webp`、`元画像: C:\dev\card-rpg-assets\enemy\<敵ID>.png`、その下にコードブロック1つ。
- 文は英語で、最後に **`--ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no <持たせない物>, ground shadow, scenery, pedestal, second creature, signature, text, watermark`** を付ける（今ゲームに入っている敵の絵に合わせるため）。`docs/art/style-reference.png` は使わない。
- 文のひな形: `full body creature illustration of <1体の特徴>, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with <このシナリオの色>, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting`。このシナリオの色は「青緑の霧、濡れた木と錆びた金具。幽霊は半透明で青白い」。
- 持たせない物は、文の中ではなく `--no` にまとめる。持たせる武器・体の特徴は文の中に具体的に書く。
- ボスの第2段階以降の姿も1枚ずつ書く。

その他の決まりは K3-enemies.md の §5 に従う。このシナリオの雰囲気: 青緑の霧、濡れた木と錆びた金具、幽霊は半透明で青白い。持たせる物・持たせない物を必ず書く（例: 海賊の下っ端は「サーベルを1本だけ。銃・帽子の羽は無し」）。

## 5. 確認と報告

K4-frozen-enemies.md の §5 と同じ。自動プレイは `SIM_SCENARIO=cursedArchipelago` で、目安は侵食の魔王（2人・ふつう: 約9日・34戦闘）に近いこと。
