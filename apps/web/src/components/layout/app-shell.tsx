import { figurineImagePath } from "@cashflow/shared";
import Link from "next/link";
import { GameRoomHeaderSlot } from "@/components/layout/game-room-header-context";
import { GuideLink } from "@/components/layout/guide-link";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string | null;
  userAvatarUrl?: string | null;
  userAvatarColor?: string;
  userInitials?: string;
  userFigurine?: string | null;
}

export function AppShell({
  children,
  userName,
  userAvatarUrl,
  userAvatarColor,
  userInitials,
  userFigurine
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wide">
            Финансовое путешествие
          </Link>
          <GameRoomHeaderSlot />
          {userName ? (
            <div className="flex items-center justify-self-end gap-2">
              <GuideLink />
              <Link
                href="/profile"
                className="flex items-center gap-2 text-neutral-600 transition hover:text-ink"
              >
                <UserAvatar
                  url={userAvatarUrl}
                  color={userAvatarColor}
                  initials={userInitials}
                  figurine={userFigurine}
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
  initials,
  figurine
}: {
  url?: string | null | undefined;
  color?: string | undefined;
  initials?: string | undefined;
  figurine?: string | null | undefined;
}) {
  if (figurine) {
    return (
      <img
        src={figurineImagePath(figurine)}
        alt=""
        className="h-10 w-10 shrink-0 object-contain"
      />
    );
  }
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
