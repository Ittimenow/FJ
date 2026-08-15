import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { ImageResponse } from "next/og";
import {
  loadPublicationFigurines,
  size,
  TelegramPublicationCard
} from "../app/telegram-publications/[id]/opengraph-image";
import type { TelegramChannelPostCard } from "./types";

test("Telegram publication card renders a real PNG with summary data", async () => {
  const post: TelegramChannelPostCard = {
    id: "post-1",
    kind: "SINGLE_GAME",
    title: "Вечерняя партия: путь к финансовой свободе",
    body: "Итоги игры",
    generationVersion: 1,
    items: [{
      position: 0,
      summary: {
        id: "summary-1",
        headline: "Макс достигает финансовой свободы",
        game: {
          title: "Вечерняя партия",
          endedAt: "2026-08-10T18:00:00.000Z",
          currentRound: 22
        },
        facts: {
          gameId: "game-1",
          title: "Вечерняя партия",
          endedAt: "2026-08-10T18:00:00.000Z",
          durationMinutes: 15,
          rounds: 22,
          endReason: "financial_freedom",
          winnerGamePlayerId: "max",
          players: [{
            id: "max",
            name: "Макс",
            mention: "Макс",
            profession: null,
            figurine: "rubber-duck",
            finalCashCents: 0,
            finalCashflowCents: 8500,
            finalPassiveIncomeCents: 8500,
            cashflowDeltaCents: 8500,
            passiveIncomeDeltaCents: 8500,
            assetsCount: 2,
            track: "FAST_TRACK",
            status: "JOINED"
          }],
          highlights: [{ playerId: "max", kind: "win", text: "Макс достиг финансовой свободы." }]
        }
      }
    }]
  };

  const figurineSources = await loadPublicationFigurines(post);
  assert.match(figurineSources["rubber-duck"] ?? "", /^data:image\/png;base64,/);

  const response = new ImageResponse(
    createElement(TelegramPublicationCard, { post, figurineSources }),
    size
  );
  const png = new Uint8Array(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.deepEqual([...png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(png.byteLength > 1_000);
});
