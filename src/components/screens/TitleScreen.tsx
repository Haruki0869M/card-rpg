import { SettingsControls } from '../ui/SettingsControls';
import { TERMS } from '../../data/terms';
// ===== タイトル画面 =====
import { motion } from 'framer-motion';
import { BookOpen, HelpCircle, Play, Settings2, UserPlus, Users, Wifi } from 'lucide-react';
import { ROOM_MISSING } from '../../net/room';
import { useHelp } from '../../store/help';
import { useState } from 'react';
import { BattleBackground } from '../../art';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { HeroFace, Screen } from '../ui/game';
import { Motes } from '../ui/fancy';
import { Lorebook } from '../lorebook/Lorebook';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { InAppBrowserNote } from '../ui/InAppBrowserNote';
import { continueSummary, overwriteText } from './titleSummary';

export const GAME_TITLE = TERMS.gameTitle;

/**
 * 回3 D: 直前に入っていたオンラインの部屋に戻る（「部屋に参加」の中の「前の部屋に戻る」と同じ動き）。
 * 1人用の「つづきから」と取り違えないよう、別の行に、オンラインの印と合言葉をつけて出す
 */
function BackToRoom() {
  const code = useOnline((s) => s.lastCode);
  const join = useOnline((s) => s.joinRoom);
  const busy = useOnline((s) => s.busy);
  const setScreen = useBattle((s) => s.setScreen);
  const [msg, setMsg] = useState<string | null>(null);
  const go = async () => {
    if (!code) return;
    setMsg(null);
    if (await join(code)) {
      setScreen(useOnline.getState().room?.game ? 'game' : 'lobby');
      return;
    }
    const err = useOnline.getState().error;
    if (err === ROOM_MISSING) {
      // 部屋がもう無い: 次からはこのボタンを出さない
      setMsg(`部屋（${code}）は、もうありません。新しく部屋を作るか、合言葉で参加してください`);
      useOnline.getState().forgetLastRoom();
    } else setMsg(err ?? 'つながりませんでした。もう一度押してください');
  };
  return (
    <>
      {code && (
      <button disabled={busy} onClick={go} data-back-to-room className="btn btn-dark flex min-h-[52px] items-center gap-2 rounded-2xl border border-sky-300/50 px-3 text-left disabled:opacity-60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-300/60 bg-black/40">
          <Wifi size={18} className="text-sky-300" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display block text-[17px] text-sky-50">{busy ? 'つないでいます…' : `前の部屋（${code}）に戻る`}</span>
          <span className="block text-[12px] leading-4 text-zinc-400">オンライン協力の、さっきまでいた部屋</span>
        </span>
      </button>
      )}
      {msg && (
        <div role="alert" className="rounded-lg bg-red-950/80 px-3 py-2 text-[13px] text-red-100">
          {msg}
        </div>
      )}
    </>
  );
}

export function TitleScreen() {
  const game = useBattle((s) => s.game);
  const setScreen = useBattle((s) => s.setScreen);
  const continueGame = useBattle((s) => s.continueGame);
  const toast = useBattle((s) => s.showToast);
  const [showSettings, setShowSettings] = useState(false);
  const [showLore, setShowLore] = useState(false);
  const onlineOk = useOnline((s) => s.available)();
  const [askNew, setAskNew] = useState(false);
  const startNew = () => {
    if (useBattle.getState().game) useBattle.getState().abandonGame();
    setScreen('setup');
  };

  return (
    <Screen>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <BattleBackground kind="title" className="ken-burns absolute inset-0 h-full w-full" />
        {/* 月のゆらぐ光 */}
        <div className="moon-glow pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 33%, rgba(255,236,170,.55), transparent 42%)', mixBlendMode: 'screen' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent via-35% to-[#0b0810]" />
        <Motes count={22} />
        <div className="absolute inset-x-0 top-[8%] text-center">
          {/* 月の明るい所でも文字が読めるように、文字の後ろを暗く */}
          <div className="pointer-events-none absolute inset-x-0 -top-6 -bottom-6" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(8,6,12,.82), rgba(8,6,12,.45) 60%, transparent)' }} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="font-title title-sheen relative px-2 text-[44px] leading-[46px] font-bold"
            style={{
              background: 'linear-gradient(105deg,#f2c24a 0%,#ffe9a0 30%,#fffdf0 45%,#ffe9a0 55%,#e0a42a 75%,#a86a12 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 3px 0 rgba(0,0,0,.9)) drop-shadow(0 0 8px rgba(0,0,0,.8))',
            }}
          >
            {/* 「DESTINY OF」は小さく、「CRYSTALIA」を大きく（英字のタイトル用の字体） */}
            <span className="block text-[20px] leading-[26px] tracking-[0.25em]">{GAME_TITLE.replace(/\s*\S+$/, '')}</span>
            {GAME_TITLE.split(' ').pop()}
          </motion.div>
          <div className="font-display text-outline relative mt-1 text-[14px] tracking-[0.3em] text-amber-100/90">― {TERMS.gameSubtitle} ―</div>
        </div>
      </div>
      <div className="relative flex flex-col gap-2.5 px-4 pt-2 pb-4">
        <button onClick={() => (game ? setAskNew(true) : startNew())} className="btn btn-gold font-display flex h-[60px] items-center justify-center gap-2 rounded-2xl text-[22px] tracking-wider">
          <UserPlus size={24} /> 新しい冒険
        </button>
        {game && (
          <button onClick={continueGame} className="btn btn-dark flex min-h-[58px] items-center gap-2 rounded-2xl px-3 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-300/60 bg-black/40">
              <Play size={18} className="text-amber-300" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[18px] text-amber-50">つづきから</span>
              <span className="line-clamp-2 block text-[12px] leading-4 text-zinc-400" data-continue-summary>
                {continueSummary(game)}
              </span>
            </span>
            <span className="flex -space-x-2">
              {game.heroes.map((h) => (
                <HeroFace key={h.id} hero={h} size={28} dim={h.hp <= 0} />
              ))}
            </span>
          </button>
        )}
        {onlineOk && <BackToRoom />}
        {onlineOk && <InAppBrowserNote />}
        {/* 小さなメニュー: 宝石の丸いボタン */}
        <div className="mt-1 flex justify-around">
          {(
            [
              { label: '部屋に参加', Icon: Users, color: '#7ac8ff', on: () => (onlineOk ? setScreen('join') : toast('オンライン協力は準備中です（Firebase の設定が入ると遊べます）')) },
              { label: '伝承の書', Icon: BookOpen, color: '#ffd06a', on: () => setShowLore(true) },
              { label: '遊び方', Icon: HelpCircle, color: '#8af0c0', on: () => useHelp.getState().openHelp() },
              { label: '設定', Icon: Settings2, color: '#c8c0e0', on: () => setShowSettings((v) => !v) },
            ] as const
          ).map((m) => (
            <button key={m.label} onClick={m.on} className="btn flex min-w-[68px] flex-col items-center gap-1">
              <span
                className="flex h-[50px] w-[50px] items-center justify-center rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${m.color}44, transparent 65%), linear-gradient(180deg,#3a3258,#17142a) padding-box, linear-gradient(180deg,#fff0b8,#a87a2a 55%,#5a3a0e) border-box`,
                  border: '2px solid transparent',
                  boxShadow: `0 3px 0 #07060c, 0 0 10px ${m.color}33`,
                }}
              >
                <m.Icon size={22} style={{ color: m.color }} />
              </span>
              <span className="text-[12px] font-bold text-zinc-200">{m.label}</span>
            </button>
          ))}
        </div>
        {showSettings && (
          <div className="panel flex flex-col gap-1 rounded-lg p-2 text-[14px]">
            <SettingsControls />
          </div>
        )}
      </div>
      {showLore && <Lorebook onClose={() => setShowLore(false)} />}
      {askNew && game && (
        <ConfirmDialog
          title="新しい冒険を始めますか？"
          text={overwriteText(game)}
          ok="上書きして始める"
          onCancel={() => setAskNew(false)}
          onOk={() => {
            setAskNew(false);
            startNew();
          }}
        />
      )}
    </Screen>
  );
}
