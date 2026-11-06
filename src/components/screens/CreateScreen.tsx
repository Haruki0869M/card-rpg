// ===== キャラクター作成（職業・性別・名前） =====
import { ChevronLeft, Dices, Lock, Swords } from 'lucide-react';
import { useState } from 'react';
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
import { Bar, Heading, ItemIcon, itemSummary, Screen, STAT_LABEL } from '../ui/game';

const STATS: StatId[] = ['str', 'vit', 'int', 'per', 'dex', 'agi', 'luk'];

export function CreateScreen() {
  const draft = useBattle((s) => s.draft);
  const setDraft = useBattle((s) => s.setDraft);
  const setScreen = useBattle((s) => s.setScreen);
  const startGame = useBattle((s) => s.startGame);
  const toast = useBattle((s) => s.showToast);
  const [tab, setTab] = useState(0);
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

  return (
    <Screen>
      <div className="flex h-12 shrink-0 items-center px-2">
        <button onClick={() => setScreen(online ? 'lobby' : 'setup')} aria-label="戻る" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <Heading>キャラクター作成</Heading>
        </div>
        <div className="w-11" />
      </div>
      {/* 枠のタブ */}
      <div className={`flex shrink-0 gap-1 px-2 pt-1 ${online ? 'hidden' : ''}`}>
        {draft.party.map((p, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`btn flex h-12 min-w-0 flex-1 items-center justify-center gap-1 rounded-t-lg border-b-2 px-1 ${
              i === slot ? 'border-amber-300 bg-amber-500/15' : 'border-transparent bg-black/30'
            }`}
          >
            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#1d2440]">
              <CharacterArt classId={p.classId} gender={p.gender} face className="h-full w-full" />
            </span>
            <span className="truncate text-[12px] font-bold">{i + 1}人目</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
        {/* 職業の一覧 */}
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {CLASSES.all.map((c) => (
            <button
              key={c.id}
              onClick={() => (c.unlocked ? choose(c.id, m.gender) : toast('伝承の書で解放（M4）'))}
              className={`btn relative flex flex-col items-center rounded-lg border-2 pb-0.5 ${
                m.classId === c.id ? 'border-amber-300 bg-amber-500/20' : 'border-white/10 bg-black/30'
              }`}
            >
              <CharacterArt classId={c.id} gender={m.gender} className={`h-[66px] w-full ${c.unlocked ? '' : 'brightness-0'}`} />
              <span className="font-display text-[13px]">{c.name}</span>
              {!c.unlocked && <Lock size={18} className="absolute top-2 text-zinc-300" />}
            </button>
          ))}
        </div>

        {/* 担当プレイヤー（ローカル協力: 1台を回して遊ぶ。spec §7.3） */}
        {draft.party.length > 1 && !online && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="shrink-0 text-[12px] text-zinc-300">担当</span>
            {PLAYER_IDS.slice(0, draft.party.length).map((p) => {
              const on = (m.playerId ?? 'P1') === p;
              return (
                <button
                  key={p}
                  onClick={() => update({ playerId: p })}
                  className={`btn h-11 min-w-0 flex-1 rounded-lg border-2 text-[14px] font-bold ${on ? 'text-black' : 'bg-black/30 text-zinc-300'}`}
                  style={on ? { background: PLAYER_COLOR[p], borderColor: '#fff' } : { borderColor: `${PLAYER_COLOR[p]}88` }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        )}
        {draft.party.length > 1 && !online && <div className="text-[12px] text-zinc-500">1台を回して遊ぶ時に、誰がこのキャラを操作するか（1人で全員を操作するなら全員P1のまま）</div>}

        {/* 選んだ職業の詳細 */}
        <div className="panel panel-gold-edge mt-2 rounded-xl p-2">
          <div className="flex gap-2">
            <div className="relative w-[118px] shrink-0">
              <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(120,170,255,.35),transparent)]" />
              <CharacterArt classId={m.classId} gender={m.gender} className="idle-breathe relative block h-[150px] w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[22px] leading-7" style={{ color: cls.color }}>
                {cls.name}
              </div>
              <div className="text-[12px] text-zinc-400">
                {cls.role}・最大HP {cls.baseMaxHp}
              </div>
              <div className="mt-1 flex flex-col gap-[3px]">
                {STATS.map((k) => (
                  <div key={k} className="flex items-center gap-1 text-[12px] leading-none">
                    <span className="w-[40px] shrink-0 text-zinc-300">{STAT_LABEL[k]}</span>
                    <span className="w-[22px] text-right font-bold tabular-nums">{cls.stats[k]}</span>
                    <Bar value={cls.stats[k]} max={100} color={`linear-gradient(90deg,${cls.color}88,${cls.color})`} height={7} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-1 text-[12px] text-zinc-400">
            成功率の補正：物理 {aff.physical >= 0 ? '+' : ''}
            {aff.physical}%・魔法 {aff.magic >= 0 ? '+' : ''}
            {aff.magic}%・スキル {aff.skill >= 0 ? '+' : ''}
            {aff.skill}%
          </div>
          <div className="mt-1.5 rounded-lg bg-black/30 p-1.5 text-[12px] leading-4">
            <div>
              <span className="font-display text-amber-200">《{cls.battleAbility.name}》</span>
              <span className="text-zinc-400">（戦闘）</span> {describeAbility(cls.battleAbility)}
            </div>
            <div className="mt-1">
              <span className="font-display text-sky-200">《{cls.exploreAbility.name}》</span>
              <span className="text-zinc-400">（探索）</span> {cls.exploreAbility.description}
            </div>
          </div>
          <div className="mt-1.5 text-[12px] text-zinc-300">
            <span className="font-display text-amber-200">初期デッキ</span>：
            {cls.deck.map((d) => `${getCard(d.cardId).name}×${d.count}`).join('・')}
          </div>
          <div className="mt-1 flex flex-col gap-1">
            {Object.values(cls.startingEquipment).map((id) => {
              const it = getItem(id!);
              return (
                <div key={id} className="flex items-center gap-2 text-[12px]">
                  <ItemIcon item={it} size={30} />
                  <span className="font-bold">{it.name}</span>
                  <span className="truncate text-zinc-400">{itemSummary(it)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 性別・名前 */}
        <div className="mt-2 flex items-center gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button key={g} onClick={() => choose(m.classId, g)} className={`btn h-11 w-14 rounded-lg text-[15px] font-bold ${m.gender === g ? 'btn-gold' : 'btn-dark'}`}>
              {g === 'male' ? '男性' : '女性'}
            </button>
          ))}
          <input
            value={m.name}
            maxLength={8}
            onChange={(e) => update({ name: e.target.value })}
            aria-label="名前"
            className="h-11 min-w-0 flex-1 rounded-lg border border-amber-500/40 bg-black/50 px-2 text-[16px] text-amber-50 outline-none focus:border-amber-300"
          />
          <button onClick={reroll} aria-label="名前をおまかせ" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
            <Dices size={20} />
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
