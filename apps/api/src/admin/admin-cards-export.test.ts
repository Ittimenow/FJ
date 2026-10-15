import assert from "node:assert/strict";
import test from "node:test";
import { StreamableFile } from "@nestjs/common";
import { AdminCardsController } from "./admin-cards.controller";
import { readCardWorkbook, writeCardWorkbook } from "./card-workbook";

test("выгрузка возвращает бинарный Excel-файл с заголовками скачивания", async () => {
  const workbook = writeCardWorkbook(
    [{ id: "11111111-1111-4111-8111-111111111111", name: "Набор", isDefault: true }],
    []
  );
  const controller = new AdminCardsController({ exportCardWorkbook: async () => workbook } as never);
  const response = await controller.exportCards();

  assert.ok(response instanceof StreamableFile);
  assert.deepEqual(response.getHeaders(), {
    type: "application/vnd.ms-excel",
    disposition: 'attachment; filename="game-cards.xls"',
    length: workbook.length
  });
  const chunks: Buffer[] = [];
  for await (const chunk of response.getStream()) chunks.push(Buffer.from(chunk));
  const downloaded = Buffer.concat(chunks);
  assert.ok(downloaded.equals(workbook));
  assert.equal(readCardWorkbook(downloaded).sets[0]?.name, "Набор");
});
