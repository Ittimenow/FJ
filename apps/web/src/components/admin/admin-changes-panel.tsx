import { Badge } from "@/components/ui/badge";
import type { ChangeCategory, SystemRelease } from "@/lib/changes";

const categoryDetails: Record<
  ChangeCategory,
  { label: string; className: string }
> = {
  feature: { label: "Новое", className: "bg-[#eaf3e0] text-success" },
  improvement: { label: "Улучшение", className: "bg-[#e8effe] text-journey" },
  fix: { label: "Исправление", className: "bg-[#fff0df] text-warning" },
  technical: { label: "Техническое", className: "bg-card text-ink" }
};

export function AdminChangesPanel({
  releases,
  currentVersion
}: {
  releases: SystemRelease[];
  currentVersion: string;
}) {
  if (releases.length === 0) {
    return <p className="rounded-xl bg-card p-5 text-sm text-muted">Записей об изменениях пока нет.</p>;
  }

  return (
    <div className="space-y-4">
      {releases.map((release) => {
        const isUnreleased = release.version === "unreleased";
        const isCurrent = release.version === currentVersion;

        return (
          <section
            key={release.version}
            className={
              isUnreleased
                ? "rounded-xl bg-ink p-5 text-white"
                : "border-b border-line/70 px-1 py-5 first:pt-1 last:border-0 last:pb-1"
            }
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold">
                {isUnreleased ? "Готовится к выпуску" : `Версия ${release.version}`}
              </h3>
              {isCurrent ? <Badge className="bg-[#e8effe] font-bold text-journey">Текущая</Badge> : null}
              {release.releasedAt ? (
                <span className={isUnreleased ? "text-xs text-white/60" : "text-xs text-muted"}>
                  {formatReleaseDate(release.releasedAt)}
                </span>
              ) : null}
              <span className={isUnreleased ? "ml-auto text-xs font-bold text-white/60" : "ml-auto text-xs font-bold text-muted"}>
                {release.changes.length} изменений
              </span>
            </div>

            <ul className="space-y-3.5">
              {release.changes.map((change) => {
                const category = categoryDetails[change.category];
                return (
                  <li key={change.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <Badge className={`${category.className} shrink-0 font-bold sm:w-28 sm:justify-center`}>
                      {category.label}
                    </Badge>
                    <span className={isUnreleased ? "text-sm leading-6 text-white/80" : "text-sm leading-6 text-muted"}>{change.summary}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function formatReleaseDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(value));
}
