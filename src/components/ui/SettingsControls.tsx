import { Minus, Plus } from 'lucide-react';
import { playSound } from '../../audio/player';
import type { SoundId } from '../../audio/ids';
import { useBattle } from '../../store/battleStore';
import type { Settings } from '../../store/settings';

/** 音量（0〜10。0 = オフ）。押すたびに1つずつ変える（スマホで押しやすいように） */
function VolumeRow({ label, field, sample }: { label: string; field: 'sfxVolume' | 'bgmVolume'; sample?: SoundId }) {
  const value = useBattle(s => s.settings[field]), set = useBattle(s => s.setSettings);
  const change = (v: number) => {
    const next = Math.max(0, Math.min(10, v));
    set({ [field]: next } as Partial<Settings>);
    if (sample && next > 0) playSound(sample);
  };
  const step = 'btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg disabled:opacity-40';
  return <div role="group" aria-label={`${label}の音量`}>
    <div className="mb-1 text-[14px] font-bold">{label}</div>
    <div className="flex items-center gap-2">
      <button aria-label={`${label}を小さく`} disabled={value <= 0} onClick={() => change(value - 1)} className={step}><Minus size={18} /></button>
      <div className="flex h-11 min-w-0 flex-1 items-center gap-[3px] rounded-lg border border-white/20 bg-black/30 px-2" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => <span key={i} className={`h-4 flex-1 rounded-sm ${i < value ? 'bg-amber-400' : 'bg-white/15'}`} />)}
      </div>
      <span className="w-10 shrink-0 text-center text-[14px] font-bold" data-volume={field}>{value > 0 ? value : 'オフ'}</span>
      <button aria-label={`${label}を大きく`} disabled={value >= 10} onClick={() => change(value + 1)} className={step}><Plus size={18} /></button>
    </div>
  </div>;
}

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
    <VolumeRow label="効果音" field="sfxVolume" sample="sfx_ui_ok" />
    <VolumeRow label="BGM" field="bgmVolume" />
    <p className="-mt-2 text-[12px] text-zinc-300">効果音にはお供の鳴き声も入ります。iPhone はマナーモードだと鳴りません</p>
    <button aria-pressed={settings.vibration} onClick={() => set({ vibration: !settings.vibration })} className="btn btn-dark flex min-h-11 items-center justify-between rounded-lg px-3 text-[14px]"><span>振動</span><span>{settings.vibration ? 'ON' : 'OFF'}</span></button>
  </div>;
}
