export const figurines = [
  { id: "waiting-one", name: "Ждун" },
  { id: "toilet", name: "Унитаз" },
  { id: "rubber-duck", name: "Резиновая уточка" },
  { id: "banana", name: "Банан" },
  { id: "slipper", name: "Тапок" },
  { id: "dumpling", name: "Пельмень" },
  { id: "cat-in-box", name: "Кот в коробке" },
  { id: "sad-cactus", name: "Грустный кактус" },
  { id: "screaming-mug", name: "Кричащая кружка" },
  { id: "chicken", name: "Курица" },
  { id: "hooligan-goose", name: "Гусь-хулиган" },
  { id: "sock", name: "Носок" },
  { id: "bread-loaf", name: "Батон хлеба" },
  { id: "teapot", name: "Чайник" },
  { id: "alarm-clock", name: "Будильник" },
  { id: "trash-can", name: "Мусорный бак" },
  { id: "frog-on-chair", name: "Лягушка на стуле" },
  { id: "angry-pigeon", name: "Сердитый голубь" },
  { id: "potato-king", name: "Картошка-король" },
  { id: "pizza", name: "Пицца" },
  { id: "donut", name: "Пончик" },
  { id: "mushroom-in-hat", name: "Гриб в шляпе" },
  { id: "crab-with-mug", name: "Краб с кружкой" },
  { id: "person-under-blanket", name: "Человек под одеялом" },
  { id: "angry-lemon", name: "Злой лимон" },
  { id: "knight", name: "Рыцарь" },
  { id: "viking", name: "Викинг" },
  { id: "wizard", name: "Волшебник" },
  { id: "archer", name: "Лучник" },
  { id: "ninja", name: "Ниндзя" },
  { id: "pirate", name: "Пират" },
  { id: "astronaut", name: "Космонавт" },
  { id: "robot", name: "Робот" },
  { id: "samurai", name: "Самурай" },
  { id: "gladiator", name: "Гладиатор" },
  { id: "detective", name: "Детектив" },
  { id: "sheriff", name: "Шериф" },
  { id: "firefighter", name: "Пожарный" },
  { id: "scientist", name: "Учёный" },
  { id: "king", name: "Король" },
  { id: "chess-knight", name: "Шахматный конь" },
  { id: "dragon", name: "Дракон" },
  { id: "owl", name: "Сова" },
  { id: "shark", name: "Акула" },
  { id: "skull", name: "Череп" },
  { id: "rocket", name: "Ракета" },
  { id: "tank", name: "Танк" },
  { id: "lighthouse", name: "Маяк" },
  { id: "key", name: "Ключ" },
  { id: "winners-cup", name: "Кубок победителя" }
] as const;

export type FigurineId = (typeof figurines)[number]["id"];

const figurineIds = new Set<string>(figurines.map((figurine) => figurine.id));

export function isFigurineId(value: string): value is FigurineId {
  return figurineIds.has(value);
}

export function figurineImagePath(id: FigurineId | string) {
  return `/figurines/${id}.png`;
}
