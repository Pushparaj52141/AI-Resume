import { ResumeDesign } from './types';

export const DEFAULT_DESIGN: ResumeDesign = {
    languageRegion: {
        language: 'English (UK)',
        dateFormat: 'DD/MM/YYYY',
        pageFormat: 'A4',
    },
    layout: {
        columns: 'one',
        headerPosition: 'top',
        columnWidths: {
            left: 44,
            right: 56,
        },
    },
    spacing: {
        fontSize: 10,
        lineHeight: 1.3,
        marginLR: 14,
        marginTB: 18,
        entrySpacing: 5,
    },
    colors: {
        mode: 'basic',
        themeVariant: 'accent',
        accent: '#3b82f6', // blue-500
        text: '#1f2937', // gray-800
        background: '#ffffff',
        customColors: {},
        accentApply: {},
    },
    typography: {
        fontFamily: 'Inter',
        fontCategory: 'sans',
        headings: {
            style: 'classic',
            capitalization: 'uppercase',
            size: 'm',
            icons: 'none',
        },
    },
    entryLayout: {
        titleSize: 'm',
        subtitleStyle: 'bold',
        subtitlePlacement: 'next-line',
        indentBody: false,
        listStyle: 'bullet',
        dateColumnMode: 'auto',
    },
    footer: {
        showPageNumbers: false,
        showEmail: true,
        showName: true,
    },
    advanced: {
        linkIcon: 'icon',
        dateLocationOpacity: 0.8,
        linkUnderline: true,
        linkUseAccentBlue: true,
    },
    personalDetails: {
        align: 'left',
        arrangement: 'icon',
        iconStyle: 'circle-outline',
        nameSize: 'l',
        nameBold: true,
        nameFont: 'body',
        showPhoto: false,
        photoSize: 100,
        photoFormat: 'circle',
        jobTitleSize: 'm',
        jobTitlePlacement: 'below',
        jobTitleStyle: 'normal',
    },
    sectionSettings: {
        skills: 'grid',
        languages: 'grid',
        interests: 'grid',
        certificates: 'grid',
        education: {
            order: 'degree-school',
        },
        workExperience: {
            order: 'title-employer',
            groupPromotions: true,
        },
    },
};
