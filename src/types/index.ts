/**
 * Global type definitions
 */

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn?: string;
  github?: string;
  website?: string;
  photo?: string;
  summary: string;
  yearsOfExperience?: number;
  nationality?: string;
  dateOfBirth?: string;
  visa?: string;
  passport?: string;
  gender?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
  /** Optional work location (shown in preview when set). */
  location?: string;
  visible?: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  gpa?: string;
  visible?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  visible?: boolean;
}

export interface JobTarget {
  position: string;
  company: string;
  description?: string;
}

export interface Certificate {
  id: string;
  name: string;
  organization: string;
  issueDate: string;
  expiryDate?: string;
  certificateId?: string;
  url?: string;
  visible?: boolean;
}

export interface Interest {
  id: string;
  name: string;
  description?: string;
  visible?: boolean;
}

export interface Project {
  id: string;
  title: string;
  role?: string;
  technologies?: string;
  startDate: string;
  endDate: string;
  description?: string;
  link?: string;
  visible?: boolean;
}

export interface Course {
  id: string;
  name: string;
  provider?: string;
  completionDate: string;
  description?: string;
  visible?: boolean;
}

export interface Award {
  id: string;
  title: string;
  organization?: string;
  date: string;
  description?: string;
  url?: string;
  visible?: boolean;
}

export interface Organisation {
  id: string;
  name: string;
  role?: string;
  startDate: string;
  endDate: string;
  description?: string;
  visible?: boolean;
}

export interface Publication {
  id: string;
  title: string;
  type?: string;
  date: string;
  publisher?: string;
  url?: string;
  description?: string;
  visible?: boolean;
}

export interface Reference {
  id: string;
  name: string;
  position?: string;
  company?: string;
  email?: string;
  phone?: string;
  visible?: boolean;
}

export interface Language {
  id: string;
  name: string;
  level: 'native' | 'fluent' | 'intermediate' | 'basic';
  visible?: boolean;
}

export interface Declaration {
  statement: string;
  place?: string;
  date?: string;
  signature?: string;
  visible?: boolean;
}

export interface CustomSection {
  title: string;
  content: string;
}

export interface ResumeDesign {
  templateId?: string;
  languageRegion: {
    language: string;
    dateFormat: string;
    pageFormat: 'A4' | 'Letter';
  };
  layout: {
    columns: 'one' | 'two' | 'mix';
    headerPosition: 'top' | 'left' | 'right';
    columnWidths: {
      left: number;
      right: number;
    };
  };
  spacing: {
    fontSize: number;
    lineHeight: number;
    marginLR: number;
    marginTB: number;
    entrySpacing: number;
  };
  colors: {
    mode: 'basic' | 'advanced' | 'border';
    accent: string;
    text: string;
    background: string;
    /** Fills the sidebar column in two-column layouts (e.g. sage / accent sidebars) */
    sidebarBackground?: string;
    /** FlowCV-style: accent / multi-tone / image background */
    themeVariant?: 'accent' | 'multi' | 'image';
    /** When themeVariant is image: cover background (https or data:image only) */
    backgroundImage?: string;
    /** When true, that element group uses accent (unless overridden in customColors). */
    accentApply?: Partial<Record<
      'name' | 'jobTitle' | 'headings' | 'headerIcons' | 'dotsBarsBubbles' | 'dates' | 'entries' | 'links',
      boolean
    >>;
    customColors: {
      name?: string;
      jobTitle?: string;
      headings?: string;
      headerIcons?: string;
      dotsBarsBubbles?: string;
      dates?: string;
      entries?: string;
      linkIcons?: string;
    };
  };
  typography: {
    fontFamily: string;
    /** Filter font picker: sans / serif / mono */
    fontCategory?: 'sans' | 'serif' | 'mono';
    headings: {
      style: string;
      capitalization: 'none' | 'capitalize' | 'uppercase';
      size: 's' | 'm' | 'l' | 'xl';
      icons: 'none' | 'outline' | 'filled';
    };
  };
  entryLayout: {
    titleSize: 's' | 'm' | 'l';
    subtitleStyle: 'normal' | 'bold' | 'italic';
    subtitlePlacement: 'same-line' | 'next-line';
    indentBody: boolean;
    listStyle: 'bullet' | 'hyphen';
    /** FlowCV-style date column behavior (preview uses auto for now; manual reserved) */
    dateColumnMode?: 'auto' | 'manual';
  };
  footer: {
    showPageNumbers: boolean;
    showEmail: boolean;
    showName: boolean;
  };
  advanced: {
    linkIcon: 'none' | 'icon' | 'external';
    dateLocationOpacity: number;
    /** Applied to the sidebar column’s left edge (e.g. decorative accent strip) */
    sidebarBorderLeft?: string;
    linkUnderline?: boolean;
    /** When true, links use accent/blue styling; when false, follow text color */
    linkUseAccentBlue?: boolean;
  };
  personalDetails: {
    align: 'left' | 'center' | 'right';
    arrangement: 'icon' | 'bullet' | 'bar' | 'pipe';
    iconStyle: 'none' | 'circle-filled' | 'rounded-filled' | 'square-filled' | 'circle-outline' | 'rounded-outline' | 'square-outline';
    nameSize: 'xs' | 's' | 'm' | 'l' | 'xl';
    nameBold: boolean;
    /** Body stack vs a distinct “creative” serif display for the name */
    nameFont?: 'body' | 'creative';
    showPhoto: boolean;
    photoSize: number;
    photoFormat: 'circle' | 'rounded' | 'square';
    banner?: boolean;
    bannerTextColor?: string;
    jobTitleSize?: 's' | 'm' | 'l';
    jobTitlePlacement?: 'same-line' | 'below';
    jobTitleStyle?: 'normal' | 'italic';
  };
  sectionSettings: {
    skills: 'grid' | 'level' | 'compact' | 'bubble';
    languages: 'grid' | 'level' | 'compact' | 'bubble' | 'text' | 'dots' | 'bar';
    interests: 'grid' | 'compact' | 'bubble';
    certificates: 'grid' | 'compact' | 'bubble';
    education: {
      order: 'degree-school' | 'school-degree';
    };
    workExperience: {
      order: 'title-employer' | 'employer-title';
      groupPromotions: boolean;
    };
  };
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  softSkills?: Skill[];
  jobTitle: string;
  jobDescription: string;
  jobTarget?: JobTarget;
  certificates?: Certificate[];
  interests?: Interest[];
  projects?: Project[];
  courses?: Course[];
  awards?: Award[];
  organisations?: Organisation[];
  publications?: Publication[];
  references?: Reference[];
  languages?: Language[];
  declaration?: Declaration;
  custom?: CustomSection;
  design: ResumeDesign;
  selectedSections?: string[]; // Sections enabled/added by user
  hiddenSections?: string[]; // Sections hidden from PDF but still in the list
  sectionLabels?: Record<string, string>;
}

export interface ATSAnalysis {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
  categories: {
    technical: { matched: string[]; missing: string[] };
    soft: { matched: string[]; missing: string[] };
    industry: { matched: string[]; missing: string[] };
  };
}

export interface GeneratedResume {
  content: string;
  atsScore: number;
  optimizedContent?: string;
}
