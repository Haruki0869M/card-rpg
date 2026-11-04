import { AnimatePresence, motion } from 'framer-motion';
import { ScrollText, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { getCard } from '../data/cards';
import { getCharacter } from '../data/characters';
import { findAlly } from '../engine';
import { useBattle } from '../store/battleStore';
import { shortTier } from './format';

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ duration: 0.12 }}
        onClick={(e) => e.stopPropagation()}
        className="safe-pad flex max-h-[80%] flex-col rounded-t-2xl border-t border-amber-400/40 bg-stone-950"
      >
        <div className="flex items-center justify-between px-3 pt-1">
          <div className="text-[15px] font-bold text-amber-100">{title}</div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-300"
          >
            <X size={22} />
          </motion.button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onChange(!on)}
      className="flex h-12 w-full items-center justify-between rounded-lg bg-white/5 px-3 text-[14px]"
    >
      <span>{label}</span>
      <span className={`flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${on ? 'bg-amber-500' : 'bg-zinc-700'}`}>
        <span className={`h-6 w-6 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </motion.button>
  );
}

function MenuSheet() {
  const battle = useBattle((s) => s.battle);
  const settings = useBattle((s) => s.settings);
  const setSettings = useBattle((s) => s.setSettings);
  const newBattle = useBattle((s) => s.newBattle);
  const openSheet = useBattle((s) => s.openSheet);
  const setConfirmReset = useBattle((s) => s.setConfirmReset);
  const btn = 'flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-bold';
  return (
    <BottomSheet title="メニュー" onClose={() => openSheet(null)}>
      <div className="flex flex-col gap-2">
        <div className="text-[12px] text-zinc-400">パーティ人数（切り替えるとバトルをリセット）</div>
        <div className="flex gap-2">
          {([2, 4] as const).map((n) => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.95 }}
              onClick={() => n !== battle.partySize && newBattle({ partySize: n })}
              className={`${btn} ${battle.partySize === n ? 'bg-amber-500 text-stone-950' : 'bg-white/5 text-zinc-200'}`}
            >
              {n}人モード
            </motion.button>
          ))}
        </div>
        <Toggle label="高速モード（演出2倍速）" on={settings.fastMode} onChange={(v) => setSettings({ fastMode: v })} />
        <Toggle label="振動" on={settings.vibration} onChange={(v) => setSettings({ vibration: v })} />
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-[14px]">
          <span>
            シード <span className="font-mono font-bold text-amber-200 select-text">{battle.seed}</span>
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => newBattle({ sameSeed: true })}
            className="h-11 rounded-lg bg-sky-800 px-3 text-[13px] font-bold"
          >
            同じシードで再戦
          </motion.button>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => openSheet('log')} className={`${btn} bg-white/5`}>
          <ScrollText size={18} /> 戦闘ログ
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setConfirmReset(true)} className={`${btn} bg-red-900/70 text-red-100`}>
          バトルリセット
        </motion.button>
        <div className="pt-1 text-center text-[12px] text-zinc-500">長押しでカード・敵・状態異常の詳細を表示</div>
      </div>
    </BottomSheet>
  );
}

function LogSheet() {
  const log = useBattle((s) => s.battle.log);
  const openSheet = useBattle((s) => s.openSheet);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView(), []);
  return (
    <BottomSheet title="戦闘ログ" onClose={() => openSheet('menu')}>
      <div className="flex flex-col gap-1 text-[12px] leading-5 select-text">
        {log.map((l) => (
          <div key={l.id} className={l.text.startsWith('---') ? 'pt-1 text-amber-300' : 'text-zinc-200'}>
            {!l.text.startsWith('---') && <span className="mr-1 text-zinc-500">T{l.turn}</span>}
            {l.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </BottomSheet>
  );
}

function PileSheet({ kind }: { kind: 'draw' | 'discard' }) {
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const openSheet = useBattle((s) => s.openSheet);
  const ally = findAlly(battle, activeId);
  const pile = kind === 'draw' ? ally?.drawPile : ally?.discard;
  // 山札は順番が分からないよう名前順にまとめる
  const counts = new Map<string, number>();
  for (const c of pile ?? []) counts.set(c.cardId, (counts.get(c.cardId) ?? 0) + 1);
  const rows = [...counts.entries()].sort((a, b) => getCard(a[0]).name.localeCompare(getCard(b[0]).name, 'ja'));
  const name = ally ? getCharacter(ally.id).name : '';
  return (
    <BottomSheet
      title={`${name}の${kind === 'draw' ? '山札（順不同）' : '捨札'} ${pile?.length ?? 0}枚`}
      onClose={() => openSheet(null)}
    >
      {rows.length === 0 && <div className="py-4 text-center text-[13px] text-zinc-500">カードがありません</div>}
      <div className="flex flex-col gap-1">
        {rows.map(([id, n]) => {
          const card = getCard(id);
          return (
            <div key={id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-[13px]">
              <span className="w-7 font-bold text-amber-200">×{n}</span>
              <span className="w-28 shrink-0 font-bold">{card.name}</span>
              <span className="truncate text-[12px] text-zinc-400">
                💧{card.cost} / {card.slots}枠 / 最高 {shortTier(card.tiers[card.tiers.length - 1])}
              </span>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}

function ConfirmReset() {
  const setConfirmReset = useBattle((s) => s.setConfirmReset);
  const newBattle = useBattle((s) => s.newBattle);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 px-6"
      onClick={(e) => {
        e.stopPropagation();
        setConfirmReset(false);
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl border border-red-400/50 bg-stone-900 p-4">
        <div className="text-[16px] font-bold">バトルをリセットしますか？</div>
        <div className="mt-1 text-[13px] text-zinc-400">現在の戦闘は失われ、新しいシードで最初からになります。</div>
        <div className="mt-4 flex gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmReset(false)} className="h-12 flex-1 rounded-lg bg-zinc-700 font-bold">
            やめる
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => newBattle()} className="h-12 flex-1 rounded-lg bg-red-700 font-bold">
            リセット
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export function Sheets() {
  const sheet = useBattle((s) => s.sheet);
  const confirmReset = useBattle((s) => s.confirmReset);
  return (
    <>
      <AnimatePresence>
        {sheet === 'menu' && <MenuSheet key="menu" />}
        {sheet === 'log' && <LogSheet key="log" />}
        {(sheet === 'draw' || sheet === 'discard') && <PileSheet key={sheet} kind={sheet} />}
      </AnimatePresence>
      <AnimatePresence>{confirmReset && <ConfirmReset />}</AnimatePresence>
    </>
  );
}
