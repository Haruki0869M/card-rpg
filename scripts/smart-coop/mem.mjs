// 賢いマルチプレイ検証 bot: 重さを測る（計画 §8-1・区切り 1-J の「メモリと1手の時間を測って報告」）
// ブラウザ（本体と、その子のプロセス全部）と、台本の node のメモリ（使っている実メモリ = WorkingSet / rss）を、一定の間隔で測って最大を覚える。
// Windows だけ（PowerShell でプロセスの一覧を読む）。ほかの OS では node だけを測る。
import { execFile } from 'node:child_process';

function processList() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,WorkingSetSize,Name | ConvertTo-Json -Compress'],
      { windowsHide: true, maxBuffer: 32 * 1024 * 1024, timeout: 20000 },
      (err, out) => {
        if (err) return resolve(null);
        try {
          resolve(JSON.parse(out));
        } catch {
          resolve(null);
        }
      },
    );
  });
}

/** browserPid の木（子・孫…）の WorkingSet の合計（バイト） */
function treeBytes(list, rootPid) {
  const kids = new Map();
  for (const p of list) {
    if (!kids.has(p.ParentProcessId)) kids.set(p.ParentProcessId, []);
    kids.get(p.ParentProcessId).push(p);
  }
  const self = list.find((p) => p.ProcessId === rootPid);
  let sum = 0;
  let n = 0;
  const stack = self ? [self] : [];
  const seen = new Set();
  while (stack.length) {
    const p = stack.pop();
    if (seen.has(p.ProcessId)) continue;
    seen.add(p.ProcessId);
    sum += Number(p.WorkingSetSize ?? 0);
    n++;
    // 測る係自身が立てた PowerShell（とその conhost）は数えない
    for (const c of kids.get(p.ProcessId) ?? []) if (!/^(powershell|conhost).exe$/i.test(c.Name ?? '')) stack.push(c);
  }
  return { bytes: sum, count: n };
}

/** 測る係。start() で始め、stop() で止めて { peak: {browserGB, nodeGB, totalGB, at}, samples } を返す */
export function memoryMeter(browser, { everyMs = 5000 } = {}) {
  // Playwright の Browser にはプロセスの番号が無いので、台本の node（process.pid）の木を測り、node 自身の分を引いた残りをブラウザとする
  // （ブラウザは台本の node の子として立つ。ほかの子のプロセスは立てていない）
  void browser;
  const pid = process.pid;
  const samples = [];
  let peak = { totalGB: 0 };
  let timer = null;
  let busy = false;
  const GB = 1024 ** 3;
  async function sample() {
    if (busy) return;
    busy = true;
    try {
      const nodeB = process.memoryUsage().rss;
      let browserB = 0;
      let procs = 0;
      if (pid && process.platform === 'win32') {
        const list = await processList();
        if (list) {
          const all = [].concat(list);
          const t = treeBytes(all, pid);
          const self = Number(all.find((p) => p.ProcessId === pid)?.WorkingSetSize ?? 0);
          browserB = Math.max(0, t.bytes - self);
          procs = t.count - 1;
        }
      }
      const s = { at: new Date().toISOString(), browserGB: +(browserB / GB).toFixed(3), nodeGB: +(nodeB / GB).toFixed(3), totalGB: +((browserB + nodeB) / GB).toFixed(3), procs };
      samples.push(s);
      if (s.totalGB > peak.totalGB) peak = s;
    } finally {
      busy = false;
    }
  }
  return {
    start() {
      sample();
      timer = setInterval(sample, everyMs);
    },
    async stop() {
      clearInterval(timer);
      await sample();
      return { peak, samples, browserPid: pid };
    },
  };
}
