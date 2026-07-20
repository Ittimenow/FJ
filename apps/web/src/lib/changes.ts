import changesDocument from "../../../../docs/changes.json";

export type ChangeCategory = "feature" | "improvement" | "fix" | "technical";

export interface SystemChange {
  id: string;
  category: ChangeCategory;
  summary: string;
}

export interface SystemRelease {
  version: string;
  releasedAt?: string;
  changes: SystemChange[];
}

export const systemReleases = changesDocument.releases as SystemRelease[];
