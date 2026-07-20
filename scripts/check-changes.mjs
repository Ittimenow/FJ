import { readFileSync } from "node:fs";

const allowedCategories = new Set(["feature", "improvement", "fix", "technical"]);
const changesFile = "docs/changes.json";
const errors = [];
let document;

try {
  document = JSON.parse(readFileSync(changesFile, "utf8"));
} catch (error) {
  console.error(`Не удалось прочитать ${changesFile}: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(document.releases) || document.releases.length === 0) {
  errors.push("Поле releases должно быть непустым массивом.");
} else {
  const versions = new Set();
  const ids = new Set();
  let previousReleaseTimestamp = Number.POSITIVE_INFINITY;

  for (const [releaseIndex, release] of document.releases.entries()) {
    const location = `releases[${releaseIndex}]`;
    if (typeof release.version !== "string" || release.version.trim() === "") {
      errors.push(`${location}.version должно быть непустой строкой.`);
    } else if (versions.has(release.version)) {
      errors.push(`Версия ${release.version} указана больше одного раза.`);
    } else {
      versions.add(release.version);
    }

    if (release.version !== "unreleased") {
      if (typeof release.releasedAt !== "string" || Number.isNaN(Date.parse(release.releasedAt))) {
        errors.push(`${location}.releasedAt должно содержать корректную дату выпуска.`);
      } else {
        const releaseTimestamp = Date.parse(release.releasedAt);
        if (releaseTimestamp > previousReleaseTimestamp) {
          errors.push("Выпущенные релизы должны быть отсортированы от новых к старым.");
        }
        previousReleaseTimestamp = releaseTimestamp;
      }
    } else if (releaseIndex !== 0) {
      errors.push("Релиз unreleased должен быть первым в списке.");
    }

    if (!Array.isArray(release.changes) || release.changes.length === 0) {
      errors.push(`${location}.changes должен быть непустым массивом.`);
      continue;
    }

    for (const [changeIndex, change] of release.changes.entries()) {
      const changeLocation = `${location}.changes[${changeIndex}]`;
      if (typeof change.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(change.id)) {
        errors.push(`${changeLocation}.id должен быть уникальным kebab-case идентификатором.`);
      } else if (ids.has(change.id)) {
        errors.push(`Идентификатор ${change.id} указан больше одного раза.`);
      } else {
        ids.add(change.id);
      }

      if (!allowedCategories.has(change.category)) {
        errors.push(`${changeLocation}.category содержит недопустимую категорию.`);
      }
      if (typeof change.summary !== "string" || change.summary.trim().length < 10) {
        errors.push(`${changeLocation}.summary должно содержать краткое описание.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Журнал изменений содержит ошибки:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`Журнал изменений корректен: ${document.releases.length} релизов.`);
