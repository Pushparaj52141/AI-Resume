import type { ResumeData, ResumeDesign } from './types';
import { DEFAULT_DESIGN } from './defaults';
import {
  TEMPLATE_SPECS,
  COLOR_PALETTES,
  LAYOUT_PRESETS,
  TYPOGRAPHY_PRESETS,
  type TemplateSpec,
} from './template-design-spec';

export interface Template {
  id: string;
  name: string;
  description: string;
  design: ResumeDesign;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge<T extends object>(base: T, override: any): T {
  if (!override || typeof override !== 'object') return base;
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override) as (keyof T)[]) {
    const overrideVal = (override as Record<string, unknown>)[key as string];
    if (overrideVal === undefined) continue;
    const baseVal = result[key as string];
    if (
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal) &&
      typeof overrideVal === 'object' &&
      overrideVal !== null &&
      !Array.isArray(overrideVal)
    ) {
      result[key as string] = deepMerge(baseVal, overrideVal);
    } else {
      result[key as string] = overrideVal;
    }
  }
  return result as T;
}

function buildDesignFromSpec(spec: TemplateSpec): ResumeDesign {
  const palette = COLOR_PALETTES[spec.colorPalette];
  const layout = LAYOUT_PRESETS[spec.layoutPreset];
  const typography = TYPOGRAPHY_PRESETS[spec.typographyPreset];

  let design: ResumeDesign = {
    ...DEFAULT_DESIGN,
    templateId: spec.id,
    layout: {
      ...DEFAULT_DESIGN.layout,
      ...layout,
    },
    colors: {
      ...DEFAULT_DESIGN.colors,
      mode: 'basic',
      accent: palette.accent,
      text: palette.text,
      background: palette.background,
      customColors: {},
    },
    typography: {
      ...DEFAULT_DESIGN.typography,
      fontFamily: typography.fontFamily,
      headings: {
        ...DEFAULT_DESIGN.typography.headings,
        ...typography.headings,
      },
    },
  };

  if (spec.overrides && Object.keys(spec.overrides).length > 0) {
    design = deepMerge(design, spec.overrides);
  }

  return design;
}

export const TEMPLATES: Template[] = TEMPLATE_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  description: spec.description,
  design: buildDesignFromSpec(spec),
}));

/** Removed templates: map old id → replacement for URLs and saved resumes */
export const LEGACY_TEMPLATE_ID_MAP: Record<string, string> = {
  jaganraj: 'classic',
};

export function resolveTemplateId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return LEGACY_TEMPLATE_ID_MAP[id] ?? id;
}

export function getTemplateById(id: string): Template | undefined {
  const resolved = resolveTemplateId(id) ?? id;
  return TEMPLATES.find((t) => t.id === resolved);
}

/** Migrate stored resumes that reference a removed template id */
export function normalizeResumeTemplateIds(data: ResumeData): ResumeData {
  const tid = data.design?.templateId;
  if (!tid) return data;
  const resolved = resolveTemplateId(tid);
  if (resolved === undefined || resolved === tid) return data;
  const replacement = getTemplateById(resolved);
  if (!replacement) {
    return {
      ...data,
      design: { ...(data.design ?? DEFAULT_DESIGN), templateId: resolved },
    };
  }
  return {
    ...data,
    design: {
      ...replacement.design,
      ...data.design,
      templateId: resolved,
    },
  };
}
