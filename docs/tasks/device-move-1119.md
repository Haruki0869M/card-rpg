# 動かす端末を変える時の手順（2026-11-19）

オーナーが、開発に使う端末を変える予定。新しい端末で、同じ状態から続けるための手順。

## 1. 持っていく物（3つ）
| 物 | 今の場所 | 持っていき方 |
|---|---|---|
| コード（全部の履歴） | `C:\dev\card-rpg`（ブランチ `ccr-d64a1cfc-debli5`） | 下の §2 のどちらか |
| Claude のメモ（オーナーが決めた事の記録） | `C:\Users\<ユーザー名>\.claude\projects\C--dev-card-rpg\memory` | フォルダごと写す（§3）。**リポジトリには入っていない** |
| 重い確認の順番待ちの道具 | `C:\dev\card-rpg-tools\heavy.mjs` | ファイルを写す（同じ場所に置く） |

写しは `C:\dev\card-rpg-move\` に用意してある（bundle・メモ・道具）。このフォルダを USB やクラウドの自分の置き場で新しい端末へ運べば足りる。

**ほかに、絵の続きをするなら**: 絵の元の画像 `C:\dev\card-rpg-assets`（約1.2GB。リポジトリの外）も運ぶ。Playwright と firebase-tools は `package.json` に入っていないので、新しい端末で入れ直す（`docs/START-HERE.md` §2-1）。

## 2. コードの持っていき方（どちらか）
- **A. bundle（1つのファイル）で運ぶ**: `C:\dev\card-rpg-move\card-rpg-1119.bundle` を新しい端末に写し、
  `git clone C:\dev\card-rpg-move\card-rpg-1119.bundle C:\dev\card-rpg -b ccr-d64a1cfc-debli5`
- **B. GitHub から取る**: 今の端末でオーナーが手で push してから（Claude は push しない）、新しい端末で `git clone`。

どちらの後も: `cd C:\dev\card-rpg` → `git config core.autocrlf false` → `npm ci`（`package-lock.json` は変えない）。

## 3. Claude のメモ
新しい端末で Claude Code を `C:\dev\card-rpg` で1度開くと、`C:\Users\<ユーザー名>\.claude\projects\C--dev-card-rpg\` ができる。その中の `memory` に、`C:\dev\card-rpg-move\claude-memory` の中身を写す。
フォルダの場所（`C:\dev\card-rpg`）を変えると、メモの置き場の名前も変わるので、同じ場所に置くのが楽。

## 4. 新しい端末に要る物
- Node.js（今は v26）・git
- JDK 21（Firebase のエミュレーター用。`docs/STATUS.md` の「公開前の確認2」）
- Playwright のブラウザ: `PLAYWRIGHT_BROWSERS_PATH=C:/dev/card-rpg/node_modules/.cache/ms-playwright npx playwright install chromium`
- 公開する時だけ: `firebase login`（オーナーが行う）

## 5. 動く事の確かめ（新しい端末で）
1. `npm run typecheck`
2. `npm test`（2774 成功・12 スキップ が今の数）
3. `node scripts/smart-coop/selftest.mjs`（107/107。`NODE_PATH`・`PLAYWRIGHT_BROWSERS_PATH` の設定が要る。`scripts/README.md`）

## 6. 新しい端末で変わる事
- メモリに余裕があれば、4人の通し（空き 2.5GB が目安）を流せる。`heavy.mjs` の同時の本数（`HEAVY_MAX`）も、オーナーと相談して上げられる。
- 作業用の木（`.claude/worktrees/`）と古い作業ブランチは、運ばなくて良い（中身は main に統合済み。絵のセッションの `claude/art-gen-9b438c` は bundle に入れてある）。
- 絵のセッションなど、ほかのセッションの会話そのものは運べない。続きは、メモと `docs/` の記録から始める。
