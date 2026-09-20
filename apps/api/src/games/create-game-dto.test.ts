import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateGameDto } from "./dto/create-game.dto";
import { CreateSoloGameDto } from "./dto/create-solo-game.dto";

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
