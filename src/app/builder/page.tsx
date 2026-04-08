"use client";

/**
 * Main resume builder page (MyDreamResume)
 * Two-column layout with form on left and preview/analysis on right
 */

import React, { useState, useEffect, Suspense, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Sparkles,
  Download,
  BarChart3,
  Settings,
  Eye,
  Save,
  Menu,
  X,
  Palette,
  LogOut,
  LayoutGrid,
  ChevronDown,
  Briefcase,
  Columns2,
  Type
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import ResumeForm from '@/components/ResumeForm';
import ResumePreview, { ResumePreviewHandle } from '@/components/ResumePreview';

const AIResumeChecker = dynamic(() => import('@/components/AIResumeChecker'));
const FeatureShowcase = dynamic(() => import('@/components/FeatureShowcase'));
const ExportButtons = dynamic(() => import('@/components/ExportButtons'));
const ChangesVisualization = dynamic(() => import('@/components/ChangesVisualization'));
const AddSectionsModal = dynamic(() => import('@/components/AddSectionsModal'));
const BottomDockPanel = dynamic(() => import('@/components/BottomDockPanel'));
const CustomizeForm = dynamic(() => import('@/components/CustomizeForm'));
import { toast } from 'sonner';
import '@/components/bottom-dock-panel.css';

import type { ResumeData } from '@/lib/types';
import { loadResumeData, saveResumeData, clearResumeData, loadResumeDataFromDB, cn, isValidEmail } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { trackResumeChanges, type ChangesSummary } from '@/lib/change-tracker';
import { DEFAULT_DESIGN } from '@/lib/defaults';
import { getTemplateById, normalizeResumeTemplateIds } from '@/lib/templates';
import atsOptimizedResume from '@/lib/seed/atsOptimizedResume';
import lastAIResponseResume from '@/lib/seed/lastAIResponseResume';

import { useResumeStore } from '@/store/useResumeStore';

/** Plain text blob for ATS / analysis — module scope avoids reallocating the function every render. */
function generateFullResumeContent(data: ResumeData): string {
  const content: string[] = [];

  if (data.personalInfo.fullName) {
    content.push(`Name: ${data.personalInfo.fullName}`);
  }
  if (data.personalInfo.email) {
    content.push(`Email: ${data.personalInfo.email}`);
  }
  if (data.personalInfo.phone) {
    content.push(`Phone: ${data.personalInfo.phone}`);
  }
  if (data.personalInfo.location) {
    content.push(`Location: ${data.personalInfo.location}`);
  }
  if (data.personalInfo.linkedIn) {
    content.push(`LinkedIn: ${data.personalInfo.linkedIn}`);
  }
  if (data.personalInfo.website) {
    content.push(`Website: ${data.personalInfo.website}`);
  }

  if (data.personalInfo.summary) {
    content.push(`\nProfessional Summary:\n${data.personalInfo.summary}`);
  }

  if (data.experience.length > 0) {
    content.push('\nExperience:');
    data.experience.forEach((exp) => {
      content.push(`\n${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})`);
      if (exp.description) {
        content.push(exp.description);
      }
      if (exp.achievements.length > 0) {
        content.push('Achievements:');
        exp.achievements.forEach((achievement) => {
          content.push(`• ${achievement}`);
        });
      }
    });
  }

  if (data.education.length > 0) {
    content.push('\nEducation:');
    data.education.forEach((edu) => {
      let eduLine = edu.institution;
      if (edu.degree && edu.field) {
        eduLine = `${edu.degree} in ${edu.field} from ${edu.institution}`;
      } else if (edu.degree) {
        eduLine = `${edu.degree} from ${edu.institution}`;
      } else if (edu.field) {
        eduLine = `${edu.field} from ${edu.institution}`;
      }
      eduLine += ` (${edu.startYear} - ${edu.endYear})`;
      content.push(eduLine);
      if (edu.gpa) {
        content.push(`GPA: ${edu.gpa}`);
      }
    });
  }

  if (data.skills.length > 0) {
    content.push(`\nTechnical Skills: ${data.skills.map((skill) => skill.name).join(', ')}`);
  }

  return content.join('\n');
}

function BuilderPageContent() {
  const searchParams = useSearchParams();
  const [previewVisible] = useState(true);

  const resumeData = useResumeStore((s) => s.data);
  const setResumeData = useResumeStore((s) => s.setResumeData);
  const updateDesign = useResumeStore((s) => s.updateDesign);
  const isInitialLoad = useResumeStore((s) => s.isInitialLoad);
  const setInitialLoad = useResumeStore((s) => s.setInitialLoad);
  const setSelectedSections = useResumeStore((s) => s.setSelectedSections);

  const selectedSections = resumeData.selectedSections || ['personalInfo', 'summary', 'experience', 'education', 'skills'];

  const [dockOpen, setDockOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [aiPreviewData, setAiPreviewData] = useState<ResumeData | null>(null);
  const [currentView, setCurrentView] = useState<'preview' | 'aiPreview' | 'ats' | 'export' | 'changes' | 'customize'>('preview');
  const [analysisMode, setAnalysisMode] = useState<'manual' | 'ai'>('manual');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'info' | 'preview'>('split');
  /** Avoid TS narrowing in `viewMode === 'info'` branch so toolbar buttons compare full union */
  const viewModeForToolbar = viewMode;
  const [changesSummary, setChangesSummary] = useState<ChangesSummary | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const resumePreviewRef = useRef<ResumePreviewHandle>(null);

  const handleNavbarDownload = useCallback(async () => {
    if (resumePreviewRef.current) {
      setIsDownloading(true);
      try {
        await resumePreviewRef.current.handleDownloadPDF();
      } finally {
        setIsDownloading(false);
      }
    }
  }, []);

  const handleAIGenerate = async () => {
    if (!resumeData.personalInfo.fullName) {
      alert('Please fill in your name first');
      return;
    }

    // Save current state first (localStorage + MongoDB via saveResumeData)
    saveResumeData(resumeData);

    // Redirect to the AI Generation (Target Job & Prompts) module
    router.push('/generate');
  };

  // Modal state
  const [addSectionsModalOpen, setAddSectionsModalOpen] = useState(false);

  // Load saved data on mount
  // Track what we've already loaded to prevented recursive loops or accidental overwrites
  const lastLoadedRef = useRef<string | null>(null);

  const resumeDataForAnalysis = useMemo(
    () => (analysisMode === 'ai' && aiPreviewData ? aiPreviewData : resumeData),
    [analysisMode, aiPreviewData, resumeData]
  );

  const fullResumeContentForAnalysis = useMemo(
    () => generateFullResumeContent(resumeDataForAnalysis),
    [resumeDataForAnalysis]
  );

  // Load saved data on mount or when params change
  useEffect(() => {
    const urlParams = searchParams.toString();

    // If we've already loaded this exact URL and we're not in "initial load" mode, skip
    if (!isInitialLoad && lastLoadedRef.current === urlParams) return;

    const loadData = async () => {
      const resumeId = searchParams.get('id');
      const templateId = searchParams.get('template');
      const imported = searchParams.get('imported') === '1';
      const template = templateId ? getTemplateById(templateId) : undefined;

      const applyDesign = (data: ResumeData) => {
        const normalized = normalizeResumeTemplateIds(data);
        const design = template ? { ...template.design } : { ...(normalized.design || DEFAULT_DESIGN) };

        // Auto-migration: If margins are at the old wide defaults, tighten them
        if (design.spacing.marginLR === 21) design.spacing.marginLR = 14;
        if (design.spacing.marginTB === 21) design.spacing.marginTB = 18;

        return {
          ...normalized,
          design
        };
      };

      // Imported local resume should win over DB "last resume" selection.
      if (imported) {
        const localData = loadResumeData(templateId || undefined) || loadResumeData();
        if (localData) {
          setResumeData(applyDesign(localData));
          lastLoadedRef.current = urlParams;
          setInitialLoad(false);
          return;
        }
      }

      // Try loading from MongoDB first
      const dbData = await loadResumeDataFromDB(templateId || undefined, resumeId || undefined);
      if (dbData) {
        setResumeData(applyDesign(dbData));
      } else if (template) {
        // No saved resume: apply template design to default state
        updateDesign(template.design);
      }

      lastLoadedRef.current = urlParams;
      setInitialLoad(false);
    };

    loadData();
  }, [searchParams, isInitialLoad, setResumeData, updateDesign, setInitialLoad]);

  // Reset isInitialLoad when leaving the builder to ensure next visit re-triggers load
  useEffect(() => {
    return () => {
      setInitialLoad(true);
      lastLoadedRef.current = null;
    };
  }, [setInitialLoad]);

  // Auto-switch to AI analysis mode when AI preview data is available
  useEffect(() => {
    if (aiPreviewData && currentView === 'ats') {
      setAnalysisMode('ai');
    }
  }, [aiPreviewData, currentView]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && resumeData.personalInfo.fullName && isValidEmail(resumeData.personalInfo.email)) {
      const timeoutId = setTimeout(() => {
        // Include selectedSections in auto-save
        const dataToSave = { ...resumeData, selectedSections };
        saveResumeData(dataToSave);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [resumeData, autoSave]); // Simplified dependencies since selectedSections is now part of resumeData

  const handleSave = () => {
    saveResumeData(resumeData);
    setIsSaved(true);
    const button = document.getElementById('save-button');
    if (button) {
      button.textContent = 'Saved!';
      setTimeout(() => {
        button.textContent = 'Save';
      }, 1500);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
      router.refresh();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed');
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      const templateId = searchParams.get('template');
      clearResumeData(templateId || undefined);
      setResumeData({
        personalInfo: {
          fullName: '',
          email: '',
          phone: '',
          location: '',
          linkedIn: '',
          website: '',
          summary: '',
          yearsOfExperience: 0
        },
        experience: [],
        education: [],
        skills: [],
        jobTitle: '',
        jobDescription: '',
        jobTarget: {
          position: '',
          company: '',
          description: ''
        },
        design: DEFAULT_DESIGN
      });
      setGeneratedContent('');
    }
  };

  const handleAddSection = (sectionId: string) => {
    if (!selectedSections.includes(sectionId) && sectionId !== 'personalInfo') {
      const newSections = [...selectedSections, sectionId];
      setSelectedSections(newSections);
      // Save to resume data
      setResumeData({ ...resumeData, selectedSections: newSections });
    }
  };

  const handleRemoveSection = (sectionId: string) => {
    if (sectionId !== 'personalInfo') {
      const newSections = selectedSections.filter(id => id !== sectionId);
      setSelectedSections(newSections);
      // Save to resume data
      setResumeData({ ...resumeData, selectedSections: newSections });
    }
  };

  const handleToggleSection = (sectionId: string) => {
    if (sectionId === 'personalInfo') return;

    let newSections: string[];
    if (selectedSections.includes(sectionId)) {
      newSections = selectedSections.filter(id => id !== sectionId);
    } else {
      newSections = [...selectedSections, sectionId];
    }
    setSelectedSections(newSections);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {!dockOpen && (
        <div className="fixed bottom-6 right-8 z-50">
          <Button
            variant="default"
            size="lg"
            className="rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold px-6 py-3 hover:from-pink-400 hover:to-purple-500 transition-colors duration-300"
            onClick={() => setDockOpen(true)}
          >
            Resume Menu
          </Button>
        </div>
      )}

      <BottomDockPanel isOpen={dockOpen} onClose={() => setDockOpen(false)}>
        <div className="flex flex-row justify-center items-center gap-6 w-full px-2 py-2 bg-white/40 rounded-2xl shadow-md overflow-x-auto no-scrollbar">
          <Button
            variant={currentView === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('preview')}
            className={`flex flex-col items-center justify-center shrink-0 h-20 w-32 rounded-2xl font-semibold text-base transition-all duration-300 shadow-sm ${currentView === 'preview' ? 'bg-gradient-to-r from-orange-400 to-yellow-300 text-white shadow-xl ring-2 ring-orange-400 transform scale-105' : 'bg-white/0 text-foreground hover:bg-white/30 hover:scale-102'}`}
          >
            <FileText className="h-5 w-5 mb-1" />
            <span className="text-[11px] font-bold uppercase tracking-tight">Content</span>
          </Button>

          <Button
            variant={currentView === 'customize' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('customize')}
            className={`flex flex-col items-center justify-center shrink-0 h-20 w-32 rounded-2xl font-semibold text-base transition-all duration-300 shadow-sm ${currentView === 'customize' ? 'bg-gradient-to-r from-emerald-400 to-teal-300 text-white shadow-xl ring-2 ring-emerald-400 transform scale-105' : 'bg-white/0 text-foreground hover:bg-white/30 hover:scale-102'}`}
          >
            <Palette className="h-5 w-5 mb-1" />
            <span className="text-[11px] font-bold uppercase tracking-tight">Custom Design</span>
          </Button>

          <Button
            variant={currentView === 'aiPreview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('aiPreview')}
            className={`flex flex-col items-center justify-center shrink-0 h-20 w-32 rounded-2xl font-semibold text-base transition-all duration-300 shadow-sm ${currentView === 'aiPreview' ? 'bg-[linear-gradient(to_right,#f59e0b,#f97316,#ea580c,#dc2626)] text-white shadow-xl ring-2 ring-orange-400 transform scale-105' : 'bg-white/0 text-foreground hover:bg-white/30 hover:scale-102'}`}
          >
            <Sparkles className="h-5 w-5 mb-1 text-white" />
            <span className="text-[11px] font-bold uppercase tracking-tight">AI Suggestions</span>
          </Button>

          <div className="w-px h-10 bg-slate-200 mx-2 opacity-50" />

          <Button
            variant={currentView === 'ats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('ats')}
            className={`flex flex-col items-center justify-center shrink-0 h-20 w-32 rounded-2xl font-semibold text-base transition-all duration-300 shadow-sm ${currentView === 'ats' ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-xl ring-2 ring-blue-400 transform scale-105' : 'bg-white/0 text-foreground hover:bg-white/30 hover:scale-102'}`}
          >
            <BarChart3 className="h-5 w-5 mb-1" />
            <span className="text-[11px] font-bold uppercase tracking-tight">Analysis</span>
          </Button>

          <Button
            variant={currentView === 'changes' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('changes')}
            className={`relative flex flex-col items-center justify-center shrink-0 h-20 w-32 rounded-2xl font-semibold text-base transition-all duration-300 shadow-sm ${currentView === 'changes' ? 'bg-gradient-to-r from-yellow-400 to-red-400 text-white shadow-xl ring-2 ring-red-400 transform scale-105' : 'bg-white/0 text-foreground hover:bg-white/30 hover:scale-102'}`}
          >
            <Settings className="h-5 w-5 mb-1" />
            <span className="text-[11px] font-bold uppercase tracking-tight">Changes</span>
            {changesSummary && changesSummary.totalChanges > 0 && (
              <div className="absolute top-2 right-4 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center pulse-glow">
                {changesSummary.totalChanges}
              </div>
            )}
          </Button>


        </div>
      </BottomDockPanel>

      <header className="fixed top-0 left-0 right-0 z-50 w-full glass-card border-b border-white/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between w-full">
            {/* Left Side: Overview */}
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" className="rounded-xl flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium px-4 h-11 border border-slate-100/50 hover:bg-slate-50 shadow-sm">
                  <LayoutGrid size={18} className="text-slate-400" />
                  <span className="hidden md:inline">Overview</span>
                </Button>
              </Link>
            </div>

            {/* Center Navigation: Content, Customize, AI Tools */}
            <div className="flex items-center space-x-1.5 bg-slate-100/40 p-1.5 rounded-2xl border border-slate-200/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('preview')}
                className={cn(
                  "flex items-center gap-2 px-6 h-11 rounded-xl font-bold transition-all",
                  currentView === 'preview'
                    ? "bg-white text-orange-500 shadow-sm ring-1 ring-orange-100"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                <FileText size={18} className={currentView === 'preview' ? "text-orange-500" : "text-orange-400/70"} />
                <span className="hidden sm:inline">Content</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('customize')}
                className={cn(
                  "flex items-center gap-2 px-6 h-11 rounded-xl font-bold transition-all",
                  currentView === 'customize'
                    ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-100"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                <Palette size={18} className={currentView === 'customize' ? "text-slate-800" : "text-slate-400"} />
                <span className="hidden sm:inline">Customize</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('aiPreview')}
                className={cn(
                  "flex items-center gap-2 px-6 h-11 rounded-xl font-bold transition-all",
                  currentView === 'aiPreview'
                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                <Sparkles size={18} className={currentView === 'aiPreview' ? "text-indigo-600" : "text-indigo-400/70"} />
                <span className="hidden sm:inline">AI Tools</span>
              </Button>
            </div>

            {/* Right Side: Save, Generate AI, Download, Logout (logout last) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSave}
                  className="rounded-xl flex items-center gap-2 text-slate-700 font-semibold px-4 hover:bg-slate-50 border border-slate-100 transition-all"
                >
                  <Save size={18} className="text-slate-400" />
                  <span>Save</span>
                </Button>

                <Button
                  variant="default"
                  onClick={handleAIGenerate}
                  disabled={isGeneratingAI}
                  className="bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#dc2626] hover:scale-105 active:scale-95 text-white font-bold h-11 px-8 rounded-full flex items-center gap-2 shadow-[0_8px_16px_-6px_rgba(234,88,12,0.5)] hover:shadow-[0_12px_24px_-8px_rgba(234,88,12,0.6)] transition-all duration-300 border-none group"
                >
                  {isGeneratingAI ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                  )}
                  <span className="tracking-tight">Generate AI</span>
                </Button>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={handleNavbarDownload}
                disabled={isDownloading}
                className="bg-[#1e1b4b] hover:bg-[#1a173d] text-white font-bold h-11 px-4 sm:px-6 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all shrink-0"
              >
                {isDownloading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="hidden sm:inline">Downloading...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Download</span>
                    <Download size={18} className="text-white sm:ml-0" />
                  </>
                )}
              </Button>

              <div className="hidden md:flex">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="rounded-xl flex items-center gap-2 text-slate-700 font-semibold px-4 hover:bg-slate-50 border border-slate-100 transition-all"
                >
                  <LogOut size={18} className="text-slate-400" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-t border-white/20 glass-card"
              >
                <div className="container mx-auto px-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'preview', icon: Eye, label: 'Preview' },
                      { id: 'ats', icon: BarChart3, label: 'Analysis' },
                      { id: 'changes', icon: Settings, label: 'Changes' }
                    ].map((tab) => (
                      <Button
                        key={tab.id}
                        variant={currentView === tab.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setCurrentView(tab.id as typeof currentView);
                          setMobileMenuOpen(false);
                        }}
                        className={`justify-start rounded-xl ${currentView === tab.id
                          ? 'gradient-primary text-white'
                          : 'glass-button text-foreground'
                          }`}
                      >
                        <tab.icon className="h-4 w-4 mr-2" />
                        {tab.label}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const dataWithCurrentDesign = { ...atsOptimizedResume, design: resumeData.design };
                        setAiPreviewData(dataWithCurrentDesign);
                        setGeneratedContent(atsOptimizedResume.personalInfo.summary);
                        if (resumeData) {
                          const changes = trackResumeChanges(resumeData, dataWithCurrentDesign);
                          setChangesSummary(changes);
                          if (changes.totalChanges > 0) setCurrentView('changes');
                        }
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start glass-button rounded-xl"
                    >
                      Load ATS Demo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const dataWithCurrentDesign = { ...lastAIResponseResume, design: resumeData.design };
                        setAiPreviewData(dataWithCurrentDesign);
                        setGeneratedContent(lastAIResponseResume.personalInfo.summary);
                        if (resumeData) {
                          const changes = trackResumeChanges(resumeData, dataWithCurrentDesign);
                          setChangesSummary(changes);
                          if (changes.totalChanges > 0) setCurrentView('changes');
                        }
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start glass-button rounded-xl"
                    >
                      Load Last AI Response
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main id="main-content" className="w-full px-0 pb-4 pt-20">
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 w-full mx-0">
            <div className="lg:col-span-5 flex flex-col flex-1 min-w-0">
              {/* Sticky must NOT be on motion.* — transforms break position:sticky */}
              <div className="sticky top-16 z-20 self-start w-full max-h-[calc(100vh-4rem)] flex flex-col">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  <Card className="glass-card border-0 shadow-2xl card-hover-glow flex flex-col flex-1 min-h-0 overflow-hidden">
                    <CardHeader className="shrink-0 pb-2 border-b border-white/10">
                      <CardTitle className="flex items-center space-x-3">
                        <div className="gradient-primary p-2 rounded-xl">
                          <Settings className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <span className="gradient-text text-lg font-semibold">Resume Information</span>
                          <p className="text-sm text-muted-foreground font-normal">Build your professional resume</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
                      {currentView === 'customize' ? (
                        <CustomizeForm onAddSections={() => setAddSectionsModalOpen(true)} />
                      ) : (
                        <ResumeForm
                          selectedSections={selectedSections}
                          onOpenSectionsModal={() => setAddSectionsModalOpen(true)}
                          onSectionsOrderChange={setSelectedSections}
                        />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
            <div className="lg:col-span-7 flex flex-col flex-1 min-w-0">
              {/* Sticky preview in split view: stays under the header; inner scroll if resume is taller than viewport */}
              <div className="w-full lg:sticky lg:top-16 lg:z-10 lg:self-start">
                <div className="lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:overscroll-y-contain lg:pb-4 [scrollbar-gutter:stable]">
              <AnimatePresence mode="wait">
                {previewVisible && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    <AnimatePresence mode="wait">
                      {(currentView === 'preview' || currentView === 'customize') && (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="flex justify-center items-start w-full min-h-[297mm]"
                        >
                          <ResumePreview
                            ref={resumePreviewRef}
                            data={resumeData}
                            selectedSections={selectedSections}
                            generatedContent={generatedContent}
                            className="a4-resume-content"
                            onToggleSection={handleToggleSection}
                            isSaved={isSaved}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                          />
                        </motion.div>
                      )}

                      {currentView === 'aiPreview' && (
                        <motion.div
                          key="aiPreview"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card className="mb-4">
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <span>AI Preview</span>
                                <div className="space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (aiPreviewData) {
                                        setResumeData({ ...aiPreviewData, design: resumeData.design });
                                        setAiPreviewData(null);
                                        const changes = trackResumeChanges(resumeData, aiPreviewData);
                                        setChangesSummary(changes);
                                        setCurrentView('preview');
                                      }
                                    }}
                                  >
                                    Apply AI Suggestions
                                  </Button>
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {aiPreviewData ? (
                                <ResumePreview data={aiPreviewData} selectedSections={selectedSections} generatedContent={generatedContent} onToggleSection={handleToggleSection} />
                              ) : (
                                <div className="text-sm text-slate-500">No AI preview available. Generate content to see suggestions.</div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}

                      {currentView === 'ats' && (
                        <motion.div
                          key="ats"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-6"
                        >
                          {(!resumeData.personalInfo.fullName || resumeData.personalInfo.fullName.length < 3) && (
                            <FeatureShowcase />
                          )}

                          {(resumeData.personalInfo.fullName && aiPreviewData) && (
                            <Card className="bg-blue-50 border-blue-200">
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-blue-800">
                                    Analyze Resume Version:
                                  </span>
                                  <div className="flex gap-2">
                                    <Button
                                      variant={analysisMode === 'manual' ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setAnalysisMode('manual')}
                                    >
                                      Manual Resume
                                    </Button>
                                    <Button
                                      variant={analysisMode === 'ai' ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setAnalysisMode('ai')}
                                    >
                                      AI Generated
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          <AIResumeChecker
                            resumeData={resumeDataForAnalysis}
                            resumeContent={fullResumeContentForAnalysis}
                            analysisMode={analysisMode}
                          />
                        </motion.div>
                      )}

                      {currentView === 'changes' && (
                        <motion.div
                          key="changes"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChangesVisualization
                            changes={changesSummary}
                            originalData={resumeData}
                            enhancedData={resumeData}
                            visible={true}
                            onToggleVisibility={() => { }}
                          />
                        </motion.div>
                      )}

                      {currentView === 'export' && (
                        <motion.div
                          key="export"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-6"
                        >
                          <ExportButtons
                            resumeData={resumeData}
                            resumeContent={generatedContent || resumeData.personalInfo.summary}
                          />

                          <Card className="border border-slate-200/60 bg-white/60 backdrop-blur-sm">
                            <CardHeader>
                              <CardTitle className="text-sm">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSave}
                                className="w-full justify-start"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Save Current Progress
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClear}
                                className="w-full justify-start text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Clear All Data
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        )}
        {viewMode === 'info' && (
          <div className="w-full px-4">
            {/* Toolbar + card header stay visible; only form scrolls (sticky stack below fixed site header) */}
            <div className="sticky top-16 z-20 mx-auto max-w-6xl flex flex-col max-h-[calc(100vh-4rem)]">
              <div className="shrink-0 flex justify-center pb-3 pt-1">
                <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl shadow-lg border border-white/20">
                  <Button
                    variant={viewMode === 'info' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      "h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-tight gap-2 transition-all",
                      viewMode === 'info' ? "bg-white shadow-md ring-1 ring-slate-200 text-orange-500" : "text-slate-500"
                    )}
                    onClick={() => setViewMode('info')}
                  >
                    <Type className="h-4 w-4" />
                    <span>Content</span>
                  </Button>
                  <Button
                    variant={viewModeForToolbar === 'split' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      "h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-tight gap-2 transition-all text-slate-500"
                    )}
                    onClick={() => setViewMode('split')}
                  >
                    <Columns2 className="h-4 w-4" />
                    <span>Split View</span>
                  </Button>
                  <Button
                    variant={viewModeForToolbar === 'preview' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      "h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-tight gap-2 transition-all text-slate-500"
                    )}
                    onClick={() => setViewMode('preview')}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview</span>
                  </Button>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="min-h-0 flex-1 flex flex-col"
              >
                <Card className="glass-card border-0 shadow-2xl card-hover-glow flex flex-col flex-1 min-h-0 overflow-hidden">
                  <CardHeader className="shrink-0 pb-2 border-b border-white/10">
                    <CardTitle className="flex items-center space-x-3">
                      <div className="gradient-primary p-2 rounded-xl">
                        <Settings className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="gradient-text text-lg font-semibold">Resume Information</span>
                        <p className="text-sm text-muted-foreground font-normal">Build your professional resume</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
                    {currentView === 'customize' ? (
                      <CustomizeForm onAddSections={() => setAddSectionsModalOpen(true)} />
                    ) : (
                      <ResumeForm
                        selectedSections={selectedSections}
                        onOpenSectionsModal={() => setAddSectionsModalOpen(true)}
                        onSectionsOrderChange={setSelectedSections}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
        {viewMode === 'preview' && (
          <div className="w-full flex justify-center py-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-full flex justify-center"
            >
              <ResumePreview
                ref={resumePreviewRef}
                selectedSections={selectedSections}
                generatedContent={generatedContent}
                onToggleSection={handleToggleSection}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </motion.div>
          </div>
        )}
      </main>

      <AddSectionsModal
        isOpen={addSectionsModalOpen}
        onClose={() => setAddSectionsModalOpen(false)}
        selectedSections={selectedSections}
        onAddSection={handleAddSection}
        onRemoveSection={handleRemoveSection}
      />
    </div >
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-orange-50/30">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BuilderPageContent />
    </Suspense>
  );
}
