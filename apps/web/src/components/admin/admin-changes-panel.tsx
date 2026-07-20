import { Badge } from "@/components/ui/badge";
import type { ChangeCategory, SystemRelease } from "@/lib/changes";

const categoryDetails: Record<
  ChangeCategory,
  { label: string; className: string }
> = {
  feature: { label: "Новое", className: "bg-emerald-100 text-emerald-800" },
  improvement: { label: "Улучшение", className: "bg-blue-100 text-blue-800" },
  fix: { label: "Исправление", className: "bg-amber-100 text-amber-800" },
  technical: { label: "Техническое", className: "bg-neutral-200 text-neutral-700" }
};

export function AdminChangesPanel({
  releases,
  currentVersion
}: {
  releases: SystemRelease[];
  currentVersion: string;
}) {
  if (releases.length === 0) {
    return <p className="text-sm text-neutral-600">Записей об изменениях пока нет.</p>;
  }

  return (
    <div className="space-y-6">
      {releases.map((release) => {
        const isUnreleased = release.version === "unreleased";
        const isCurrent = release.version === currentVersion;

        return (
          <section key={release.version} className="border-b border-line pb-6 last:border-0 last:pb-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">
                {isUnreleased ? "Готовится к выпуску" : `Версия ${release.version}`}
              </h3>
              {isCurrent ? <Badge className="bg-ink text-white">Текущая</Badge> : null}
              {release.releasedAt ? (
                <span className="text-xs text-neutral-500">
                  {formatReleaseDate(release.releasedAt)}
                </span>
              ) : null}
            </div>

            <ul className="space-y-3">
              {release.changes.map((change) => {
                const category = categoryDetails[change.category];
                return (
                  <li key={change.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <Badge className={`${category.className} shrink-0 sm:w-24 sm:justify-center`}>
                      {category.label}
                    </Badge>
                    <span className="text-sm leading-6 text-neutral-700">{change.summary}</span>
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
