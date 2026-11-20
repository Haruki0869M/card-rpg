// ===== カードの見た目（手札以外: 報酬・デッキ一覧など） =====
import type { CardDef } from '../../types';
import { CardBody } from './CardBody';

export function CardFace({ card, chance, width = 98, height = 150, glow }: { card: CardDef; chance?: number; width?: number; height?: number; glow?: string }) {
  return (
    <div className="relative shrink-0 rounded-[10px]" style={{ width, height, boxShadow: glow ? `0 0 14px ${glow}` : undefined }}>
      <CardBody card={card} chance={chance} width={width} height={height} />
    </div>
  );
}
