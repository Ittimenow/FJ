import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { IsInt, Max, Min, validateSync } from "class-validator";
import type { GamesService } from "./games.service";
import type { SandboxActionDto } from "./dto/sandbox.dto";
import { RollDiceDto, FastTrackDecisionDto } from "./dto/fast-track.dto";
import { DrawCardDto } from "./dto/draw-card.dto";
import { BuyDealDto } from "./dto/buy-deal.dto";
import { DealAuctionBidDto, SelectDealAuctionOfferDto, StartDealAuctionDto } from "./dto/deal-auction.dto";
import { MarketSaleDecisionDto } from "./dto/market-sale.dto";
import { BabyGiftDto } from "./dto/baby-gift.dto";
import { RepayBankruptcyDebtDto, SellBankruptcyAssetDto } from "./dto/bankruptcy.dto";
import { RepayLoanDto, TakeLoanDto } from "./dto/loan.dto";
import { Game202CommandDto } from "./dto/game-202.dto";

class StockQuantityDto {
  @IsInt() @Min(1) @Max(1_000_000) quantity!: number;
}
export function sandboxPayload<T extends object>(type: new () => T, input: Record<string, unknown>): T {
  const dto = plainToInstance(type, input);
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true });
  if (errors.length) throw new BadRequestException("Некорректные параметры игрового действия");
  return dto;
}

/** Explicit allowlist: this endpoint never forwards a client-supplied method name. */
export function executeSandboxAction(games: GamesService, gameId: string, actorId: string, request: SandboxActionDto) {
  const data = <T extends object>(type: new () => T) => sandboxPayload(type, request.payload);
  switch (request.action) {
    case "player:roll_dice": case "roll": return games.rollDice(gameId, actorId, data(RollDiceDto));
    case "card:draw": return games.drawCard(gameId, actorId, data(DrawCardDto));
    case "deal:buy": return games.buyDeal(gameId, actorId, data(BuyDealDto));
    case "deal:auction_start": return games.startDealAuction(gameId, actorId, data(StartDealAuctionDto));
    case "deal:auction_bid": return games.bidOnDealAuction(gameId, actorId, data(DealAuctionBidDto));
    case "deal:auction_select": return games.selectDealAuctionOffer(gameId, actorId, data(SelectDealAuctionOfferDto));
    case "stock:sell": return games.sellStockFromDeal(gameId, actorId, data(StockQuantityDto).quantity);
    case "market:sell": return games.sellMarketAsset(gameId, actorId, data(MarketSaleDecisionDto));
    case "market:decline": return games.declineMarketSale(gameId, actorId, data(MarketSaleDecisionDto));
    case "baby:gift": return games.sendBabyGift(gameId, actorId, data(BabyGiftDto));
    case "loan:take": return games.takeLoan(gameId, actorId, data(TakeLoanDto));
    case "loan:repay": return games.repayLoan(gameId, actorId, data(RepayLoanDto));
    case "bankruptcy:asset_sell": return games.sellBankruptcyAsset(gameId, actorId, data(SellBankruptcyAssetDto));
    case "bankruptcy:debt_repay": return games.repayBankruptcyDebt(gameId, actorId, data(RepayBankruptcyDebtDto));
    case "fast-track/decision": return games.decideFastTrack(gameId, actorId, data(FastTrackDecisionDto));
    case "202/command": return games.act202(gameId, actorId, data(Game202CommandDto));
  }
  if (Object.keys(request.payload).length) throw new BadRequestException("Это действие не принимает параметры");
  switch (request.action) {
    case "turn:skip": return games.skipTurn(gameId, actorId);
    case "deal:decline": return games.declineDeal(gameId, actorId);
    case "deal:auction_decline": return games.declineDealAuction(gameId, actorId);
    case "deal:auction_cancel": return games.cancelDealAuction(gameId, actorId);
    case "stock:decline": return games.declineStockSale(gameId, actorId);
    case "charity:accept": return games.acceptCharity(gameId, actorId);
    case "charity:decline": return games.declineCharity(gameId, actorId);
    case "doodad:pay_cash": return games.resolveDoodadPayment(gameId, actorId, "cash");
    case "doodad:pay_credit": return games.resolveDoodadPayment(gameId, actorId, "credit");
    case "fast-track/enter": return games.enterFastTrack(gameId, actorId);
    default: throw new BadRequestException("Неизвестное действие песочницы");
  }
}
