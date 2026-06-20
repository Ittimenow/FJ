export function avatarInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return b ? (a + b).toUpperCase() : displayName.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "#e11d48", // rose
  "#db2777", // pink
  "#9333ea", // purple
  "#7c3aed", // violet
  "#2563eb", // blue
  "#0891b2", // cyan
  "#0d9488", // teal
  "#16a34a", // green
  "#ca8a04", // yellow
  "#ea580c", // orange
  "#dc2626", // red
  "#4f46e5"  // indigo
];

export function generateAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? "#64748b";
}
