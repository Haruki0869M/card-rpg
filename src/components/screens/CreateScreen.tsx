// ===== キャラクター作成（職業・性別・名前） =====
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Compass, Dices, Lock, Swords } from 'lucide-react';
import { useRef, useState } from 'react';
import { CharacterArt } from '../../art';
import { getCard } from '../../data/cards';
import { CLASSES, getClass } from '../../data/classes';
import { getItem } from '../../data/items';
import { affinityOf, describeAbility } from '../../engine';
import { PLAYER_COLOR } from '../../data/theme';
import { autoName, PLAYER_IDS } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import type { Gender, StatId } from '../../types';
import { ItemIcon, itemSummary, Screen, STAT_LABEL } from '../ui/game';
import { Motes, SectionTitle, TopBar } from '../ui/fancy';
import { CATEGORY_STYLE } from '../ui/icons';

const STATS: StatId[] = ['str', 'vit', 'int', 'per', 'dex', 'agi', 'luk'];

export function CreateScreen() {
  const draft = useBattle((s) => s.draft);
  const setDraft = useBattle((s) => s.setDraft);
  const setScreen = useBattle((s) => s.setScreen);
  const startGame = useBattle((s) => s.startGame);
  const toast = useBattle((s) => s.showToast);
  const [tab, setTab] = useState(0);
  // 見て決めたキャラ（タブにチェック。まだ見ていないキャラには「未設定」）
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const openTab = (i: number) => {
    setTab(i);
    setSeen((x) => new Set(x).add(i));
  };
  // オンライン協力の待合室から: 1人分だけ作って、その枠に入れる
  const editing = useOnline((s) => s.editingSlot);
  const claimSlot = useOnline((s) => s.claimSlot);
  const online = editing !== null;
  const slot = Math.min(tab, draft.party.length - 1);
  const m = draft.party[slot];
  const cls = getClass(m.classId);
  const aff = affinityOf({ classId: cls.id });

  const update = (patch: Partial<typeof m>) =>
    setDraft({ party: draft.party.map((x, i) => (i === slot ? { ...x, ...patch } : x)) });
  const choose = (classId: string, gender: Gender) => update({ classId, gender, name: autoName(classId, gender, slot) });
  const reroll = () => {
    const list = getClass(m.classId).names[m.gender];
    const i = list.indexOf(m.name);
    update({ name: list[(i + 1) % list.length] });
  };

  // 職業を左右に切り替える（スワイプ・矢印。解放済みの職業だけ）
  const unlocked = CLASSES.all.filter((c) => c.unlocked);
  const step = (d: number) => {
    const i = unlocked.findIndex((c) => c.id === m.classId);
    const next = unlocked[(i + d + unlocked.length) % unlocked.length];
    choose(next.id, m.gender);
  };
  const swipe = useSwipe((d) => step(d));
  const [showDeck, setShowDeck] = useState(false);

  return (
    <Screen>
      <TopBar title="キャラクター作成" onBack={() => setScreen(online ? 'lobby' : 'setup')} />
      {/* 何人目のキャラか */}
      {!online && draft.party.length > 1 && (
        <div className="flex shrink-0 gap-1.5 px-3 pt-1">
          {draft.party.map((p, i) => (
            <button
              key={i}
              onClick={() => openTab(i)}
              className={`btn relative flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 ${i === slot ? 'btn-gold' : 'btn-dark'}`}
              data-tab-done={seen.has(i) || undefined}
            >
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-black/40 bg-[#1d2440]">
                <CharacterArt classId={p.classId} gender={p.gender} face className="h-full w-full" />
              </span>
              <span className="truncate text-[12px] font-bold">{i + 1}人目</span>
              {seen.has(i) ? (
                <span className="absolute -top-1.5 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-emerald-100 bg-emerald-500 shadow-[0_0_6px_rgba(80,220,140,.8)]">
                  <Check size={12} strokeWidth={3.5} className="text-emerald-950" />
                </span>
              ) : (
                <span className="absolute -top-1.5 -right-1 rounded-full bg-red-600 px-1.5 text-[12px] leading-4 font-bold text-white">未設定</span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
        {/* 舞台: 選んだ職業の全身を大きく。左右にスワイプで切り替え */}
        <div {...swipe} className="relative mt-2 h-[300px] touch-pan-y overflow-hidden rounded-2xl border border-amber-300/25" data-class-stage style={{ background: `radial-gradient(70% 60% at 50% 38%, ${cls.color}40, transparent 70%), linear-gradient(180deg,#1a1630,#0b0912)` }}>
          <Motes count={8} color={cls.color} />
          <div className="absolute inset-x-[18%] bottom-[18px] h-[34px] rounded-[50%]" style={{ background: `radial-gradient(closest-side, ${cls.color}88, transparent)` }} />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={cls.id + m.gender} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.16 }} className="absolute inset-x-0 top-[6px] bottom-[10px] flex justify-center">
              <CharacterArt classId={cls.id} gender={m.gender} className="idle-breathe h-full w-auto max-w-full" />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-x-0 bottom-0 h-[90px] bg-gradient-to-t from-black/90 to-transparent" />
          <div className="absolute bottom-2 left-3">
            <div className="font-display text-outline text-[30px] leading-9" style={{ color: cls.color, filter: `drop-shadow(0 0 8px ${cls.color}88)` }}>
              {cls.name}
            </div>
            <div className="text-[13px] text-zinc-200">
              {cls.role}・最大HP {cls.baseMaxHp}
            </div>
          </div>
          {/* 性別 */}
          <div className="absolute top-2 right-2 flex gap-1">
            {(['male', 'female'] as const).map((g) => (
              <button key={g} onClick={() => choose(m.classId, g)} className={`btn h-11 w-11 rounded-full text-[14px] font-bold ${m.gender === g ? 'btn-gold' : 'btn-dark'}`} aria-label={g === 'male' ? '男性' : '女性'}>
                {g === 'male' ? '男' : '女'}
              </button>
            ))}
          </div>
          <button onClick={() => step(-1)} aria-label="前の職業" className="btn btn-dark absolute top-[42%] left-1.5 flex h-11 w-11 items-center justify-center rounded-full opacity-90">
            <ChevronLeft size={22} />
          </button>
          <button onClick={() => step(1)} aria-label="次の職業" className="btn btn-dark absolute top-[42%] right-1.5 flex h-11 w-11 items-center justify-center rounded-full opacity-90">
            <ChevronRight size={22} />
          </button>
        </div>

        {/* 職業の一覧（顔のチップ。数が増えても横にスクロール） */}
        <div className="-mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1" data-class-list>
          {CLASSES.all.map((c) => {
            const on = m.classId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => (c.unlocked ? choose(c.id, m.gender) : toast('伝承の書で解放（M4）'))}
                className="btn relative flex w-[64px] shrink-0 flex-col items-center gap-0.5"
              >
                <span
                  className="relative h-[52px] w-[52px] overflow-hidden rounded-full"
                  style={{
                    border: '2px solid transparent',
                    background: on ? `linear-gradient(#1d2440,#1d2440) padding-box, linear-gradient(160deg,#fff2c0,${c.color}) border-box` : 'linear-gradient(#1d2440,#1d2440) padding-box, linear-gradient(160deg,#6a5a3a,#2a2418) border-box',
                    boxShadow: on ? `0 0 10px ${c.color}` : undefined,
                  }}
                >
                  <CharacterArt classId={c.id} gender={m.gender} face className={`h-full w-full ${c.unlocked ? '' : 'brightness-0'}`} />
                  {!c.unlocked && <Lock size={16} className="absolute inset-0 m-auto text-zinc-300" />}
                </span>
                <span className={`font-display truncate text-[12px] ${on ? 'text-amber-100' : 'text-zinc-400'}`}>{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* 担当プレイヤー（ローカル協力: 1台を回して遊ぶ。spec §7.3） */}
        {draft.party.length > 1 && !online && (
          <>
            <SectionTitle>担当プレイヤー</SectionTitle>
            <div className="flex items-center gap-1.5">
              {PLAYER_IDS.slice(0, draft.party.length).map((p) => {
                const on = (m.playerId ?? 'P1') === p;
                return (
                  <button
                    key={p}
                    onClick={() => update({ playerId: p })}
                    className={`btn flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full text-[14px] font-bold ${on ? 'btn-gold' : 'btn-dark text-zinc-300'}`}
                  >
                    {/* 席の色は小さな宝石で（世界観から浮かないように） */}
                    <span className="h-[10px] w-[10px] rotate-45 border border-white/70" style={{ background: PLAYER_COLOR[p], boxShadow: `0 0 6px ${PLAYER_COLOR[p]}` }} />
                    {p}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 text-[12px] leading-4 text-zinc-500">1台を回して遊ぶ時に、誰がこのキャラを操作するか（1人で全員を操作するなら全員P1のまま）</div>
          </>
        )}

        <SectionTitle>能力</SectionTitle>
        <div className="flex items-center gap-2">
          <StatRadar values={STATS.map((k) => cls.stats[k])} labels={STATS.map((k) => STAT_LABEL[k])} color={cls.color} />
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-[12px]">
            {(
              [
                ['物理', aff.physical, '#ff9a7a'],
                ['魔法', aff.magic, '#b8a8ff'],
                ['スキル', aff.skill, '#8affc8'],
              ] as const
            ).map(([label, v, c]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-black/35 px-2 py-1">
                <span style={{ color: c }}>{label}の成功率</span>
                <b className={v > 0 ? 'text-emerald-300' : v < 0 ? 'text-red-300' : 'text-zinc-300'}>
                  {v >= 0 ? '+' : ''}
                  {v}%
                </b>
              </div>
            ))}
          </div>
        </div>

        <SectionTitle>特殊能力</SectionTitle>
        <div className="grid grid-cols-1 gap-1.5">
          <AbilityCard Icon={Swords} kind="戦闘" color="#ffc86a" name={cls.battleAbility.name} text={describeAbility(cls.battleAbility)} />
          <AbilityCard Icon={Compass} kind="探索" color="#8ad0ff" name={cls.exploreAbility.name} text={cls.exploreAbility.description} />
        </div>

        <button onClick={() => setShowDeck((v) => !v)} className="mt-3 flex h-11 w-full items-center gap-2 text-left">
          <span className="h-[9px] w-[9px] rotate-45 border border-amber-200 bg-gradient-to-br from-amber-100 to-amber-600" />
          <span className="font-display text-[16px] text-amber-100">初期デッキと装備</span>
          <span className="h-px flex-1 bg-gradient-to-r from-amber-400/70 to-transparent" />
          <ChevronDown size={18} className={`text-amber-200 transition-transform ${showDeck ? 'rotate-180' : ''}`} />
        </button>
        {showDeck && (
          <div className="panel rounded-xl p-2 text-[12px]">
            <div className="flex flex-wrap gap-1" data-deck-tags>
              {cls.deck.map((d) => (
                <span key={d.cardId} className="rounded-full border bg-black/50 px-2 py-0.5 text-[12px] leading-4 text-amber-50" style={{ borderColor: CATEGORY_STYLE[getCard(d.cardId).category].glow, boxShadow: `inset 0 0 6px ${CATEGORY_STYLE[getCard(d.cardId).category].frame}88` }}>
                  {getCard(d.cardId).name}
                  <b className="ml-1 text-amber-300">×{d.count}</b>
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex flex-col gap-1">
              {Object.values(cls.startingEquipment).map((id) => {
                const it = getItem(id!);
                return (
                  <div key={id} className="flex items-center gap-2">
                    <ItemIcon item={it} size={32} />
                    <span className="font-bold">{it.name}</span>
                    <span className="truncate text-zinc-400">{itemSummary(it)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <SectionTitle>名前</SectionTitle>
        <div className="flex items-center gap-2">
          <input
            value={m.name}
            maxLength={8}
            onChange={(e) => update({ name: e.target.value })}
            aria-label="名前"
            className="h-12 min-w-0 flex-1 rounded-xl border border-amber-500/50 bg-black/50 px-3 text-[17px] text-amber-50 outline-none focus:border-amber-300 focus:shadow-[0_0_10px_rgba(255,200,90,.4)]"
          />
          <button onClick={reroll} aria-label="名前をおまかせ" className="btn btn-dark flex h-12 w-12 items-center justify-center rounded-xl">
            <Dices size={22} />
          </button>
        </div>
      </div>
      <div className="shrink-0 px-3 pt-1 pb-3">
        <button
          onClick={async () => {
            if (draft.party.some((p) => !p.name.trim())) return toast('名前を入力してください');
            if (online) {
              const { classId, gender, name } = draft.party[0];
              await claimSlot(editing, { classId, gender, name: name.trim() });
              useOnline.setState({ editingSlot: null });
              setScreen('lobby');
              return;
            }
            startGame();
          }}
          className="btn btn-gold font-display flex h-14 w-full items-center justify-center gap-2 rounded-xl text-[19px]"
        >
          <Swords size={22} /> {online ? 'このキャラに決める' : '冒険に出発'}
        </button>
      </div>
    </Screen>
  );
}

/** 左右のスワイプ（指を40px以上横に動かしたら、左へ=次・右へ=前） */
function useSwipe(on: (dir: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => (start.current = { x: e.clientX, y: e.clientY }),
    onPointerUp: (e: React.PointerEvent) => {
      const s0 = start.current;
      start.current = null;
      if (!s0) return;
      const dx = e.clientX - s0.x;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s0.y)) on(dx < 0 ? 1 : -1);
    },
  };
}

/** 能力値のレーダーチャート（0〜100） */
function StatRadar({ values, labels, color }: { values: number[]; labels: string[]; color: string }) {
  const n = values.length;
  const R = 52;
  const c = 75;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r, c + Math.sin(a) * r];
  };
  const poly = (r: (i: number) => number) => values.map((_, i) => pt(i, r(i)).join(',')).join(' ');
  return (
    <svg viewBox="-30 -6 210 164" className="h-[154px] w-[196px] shrink-0" data-radar>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={poly(() => R * k)} fill="none" stroke="rgba(255,220,150,.18)" strokeWidth={1} />
      ))}
      {values.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,220,150,.15)" />;
      })}
      <polygon points={poly((i) => (R * Math.min(100, values[i])) / 100)} fill={`${color}55`} stroke={color} strokeWidth={2} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      {labels.map((l, i) => {
        const [x, y] = pt(i, R + 14);
        return (
          <text key={i} x={x} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#e8dcc0">
            {l}
            <tspan fill={color} fontSize={12}>
              {values[i]}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

/** 特殊能力のカード（戦闘・探索） */
function AbilityCard({ Icon, kind, color, name, text }: { Icon: typeof Swords; kind: string; color: string; name: string; text: string }) {
  return (
    <div className="flex gap-2 rounded-xl border p-2" style={{ borderColor: `${color}55`, background: `linear-gradient(100deg, ${color}1f, rgba(0,0,0,.35) 45%)` }}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: color, background: 'rgba(0,0,0,.4)', boxShadow: `0 0 8px ${color}66` }}>
        <Icon size={20} style={{ color }} />
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[16px]" style={{ color }}>
            {name}
          </span>
          <span className="text-[12px] text-zinc-400">{kind}</span>
        </div>
        <div className="text-[12px] leading-4 text-zinc-200">{text}</div>
      </div>
    </div>
  );
}
