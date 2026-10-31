/** Classes for one tab of a pill-shaped tab bar (`rounded-full border border-line bg-surface p-1`). */
export function segmentClass(selected: boolean): string {
  const base =
    'flex-1 rounded-full px-3 py-1 text-sm font-semibold focus-visible:ring-3 focus-visible:ring-accent-200 focus-visible:outline-none';
  if (selected) return `${base} bg-accent-600 text-white`;
  return `${base} text-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-ink-muted`;
}
