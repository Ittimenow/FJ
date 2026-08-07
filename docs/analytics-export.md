# Экспорт аналитики

В API добавлены read-only эндпоинты для анализа историй игр. Все маршруты
требуют JWT активного пользователя с ролью `ADMIN`.

## Эндпоинты

```text
GET /api/admin/analytics/games
GET /api/admin/analytics/catalog
GET /api/admin/analytics/games/:id
GET /api/admin/analytics/games/:id/replay
GET /api/admin/analytics/export.ndjson
POST /api/admin/analytics/export.ndjson
```

Поддерживаемые query-параметры:

- `from`: нижняя граница `createdAt` партии, например `2026-01-01`.
- `to`: верхняя граница `createdAt` партии.
- `status`: `WAITING`, `IN_PROGRESS`, `PAUSED`, `ENDED` или `CANCELLED`.
- `mode`: `MULTIPLAYER` или `SOLO`.
- `search`: поиск по названию, коду, ведущему или участнику.
- `limit`: максимум партий в ответе. Для JSON-списка по умолчанию `200`,
  максимум `1000`. Для NDJSON-экспорта по умолчанию `500`, максимум `5000`.

Каталог `/catalog` дополнительно принимает `page` и `pageSize` (не более 100)
и возвращает объект с полями `items`, `total`, `page`, `pageSize` и
`totalPages`. Он используется административным разделом «Игры», поэтому все
партии доступны последовательно, а не ограничены первой выборкой.

Для экспорта отмеченных в панели партий отправьте JSON-массив их ID:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameIds":["00000000-0000-4000-8000-000000000001"]}' \
  "https://gamefj.ru/api/admin/analytics/export.ndjson" \
  > reports/selected-game-history.ndjson
```

За один запрос можно выбрать от 1 до 5000 партий. GET-вариант сохранён для
автоматизированных выгрузок по фильтрам.

## Экспорт из production

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://gamefj.ru/api/admin/analytics/export.ndjson?from=2026-01-01&status=ENDED" \
  > reports/game-history.ndjson
```

NDJSON-экспорт содержит один JSON-объект на строку:

- `export_meta`: версия формата, время генерации и фильтры.
- `game`: сводка партии и краткая сводка игроков.
- `player`: подробное состояние игрока, активы и обязательства.
- `event`: упорядоченное event-sourcing событие с `payload` и опциональным
  `stateSnapshot`.

Текущая версия формата — `2`. Партия содержит поле `mode`, а участник — поля
`controller` и `botStrategy`. Поэтому в аналитике и replay можно отличить
человека от виртуального соперника и восстановить версию его стратегии.

Экспорт намеренно не включает пароли, email, аватары и обратную связь.
