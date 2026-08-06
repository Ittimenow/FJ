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
