// ===== 冒険の準備（シナリオ・難易度・人数） =====
import { ChevronRight, Feather, Globe, Lock, Skull, Smartphone, Swords, UserRound, Users, type LucideIcon } from 'lucide-react';
import { BattleBackground } from '../../art';
import { BALANCE } from '../../data/balance';
import { CLASSES } from '../../data/classes';
import { SCENARIOS } from '../../data/scenarios';
import { autoName } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { useState } from 'react';
import { DIFFICULTIES, describeDifficulty } from '../../data/rules';
import { Screen } from '../ui/game';
import { ChoiceTile, Motes, SectionTitle, TopBar } from '../ui/fancy';

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
    const classes = CLASSES.all.filter((c) => c.unlocked && (c.tier ?? 'base') === 'base');
    while (party.length < n) {
      const i = party.length;
      const c = classes[i % classes.length].id;
      const g = i % 2 ? 'female' : 'male';
      party.push({ classId: c, gender: g, name: autoName(c, g, i) });
    }
    setDraft({ party });
  };

  const DIFF_LOOK: Record<string, { Icon: LucideIcon; accent: string }> = {
    easy: { Icon: Feather, accent: '#8ae0a0' },
    normal: { Icon: Swords, accent: '#ffd06a' },
    hard: { Icon: Skull, accent: '#ff7a7a' },
  };

  return (
    <Screen>
      {/* 背景: 一枚絵をぼかして暗く敷き、光の粒を舞わせる */}
      <BattleBackground kind="title" className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-110 opacity-25 blur-[3px]" />
      <Motes count={12} />
      <TopBar title="冒険の準備" onBack={() => setScreen('title')} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        <SectionTitle right={<span className="text-[12px] text-zinc-400">横にスワイプ</span>}>シナリオ</SectionTitle>
        <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[9%] pt-1 pb-2" data-scenarios>
          {SCENARIOS.all.map((sc) => {
            const sel = draft.scenarioId === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => (sc.unlocked ? setDraft({ scenarioId: sc.id }) : toast(sc.unlockText ?? 'まだ遊べません'))}
                className="btn relative h-[214px] w-[82%] shrink-0 snap-center overflow-hidden rounded-2xl text-left"
                style={{
                  border: '2px solid transparent',
                  background: sel ? 'linear-gradient(#000,#000) padding-box, linear-gradient(160deg,#fff2c0,#d9a33a 45%,#7a4a0a) border-box' : 'linear-gradient(#000,#000) padding-box, linear-gradient(160deg,#6a5a3a,#2a2418) border-box',
                  boxShadow: sel ? '0 0 22px rgba(255,200,90,.5), 0 6px 14px rgba(0,0,0,.6)' : '0 6px 14px rgba(0,0,0,.6)',
                }}
              >
                <BattleBackground kind={sc.art ?? 'title'} className={`absolute inset-0 h-full w-full ${sc.unlocked ? '' : 'blur-[2px] grayscale brightness-[.35]'}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                {!sc.unlocked && (
                  // カードの上の方に横1列で置き、下の題名・あらすじと重ならないようにする
                  <div className="absolute inset-x-3 top-3 flex items-center gap-1.5 text-zinc-200" data-scenario-lock>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-zinc-400/70 bg-black/60">
                      <Lock size={18} />
                    </span>
                    <span className="min-w-0 rounded-full bg-black/70 px-2 text-[12px] leading-5 text-amber-200">{sc.unlockText}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="font-display text-outline text-[24px] leading-8 text-amber-50">{sc.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-[13px] leading-[18px] text-zinc-200">{sc.synopsis}</div>
                  <div className="mt-1.5 flex gap-1.5 text-[12px]">
                    <span className="rounded-full border border-amber-300/40 bg-black/60 px-2 text-amber-100">推奨 {sc.recommended}</span>
                    <span className="rounded-full border border-amber-300/40 bg-black/60 px-2 text-amber-100">{sc.playTime}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-center gap-1.5">
          {SCENARIOS.all.map((sc) => (
            <span key={sc.id} className={`h-1.5 rounded-full transition-all ${draft.scenarioId === sc.id ? 'w-5 bg-amber-300' : 'w-1.5 bg-zinc-600'}`} />
          ))}
        </div>

        <SectionTitle>難易度</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTY.map((d) => (
            <ChoiceTile key={d.id} selected={draft.difficulty === d.id} onClick={() => setDraft({ difficulty: d.id })} Icon={DIFF_LOOK[d.id]?.Icon ?? Swords} accent={DIFF_LOOK[d.id]?.accent} label={d.name} />
          ))}
        </div>
        {/* 説明はボタンの下に（ボタンの中だと長い文がはみ出すため） */}
        <div className="mt-1.5 rounded-lg border border-amber-300/15 bg-black/40 px-2 py-1 text-[13px] leading-5 text-zinc-300" data-difficulty-text>
          {DIFFICULTY.find((d) => d.id === draft.difficulty)?.text}
        </div>

        <SectionTitle>人数</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: BALANCE.maxPartySize }, (_, i) => i + 1).map((n) => (
            <ChoiceTile
              key={n}
              selected={draft.party.length === n}
              onClick={() => setSize(n)}
              icon={
                <span className="flex h-[22px] items-end -space-x-1">
                  {Array.from({ length: n }, (_, k) => (
                    <UserRound key={k} size={n > 2 ? 15 : 18} strokeWidth={2.4} className={draft.party.length === n ? 'text-amber-200' : 'text-zinc-400'} />
                  ))}
                </span>
              }
              label={`${n}人`}
            />
          ))}
        </div>

        <SectionTitle>遊び方</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceTile selected={!online} onClick={() => setOnline(false)} Icon={Smartphone} accent="#9ad8ff" label="この端末で遊ぶ" sub="1人で全員 / 1台を回す" />
          <ChoiceTile
            selected={online}
            onClick={() => (onlineOk ? setOnline(true) : toast('オンライン協力は準備中です（Firebase の設定が入ると遊べます）'))}
            disabled={!onlineOk}
            Icon={Globe}
            accent="#b8a0ff"
            label="オンライン協力"
            sub="各自のスマホで"
          />
        </div>
        <div className="mt-1.5 text-[12px] leading-4 text-zinc-400">
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
