import Link from "next/link";
import { Info } from "lucide-react";
import { GameRoomHeaderSlot } from "@/components/layout/game-room-header-context";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string | null;
  userAvatarUrl?: string | null;
  userAvatarColor?: string;
  userInitials?: string;
}

export function AppShell({
  children,
  userName,
  userAvatarUrl,
  userAvatarColor,
  userInitials
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wide">
            Financial Journey
          </Link>
          <GameRoomHeaderSlot />
          {userName ? (
            <div className="flex items-center gap-2">
              <Link
                href="/guide"
                aria-label="Правила игры"
                title="Правила игры"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-neutral-600 transition hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 text-neutral-600 transition hover:text-ink"
              >
                <UserAvatar
                  url={userAvatarUrl}
                  color={userAvatarColor}
                  initials={userInitials}
                />
                <span className="hidden text-sm sm:inline">{userName}</span>
              </Link>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

function UserAvatar({
  url,
  color,
  initials
}: {
  url?: string | null | undefined;
  color?: string | undefined;
  initials?: string | undefined;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-8 w-8 rounded-full object-cover border border-line shrink-0"
      />
    );
  }
  if (initials) {
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white select-none"
        style={{ backgroundColor: color ?? "#64748b" }}
      >
        {initials}
      </div>
    );
  }
  return null;
}
