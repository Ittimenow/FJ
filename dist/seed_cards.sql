-- Auto-generated seed from cashflow_game_database_export_body_text_cleaned.xlsx
SET NAMES utf8mb4;
START TRANSACTION;
/* Optional cleanup */
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE card_meta;
TRUNCATE TABLE card_conditions;
TRUNCATE TABLE card_effects;
TRUNCATE TABLE cards;
SET FOREIGN_KEY_CHECKS=1;

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0001_акция-pop1-entertainment-co', 'Акции POP1 на минимуме: $10', 'В Сенат поступил на рассмотрение законопроект о дополнительном налогообложении залов для игровых автоматов. Это вызвало снижение цены акций.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

POP1 сегодняшняя цена $10

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'POP1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0002_акция-pop1-entertainment-co', 'Акции POP1 на максимуме: $40', 'Вновь открытый центр развлечений для детей стал причиной рекордно высокой цены.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

POP1 сегодняшняя цена $40

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'POP1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0003_акция-pop1-entertainment-co', 'Акции POP1 на минимуме: $5', 'На генерального директора компании по видеопрокату возбуждено уголовное дело по укрытию налогов. Все «сливают» акции.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

POP1 сегодняшняя цена $5

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'POP1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0004_акция-pop1-entertainment-co', 'Акции POP1 выросли до $20', 'Назначен новый директор кинотеатра. Ранее он работал руководителем проектов по развитию. Закончил MBA. 5 раз играл в Cashflow 101. Хорошие перспективы.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

POP1 сегодняшняя цена $20

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'POP1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0005_акция-pop1-entertainment-co', 'Акции POP1 на максимуме: $30', 'Наконец-то открылся кинотеатр по прокату фильмов старого производства с качеством и звуком Dolby Surround. Полный аншлаг.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

POP1 сегодняшняя цена $30

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'POP1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0006_акция-pop1-entertainment-co', 'Акции POP1 выросли до $20', 'Недавнее слияние сети по продаже DVD сулит хорошие перспективы.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

POP1 сегодняшняя цена $20

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'POP1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0007_вновь-открытый-аквапарк-не-окупает-всех', 'Акции POP1 на минимуме: $10', 'Вновь открытый Аквапарк не окупает всех затрат по его эксплуатации. Курс постоянно снижается.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

POP1 сегодняшняя цена $10

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'POP1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0008_начал', 'Акции POP1 на максимуме: $30', 'Начал работу Игровой бизнес центр ФРОНТИР. Курс акций поднялся на максимальную отметку.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

POP1 сегодняшняя цена $30

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'POP1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0009_компания-идет-ко-дну-из-за-разразившегося', 'Обратное дробление акций ISN', 'Компания идет ко дну из-за разразившегося скандала с незаконным оборотом наркотиков. Государство взяло под контроль 50% пакет акций.

Каждый владелец акций ISN уменьшает количество своих акций вдвое. Общая стоимость, однако, остается без изменений.

Дивидендов нет. Сейчас никто не может ни купить, ни продать акции.

Уменьшение количества акций в 2 раза', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_reverse_split', 2);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0010_акция-isn-drug-co', 'Акции ISN снизились до $1', 'Комиссия опубликовала данные о том, что 85% продаваемых лекарств не прошли государственную сертификацию. Все ранее выданные лицензии на торговлю будут пересмотрены.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ISN Сегодняшняя цена $1

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $0 до $40', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0011_акция-isn-drug-co', 'Акции ISN выросли до $30', 'Разработан препарат для повышения жизненной активности для людей старше 60 лет. Большой спрос.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ISN Сегодняшняя цена $30

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $40', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0012_акция-isn-drug-co', 'Акции ISN на максимуме: $50', 'Выпущен в продажу препарат, позволяющий обходиться без еды более 5 суток.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ISN Сегодняшняя цена $50

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $40', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '50') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '50') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0013_акция-isn-drug-co', 'Акции ISN на максимуме: $40', 'Правительство объявило о государственной поддержке отечественным производителям лекарств.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ISN Сегодняшняя цена $40

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $40', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0014_акция-isn-drug-co', 'Акции ISN на максимуме: $40', 'Повышены таможенные тарифы на импорт медицинских препаратов.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ISN Сегодняшняя цена $40

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $40', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0015_акция-isn-drug-co', 'Акции ISN выросли до $5', 'Создана Правительственная комиссия по борьбе с распространением контрафактных медицинских препаратов. Массовый сброс акций.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ISN Сегодняшняя цена $5

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $0 до $40', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0016_высокая-инфляция-привела-к-низкой-стоимости', 'Акции ISN снизились до $10', 'Высокая инфляция привела к низкой стоимости акций.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ISN Сегодняшняя цена $10

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $40', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0017_правительство-отменило-налоговые-льготы', 'Акции ISN снизились до $10', 'Правительство отменило налоговые льготы для производителей медицинских препаратов.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ISN Сегодняшняя цена $10

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $40', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0018_дела-идут-настолько-хорошо-что-компания', 'Дробление акций ISN', 'Дела идут настолько хорошо, что компания выпускает дополнительную эмиссию акций.

Каждый владелец акций ISN удваивает их количество. Общая стоимость, однако, остается без изменений.

Дивидендов нет. Сейчас никто не может ни купить, ни продать акции.

ISN Дробление акций в 2 раза', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_split', 2);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0019_акция-chip-electronics-co', 'Акции CHIP снизились до $5', 'Крупнейший производитель бытовой техники сбросил 70% своих активов. Рекордно низкая цена акций.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

CHIP Сегодняшняя цена $5

Дивидендов нет. Доходность = 0%', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0020_акция-chip-electronics-co', 'Акции CHIP снизились до $10', 'Индекс на Нью-Йоркской бирже упал на 115 пунктов. Прогнозы пессимистичны.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

CHIP Сегодняшняя цена $10

Дивидендов нет. Доходность = 0%', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0021_акция-chip-electronics-co', 'Акции CHIP по $30', 'Новый оператор сотовой связи с доступом к спутнику.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

CHIP Сегодняшняя цена $30

Дивидендов нет. Доходность = 0%', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0022_возможный-разброс-котировок-от-0-до-30', 'Акции CHIP на максимуме: $40', 'Объединение 5 крупнейших Интернет-провайдеров.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

CHIP Сегодняшняя цена $40

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0023_возможный-разброс-котировок-от-5-до-30', 'Акции CHIP на минимуме: $5', 'Индекс Интернет-компаний на Лондонской бирже упал до рекордно низкого за последние 5 лет уровня. Прогнозы пессимистичны.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

CHIP Сегодняшняя цена $5

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0024_возможный-разброс-котировок-от-5-до-30', 'Акции CHIP по $20', 'Назначен новый Генеральный директор. Куплена лицензия на производство экологичной, но дорогой бытовой техники.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

CHIP Сегодняшняя цена $20

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0025_в-стране-производящей-компоненты-для-товаров', 'Акции CHIP на минимуме: $1', 'В стране, производящей компоненты для товаров компании CHIP может начаться война.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

CHIP Сегодняшняя цена $1

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0026_менеджмент-в-компании-обеспечил-постоянный-рост', 'Акции CHIP на максимуме: $30', 'Менеджмент в компании обеспечил постоянный рост активов.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

CHIP Сегодняшняя цена $30

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0027_дела', 'Дробление акций CHIP', 'Дела идут настолько хорошо, что компания выпускает дополнительную эмиссию акций.

Каждый владелец акций CHIP удваивает их количество. Общая стоимость, однако, остается без изменений.

Дивидендов нет. Сейчас никто не может ни купить, ни продать акции.

CHIP Дробление акций в 2 раза', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_split', 2);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0028_акция-chip-electronics-co', 'Обратное дробление акций CHIP', 'Компания идет ко дну из-за разразившегося скандала по отмывке криминальных денег. Государство взяло под контроль 50% пакет акций.

Каждый владелец акций CHIP уменьшает количество своих акций вдвое. Общая стоимость, однако, остается без изменений.

Дивидендов нет. Сейчас никто не может ни купить, ни продать акции.

CHIP Уменьшение количества акций в 2 раза', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_reverse_split', 2);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0029_привилегированная-акция-2big-power', 'Привилегированные акции 2BIG: $1,200', 'Power Высокодоходная привилегированная акция отечественной электрической компании. Дивиденды и цена зафиксированы на «справедливом» уровне Постановлением Правительства о гос. регулировании цен на услуги естественных монополий.

Каждый может купить или продать любое количество акций по этой цене.

2BIG Сегодняшняя цена $1200

Доходность =10% Дивиденды $10/месяц.

Возможный разброс цен: от $1200 до $1200', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', '2BIG') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '1200') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '1200') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '1200') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '1200') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 10);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0030_привилегированная-акция-2big-power', 'Привилегированные акции 2BIG: $1,200', 'Power Высокодоходная привилегированная акция отечественной электрической компании. Дивиденды и цена зафиксированы на «справедливом» уровне Постановлением Правительства о гос. регулировании цен на услуги естественных монополий.

Каждый может купить или продать любое количество акций по этой цене.

2BIG Сегодняшняя цена $1200

Доходность =10% Дивиденды $10/месяц.

Возможный разброс цен: от $1200 до $1200', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', '2BIG') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '1200') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '1200') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '1200') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '1200') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 10);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0031_паевой-инвестиционный-фонд-agana-fund', 'Акции AGANA по $20', 'AGANA Fund Великолепный менеджер в этой молодой компании. Все верят, что все, к чему он прикасается, превращается в золото.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

AGANA Сегодняшняя цена $20

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'AGANA') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0032_паевой-инвестиционный-фонд-agana-fund', 'Акции AGANA на максимуме: $30', 'AGANA Fund Общий подъем рынка привел к тому, что цена доли в ПИФе выросла до хорошего показателя.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

AGANA Сегодняшняя цена $30

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'AGANA') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0033_паевой-инвестиционный-фонд-agana-fund', 'Акции AGANA на минимуме: $10', 'AGANA Fund Слабые достижения большинства компаний не позволили фонду выйти с этой низкой отметки.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

AGANA Сегодняшняя цена $10

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'AGANA') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0034_agana-fund', 'Акции AGANA на максимуме: $30', 'Снижение процентных ставок привело рынок соответственно фонд к значительному росту.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

AGANA Сегодняшняя цена $30

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'AGANA') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0035_agana-fund', 'Акции AGANA на максимуме: $40', 'Взлет цен на нефть и энергоносители подняли цену пая в фонде на небывалую доселе высоту.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

AGANA Сегодняшняя цена $40

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $10 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'AGANA') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0036_возможность-3m', '3M дом: $35,000, +$220/мес', 'Реконструкция здания в деловой части города. Планируется создание Бизнес-центра «Богатый Папа».

Займите деньги, если нужно, но купите! 3M 132% ROI, может быть продан от $65 000 до$135 000

Цена $35 000 Закладная $33 000

Первоначальный взнос $2 000

Денежный поток +$220', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '35000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '33000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '2000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '220') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -2000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 220);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0037_депозитный-сертификат', 'Депозитный сертификат CD: $5,000', 'Ведущий банк предлагает специальный депозит для своих клиентов. Гарантируется неизменность процента и возврат вложений на любой период.

Каждый может купить или продать любое количество сертификатов по этой цене.

CD Сегодняшняя цена $5000

Доходность =4, 8% Дивиденды $20/месяц.

Возможный разброс цен: от $5000 до $5000', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CD') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 20);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0038_депозитный-сертификат', 'Депозитный сертификат CD: $4,000', 'Ведущий банк предлагает специальный депозит для своих клиентов. Гарантируется неизменность процента и возврат вложений на любой период.

Каждый может купить или продать любое количество сертификатов по этой цене.

CD Сегодняшняя цена $4000

Доходность =6% Дивиденды $20/месяц.

Возможный разброс цен: от $4000 до $4000', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CD') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '4000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '4000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '4000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '4000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 20);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0039_у-вас-появилась-великолепная', '3M дом: $45,000, +$250/мес', 'У вас появилась великолепная возможность! - 3М Продается помещение на 1 этаже в центре города. После переоформления и переоборудования его в офис можно удачно сдать в аренду.

Займите деньги, если нужно, но купите! 3M 150% ROI, может быть продан от $65 000 до$135 000

Цена $45 000 Закладная $43 000

Первоначальный взнос $2000

Денежный поток +$250', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '45000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '43000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '2000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '250') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -2000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 250);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0040_коттедж-на-продажу-2у', '2У коттедж: $40,000, +$140/мес', 'Родители продают коттедж в кондоминиуме Университетского городка. Спрос на жилье здесь огромный.

Используйте сами или продайте другому игроку. 42% ROI, может быть продан от $45 000 до $65 000

Цена $40 000 Закладная $36 000

Первоначальный взнос $4000

Денежный поток +$140', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '36000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '4000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '140') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -4000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 140);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0041_коттедж-на-продажу-2у', '2У коттедж: $50,000, +$100/мес', 'Неплохой домик выставлен на продажу. Хозяйка выходит замуж и уезжает. Район непривлекательный, дому требуется основательный ремонт.

Используйте сами или продайте другому игроку. 24% ROI, может быть продан от $45 000 до $65 000

Цена $50 000 Закладная $45 000

Первоначальный взнос $5 000

Денежный поток + $100', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '45000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '100') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -5000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0042_коттедж-на-продажу-2у', '2У коттедж: $60,000, -$100/мес', 'Прекрасный «интеллектуальный дом». Напичкан электроникой, требующей ухода. Охрана. Все системы автономны. Бывший владелец коммерсант – переезжает.

Используйте сами или продайте другому игроку. -24% ROI, может быть продан от $45 000 до $65 000

Цена $60 000 Закладная $55 000

Первоначальный взнос $5 000

Денежный поток -$100', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '60000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '55000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '-100') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -5000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0043_банк-продает-дом-по-закладной-близко-к-месту', 'Дом: $40,000, +$220/мес', 'Банк продает дом по закладной. Близко к месту работы и магазинам. Сделайте предложение – банк может частично профинансировать.

Используйте сами или продайте другому игроку. 53% ROI, может быть продан от $45 000 до $65 000

Цена $40 000 Закладная $35 000

Первоначальный взнос $5000

Денежный поток +$220', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '35000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '220') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -5000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 220);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0044_в-молодой-семье-родился-3-ребенок-и-они-хотели', 'Дом: $55,000, +$160/мес', 'В молодой семье родился 3 ребенок, и они хотели бы переехать в более просторный дом.

Используйте сами или продайте другому игроку. 38% ROI, может быть продан от $45 000 до $65 000

Цена $55 000 Закладная $50 000

Первоначальный взнос $5 000

Денежный поток +$160', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '55000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '160') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -5000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 160);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0045_хороший-2-х-этажный-коттедж-выставлен-на', '2У коттедж: $65,000, +$160/мес', 'Хороший 2-х этажный коттедж выставлен на продажу из-за неожиданного отъезда хозяина за границу.

Используйте сами или продайте другому игроку. 38% ROI, может быть продан от $65 000 до $135 000

Цена $65 000 Закладная $60 000

Первоначальный взнос $5 000

Денежный поток +$160', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '65000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '60000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '160') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -5000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 160);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0046_коттедж-на-продажу-3m', '3M дом: $50,000, +$100/мес', 'Родители и молодая семья хотят разъехаться. Если поспешить с предложением, то можно в будущем продать этот дом подороже.

Используйте сами или продайте другому игроку. 40% ROI, может быть продан от $65 000 до $135 000

Цена $50 000 Закладная $47 000

Первоначальный взнос $3 000

Денежный поток +$100', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '47000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '3000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '100') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -3000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0047_коттедж-на-продажу-3m', '3M дом: $50,000, -$100/мес', 'В южной части страны освободился особняк. Но никто не хочет его покупать. Сейчас вы можете забрать его бесплатно, но охрана потребует некоторых средств.

Используйте сами или продайте другому игроку. ? ? % ROI, может быть продан от $65 000 до $135 000

Цена $50 000 Закладная $50 000

Первоначальный взнос $0

Денежный поток - $100', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '-100') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', 0);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0048_коттедж-на-продажу-3m', '3M дом: $50,000, +$220/мес', 'Дом продается из-за общего снижения цен на недвижимость в этом районе – построена Северная ТЭЦ.

Используйте сами или продайте другому игроку. 60% ROI, может быть продан от $65 000 до $135 000

Цена $50 000 Закладная $46 000

Первоначальный взнос $4 000

Денежный поток +$220', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '46000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '4000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '220') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -4000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 220);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0049_коттедж-на-продажу-3m', '3M дом: $50,000, +$100/мес', 'В результате криминальной разборки погиб хозяин роскошного коттеджа. В течение 6 месяцев наследники так и не объявились. Как выморочное имущество дом может быть передан вам без первоначального взноса.

Используйте сами или продайте другому игроку. ? ? % ROI, может быть продан от $65 000 до $135 000

Цена $50 000 Закладная $50 000

Первоначальный взнос $0

Денежный поток +$100', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '100') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', 0);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0050_новая-компания-part-time', 'Part Time: финансовое обучение - $5,000', 'Новая компания Part Time Интересная идея о создании компании по разработке новых программ для обучения людей финансовой грамотности. Никаких прибылей долгое время не ожидается.

Используйте сами или продайте другому игроку. 0% ROI, может быть продан за? ? , или что-то еще.

Цена $5 000 Пассив $0

Первоначальный взнос $5 000

Денежный поток $0 Брат просит денег', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -5000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0051_новая-компания-part-time', 'Part Time: циркониевые браслеты - $3,000', 'Новая компания Part Time Изобретен новый способ изготовления циркониевых браслетов. Вы можете стать учредителем новой компании по их производству и продаже. Вряд-ли вы

получите прибыль в первые годы.

Используйте сами или продайте другому игроку. 0% ROI, может быть продан за? ? , или что-то еще.

Цена $3 000 Пассив $0

Первоначальный взнос $3 000

Денежный поток $0 Другу срочно нужны деньги', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '3000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '3000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -3000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0052_ваши-арендаторы-нанесли-урон-вашему-дому', 'Расход по недвижимости: $500', 'Ваши арендаторы нанесли урон вашему дому, заплатили за 2 месяца и исчезли, оставив огромный счет за междугородние переговоры. Ваша страховая компания покрыла часть убытков, но вы еще остались должны $500.

Заплатите в банк 500, если вы владеете хоть какой- нибудь недвижимостью, сдаваемой внаем. Только для человека, вытащившего эту карточку.', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'conditional_cash_delta', -500);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_rental_realestate');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0053_жена-вашего-брата-потеряла-работу-они-не-в', 'Займ брату под залог дома: $5,000', 'Жена вашего брата потеряла работу. Они не в состоянии сделать очередной платеж за дом по ипотеке. Через 3 месяца их выселят, а дом отберут. Брат умоляет дать ему взаймы $5 000. Обещает вернуть $10 000, как только его жена найдет хорошую работу.

Используйте сами или продайте другому игроку. 0% ROI

Цена $5 000 Пассив $0

Первоначальный взнос $5 000

Денежный поток $0', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -5000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0054_он-обещает-вернуть-буквально-через-3-4-месяца-в', 'Редкая золотая монета: $3,000', 'Он обещает вернуть буквально через 3-4 месяца. В крайнем случае, он готов оставить в залог 10 золотых монет царской чеканки по смешной цене $300 за штуку.

Используйте сами или продайте другому игроку. 0% ROI, в будущем возможна продажа за? ?

Цена $3 000 Пассив $0

Первоначальный взнос $3 000

Денежный поток $0', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '3000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '3000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -3000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0055_10-гектаров-земли', '10 га земли: $5,000', 'Земли выведены из сельскохозяйственного оборота. Ни дорог, ни инфраструктуры. Дико и тихо.

Используйте сами или продайте другому игроку. 0% ROI, в будущем может быть продано за? ? .

Цена $5 000 Закладная $0

Первоначальный взнос $5 000

Денежный поток $0', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -5000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0056_редкая-золотая-монета', 'Редкая золотая монета: $500', 'Необычная монета XIV века. Испанские Королевские колонии в Новом Свете. В хорошем состоянии. Только одна из восьми существующих в мире. Продавец просит за нее $500.

Используйте сами или продайте другому игроку. ? ? % ROI, может быть продана от $0 000 до $4 000.

Цена $500 Пассив $0

Первоначальный взнос $500

Денежный поток $0', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '500') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '500') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -500);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0057_акция-алмаз-инвест4u', 'Акции AI4U по $3', 'Объявлено об открытии нового месторождения алмазов. Группа инициаторов принимает вклады от населения.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

AI4U Сегодняшняя цена $3

Дивидендов нет. Доходность = 0%', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '3') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0058_акция-only4u', 'Акции ONLY4U на минимуме: $5', 'Менеджмент в компании обеспечил постоянный рост активов.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ONLY4U Сегодняшняя цена $5

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0059_акция-only4u', 'Акции ONLY4U выросли до $10', 'Менеджмент в компании обеспечил постоянный рост активов.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ONLY4U Сегодняшняя цена $10

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0060_возможный-разброс-котировок-от-5-до-30', 'Акции ONLY4U на минимуме: $3', 'Менеджмент компании построил финансовую пирамиду.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ONLY4U Сегодняшняя цена $3

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '3') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0061_в-стране-производящей-компоненты-для-товаров', 'Акции IT4U на минимуме: $1', 'В стране, производящей компоненты для товаров компании IT4U может начаться война.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

IT4U Сегодняшняя цена $1

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0062_совет-директоров-принял-решение-о-слиянии-с', 'Акции IT4U на минимуме: $2', 'Совет директоров принял решение о слиянии с компанией по производству мебели.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

IT4U Сегодняшняя цена $2

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '2') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0063_компания-взяла-кредит-на-постройку-нового-цеха-по', 'Акции IT4U на минимуме: $3', 'Компания взяла кредит на постройку нового цеха по производству компакт дисков(По слухам пиратских).

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

IT4U Сегодняшняя цена $3

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '3') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0064_isn-drug-co-банкротство', 'Обесценивание акций ISN', 'ISN Drug Co. - банкротство Создана Правительственная комиссия по борьбе с распространением наркотиков. Возбуждено уголовное дело. Массовый сброс акций. Акции полностью обесценены. Каждый владелец акций CHIP сдает свои акции. Сейчас никто не может ни купить, ни продать акции.

ISN Сегодняшняя цена $0', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ISN') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_wipeout', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0065_pop1-entertainment-co-банкрот', 'Обесценивание акций POP1', 'POP1 Entertainment Co. - банкрот Сенат принял законопроект о запрете на деятельность залов для игровых автоматов. Это вызвало снижение цены акций до $0. Акции полностью обесценены. Каждый владелец акций CHIP сдает свои акции.

POP1 сегодняшняя цена $0', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'POP1') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_wipeout', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0066_привилегированная-акция-2big-power', 'Обесценивание акций 2BIG', 'Power Антимонопольный Комитет внес законопроект о национализации предприятий естественных монополий. Постановлением Правительства о государственном регулировании цен на услуги естественных монополий установлен фиксированный уровень тарифов на энергоносители. Высокодоходная привилегированная акция отечественной электрической компании потеряла свою стоимость.

2BIG Сегодняшняя цена $0', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', '2BIG') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_wipeout', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0067_chip-electronics-co-разорение', 'Обесценивание акций CHIP', 'CHIP Electronics Co - разорение Компания идет ко дну из-за разразившегося скандала по отмывке криминальных денег. Акции полностью обесценены. Каждый владелец акций CHIP сдает свои акции. Сейчас никто не может ни купить, ни продать акции.

CHIP сегодняшняя цена $0 Компания сетевого маркетинга «TNI»', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'CHIP') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_wipeout', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0068_паевой-инвестиционный-фонд-agana-fund-убытки', 'Обесценивание акций AGANA', 'AGANA Fund - убытки Слабые достижения большинства компаний не позволили фонду выйти с этой низкой отметки. Фонд объявил о своем закрытии. Стоимость пая полностью обесценено. Каждый владелец паев GRO$US удаляется из реестра собственников фонда. Сейчас никто не может ни купить, ни продать акции.

AGANA Сегодняшняя цена $0 Компания сетевого маркетинга «TNI»', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'AGANA') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_wipeout', 0);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'today_price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0069_компания-сетевого-маркетинга-tni', 'TNI: 4 уровень - Черный жемчуг', 'Компания сетевого маркетинга «TNI» 4 уровень – «Черный жемчуг» Вы создали 7 групп – поздравляем! Оборот вашей организации превышает $100,000 Вы проводите обучающие семинары и привозите на бизнес семинары более 1000 человек.

Если вы уже имеете признание «Жемчуг»,

добавьте +$12,000 к своему денежному потоку. Компания сетевого маркетинга «TNI»', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0070_1-уровень-100-потребитель', 'TNI: 1 уровень - 100% потребитель', '1 уровень – 100% потребитель Вы можете присоединиться к «TNI» крупнейшей в мире компании сетевого маркетинга. Очень качественные товары, низкие стартовые затраты. Никаких обещаний и гарантий, но огромные возможности. Ваш рост зависит исключительно желания учиться этому бизнесу и лидерству. Стоимость стартового пакета $200

Денежный поток $-20 (регулярное потребление)', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0071_card', 'TNI: 2 уровень - Нефрит', 'от 2 уровень – «Нефрит» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете обучающие диски с выступлениями лидеров компании. Если вы уже подключены к «TNI »,

добавьте +$550 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0072_3-уровень-жемчуг', 'TNI: 3 уровень - Жемчуг', '3 уровень – «Жемчуг» Вы создали 3 группы – поздравляем! Вы получили признание «Изумруд» Вы проводите обучающие семинары и ежедневно слушаете диски с выступлениями лидеров компании.

Если вы уже подключены к «TNI», имеете признание «Нефрит»

добавьте +$1,800 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0073_amway-империя-свободы', 'AMWAY: 1 уровень - 100% потребитель', '«AMWAY» – империя свободы 1 уровень – 100% потребитель Вы можете присоединиться к «AMWAY» крупнейшей в мире компании сетевого маркетинга. Очень качественные товары, низкие стартовые затраты. Никаких обещаний и гарантий, но огромные возможности. Ваш рост зависит исключительно желания учиться этому бизнесу и лидерству. Стоимость стартового пакета $200

Денежный поток $0', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0074_card', 'AMWAY: 1 уровень - 100% потребитель', 'от «AMWAY» – империя свободы 1 уровень – 100% потребитель Вы можете присоединиться к «AMWAY» - крупнейшей в мире компании сетевого маркетинга. Очень качественные товары, низкие стартовые затраты. Никаких обещаний и гарантий, но огромные возможности. Ваш рост зависит исключительно от желания учиться этому бизнесу и лидерству. Стоимость стартового пакета $200

Денежный поток $0', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0075_amway-империя-свободы', 'AMWAY: 1 уровень - 100% потребитель', '«AMWAY» – империя свободы 1 уровень – 100% потребитель Вы можете присоединиться к «AMWAY» - крупнейшей в мире компании сетевого маркетинга. Очень качественные товары, низкие стартовые затраты. Никаких обещаний и гарантий, но огромные возможности. Ваш рост зависит исключительно от желания учиться этому бизнесу и лидерству. Стоимость стартового пакета $200

Денежный поток $0', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0076_amway-империя-свободы', 'AMWAY: 1 уровень - 100% потребитель', '«AMWAY» – империя свободы 1 уровень – 100% потребитель Вы можете присоединиться к «AMWAY» крупнейшей в мире компании сетевого маркетинга. Очень качественные товары, низкие стартовые затраты. Никаких обещаний и гарантий, но огромные возможности. Ваш рост зависит исключительно желания учиться этому бизнесу и лидерству. Стоимость стартового пакета $200

Денежный поток $0', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0077_card', 'AMWAY: 1 уровень - 100% потребитель', 'от «AMWAY» – империя свободы 1 уровень – 100% потребитель Вы можете присоединиться к «AMWAY» - крупнейшей в мире компании сетевого маркетинга. Очень качественные товары, низкие стартовые затраты. Никаких обещаний и гарантий, но огромные возможности. Ваш рост зависит исключительно от желания учиться этому бизнесу и лидерству. Стоимость стартового пакета $200

Денежный поток $0', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0078_amway-империя-свободы', 'AMWAY: 1 уровень - 100% потребитель', '«AMWAY» – империя свободы 1 уровень – 100% потребитель Вы можете присоединиться к «AMWAY» - крупнейшей в мире компании сетевого маркетинга. Очень качественные товары, низкие стартовые затраты. Никаких обещаний и гарантий, но огромные возможности. Ваш рост зависит исключительно от желания учиться этому бизнесу и лидерству. Стоимость стартового пакета $200

Денежный поток $0', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0079_amway-империя-свободы', 'AMWAY: 2 уровень - Золотой предприниматель', '«AMWAY» – империя свободы 2 уровень – «Золотой предприниматель» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете кассеты выступлениями «Бриллиантов». Если вы уже подключены к «AMWAY»,

добавьте +$500 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0080_amway-империя-свободы', 'AMWAY: 2 уровень - Золотой предприниматель', '«AMWAY» – империя свободы 2 уровень – «Золотой предприниматель» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете кассеты с выступлениями «Бриллиантов». Если вы уже подключены к «AMWAY»,

добавьте +$500 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0081_amway-империя-свободы', 'AMWAY: 2 уровень - Золотой предприниматель', '«AMWAY» – империя свободы 2 уровень – «Золотой предприниматель» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете кассеты с выступлениями «Бриллиантов». Если вы уже подключены к «AMWAY»,

добавьте +$500 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0082_amway-империя-свободы', 'AMWAY: 2 уровень - Золотой предприниматель', '«AMWAY» – империя свободы 2 уровень – «Золотой предприниматель» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете кассеты выступлениями «Бриллиантов». Если вы уже подключены к «AMWAY»,

добавьте +$500 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0083_amway-империя-свободы', 'AMWAY: 2 уровень - Золотой предприниматель', '«AMWAY» – империя свободы 2 уровень – «Золотой предприниматель» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете кассеты с выступлениями «Бриллиантов». Если вы уже подключены к «AMWAY»,

добавьте +$500 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0084_amway-империя-свободы', 'AMWAY: 2 уровень - Золотой предприниматель', '«AMWAY» – империя свободы 2 уровень – «Золотой предприниматель» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете кассеты с выступлениями «Бриллиантов». Если вы уже подключены к «AMWAY»,

добавьте +$500 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0085_amway-империя-свободы', 'AMWAY: 2 уровень - Золотой предприниматель', '«AMWAY» – империя свободы 2 уровень – «Золотой предприниматель» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете кассеты выступлениями «Бриллиантов». Если вы уже подключены к «AMWAY»,

добавьте +$500 к своему денежному потоку. «AMWAY» – империя свободы', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0086_amway-империя-свободы', 'AMWAY: 2 уровень - Золотой предприниматель', '«AMWAY» – империя свободы 2 уровень – «Золотой предприниматель» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете кассеты с выступлениями «Бриллиантов». Если вы уже подключены к «AMWAY»,

добавьте +$500 к своему денежному потоку. «AMWAY» – империя свободы', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0087_amway-империя-свободы', 'AMWAY: 2 уровень - Золотой предприниматель', '«AMWAY» – империя свободы 2 уровень – «Золотой предприниматель» Вы создали свою группу и учите других своих партнеров этому бизнесу. Многие присоединяются к вашей ветке. Вы посещаете все обучающие семинары. Вы ежедневно слушаете кассеты с выступлениями «Бриллиантов». Если вы уже подключены к «AMWAY»,

добавьте +$500 к своему денежному потоку. «AMWAY» – империя свободы', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0088_3-уровень-изумруд', 'AMWAY: 3 уровень - Изумруд', '3 уровень – «Изумруд» Вы создали 3 группы – поздравляем! Вы получили признание «Изумруд» Вы проводите обучающие семинары ежедневно слушаете кассеты с выступлениями «Бриллиантов».

Если вы уже подключены к «AMWAY», имеете признание «Золотой предприниматель»

добавьте +$5,000 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0089_3-уровень-изумруд', 'AMWAY: 3 уровень - Изумруд', '3 уровень – «Изумруд» Вы создали 3 группы – поздравляем! Вы получили признание «Изумруд» Вы проводите обучающие семинары и ежедневно слушаете кассеты с выступлениями «Бриллиантов».

Если вы уже подключены к «AMWAY», имеете признание «Золотой предприниматель»

добавьте +$5,000 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0090_4-уровень-бриллиант', 'AMWAY: 4 уровень - Бриллиант', '4 уровень – «Бриллиант» Вы создали 6 групп – поздравляем! Оборот вашей организации превышает $60,000 Вы проводите обучающие семинары и привозите на бизнес семинары более 500 человек.

Если вы уже имеете признание «Изумруд»,

добавьте +$10,000 к своему денежному потоку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0091_10-гектаров-земли', '10 га земли: $6,000', 'Земли выведены из сельскохозяйственного оборота. Ни дорог, ни инфраструктуры. Дико и тихо.

Используйте сами или продайте другому игроку. 0% ROI, в будущем может быть продано за? ? .

Цена $6 000 Закладная $0

Первоначальный взнос $6 000

Денежный поток $0', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '6000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '6000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -6000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0092_редкая-золотая-монета', 'Редкая золотая монета: $400', 'Необычная монета XIV века. Испанские Королевские колонии в Новом Свете. В хорошем состоянии. Только одна из восьми существующих в мире. Продавец просит за нее $400.

Используйте сами или продайте другому игроку. ? ? % ROI, может быть продана от $0 000 до $4 000.

Цена $400 Пассив $0

Первоначальный взнос $400

Денежный поток $0', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '400') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '400') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -400);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0093_недобросовестные-арендаторы', 'Расход по недвижимости: $1,000', 'Ваши арендаторы нанесли урон вашему дому, не заплатили за 2 месяца и исчезли, оставив вам огромный счет за междугородние переговоры. Ваша страховая компания покрыла часть убытков, но вы еще остались должны $1000.

Заплатите в банк 1000, если вы владеете хоть какой- нибудь недвижимостью, сдаваемой внаем. Только для человека, вытащившего эту карточку.', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'conditional_cash_delta', -1000);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_rental_realestate');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0094_акция-only4u', 'Акции ONLY4U на минимуме: $5', 'Менеджмент в компании обеспечил постоянный рост активов.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ONLY4U Сегодняшняя цена $5

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0095_акция-only4u-банкротство', 'Обесценивание акций ONLY4U', 'Финансовая пирамида построенная менеджментом компании развалилась. Банкротство компании. Акции полностью обесценены.

Каждый владелец акций ONLY4U сдает свои акции. Сейчас никто не может ни купить, ни продать акции.

ONLY4U Сегодняшняя цена $0', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'ONLY4U') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_wipeout', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0096_акция-only4u', 'Акции ONLY4U снизились до $15', 'Менеджмент компании построил финансовую пирамиду.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

ONLY4U Сегодняшняя цена $15

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '15') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0097_менеджмент-в-компании-обеспечил-постоянный-рост', 'Акции IT4U выросли до $10', 'Менеджмент в компании обеспечил постоянный рост активов.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

IT4U Сегодняшняя цена $10

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '10') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0098_менеджмент-в-компании-обеспечил-постоянный-рост', 'Акции IT4U выросли до $20', 'Менеджмент в компании обеспечил постоянный рост активов.

Только вы можете купить любое количество акций по этой цене. Но каждый может продать по этой цене.

IT4U Сегодняшняя цена $20

Дивидендов нет. Доходность = 0%

Возможный разброс котировок: от $5 до $30', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_min', '5') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price_max', '30') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '20') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('small_deal', 'small_deal_0099_компания-терпит-серьезные-убытки-всвязи-со', 'Обратное дробление акций IT4U', 'Компания терпит серьезные убытки в связи с налоговой проверкой и нарушениями в области лицензирования программного обеспечения.

Каждый владелец акций IT4U уменьшает количество акций в 10 раз. Сейчас никто не может ни купить, ни продать акции.

IT4U Уменьшение в 10 раз', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'symbol', 'IT4U') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'stock_reverse_split', 10);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0100_дом-для-продажи-3m', '3M дом: $65,000, +$150/мес', 'Бизнесмен ликвидирует свой 3/2 дом, так как для поддержки своего бизнеса ему нужен наличный капитал. Сейчас его занимают счастливые арендаторы.

Можете использовать это сами или продать другим 26% РОИ, может стоить от $65 000 до $135 000

Цена: $65 000 Ипотечный кредит: $58 000

Денежный поток: +$150

Первоначальный взнос: $7 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '65000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '58000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '7000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '150') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -7000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 150);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0101_дом-для-продажи-3m', '3M дом: $70,000, +$300/мес', 'Тренер по шейпингу должен продать свой 3/2 дом, так как не может позволить себе такие взносы при новой зарплате. Территория отдается.

Можете использовать это сами или продать другим. 40% РОИ, может стоить от $65 000 до $135 000

Цена: $70 000 Ипотечный кредит: $61 000

Денежный поток: +$300

Первоначальный взнос: $9 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '70000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '61000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '9000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '300') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -9000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 300);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0102_дом-для-продажи-3m', '3M дом: $75,000, +$300/мес', '3/2 дом с выходом на поле с гольфом отдают в поисках более высоких вложений. Хорошая рента и низкие затраты.

Можете использовать это сами или отдать другим. 51% РОИ, может стоить от $65 000 до $135 000

Цена: $75 000 Ипотечный кредит: $68 000

Денежный поток: +$300

Первоначальный взнос: $7 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '75000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '68000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '7000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '300') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -7000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 300);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0103_дом-для-продажи-3m', '3M дом: $67,000, +$400/мес', 'Торговец переезжает в другой город, поэтому отдает 3/2 дом в хорошие руки. Несколько условий смогли повысить арендную плату с пожилых арендаторов.

Можете использовать это сами или отдать другим. 40% РОИ, может стоить от $65 000 до $135 000

Цена: $67 000 Ипотечный кредит: $55 000

Денежный поток: +$400

Первоначальный взнос: $12 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '67000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '55000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '12000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '400') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -12000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 400);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0104_дом-для-продажи-3m', '3M дом: $125,000, -$100/мес', 'Милый 3/2 домик с открытым бассейном и полностью используемой плодородной поверхностью, обворожительный вид на озеро. Хорошая школа.

Можете использовать это сами или продать другим -6% РОИ, может стоить от $65 000 до $135 000

Цена: $125 000 Ипотечный кредит: $105 000

Денежный поток: -$100

Первоначальный взнос: $20 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '125000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '105000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '-100') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0105_дом-для-продажи-3m', 'Расход по недвижимости: $20,000', 'Супруги развелись и теперь продают 3/2 дом на территории, которая полностью принадлежит владельцу дома. Через 5 месяцев рядом построят рынок.

Можете использовать это сами или продать другим 30% РОИ, может стоить от $65 000 до $135 000

Цена: $70 000Ипотечный кредит: $50 000

Денежный поток: +$500

Первоначальный взнос: $20 000 Разрыв канализационной трубы', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '70000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0106_хороший-инвестиционный-потенциал-в-этом-32', '3M дом: $65,000, +$300/мес', 'Хороший инвестиционный потенциал в этом 3/2 домике если, Вы сможете оплатить взнос. Положительный денежный поток приносит прибыль каждую неделю.

Можете использовать это сами или продать другим 45% РОИ, может стоить от $65 000 до $135 000

Цена: $65 000 Ипотечный кредит: $57 000

Денежный поток: +$300

Первоначальный взнос: $8 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '65000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '57000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '8000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '300') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -8000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 300);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0107_расширенный-32-дом-с-собственным-полем-для', '3M дом: $115,000, -$100/мес', 'Расширенный 3/2 дом с собственным полем для гольфа, отсутствуют наследники хозяина. Автокар для гольфа в придачу.

Можете использовать это сами или продать другим -12% РОИ, может стоить от $65 000 до $135 000

Цена: $115 000 Ипотечный кредит: $105 000

Денежный поток: -$100

Первоначальный взнос: $10 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '115000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '105000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '10000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '-100') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -10000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0108_вода-по-самую-крышу-заполнила-ваш-8-кв-дом', 'Расход по недвижимости: $2,000', 'Вода по самую крышу заполнила Ваш 8-кв. дом! Разрыв канализационной трубы нужно срочно чинить.

Если в Вашей собственности 8-кв. дом, заплатите $2000 для нового водопровода. (Банк может дать заем на обычных условиях) А если у Вас несколько 8-кв. домов, то Вы платите только за один ремонт.', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'conditional_cash_delta', -2000);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_8_plex');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0109_продажа-двух-квартирного-дома-duplex', 'Duplex: $45,000, +$320/мес', 'Duplex Внимание совладельцам и инвесторам в 2 кв. доме Собственники имеют проблемы с оплатой, жилье срочно требуется продать.

Можете использовать это сами или продать другим 48% РОИ, может стоить от $50 000 до $80 000

Цена: $45 000 Ипотечный кредит: $37 000

Денежный поток: +$320

Первоначальный взнос: $8 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '45000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '37000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '8000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '320') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -8000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 320);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0110_card', 'Duplex: $50,000, +$240/мес', 'Продажа двух-квартирного дома Duplex Семья переезжает в другой штат и продает прекрасный 2-кв. фамильный дом. Фамильное кладбище, очень ухоженный сад, большой земельный участок.

Можете использовать это сами или продать другим 36% РОИ, может стоить от $50 000 до $70 000

Цена: $50 000 Ипотечный кредит: $42 000

Денежный поток: +$240

Первоначальный взнос: $8 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '42000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '8000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '240') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -8000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 240);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0111_продажа-двух-квартирного-дома-duplex', 'Duplex: $60,000, +$300/мес', 'Duplex Хороший ухоженный 2-кв. домик в приятной территории, доступный первоначальный взнос. Замечательное и удачное вложение для правильных покупателей.

Можете использовать это сами или продать другим 36% РОИ, может стоить от $50 000 до $80 000

Цена: $60 000 Ипотечный кредит: $54 000

Денежный поток: +$300

Первоначальный взнос: $6 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '60000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '54000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '6000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '300') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -6000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 300);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0112_продажа-двух-квартирного-дома-duplex', 'Duplex: $70,000, +$140/мес', 'Duplex Этот 2-квартирный дом лучший в округе! С чувством гордости предлагаем уединение защищенность Вам и даже Вашим внукам.

Можете использовать это сами или продать другим 24% РОИ, может стоить от $50 000 до $80 000

Цена: $70 000 Ипотечный кредит: $63 000

Денежный поток: +$140

Первоначальный взнос: $7 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '70000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '63000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '7000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '140') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -7000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 140);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0113_продажа-двух-квартирного-дома-duplex', 'Duplex: $60,000, +$400/мес', 'Duplex Хозяину приходится продавать свой дом, чтобы оплатить счет за операцию в больнице. Два арендатора, все документы готовы. Это хорошая и удачная инвестиция.

Можете использовать это сами или продать другим 40% РОИ, может стоить от $50 000 до $80 000

Цена: $60 000 Ипотечный кредит: $48 000

Денежный поток: +$400

Первоначальный взнос: $12 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '60000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '48000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '12000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '400') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -12000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 400);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0114_продажа-4х-квартирного-дома-4-plex', '4-Plex: $100,000, +$800/мес', '4-квартирный дом с хорошими соседями. Полностью занят арендаторами. Сделан ремонт. Требуется лишь первоначальный платеж и немного терпения.

Можете использовать это сами или продать другим 48% РОИ, может стоить от $100 000 до $140 000

Цена: $100 000 Ипотечный кредит: $80 000

Денежный поток: +$800

Первоначальный взнос: $20 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '100000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '80000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '800') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 800);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0115_этот-дом-продается-собственником-переезжающим', 'Дом: $140,000, +$2,000/мес', 'Этот дом продается собственником, переезжающим в другой город. Арендаторы готовы продлить договор аренды.

Можете использовать это сами или продать другим 75% РОИ, может стоить от $100 000 до $140 000

Цена: $140 000 Ипотечный кредит: $108 000

Денежный поток: +$2 000

Первоначальный взнос: $32 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '140000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '108000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '32000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '2000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -32000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 2000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0116_довольно', 'Дом: $90,000, +$500/мес', 'Довольно старый дом рядом с автотрассой. Владелец переезжает в более тихое место. Цена быстрой продажи.

Можете использовать это сами или продать другим 40% РОИ, может стоить от $100 000 до $140 000

Цена: $90 000 Ипотечный кредит: $75 000

Денежный поток: +$500

Первоначальный взнос: $15 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '90000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '75000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '15000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '500') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -15000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 500);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0117_форсированная-продажа-4-х-квартирного-дома', '4-Plex: $80,000, +$750/мес', 'Форсированная продажа 4-квартирного дома. Бывший владелец, находясь в очень тяжелых финансовых условиях, годами не платил налоги.

Можете использовать это сами или продать другим 56% РОИ, может стоить от $100 000 до $140 000

Цена: $80 000 Ипотечный кредит: $64 000

Денежный поток: +$750

Первоначальный взнос: $16 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '80000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '64000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '16000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '750') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -16000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 750);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0118_продажа-4х-квартирного-дома-4-plex', '4-Plex: $80,000, +$400/мес', 'Бывший владелец дома не смог трижды выплатить платежи по ипотеке и теперь вынужден продавать дом за бесценок.

Можете использовать это сами или продать другим 24% ROI, может стоить от $100 000 до $140 000

Цена: $80 000 Ипотечный кредит: $60 000

Денежный поток: +$400

Первоначальный взнос: $20 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '80000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '60000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '400') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 400);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0119_продажа-4х-квартирного-дома-4-plex', '4-Plex: $125,000, +$600/мес', 'Прекрасный 4-квартирный дом с замечательными соседями. Постоянные арендаторы, положительный денежный поток. Никаких проблем.

Можете использовать это сами или продать другим 48% РОИ, может стоить от $100 000 до $140 000

Цена: $125 000 Ипотечный кредит: $110 000

Денежный поток: +$600

Первоначальный взнос: $15 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '125000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '110000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '15000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '600') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -15000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 600);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0120_продажа-8-квартирного-дома-8-plex', '8-Plex: $200,000, +$1,600/мес', 'Собственник влез в долги и теперь вынужден продавать свой замечательный дом. Он также требует внесения 20% задатка наличными.

Можете использовать это сами или продать другим 48% ROI, может стоить от $200 000 до $280 000

Цена: $200 000 Ипотечный кредит: $160 000

Денежный поток: +$1 600

Первоначальный взнос: $40 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '200000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '160000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '40000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1600') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -40000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1600);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0121_продажа-8-квартирного-дома-8-plex', '8-Plex: $220,000, +$1,700/мес', 'Владелец реинвестирует свой капитал в более крупную недвижимость и предлагает свой дом приемлемой цене. Финансирование сделки имеется.

Можете использовать это сами или продать другим 51% ROI, может стоить от $200 000 до $280 000

Цена: $220 000 Ипотечный кредит: $180 000

Денежный поток: +$1 700

Первоначальный взнос: $40 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '220000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '180000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1700') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1700);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0122_продажа-8-квартирного-дома-8-plex', '8-Plex: $240,000, +$950/мес', 'Собственник-инвестор предлагает свой дом по достаточно высокой стоимости. Но дом роскошный: газон, бассейн, чудесный вид.

Можете использовать это сами или продать другим 29% ROI, может стоить от $200 000 до $280 000

Цена: $240 000 Ипотечный кредит: $200 000

Денежный поток: +$950

Первоначальный взнос: $40 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '240000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '200000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '40000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '950') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -40000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 950);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0123_продажа-8-квартирного-дома-8-plex', '8-Plex: $160,000, +$1,700/мес', 'Предпринимателю срочно потребовались деньги для спасения своего бизнеса. Это хорошо растущая в цене недвижимость. Отличная возможность для смышленых.

Можете использовать это сами или продать другим 64% ROI, может стоить от $200 000 до $280 000

Цена: $160 000 Ипотечный кредит: $128 000

Денежный поток: +$1 700

Первоначальный взнос: $32 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '160000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '128000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '32000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1700') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -32000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1700);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0124_свободная', 'Свободная земля: $20,000', 'Свободная земля в зоне, примыкающей автотрассе, ведущей в аэропорт. Возможно будущем хорошее вознаграждение за риск, если зона станет коммерческой.

Можете использовать это сами или продать другим 0% ROI, может стоить? ?

Цена: $20 000 Ипотечный кредит: $0

Денежный поток: +$0

Первоначальный взнос: $20 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 0);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0125_12-квартирный-элитный-дом-продается-вдовой', '12-квартирный дом: $350,000, +$2,400/мес', '12 квартирный элитный дом продается вдовой бывшего собственника. Длинный список желающих снять жилье в этом районе.

Можете использовать это сами или продать другим 58% ROI, может стоить от $300 000 до $480 000

Цена: $350 000 Ипотечный кредит: $300 000

Денежный поток: +$2 400

Первоначальный взнос: $50 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '350000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '300000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '2400') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -50000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 2400);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0126_24-квартирный-элитный-дом-в-царском-селе', '24-квартирный дом: $550,000, +$2,800/мес', '24 квартирный элитный дом в «Царском селе» можно выкупить, если поспешить с предложением. Много желающих купить или снять жилье в этом районе. Приличный денежный поток.

Можете использовать это сами или продать другим 67% ROI, может стоить от $600 000 до $960 000

Цена: $550 000 Ипотечный кредит: $500 000

Денежный поток: +$2 800

Первоначальный взнос: $50 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '550000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '500000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '2800') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -50000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 2800);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0127_апартаменты-на-продажу', 'Апартаменты: $575,000, +$3,400/мес', '2 здания элитного жилья, в общей сложности квартиры. Недвижимость находится доверительном управлении. Эксклюзивное предложение.

Можете использовать это сами или продать другим 54% ROI, может стоить от $600 000 до $960 000

Цена: $575 000 Ипотечный кредит: $500 000

Денежный поток: +$3 400

Первоначальный взнос: $75 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '575000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '500000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '75000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '3400') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -75000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 3400);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0128_24', 'Апартаменты: $1,200,000, +$11,000/мес', '24 в Апартаменты на продажу 60 квартирный комплекс элитного жилья распродается пенсионным фондом. Внешнее управление.

Можете использовать это сами или продать другим 66% ROI, может стоить от $1 500 000 до $2 700 000

Цена: $1 200 000 Ипотечный кредит: $1 000 000

Денежный поток: +$11 000

Первоначальный взнос: $200 000', 'stock', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '1200000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '1000000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '200000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '11000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -200000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 11000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0129_бизнес-на-продажу', 'Магазин автозапчастей: $150,000, +$2,500/мес', 'Магазин автозапчастей продается разорившимся владельцем. Какие-то проблемы с «крышей». Магазин стоит на трассе.

Можете использовать это сами или продать другим 100% ROI, других желающих на покупку что-то не видно.

Цена: $150 000 Ипотечный кредит: $120 000

Денежный поток: +$2 500

Первоначальный взнос: $30 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '150000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '120000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '2500') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -30000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 2500);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0130_бизнес-на-продажу', 'Торговая точка на Горбушке: $100,000, +$1,600/мес', 'Горячая точка на «Горбушке» может быть куплена, если не тянуть с принятием решения. Старому владельцу нужно замазать обвинения в продаже пиратских дисков. Если вы сами не боитесь этого,

Можете использовать это сами или продать другим 96% ROI, других желающих на покупку что-то не видно.

Цена: $100 000 Ипотечный кредит: $80 000

Денежный поток: +$1 600

Первоначальный взнос: $20 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '100000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '80000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1600') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1600);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0131_автомойка-на-продажу', 'Автомойка: $100,000, +$1,600/мес', 'Можете использовать это сами или продать другим 36% ROI, может стоить в 12-25 раз больше, чем текущий денежный поток.

Цена: $100 000 Ипотечный кредит: $80 000

Денежный поток: +$1 600

Первоначальный взнос: $20 000 Франшиза на производство пиццы', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '100000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '80000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1600') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1600);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0132_бизнес-на-продажу', 'Салон-парикмахерская: $200,000, +$2,700/мес', 'Успешно работающий салон-парикмахерская продается из-за неожиданной смерти хозяйки. Дочь хочет избавиться от наследуемого имущества как можно быстрей.

Можете использовать это сами или продать другим 81% ROI, других желающих на покупку что-то не видно.

Цена: $200 000 Ипотечный кредит: $160 000

Денежный поток: +$2 700

Первоначальный взнос: $40 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '200000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '160000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '40000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '2700') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -40000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 2700);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0133_мастерская-по-ремонту-бытовой-техники-есть', 'Мастерская бытовой техники: $125,000, +$1,800/мес', 'Мастерская по ремонту бытовой техники. Есть оборудование, помещения, но слабое управление.

Можете использовать это сами или продать другим 86% ROI, других желающих на покупку что-то не видно.

Цена: $125 000 Ипотечный кредит: $100 000

Денежный поток: +$1 800

Первоначальный взнос: $25 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '125000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '100000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '25000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1800') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -25000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1800);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0134_продается', 'Компания по производству пиццы: $500,000, +$5,000/мес', 'Продается компания по производству пиццы. Недалеко от колледжа.

Можете использовать это сами или продать другим 60% ROI, может быть продана от $520 000 до $800 000

Цена: $500 000 Ипотечный кредит: $400 000

Денежный поток: +$5 000

Первоначальный взнос: $100 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '500000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '400000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '100000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -100000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 5000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0135_салон', 'Салон красоты: $150,000, +$1,000/мес', 'Салон красоты. Шейпинг-центр. Только для состоятельных клиентов.

Можете использовать это сами или продать другим 40% ROI, может быть продана от $100 000 до $300 000

Цена: $150 000 Ипотечный кредит: $120 000

Денежный поток: +$1 000

Первоначальный взнос: $30 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '150000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '120000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -30000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0136_партнерство', 'Партнерство: стоматология - $25,000, +$1,000/мес', 'Успешный врач-стоматолог расширяет офис клинику. Он предлагает вам быть его партнером бизнесе и внести соответствующую часть капитала.

Можете использовать это сами или продать другим 48% ROI, собственник может в будущем выкупить вашу долю за $50 000 до $75 000

Цена: $25 000 Ипотечный кредит: $0

Денежный поток: +$1 000

Первоначальный взнос: $25 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '25000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '25000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -25000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0137_партнерство', 'Партнерство: автосервис - $30,000, +$1,500/мес', 'Владелец автосервиса удваивает количество ремонтных мастерских. Для этого требуются деньги и он предлагает вам стать совладельцем бизнеса, внеся долю в капитале.

Можете использовать это сами или продать другим 60% ROI, собственник может в будущем выкупить вашу долю за $60 000 - $90 000

Цена: $30 000 Ипотечный кредит: $0

Денежный поток: +$1 500

Первоначальный взнос: $30 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1500') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -30000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1500);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0138_партнерство', 'Дом: $20,000, +$800/мес', 'Открывается новое дело: доставка горячей пиццы на дом или в офисы. Инициатор ищет деньги и может рассматривать вас как соучредителя новой фирмы.

Можете использовать это сами или продать другим 48% ROI, собственник может в будущем выкупить вашу долю за $40 000 - $60 000

Цена: $20 000 Ипотечный кредит: $0

Денежный поток: +$800

Первоначальный взнос: $20 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '20000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '800') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 800);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0139_партнерство', 'Партнерство: строительство - $30,000, +$1,000/мес', 'Вам предлагается стать соучредителем строительной компании. Для закупки инструмента, машин и материалов нужно внести долю в капитале, равную $30 000.

Можете использовать это сами или продать другим 40% ROI, собственник может в будущем выкупить вашу долю за $60 000 - $90 000

Цена: $30 000 Ипотечный кредит: $0

Денежный поток: +$1 000

Первоначальный взнос: $30 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -30000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0140_проблемы-с-арендаторами', 'Расход по недвижимости: $1,000', 'Ваши арендаторы отказываются платить из-за потери работы. Когда вы пришли, чтобы поговорить с ними, то обнаружили лишь изуродованную мебель. К счастью, вы были застрахованы, и страховая компания покрыла часть убытков. Но вам все-таки требуется для восстановления $1000.

Заплатите $1000, если у вас есть недвижимость, сдаваемая в аренду. Только для игрока, вытянувшего эту карточку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'conditional_cash_delta', -1000);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_rental_realestate');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0141_розничная-сеть-по-продаже', 'Шашлычная: $50,000, +$800/мес', 'шашлыков Вам предлагается купить долю в этом бизнесе.

Можете использовать это сами или продать другим 19% ROI, может в будущем быть продана за $35 000 - $150 000

Цена: $50 000 Ипотечный кредит: $0

Денежный поток: +$800

Первоначальный взнос: $50 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '800') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -50000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 800);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0142_ваши-арендаторы-отказываются-платить-из-за', 'Расход по недвижимости: $1,000', 'Ваши арендаторы отказываются платить из-за потери работы. Когда вы пришли, чтобы поговорить с ними, то обнаружили лишь изуродованную мебель. К счастью, вы были застрахованы, и страховая компания покрыла часть убытков. Но вам все-таки требуется для восстановления $1000.

Заплатите $1000, если у вас есть недвижимость, сдаваемая в аренду. Только для игрока, вытянувшего эту карточку.', 'deal', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'conditional_cash_delta', -1000);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_rental_realestate');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0143_владелец', 'Партнерство: автосервис - $30,000, +$1,500/мес', 'Владелец автосервиса удваивает количество ремонтных мастерских. Для этого требуются деньги и он предлагает вам стать совладельцем бизнеса, внеся долю в капитале.

Можете использовать это сами или продать другим 60% ROI, собственник может в будущем выкупить вашу долю за $60 000 - $90 000

Цена: $30 000 Ипотечный кредит: $0

Денежный поток: +$1 500

Первоначальный взнос: $30 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '0') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '1500') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -30000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 1500);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('big_deal', 'big_deal_0144_собственник-инвестор-предлагает-свой-дом-по', 'Дом: $240,000, +$950/мес', 'Собственник-инвестор предлагает свой дом по достаточно высокой стоимости. Но дом роскошный: газон, бассейн, чудесный вид.

Можете использовать это сами или продать другим 29% ROI, может стоить от $200 000 до $280 000

Цена: $240 000 Ипотечный кредит: $200 000

Денежный поток: +$950

Первоначальный взнос: $40 000', 'realestate', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '240000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'mortgage', '200000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'down_payment', '40000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'cashflow_monthly', '950') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -40000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 950);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0145_10-гектаров-земли', 'Рынок: земля 10 га за $150,000', 'Городу нужна земля для постройки крупнейшего Европе спортивного комплекса для проведения Олимпиады. Мэрия готова выплатить за подходящий участок $150 000.

Каждый владеющий таким участком может продать его по предлагаемой цене. Если вы продаете, получите деньги незамедлительно.', 'market', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0146_20-гектаров-земли', 'Рынок: земля 20 га за $200,000', 'Крупный инвестор, строящий административно- деловой комплекс Кийосаки-сити, готов предложить за этот участок приличную сумму. Это мой шанс или подождем еще?

Каждый владеющий таким участком может продать его по цене $200 000. Если вы продаете, получите деньги незамедлительно.', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '200000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0147_редкая-золотая-монета', 'Рынок: золотая монета за $5,000', 'Коллекционер горит от желания купить монету Испанских Королевских колоний XVI века. Любому, у кого есть такая монета, он готов выложить за нее $5 000. А больше у вас ничего такого нет?', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '5000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0148_салон-красоты-кофе-в-кроватку', 'Рынок: салон красоты за $250,000', 'Молодая леди, постоянная посетительница Салона, не прочь заняться чем-нибудь вроде бизнеса уговорила своего супруга купить ей свой Салон Красоты. - $250 000 вам хватит? - мило улыбаясь спросила она.

Если вы готовы продать, то получите, пожалуйста, деньги (за вычетом закладной) и не забудьте уменьшить свой пассивный доход на $1000.', 'market', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0149_автомойка', 'Рынок: автомойка за $250,000', 'Братанам невтерпеж как хочется иметь свою автомойку. Но максимум, что они предлагают – это $250 000.

Каждый, у кого есть автомойка может сейчас продать этот бизнес по предлагаемой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход на $1500.', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '250000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0150_розничная-сеть-по-продаже-шашлыков', 'Рынок: шашлычная за $100,000', 'шашлыков «Важная птица с Востока» желает купить сеть шашлычных в вашем городе. Готов отстегнуть $100 000.

Если вы готовы продать, то получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход на $800.', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '100000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0151_партнерство', 'Рынок: партнерство продается вдвое дороже', 'Бизнес был продан и вы получаете вдвое больше, чем первоначально вложили в него.

Каждый, кто имеет партнерский бизнес, получает деньги и уменьшает свой денежный поток от этого бизнеса, причем немедленно.', 'market', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0152_партнерство', 'Рынок: партнерство продается вдвое дороже', 'Бизнес был продан и вы получаете вдвое больше, чем первоначально вложили в него.

Каждый, кто имеет партнерский бизнес, получает деньги и уменьшает свой денежный поток от этого бизнеса, причем немедленно.', 'market', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0153_партнерство', 'Рынок: партнерство продается втрое дороже', 'Бизнес был продан и вы получаете втрое больше, чем первоначально вложили в него.

Каждый, кто имеет партнерский бизнес, получает деньги и уменьшает свой денежный поток от этого бизнеса, причем немедленно.', 'market', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0154_золото-дорожает', 'Рынок: золото дорожает до $600', 'На Ближнем Востоке неспокойно. Цены на нефть нестабильны. Что может быть надежней золота? Это каждый инвестор знает – потому-то оно дорожает. Любой, у кого есть золотые монеты царской чеканки, может сейчас продать их, каждую по $600. А больше у вас ничего такого нет?', 'market', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0155_циркониевые-браслеты-инженеринвестор', 'Рынок: циркониевые браслеты за $50,000', 'Инженер/Инвестор весьма заинтересован в получении технологии изготовления столь популярных ныне циркониевых браслетов.

Каждый, кто владеет таким бизнесом, может продать его по цене $50 000. Если вы продаете, получите деньги незамедлительно и начните новое дело.', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '50000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0156_программное-обеспечение', 'Рынок: программное обеспечение за $100,000', 'Ваши разработки встали костью в горле крупной компани производителя ПО. Дабы устранить конкурента ее хозяин предложил вам продать свой продукт финансовых программ со всеми правами.

Каждый, кто владеет таким бизнесом, может продать его по цене $100 000.

Если вы решили расстаться со своим детищем, то получите деньги незамедлительно и начните новое', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '100000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0157_расширение-малого-бизнеса', 'Малый бизнес: cashflow +$400/мес', 'Малый бизнес, который вы основали, стал дистрибьютором ведущей компании отрасли. Ваши прибыли возросли на 150%. Конечно, это принесло много проблем и занимает гораздо больше времени, но зато увеличивает ваш

денежный поток на $400. Каждый, кто основал свой собственный бизнес, получает теперь на $400 больше в каждом таком бизнесе.', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 400);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0158_расширение-малого-бизнеса', 'Малый бизнес: cashflow +$250/мес', 'Малый бизнес, который вы основали, выиграл приз за внедрение Инноваций. Множество публикаций об этом удвоили количества ваших клиентов. Конечно, это было непросто и заняло много времени, но зато увеличило ваш денежный поток на $250.

Каждый, кто основал свой собственный бизнес, получает теперь на $250 больше в каждом таком бизнесе.', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', 250);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0159_дело', 'Рынок: 3M продается с прибылью $50,000', 'Процентные ставки по ипотечным кредитам снижены!

Если вы (но не другие игроки) владеете 3М, сдаваемым в аренду, то можете продать их по цене, превышающей их первоначальную стоимость на $50 000.

Если вы готовы продать, то получите, пожалуйста, деньги (за вычетом закладной) и не забудьте уменьшить свой пассивный доход за каждую проданную недвижимость.', 'market', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0160_инфляция', 'Рынок: инфляция давит на 3M', 'Инфляция достигла критической точки 10%. Процентные ставки повысились до 20%. Вы не в состоянии более платить проценты по закладным и содержать дома 3М, которыми вы (но не другие игроки) владеете.

Сдайте обратно в банк все ваши дома 3М. Вы потеряли и свой денежный поток от этой недвижимости.', 'market', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0161_вы-покупатель-дома-2у', 'Рынок: покупатель 2У за $55,000', 'Вы Покупатель дома 2У

Предлагается $55,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '55000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0162_покупатель-2у', 'Рынок: покупатель 2У за $45,000', 'Предлагается $45,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '45000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0163_покупатель-2у', 'Рынок: покупатель 2У за $55,000', 'Предлагается $55,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва закладной, получите, пожалуйста, деньги и забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '55000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0164_покупатель-2у', 'Рынок: покупатель 2У за $65,000', 'Предлагается $65,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '65000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0165_покупатель-3m', 'Рынок: покупатель 3M за $65,000', 'Предлагается $65,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '65000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0166_покупатель-3m', 'Рынок: покупатель 3M за $110,000', 'Предлагается $110,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва закладной, получите, пожалуйста, деньги и забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '110000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0167_покупатель-3m', 'Рынок: покупатель 3M за $100,000', 'Предлагается $100,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '100000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0168_покупатель-3m', 'Рынок: покупатель 3M за $100,000', 'Предлагается $100,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '100000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0169_покупатель-3m', 'Рынок: покупатель 3M за $135,000', 'Предлагается $135,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва закладной, получите, пожалуйста, деньги и забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '135000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0170_покупатель-3m', 'Рынок: покупатель 3M за $135,000', 'Предлагается $135,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '135000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0171_покупатель-3m', 'Рынок: покупатель 3M за $90,000', 'Предлагается $90,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '90000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0172_покупатель-3m', 'Рынок: покупатель 3M за $100,000', 'Ваш племянник потерял работу и ему негде жить, если только вы не согласитесь продать ему ваш дом 3Br\2Ba. Он клятвенно обещает выплатить $100,000 в течение 4 лет, но пока что у него нет доходов, ни сбережений. Он может платить небольшую сумму ежемесячно, но никак не первоначальный взнос.

Если вы готовы продать на этих условиях, то ваш денежный поток уменьшится на $500 до тех пор,', 'market', NULL);
SET @cid = LAST_INSERT_ID();

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0173_покупатель-plex', 'Рынок: покупатель Plex за $25,000/блок', 'Предлагается $25,000 за каждый блок в любой комбинации: 2, 4 или 8-квартирных домов.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '25000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0174_покупатель-plex', 'Рынок: покупатель Plex за $30,000/блок', 'Предлагается $30,000 за каждый блок в любой комбинации: 2, 4 или 8-квартирных домов.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0175_пока-вы-не-наскребете-100000', 'Рынок: покупатель Plex за $40,000/блок', 'пока вы не наскребете $100,000. Покупатель Plex

Предлагается $40,000 за каждый блок в любой комбинации: 2, 4 или 8-квартирных домов.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва закладной, получите, пожалуйста, деньги и забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0176_покупатель-plex', 'Рынок: покупатель Plex за $35,000/блок', 'Предлагается $35,000 за каждый блок в любой комбинации: 2, 4 или 8-квартирных домов.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '35000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0177_покупатель-plex', 'Рынок: покупатель Plex за $30,000/блок', 'Предлагается $30,000 за каждый блок в любой комбинации: 2, 4 или 8-квартирных домов.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0178_покупатель-plex', 'Рынок: покупатель Plex за $25,000/блок', 'Предлагается $25,000 за каждый блок в любой комбинации: 2, 4 или 8-квартирных домов.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва закладной, получите, пожалуйста, деньги и забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '25000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0179_покупатель-plex', 'Рынок: покупатель Plex за $30,000/блок', 'Предлагается $30,000 за каждый блок в любой комбинации: 2, 4 или 8-квартирных домов.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0180_покупатель-plex', 'Рынок: покупатель Plex за $35,000/блок', 'Предлагается $35,000 за каждый блок в любой комбинации: 2, 4 или 8-квартирных домов.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '35000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0181_покупатель-plex', 'Рынок: покупатель Plex за $35,000/блок', 'Предлагается $35,000 за каждый блок в любой комбинации: Duplex, 4-Plex или 8-Plex.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва закладной, получите, пожалуйста, деньги и забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '35000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0182_покупатель-plex', 'Рынок: покупатель Plex за $40,000/блок', 'Предлагается $40,000 за каждый блок в любой комбинации: Duplex, 4-Plex или 8-Plex.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0183_покупатель-апартаменты', 'Рынок: покупатель апартаментов за $30,000/номер', 'Предлагается $30,000 за каждый номер в апартаментах.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0184_покупатель-апартаменты', 'Рынок: покупатель апартаментов за $40,000/номер', 'Предлагается $40,000 за каждый номер в апартаментах.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва закладной, получите, пожалуйста, деньги и забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '40000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0185_покупатель-апартаменты', 'Рынок: покупатель апартаментов за $25,000/номер', 'Предлагается $25,000 за каждый номер в апартаментах.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '25000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0186_покупатель-апартаменты', 'Рынок: покупатель апартаментов за $45,000/номер', 'Предлагается $45,000 за каждый номер в апартаментах.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '45000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0187_покупатель-plex', 'Рынок: покупатель Plex за $30,000/блок', 'Предлагается $30,000 за каждый блок в любой комбинации: Duplex, 4-Plex или 8-Plex.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва закладной, получите, пожалуйста, деньги и забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '30000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0188_покупатель-2у', 'Рынок: покупатель 2У за $55,000', 'Предлагается $55,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '55000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('market', 'market_0189_покупатель-3m', 'Рынок: покупатель 3M за $65,000', 'Предлагается $65,000 за этот дом.

Каждый может продать по этой цене.

Если вы готовы продать, то рассчитайтесь сперва по закладной, получите, пожалуйста, деньги и не забудьте уменьшить свой пассивный доход', 'market', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'price', '65000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0190_свадьба-вашей-дочери', 'Свадьба вашей дочери: $2,000 при наличии детей', 'Заплатите $2000

(если у вас есть ребенок)', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -2000);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_children');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0191_день-рождения', 'День Рождения: $100 при наличии детей', 'Вы сходили с ребенком в Аквапарк и потратили там $100

(если у вас есть ребенок)', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -100);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_children');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0192_новая-удочка', 'Новая удочка: $100', 'Заплатите $100', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0193_хорошо-покушали', 'Хорошо покушали: $80', 'Заплатите по счету $80', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -80);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0194_автомобильный-кондиционер', 'Автомобильный кондиционер: $700', 'Заплатите $700', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -700);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0195_новый-костюмчик', 'Новый костюмчик: $250', 'Заплатите $250', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -250);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0196_фотография-любимого-артиста', 'Фотография любимого артиста: $200', 'Заплатите $200', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -200);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0197_обед-с-друзьями', 'Обед с друзьями: $140', 'Заплатите $140', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -140);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0198_визит-к-зубному-врачу-вставили-новые-зубы', 'Визит к зубному врачу – вставили новые зубы: $1,000', 'Визит к зубному врачу – вставили новые зубы

Заплатите $1000', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -1000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0199_запрещенное-рыболовство-в-водоохранной-зоне', 'Запрещенное рыболовство в водоохранной зоне: $100', 'Запрещенное рыболовство в водоохранной зоне

Заплатите $100', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0200_встреча-с-выпускниками-института', 'Встреча с выпускниками института: $250', 'Заплатите $250', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -250);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0201_отпуск-с-семьей', 'Отпуск с семьей: $2,000', 'Заплатите $2000', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -2000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0202_налоговая-проверка', 'Налоговая проверка: $500', 'Заплатите $500', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -500);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0203_ремонт-квартиры', 'Ремонт квартиры: $1,600', 'Заплатите $1600', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -1600);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0204_концерт', 'Концерт: $100', 'Заплатите $100', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0205_кофе-каппучино-для-себя-и-своей-спутницы', 'Кофе Каппучино для себя и своей спутницы: $20', 'Кофе Каппучино для себя и своей спутницы

Заплатите $20', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0206_новый-волейбольный-мяч', 'Новый волейбольный мяч: $20', 'Заплатите $20', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -20);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0207_новые-стереонаушники', 'Новые стереонаушники: $200', 'Заплатите $200', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -200);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0208_ноутбук-для-ребенка', 'Ноутбук для ребенка: $2,000 при наличии детей', 'Заплатите $2000

(если у вас есть дети)', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -2000);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_children');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0209_новый-шар-для-боулинга', 'Новый шар для боулинга: $80', 'Заплатите $80', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -80);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0210_новый-водный-глиссер', 'Новый водный глиссер: $1,000 + кредит $17,000', 'Заплатите $1,000 первоначальный взнос и $17,000 в кредит (Добавьте $17,000 в Пассив и $340 в ежемесячные расходы)', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -1000);
INSERT INTO card_effects (card_id, effect_type, amount_cents, payload) VALUES (@cid, 'liability.create', 17000, '{"mandatory":true,"type":"doodad_loan","name":"Новый водный глиссер","paymentCents":340}');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0211_репетитор-для-сына-при-поступлении-в-институт', 'Репетитор для сына при поступлении в институт: $1,500 при наличии детей', 'Репетитор для сына при поступлении в институт

Заплатите $1,500

(если у вас есть дети)', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -1500);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_children');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0212_распродажа-мебели-заменили-старое-кресло', 'Замена старого кресла: $80', 'Распродажа мебели Заменили старое кресло

Заплатите $80', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -80);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0213_аренда-теннисного-корта', 'Аренда теннисного корта: $100', 'Заплатите $100', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0214_новый-компакт-диск', 'Новый компакт диск: $100', 'Заплатите $100', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0215_казино', 'Казино: $2,000', 'Удовольствие обошлось в $2000 На этот раз пронесло…', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -2000);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0216_лотерея', 'Лотерея: $100', 'Потерял всего лишь $100', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0217_замена-автомобильных-шин', 'Замена автомобильных шин: $300', 'Заплатите $300', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -300);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0218_новый-кухонный-комбайн', 'Новый кухонный комбайн: $150', 'Заплатите $150', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -150);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0219_новые-модные-солнцезащитные-очки', 'Новые модные солнцезащитные очки: $50', 'Заплатите $50', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -50);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0220_новые-очаровательные-наручные-часики', 'Новые очаровательные наручные часики: $150', 'Новые очаровательные наручные часики (хотя у вас уже есть 3 штуки)

Заплатите $150', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -150);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0221_посещение-аэро-шоу', 'Посещение аэро-шоу: $120', 'Заплатите $120', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -120);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0222_новая-теннисная-ракетка', 'Новая теннисная ракетка: $200', 'Заплатите $200', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -200);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0223_распродажа-изумительная-имитация-драгоценностей', 'Распродажа! Изумительная имитация драгоценностей: $350', 'Распродажа! Изумительная имитация драгоценностей

Заплатите $350', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -350);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0224_новый-телевизор-с-большим-экраном', 'Новый телевизор с большим экраном: $4,000', 'Заплатите $4,000 (Вы можете рассчитаться кредитной карточкой. В этом случае добавьте $4,000 в Пассив по кредитным карточкам и $120 в Расходы)', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'liability_added', '4000') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -4000);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cashflow_delta', -120);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0225_новая-посудомоечная-машина', 'Новая посудомоечная машина: $450', 'Заплатите $450', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -450);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0226_футбол-пиво', 'Футбол. Пиво: $50', 'Заплатите $50', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -50);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0227_ваш-юбилей', 'Ваш юбилей: $200', 'Заплатите $200', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -200);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0228_кофеварка-каппучино', 'Кофеварка Каппучино: $150', 'Заплатите $150', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -150);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0229_провалы-в-памяти-дополнительные-курсы-по-выработке', 'Курсы бизнес-навыков: $220', 'Провалы в памяти Дополнительные курсы по выработке бизнес- навыков

Заплатите $220 за тренинг', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -220);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0230_еще-один-мобильный-телефон', 'Еще один мобильный телефон: $100', 'Заплатите $100', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -100);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0231_новые-игрушки-для-ваших-детей', 'Новые игрушки для ваших детей: $50 за ребенка', 'Заплатите $50 за каждого ребенка

(если у вас есть дети)', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_meta (card_id, meta_key, meta_value) VALUES (@cid, 'per_child', 'true') ON DUPLICATE KEY UPDATE meta_value=VALUES(meta_value);
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -50);
INSERT INTO card_conditions (card_id, cond_type) VALUES (@cid, 'has_children');

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0232_караоке', 'Караоке: $350', 'Заплатите $350', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -350);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0233_авария-залил-соседа-снизу', 'Авария! Залил соседа снизу: $500', 'Заплатите $500', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -500);

INSERT INTO cards (card_type, slug, title, body_text, category, subcategory) VALUES ('doodad', 'doodad_0234_автомагнитола', 'Автомагнитола: $400', 'Заплатите $400', 'expense', NULL);
SET @cid = LAST_INSERT_ID();
INSERT INTO card_effects (card_id, effect_type, amount_cents) VALUES (@cid, 'cash_delta', -400);

COMMIT;
