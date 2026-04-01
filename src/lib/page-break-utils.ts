/** Token prefix for manual page breaks in `selectedSections` order (FlowCV-style). */
export const PAGE_BREAK_PREFIX = '__pageBreak__:' as const;

export function isPageBreakToken(id: string): boolean {
  return id.startsWith(PAGE_BREAK_PREFIX);
}

export function createPageBreakId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);
  return `${PAGE_BREAK_PREFIX}${rand}`;
}
