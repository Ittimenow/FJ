export type GameRoomView = "classic" | "journey";

export function gameRoomViewForRole(role: string | null | undefined, requestedView: string | undefined): GameRoomView {
  return role === "ADMIN" && requestedView === "journey" ? "journey" : "classic";
}
