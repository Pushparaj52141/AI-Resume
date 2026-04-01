import { z } from 'zod';

// --- Shared Helper Schemas ---
const idSchema = z.string().min(1);
const dateSchema = z.string(); // Could be improved with regex or ISO date check

// --- Sub-schemas ---

export const personalInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  linkedIn: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  photo: z.string().optional().or(z.literal('')),
  summary: z.string().max(5000).optional().or(z.literal('')),
  yearsOfExperience: z.number().min(0).max(60).optional(),
});

export const experienceSchema = z.object({
  id: idSchema,
  company: z.string().optional().or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
  startDate: dateSchema.optional().or(z.literal('')),
  endDate: dateSchema.optional().or(z.literal('')),
  current: z.boolean().default(false),
  description: z.string().optional().or(z.literal('')),
  achievements: z.array(z.string()).default([]),
});

export const educationSchema = z.object({
  id: idSchema,
  institution: z.string().optional().or(z.literal('')),
  degree: z.string().optional().or(z.literal('')),
  field: z.string().optional().or(z.literal('')),
  startYear: z.string().optional().or(z.literal('')),
  endYear: z.string().optional().or(z.literal('')),
  gpa: z.string().optional().or(z.literal('')),
});

export const skillSchema = z.object({
  id: idSchema,
  name: z.string().optional().or(z.literal('')),
  level: z.string().optional().or(z.literal('')), // Relaxed from enum for flexibility
});

export const jobTargetSchema = z.object({
  position: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

export const certificateSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  organization: z.string().min(1),
  issueDate: dateSchema,
  expiryDate: dateSchema.optional(),
  certificateId: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
});

export const projectSchema = z.object({
  id: idSchema,
  title: z.string().optional().or(z.literal('')),
  role: z.string().optional().or(z.literal('')),
  technologies: z.string().optional().or(z.literal('')),
  startDate: dateSchema.optional().or(z.literal('')),
  endDate: dateSchema.optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  link: z.string().optional().or(z.literal('')),
});

export const languageSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  level: z.enum(['native', 'fluent', 'intermediate', 'basic']),
});

export const designSchema = z.object({
  templateId: z.string().optional(),
  languageRegion: z.object({
    language: z.string(),
    dateFormat: z.string(),
    pageFormat: z.enum(['A4', 'Letter']),
  }),
  layout: z.object({
    columns: z.enum(['one', 'two', 'mix']),
    headerPosition: z.enum(['top', 'left', 'right']),
    columnWidths: z.object({
      left: z.number(),
      right: z.number(),
    }),
  }),
  spacing: z.object({
    fontSize: z.number(),
    lineHeight: z.number(),
    marginLR: z.number(),
    marginTB: z.number(),
    entrySpacing: z.number(),
  }),
  colors: z.object({
    mode: z.enum(['basic', 'advanced', 'border']),
    accent: z.string(),
    text: z.string(),
    background: z.string(),
    customColors: z.record(z.string(), z.string().optional()),
    themeVariant: z.enum(['accent', 'multi', 'image']).optional(),
    accentApply: z.record(z.string(), z.boolean()).optional(),
    sidebarBackground: z.string().optional(),
    backgroundImage: z.string().optional(),
  }),
  typography: z.object({
    fontFamily: z.string(),
    fontCategory: z.enum(['sans', 'serif', 'mono']).optional(),
    headings: z.object({
      style: z.string(),
      capitalization: z.enum(['none', 'capitalize', 'uppercase']),
      size: z.enum(['s', 'm', 'l', 'xl']),
      icons: z.enum(['none', 'outline', 'filled']),
    }),
  }),
  entryLayout: z.object({
    titleSize: z.enum(['s', 'm', 'l']),
    subtitleStyle: z.enum(['normal', 'bold', 'italic']),
    subtitlePlacement: z.enum(['same-line', 'next-line']),
    indentBody: z.boolean(),
    listStyle: z.enum(['bullet', 'hyphen']),
    dateColumnMode: z.enum(['auto', 'manual']).optional(),
  }),
  personalDetails: z.object({
    align: z.enum(['left', 'center', 'right']),
    arrangement: z.enum(['icon', 'bullet', 'bar', 'pipe']),
    iconStyle: z.string(),
    nameSize: z.enum(['xs', 's', 'm', 'l', 'xl']),
    nameBold: z.boolean(),
    nameFont: z.enum(['body', 'creative']).optional(),
    showPhoto: z.boolean(),
    photoSize: z.number(),
    photoFormat: z.enum(['circle', 'rounded', 'square']),
    jobTitleSize: z.enum(['s', 'm', 'l']).optional(),
    jobTitlePlacement: z.enum(['same-line', 'below']).optional(),
    jobTitleStyle: z.enum(['normal', 'italic']).optional(),
  }),
  footer: z
    .object({
      showPageNumbers: z.boolean(),
      showEmail: z.boolean(),
      showName: z.boolean(),
    })
    .optional(),
  advanced: z
    .object({
      linkIcon: z.string(),
      dateLocationOpacity: z.number(),
      sidebarBorderLeft: z.string().optional(),
      linkUnderline: z.boolean().optional(),
      linkUseAccentBlue: z.boolean().optional(),
    })
    .optional(),
  sectionSettings: z.object({
    skills: z.enum(['grid', 'level', 'compact', 'bubble']),
    languages: z.enum(['grid', 'level', 'compact', 'bubble', 'text', 'dots', 'bar']),
    interests: z.enum(['grid', 'compact', 'bubble']),
    certificates: z.enum(['grid', 'compact', 'bubble']),
    education: z.object({ order: z.enum(['degree-school', 'school-degree']) }),
    workExperience: z.object({ order: z.enum(['title-employer', 'employer-title']), groupPromotions: z.boolean() }),
  }),
}).passthrough();

// --- Main Resume Schema ---

export const resumeSchema = z.object({
  personalInfo: personalInfoSchema,
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  skills: z.array(skillSchema),
  softSkills: z.array(skillSchema).optional(),
  jobTitle: z.string(),
  jobDescription: z.string(),
  jobTarget: jobTargetSchema.optional(),
  certificates: z.array(certificateSchema).optional(),
  interests: z.array(z.object({ id: idSchema, name: z.string(), description: z.string().optional() })).optional(),
  projects: z.array(projectSchema).optional(),
  courses: z.array(z.object({ id: idSchema, name: z.string(), provider: z.string().optional(), completionDate: dateSchema, description: z.string().optional() })).optional(),
  awards: z.array(z.object({ id: idSchema, title: z.string(), organization: z.string().optional(), date: dateSchema, description: z.string().optional(), url: z.string().optional() })).optional(),
  organisations: z.array(z.object({ id: idSchema, name: z.string(), role: z.string().optional(), startDate: dateSchema, endDate: dateSchema, description: z.string().optional() })).optional(),
  publications: z.array(z.object({ id: idSchema, title: z.string(), type: z.string().optional(), date: dateSchema, publisher: z.string().optional(), url: z.string().optional(), description: z.string().optional() })).optional(),
  references: z.array(z.object({ id: idSchema, name: z.string(), position: z.string().optional(), company: z.string().optional(), email: z.string().optional(), phone: z.string().optional() })).optional(),
  languages: z.array(languageSchema).optional(),
  declaration: z.object({ statement: z.string(), place: z.string().optional(), date: z.string().optional(), signature: z.string().optional() }).optional(),
  custom: z.object({ title: z.string(), content: z.string() }).optional(),
  design: designSchema,
  selectedSections: z.array(z.string()).optional(), // ✅ Added for section persistence
});

export type ResumeInput = z.infer<typeof resumeSchema>;
