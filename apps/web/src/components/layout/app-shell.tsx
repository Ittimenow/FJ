import Link from "next/link";
import { signOut } from "@/auth";
import { GameRoomHeaderSlot } from "@/components/layout/game-room-header-context";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  userName
}: {
  children: React.ReactNode;
  userName?: string | null;
}) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wide">
            Financial Journey
          </Link>
          <GameRoomHeaderSlot />
          {userName ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-neutral-600 sm:inline">
                {userName}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <Button type="submit" variant="secondary" className="h-9">
                  Выйти
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
