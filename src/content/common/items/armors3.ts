// 鎧の追加分：コモン3点と、16テーマをレア以上の3段階に展開。
import type { ItemDef } from '../../../types';

export const armors3: ItemDef[] = [
  {"slot": "armor", "rarity": "rare", "icon": "armor", "maxHp": 7, "id": "venomscaleMail", "name": "毒の守りの鎧", "description": "ターン開始時、敵全員の毒の合計だけブロック（最大6）。", "tags": ["poison", "block"], "ability": {"name": "毒の守り", "effect": {"when": "turnStart", "do": [{"kind": "blockFromStatus", "status": "poison", "of": "foes", "max": 6}]}}},
  {"slot": "armor", "rarity": "rare", "icon": "armor", "maxHp": 7, "id": "cursewovenMail", "name": "呪いの守りの鎧", "description": "ターン開始時、敵全員の呪いの合計だけブロック（最大6）。", "tags": ["curse", "block"], "ability": {"name": "呪いの守り", "effect": {"when": "turnStart", "do": [{"kind": "blockFromStatus", "status": "curse", "of": "foes", "max": 6}]}}},
];
