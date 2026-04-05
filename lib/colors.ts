const PALETTE = [
  { bg: "bg-indigo-100", text: "text-indigo-700", ring: "bg-indigo-200", hero: "from-indigo-500 to-indigo-600" },
  { bg: "bg-rose-100", text: "text-rose-700", ring: "bg-rose-200", hero: "from-rose-500 to-rose-600" },
  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "bg-emerald-200", hero: "from-emerald-500 to-emerald-600" },
  { bg: "bg-amber-100", text: "text-amber-700", ring: "bg-amber-200", hero: "from-amber-500 to-amber-600" },
  { bg: "bg-cyan-100", text: "text-cyan-700", ring: "bg-cyan-200", hero: "from-cyan-500 to-cyan-600" },
  { bg: "bg-violet-100", text: "text-violet-700", ring: "bg-violet-200", hero: "from-violet-500 to-violet-600" },
  { bg: "bg-pink-100", text: "text-pink-700", ring: "bg-pink-200", hero: "from-pink-500 to-pink-600" },
  { bg: "bg-teal-100", text: "text-teal-700", ring: "bg-teal-200", hero: "from-teal-500 to-teal-600" },
];

export function getUserColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * Build a map of user-id → unique initials.
 * Single letter when unique, two letters when another user shares the same first letter.
 * Second letter = first letter of last name (or second letter of first name if no last name).
 */
export function buildInitialsMap(users: { id: string; name: string }[]): Record<string, string> {
  const firstLetters: Record<string, { id: string; name: string }[]> = {};
  for (const u of users) {
    const fl = u.name.charAt(0).toUpperCase();
    if (!firstLetters[fl]) firstLetters[fl] = [];
    firstLetters[fl].push(u);
  }

  const result: Record<string, string> = {};
  for (const group of Object.values(firstLetters)) {
    if (group.length === 1) {
      result[group[0].id] = group[0].name.charAt(0).toUpperCase();
    } else {
      for (const u of group) {
        const parts = u.name.trim().split(/\s+/);
        const first = parts[0].charAt(0).toUpperCase();
        const second =
          parts.length > 1
            ? parts[1].charAt(0).toUpperCase()
            : parts[0].charAt(1)?.toUpperCase() ?? "";
        result[u.id] = first + second;
      }
    }
  }
  return result;
}

/** Get initials for a single name (standalone, no conflict check). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return name.charAt(0).toUpperCase();
}
