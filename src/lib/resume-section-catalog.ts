import type { LucideIcon } from 'lucide-react';
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Code,
  Heart,
  FolderOpen,
  BookOpen,
  Award as AwardIcon,
  Users,
  Book,
  UserCheck,
  Globe,
  Shield,
  Plus,
} from 'lucide-react';

export type ResumeSectionCatalogEntry = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  category: 'required' | 'optional';
};

/** Single source of truth for resume section ids, labels, and icons (builder + customize). */
export const RESUME_SECTION_CATALOG: ResumeSectionCatalogEntry[] = [
  { id: 'personalInfo', label: 'Personal Information', icon: User, description: 'Basic contact details', category: 'required' },
  { id: 'summary', label: 'Professional Summary', icon: FileText, description: 'Career summary & goals', category: 'optional' },
  { id: 'job', label: 'Job Target', icon: Briefcase, description: 'Desired position & company', category: 'optional' },
  { id: 'experience', label: 'Work Experience', icon: Briefcase, description: 'Professional background', category: 'optional' },
  { id: 'education', label: 'Education', icon: GraduationCap, description: 'Academic qualifications', category: 'optional' },
  { id: 'skills', label: 'Technical Skills', icon: Code, description: 'Technical skills & expertise', category: 'optional' },
  { id: 'softSkills', label: 'Soft Skills', icon: Users, description: 'Interpersonal & soft skills', category: 'optional' },
  { id: 'certificates', label: 'Certificates', icon: FileText, description: 'Professional certificates', category: 'optional' },
  { id: 'interests', label: 'Interests', icon: Heart, description: 'Personal interests', category: 'optional' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, description: 'Project portfolio', category: 'optional' },
  { id: 'courses', label: 'Courses', icon: BookOpen, description: 'Additional courses', category: 'optional' },
  { id: 'awards', label: 'Awards', icon: AwardIcon, description: 'Awards & achievements', category: 'optional' },
  { id: 'organisations', label: 'Organisations', icon: Users, description: 'Volunteer work', category: 'optional' },
  { id: 'publications', label: 'Publications', icon: Book, description: 'Published works', category: 'optional' },
  { id: 'references', label: 'References', icon: UserCheck, description: 'Professional references', category: 'optional' },
  { id: 'languages', label: 'Languages', icon: Globe, description: 'Language skills', category: 'optional' },
  { id: 'declaration', label: 'Declaration', icon: Shield, description: 'Declaration statement', category: 'optional' },
  { id: 'custom', label: 'Custom', icon: Plus, description: 'Custom section', category: 'optional' },
];

export function getSectionCatalogEntry(id: string): ResumeSectionCatalogEntry | undefined {
  return RESUME_SECTION_CATALOG.find((s) => s.id === id);
}
