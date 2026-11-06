// ===== 冒険の準備（シナリオ・難易度・人数） =====
import { ChevronLeft, ChevronRight, Lock, Users } from 'lucide-react';
import { BattleBackground } from '../../art';
import { BALANCE } from '../../data/balance';
import { CLASSES } from '../../data/classes';
import { SCENARIOS } from '../../data/scenarios';
import { autoName } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { useState } from 'react';
import { DIFFICULTIES, describeDifficulty } from '../../data/rules';
import { Heading, Screen } from '../ui/game';

/** 難易度の一覧（src/content の difficulties から） */
const DIFFICULTY = DIFFICULTIES.all.map((d) => ({ id: d.id, name: d.name, text: describeDifficulty(d) }));

export function SetupScreen() {
  const draft = useBattle((s) => s.draft);
  const setDraft = useBattle((s) => s.setDraft);
  const setScreen = useBattle((s) => s.setScreen);
  const toast = useBattle((s) => s.showToast);
  const onlineOk = useOnline((s) => s.available)();
  const createRoom = useOnline((s) => s.createRoom);
  const busy = useOnline((s) => s.busy);
  const error = useOnline((s) => s.error);
  const playerName = useOnline((s) => s.playerName);
  const setPlayerName = useOnline((s) => s.setPlayerName);
  const [online, setOnline] = useState(false);
  const setSize = (n: number) => {
    const party = draft.party.slice(0, n);
    const classes = CLASSES.all.filter((c) => c.unlocked);
    while (party.length < n) {
      const i = party.length;
      const c = classes[i % classes.length].id;
      const g = i % 2 ? 'female' : 'male';
      party.push({ classId: c, gender: g, name: autoName(c, g, i) });
    }
    setDraft({ party });
  };

  return (
    <Screen>
      <div className="flex h-12 shrink-0 items-center px-2">
        <button onClick={() => setScreen('title')} aria-label="戻る" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <Heading>冒険の準備</Heading>
        </div>
        <div className="w-11" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        <div className="font-display mt-2 text-[15px] text-amber-200">シナリオ</div>
        <div className="-mx-3 mt-1 flex snap-x gap-2 overflow-x-auto px-3 pb-1">
          {SCENARIOS.all.map((sc) => {
            const sel = draft.scenarioId === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => (sc.unlocked ? setDraft({ scenarioId: sc.id }) : toast(sc.unlockText ?? 'まだ遊べません'))}
                className={`btn relative w-[78%] shrink-0 snap-center overflow-hidden rounded-xl border-2 text-left ${sel ? 'border-amber-300' : 'border-white/10'}`}
                style={sel ? { boxShadow: '0 0 16px rgba(255,200,90,.45)' } : undefined}
              >
                <div className="relative h-[92px]">
                  <BattleBackground kind="castle" className={`absolute inset-0 h-full w-full ${sc.unlocked ? '' : 'grayscale brightness-50'}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  <div className="font-display text-outline absolute bottom-1 left-2 text-[20px] text-amber-50">{sc.name}</div>
                  {!sc.unlocked && <Lock size={28} className="absolute top-2 right-2 text-zinc-300" />}
                </div>
                <div className="bg-black/60 p-2 text-[12px] leading-4">
                  <div className="text-zinc-200">{sc.synopsis}</div>
                  <div className="mt-1 text-zinc-400">
                    推奨 {sc.recommended}・{sc.playTime}
                  </div>
                  {!sc.unlocked && <div className="mt-0.5 text-amber-300">{sc.unlockText}</div>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="font-display mt-3 text-[15px] text-amber-200">難易度</div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {DIFFICULTY.map((d) => (
            <button
              key={d.id}
              onClick={() => setDraft({ difficulty: d.id })}
              className={`btn flex h-14 flex-col items-center justify-center rounded-lg ${draft.difficulty === d.id ? 'btn-gold' : 'btn-dark'}`}
            >
              <span className="font-display text-[15px]">{d.name}</span>
              <span className="text-[12px] opacity-80">{d.text}</span>
            </button>
          ))}
        </div>

        <div className="font-display mt-3 text-[15px] text-amber-200">人数</div>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {Array.from({ length: BALANCE.maxPartySize }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setSize(n)}
              className={`btn flex h-12 items-center justify-center gap-1 rounded-lg text-[16px] font-bold ${draft.party.length === n ? 'btn-gold' : 'btn-dark'}`}
            >
              <Users size={16} /> {n}人
            </button>
          ))}
        </div>

        <div className="font-display mt-3 text-[15px] text-amber-200">遊び方</div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button onClick={() => setOnline(false)} className={`btn h-12 rounded-lg text-[14px] font-bold ${online ? 'btn-dark' : 'btn-gold'}`}>
            この端末で遊ぶ
          </button>
          <button
            onClick={() => (onlineOk ? setOnline(true) : toast('オンライン協力は準備中です（Firebase の設定が入ると遊べます）'))}
            className={`btn h-12 rounded-lg text-[14px] font-bold ${online ? 'btn-gold' : 'btn-dark'} ${onlineOk ? '' : 'text-zinc-500'}`}
          >
            オンライン協力
          </button>
        </div>
        <div className="mt-1 text-[12px] text-zinc-500">
          {online ? '部屋を作って、合言葉を仲間に教えます。仲間は自分のスマホで「部屋に参加」から入り、自分のキャラを作ります。' : '1人で全員を操作するか、1台を回して遊びます。'}
        </div>
        {online && (
          <label className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-[13px] text-zinc-300">あなたの名前</span>
            <input
              value={playerName}
              maxLength={10}
              placeholder="プレイヤー"
              onChange={(e) => setPlayerName(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-lg border border-amber-500/40 bg-black/50 px-2 text-[16px] text-amber-50 outline-none focus:border-amber-300"
            />
          </label>
        )}
        {online && error && <div className="mt-2 rounded-lg bg-red-950/70 px-3 py-2 text-[13px] text-red-100">{error}</div>}
      </div>
      <div className="shrink-0 px-3 pt-1 pb-3">
        {online ? (
          <button
            disabled={busy}
            onClick={async () => {
              if (await createRoom({ scenarioId: draft.scenarioId, difficulty: draft.difficulty, partySize: draft.party.length })) setScreen('lobby');
            }}
            className="btn btn-gold font-display flex h-14 w-full items-center justify-center gap-2 rounded-xl text-[19px] disabled:opacity-50"
          >
            <Users size={22} /> {busy ? 'つないでいます…' : '部屋を作る'}
          </button>
        ) : (
          <button onClick={() => setScreen('create')} className="btn btn-gold font-display flex h-14 w-full items-center justify-center gap-2 rounded-xl text-[19px]">
            キャラクター作成へ <ChevronRight size={22} />
          </button>
        )}
      </div>
    </Screen>
  );
}
