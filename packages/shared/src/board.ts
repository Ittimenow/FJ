export type BoardTrack = "RAT_RACE" | "FAST_TRACK";

export type RatRaceCellType =
  | "paycheck"
  | "deal"
  | "market"
  | "doodad"
  | "charity"
  | "baby"
  | "downsized";

export type FastTrackCellType = "fast_track" | "dream" | "cashflow_day";

export interface BoardCell<TType extends string = string> {
  index: number;
  type: TType;
  label: string;
}

export const ratRaceBoard: BoardCell<RatRaceCellType>[] = [
  { index: 0, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 1, type: "doodad", label: "Всякая всячина" },
  { index: 2, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 3, type: "charity", label: "Благотворительность" },
  { index: 4, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 5, type: "paycheck", label: "Расчетный чек" },
  { index: 6, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 7, type: "market", label: "Рынок" },
  { index: 8, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 9, type: "doodad", label: "Всякая всячина" },
  { index: 10, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 11, type: "baby", label: "Ребенок" },
  { index: 12, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 13, type: "paycheck", label: "Расчетный чек" },
  { index: 14, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 15, type: "market", label: "Рынок" },
  { index: 16, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 17, type: "doodad", label: "Всякая всячина" },
  { index: 18, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 19, type: "downsized", label: "Увольнение" },
  { index: 20, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 21, type: "paycheck", label: "Расчетный чек" },
  { index: 22, type: "deal", label: "Возможность крупная/мелкая" },
  { index: 23, type: "market", label: "Рынок" }
];

export const fastTrackBoard: BoardCell<FastTrackCellType>[] = [
  { index: 0, type: "cashflow_day", label: "Cashflow Day" },
  { index: 1, type: "fast_track", label: "Fast Track Deal" },
  { index: 2, type: "dream", label: "Dream" },
  { index: 3, type: "fast_track", label: "Fast Track Deal" },
  { index: 4, type: "cashflow_day", label: "Cashflow Day" },
  { index: 5, type: "dream", label: "Dream" },
  { index: 6, type: "fast_track", label: "Fast Track Deal" },
  { index: 7, type: "dream", label: "Dream" },
  { index: 8, type: "cashflow_day", label: "Cashflow Day" },
  { index: 9, type: "fast_track", label: "Fast Track Deal" },
  { index: 10, type: "dream", label: "Dream" },
  { index: 11, type: "fast_track", label: "Fast Track Deal" }
];
