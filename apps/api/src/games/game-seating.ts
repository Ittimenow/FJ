export function nextAvailableSeat(occupiedSeats: Iterable<number>) {
  const occupied = new Set(
    Array.from(occupiedSeats).filter(
      (seat) => Number.isInteger(seat) && seat > 0
    )
  );

  let seat = 1;
  while (occupied.has(seat)) seat += 1;
  return seat;
}

export function interleavePlayers<T>(players: readonly T[], isBot: (player: T) => boolean, random = Math.random): T[] {
  const shuffle = (items: T[]) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [items[index], items[other]] = [items[other]!, items[index]!];
    }
    return items;
  };
  const humans = shuffle(players.filter((player) => !isBot(player)));
  const bots = shuffle(players.filter(isBot));
  if (humans.length === 0) return bots;

  const groups = humans.map((human) => [human]);
  bots.forEach((bot, index) => groups[index % groups.length]!.push(bot));
  const order = groups.flat();
  const first = Math.floor(random() * order.length);
  return [...order.slice(first), ...order.slice(0, first)];
}
