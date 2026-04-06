"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  User,
  Briefcase,
  GraduationCap,
  Code,
  FileText,
  Heart,
  FolderOpen,
  BookOpen,
  Award as AwardIcon,
  Users,
  Book,
  UserCheck,
  Globe,
  Shield,
  X,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Sparkles,
  SpellCheck2,
  Minimize2,
  Edit2,
  Check,
  Mail,
  Phone as PhoneIcon,
  MapPin,
  Linkedin,
  Globe as GlobeIcon,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ArrowUpDown,
  ExternalLink,
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Languages
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/RichTextEditor';

import type { ResumeData, PersonalInfo, Experience, Education, Skill, Certificate, Interest, Project, Course, Award, Organisation, Publication, Reference, Language, Declaration, CustomSection } from '@/lib/types';
import { cn, decodeHtml, generateId, isValidEmail, isValidPhone, isValidUrl } from '@/lib/utils';

import { useResumeStore } from '@/store/useResumeStore';

interface ResumeFormProps {
  // data and onChange removed to use Zustand store
  selectedSections?: string[];
  onOpenSectionsModal?: () => void;
  onSectionsOrderChange?: (newOrder: string[]) => void;
}

type SummaryAssistMode = 'improve' | 'grammar' | 'shorter';

const ResumeForm: React.FC<ResumeFormProps> = ({ selectedSections = ['personalInfo', 'experience', 'education', 'skills'], onOpenSectionsModal, onSectionsOrderChange }) => {
  const data = useResumeStore((s) => s.data);
  const onChange = useResumeStore((s) => s.setResumeData);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingHeaderId, setEditingHeaderId] = useState<string | null>(null);
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handlePersonalInfoChange('photo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSummaryChange = useCallback((value: string) => {
    onChange({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        summary: value
      }
    });
  }, [data, onChange]);

  const handleSectionLabelChange = useCallback((sectionId: string, newLabel: string) => {
    onChange({
      ...data,
      sectionLabels: {
        ...(data.sectionLabels || {}),
        [sectionId]: newLabel
      }
    });
  }, [data, onChange]);

  // Experience handlers
  const addExperience = useCallback(() => {
    const newExperience: Experience = {
      id: generateId(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      achievements: []
    };
    onChange({
      ...data,
      experience: [...data.experience, newExperience]
    });
  }, [data, onChange]);

  const removeExperience = useCallback((index: number) => {
    const newExperience = data.experience.filter((_, i) => i !== index);
    onChange({
      ...data,
      experience: newExperience
    });
  }, [data, onChange]);

  const handleExperienceChange = useCallback((index: number, field: keyof Experience, value: any) => {
    const newExperience = [...data.experience];
    newExperience[index] = {
      ...newExperience[index],
      [field]: value
    };
    onChange({
      ...data,
      experience: newExperience
    });
  }, [data, onChange]);

  const toggleSectionVisibility = useCallback((sectionId: string) => {
    const hiddenSections = [...(data.hiddenSections || [])];
    const index = hiddenSections.indexOf(sectionId);
    if (index > -1) {
      hiddenSections.splice(index, 1);
    } else {
      hiddenSections.push(sectionId);
    }
    onChange({
      ...data,
      hiddenSections
    });
  }, [data, onChange]);

  const toggleEntryVisibility = useCallback((sectionId: string, index: number) => {
    const sectionData = [...((data as any)[sectionId] || [])];
    if (sectionData[index]) {
      sectionData[index] = {
        ...sectionData[index],
        visible: sectionData[index].visible === false ? true : false
      };
      onChange({
        ...data,
        [sectionId]: sectionData
      });
    }
  }, [data, onChange]);

  // ...existing code...
  const [expandedSection, setExpandedSection] = useState<string>('personalInfo');

  // Handle drag end for section reordering
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    // Internal reordering for segments (Experience, Education, etc.)
    if (source.droppableId.startsWith('entries-')) {
      const sectionId = source.droppableId.replace('entries-', '') as keyof ResumeData;
      const entries = Array.from((data as any)[sectionId] || []) as any[];
      const [removed] = entries.splice(source.index, 1);
      entries.splice(destination.index, 0, removed);
      onChange({ ...data, [sectionId]: entries });
      return;
    }

    if (source.droppableId === 'sections-droppable') {
      // Only allow drag for sections after personalInfo
      const sections = Array.from(selectedSections);
      // Rebuild new order: always keep personalInfo first
      const mustBeFirst = ['personalInfo'].filter(id => selectedSections.includes(id));
      const draggableSections = sections.filter(id => !mustBeFirst.includes(id));
      const [removed] = draggableSections.splice(source.index, 1);
      draggableSections.splice(destination.index, 0, removed);

      const newOrder = [...mustBeFirst, ...draggableSections];
      if (typeof onSectionsOrderChange === 'function') {
        onSectionsOrderChange(newOrder);
      }
      // Set expanded section to the dropped section
      setExpandedSection(newOrder[destination.index + mustBeFirst.length]);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? '' : sectionId);
    setEditingEntryId(null);
    setEditingHeaderId(null);
  }

  // Handle personal info changes (declared early so other hooks can reference it)
  const handlePersonalInfoChange = useCallback((field: keyof PersonalInfo, value: string | number) => {
    onChange({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        [field]: value
      }
    });
  }, [data, onChange]);

  const handleSummaryAssist = useCallback((mode: SummaryAssistMode) => {
    const messages: Record<SummaryAssistMode, string> = {
      improve: 'Polishes tone and highlights measurable outcomes.',
      grammar: 'Checks spelling, grammar, and clarity.',
      shorter: 'Tightens sentences while preserving impact.',
    };
    console.log(`Summary assist: ${mode}`);
    // AI assistance logic here
  }, []);

  const removeAchievement = useCallback((expIndex: number, achIndex: number) => {

    const newExperience = [...data.experience];
    newExperience[expIndex].achievements = newExperience[expIndex].achievements.filter((_: string, i: number) => i !== achIndex);
    onChange({
      ...data,
      experience: newExperience
    });
  }, [data, onChange]);


  // Handle certificates changes
  const handleCertificateChange = useCallback((index: number, field: keyof Certificate, value: any) => {

    const newCertificates = [...(data.certificates || [])];
    newCertificates[index] = {
      ...newCertificates[index],
      [field]: value
    };
    onChange({
      ...data,
      certificates: newCertificates
    });
  }, [data, onChange]);


  const addCertificate = useCallback(() => {

    const newCertificate: Certificate = {
      id: generateId(),
      name: '',
      organization: '',
      issueDate: '',
      expiryDate: '',
      certificateId: ''
    };
    onChange({
      ...data,
      certificates: [...(data.certificates || []), newCertificate]
    });
  }, [data, onChange]);


  const removeCertificate = useCallback((index: number) => {

    const newCertificates = (data.certificates || []).filter((_: Certificate, i: number) => i !== index);
    onChange({
      ...data,
      certificates: newCertificates
    });
  }, [data, onChange]);



  // Handle projects changes
  const handleProjectChange = useCallback((index: number, field: keyof Project, value: any) => {

    const newProjects = [...(data.projects || [])];
    newProjects[index] = {
      ...newProjects[index],
      [field]: value
    };
    onChange({
      ...data,
      projects: newProjects
    });
  }, [data, onChange]);


  const addProject = useCallback(() => {

    const newProject: Project = {
      id: generateId(),
      title: '',
      role: '',
      technologies: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    onChange({
      ...data,
      projects: [...(data.projects || []), newProject]
    });
  }, [data, onChange]);


  const removeProject = useCallback((index: number) => {

    const newProjects = (data.projects || []).filter((_: Project, i: number) => i !== index);
    onChange({
      ...data,
      projects: newProjects
    });
  }, [data, onChange]);


  // Handle courses changes
  const handleCourseChange = useCallback((index: number, field: keyof Course, value: any) => {
    const newCourses = [...(data.courses || [])];
    newCourses[index] = {
      ...newCourses[index],
      [field]: value
    };
    onChange({
      ...data,
      courses: newCourses
    });
  }, [data, onChange]);


  const addCourse = useCallback(() => {
    const newCourse: Course = {
      id: generateId(),
      name: '',
      provider: '',
      completionDate: '',
      description: ''
    };
    onChange({
      ...data,
      courses: [...(data.courses || []), newCourse]
    });
  }, [data, onChange]);


  const removeCourse = useCallback((index: number) => {
    const newCourses = (data.courses || []).filter((_: Course, i: number) => i !== index);
    onChange({
      ...data,
      courses: newCourses
    });
  }, [data, onChange]);

  // Handle awards changes
  const handleAwardChange = useCallback((index: number, field: keyof Award, value: any) => {
    const newAwards = [...(data.awards || [])];
    newAwards[index] = {
      ...newAwards[index],
      [field]: value
    };
    onChange({
      ...data,
      awards: newAwards
    });
  }, [data, onChange]);

  const addAward = useCallback(() => {
    const newAward: Award = {
      id: generateId(),
      title: '',
      organization: '',
      date: '',
      description: ''
    };
    onChange({
      ...data,
      awards: [...(data.awards || []), newAward]
    });
  }, [data, onChange]);

  const removeAward = useCallback((index: number) => {
    const newAwards = (data.awards || []).filter((_: Award, i: number) => i !== index);
    onChange({
      ...data,
      awards: newAwards
    });
  }, [data, onChange]);

  // Handle drag end for section reordering
  // Only keep one handleDragEnd definition (the one above is correct)

  // Removed duplicate toggleSection handler
  const addAchievement = useCallback((expIndex: number) => {
    const newExperience = [...data.experience];
    newExperience[expIndex].achievements.push('');
    onChange({
      ...data,
      experience: newExperience
    });
  }, [data, onChange]);

  const handleAchievementChange = useCallback((expIndex: number, achIndex: number, value: string) => {
    const newExperience = [...data.experience];
    newExperience[expIndex].achievements[achIndex] = value;
    onChange({
      ...data,
      experience: newExperience
    });
  }, [data, onChange]);
  const addEducation = useCallback(() => {
    const newEducation: Education = {
      id: generateId(),
      institution: '',
      degree: '',
      field: '',
      startYear: '',
      endYear: '',
      gpa: ''
    };
    onChange({
      ...data,
      education: [...data.education, newEducation]
    });
  }, [data, onChange]);

  const removeEducation = useCallback((index: number) => {
    const newEducation = data.education.filter((_, i) => i !== index);
    onChange({
      ...data,
      education: newEducation
    });
  }, [data, onChange]);

  const handleEducationChange = useCallback((index: number, field: keyof Education, value: string) => {
    const newEducation = [...data.education];
    newEducation[index] = {
      ...newEducation[index],
      [field]: value
    };
    onChange({
      ...data,
      education: newEducation
    });
  }, [data, onChange]);
  const addSkill = useCallback(() => {
    const newSkill: Skill = {
      id: generateId(),
      name: ''
    };
    onChange({
      ...data,
      skills: [...data.skills, newSkill]
    });
  }, [data, onChange]);

  const handleSkillChange = useCallback((index: number, field: keyof Skill, value: any) => {
    const newSkills = [...data.skills];
    newSkills[index] = {
      ...newSkills[index],
      [field]: value
    };
    onChange({
      ...data,
      skills: newSkills
    });
  }, [data, onChange]);

  const removeSkill = useCallback((index: number) => {
    const newSkills = data.skills.filter((_, i) => i !== index);
    onChange({
      ...data,
      skills: newSkills
    });
  }, [data, onChange]);

  // Soft Skills handlers
  const addSoftSkill = useCallback(() => {
    const newSkill: Skill = {
      id: generateId(),
      name: ''
    };
    onChange({
      ...data,
      softSkills: [...(data.softSkills || []), newSkill]
    });
  }, [data, onChange]);

  const handleSoftSkillChange = useCallback((index: number, field: keyof Skill, value: string | undefined) => {
    const newSoftSkills = [...(data.softSkills || [])];
    newSoftSkills[index] = {
      ...newSoftSkills[index],
      [field]: value
    };
    onChange({
      ...data,
      softSkills: newSoftSkills
    });
  }, [data, onChange]);

  const removeSoftSkill = useCallback((index: number) => {
    const newSoftSkills = (data.softSkills || []).filter((_, i) => i !== index);
    onChange({
      ...data,
      softSkills: newSoftSkills
    });
  }, [data, onChange]);

  // Interests handlers
  const addInterest = useCallback(() => {
    const newInterest: Interest = {
      id: generateId(),
      name: '',
      description: ''
    };
    onChange({
      ...data,
      interests: [...(data.interests || []), newInterest]
    });
  }, [data, onChange]);

  const removeInterest = useCallback((index: number) => {
    const newInterests = (data.interests || []).filter((_, i) => i !== index);
    onChange({
      ...data,
      interests: newInterests
    });
  }, [data, onChange]);

  const handleInterestChange = useCallback((index: number, field: keyof Interest, value: string) => {
    const newInterests = [...(data.interests || [])];
    newInterests[index] = {
      ...newInterests[index],
      [field]: value
    };
    onChange({
      ...data,
      interests: newInterests
    });
  }, [data, onChange]);

  // Organisation handlers
  const addOrganisation = useCallback(() => {
    const newOrganisation: Organisation = {
      id: generateId(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    onChange({
      ...data,
      organisations: [...(data.organisations || []), newOrganisation]
    });
  }, [data, onChange]);

  const removeOrganisation = useCallback((index: number) => {
    const newOrganisations = (data.organisations || []).filter((_, i) => i !== index);
    onChange({
      ...data,
      organisations: newOrganisations
    });
  }, [data, onChange]);

  const handleOrganisationChange = useCallback((index: number, field: keyof Organisation, value: string) => {
    const newOrganisations = [...(data.organisations || [])];
    newOrganisations[index] = {
      ...newOrganisations[index],
      [field]: value
    };
    onChange({
      ...data,
      organisations: newOrganisations
    });
  }, [data, onChange]);

  // Publication handlers
  const addPublication = useCallback(() => {
    const newPublication: Publication = {
      id: generateId(),
      title: '',
      type: '',
      date: '',
      publisher: '',
      url: ''
    };
    onChange({
      ...data,
      publications: [...(data.publications || []), newPublication]
    });
  }, [data, onChange]);

  // Removed duplicate removePublication handler

  const handlePublicationChange = useCallback((index: number, field: keyof Publication, value: string) => {
    const newPublications = [...(data.publications || [])];
    newPublications[index] = {
      ...newPublications[index],
      [field]: value
    };
    onChange({
      ...data,
      publications: newPublications
    });
  }, [data, onChange]);

  const removePublication = useCallback((index: number) => {
    const newPublications = (data.publications || []).filter((_: Publication, i: number) => i !== index);
    onChange({
      ...data,
      publications: newPublications
    });
  }, [data, onChange]);

  // Handle references changes
  const handleReferenceChange = useCallback((index: number, field: keyof Reference, value: any) => {
    const newReferences = [...(data.references || [])];
    newReferences[index] = {
      ...newReferences[index],
      [field]: value
    };
    onChange({
      ...data,
      references: newReferences
    });
  }, [data, onChange]);

  const addReference = useCallback(() => {
    const newReference: Reference = {
      id: generateId(),
      name: '',
      position: '',
      company: '',
      email: '',
      phone: ''
    };
    onChange({
      ...data,
      references: [...(data.references || []), newReference]
    });
  }, [data, onChange]);

  const removeReference = useCallback((index: number) => {
    const newReferences = (data.references || []).filter((_: Reference, i: number) => i !== index);
    onChange({
      ...data,
      references: newReferences
    });
  }, [data, onChange]);

  // Handle languages changes
  const handleLanguageChange = useCallback((index: number, field: keyof Language, value: any) => {
    const newLanguages = [...(data.languages || [])];
    newLanguages[index] = {
      ...newLanguages[index],
      [field]: value
    };
    onChange({
      ...data,
      languages: newLanguages
    });
  }, [data, onChange]);

  const addLanguage = useCallback(() => {
    const newLanguage: Language = {
      id: generateId(),
      name: '',
      level: 'intermediate'
    };
    onChange({
      ...data,
      languages: [...(data.languages || []), newLanguage]
    });
  }, [data, onChange]);

  const removeLanguage = useCallback((index: number) => {
    const newLanguages = (data.languages || []).filter((_: Language, i: number) => i !== index);
    onChange({
      ...data,
      languages: newLanguages
    });
  }, [data, onChange]);

  // Handle declaration changes
  const handleDeclarationChange = useCallback((field: keyof Declaration, value: string) => {
    onChange({
      ...data,
      declaration: {
        ...data.declaration,
        [field]: value
      } as Declaration
    });
  }, [data, onChange]);

  // Handle custom section changes
  const handleCustomChange = useCallback((field: keyof CustomSection, value: string) => {
    onChange({
      ...data,
      custom: {
        ...data.custom,
        [field]: value
      } as CustomSection
    });
  }, [data, onChange]);

  const allSections = [
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
    { id: 'custom', label: 'Custom', icon: Plus, description: 'Custom section', category: 'optional' }
  ];

  // Removed unused variable sections

  // Check if section is completed (basic validation)
  // Removed unused variable isSectionCompleted

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'personalInfo': {
        const optionalDetailFields = [
          { id: 'website', label: 'Website', icon: GlobeIcon },
          { id: 'nationality', label: 'Nationality', icon: Globe },
          { id: 'dateOfBirth', label: 'Date of Birth', icon: Calendar },
          { id: 'visa', label: 'Visa', icon: Shield },
          { id: 'passport', label: 'Passport or Id', icon: Shield },
          { id: 'gender', label: 'Gender/Pronoun', icon: User },
        ];

        const activeOptionalFields = optionalDetailFields.filter(
          f => visibleOptionalFields.includes(f.id) || !!(data.personalInfo as any)[f.id]
        );
        const inactiveOptionalFields = optionalDetailFields.filter(
          f => !visibleOptionalFields.includes(f.id) && !(data.personalInfo as any)[f.id]
        );

        const showOptionalField = (fieldId: string) => {
          setVisibleOptionalFields(prev => [...prev, fieldId]);
        };

        const removeOptionalField = (fieldId: string) => {
          setVisibleOptionalFields(prev => prev.filter(id => id !== fieldId));
          handlePersonalInfoChange(fieldId as keyof PersonalInfo, '');
        };

        const personalEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
        const personalTransition = { duration: 0.28, ease: personalEase };

        return (
          <AnimatePresence mode="wait" initial={false}>
            {!isEditingPersonal ? (
              <motion.div
                key="personal-preview"
                className="relative"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={personalTransition}
              >
                <div
                  className="relative p-5 cursor-pointer group transition-all duration-200"
                  onClick={() => setIsEditingPersonal(true)}
                >
                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button
                      type="button"
                      className="p-2 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingPersonal(true);
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1 space-y-1">
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        {data.personalInfo.fullName || 'Your Name'}
                      </h2>
                      {data.jobTitle?.trim() ? (
                        <div
                          className="text-base font-semibold text-orange-500 mb-3 [&_p]:m-0 [&_div]:m-0 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: decodeHtml(data.jobTitle.trim()) }}
                        />
                      ) : (
                        <p className="text-base font-semibold text-orange-500 mb-3">Your Profession</p>
                      )}

                      <div className="space-y-1.5">
                        {data.personalInfo.email && (
                          <div className="flex items-center text-slate-500 gap-2.5">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">{data.personalInfo.email}</span>
                          </div>
                        )}
                        {data.personalInfo.phone && (
                          <div className="flex items-center text-slate-500 gap-2.5">
                            <PhoneIcon className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">{data.personalInfo.phone}</span>
                          </div>
                        )}
                        {data.personalInfo.location && (
                          <div className="flex items-center text-slate-500 gap-2.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">{data.personalInfo.location}</span>
                          </div>
                        )}
                        {data.personalInfo.linkedIn && (
                          <div className="flex items-center text-slate-500 gap-2.5">
                            <Linkedin className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">{data.personalInfo.linkedIn}</span>
                          </div>
                        )}
                        {data.personalInfo.github && (
                          <div className="flex items-center text-slate-500 gap-2.5">
                            <Code className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">{data.personalInfo.github}</span>
                          </div>
                        )}
                        {data.personalInfo.website && (
                          <div className="flex items-center text-slate-500 gap-2.5">
                            <GlobeIcon className="w-3.5 h-3.5" />
                            <span className="text-sm font-medium">{data.personalInfo.website}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {data.personalInfo.photo ? (
                      <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-slate-100">
                        <img src={data.personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-2xl bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 shrink-0">
                        <User className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="personal-edit"
                className="p-6 bg-white relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={personalTransition}
              >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Edit Personal Details</h2>
            </div>

            {/* Full Name + Photo Row */}
            <div className="flex gap-6 items-start mb-5">
              <div className="flex-1 space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Full name</Label>
                  <Input
                    value={data.personalInfo.fullName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePersonalInfoChange('fullName', e.target.value)}
                    placeholder="Your full name"
                    className="h-11 bg-slate-50/80 border-slate-200 rounded-lg text-sm font-medium focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-300"
                  />
                </div>

                {/* Professional Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Professional title</Label>
                  <RichTextEditor
                    value={data.jobTitle || ''}
                    onChange={(value) => onChange({ ...data, jobTitle: value })}
                    placeholder="e.g. Full Stack Developer"
                    minHeight="50px"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <Label className="text-xs font-bold text-slate-700">Photo</Label>
                <div
                  className="relative group cursor-pointer w-20 h-20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                  {data.personalInfo.photo ? (
                    <div className="w-full h-full rounded-full overflow-hidden shadow-sm border-2 border-slate-200 relative">
                      <img src={data.personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                        <span className="text-white text-[9px] font-bold uppercase">Change</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-0.5 group-hover:bg-slate-200/70 transition-colors">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 my-5" />

            {/* Core Fields */}
            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={data.personalInfo.email}
                    onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                    placeholder="your@email.com"
                    className="h-11 bg-slate-50/80 border-slate-200 rounded-lg text-sm flex-1 focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-300"
                  />
                  <button className="shrink-0 p-2 text-slate-300 hover:text-slate-500 transition-colors cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Phone</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={data.personalInfo.phone}
                    onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                    placeholder="+91 1234567890"
                    className="h-11 bg-slate-50/80 border-slate-200 rounded-lg text-sm flex-1 focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-300"
                  />
                  <button className="shrink-0 p-2 text-slate-300 hover:text-slate-500 transition-colors cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Location</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={data.personalInfo.location}
                    onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
                    placeholder="City, State, Country"
                    className="h-11 bg-slate-50/80 border-slate-200 rounded-lg text-sm flex-1 focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-300"
                  />
                  <button className="shrink-0 p-2 text-slate-300 hover:text-slate-500 transition-colors cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* LinkedIn */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">LinkedIn</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={data.personalInfo.linkedIn || ''}
                      onChange={(e) => handlePersonalInfoChange('linkedIn', e.target.value)}
                      placeholder="Enter LinkedIn"
                      className="h-11 bg-slate-50/80 border-slate-200 rounded-lg text-sm pr-16 focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-300"
                    />
                    {data.personalInfo.linkedIn && (
                      <a
                        href={data.personalInfo.linkedIn.startsWith('http') ? data.personalInfo.linkedIn : `https://${data.personalInfo.linkedIn}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-orange-600 hover:text-orange-800 bg-orange-50 rounded-md border border-orange-100 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>Link</span>
                      </a>
                    )}
                  </div>
                  <button className="shrink-0 p-2 text-slate-300 hover:text-slate-500 transition-colors cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* GitHub */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">GitHub</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={data.personalInfo.github || ''}
                      onChange={(e) => handlePersonalInfoChange('github', e.target.value)}
                      placeholder="Enter GitHub"
                      className="h-11 bg-slate-50/80 border-slate-200 rounded-lg text-sm pr-16 focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-300"
                    />
                    {data.personalInfo.github && (
                      <a
                        href={data.personalInfo.github.startsWith('http') ? data.personalInfo.github : `https://${data.personalInfo.github}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-orange-600 hover:text-orange-800 bg-orange-50 rounded-md border border-orange-100 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>Link</span>
                      </a>
                    )}
                  </div>
                  <button className="shrink-0 p-2 text-slate-300 hover:text-slate-500 transition-colors cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Optional Fields (rendered as full inputs once user clicked the chip) */}
              {activeOptionalFields.map(field => (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">{field.label}</Label>
                    <button
                      onClick={() => removeOptionalField(field.id)}
                      className="text-slate-300 hover:text-orange-500 transition-colors p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type={field.id === 'dateOfBirth' ? 'date' : 'text'}
                      value={(data.personalInfo as any)[field.id] || ''}
                      onChange={(e) => handlePersonalInfoChange(field.id as keyof PersonalInfo, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="h-11 bg-slate-50/80 border-slate-200 rounded-lg text-sm flex-1 focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-300"
                    />
                    <button className="shrink-0 p-2 text-slate-300 hover:text-slate-500 transition-colors cursor-grab">
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Details Section */}
            {inactiveOptionalFields.length > 0 && (
              <div className="mt-6">
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Add details</h3>
                  <div className="flex flex-wrap gap-2">
                    {inactiveOptionalFields.map(field => (
                      <button
                        key={field.id}
                        onClick={() => showOptionalField(field.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{field.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Done Button */}
            <div className="mt-8">
              <Button
                size="lg"
                className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingPersonal(false);
                }}
              >
                <Check className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        );
      }

      case 'summary':
        return (
          <div className="space-y-2">
            <RichTextEditor
              value={data.personalInfo.summary || ''}
              onChange={handleSummaryChange}
              placeholder="Write a professional summary or objective statement that highlights your key qualifications and career goals..."
              minHeight="200px"
              onAssist={handleSummaryAssist}
            />
          </div>
        );

      case 'experience':
        if (editingEntryId) {
          const expIndex = data.experience.findIndex(e => e.id === editingEntryId);
          const exp = data.experience[expIndex];
          if (!exp) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Experience</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Company</Label>
                  <RichTextEditor
                    value={exp.company}
                    onChange={(value) => handleExperienceChange(expIndex, 'company', value)}
                    placeholder="Enter company name"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Position</Label>
                  <RichTextEditor
                    value={exp.position}
                    onChange={(value) => handleExperienceChange(expIndex, 'position', value)}
                    placeholder="Software Engineer"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Start Date</Label>
                  <Input
                    type="month"
                    value={exp.startDate}
                    onChange={(e) => handleExperienceChange(expIndex, 'startDate', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                    <span>End Date</span>
                    <label className="flex items-center space-x-2 cursor-pointer lowercase">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) => handleExperienceChange(expIndex, 'current', e.target.checked)}
                        className="rounded accent-orange-500"
                      />
                      <span>Current</span>
                    </label>
                  </Label>
                  <Input
                    type="month"
                    value={exp.endDate}
                    onChange={(e) => handleExperienceChange(expIndex, 'endDate', e.target.value)}
                    disabled={exp.current}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Description</Label>
                <RichTextEditor
                  value={exp.description}
                  onChange={(value) => handleExperienceChange(expIndex, 'description', value)}
                  placeholder="Describe your role and responsibilities..."
                  minHeight="200px"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Key Achievements</Label>
                  <Button
                    onClick={() => addAchievement(expIndex)}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-orange-500 hover:text-orange-600 font-bold"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Achievement
                  </Button>
                </div>
                <div className="space-y-3">
                  {exp.achievements.map((achievement, achIndex) => (
                    <div key={achIndex} className="flex gap-2">
                      <Input
                        value={achievement}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAchievementChange(expIndex, achIndex, e.target.value)}
                        placeholder="• Achieved 20% increase in sales..."
                        className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20 flex-1"
                      />
                      <Button
                        onClick={() => removeAchievement(expIndex, achIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-300 hover:text-orange-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-experience" type="experience">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {data.experience.map((exp, index) => (
                  <Draggable key={exp.id} draggableId={exp.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          exp.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(exp.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {exp.company || 'Enter Company'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              exp.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('experience', index);
                            }}
                          >
                            {exp.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeExperience(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <Calendar className="w-5 h-5" />
                  <button
                    onClick={addExperience}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'education':
        if (editingEntryId) {
          const eduIndex = data.education.findIndex(e => e.id === editingEntryId);
          const edu = data.education[eduIndex];
          if (!edu) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Education</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Institution</Label>
                  <RichTextEditor
                    value={edu.institution}
                    onChange={(value) => handleEducationChange(eduIndex, 'institution', value)}
                    placeholder="University Name"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Degree</Label>
                  <RichTextEditor
                    value={edu.degree}
                    onChange={(value) => handleEducationChange(eduIndex, 'degree', value)}
                    placeholder="Bachelor of Science"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Field of Study</Label>
                  <RichTextEditor
                    value={edu.field}
                    onChange={(value) => handleEducationChange(eduIndex, 'field', value)}
                    placeholder="Computer Science"
                    minHeight="50px"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase">Start Year</Label>
                    <Input
                      type="number"
                      value={edu.startYear}
                      onChange={(e) => handleEducationChange(eduIndex, 'startYear', e.target.value)}
                      placeholder="2020"
                      className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase">End Year</Label>
                    <Input
                      type="number"
                      value={edu.endYear}
                      onChange={(e) => handleEducationChange(eduIndex, 'endYear', e.target.value)}
                      placeholder="2024"
                      className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">GPA (Optional)</Label>
                  <Input
                    value={edu.gpa || ''}
                    onChange={(e) => handleEducationChange(eduIndex, 'gpa', e.target.value)}
                    placeholder="3.8"
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-education" type="education">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {data.education.map((edu, index) => (
                  <Draggable key={edu.id} draggableId={edu.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          edu.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(edu.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {edu.institution || 'Enter Institution'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              edu.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('education', index);
                            }}
                          >
                            {edu.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeEducation(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <GraduationCap className="w-5 h-5" />
                  <button
                    onClick={addEducation}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'skills':
        if (editingEntryId) {
          const skillIndex = data.skills.findIndex(s => s.id === editingEntryId);
          const skill = data.skills[skillIndex];
          if (!skill) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Skill</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Skill Name</Label>
                  <RichTextEditor
                    value={skill.name}
                    onChange={(value) => handleSkillChange(skillIndex, 'name', value)}
                    placeholder="e.g. React, Project Management, etc."
                    minHeight="80px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Proficiency Level</Label>
                  <select
                    value={skill.level || 'intermediate'}
                    onChange={(e) => handleSkillChange(skillIndex, 'level', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border-none h-11 focus:ring-2 focus:ring-orange-500/20 text-slate-700"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-skills" type="skills">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {data.skills.map((skill, index) => (
                  <Draggable key={skill.id} draggableId={skill.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          skill.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(skill.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {skill.name || 'Enter Skill'}
                          </span>
                          {skill.level && (
                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full">
                              {skill.level}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              skill.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('skills', index);
                            }}
                          >
                            {skill.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSkill(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <Code className="w-5 h-5" />
                  <button
                    onClick={addSkill}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'softSkills':
        if (editingEntryId) {
          const skillIndex = (data.softSkills || []).findIndex(s => s.id === editingEntryId);
          const skill = (data.softSkills || [])[skillIndex];
          if (!skill) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Soft Skill</h3>
              </div>

              <div className="space-y-2 text-left">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Skill Name</Label>
                <RichTextEditor
                  value={skill.name}
                  onChange={(value) => handleSoftSkillChange(skillIndex, 'name', value)}
                  placeholder="Leadership, Communication, Teamwork..."
                  minHeight="80px"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-softSkills" type="softSkills">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.softSkills || []).map((skill, index) => (
                  <Draggable key={skill.id} draggableId={skill.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          skill.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(skill.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {skill.name || 'Enter Soft Skill'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              skill.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('softSkills', index);
                            }}
                          >
                            {skill.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSoftSkill(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <Heart className="w-5 h-5" />
                  <button
                    onClick={addSoftSkill}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'certificates':
        if (editingEntryId) {
          const certIndex = (data.certificates || []).findIndex(c => c.id === editingEntryId);
          const cert = (data.certificates || [])[certIndex];
          if (!cert) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Certificate</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Certificate Name</Label>
                  <RichTextEditor
                    value={cert.name}
                    onChange={(value) => handleCertificateChange(certIndex, 'name', value)}
                    placeholder="AWS Cloud Practitioner"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Issuing Organization</Label>
                  <RichTextEditor
                    value={cert.organization}
                    onChange={(value) => handleCertificateChange(certIndex, 'organization', value)}
                    placeholder="Amazon Web Services"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Issue Date</Label>
                  <Input
                    type="date"
                    value={cert.issueDate}
                    onChange={(e) => handleCertificateChange(certIndex, 'issueDate', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Expiry Date (Optional)</Label>
                  <Input
                    type="date"
                    value={cert.expiryDate || ''}
                    onChange={(e) => handleCertificateChange(certIndex, 'expiryDate', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2 text-left md:col-span-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Certificate ID/URL (Optional)</Label>
                  <Input
                    value={cert.certificateId || ''}
                    onChange={(e) => handleCertificateChange(certIndex, 'certificateId', e.target.value)}
                    placeholder="Certificate URL or ID"
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-certificates" type="certificates">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.certificates || []).map((cert, index) => (
                  <Draggable key={cert.id} draggableId={cert.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          cert.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(cert.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {cert.name || 'Enter Certificate'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              cert.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('certificates', index);
                            }}
                          >
                            {cert.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCertificate(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <Shield className="w-5 h-5" />
                  <button
                    onClick={addCertificate}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'interests':
        if (editingEntryId) {
          const interestIndex = (data.interests || []).findIndex(i => i.id === editingEntryId);
          const interest = (data.interests || [])[interestIndex];
          if (!interest) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Interest</h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Interest Name</Label>
                  <RichTextEditor
                    value={interest.name}
                    onChange={(value) => handleInterestChange(interestIndex, 'name', value)}
                    placeholder="Photography"
                    minHeight="80px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Description (Optional)</Label>
                  <RichTextEditor
                    value={interest.description || ''}
                    onChange={(value) => handleInterestChange(interestIndex, 'description', value)}
                    placeholder="Brief description of your interest"
                    minHeight="120px"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-interests" type="interests">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.interests || []).map((interest, index) => (
                  <Draggable key={interest.id} draggableId={interest.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          interest.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(interest.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {interest.name || 'Enter Interest'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              interest.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('interests', index);
                            }}
                          >
                            {interest.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeInterest(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <Heart className="w-5 h-5" />
                  <button
                    onClick={addInterest}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'projects':
        if (editingEntryId) {
          const projIndex = (data.projects || []).findIndex(p => p.id === editingEntryId);
          const proj = (data.projects || [])[projIndex];
          if (!proj) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Project</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left md:col-span-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Project Title</Label>
                  <RichTextEditor
                    value={proj.title}
                    onChange={(value) => handleProjectChange(projIndex, 'title', value)}
                    placeholder="E-commerce Platform"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Role (Optional)</Label>
                  <RichTextEditor
                    value={proj.role || ''}
                    onChange={(value) => handleProjectChange(projIndex, 'role', value)}
                    placeholder="Lead Developer"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Technologies</Label>
                  <RichTextEditor
                    value={proj.technologies || ''}
                    onChange={(value) => handleProjectChange(projIndex, 'technologies', value)}
                    placeholder="React, Node.js, PostgreSQL"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Start Date</Label>
                  <Input
                    type="month"
                    value={proj.startDate}
                    onChange={(e) => handleProjectChange(projIndex, 'startDate', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">End Date</Label>
                  <Input
                    type="month"
                    value={proj.endDate}
                    onChange={(e) => handleProjectChange(projIndex, 'endDate', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Description</Label>
                <RichTextEditor
                  value={proj.description || ''}
                  onChange={(value) => handleProjectChange(projIndex, 'description', value)}
                  placeholder="Describe the project goals and your contributions..."
                  minHeight="200px"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-projects" type="projects">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.projects || []).map((proj, index) => (
                  <Draggable key={proj.id} draggableId={proj.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          proj.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(proj.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {proj.title || 'Enter Project Title'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              proj.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('projects', index);
                            }}
                          >
                            {proj.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeProject(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <FolderOpen className="w-5 h-5" />
                  <button
                    onClick={addProject}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'courses':
        if (editingEntryId) {
          const courseIndex = (data.courses || []).findIndex(c => c.id === editingEntryId);
          const course = (data.courses || [])[courseIndex];
          if (!course) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Course</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Course Name</Label>
                  <RichTextEditor
                    value={course.name}
                    onChange={(value) => handleCourseChange(courseIndex, 'name', value)}
                    placeholder="Machine Learning Specialization"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Provider/Institution</Label>
                  <RichTextEditor
                    value={course.provider || ''}
                    onChange={(value) => handleCourseChange(courseIndex, 'provider', value)}
                    placeholder="Coursera, Stanford University"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Completion Date</Label>
                  <Input
                    type="date"
                    value={course.completionDate}
                    onChange={(e) => handleCourseChange(courseIndex, 'completionDate', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Description (Optional)</Label>
                <RichTextEditor
                  value={course.description || ''}
                  onChange={(value) => handleCourseChange(courseIndex, 'description', value)}
                  placeholder="What did you learn?"
                  minHeight="150px"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-courses" type="courses">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.courses || []).map((course, index) => (
                  <Draggable key={course.id} draggableId={course.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          course.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(course.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {course.name || 'Enter Course Name'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              course.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('courses', index);
                            }}
                          >
                            {course.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCourse(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <BookOpen className="w-5 h-5" />
                  <button
                    onClick={addCourse}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'awards':
        if (editingEntryId) {
          const awardIndex = (data.awards || []).findIndex(a => a.id === editingEntryId);
          const award = (data.awards || [])[awardIndex];
          if (!award) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Award</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Award Title</Label>
                  <RichTextEditor
                    value={award.title}
                    onChange={(value) => handleAwardChange(awardIndex, 'title', value)}
                    placeholder="Employee of the Month"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Issuing Organization</Label>
                  <RichTextEditor
                    value={award.organization || ''}
                    onChange={(value) => handleAwardChange(awardIndex, 'organization', value)}
                    placeholder="Company Name"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Date Received</Label>
                  <Input
                    type="date"
                    value={award.date}
                    onChange={(e) => handleAwardChange(awardIndex, 'date', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Description/Reason</Label>
                <RichTextEditor
                  value={award.description || ''}
                  onChange={(value) => handleAwardChange(awardIndex, 'description', value)}
                  placeholder="Why did you receive this award?"
                  minHeight="150px"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-awards" type="awards">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.awards || []).map((award, index) => (
                  <Draggable key={award.id} draggableId={award.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          award.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(award.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {award.title || 'Enter Award Title'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              award.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('awards', index);
                            }}
                          >
                            {award.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAward(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <AwardIcon className="w-5 h-5" />
                  <button
                    onClick={addAward}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'organisations':
        if (editingEntryId) {
          const orgIndex = (data.organisations || []).findIndex(o => o.id === editingEntryId);
          const org = (data.organisations || [])[orgIndex];
          if (!org) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Organisation</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Organisation Name</Label>
                  <RichTextEditor
                    value={org.name}
                    onChange={(value) => handleOrganisationChange(orgIndex, 'name', value)}
                    placeholder="Red Cross"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Role/Position</Label>
                  <RichTextEditor
                    value={org.role || ''}
                    onChange={(value) => handleOrganisationChange(orgIndex, 'role', value)}
                    placeholder="Volunteer"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Start Date</Label>
                  <Input
                    type="month"
                    value={org.startDate}
                    onChange={(e) => handleOrganisationChange(orgIndex, 'startDate', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">End Date</Label>
                  <Input
                    type="month"
                    value={org.endDate}
                    onChange={(e) => handleOrganisationChange(orgIndex, 'endDate', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Description/Contribution</Label>
                <RichTextEditor
                  value={org.description || ''}
                  onChange={(value) => handleOrganisationChange(orgIndex, 'description', value)}
                  placeholder="Describe your role and contributions"
                  minHeight="200px"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-organisations" type="organisations">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.organisations || []).map((org, index) => (
                  <Draggable key={org.id} draggableId={org.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          org.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(org.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {org.name || 'Enter Organisation Name'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              org.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('organisations', index);
                            }}
                          >
                            {org.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeOrganisation(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <Users className="w-5 h-5" />
                  <button
                    onClick={addOrganisation}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'publications':
        if (editingEntryId) {
          const pubIndex = (data.publications || []).findIndex(p => p.id === editingEntryId);
          const pub = (data.publications || [])[pubIndex];
          if (!pub) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Publication</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left md:col-span-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Title</Label>
                  <RichTextEditor
                    value={pub.title}
                    onChange={(value) => handlePublicationChange(pubIndex, 'title', value)}
                    placeholder="Research Paper Title"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Publication Type</Label>
                  <Input
                    value={pub.type || ''}
                    onChange={(e) => handlePublicationChange(pubIndex, 'type', e.target.value)}
                    placeholder="Journal, Conference, Book"
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Date</Label>
                  <Input
                    type="date"
                    value={pub.date}
                    onChange={(e) => handlePublicationChange(pubIndex, 'date', e.target.value)}
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Publisher</Label>
                  <RichTextEditor
                    value={pub.publisher || ''}
                    onChange={(value) => handlePublicationChange(pubIndex, 'publisher', value)}
                    placeholder="Publisher Name"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">URL/DOI (Optional)</Label>
                  <Input
                    value={pub.url || ''}
                    onChange={(e) => handlePublicationChange(pubIndex, 'url', e.target.value)}
                    placeholder="https://doi.org/..."
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Description/Abstract</Label>
                <RichTextEditor
                  value={pub.description || ''}
                  onChange={(value) => handlePublicationChange(pubIndex, 'description', value)}
                  placeholder="Brief description or abstract"
                  minHeight="200px"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-publications" type="publications">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.publications || []).map((pub, index) => (
                  <Draggable key={pub.id} draggableId={pub.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          pub.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(pub.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {pub.title || 'Enter Publication Title'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              pub.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('publications', index);
                            }}
                          >
                            {pub.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePublication(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <FileText className="w-5 h-5" />
                  <button
                    onClick={addPublication}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'references':
        if (editingEntryId) {
          const refIndex = (data.references || []).findIndex(r => r.id === editingEntryId);
          const ref = (data.references || [])[refIndex];
          if (!ref) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Reference</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Name</Label>
                  <RichTextEditor
                    value={ref.name}
                    onChange={(value) => handleReferenceChange(refIndex, 'name', value)}
                    placeholder="John Smith"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Position/Relationship</Label>
                  <RichTextEditor
                    value={ref.position || ''}
                    onChange={(value) => handleReferenceChange(refIndex, 'position', value)}
                    placeholder="Former Manager"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Company/Organization</Label>
                  <RichTextEditor
                    value={ref.company || ''}
                    onChange={(value) => handleReferenceChange(refIndex, 'company', value)}
                    placeholder="Company Name"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Email</Label>
                  <Input
                    type="email"
                    value={ref.email || ''}
                    onChange={(e) => handleReferenceChange(refIndex, 'email', e.target.value)}
                    placeholder="john@company.com"
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Phone (Optional)</Label>
                  <Input
                    type="tel"
                    value={ref.phone || ''}
                    onChange={(e) => handleReferenceChange(refIndex, 'phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-references" type="references">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.references || []).map((ref, index) => (
                  <Draggable key={ref.id} draggableId={ref.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          ref.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(ref.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {ref.name || 'Enter Reference Name'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              ref.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('references', index);
                            }}
                          >
                            {ref.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeReference(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <Users className="w-5 h-5" />
                  <button
                    onClick={addReference}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'languages':
        if (editingEntryId) {
          const langIndex = (data.languages || []).findIndex(l => l.id === editingEntryId);
          const lang = (data.languages || [])[langIndex];
          if (!lang) { setEditingEntryId(null); return null; }

          return (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Edit Language</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Language Name</Label>
                  <RichTextEditor
                    value={lang.name}
                    onChange={(value) => handleLanguageChange(langIndex, 'name', value)}
                    placeholder="Spanish"
                    minHeight="50px"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">Proficiency Level</Label>
                  <select
                    value={lang.level}
                    onChange={(e) => handleLanguageChange(langIndex, 'level', e.target.value as Language['level'])}
                    className="w-full h-11 px-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="native">Native</option>
                    <option value="fluent">Fluent</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="basic">Basic</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setEditingEntryId(null)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          );
        }

        return (
          <Droppable droppableId="entries-languages" type="languages">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex flex-col border rounded-xl overflow-hidden divide-y divide-slate-100"
              >
                {(data.languages || []).map((lang, index) => (
                  <Draggable key={lang.id} draggableId={lang.id} index={index}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer bg-white",
                          snapshot.isDragging ? "shadow-md z-[100]" : "",
                          lang.visible === false ? "opacity-50" : ""
                        )}
                        onClick={() => setEditingEntryId(lang.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div {...draggableProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded touch-none">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {index + 1}. {lang.name || 'Enter Language Name'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              lang.visible === false ? "bg-slate-100 text-slate-600" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEntryVisibility('languages', index);
                            }}
                          >
                            {lang.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1.5 hover:bg-orange-100 rounded-md text-slate-400 hover:text-orange-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLanguage(index);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <div className="p-4 bg-slate-50/50 flex items-center justify-between text-slate-400">
                  <Languages className="w-5 h-5" />
                  <button
                    onClick={addLanguage}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </button>
                  <div className="w-5 h-5 opacity-0"></div>
                </div>
              </div>
            )}
          </Droppable>
        );

      case 'declaration':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">Declaration</h4>

            <div className="p-4 rounded-xl border bg-background/50 space-y-4">
              <div className="space-y-2">
                <Label>Declaration Statement</Label>
                <RichTextEditor
                  value={data.declaration?.statement || ''}
                  onChange={(value) => handleDeclarationChange('statement', value)}
                  placeholder="I hereby declare that the information provided is true and accurate to the best of my knowledge..."
                  minHeight="150px"
                />
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Place</Label>
                  <Input
                    value={data.declaration?.place || ''}
                    onChange={(e) => handleDeclarationChange('place', e.target.value)}
                    placeholder="New York"
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={data.declaration?.date || ''}
                    onChange={(e) => handleDeclarationChange('date', e.target.value)}
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Signature (Optional)</Label>
                  <Input
                    value={data.declaration?.signature || ''}
                    onChange={(e) => handleDeclarationChange('signature', e.target.value)}
                    placeholder="Your signature or name"
                    className="bg-background/50"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'job':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-slate-700 uppercase tracking-wider text-xs">Job Target</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desired Position</Label>
                <RichTextEditor
                  value={data.jobTitle || ''}
                  onChange={(value) => onChange({ ...data, jobTitle: value })}
                  placeholder="Software Engineer"
                  minHeight="50px"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Company (Optional)</Label>
                <Input
                  value={data.jobTarget?.company ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      jobTarget: {
                        position: data.jobTarget?.position ?? '',
                        company: e.target.value,
                        ...(data.jobTarget?.description !== undefined && {
                          description: data.jobTarget.description,
                        }),
                      },
                    })
                  }
                  placeholder="Google, etc."
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">Custom Section</h4>

            <div className="p-4 rounded-xl border bg-background/50 space-y-4">
              <div className="space-y-2">
                <Label>Section Title</Label>
                <RichTextEditor
                  value={data.custom?.title || ''}
                  onChange={(value) => handleCustomChange('title', value)}
                  placeholder="Additional Information"
                  minHeight="50px"
                />
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <RichTextEditor
                  value={data.custom?.content || ''}
                  onChange={(value) => handleCustomChange('content', value)}
                  placeholder="Enter your custom content here..."
                  minHeight="300px"
                />
              </div>

            </div>
          </div>
        );

      default:
        return <div>Section content not found</div>;
    }
  };

  return (
    <div className="h-full">
      <div className="max-w-4xl mx-auto p-4">
        <div className="space-y-4">
          {/* Always render Personal Information first as a special card — static container (no layout animation on edit toggle) */}
          <div
            className={cn(
              "bg-white border rounded-2xl overflow-hidden mb-6 transition-[border-color,box-shadow,ring] duration-300 ease-out",
              isEditingPersonal ? "border-orange-500 shadow-xl ring-1 ring-orange-500/10" : "border-slate-200 shadow-sm hover:shadow-md",
              data.hiddenSections?.includes('personalInfo') ? "opacity-50" : ""
            )}
          >
            {renderSectionContent('personalInfo')}
          </div>

          {/* Drag-and-drop for all sections except Personal Information */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections-droppable">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                  {selectedSections
                    .filter(id => id !== 'personalInfo')
                    .map((sectionId, index) => {
                      // Special case for summary since it has a different icon than the dynamic ones
                      const isSummary = sectionId === 'summary';
                      const section = allSections.find(s => s.id === sectionId);

                      const isExpanded = expandedSection === sectionId;
                      const Icon = isSummary ? FileText : (section?.icon || FileText);
                      const label = isSummary ? (data.sectionLabels?.summary || 'Professional Summary') : (data.sectionLabels?.[sectionId] || section?.label || 'Section');

                      return (
                        <Draggable key={sectionId} draggableId={sectionId} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={cn(
                                "bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all",
                                dragSnapshot.isDragging ? "shadow-lg ring-2 ring-orange-500/20" : "",
                                isExpanded ? "border-orange-500 ring-1 ring-orange-500/10" : "",
                                data.hiddenSections?.includes(sectionId) ? "opacity-50" : ""
                              )}
                            >
                              <div className="flex flex-col">
                                <motion.div
                                  onClick={() => toggleSection(sectionId)}
                                  className={cn(
                                    "w-full p-5 text-left transition-colors flex items-center gap-3 min-w-0 group cursor-pointer",
                                    isExpanded ? "bg-slate-50/50" : "hover:bg-slate-50"
                                  )}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      toggleSection(sectionId);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div {...dragProvided.dragHandleProps} className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors">
                                      <GripVertical className="w-5 h-5" />
                                    </div>
                                    <div
                                      className={cn("p-2 rounded-lg transition-colors",
                                        isExpanded ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                                      )}
                                    >
                                      <Icon className="w-5 h-5" />
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0 pr-1">
                                    {editingHeaderId === sectionId ? (
                                      <Input
                                        autoFocus
                                        value={label}
                                        onChange={(e) => handleSectionLabelChange(sectionId, e.target.value)}
                                        onBlur={() => setEditingHeaderId(null)}
                                        onKeyDown={(e) => e.key === 'Enter' && setEditingHeaderId(null)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-8 py-0 px-2 text-sm font-bold uppercase tracking-wide bg-slate-50 border-orange-200 focus-visible:ring-orange-500/20 w-full max-w-md"
                                      />
                                    ) : (
                                      <h3 className="font-bold text-slate-800 uppercase tracking-wide text-sm truncate">
                                        {label}
                                      </h3>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      title={editingHeaderId === sectionId ? 'Save heading' : 'Edit heading'}
                                      aria-label={editingHeaderId === sectionId ? 'Save section heading' : 'Edit section heading'}
                                      className={cn(
                                        "inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
                                        editingHeaderId === sectionId ? "bg-orange-50 text-orange-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingHeaderId(editingHeaderId === sectionId ? null : sectionId);
                                      }}
                                    >
                                      {editingHeaderId === sectionId ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                    </button>
                                    <button
                                      type="button"
                                      title={data.hiddenSections?.includes(sectionId) ? 'Show in resume' : 'Hide from resume'}
                                      aria-label="Toggle section visibility"
                                      className={cn(
                                        "inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
                                        data.hiddenSections?.includes(sectionId) ? "bg-slate-100 text-slate-600" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSectionVisibility(sectionId);
                                      }}
                                    >
                                      {data.hiddenSections?.includes(sectionId) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>

                                  <div className="shrink-0 text-slate-400">
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                  </div>
                                </motion.div>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="p-5 pt-2"
                                    >
                                      {renderSectionContent(sectionId)}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>


                          )
                          }
                        </Draggable>
                      );
                    })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Add Sections Button */}
          {
            onOpenSectionsModal && (
              <Button
                onClick={onOpenSectionsModal}
                variant="outline"
                className="w-full p-8 border-dashed border-2 border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 hover:border-orange-300 transition-all text-slate-500 hover:text-orange-500 flex items-center justify-center gap-3"
              >
                <Plus className="w-5 h-5" />
                <span className="font-bold uppercase tracking-wider text-xs">Add Content</span>
              </Button>
            )
          }
        </div >
      </div >
    </div >
  );
}

export default ResumeForm;