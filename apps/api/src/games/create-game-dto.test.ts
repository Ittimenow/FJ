import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateGameDto } from "./dto/create-game.dto";
import { CreateSoloGameDto } from "./dto/create-solo-game.dto";
import { AddBotDto } from "./dto/add-bot.dto";
import { UpdateLobbyDto } from "./dto/update-lobby.dto";

test("лимит командной игры принимает от 2 до 12 мест", () => {
  for (const Dto of [CreateGameDto, UpdateLobbyDto]) {
    for (const maxPlayers of [2, 6, 12]) {
      assert.deepEqual(validateSync(plainToInstance(Dto, { maxPlayers })), []);
    }
    for (const maxPlayers of [1, 13, 2.5]) {
      assert.ok(validateSync(plainToInstance(Dto, { maxPlayers })).some((error) => error.property === "maxPlayers"));
    }
  }
});

test("командная игра допускает ботов до лимита в 12 мест", () => {
  assert.deepEqual(validateSync(plainToInstance(CreateGameDto, { maxPlayers: 12, botCount: 11 })), []);
  assert.ok(validateSync(plainToInstance(CreateGameDto, { maxPlayers: 12, botCount: 13 }))
    .some((error) => error.property === "botCount"));
});

for (const Dto of [CreateGameDto, CreateSoloGameDto]) {
  test(`${Dto.name} accepts seeded and generated card set IDs`, () => {
    for (const cardSetId of ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "c5e3f46d-113b-470f-8f1c-4acf3c54d1d7"]) {
      const dto = plainToInstance(Dto, { cardSetId, botCount: 1, testing: true });
      assert.deepEqual(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }), []);
    }
  });
  test(`${Dto.name} rejects malformed card set IDs`, () => {
    for (const cardSetId of ["invalid", "00000000-0000-0000-0000-000000000001-extra", 1]) {
      const dto = plainToInstance(Dto, { cardSetId, botCount: 1 });
      assert.ok(validateSync(dto).some(error => error.property === "cardSetId"));
    }
  });
}

test("уровни сложности проверяются при создании и добавлении ботов", () => {
  assert.deepEqual(validateSync(plainToInstance(CreateSoloGameDto, {
    botCount: 2, botLevels: ["beginner_v1", "expert_v1"]
  })), []);
  assert.ok(validateSync(plainToInstance(CreateSoloGameDto, {
    botCount: 1, botLevels: ["unknown"]
  })).some((error) => error.property === "botLevels"));
  assert.deepEqual(validateSync(plainToInstance(AddBotDto, { level: "expert_v1" })), []);
  assert.ok(validateSync(plainToInstance(AddBotDto, { level: "unknown" }))
    .some((error) => error.property === "level"));
});
