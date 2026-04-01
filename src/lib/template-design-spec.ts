/**
 * Template Design Spec
 * Centralizes color palettes, layout presets, typography, and per-template overrides.
 * Use this to add or adjust templates in a structured way.
 */

import type { ResumeDesign } from './types';

/** Recursive partial for nested overrides */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// --- Color Palettes ---

export interface ColorPalette {
  accent: string;
  text: string;
  background: string;
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  classicBlue: {
    accent: '#3b82f6',
    text: '#1f2937',
    background: '#ffffff',
  },
  modernTeal: {
    accent: '#14b8a6',
    text: '#1f2937',
    background: '#ffffff',
  },
  minimalSlate: {
    accent: '#64748b',
    text: '#334155',
    background: '#ffffff',
  },
  corporateNavy: {
    accent: '#1e3a5f',
    text: '#1f2937',
    background: '#ffffff',
  },
  creativeOrange: {
    accent: '#ea580c',
    text: '#1f2937',
    background: '#ffffff',
  },
  elegantGray: {
    accent: '#374151',
    text: '#111827',
    background: '#ffffff',
  },
  sapphireDeep: {
    accent: '#1e293b', // slate-800 as dark blue replacement
    text: '#0f172a',
    background: '#ffffff',
  },
  eliteNavy: {
    accent: '#1e3a8a', // Deep Navy Blue
    text: '#1f2937',
    background: '#ffffff',
  },
  /** FlowCV-inspired gallery */
  trueBlue: {
    accent: '#2563eb',
    text: '#1f2937',
    background: '#ffffff',
  },
  silver: {
    accent: '#94a3b8',
    text: '#334155',
    background: '#ffffff',
  },
  cornerstone: {
    accent: '#334155',
    text: '#0f172a',
    background: '#ffffff',
  },
  obsidian: {
    accent: '#111111',
    text: '#111827',
    background: '#ffffff',
  },
  leavesGreen: {
    accent: '#15803d',
    text: '#14532d',
    background: '#ffffff',
  },
  cobalt: {
    accent: '#1d4ed8',
    text: '#1e293b',
    background: '#ffffff',
  },
  harvardCrimson: {
    accent: '#1e3a5f',
    text: '#1f2937',
    background: '#ffffff',
  },
  sage: {
    accent: '#059669',
    text: '#065f46',
    background: '#ffffff',
  },
  /** Second FlowCV-inspired batch */
  blueSteel: {
    accent: '#0284c7',
    text: '#0f172a',
    background: '#ffffff',
  },
  banking: {
    accent: '#475569',
    text: '#1e293b',
    background: '#ffffff',
  },
  simplyBlue: {
    accent: '#2563eb',
    text: '#334155',
    background: '#ffffff',
  },
  petrolBlue: {
    accent: '#0c4a6e',
    text: '#0f172a',
    background: '#ffffff',
  },
  evergreenSlate: {
    accent: '#334155',
    text: '#1e293b',
    background: '#ffffff',
  },
  designerPurple: {
    accent: '#6b21a8',
    text: '#1f2937',
    background: '#ffffff',
  },
  monochrome: {
    accent: '#000000',
    text: '#262626',
    background: '#ffffff',
  },
};

// --- Layout Presets ---

export interface LayoutPreset {
  columns: ResumeDesign['layout']['columns'];
  headerPosition: ResumeDesign['layout']['headerPosition'];
  columnWidths: { left: number; right: number };
}

export const LAYOUT_PRESETS: Record<string, LayoutPreset> = {
  oneColumnTop: {
    columns: 'one',
    headerPosition: 'top',
    columnWidths: { left: 44, right: 56 },
  },
  twoColumnLeft: {
    columns: 'two',
    headerPosition: 'left',
    columnWidths: { left: 35, right: 65 },
  },
  twoColumnRight: {
    columns: 'two',
    headerPosition: 'right',
    columnWidths: { left: 65, right: 35 },
  },
  mixLeft: {
    columns: 'mix',
    headerPosition: 'left',
    columnWidths: { left: 40, right: 60 },
  },
  twoColumnNarrowLeft: {
    columns: 'two',
    headerPosition: 'left',
    columnWidths: { left: 32, right: 68 },
  },
  /** Wider main column for petrol / banking-style splits */
  twoColumnPetrolLeft: {
    columns: 'two',
    headerPosition: 'left',
    columnWidths: { left: 30, right: 70 },
  },
};

// --- Typography Presets ---

export interface TypographyPreset {
  fontFamily: string;
  headings: {
    style: string;
    capitalization: ResumeDesign['typography']['headings']['capitalization'];
    size: ResumeDesign['typography']['headings']['size'];
    icons: ResumeDesign['typography']['headings']['icons'];
  };
}

export const TYPOGRAPHY_PRESETS: Record<string, TypographyPreset> = {
  interUppercase: {
    fontFamily: 'Inter',
    headings: { style: 'classic', capitalization: 'uppercase', size: 'm', icons: 'none' },
  },
  poppinsCapitalize: {
    fontFamily: 'Poppins',
    headings: { style: 'classic', capitalization: 'capitalize', size: 'm', icons: 'outline' },
  },
  latoNone: {
    fontFamily: 'Lato',
    headings: { style: 'classic', capitalization: 'none', size: 'm', icons: 'none' },
  },
  robotoUppercase: {
    fontFamily: 'Roboto',
    headings: { style: 'classic', capitalization: 'uppercase', size: 'm', icons: 'outline' },
  },
  ralewayCapitalizeL: {
    fontFamily: 'Raleway',
    headings: { style: 'classic', capitalization: 'capitalize', size: 'l', icons: 'filled' },
  },
  ebGaramondCapitalizeL: {
    fontFamily: 'EB Garamond',
    headings: { style: 'classic', capitalization: 'capitalize', size: 'l', icons: 'none' },
  },
  interBannerUppercase: {
    fontFamily: 'Inter',
    headings: { style: 'banner', capitalization: 'uppercase', size: 'm', icons: 'none' },
  },
};

// --- Per-Template Spec ---

export type Persona = 'corporate' | 'modern' | 'creative';

export interface TemplateSpec {
  id: string;
  name: string;
  description: string;
  persona: Persona;
  layoutPreset: keyof typeof LAYOUT_PRESETS;
  colorPalette: keyof typeof COLOR_PALETTES;
  typographyPreset: keyof typeof TYPOGRAPHY_PRESETS;
  /** Partial overrides applied last (personalDetails, entryLayout, sectionSettings, etc.) */
  overrides?: DeepPartial<ResumeDesign>;
}

/** Add new entries here to grow the gallery (see TEMPLATE_SPECS shape). */
export const TEMPLATE_SPECS: TemplateSpec[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'One column, top header, timeless and professional',
    persona: 'corporate',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'classicBlue',
    typographyPreset: 'interUppercase',
    overrides: {
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
      },
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Two columns, sidebar layout, clean and contemporary',
    persona: 'modern',
    layoutPreset: 'twoColumnLeft',
    colorPalette: 'modernTeal',
    typographyPreset: 'poppinsCapitalize',
    overrides: {
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'circle-filled',
      },
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, centered design with subtle accents',
    persona: 'modern',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'minimalSlate',
    typographyPreset: 'latoNone',
    overrides: {
      personalDetails: {
        align: 'center',
        arrangement: 'bullet',
        iconStyle: 'none',
      },
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Two columns, right sidebar, corporate-ready',
    persona: 'corporate',
    layoutPreset: 'twoColumnRight',
    colorPalette: 'corporateNavy',
    typographyPreset: 'robotoUppercase',
    overrides: {
      personalDetails: {
        align: 'left',
        arrangement: 'bar',
        iconStyle: 'square-filled',
      },
    },
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Mixed layout with bold styling for standout applications',
    persona: 'creative',
    layoutPreset: 'mixLeft',
    colorPalette: 'creativeOrange',
    typographyPreset: 'ralewayCapitalizeL',
    overrides: {
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'rounded-filled',
      },
      sectionSettings: {
        skills: 'bubble',
        languages: 'grid',
        interests: 'grid',
        certificates: 'grid',
        education: { order: 'degree-school' },
        workExperience: { order: 'title-employer', groupPromotions: true },
      },
    },
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Serif typography, refined and sophisticated',
    persona: 'creative',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'elegantGray',
    typographyPreset: 'ebGaramondCapitalizeL',
    overrides: {
      personalDetails: {
        align: 'center',
        arrangement: 'pipe',
        iconStyle: 'circle-outline',
        nameSize: 'xl',
      },
      entryLayout: {
        titleSize: 'm',
        subtitleStyle: 'bold',
        subtitlePlacement: 'next-line',
        indentBody: false,
        listStyle: 'hyphen',
      },
    },
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Sophisticated layout with modern typography',
    persona: 'corporate',
    layoutPreset: 'twoColumnLeft',
    colorPalette: 'minimalSlate',
    typographyPreset: 'poppinsCapitalize',
    overrides: {
      personalDetails: {
        align: 'left',
        arrangement: 'pipe',
        iconStyle: 'circle-outline',
        nameSize: 'l',
      },
      sectionSettings: {
        skills: 'level',
      }
    },
  },
  {
    id: 'elite-navy',
    name: 'Elite Navy Blue',
    description: 'Premium corporate design with a full-width navy banner and professional section bars.',
    persona: 'corporate',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'eliteNavy',
    typographyPreset: 'interBannerUppercase',
    overrides: {
      colors: {
        accent: '#1e3a8a', // Explicit Navy Blue
      },
      personalDetails: {
        align: 'left',
        showPhoto: true,
        photoFormat: 'circle',
        photoSize: 110,
        banner: true,
        nameSize: 'xl',
        nameBold: true,
      },
      spacing: {
        entrySpacing: 16,
        marginTB: 24,
      },
      sectionSettings: {
        skills: 'compact',
      }
    },
  },
  {
    id: 'true-blue',
    name: 'True Blue',
    description: 'Crisp blue accents on a clean white canvas — classic single-column flow',
    persona: 'modern',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'trueBlue',
    typographyPreset: 'interUppercase',
    overrides: {
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'circle-outline',
      },
      spacing: {
        entrySpacing: 12,
        marginTB: 22,
      },
    },
  },
  {
    id: 'silver',
    name: 'Silver',
    description: 'Cool gray highlights and generous whitespace for a polished, understated look',
    persona: 'modern',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'silver',
    typographyPreset: 'latoNone',
    overrides: {
      personalDetails: {
        align: 'left',
        arrangement: 'pipe',
        iconStyle: 'none',
      },
      spacing: {
        entrySpacing: 14,
        marginTB: 24,
      },
    },
  },
  {
    id: 'executive-suite',
    name: 'Executive Suite',
    description: 'Structured corporate layout with a strong hierarchy — boardroom-ready',
    persona: 'corporate',
    layoutPreset: 'twoColumnRight',
    colorPalette: 'cornerstone',
    typographyPreset: 'robotoUppercase',
    overrides: {
      layout: {
        columnWidths: { left: 62, right: 38 },
      },
      personalDetails: {
        align: 'left',
        arrangement: 'bar',
        iconStyle: 'square-filled',
      },
      sectionSettings: {
        skills: 'compact',
      },
    },
  },
  {
    id: 'obsidian-edge',
    name: 'Obsidian Edge',
    description: 'Bold black header band with inverted type — high-contrast and memorable',
    persona: 'corporate',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'obsidian',
    typographyPreset: 'interBannerUppercase',
    overrides: {
      colors: {
        accent: '#111111',
      },
      personalDetails: {
        align: 'left',
        banner: true,
        nameSize: 'xl',
        nameBold: true,
      },
      spacing: {
        entrySpacing: 14,
        marginTB: 22,
      },
    },
  },
  {
    id: 'leaves',
    name: 'Leaves',
    description: 'Nature-inspired green accent strip and soft sidebar — creative yet readable',
    persona: 'creative',
    layoutPreset: 'twoColumnNarrowLeft',
    colorPalette: 'leavesGreen',
    typographyPreset: 'poppinsCapitalize',
    overrides: {
      colors: {
        sidebarBackground: '#f0fdf4',
      },
      advanced: {
        sidebarBorderLeft: '6px solid #15803d',
      },
      layout: {
        columnWidths: { left: 36, right: 64 },
      },
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'circle-filled',
        showPhoto: true,
        photoFormat: 'circle',
        photoSize: 88,
        nameSize: 'm',
      },
      sectionSettings: {
        skills: 'compact',
      },
    },
  },
  {
    id: 'cobalt-edge',
    name: 'Cobalt Edge',
    description: 'Deep cobalt banner with room for a photo — confident and contemporary',
    persona: 'corporate',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'cobalt',
    typographyPreset: 'interBannerUppercase',
    overrides: {
      colors: {
        accent: '#1d4ed8',
      },
      personalDetails: {
        align: 'left',
        banner: true,
        showPhoto: true,
        photoFormat: 'circle',
        photoSize: 100,
        nameSize: 'xl',
        nameBold: true,
      },
      spacing: {
        entrySpacing: 14,
        marginTB: 24,
      },
      sectionSettings: {
        skills: 'compact',
      },
    },
  },
  {
    id: 'harvard',
    name: 'Harvard',
    description: 'Academic serif styling with restrained color — formal research and education',
    persona: 'corporate',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'harvardCrimson',
    typographyPreset: 'ebGaramondCapitalizeL',
    overrides: {
      personalDetails: {
        align: 'left',
        arrangement: 'pipe',
        iconStyle: 'none',
        nameSize: 'xl',
      },
      entryLayout: {
        titleSize: 'm',
        subtitleStyle: 'bold',
        subtitlePlacement: 'next-line',
        listStyle: 'hyphen',
      },
    },
  },
  {
    id: 'sage-green',
    name: 'Sage Green',
    description: 'Soft sage sidebar for contact and skills, white body for experience',
    persona: 'modern',
    layoutPreset: 'twoColumnLeft',
    colorPalette: 'sage',
    typographyPreset: 'poppinsCapitalize',
    overrides: {
      colors: {
        accent: '#059669',
        sidebarBackground: '#ecfdf5',
      },
      layout: {
        columnWidths: { left: 38, right: 62 },
      },
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'circle-outline',
        nameSize: 'm',
      },
      sectionSettings: {
        skills: 'compact',
      },
    },
  },
  {
    id: 'blue-steel',
    name: 'Blue Steel',
    description: 'Two-column layout with a cool sky sidebar, photo, and star-style skills',
    persona: 'modern',
    layoutPreset: 'twoColumnLeft',
    colorPalette: 'blueSteel',
    typographyPreset: 'poppinsCapitalize',
    overrides: {
      colors: {
        sidebarBackground: '#e0f2fe',
      },
      layout: {
        columnWidths: { left: 36, right: 64 },
      },
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'circle-filled',
        showPhoto: true,
        photoFormat: 'circle',
        photoSize: 92,
      },
      sectionSettings: {
        skills: 'level',
        languages: 'grid',
      },
    },
  },
  {
    id: 'banking',
    name: 'Banking',
    description: 'Centered, line-driven single column — conservative and interview-safe',
    persona: 'corporate',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'banking',
    typographyPreset: 'interUppercase',
    overrides: {
      personalDetails: {
        align: 'center',
        arrangement: 'pipe',
        iconStyle: 'none',
      },
      spacing: {
        entrySpacing: 10,
        marginTB: 22,
        lineHeight: 1.35,
      },
      sectionSettings: {
        skills: 'compact',
      },
    },
  },
  {
    id: 'simply-blue',
    name: 'Simply Blue',
    description: 'Name in confident blue with airy spacing and clear section rhythm',
    persona: 'modern',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'simplyBlue',
    typographyPreset: 'poppinsCapitalize',
    overrides: {
      colors: {
        customColors: {
          name: '#2563eb',
        },
      },
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'circle-outline',
      },
      spacing: {
        entrySpacing: 14,
        marginTB: 24,
      },
    },
  },
  {
    id: 'petrol-blue',
    name: 'Petrol Blue',
    description: 'Deep petrol sidebar for credentials; wide column for experience and education',
    persona: 'corporate',
    layoutPreset: 'twoColumnPetrolLeft',
    colorPalette: 'petrolBlue',
    typographyPreset: 'robotoUppercase',
    overrides: {
      colors: {
        sidebarBackground: '#f0f9ff',
      },
      advanced: {
        sidebarBorderLeft: '4px solid #0c4a6e',
      },
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'square-filled',
      },
      sectionSettings: {
        skills: 'compact',
        languages: 'compact',
        certificates: 'compact',
      },
    },
  },
  {
    id: 'evergreen-slate',
    name: 'Evergreen Slate',
    description: 'Full-width slate banner with photo and crisp banner-style section titles',
    persona: 'corporate',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'evergreenSlate',
    typographyPreset: 'interBannerUppercase',
    overrides: {
      colors: {
        accent: '#334155',
      },
      personalDetails: {
        align: 'left',
        banner: true,
        showPhoto: true,
        photoFormat: 'circle',
        photoSize: 96,
        nameSize: 'xl',
        nameBold: true,
      },
      spacing: {
        entrySpacing: 12,
        marginTB: 22,
      },
      sectionSettings: {
        skills: 'compact',
        languages: 'compact',
      },
    },
  },
  {
    id: 'mckinsey',
    name: 'McKinsey',
    description: 'Dense, traditional single column — consulting-style hierarchy',
    persona: 'corporate',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'minimalSlate',
    typographyPreset: 'interUppercase',
    overrides: {
      personalDetails: {
        align: 'left',
        arrangement: 'pipe',
        iconStyle: 'none',
        nameSize: 'l',
      },
      spacing: {
        fontSize: 9.5,
        entrySpacing: 8,
        marginTB: 16,
        lineHeight: 1.25,
      },
      entryLayout: {
        titleSize: 's',
        subtitlePlacement: 'same-line',
      },
      sectionSettings: {
        skills: 'compact',
      },
    },
  },
  {
    id: 'designer',
    name: 'Designer',
    description: 'Bold violet sidebar for profile and skills; clean white experience column',
    persona: 'creative',
    layoutPreset: 'twoColumnLeft',
    colorPalette: 'designerPurple',
    typographyPreset: 'ralewayCapitalizeL',
    overrides: {
      colors: {
        sidebarBackground: '#ede9fe',
      },
      advanced: {
        sidebarBorderLeft: '5px solid #6b21a8',
      },
      layout: {
        columnWidths: { left: 34, right: 66 },
      },
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'rounded-filled',
        showPhoto: true,
        photoFormat: 'circle',
        photoSize: 104,
        nameSize: 'l',
      },
      sectionSettings: {
        skills: 'bubble',
        languages: 'grid',
      },
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Strict black-and-white rhythm with ruled sections and zero color noise',
    persona: 'modern',
    layoutPreset: 'oneColumnTop',
    colorPalette: 'monochrome',
    typographyPreset: 'interUppercase',
    overrides: {
      colors: {
        accent: '#000000',
        text: '#262626',
      },
      personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'square-outline',
      },
      spacing: {
        entrySpacing: 11,
        marginTB: 20,
      },
      sectionSettings: {
        skills: 'compact',
      },
    },
  },
];
