import type { ResumeDesign } from '@/types';

export const FONT_STACK: Record<'sans' | 'serif' | 'mono', string[]> = {
  sans: [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Poppins',
    'Montserrat',
    'Source Sans Pro',
    'Work Sans',
    'Nunito',
    'Rubik',
    'Karla',
    'Mulish',
    'Titillium Web',
    'Barlow',
    'Jost',
    'Fira Sans',
    'Asap',
    'IBM Plex Sans',
    'Ubuntu',
    'Oswald',
  ],
  serif: [
    'EB Garamond',
    'Playfair Display',
    'Merriweather',
    'Crimson Text',
    'Libre Baskerville',
    'Lora',
    'PT Serif',
    'Roboto Slab',
    'Georgia',
    'Times New Roman',
  ],
  mono: ['IBM Plex Mono', 'Roboto Mono', 'JetBrains Mono', 'Fira Code', 'Source Code Pro'],
};

export const COLOR_PRESETS_FLOW: {
  id: string;
  accent: string;
  text: string;
  background: string;
}[] = [
  { id: 'navy', accent: '#1e3a8a', text: '#0f172a', background: '#ffffff' },
  { id: 'violet', accent: '#7c3aed', text: '#1e293b', background: '#fafafa' },
  { id: 'teal', accent: '#0d9488', text: '#134e4a', background: '#f8fafc' },
  { id: 'rose', accent: '#e11d48', text: '#1f2937', background: '#fff1f2' },
  { id: 'amber', accent: '#d97706', text: '#422006', background: '#fffbeb' },
  { id: 'slate', accent: '#475569', text: '#0f172a', background: '#f1f5f9' },
  { id: 'forest', accent: '#166534', text: '#14532d', background: '#f0fdf4' },
  { id: 'indigo', accent: '#4338ca', text: '#1e1b4b', background: '#eef2ff' },
];

export const HEADING_STYLE_OPTIONS: { id: string; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'underline', label: 'Line' },
  { id: 'minimal', label: 'Clean' },
  { id: 'pill', label: 'Pill' },
  { id: 'bold', label: 'Bold' },
  { id: 'banner', label: 'Banner' },
];

export const ENTRY_LAYOUT_PRESETS: Record<
  string,
  Partial<ResumeDesign['entryLayout']>
> = {
  standard: {
    subtitlePlacement: 'next-line',
    titleSize: 'm',
    subtitleStyle: 'bold',
    indentBody: false,
    listStyle: 'bullet',
    dateColumnMode: 'auto',
  },
  compact: {
    subtitlePlacement: 'same-line',
    titleSize: 'm',
    subtitleStyle: 'bold',
    indentBody: false,
    listStyle: 'bullet',
    dateColumnMode: 'auto',
  },
  airy: {
    subtitlePlacement: 'next-line',
    titleSize: 'l',
    subtitleStyle: 'normal',
    indentBody: true,
    listStyle: 'bullet',
    dateColumnMode: 'auto',
  },
  minimal: {
    subtitlePlacement: 'next-line',
    titleSize: 's',
    subtitleStyle: 'italic',
    indentBody: false,
    listStyle: 'hyphen',
    dateColumnMode: 'auto',
  },
};
