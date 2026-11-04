// ===== メニュー・戦闘ログ・山札/捨札・テスト戦闘の設定・リセット確認 =====
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Minus, Plus, RotateCcw, ScrollText, Swords, Users, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CharacterArt, EnemyArt } from '../art';
import { getCard } from '../data/cards';
import { CLASSES } from '../data/classes';
import { ENCOUNTERS } from '../data/enemies';
import { findAlly } from '../engine';
import { type BattleConfig, autoName, member } from '../store/battleConfig';
import { useBattle } from '../store/battleStore';
import type { Gender } from '../types';
import { CATEGORY_STYLE, EffectChip } from './ui/icons';

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-black/65"
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
        className="panel safe-pad flex max-h-[86%] flex-col rounded-t-2xl border-b-0"
      >
        <div className="flex items-center justify-between px-3 pt-1">
          <div className="font-display text-[18px] text-amber-100">{title}</div>
          <button onClick={onClose} aria-label="閉じる" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
            <X size={22} />
          </button>
        </div>
        <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="btn btn-dark flex h-12 w-full items-center justify-between rounded-lg px-3 text-[14px]">
      <span>{label}</span>
      <span className={`flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${on ? 'bg-amber-500' : 'bg-zinc-700'}`}>
        <span className={`h-6 w-6 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

function MenuSheet() {
  const battle = useBattle((s) => s.battle);
  const settings = useBattle((s) => s.settings);
  const setSettings = useBattle((s) => s.setSettings);
  const newBattle = useBattle((s) => s.newBattle);
  const openSheet = useBattle((s) => s.openSheet);
  const setConfirmReset = useBattle((s) => s.setConfirmReset);
  const row = 'btn btn-dark flex h-12 w-full items-center gap-2 rounded-lg px-3 text-[14px] font-bold';
  return (
    <BottomSheet title="メニュー" onClose={() => openSheet(null)}>
      <div className="flex flex-col gap-2">
        <button onClick={() => openSheet('setup')} className={row}>
          <Users size={18} className="text-amber-300" /> テスト戦闘の設定（パーティ・敵）
          <ChevronRight size={18} className="ml-auto" />
        </button>
        <Toggle label="高速モード（演出2倍速）" on={settings.fastMode} onChange={(v) => setSettings({ fastMode: v })} />
        <Toggle label="振動" on={settings.vibration} onChange={(v) => setSettings({ vibration: v })} />
        <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-[14px]">
          <span>
            シード <span className="font-mono font-bold text-amber-200 select-text">{battle.seed}</span>
          </span>
          <button onClick={() => newBattle({ sameSeed: true })} className="btn btn-dark h-11 rounded-lg px-3 text-[13px] font-bold">
            同じシードで再戦
          </button>
        </div>
        <button onClick={() => openSheet('log')} className={row}>
          <ScrollText size={18} className="text-amber-300" /> 戦闘ログ
          <ChevronRight size={18} className="ml-auto" />
        </button>
        <button onClick={() => setConfirmReset(true)} className="btn flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-red-400/50 bg-red-950/70 text-[14px] font-bold text-red-100">
          <RotateCcw size={18} /> バトルリセット
        </button>
        <div className="pt-1 text-center text-[12px] text-zinc-500">長押しでカード・敵・状態異常・味方の詳細を表示</div>
      </div>
    </BottomSheet>
  );
}

/** テスト戦闘の設定（M2でタイトル〜キャラクター作成に置き換える） */
function SetupSheet() {
  const config = useBattle((s) => s.config);
  const newBattle = useBattle((s) => s.newBattle);
  const openSheet = useBattle((s) => s.openSheet);
  const [draft, setDraft] = useState<BattleConfig>(() => structuredClone(config));
  const classes = CLASSES.all.filter((c) => c.unlocked);

  const setMember = (i: number, classId: string, gender: Gender) =>
    setDraft((d) => ({
      ...d,
      party: d.party.map((m, j) => (j === i ? { ...m, classId, gender, name: autoName(classId, gender, i) } : m)),
    }));
  const add = () =>
    setDraft((d) =>
      d.party.length >= 4 ? d : { ...d, party: [...d.party, member(classes[d.party.length % classes.length].id, d.party.length % 2 ? 'female' : 'male', d.party.length)] },
    );
  const remove = () => setDraft((d) => (d.party.length <= 1 ? d : { ...d, party: d.party.slice(0, -1) }));

  return (
    <BottomSheet title="テスト戦闘の設定" onClose={() => openSheet('menu')}>
      <div className="flex items-center justify-between">
        <div className="font-display text-[15px] text-amber-200">パーティ（{draft.party.length}人）</div>
        <div className="flex gap-2">
          <button onClick={remove} disabled={draft.party.length <= 1} aria-label="人数を減らす" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
            <Minus size={20} />
          </button>
          <button onClick={add} disabled={draft.party.length >= 4} aria-label="人数を増やす" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
            <Plus size={20} />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {draft.party.map((m, i) => (
          <div key={i} className="rounded-xl border border-amber-500/25 bg-black/30 p-2">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-display text-[14px] text-amber-100">{i + 1}人目</span>
              <span className="text-[13px] text-zinc-300">{m.name}</span>
              <div className="ml-auto flex gap-1">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setMember(i, m.classId, g)}
                    className={`btn h-11 w-11 rounded-lg text-[14px] font-bold ${m.gender === g ? 'btn-gold' : 'btn-dark'}`}
                  >
                    {g === 'male' ? '男' : '女'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {classes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setMember(i, c.id, m.gender)}
                  className={`btn flex w-[74px] shrink-0 flex-col items-center rounded-lg border p-0.5 ${
                    m.classId === c.id ? 'border-amber-300 bg-amber-500/20' : 'border-white/10 bg-black/30'
                  }`}
                >
                  <CharacterArt classId={c.id} gender={m.gender} className="h-[64px] w-[54px]" />
                  <span className="font-display text-[13px]">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="font-display mt-3 text-[15px] text-red-200">敵の組み合わせ</div>
      <div className="mt-1 flex flex-col gap-1">
        {ENCOUNTERS.all.map((enc) => (
          <button
            key={enc.id}
            onClick={() => setDraft((d) => ({ ...d, encounterId: enc.id }))}
            className={`btn flex min-h-12 items-center gap-2 rounded-lg border px-2 text-left text-[14px] ${
              draft.encounterId === enc.id ? 'border-red-300 bg-red-900/40' : 'border-white/10 bg-black/30'
            }`}
          >
            <span className="flex -space-x-3">
              {enc.enemies.map((e, k) => (
                <EnemyArt key={k} defId={e.defId} className="h-[40px] w-[34px]" />
              ))}
            </span>
            {enc.name}
          </button>
        ))}
      </div>
      <button onClick={() => newBattle({ config: draft })} className="btn btn-gold font-display mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[17px]">
        <Swords size={20} /> この設定で戦闘開始
      </button>
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
          <div key={l.id} className={l.text.startsWith('---') ? 'font-display pt-1 text-amber-300' : 'text-zinc-200'}>
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
  return (
    <BottomSheet title={`${ally?.name ?? ''}の${kind === 'draw' ? '山札（順不同）' : '捨札'} ${pile?.length ?? 0}枚`} onClose={() => openSheet(null)}>
      {rows.length === 0 && <div className="py-4 text-center text-[13px] text-zinc-500">カードがありません</div>}
      <div className="flex flex-col gap-1">
        {rows.map(([id, n]) => {
          const card = getCard(id);
          const cat = CATEGORY_STYLE[card.category];
          const top = card.tiers[card.tiers.length - 1];
          return (
            <div key={id} className="flex items-center gap-2 rounded-lg border-l-4 bg-black/30 px-2 py-1.5 text-[13px]" style={{ borderColor: cat.frame }}>
              <span className="w-7 font-bold text-amber-200">×{n}</span>
              <span className="font-display w-28 shrink-0">{card.name}</span>
              <span className="flex flex-wrap items-center gap-x-1 text-[12px] text-zinc-400">
                コスト{card.cost}・{card.slots}枠・完全:
                {top.effects.map((e, j) => (
                  <EffectChip key={j} e={e} />
                ))}
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
      <div onClick={(e) => e.stopPropagation()} className="panel panel-gold-edge w-full max-w-xs rounded-2xl p-4">
        <div className="font-display text-[18px]">バトルをリセットしますか？</div>
        <div className="mt-1 text-[13px] text-zinc-400">現在の戦闘は失われ、新しいシードで最初からになります。</div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setConfirmReset(false)} className="btn btn-dark h-12 flex-1 rounded-lg font-bold">
            やめる
          </button>
          <button onClick={() => newBattle()} className="btn h-12 flex-1 rounded-lg border border-red-300/60 bg-red-700 font-bold">
            リセット
          </button>
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
        {sheet === 'setup' && <SetupSheet key="setup" />}
        {sheet === 'log' && <LogSheet key="log" />}
        {(sheet === 'draw' || sheet === 'discard') && <PileSheet key={sheet} kind={sheet} />}
      </AnimatePresence>
      <AnimatePresence>{confirmReset && <ConfirmReset />}</AnimatePresence>
    </>
  );
}
