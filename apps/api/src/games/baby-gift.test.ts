import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  BankruptcyStatus,
  GameRole,
  GameStatus,
  PlayerController
} from "@prisma/client";
import { GamesService } from "./games.service";

const birthEventId = "11111111-1111-4111-8111-111111111111";

function serviceFixture(options: {
  duplicate?: boolean;
  laterTurns?: number;
  senderCashCents?: bigint;
  birthRecipientId?: string;
} = {}) {
  const senderState = {
    cashCents: options.senderCashCents ?? 1_000n,
    bankruptcyStatus: BankruptcyStatus.NONE
  };
  const recipientState = {
    cashCents: 200n,
    bankruptcyStatus: BankruptcyStatus.NONE
  };
  const sender = {
    id: "sender-player",
    userId: "sender-user",
    controller: PlayerController.HUMAN,
    role: GameRole.PLAYER,
    status: "JOINED",
    financialState: senderState,
    game: { status: GameStatus.IN_PROGRESS }
  };
  const storedGifts: Array<Record<string, unknown>> = [];
  const emittedEvents: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const laterTurns = Array.from({ length: options.laterTurns ?? 0 }, (_, index) => ({
    type: "player:roll_dice",
    sequence: 21 + index
  }));

  const transactionClient = {
    gamePlayer: {
      findFirst: async () => sender
    },
    gameEvent: {
      findFirst: async () => ({
        id: birthEventId,
        sequence: 20,
        gamePlayerId: options.birthRecipientId ?? "recipient-player"
      }),
      findMany: async () => laterTurns
    },
    babyGift: {
      findUnique: async () => options.duplicate ? { id: "existing-gift" } : null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        storedGifts.push(data);
        return data;
      }
    },
    playerFinancialState: {
      findUniqueOrThrow: async ({ where }: { where: { gamePlayerId: string } }) =>
        where.gamePlayerId === sender.id ? senderState : recipientState,
      update: async ({
        where,
        data
      }: {
        where: { gamePlayerId: string };
        data: { cashCents: { decrement?: bigint; increment?: bigint } };
      }) => {
        const state = where.gamePlayerId === sender.id ? senderState : recipientState;
        state.cashCents -= data.cashCents.decrement ?? 0n;
        state.cashCents += data.cashCents.increment ?? 0n;
        return { cashCents: state.cashCents };
      }
    }
  };
  const prisma = {
    $transaction: async (
      callback: (tx: typeof transactionClient) => Promise<void>
    ) => callback(transactionClient)
  };
  const service = new GamesService(prisma as never);

  Object.assign(service as object, {
    appendEvents: async (
      _tx: unknown,
      _gameId: string,
      _userId: string,
      events: typeof emittedEvents
    ) => emittedEvents.push(...events),
    actionResult: async (_gameId: string, events: typeof emittedEvents) => ({ events })
  });

  return { service, senderState, recipientState, storedGifts, emittedEvents };
}

test("transfers a baby gift between players and records it in the journal", async () => {
  const fixture = serviceFixture({ laterTurns: 3 });

  await fixture.service.sendBabyGift("game-1", "sender-user", {
    birthEventId,
    amountCents: 100
  });

  assert.equal(fixture.senderState.cashCents, 900n);
  assert.equal(fixture.recipientState.cashCents, 300n);
  assert.equal(fixture.storedGifts.length, 1);
  assert.equal(fixture.emittedEvents[0]?.type, "player:baby_gift");
  assert.equal(fixture.emittedEvents[0]?.payload.amountCents, 100);
});

test("rejects a second gift from the same player for one birth", async () => {
  const fixture = serviceFixture({ duplicate: true });

  await assert.rejects(
    fixture.service.sendBabyGift("game-1", "sender-user", {
      birthEventId,
      amountCents: 100
    }),
    ConflictException
  );
});

test("rejects a gift after the fourth following player turn starts", async () => {
  const fixture = serviceFixture({ laterTurns: 4 });

  await assert.rejects(
    fixture.service.sendBabyGift("game-1", "sender-user", {
      birthEventId,
      amountCents: 100
    }),
    BadRequestException
  );
});

test("rejects a gift larger than the sender's available cash", async () => {
  const fixture = serviceFixture({ senderCashCents: 50n });

  await assert.rejects(
    fixture.service.sendBabyGift("game-1", "sender-user", {
      birthEventId,
      amountCents: 100
    }),
    BadRequestException
  );
  assert.equal(fixture.senderState.cashCents, 50n);
  assert.equal(fixture.recipientState.cashCents, 200n);
});

test("does not allow a player to congratulate themselves", async () => {
  const fixture = serviceFixture({ birthRecipientId: "sender-player" });

  await assert.rejects(
    fixture.service.sendBabyGift("game-1", "sender-user", {
      birthEventId,
      amountCents: 100
    }),
    BadRequestException
  );
});
