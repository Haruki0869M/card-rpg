// お供を迎える候補を出す（イベントの後に、選んだキャラが種類・色・名前を決める。ADOPT_PET）
import { getPet } from '../../../../data/pets';
import { rollPetOffer } from '../../pets';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    /** species: 候補の種類（省略は全種類）/ count: 出す数（2なら2匹から選ぶ）/ rare: めったに出ない子が必ず混ざる */
    pet: { species?: string[]; count?: number; rare?: boolean };
  }
}

export const outcome: OutcomeHandler<'pet'> = {
  kind: 'pet',
  apply(ctx, o) {
    const h = ctx.targets()[0];
    if (!h) return;
    h.petOffer = rollPetOffer(o.species, o.count ?? 1, ctx.rng, o.rare ? 100 : undefined);
  },
  describe: (o) => (o.species?.length === 1 ? `${getPet(o.species[0]).name}を迎えられる` : 'お供を迎えられる'),
};
