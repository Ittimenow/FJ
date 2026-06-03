import { IsIn } from "class-validator";

export class DrawCardDto {
  @IsIn(["SMALL_DEAL", "BIG_DEAL", "MARKET", "DOODAD", "FAST_TRACK", "DREAM"])
  cardType!: "SMALL_DEAL" | "BIG_DEAL" | "MARKET" | "DOODAD" | "FAST_TRACK" | "DREAM";
}
