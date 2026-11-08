// 凍てつく王国の敵の組み合わせ。凍結役を同時に重ねず、亜種で弱点・耐性を分散する。
import type { DungeonDef } from '../../../../types';

export const CRYSTAL_POOLS: DungeonDef['pools'] = {
  "battle": [
    [
      "frostMoth",
      "snowOwl"
    ],
    [
      "iceBat",
      "frozenSoldier"
    ],
    [
      "snowOwl",
      "icicleBug"
    ],
    [
      "emberFrostWolf",
      "frozenSoldier"
    ],
    [
      "frostSprite",
      "iceBat"
    ]
  ],
  "elite": [
    [
      "snowWitch",
      "frostWolf"
    ],
    [
      "snowWitch",
      "emberFrostWolf"
    ]
  ],
  "boss": [
    "crystalLord"
  ]
};

export const CATHEDRAL_POOLS: DungeonDef['pools'] = {
  "battle": [
    [
      "iceFisher",
      "iceArcher"
    ],
    [
      "iceSlime",
      "frozenGhoul"
    ],
    [
      "frostMage",
      "iceArcher"
    ],
    [
      "cursedFrozenSoldier",
      "iceArcher"
    ],
    [
      "iceSlime",
      "cursedFrozenSoldier"
    ]
  ],
  "elite": [
    [
      "shadowSnowWitch",
      "frozenGhoul"
    ],
    [
      "iceKnight",
      "cursedFrozenSoldier"
    ]
  ],
  "boss": [
    "frozenBishop"
  ]
};

export const MINE_POOLS: DungeonDef['pools'] = {
  "battle": [
    [
      "stormSnowOwl",
      "iceSwordsman"
    ],
    [
      "yeti",
      "iceSwordsman"
    ],
    [
      "blizzardSnake",
      "stormIceArcher"
    ],
    [
      "venomIceSlime",
      "iceSwordsman"
    ],
    [
      "yeti",
      "stormIceArcher"
    ]
  ],
  "elite": [
    [
      "blizzardBeast"
    ],
    [
      "frostDrakeling"
    ]
  ],
  "boss": [
    "frostGiant"
  ]
};

export const CASTLE_POOLS: DungeonDef['pools'] = {
  "battle": [
    [
      "iceSwordsman",
      "cursedFrozenSoldier"
    ],
    [
      "frozenGhoul",
      "stormIceArcher"
    ],
    [
      "yeti",
      "cursedFrozenSoldier"
    ]
  ],
  "elite": [
    [
      "iceKnight",
      "frozenGhoul"
    ],
    [
      "frostGuardian"
    ]
  ],
  "boss": [
    "whiteQueen"
  ]
};
