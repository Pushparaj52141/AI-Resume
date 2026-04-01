import type { CSSProperties } from 'react';
import type { ResumeDesign } from '@/types';

/** Allow only safe origins for resume sheet background images. */
export function sanitizeResumeBackgroundImageUrl(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower.startsWith('https://') || lower.startsWith('http://') || lower.startsWith('data:image/')) {
    return t;
  }
  return null;
}

/** Inline styles for each printed page surface (accent / multi / image). */
export function resumePageSurfaceStyle(colors: ResumeDesign['colors']): CSSProperties {
  const baseBg = colors.background;
  const variant = colors.themeVariant ?? 'accent';
  if (variant !== 'image') {
    return { backgroundColor: baseBg };
  }
  const safe = sanitizeResumeBackgroundImageUrl(colors.backgroundImage);
  const esc = safe ? safe.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : '';
  if (safe) {
    return {
      backgroundColor: baseBg,
      backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${baseBg} 82%, transparent), color-mix(in srgb, ${baseBg} 82%, transparent)), url("${esc}")`,
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
      backgroundRepeat: 'no-repeat, no-repeat',
    };
  }
  return { backgroundColor: baseBg };
}

export type AccentApplyKey =
  | 'name'
  | 'jobTitle'
  | 'headings'
  | 'headerIcons'
  | 'dotsBarsBubbles'
  | 'dates'
  | 'entries'
  | 'links';

const ACCENT_DEFAULT: Record<AccentApplyKey, boolean> = {
  name: false,
  jobTitle: false,
  headings: true,
  headerIcons: true,
  dotsBarsBubbles: true,
  dates: true,
  entries: true,
  links: true,
};

function usesAccent(colors: ResumeDesign['colors'], key: AccentApplyKey): boolean {
  const v = colors.accentApply?.[key];
  if (v === true) return true;
  if (v === false) return false;
  return ACCENT_DEFAULT[key];
}

const CUSTOM_FIELD: Partial<Record<AccentApplyKey, keyof NonNullable<ResumeDesign['colors']['customColors']>>> = {
  name: 'name',
  jobTitle: 'jobTitle',
  headings: 'headings',
  headerIcons: 'headerIcons',
  dotsBarsBubbles: 'dotsBarsBubbles',
  dates: 'dates',
  entries: 'entries',
  links: 'linkIcons',
};

/** Resolved color for resume elements (custom override > accent vs text). */
export function resolveDesignColor(colors: ResumeDesign['colors'], key: AccentApplyKey): string {
  const field = CUSTOM_FIELD[key];
  if (field) {
    const custom = colors.customColors?.[field];
    if (custom && custom.length > 0) return custom;
  }
  return usesAccent(colors, key) ? colors.accent : colors.text;
}

/** CSS variables consumed by ResumePreview (FlowCV-style accent targeting). */
export function resumeColorCssVars(colors: ResumeDesign['colors']): Record<string, string> {
  const keys: AccentApplyKey[] = [
    'name',
    'jobTitle',
    'headings',
    'headerIcons',
    'dotsBarsBubbles',
    'dates',
    'entries',
    'links',
  ];
  const vars: Record<string, string> = {
    '--resume-accent-color': colors.accent,
    '--resume-text-color': colors.text,
    '--resume-bg-color': colors.background,
  };
  for (const k of keys) {
    vars[`--resume-color-${k}`] = resolveDesignColor(colors, k);
  }
  vars['--resume-name-color'] = resolveDesignColor(colors, 'name');
  vars['--resume-job-title-color'] = resolveDesignColor(colors, 'jobTitle');
  vars['--resume-heading-color'] = resolveDesignColor(colors, 'headings');
  vars['--resume-header-icon-color'] = resolveDesignColor(colors, 'headerIcons');
  vars['--resume-dots-color'] = resolveDesignColor(colors, 'dotsBarsBubbles');
  vars['--resume-date-color'] = resolveDesignColor(colors, 'dates');
  vars['--resume-entry-accent-color'] = resolveDesignColor(colors, 'entries');
  vars['--resume-link-color'] = resolveDesignColor(colors, 'links');
  return vars;
}
