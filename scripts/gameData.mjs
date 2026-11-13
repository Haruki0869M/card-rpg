// 確認スクリプトから、ゲームのデータ（src の TypeScript）をそのまま読むための道具。
// 転職のレベルや条件の数をスクリプトに直に書かず、ゲームと同じ値を使う（数が変わってもスクリプトを直さなくてよい）。
// 使い方: const { jobLevel, jobRequires } = await loadJobData();
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** ランダムダンジョンの黄金箱の専用の装備の id の一覧（src/content/common/items/goldenBox.ts。数が増えてもスクリプトを直さなくてよい） */
export async function loadGoldenBoxIds() {
  const server = await createServer({ root: ROOT, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
  try {
    const { goldenBoxItems } = await server.ssrLoadModule('/src/content/common/items/goldenBox.ts');
    return goldenBoxItems.map((i) => i.id);
  } finally {
    await server.close();
  }
}

/** 転職のデータを読む。jobLevel(id) = そのジョブへ転職できるレベル、jobRequires(id) = 条件（{ feat, count, text }。無ければ undefined） */
export async function loadJobData() {
  const server = await createServer({ root: ROOT, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
  try {
    const { jobChangeLevel } = await server.ssrLoadModule('/src/engine/game/jobs.ts');
    const { getClass } = await server.ssrLoadModule('/src/data/classes/index.ts');
    const get = (id) => { const c = getClass(id); if (!c) throw new Error(`ジョブ ${id} がデータに無い`); return c; };
    return { jobLevel: (id) => jobChangeLevel(get(id)), jobRequires: (id) => { const r = get(id).requires; return r ? { ...r } : undefined; } };
  } finally {
    await server.close();
  }
}
