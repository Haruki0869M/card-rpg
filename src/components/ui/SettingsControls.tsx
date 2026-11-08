import { useBattle } from '../../store/battleStore';

/** タイトルと冒険中で同じ設定を使う。値はこの端末だけに保存する。 */
export function SettingsControls() {
  const settings = useBattle(s => s.settings), set = useBattle(s => s.setSettings);
  const choice = 'btn min-h-11 flex-1 rounded-lg border px-2 text-[14px] font-bold';
  return <div className="flex flex-col gap-3" data-settings-controls>
    <div role="group" aria-label="移動・戦闘アニメ速度">
      <div className="mb-1 text-[14px] font-bold">移動・戦闘アニメ速度</div>
      <div className="flex gap-2">{([false, true] as const).map(fast => <button key={String(fast)} aria-pressed={settings.fastMode === fast} onClick={() => set({ fastMode: fast })} className={`${choice} ${settings.fastMode === fast ? 'border-amber-300 bg-amber-500/20 text-amber-100' : 'border-white/20 bg-black/30'}`}>{fast ? '高速' : '通常'}</button>)}</div>
      <p className="mt-1 text-[12px] text-zinc-300">高速は2倍速。宝箱・報酬の演出にも適用します</p>
    </div>
    <div role="group" aria-label="お供・能力カットイン">
      <div className="mb-1 text-[14px] font-bold">お供・能力カットイン</div>
      <div className="flex gap-2">{(['standard', 'simple'] as const).map(mode => <button key={mode} aria-pressed={settings.cutinMode === mode} onClick={() => set({ cutinMode: mode })} className={`${choice} ${settings.cutinMode === mode ? 'border-amber-300 bg-amber-500/20 text-amber-100' : 'border-white/20 bg-black/30'}`}>{mode === 'standard' ? '標準' : '簡易'}</button>)}</div>
      <p className="mt-1 text-[12px] text-zinc-300">簡易は動きを抑え、能力名と数値を短く表示します</p>
    </div>
    <button aria-pressed={settings.vibration} onClick={() => set({ vibration: !settings.vibration })} className="btn btn-dark flex min-h-11 items-center justify-between rounded-lg px-3 text-[14px]"><span>振動</span><span>{settings.vibration ? 'ON' : 'OFF'}</span></button>
  </div>;
}
