// ===== オンライン協力の画面（部屋に参加・待合室・遊んでいる間の表示。spec §7.2） =====
import { TopBar } from '../ui/fancy';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Crown, LogIn, Share2, Swords, Users, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BALANCE } from '../../data/balance';
import { CLASSES } from '../../data/classes';
import { DIFFICULTIES } from '../../data/rules';
import { SCENARIOS, isScenarioUnlocked } from '../../data/scenarios';
import { clearedScenarioIds } from '../../store/profile';
import { useProfile } from '../../store/profileStore';
import { PLAYER_COLOR } from '../../data/theme';
import { livingHeroes, waitingPlayers } from '../../engine';
import { normalizeCode, SEATS } from '../../net/room';
import { autoName, isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { PROXY_WAIT_SEC, useOnline } from '../../store/onlineStore';
import type { GameState, PlayerId } from '../../types';
import { HeroFace, Screen } from '../ui/game';
import { chestClaimWaits, facilityWaits, rewardWaits } from './waitNotes';

/** 定型のスタンプ（spec §7.1） */
export const STAMPS = ['いいね！', '待って！', 'ここ行こう', 'ありがとう', 'まかせて', 'ごめん！'];

export const SeatChip = ({ p, small }: { p: PlayerId; small?: boolean }) => (
  <span className={`shrink-0 rounded px-1 font-bold text-black ${small ? 'text-[12px] leading-4' : 'text-[13px]'}`} style={{ background: PLAYER_COLOR[p] }}>
    {p}
  </span>
);

/** 招待のURL（開くと合言葉が入った状態で「部屋に参加」が開く） */
export function inviteUrl(code: string) {
  const u = new URL(location.href);
  u.hash = '';
  u.searchParams.delete('as');
  u.searchParams.set('room', code);
  return u.toString();
}

function NameInput() {
  const name = useOnline((s) => s.playerName);
  const setName = useOnline((s) => s.setPlayerName);
  return (
    <label className="flex items-center gap-2">
      <span className="shrink-0 text-[13px] text-zinc-300">あなたの名前</span>
      <input
        value={name}
        maxLength={10}
        placeholder="プレイヤー"
        onChange={(e) => setName(e.target.value)}
        className="h-11 min-w-0 flex-1 rounded-lg border border-amber-500/40 bg-black/50 px-2 text-[16px] text-amber-50 outline-none focus:border-amber-300"
      />
    </label>
  );
}

// ---------- 部屋に参加 ----------

export function JoinScreen() {
  const setScreen = useBattle((s) => s.setScreen);
  const join = useOnline((s) => s.joinRoom);
  const busy = useOnline((s) => s.busy);
  const error = useOnline((s) => s.error);
  const lastCode = useOnline((s) => s.lastCode);
  const [code, setCode] = useState(() => normalizeCode(new URLSearchParams(location.search).get('room') ?? ''));
  const go = async (c: string) => {
    if (await join(c)) setScreen(useOnline.getState().room?.game ? 'game' : 'lobby');
  };
  return (
    <Screen>
      <TopBar title="部屋に参加" onBack={() => setScreen('title')} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4">
        <NameInput />
        <div>
          <div className="text-[13px] text-zinc-300">合言葉（4文字）</div>
          <input
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="合言葉"
            placeholder="KX7P"
            className="font-display mt-1 h-16 w-full rounded-xl border-2 border-amber-500/50 bg-black/60 text-center text-[36px] tracking-[0.4em] text-amber-100 outline-none focus:border-amber-300"
          />
        </div>
        {error && <div className="rounded-lg bg-red-950/70 px-3 py-2 text-[13px] text-red-100">{error}</div>}
        <button
          disabled={busy || code.length !== 4}
          onClick={() => go(code)}
          className="btn btn-gold font-display flex h-14 items-center justify-center gap-2 rounded-xl text-[19px] disabled:opacity-50"
        >
          <LogIn size={22} /> {busy ? 'つないでいます…' : '参加する'}
        </button>
        {lastCode && lastCode !== code && (
          <button disabled={busy} onClick={() => go(lastCode)} className="btn btn-dark h-12 rounded-xl text-[14px] font-bold">
            前の部屋（{lastCode}）に戻る
          </button>
        )}
        <div className="text-[12px] leading-5 text-zinc-500">部屋を作った人に合言葉を教えてもらうか、招待のリンクを開いてください。冒険の途中でも、前に入っていた部屋なら戻れます。</div>
      </div>
    </Screen>
  );
}

// ---------- 待合室 ----------

export function LobbyScreen() {
  const room = useOnline((s) => s.room);
  useOnline((s) => s.tick);
  const leave = useOnline((s) => s.leaveRoom);
  const update = useOnline((s) => s.updateSettings);
  const release = useOnline((s) => s.releaseSlot);
  const start = useOnline((s) => s.start);
  const setScreen = useBattle((s) => s.setScreen);
  const setDraft = useBattle((s) => s.setDraft);
  const toast = useBattle((s) => s.showToast);
  const clears = useProfile((s) => s.profile.clears);
  if (!room?.meta) return null;
  const cleared = clearedScenarioIds({ clears });
  const m = room.meta;
  const host = room.isHost;
  // シナリオの解放は、部屋を作った人（ホスト）のこの端末の記録で決める（K5）。参加者はホストが選んだものを見るだけ
  const scenarios = SCENARIOS.all.filter((s) => isScenarioUnlocked(s, cleared));
  const problem = room.startProblem();
  const editSlot = (i: number) => {
    const cur = room.slots[i];
    const classes = CLASSES.all.filter((c) => c.unlocked);
    const c = cur?.classId ?? classes[i % classes.length].id;
    const g = cur?.gender ?? (i % 2 ? 'female' : 'male');
    setDraft({ party: [{ classId: c, gender: g, name: cur?.name ?? autoName(c, g, i) }] });
    useOnline.setState({ editingSlot: i });
    setScreen('create');
  };
  const share = async () => {
    const url = inviteUrl(room.code);
    try {
      if (navigator.share) await navigator.share({ title: '一緒に遊ぼう', text: `合言葉 ${room.code}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('招待のリンクをコピーしました');
      }
    } catch {
      /* 取り消し */
    }
  };
  const members = Object.entries(room.members).sort((a, b) => a[1].seat.localeCompare(b[1].seat));
  return (
    <Screen>
      <TopBar
        title="待合室"
        onBack={async () => {
          await leave();
          setScreen('title');
        }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        <div className="panel panel-gold-edge mt-2 flex items-center gap-3 rounded-xl p-3">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-zinc-400">合言葉</div>
            <div data-testid="room-code" className="font-display text-[38px] leading-10 tracking-[0.3em] text-amber-100 select-text">
              {room.code}
            </div>
          </div>
          <button onClick={share} className="btn btn-dark flex h-14 w-20 flex-col items-center justify-center rounded-lg text-[12px]">
            {typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 size={20} /> : <Copy size={20} />}
            招待する
          </button>
        </div>

        <div className="font-display mt-3 text-[15px] text-amber-200">参加している人</div>
        <div className="mt-1 flex flex-col gap-1">
          {members.map(([uid, mem]) => (
            <div key={uid} className="flex h-11 items-center gap-2 rounded-lg bg-black/30 px-2 text-[14px]">
              <SeatChip p={mem.seat} />
              <span className="min-w-0 flex-1 truncate">
                {mem.name}
                {uid === room.uid && <span className="text-zinc-400">（あなた）</span>}
              </span>
              {m.hostUid === uid && <Crown size={16} className="text-amber-300" aria-label="ホスト" />}
              {mem.online ? <Wifi size={16} className="text-emerald-300" aria-label="接続中" /> : <WifiOff size={16} className="text-zinc-500" aria-label="切断中" />}
            </div>
          ))}
        </div>

        <div className="font-display mt-3 text-[15px] text-amber-200">冒険の設定{host ? '' : '（ホストが決めます）'}</div>
        <div className="mt-1 flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(host ? scenarios : SCENARIOS.all.filter((s) => s.id === m.scenarioId)).map((s) => (
              <button key={s.id} disabled={!host} onClick={() => update({ scenarioId: s.id })} className={`btn h-11 rounded-lg px-3 text-[14px] font-bold ${m.scenarioId === s.id ? 'btn-gold' : 'btn-dark'}`}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {DIFFICULTIES.all.map((d) => (
              <button key={d.id} disabled={!host} onClick={() => update({ difficulty: d.id })} className={`btn h-11 rounded-lg text-[14px] font-bold ${m.difficulty === d.id ? 'btn-gold' : 'btn-dark'} ${!host && m.difficulty !== d.id ? 'opacity-40' : ''}`}>
                {d.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: BALANCE.maxPartySize }, (_, i) => i + 1).map((n) => (
              <button key={n} disabled={!host} onClick={() => update({ partySize: n })} className={`btn flex h-11 items-center justify-center gap-1 rounded-lg text-[14px] font-bold ${m.partySize === n ? 'btn-gold' : 'btn-dark'} ${!host && m.partySize !== n ? 'opacity-40' : ''}`}>
                <Users size={14} /> {n}人
              </button>
            ))}
          </div>
        </div>

        <div className="font-display mt-3 text-[15px] text-amber-200">キャラクター</div>
        <div className="text-[12px] text-zinc-500">作ったキャラは、作った人が操作します。1人で何人作ってもかまいません。</div>
        <div className="mt-1 flex flex-col gap-1.5">
          {room.slots.map((s, i) => {
            const owner = s ? room.members[s.ownerUid] : undefined;
            const mine = s?.ownerUid === room.uid;
            return (
              <div key={i} className="flex min-h-14 items-center gap-2 rounded-lg bg-black/30 px-2 py-1">
                {s ? <HeroFace hero={s} size={40} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-white/20 text-zinc-500">{i + 1}</span>}
                <div className="min-w-0 flex-1">
                  {s ? (
                    <>
                      <div className="truncate text-[14px] font-bold">{s.name}</div>
                      <div className="flex items-center gap-1 text-[12px] text-zinc-400">
                        {owner && <SeatChip p={owner.seat} small />}
                        {CLASSES.get(s.classId).name}・{owner?.name ?? '？'}
                      </div>
                    </>
                  ) : (
                    <div className="text-[13px] text-zinc-400">まだ誰も作っていません</div>
                  )}
                </div>
                {!s && (
                  <button onClick={() => editSlot(i)} className="btn btn-gold h-11 rounded-lg px-3 text-[14px] font-bold">
                    作る
                  </button>
                )}
                {mine && (
                  <>
                    <button onClick={() => editSlot(i)} className="btn btn-dark h-11 rounded-lg px-3 text-[13px] font-bold">
                      変える
                    </button>
                    <button onClick={() => release(i)} className="btn btn-dark h-11 rounded-lg px-2 text-[13px] text-zinc-300">
                      やめる
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 px-3 pt-1 pb-3">
        {host ? (
          <>
            <button
              disabled={!!problem}
              onClick={() => start()}
              className="btn btn-gold font-display flex h-14 w-full items-center justify-center gap-2 rounded-xl text-[19px] disabled:opacity-50"
            >
              <Swords size={22} /> 冒険に出発
            </button>
            {problem && <div className="mt-1 text-center text-[12px] text-zinc-400">{problem}</div>}
          </>
        ) : (
          <div className="flex h-14 items-center justify-center rounded-xl bg-black/40 text-[14px] text-zinc-300">全員のキャラがそろったら、ホストが出発します</div>
        )}
      </div>
    </Screen>
  );
}

// ---------- 遊んでいる間 ----------

/** 今だれの操作を待っているか（席。手番・準備完了・成長の選択） */
export function awaitedSeats(game: GameState): PlayerId[] {
  if (game.mode === 'world' && game.world && !game.world.story) {
    const h = game.heroes.find((x) => x.id === game.world!.turn);
    return h ? [h.playerId] : [];
  }
  if (game.mode === 'battle' && game.battle?.phase === 'ally') return waitingPlayers(game.battle);
  // 回3 A・C: 報酬（成長・カード・取り合い）・宝箱の取り合い・施設も、まだ選んでいない人を待っている
  const all = () => false;
  const seats = (notes: { playerId: PlayerId }[]) => [...new Set(notes.map((n) => n.playerId))];
  if (game.mode === 'reward') return seats(rewardWaits(game, all));
  if (game.mode === 'chest' && game.chest?.claims?.some((c) => !c.rolls)) return seats(chestClaimWaits(game, all));
  if (game.mode === 'town' || game.mode === 'shrine' || game.mode === 'sanctuary') return seats(facilityWaits(game, all));
  if (game.mode === 'encounter' && game.encounter) {
    const h = game.heroes.find((x) => x.id === game.encounter!.heroId);
    return h ? [h.playerId] : [];
  }
  return [];
}

/** 部屋の情報（メニューの中）: 合言葉・参加者・代わりに操作・スタンプ */
export function OnlinePanel() {
  const room = useOnline((s) => s.room);
  useOnline((s) => s.tick);
  const setProxy = useOnline((s) => s.setProxy);
  const sendStamp = useOnline((s) => s.sendStamp);
  const openSheet = useBattle((s) => s.openSheet);
  if (!room?.meta) return null;
  const members = Object.values(room.members).sort((a, b) => a.seat.localeCompare(b.seat));
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-black/30 p-2">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-zinc-400">部屋</span>
        <b className="font-display tracking-widest text-amber-200 select-text">{room.code}</b>
        <span className={`ml-auto flex items-center gap-1 text-[12px] ${room.connected ? 'text-emerald-300' : 'text-red-300'}`}>
          {room.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {room.connected ? '接続中' : '切断中'}
        </span>
      </div>
      {members.map((mem) => (
        <div key={mem.seat} className="flex min-h-11 items-center gap-2 text-[13px]">
          <SeatChip p={mem.seat} small />
          <span className="min-w-0 flex-1 truncate">
            {mem.name}
            {room.meta!.hostUid === Object.entries(room.members).find(([, x]) => x === mem)?.[0] && <Crown size={13} className="ml-1 inline text-amber-300" />}
          </span>
          {!room.alive(mem) && room.isHost && mem.seat !== room.seat && (
            <button onClick={() => setProxy(mem.seat, !room.meta!.proxy?.[mem.seat])} className="btn btn-dark h-11 rounded-lg px-2 text-[12px] font-bold">
              {room.meta!.proxy?.[mem.seat] ? '代わりの操作をやめる' : '代わりに操作する'}
            </button>
          )}
          {room.alive(mem) ? <Wifi size={14} className="text-emerald-300" /> : <WifiOff size={14} className="text-zinc-500" />}
        </div>
      ))}
      <div className="grid grid-cols-3 gap-1">
        {STAMPS.map((s) => (
          <button
            key={s}
            onClick={() => {
              sendStamp(s);
              openSheet(null);
            }}
            className="btn btn-dark h-11 rounded-lg text-[13px] font-bold"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 画面の上に重ねる表示: スタンプ・切断中・他の人を待っている */
export function OnlineOverlay() {
  const room = useOnline((s) => s.room);
  useOnline((s) => s.tick);
  const stamp = useOnline((s) => s.stamp);
  const offlineSince = useOnline((s) => s.offlineSince);
  const setProxy = useOnline((s) => s.setProxy);
  const game = useBattle((s) => s.game);
  const screen = useBattle((s) => s.screen);
  const [shownStamp, setShownStamp] = useState<number | null>(null);
  const [, setNow] = useState(0);
  const hostNote = useOnline((s) => s.hostNote);
  const [shownHost, setShownHost] = useState<number | null>(null);
  // 回3 C: ホストの引き継ぎの知らせは12秒出す
  useEffect(() => {
    if (!hostNote) return;
    setShownHost(hostNote.id);
    const t = setTimeout(() => setShownHost(null), 12000);
    return () => clearTimeout(t);
  }, [hostNote]);
  useEffect(() => {
    if (!stamp) return;
    setShownStamp(stamp.id);
    const t = setTimeout(() => setShownStamp(null), 2500);
    return () => clearTimeout(t);
  }, [stamp]);
  // 待ち時間の表示を1秒ごとに更新
  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!room || screen !== 'game' || !game) return null;
  // 同行に誘われている（この端末のキャラ）
  const invites = Object.entries(game.world?.invites ?? {})
    .map(([target, by]) => ({ target: game.heroes.find((h) => h.id === target)!, by: game.heroes.find((h) => h.id === by)! }))
    .filter((x) => x.target && x.by && isLocalPlayer(x.target.playerId));
  const offlineAwaited = awaitedSeats(game).filter((p) => !room.seatOnline(p) && !room.meta?.proxy?.[p] && livingHeroes(game).some((h) => h.playerId === p));
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex flex-col items-center gap-1 px-3 pt-14">
      {!room.connected && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-red-950/90 px-3 py-1.5 text-[13px] text-red-100">
          <WifiOff size={16} /> 通信が切れました。つながり直しています…
        </div>
      )}
      {hostNote && shownHost === hostNote.id && (
        <div className="pointer-events-auto flex w-full max-w-[400px] items-start gap-1.5 rounded-xl border border-amber-300/40 bg-black/90 px-3 py-2 text-[13px] text-amber-50" role="status" data-host-note>
          <Crown size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <span>
            ホスト（{hostNote.oldName}さん）との接続が切れました。{hostNote.mine ? 'あなたがホストを引き継ぎました。このまま続けられます' : `${hostNote.newName}さんが引き継ぎました。このまま続けられます`}
          </span>
        </div>
      )}
      {offlineAwaited.map((p) => {
        const left = Math.max(0, PROXY_WAIT_SEC - Math.floor((Date.now() - (offlineSince[p] ?? Date.now())) / 1000));
        return (
          <div key={p} className="pointer-events-auto flex w-full max-w-[400px] flex-col gap-1 rounded-xl border border-amber-300/40 bg-black/90 px-3 py-2 text-[13px] text-amber-50">
            <div className="flex items-center gap-1.5">
              <SeatChip p={p} small /> {room.seatName(p) ?? p}さんの通信が切れています
            </div>
            {room.isHost ? (
              left > 0 ? (
                <div className="text-zinc-400">戻るのを待っています（あと{left}秒で、代わりに操作できます）</div>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={() => setProxy(p, true)} className="btn btn-gold h-11 flex-1 rounded-lg text-[13px] font-bold">
                    代わりに操作する
                  </button>
                  <button onClick={() => useOnline.setState({ offlineSince: { ...offlineSince, [p]: Date.now() } })} className="btn btn-dark h-11 flex-1 rounded-lg text-[13px] font-bold">
                    もう少し待つ
                  </button>
                </div>
              )
            ) : (
              <div className="text-zinc-400">戻るのを待っています（ホストが代わりに操作することもできます）</div>
            )}
          </div>
        );
      })}
      {invites.map(({ target, by }) => (
        <div key={target.id} className="pointer-events-auto flex w-full max-w-[400px] flex-col gap-1 rounded-xl border border-sky-300/50 bg-black/90 px-3 py-2 text-[13px] text-sky-50">
          <div className="flex items-center gap-1.5">
            <SeatChip p={by.playerId} small /> {room.seatName(by.playerId) ?? by.playerId}さんの{by.name}が、{target.name}を同行に誘っています
          </div>
          <div className="text-[12px] text-zinc-400">一緒に行くと、{target.name}はこのワールドターンの行動を終えます</div>
          <div className="flex gap-1.5">
            <button onClick={() => useBattle.getState().dispatchGame({ type: 'WORLD_INVITE_ANSWER', playerId: target.playerId, heroId: target.id, accept: true })} className="btn btn-gold h-11 flex-1 rounded-lg text-[13px] font-bold">
              一緒に行く
            </button>
            <button onClick={() => useBattle.getState().dispatchGame({ type: 'WORLD_INVITE_ANSWER', playerId: target.playerId, heroId: target.id, accept: false })} className="btn btn-dark h-11 flex-1 rounded-lg text-[13px] font-bold">
              行かない
            </button>
          </div>
        </div>
      ))}
      <AnimatePresence>
        {stamp && shownStamp === stamp.id && (
          <motion.div
            key={stamp.id}
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 rounded-full border-2 bg-black/90 px-3 py-1.5 text-[15px] font-bold text-white"
            style={{ borderColor: PLAYER_COLOR[stamp.seat] }}
          >
            <SeatChip p={stamp.seat} small /> {stamp.name}「{stamp.kind}」
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 他の人の操作を待っている時の小さな表示（自分の番でない時） */
export function OthersTurnNote({ seat, name, what }: { seat: PlayerId; name: string; what: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-[14px] text-zinc-200">
      <SeatChip p={seat} small />
      <span>
        {name}が{what}
      </span>
     
    </div>
  );
}

/** 回3 A: 待っている相手と、相手が今していること（1行ずつ。「P2 ナツさんが、リナの山札に加えるカードを選んでいます」） */
export function WaitNotes({ notes, className = '' }: { notes: { playerId: PlayerId; what: string }[]; className?: string }) {
  useOnline((s) => s.tick);
  if (!notes.length) return null;
  const room = useOnline.getState().room;
  return (
    <div className={`flex flex-col gap-1 rounded-xl bg-black/50 px-2 py-1.5 ${className}`} role="status" data-wait-notes>
      {notes.map((n, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[13px] leading-5 text-zinc-100">
          <SeatChip p={n.playerId} small />
          <span className="min-w-0">
            {room?.seatName(n.playerId) ?? n.playerId}さんが、{n.what}
          </span>
        </div>
      ))}
    </div>
  );
}

export { SEATS };
