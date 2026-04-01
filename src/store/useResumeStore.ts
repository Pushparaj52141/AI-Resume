import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ResumeData, PersonalInfo, Experience, Education, Skill, Certificate, Interest, Project, Course, Award, Organisation, Publication, Reference, Language, Declaration, CustomSection, ResumeDesign } from '@/types';

interface ResumeState {
  data: ResumeData;
  isInitialLoad: boolean;
  lastSaved: Date | null;

  // Actions
  setResumeData: (data: ResumeData) => void;
  updatePersonalInfo: (info: Partial<PersonalInfo>) => void;
  updateExperience: (experience: Experience[]) => void;
  updateEducation: (education: Education[]) => void;
  updateSkills: (skills: Skill[]) => void;
  updateDesign: (design: Partial<ResumeDesign>) => void;
  setInitialLoad: (loaded: boolean) => void;
  setLastSaved: (date: Date) => void;
  setSelectedSections: (sections: string[]) => void;
}

const DEFAULT_RESUME_DATA: ResumeData = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    github: '',
    summary: '',
  },
  experience: [],
  education: [],
  skills: [],
  jobTitle: '',
  jobDescription: '',
  design: {
    languageRegion: {
      language: 'en',
      dateFormat: 'MM/YYYY',
      pageFormat: 'A4',
    },
    layout: {
      columns: 'one',
      headerPosition: 'top',
      columnWidths: { left: 40, right: 60 },
    },
    spacing: {
      fontSize: 10,
      lineHeight: 1.5,
      marginLR: 15,
      marginTB: 15,
      entrySpacing: 10,
    },
    colors: {
      mode: 'basic',
      accent: '#000000',
      text: '#333333',
      background: '#ffffff',
      customColors: {},
    },
    typography: {
      fontFamily: 'Inter',
      headings: {
        style: 'bold',
        capitalization: 'none',
        size: 'm',
        icons: 'none',
      },
    },
    entryLayout: {
      titleSize: 'm',
      subtitleStyle: 'normal',
      subtitlePlacement: 'same-line',
      indentBody: false,
      listStyle: 'bullet',
    },
    footer: {
      showPageNumbers: true,
      showEmail: true,
      showName: true,
    },
    advanced: {
      linkIcon: 'icon',
      dateLocationOpacity: 0.8,
    },
    personalDetails: {
      align: 'left',
      arrangement: 'icon',
      iconStyle: 'none',
      nameSize: 'm',
      nameBold: true,
      showPhoto: false,
      photoSize: 80,
      photoFormat: 'circle',
    },
    sectionSettings: {
      skills: 'grid',
      languages: 'grid',
      interests: 'grid',
      certificates: 'grid',
      education: { order: 'degree-school' },
      workExperience: { order: 'title-employer', groupPromotions: false },
    },
  },
  selectedSections: ['personalInfo', 'summary', 'experience', 'education', 'skills'],
};

const isDev = process.env.NODE_ENV === 'development';

export const useResumeStore = create<ResumeState>()(
  devtools(
    persist(
      (set) => ({
        data: DEFAULT_RESUME_DATA,
        isInitialLoad: true,
        lastSaved: null,

        setResumeData: (data) => set({ data }),

        updatePersonalInfo: (info) =>
          set((state) => ({
            data: {
              ...state.data,
              personalInfo: { ...state.data.personalInfo, ...info },
            },
          })),

        updateExperience: (experience) =>
          set((state) => ({
            data: { ...state.data, experience },
          })),

        updateEducation: (education) =>
          set((state) => ({
            data: { ...state.data, education },
          })),

        updateSkills: (skills) =>
          set((state) => ({
            data: { ...state.data, skills },
          })),

        updateDesign: (design) =>
          set((state) => ({
            data: {
              ...state.data,
              design: {
                ...DEFAULT_RESUME_DATA.design,
                ...state.data.design,
                ...design
              },
            },
          })),

        setInitialLoad: (isInitialLoad) => set({ isInitialLoad }),
        setLastSaved: (lastSaved) => set({ lastSaved }),
        setSelectedSections: (sections) => set((state) => ({ data: { ...state.data, selectedSections: sections } })),
      }),
      {
        name: 'resume-storage',
        partialize: (state) => {
          const { isInitialLoad, ...rest } = state;
          return rest;
        },
      }
    ),
    { name: 'resume-store', enabled: isDev }
  )
);
