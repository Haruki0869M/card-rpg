// ===== ダンジョン制覇・全滅の画面 =====
import { VoteChips, VoteStatus } from '../ui/Votes';
import { totalGold } from '../../engine';
import { corruptionName } from '../../data/scenarios';
import { motion } from 'framer-motion';
import { Castle, Crown, Skull } from 'lucide-react';
import { useBattle } from '../../store/battleStore';
import { LOCAL_PLAYER } from '../../store/battleConfig';
import { HeroFace, RARITY_STYLE, Screen } from '../ui/game';
import { PetAwards } from '../ui/PetToken';
import { EndPetRecord } from '../lorebook/MyPets';

function Stats() {
  const game = useBattle((s) => s.game)!;
  const st = game.stats;
  const rows: [string, string | number][] = [
    ['勝った戦闘', st.battlesWon],
    ['制覇したダンジョン', st.dungeonsCleared],
    ['開けた宝箱', st.chestsOpened],
    ['与えた総ダメージ', st.totalDamage],
    ['完全成功', `${st.perfects}回`],
    ['最高の宝', st.bestRarity ? RARITY_STYLE[st.bestRarity].name : '-'],
    ['所持金（全員）', `${totalGold(game)}G`],
  ];
  return (
    <div className="mt-2 flex flex-col text-[14px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between border-b border-white/10 py-1">
          <span className="text-zinc-300">{k}</span>
          <span className="font-bold tabular-nums">{v}</span>
        </div>
      ))}
      <PetAwards heroes={game.heroes} />
      <EndPetRecord game={game} />
    </div>
  );
}

export function ClearedScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  return (
    <Screen>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="flex flex-col items-center">
          <Crown size={56} className="text-amber-300" />
          <div
            className="font-display text-[36px] leading-[44px]"
            style={{ background: 'linear-gradient(180deg,#fff6d0,#f2c24a 55%,#a86a12)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.8))' }}
          >
            ダンジョン制覇！
          </div>
          <div className="font-display text-[18px] text-amber-100">{game.dungeon?.name}</div>
        </motion.div>
        <div className="mt-2 flex -space-x-2">
          {game.heroes
            .filter((h) => !game.party || game.party.includes(h.id))
            .map((h) => (
              <HeroFace key={h.id} hero={h} size={44} />
            ))}
        </div>
        <div className="panel panel-gold-edge mt-3 w-full rounded-2xl p-3">
          <Stats />
        </div>
      </div>
      <div className="shrink-0 px-3 pb-3">
        <VoteStatus className="mb-2" />
        <button onClick={() => dispatchGame({ type: 'RETURN_TO_HUB', playerId: LOCAL_PLAYER })} className="btn btn-gold font-display flex h-14 w-full items-center justify-center gap-2 rounded-xl text-[19px]">
          <Castle size={22} /> {game.world ? '地上に戻る' : '拠点に戻る'}
          <VoteChips cmd={{ type: 'RETURN_TO_HUB', playerId: LOCAL_PLAYER }} />
        </button>
      </div>
    </Screen>
  );
}

export function GameOverScreen() {
  const game = useBattle((s) => s.game)!;
  const abandon = useBattle((s) => s.abandonGame);
  return (
    <Screen>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5">
        <Skull size={56} className="text-red-400" />
        <div className="font-display text-[38px] leading-[46px] text-red-300" style={{ filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.8))' }}>
          {game.world && game.world.corruption >= 100 ? '世界の終わり…' : '全滅…'}
        </div>
        <div className="text-[13px] text-zinc-400">
          {game.world && game.world.corruption >= 100 ? `${corruptionName(game.scenarioId)}が100%に達し、世界は終わりを迎えた。` : 'パーティは力尽きた。命の灯火も残っていなかった。'}
        </div>
        <div className="mt-2 flex -space-x-2">
          {game.heroes.map((h) => (
            <HeroFace key={h.id} hero={h} size={44} dim />
          ))}
        </div>
        <div className="panel mt-3 w-full rounded-2xl p-3" style={{ borderColor: 'rgba(255,90,90,.5)' }}>
          <Stats />
        </div>
      </div>
      <div className="shrink-0 px-3 pb-3">
        <button onClick={abandon} className="btn btn-gold font-display h-14 w-full rounded-xl text-[19px]">
          タイトルへ
        </button>
      </div>
    </Screen>
  );
}
