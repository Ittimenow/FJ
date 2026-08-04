import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { CitiesService, normalizeCityQuery } from "./cities.service";

test("поиск города нормализует регистр, пробелы и букву ё", () => {
  assert.equal(normalizeCityQuery("  ОрЁЛ  "), "орел");
});

test("поиск города запрашивает совпадения по началу названия", async () => {
  let receivedArgs: unknown;
  const service = new CitiesService({
    city: {
      findMany: async (args: unknown) => {
        receivedArgs = args;
        return [{ id: "city-id", name: "Орёл", region: "Орловская область" }];
      }
    }
  } as never);

  const result = await service.search("Орё");
  assert.deepEqual(result, [
    { id: "city-id", name: "Орёл", region: "Орловская область" }
  ]);
  assert.deepEqual(receivedArgs, {
    where: { searchName: { startsWith: "оре" } },
    select: { id: true, name: true, region: true },
    orderBy: [{ name: "asc" }, { region: "asc" }],
    take: 20
  });
});

test("поиск города отклоняет чрезмерно длинный запрос", async () => {
  const service = new CitiesService({} as never);
  await assert.rejects(service.search("а".repeat(81)), BadRequestException);
});
