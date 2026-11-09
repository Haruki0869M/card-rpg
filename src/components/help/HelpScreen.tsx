// ===== 遊び方・用語集（Step A ③） =====
// タイトル・冒険中のメニュー・上のバー（🔥・侵食度）から開く。読むだけで、冒険の状態・乱数は変えない。
// 閉じると開いた場所に戻る（Android の「戻る」は App の useBackButton から useHelp.back を呼ぶ）。
import { ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { corruptionName } from '../../data/scenarios';
import { nextCorruptionStage } from '../../engine';
import { useBattle } from '../../store/battleStore';
import { useHelp } from '../../store/help';
import { GLOSSARY, HELP_TOPICS, topicOf, type HelpTopicId } from './helpTopics';

/** 侵食度の項目の一番上: 今の値と次の段階（以前のトーストの代わり） */
function CorruptionNow() {
  const game = useBattle((s) => s.full);
  if (!game?.world) return null;
  const next = nextCorruptionStage(game);
  const name = corruptionName(game.scenarioId);
  return (
    <div className="mb-2 rounded-lg border border-fuchsia-400/40 bg-fuchsia-950/40 px-3 py-2 text-[14px] leading-5" data-help-corruption-now>
      <div className="font-bold text-fuchsia-100">
        今の{name}: <span className="tabular-nums">{game.world.corruption}%</span>
      </div>
      <div className="text-fuchsia-100/90">{next ? `次: ${next.at}%で${next.text}` : 'これ以上の変化はありません'}</div>
    </div>
  );
}

/** 命の灯火の項目の一番上: 今の残り */
function LivesNow() {
  const lives = useBattle((s) => s.full?.lives);
  if (lives === undefined) return null;
  return (
    <div className="mb-2 rounded-lg border border-orange-400/40 bg-orange-950/40 px-3 py-2 text-[14px] font-bold text-orange-100" data-help-lives-now>
      今の命の灯火: 🔥×{lives}
    </div>
  );
}

function TopicView({ id }: { id: HelpTopicId }) {
  const t = topicOf(id);
  if (id === 'glossary') {
    return (
      <dl className="flex flex-col gap-1.5">
        {GLOSSARY.map((g) => (
          <div key={g.term} className="rounded-lg bg-black/30 px-3 py-2" data-help-term={g.term}>
            <dt className="text-[14px] font-bold text-amber-100">{g.term}</dt>
            <dd className="text-[13px] leading-5 text-zinc-200">{g.text}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (!t) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {id === 'corruption' && <CorruptionNow />}
      {id === 'lives' && <LivesNow />}
      {t.body.map((p, i) => (
        <p key={i} className="rounded-lg bg-black/30 px-3 py-2 text-[14px] leading-[22px] text-zinc-100">
          {p}
        </p>
      ))}
    </div>
  );
}

export function HelpScreen() {
  const open = useHelp((s) => s.open);
  const topic = useHelp((s) => s.topic);
  const direct = useHelp((s) => s.direct);
  const openHelp = useHelp((s) => s.openHelp);
  const back = useHelp((s) => s.back);
  const close = useHelp((s) => s.close);
  const scroller = useRef<HTMLDivElement>(null);
  // 項目を変えたら一番上から読む（scrollTo の戻り値を後片付けの関数として返さないよう、波かっこで包む）
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [topic]);
  if (!open) return null;
  const title = topic === 'glossary' ? '用語集' : topic ? topicOf(topic)?.title ?? '' : '遊び方・用語集';
  return (
    <div
      className="game-bg safe-pad absolute inset-0 z-[75] flex flex-col"
      role="dialog"
      aria-label="遊び方・用語集"
      data-help={topic ?? 'index'}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-amber-300/30 px-2 py-2">
        {topic && !direct ? (
          <button onClick={back} aria-label="目次へ戻る" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <HelpCircle size={22} className="ml-1 shrink-0 text-amber-300" />
        )}
        <div className="font-display min-w-0 flex-1 truncate text-[19px] text-amber-100">{title}</div>
        <button onClick={close} aria-label="閉じる" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" data-help-close>
          <X size={22} />
        </button>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
        {topic ? (
          <>
            <TopicView id={topic} />
            {direct && (
              <button onClick={() => openHelp()} className="btn btn-dark mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-lg text-[14px] font-bold" data-help-index>
                ほかの説明を見る <ChevronRight size={18} />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            {[...HELP_TOPICS, { id: 'glossary' as const, icon: '📚', title: '用語集' }].map((t) => (
              <button
                key={t.id}
                onClick={() => useHelp.setState({ topic: t.id, direct: false })}
                className="btn btn-dark flex min-h-12 w-full items-center gap-2 rounded-lg px-3 text-left text-[15px] font-bold"
                data-help-topic={t.id}
              >
                <span className="w-7 shrink-0 text-center text-[18px]" aria-hidden>
                  {t.icon}
                </span>
                <span className="min-w-0 flex-1">{t.title}</span>
                <ChevronRight size={18} className="shrink-0 text-zinc-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
