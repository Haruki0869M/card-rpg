// 賢いマルチプレイ検証 bot の入口（骨組み docs/tasks/smart-coop-bot-plan.md・細かい計画 docs/tasks/smart-coop-bot-detail-plan.md）
// 中身は scripts/smart-coop/run.mjs。使い方は scripts/README.md の「賢いマルチプレイ検証 bot」。
// エミュレーター（npm run emulators）だけにつなぐ。本番の Firebase には書かない（URL に ?emu= が無ければ動かない）。
import { run } from './smart-coop/run.mjs';

process.exitCode = await run();
