// ===== タイトル画面 =====
import { motion } from 'framer-motion';
import { BookOpen, Play, Settings2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { BattleBackground, CharacterArt } from '../../art';
import { useBattle } from '../../store/battleStore';
import { HeroFace, Screen } from '../ui/game';

export const GAME_TITLE = 'アルセリアの封印';

export function TitleScreen() {
  const game = useBattle((s) => s.game);
  const setScreen = useBattle((s) => s.setScreen);
  const continueGame = useBattle((s) => s.continueGame);
  const settings = useBattle((s) => s.settings);
  const setSettings = useBattle((s) => s.setSettings);
  const toast = useBattle((s) => s.showToast);
  const [showSettings, setShowSettings] = useState(false);
  const modeText: Record<string, string> = {
    hub: '冒険の拠点',
    dungeon: 'ダンジョン探索中',
    battle: '戦闘中',
    reward: '戦闘の報酬',
    chest: '宝箱',
    event: 'イベント',
    rest: '休憩所',
    cleared: 'ダンジョン制覇',
    gameover: '全滅',
  };

  return (
    <Screen>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <BattleBackground kind="castle" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#0b0810]" />
        <div className="absolute inset-x-0 top-[8%] text-center">
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="font-display text-[40px] leading-[48px] tracking-wider"
            style={{
              background: 'linear-gradient(180deg,#fff6d0,#f2c24a 55%,#a86a12)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 3px 0 rgba(0,0,0,.85))',
            }}
          >
            {GAME_TITLE}
          </motion.div>
          <div className="font-display text-outline mt-1 text-[14px] tracking-[0.3em] text-amber-100/90">― スロット × デッキの冒険譚 ―</div>
        </div>
        {/* 職業のキャラたち */}
        <div className="absolute inset-x-0 bottom-2 flex items-end justify-center">
          {(
            [
              ['guardian', 'male', 0.92],
              ['mage', 'female', 1],
              ['warrior', 'male', 1.12],
              ['hunter', 'female', 1],
            ] as const
          ).map(([c, g, k], i) => (
            <motion.div
              key={c}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
              className="idle-breathe -mx-2"
              style={{ animationDelay: `${-i * 0.7}s` }}
            >
              <CharacterArt classId={c} gender={g} className="block" style={{ width: 92 * k }} />
            </motion.div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 px-4 pt-3 pb-4">
        <button onClick={() => setScreen('setup')} className="btn btn-gold font-display flex h-14 items-center justify-center gap-2 rounded-xl text-[20px]">
          <UserPlus size={22} /> 新しい冒険
        </button>
        {game && (
          <button onClick={continueGame} className="btn btn-dark flex min-h-14 items-center gap-2 rounded-xl px-3 text-left">
            <Play size={20} className="shrink-0 text-amber-300" />
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[17px]">つづきから</span>
              <span className="block truncate text-[12px] text-zinc-400">
                {modeText[game.mode] ?? ''}・{game.dungeon?.name ?? '拠点'}・{game.gold}G
              </span>
            </span>
            <span className="flex -space-x-2">
              {game.heroes.map((h) => (
                <HeroFace key={h.id} hero={h} size={26} dim={h.hp <= 0} />
              ))}
            </span>
          </button>
        )}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => toast('部屋に参加（オンライン協力）は M3 で追加します')} className="btn btn-dark flex h-12 flex-col items-center justify-center rounded-lg text-[12px]">
            <Users size={16} className="text-sky-300" /> 部屋に参加
          </button>
          <button onClick={() => toast('伝承の書は M4 で追加します')} className="btn btn-dark flex h-12 flex-col items-center justify-center rounded-lg text-[12px]">
            <BookOpen size={16} className="text-amber-300" /> 伝承の書
          </button>
          <button onClick={() => setShowSettings((v) => !v)} className="btn btn-dark flex h-12 flex-col items-center justify-center rounded-lg text-[12px]">
            <Settings2 size={16} className="text-zinc-300" /> 設定
          </button>
        </div>
        {showSettings && (
          <div className="panel flex flex-col gap-1 rounded-lg p-2 text-[14px]">
            {(
              [
                ['高速モード（演出2倍速）', 'fastMode'],
                ['振動', 'vibration'],
              ] as const
            ).map(([label, key]) => (
              <button key={key} onClick={() => setSettings({ [key]: !settings[key] })} className="flex h-11 items-center justify-between">
                <span>{label}</span>
                <span className={`flex h-7 w-12 items-center rounded-full p-0.5 ${settings[key] ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                  <span className={`h-6 w-6 rounded-full bg-white transition-transform ${settings[key] ? 'translate-x-5' : ''}`} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
