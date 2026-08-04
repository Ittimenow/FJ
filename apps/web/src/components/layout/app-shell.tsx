import { figurineImagePath } from "@cashflow/shared";
import Link from "next/link";
import { GameRoomHeaderSlot } from "@/components/layout/game-room-header-context";
import { GuideLink } from "@/components/layout/guide-link";
import { BrandLogo } from "@/components/layout/brand-logo";

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
    <div className="min-h-screen min-w-0 bg-surface text-ink">
      <header className="app-shell-header sticky top-0 z-[100] sm:px-4">
        <div className="mx-auto grid min-h-16 min-w-0 max-w-[1480px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 rounded-2xl bg-card/95 px-2 py-2 shadow-panel backdrop-blur-md min-[420px]:gap-2 min-[420px]:px-3 sm:px-4">
          <Link
            href="/dashboard"
            aria-label="Финансовое путешествие — личный кабинет"
            className="flex min-h-11 min-w-11 items-center rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
          >
            <BrandLogo
              markClassName="h-10 w-10"
              textClassName="!hidden text-[13px] lg:!flex"
            />
          </Link>
          <GameRoomHeaderSlot />
          {userName ? (
            <div className="flex items-center justify-self-end gap-0 min-[420px]:gap-2">
              <GuideLink />
              <Link
                href="/profile"
                aria-label={`Открыть профиль: ${userName}`}
                className="flex h-11 w-11 items-center justify-center gap-2 rounded-xl p-0 text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 lg:w-auto lg:px-2"
              >
                <UserAvatar
                  url={userAvatarUrl}
                  color={userAvatarColor}
                  initials={userInitials}
                  figurine={userFigurine}
                />
                <span className="hidden text-sm lg:inline">{userName}</span>
              </Link>
            </div>
          ) : null}
        </div>
      </header>
      <main className="app-shell-main mx-auto min-w-0 max-w-[1480px] px-3 py-6 sm:px-4 sm:py-8">{children}</main>
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
        className="h-9 w-9 shrink-0 object-contain"
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
