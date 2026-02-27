"use client";

import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  ExternalLink,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Briefcase,
  GraduationCap,
  Lightbulb,
  Trophy,
  Users,
  FileCheck,
  Languages,
  Compass,
  Award,
  BookOpen,
  UserCheck,
  Send,
  Info,
  Brain,
  FileText,
  BadgeCheck,
  LayoutGrid,
  Columns2,
  Type,
  Eye,
  Calendar,
  Shield,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResumeData } from '@/lib/types';
import { cn, formatDate, loadGoogleFont, loadAllGoogleFonts, getGoogleFontUrl, decodeHtml } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { extractProfessionalSummary } from '@/lib/resume-parser';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_DESIGN } from '@/lib/defaults';
import { flattenResumeData, distributeBlocksByLayout, ResumeBlock } from '@/lib/resume-layout-utils';
import { useResumePagination } from '@/hooks/useResumePagination';
import { ResumePage } from '@/components/ResumePage';

import { useResumeStore } from '@/store/useResumeStore';
import { useAuth } from '@/contexts/AuthContext';

export interface ResumePreviewHandle {
  handleDownloadPDF: () => Promise<void>;
  isDownloading: boolean;
}

interface ResumePreviewProps {
  data?: ResumeData; // Optional override for AI preview
  selectedSections?: string[];
  generatedContent?: string;
  className?: string;
  onToggleSection?: (sectionId: string) => void;
  isSaved?: boolean;
  viewMode?: 'split' | 'info' | 'preview';
  onViewModeChange?: (mode: 'split' | 'info' | 'preview') => void;
  showControls?: boolean;
}

const ResumePreview = forwardRef<ResumePreviewHandle, ResumePreviewProps>(({
  data: propData,
  selectedSections = [],
  generatedContent,
  className,
  onToggleSection,
  isSaved = true,
  viewMode = 'split',
  onViewModeChange,
  showControls = true
}, ref) => {
  const { data: storeData } = useResumeStore();
  const data = propData || storeData;
  const { isAuthenticated } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(showControls ? 0.8 : 1); // Default zoom 1 if no controls
  const previewRef = useRef<HTMLDivElement>(null);

  // Expose download function to parent via ref
  useImperativeHandle(ref, () => ({
    handleDownloadPDF,
    isDownloading,
  }));

  const design = data.design || DEFAULT_DESIGN;

  useEffect(() => {
    setIsClient(true);
    loadAllGoogleFonts();
  }, []);

  useEffect(() => {
    if (design?.typography?.fontFamily) {
      loadGoogleFont(design.typography.fontFamily);
    }
  }, [design?.typography?.fontFamily]);

  // --- Design Helpers ---
  const getDesignStyles = () => {
    const { spacing, colors, typography, personalDetails } = design;
    return {
      '--resume-font-size': `${spacing.fontSize}pt`,
      '--resume-line-height': spacing.lineHeight,
      '--resume-margin-lr': `${spacing.marginLR}mm`,
      '--resume-margin-tb': `${spacing.marginTB}mm`,
      '--resume-entry-spacing': `${spacing.entrySpacing}px`,
      '--resume-accent-color': colors.accent,
      '--resume-text-color': colors.text,
      '--resume-font-family': typography.fontFamily,
      '--resume-heading-size': typography.headings.size === 's' ? '0.9rem' : typography.headings.size === 'm' ? '1.1rem' : typography.headings.size === 'l' ? '1.3rem' : '1.5rem',
      '--resume-name-size': personalDetails.nameSize === 'xs' ? '1.5rem' : personalDetails.nameSize === 's' ? '2rem' : personalDetails.nameSize === 'm' ? '2.5rem' : personalDetails.nameSize === 'l' ? '3rem' : '3.5rem',
      '--resume-name-font-weight': personalDetails.nameBold ? '800' : '400',
    } as React.CSSProperties;
  };

  const pageDimensions = useMemo(() => {
    return design.languageRegion.pageFormat === 'A4'
      ? { width: 794, height: 1123, name: 'A4' } // 210mm x 297mm at 96 DPI
      : { width: 816, height: 1056, name: 'Letter' }; // 8.5in x 11in at 96 DPI
    // Note: We use pixels for internal calculation relative to 96dpi usually, 
    // but styling uses mm. ResizeObserver returns pixels.
  }, [design.languageRegion.pageFormat]);

  // --- PDF Generation Logic (Asynchronous) ---
  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;

    // Check authentication before attempting download
    if (!isAuthenticated) {
      alert('Please sign in to download your resume.');
      return;
    }

    try {
      setIsDownloading(true);

      // 1. Get the HTML content from the single source of truth
      const element = document.getElementById("resume-preview");
      if (!element) throw new Error('Resume preview element not found');
      const content = element.outerHTML;

      // 2. Get the styles (Optimized)
      const activeFontUrl = getGoogleFontUrl(design.typography.fontFamily);
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .filter(el => {
          if (el.tagName.toLowerCase() === 'link') {
            const href = el.getAttribute('href');
            if (href && href.includes('fonts.googleapis.com')) {
              // Only include the active font's stylesheet
              return activeFontUrl && href.includes(activeFontUrl.split('?')[0]);
            }
          }
          return true;
        })
        .map(el => {
          if (el.tagName.toLowerCase() === 'link') {
            const href = el.getAttribute('href');
            if (href && href.startsWith('/')) {
              return el.outerHTML.replace(href, `${window.location.origin}${href}`);
            }
          }
          return el.outerHTML;
        })
        .join('');

      // Add the active font explicitly if it's not already in the filtered styles
      const finalStyles = activeFontUrl && !styles.includes(activeFontUrl)
        ? `<link rel="stylesheet" href="${activeFontUrl}">${styles}`
        : styles;

      // 3. Serialize CSS variables from design
      const designStyles = getDesignStyles() as Record<string, string>;
      const cssVariables = Object.entries(designStyles)
        .map(([key, value]) => `${key}: ${value}`)
        .join(';');

      // 4. Construct full HTML snapshot (using finalStyles)
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${finalStyles}<style>body{background:white;margin:0;padding:0;width:794px;min-height:100vh}#resume-preview{width:100% !important;margin:0 !important;padding:0 !important;transform:none !important;box-shadow:none !important}.resume-page{transform:none !important;box-shadow:none !important;margin:0 !important;padding:var(--resume-margin-tb) var(--resume-margin-lr) !important;display:flex !important;flex-direction:column !important;page-break-after:always !important;break-after:page !important}${cssVariables ? `:root{${cssVariables}}` : ''}</style></head><body>${content}</body></html>`.trim();

      // 5. Submit job to queue
      const response = await apiClient('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          fileName: `Resume_${data.personalInfo.fullName?.replace(/\s+/g, '_') || 'Draft'}.pdf`,
          options: { format: design.languageRegion.pageFormat }
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in to download your resume.');
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'PDF generation failed');
      }
      const initialData = await response.json();

      let statusData = initialData;
      let completed = initialData.state === 'completed';

      // 6. Poll for completion if not already completed (Redis fallback case)
      if (!completed) {
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max poll
        const jobId = initialData.jobId;
        if (!jobId) throw new Error('No Job ID received');

        while (!completed && attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));

          const statusRes = await apiClient(`/api/export-pdf?jobId=${jobId}`);
          if (!statusRes.ok) throw new Error('Status check failed');

          statusData = await statusRes.json();
          if (statusData.state === 'completed') {
            completed = true;
          } else if (statusData.state === 'failed') {
            throw new Error('PDF generation failed in worker');
          }
        }
      }

      if (!completed) throw new Error('PDF generation timed out');

      // 7. Download the result (base64)
      const { base64, fileName: resultFileName } = statusData.result;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resultFileName || 'resume.pdf';
      link.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // --- Flatten Data & Distribute ---
  const blocks = useMemo(() => flattenResumeData(data, selectedSections), [data, selectedSections]);

  const { main: mainBlocks, sidebar: sidebarBlocks } = useMemo(
    () => distributeBlocksByLayout(blocks, design.layout),
    [blocks, design.layout]
  );

  const isTwoColumn = design.layout.columns === 'two' || design.layout.columns === 'mix';
  const sidebarFirst = design.layout.headerPosition === 'left';
  const leftPct = design.layout.columnWidths.left;
  const rightPct = design.layout.columnWidths.right;

  // --- Render Block Helper ---
  const renderBlock = (block: ResumeBlock, isFirstOnPage: boolean = false) => {
    const { sectionSettings } = design;

    // Helper for icons
    const renderSectionIcon = (icon: React.ReactNode) => {
      const { headings } = design.typography;
      const isFilled = headings.icons === 'filled';
      const isOutline = headings.icons === 'outline';

      if (headings.icons === 'none') return null;

      return (
        <span className={cn(
          "p-1 rounded flex items-center justify-center mr-2",
          isFilled ? "text-white" : "border",
        )} style={{
          backgroundColor: isFilled ? design.colors.accent : 'transparent',
          borderColor: isOutline ? design.colors.accent : 'transparent',
          color: isFilled ? 'white' : design.colors.accent,
          width: '1.5em', height: '1.5em'
        }}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: "w-3 h-3" })}
        </span>
      );
    };

    const SectionTitle = ({ children, icon }: { children: React.ReactNode, icon?: React.ReactNode }) => (
      <h2 className={cn(
        "font-bold uppercase tracking-widest border-b pb-1 mb-3 transition-colors flex items-center group",
        !isFirstOnPage ? "mt-4" : "mt-0",
        design.typography.headings.capitalization === 'none' && "normal-case",
        design.typography.headings.capitalization === 'capitalize' && "capitalize",
        design.typography.headings.capitalization === 'uppercase' && "uppercase"
      )}
        style={{
          color: design.colors.accent,
          borderColor: `${design.colors.accent}40`,
        }}>
        {icon && renderSectionIcon(icon)}
        <span className="flex-1">
          {typeof children === 'string' ? (
            <span dangerouslySetInnerHTML={{ __html: decodeHtml(children) }} />
          ) : (
            children
          )}
        </span>
      </h2>
    );

    const BannerSectionTitle = ({ children, icon }: { children: React.ReactNode, icon?: React.ReactNode }) => {
      const isEliteNavy = design.templateId === 'elite-navy';
      return (
        <h2 className={cn(
          "font-extrabold uppercase tracking-[0.2em] flex items-center justify-center group mb-0.5 px-4 py-1.5 transition-all rounded-sm",
          !isFirstOnPage ? "mt-1.5" : "mt-0",
          design.typography.headings.capitalization === 'none' && "normal-case",
          design.typography.headings.capitalization === 'capitalize' && "capitalize",
          design.typography.headings.capitalization === 'uppercase' && "uppercase",
          isEliteNavy ? "bg-[#f1f5f9] text-[#1e293b]" : "bg-slate-50 text-slate-900 border-y border-slate-100/50"
        )}
          style={{
            fontSize: 'var(--resume-heading-size)',
          }}>
          {icon && (
            <span className="mr-3 opacity-100 flex items-center">
              {React.cloneElement(icon as React.ReactElement<any>, {
                size: 14,
                strokeWidth: 2.8,
                className: "text-[#1e293b]"
              })}
            </span>
          )}
          <span className="flex-none">
            {typeof children === 'string' ? (
              <span dangerouslySetInnerHTML={{ __html: decodeHtml(children) }} />
            ) : (
              children
            )}
          </span>
        </h2>
      );
    };

    switch (block.type) {
      case 'header':
        return <PersonalInfoModule data={data} design={design} isSaved={isSaved} />;

      case 'section-title':
        let icon: React.ReactNode = null;
        switch (block.sectionId) {
          case 'summary': icon = <FileText />; break;
          case 'experience': icon = <Briefcase />; break;
          case 'education': icon = <GraduationCap />; break;
          case 'skills': icon = <Brain />; break;
          case 'softSkills': icon = <Users />; break;
          case 'projects': icon = <Compass />; break;
          case 'certificates': icon = <BadgeCheck />; break;
          case 'languages': icon = <Languages />; break;
          case 'interests': icon = <LayoutGrid />; break;
          case 'awards': icon = <Trophy />; break;
          case 'organisations': icon = <Users />; break;
          case 'publications': icon = <BookOpen />; break;
          case 'references': icon = <UserCheck />; break;
          case 'declaration': icon = <Send />; break;
          case 'custom': icon = <Info />; break;
        }
        if (design.typography.headings.style === 'banner') {
          return <BannerSectionTitle icon={icon}>{block.content}</BannerSectionTitle>;
        }
        return <SectionTitle icon={icon}>{block.content}</SectionTitle>;

      case 'section-item':
        if (block.sectionId === 'summary') {
          return (
            <div
              className="text-justify relative pl-0 prose prose-slate max-w-none [&_p]:m-0"
              style={{
                fontSize: 'var(--resume-font-size)',
                lineHeight: 'var(--resume-line-height)',
                color: '#1e293b',
                opacity: 1,
                marginBottom: '0px'
              }}
              dangerouslySetInnerHTML={{ __html: decodeHtml(block.content) }}
            />
          );
        }
        if (block.sectionId === 'experience') {
          const exp = block.content;
          const { order } = sectionSettings.workExperience;
          const renderType = exp._renderType; // 'header' | 'description' | 'bullet' | undefined

          // If it's a bullet point item
          if (renderType === 'bullet') {
            return (
              <div
                className="resume-item"
                style={{
                  marginBottom: 0, // Tight spacing for bullets
                  marginTop: 0
                }}
              >
                <div className="flex items-start">
                  <div className="w-4 flex justify-center shrink-0 opacity-70 relative top-[0.3em] text-[10px]">●</div>
                  <div
                    className="prose prose-slate max-w-none [&_p]:m-0"
                    style={{ fontSize: 'var(--resume-font-size)', flex: 1, lineHeight: 'var(--resume-line-height)', color: '#1e293b' }}
                    dangerouslySetInnerHTML={{ __html: decodeHtml(exp.description) }}
                  />
                </div>
              </div>
            )
          }

          // If it's a legacy description-only block (fallback)
          if (renderType === 'description') {
            return (
              <div
                className="resume-item"
                style={{
                  marginBottom: '2px', // Tight spacing for chunks
                  marginTop: 0
                }}
              >
                {exp.description && (
                  <div
                    className="prose prose-slate max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_p]:m-0"
                    style={{ fontSize: 'calc(var(--resume-font-size) - 1pt)', lineHeight: 1.4 }}
                    dangerouslySetInnerHTML={{ __html: decodeHtml(exp.description) }}
                  />
                )}
              </div>
            );
          }

          // Header or Full Block
          return (
            <div className="resume-item" style={{ marginBottom: renderType === 'header' ? '1px' : 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-baseline mb-0.5">
                <div className="flex flex-col flex-1 gap-0.5">
                  <h3 className="font-bold tracking-tight text-slate-900" style={{ fontSize: 'var(--resume-font-size)', lineHeight: 1.3 }}>
                    <span dangerouslySetInnerHTML={{ __html: decodeHtml(order === 'title-employer' ? exp.position : exp.company) }} />
                  </h3>
                  <div className="font-bold leading-tight flex items-center gap-2"
                    style={{ color: design.colors.accent, fontSize: 'var(--resume-font-size)' }}>
                    <span dangerouslySetInnerHTML={{ __html: decodeHtml(order === 'title-employer' ? exp.company : exp.position) }} />
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                  <span className="font-bold text-slate-600 uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)' }}>
                    {formatDate(exp.startDate)} – {exp.current ? 'Present' : formatDate(exp.endDate)}
                  </span>
                  {exp.location && (
                    <span className="text-slate-400 font-medium italic" style={{ fontSize: 'var(--resume-font-size)' }}>{exp.location}</span>
                  )}
                </div>
              </div>

              {/* Render description here ONLY if type is undefined (legacy behavior) */}
              {!renderType && exp.description && (
                <div
                  className="mt-3 prose prose-slate max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_p]:leading-[1.6]"
                  style={{ fontSize: 'calc(var(--resume-font-size) - 0.5pt)', color: '#1e293b' }}
                  dangerouslySetInnerHTML={{ __html: decodeHtml(exp.description) }}
                />
              )}
            </div>
          );
        }
        if (block.sectionId === 'education') {
          const edu = block.content;
          return (
            <div className="resume-item" style={{ marginBottom: 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-baseline mb-0.5">
                <div className="flex flex-col flex-1 gap-0.5">
                  <h3 className="font-bold text-slate-900" style={{ fontSize: 'var(--resume-font-size)', lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(edu.institution) }} />
                  <div className="font-bold leading-tight" style={{ color: design.colors.accent, fontSize: 'var(--resume-font-size)' }}>
                    {edu.degree && edu.field && (
                      <span className="italic"><span dangerouslySetInnerHTML={{ __html: decodeHtml(edu.degree) }} /> in <span dangerouslySetInnerHTML={{ __html: decodeHtml(edu.field) }} /></span>
                    )}
                    {edu.degree && !edu.field && (
                      <span className="italic" dangerouslySetInnerHTML={{ __html: decodeHtml(edu.degree) }} />
                    )}
                    {!edu.degree && edu.field && (
                      <span className="italic" dangerouslySetInnerHTML={{ __html: decodeHtml(edu.field) }} />
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                  <span className="font-bold text-slate-600 uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)' }}>
                    {edu.startYear || ''} {edu.startYear && edu.endYear ? '–' : ''} {edu.endYear || ''}
                  </span>
                  {edu.gpa && <span className="text-slate-400 font-bold" style={{ fontSize: 'var(--resume-font-size)' }}>GPA: {edu.gpa}</span>}
                </div>
              </div>
            </div>
          );
        }
        if (block.sectionId === 'projects') {
          const project = block.content;
          const renderType = project._renderType;

          if (renderType === 'bullet') {
            return (
              <div
                className="resume-item"
                style={{
                  marginBottom: 0,
                  marginTop: 0
                }}
              >
                <div className="flex items-start">
                  <div className="w-4 flex justify-center shrink-0 opacity-70 relative top-[0.3em] text-[10px]">●</div>
                  <div
                    className="prose prose-slate max-w-none [&_p]:m-0"
                    style={{ fontSize: 'var(--resume-font-size)', flex: 1, lineHeight: 'var(--resume-line-height)', color: '#1e293b' }}
                    dangerouslySetInnerHTML={{ __html: decodeHtml(project.description) }}
                  />
                </div>
              </div>
            )
          }

          if (renderType === 'description') {
            return (
              <div
                className="resume-item"
                style={{
                  marginBottom: '2px',
                  marginTop: 0
                }}
              >
                {project.description && (
                  <div
                    className="prose prose-slate max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_p]:m-0"
                    style={{ fontSize: 'var(--resume-font-size)', lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: decodeHtml(project.description) }}
                  />
                )}
              </div>
            )
          }

          return (
            <div className="resume-item" style={{ marginBottom: renderType === 'header' ? '1px' : 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-baseline mb-0.5">
                <div className="flex flex-col flex-1 gap-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900" style={{ fontSize: 'var(--resume-font-size)', lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(project.title) }} />
                    {project.link && (
                      <a href={project.link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[var(--resume-accent-color)] transition-colors">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  {project.role && (
                    <div className="font-semibold italic text-slate-500" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(project.role) }} />
                  )}
                </div>
                {(project.startDate || project.endDate) && (
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-400 uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)' }}>
                      {project.startDate ? formatDate(project.startDate) : ''} {project.startDate && project.endDate ? '–' : ''} {project.endDate ? formatDate(project.endDate) : ''}
                    </span>
                  </div>
                )}
              </div>

              {!renderType && project.description && (
                <div
                  className="mt-2.5 prose prose-slate max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_p]:leading-relaxed"
                  style={{ fontSize: 'calc(var(--resume-font-size) - 0.5pt)', color: '#1e293b' }}
                  dangerouslySetInnerHTML={{ __html: decodeHtml(project.description) }}
                />
              )}
            </div>
          );
        }
        if (block.sectionId === 'certificates') {
          const cert = block.content;
          return (
            <div className="resume-item break-inside-avoid" style={{ marginBottom: 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-baseline mb-0.5">
                <div className="flex flex-col flex-1">
                  <h3 className="font-bold" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(cert.name) }} />
                  <span className="opacity-60" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(cert.organization) }} />
                </div>
                <span className="font-bold uppercase tracking-tight opacity-60 whitespace-nowrap ml-2" style={{ fontSize: 'var(--resume-font-size)' }}>
                  {formatDate(cert.issueDate)}
                </span>
              </div>
            </div>
          );
        }

        if (block.sectionId === 'awards') {
          const award = block.content;
          return (
            <div className="resume-item break-inside-avoid flex justify-between items-baseline mb-2">
              <div className="flex flex-col">
                <span className="font-bold" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(award.title) }} />
                <span className="opacity-60" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(award.organization) }} />
              </div>
              <span className="font-bold uppercase tracking-tight opacity-60" style={{ fontSize: 'var(--resume-font-size)' }}>{formatDate(award.date)}</span>
            </div>
          );
        }

        if (block.sectionId === 'courses') {
          const course = block.content;
          return (
            <div className="resume-item break-inside-avoid shadow-sm border border-slate-50 p-3 rounded-xl mb-4 bg-white/50">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-slate-800" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(course.name) }} />
                <span className="text-[10px] font-bold text-slate-400">{formatDate(course.completionDate)}</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mb-2" dangerouslySetInnerHTML={{ __html: decodeHtml(course.provider) }} />
              {course.description && (
                <div
                  className="prose prose-slate max-w-none text-slate-600 leading-relaxed"
                  style={{ fontSize: 'calc(var(--resume-font-size) - 1pt)' }}
                  dangerouslySetInnerHTML={{ __html: decodeHtml(course.description) }}
                />
              )}
            </div>
          );
        }

        if (block.sectionId === 'organisations') {
          const org = block.content;
          return (
            <div className="resume-item break-inside-avoid flex justify-between items-baseline mb-2">
              <div className="flex flex-col">
                <span className="font-bold" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(org.role) }} />
                <span className="opacity-60" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(org.name) }} />
              </div>
              <span className="font-bold uppercase tracking-tight opacity-60 whitespace-nowrap" style={{ fontSize: 'var(--resume-font-size)' }}>
                {formatDate(org.startDate)} – {org.endDate ? formatDate(org.endDate) : 'Present'}
              </span>
            </div>
          );
        }
        if (block.sectionId === 'publications') {
          const pub = block.content;
          return (
            <div className="resume-item break-inside-avoid shadow-sm border border-slate-50 p-2 rounded mb-2">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold italic" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(`"${pub.title}"`) }} />
                <span className="text-[10px] opacity-60">{formatDate(pub.date)}</span>
              </div>
              <div className="text-xs opacity-80" dangerouslySetInnerHTML={{ __html: decodeHtml(pub.publisher) }} />
            </div>
          );
        }

        // Fallback for simple list items or single items
        if (block.sectionId === 'custom') {
          return (
            <div
              className="text-justify prose prose-slate max-w-none"
              style={{ fontSize: 'var(--resume-font-size)' }}
              dangerouslySetInnerHTML={{ __html: decodeHtml(block.content) }}
            />
          )
        }

        return null;

      case 'section-group':
        // Handle skills, languages, etc. which are passed as a group content
        if (block.sectionId === 'skills' || block.sectionId === 'softSkills') {
          const skills = block.content;
          const style = sectionSettings.skills;

          // Special layout for soft skills in jaganraj template
          if (block.sectionId === 'softSkills' && design.templateId === 'jaganraj') {
            return (
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
                {skills.map((skill: any, i: number) => (
                  <div key={i} className="flex flex-col">
                    <span
                      className="font-bold text-[11px] leading-relaxed relative italic opacity-90"
                      dangerouslySetInnerHTML={{ __html: decodeHtml(skill.name) }}
                    />
                  </div>
                ))}
              </div>
            );
          }

          if (style === 'grid') {
            return (
              <div className="grid grid-cols-2 gap-x-10 gap-y-4 mb-6 mt-2">
                {skills.map((skill: any, i: number) => (
                  <div key={i} className="flex flex-col pb-1.5 group">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span
                        className="font-bold text-xs pr-4"
                        dangerouslySetInnerHTML={{ __html: decodeHtml(skill.name) }}
                      />
                      {skill.level && (
                        <span className="text-[9px] opacity-40 font-mono uppercase tracking-widest shrink-0">{skill.level}</span>
                      )}
                    </div>
                    {skill.level && (
                      <div className="h-[3px] w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--resume-accent-color)] opacity-70 rounded-full transition-all duration-500"
                          style={{ width: skill.level === 'expert' ? '100%' : skill.level === 'advanced' ? '80%' : skill.level === 'intermediate' ? '60%' : '40%' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          } else if (style === 'bubble') {
            return (
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.map((skill: any, i: number) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-[var(--resume-accent-color)] text-[var(--resume-accent-color)] bg-[var(--resume-accent-color)]/[0.05]"
                    dangerouslySetInnerHTML={{ __html: decodeHtml(skill.name) }}
                  />
                ))}
              </div>
            )
          }
          // Default compact
          return (
            <div className="flex flex-wrap gap-x-5 gap-y-2.5 mb-1.5">
              {skills.map((skill: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50/50 px-2 py-1 rounded border border-slate-100/50 transition-colors hover:bg-slate-100/50">
                  <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: design.colors.accent, opacity: 0.6 }} />
                  <span
                    className="font-semibold text-slate-700 leading-tight tracking-tight"
                    style={{ fontSize: 'var(--resume-font-size)' }}
                    dangerouslySetInnerHTML={{ __html: decodeHtml(skill.name) }}
                  />
                  {skill.level && (
                    <span className="text-slate-400 font-medium uppercase ml-1 italic" style={{ fontSize: 'calc(var(--resume-font-size) * 0.8)' }}>{skill.level}</span>
                  )}
                </div>
              ))}
            </div>
          );
        }
        if (block.sectionId === 'languages') {
          const languages = block.content;
          return (
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
              {languages.map((lang: any) => (
                <div key={lang.id} className="flex items-center gap-2">
                  <span className="font-bold" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(lang.name) }} />
                  <span className="opacity-50 italic" style={{ fontSize: 'var(--resume-font-size)' }}>{lang.level}</span>
                </div>
              ))}
            </div>
          )
        }
        if (block.sectionId === 'interests') {
          const interestsList = block.content || [];
          return (
            <div className="space-y-2 mb-4">
              <div className="italic opacity-80 flex flex-wrap gap-x-2" style={{ fontSize: 'var(--resume-font-size)' }}>
                {interestsList.map((i: any, idx: number) => (
                  <React.Fragment key={i.id || idx}>
                    <span dangerouslySetInnerHTML={{ __html: decodeHtml(i.name) }} />
                    {idx < interestsList.length - 1 && <span> • </span>}
                  </React.Fragment>
                ))}
              </div>
              {interestsList.some((i: any) => i.description) && (
                <div className="space-y-1">
                  {interestsList.filter((i: any) => i.description).map((i: any) => (
                    <div
                      key={i.id}
                      className="text-xs opacity-70 prose prose-slate max-w-none [&_p]:m-0"
                      dangerouslySetInnerHTML={{ __html: decodeHtml(i.description) }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        }
        if (block.sectionId === 'references') {
          const items = block.content;
          return (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {items.map((ref: any) => (
                <div key={ref.id} className="resume-item opacity-80" style={{ fontSize: 'var(--resume-font-size)' }}>
                  <div className="font-bold" dangerouslySetInnerHTML={{ __html: decodeHtml(ref.name) }} />
                  <div className="italic">
                    <span dangerouslySetInnerHTML={{ __html: decodeHtml(ref.position) }} />, <span dangerouslySetInnerHTML={{ __html: decodeHtml(ref.company) }} />
                  </div>
                  <div>{ref.email} | {ref.phone}</div>
                </div>
              ))}
            </div>
          )
        }
        if (block.sectionId === 'declaration') {
          const dec = block.content;
          return (
            <div className="mb-6 mt-8">
              <div className="border-t pt-4 opacity-70">
                <div className="italic" style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(dec.statement) }} />
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <div className="font-bold uppercase opacity-60" style={{ fontSize: 'var(--resume-font-size)' }}>{dec.place}, {dec.date}</div>
                  </div>
                  <div className="text-right">
                    {dec.signature && <div className="font-mono text-lg">{dec.signature}</div>}
                    <div className="text-[8px] border-t border-slate-300 pt-0.5 w-24 ml-auto text-center">Signature</div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        return null;

      default:
        return null;
    }
  };


  // --- Pagination Hooks ---
  // We paginate main and sidebar independently.
  // The hidden measurement container will ensure they are measured with the correct widths.
  // Add extra bottom margin as safety buffer to prevent overflow and keep sections together

  // Precise conversion factor mm -> px (96 DPI / 25.4 mm/inch)
  const pxPerMm = 3.779527559;

  // Custom margin adjustment for pagination to match the Elite Navy banner behavior
  const isEliteNavy = design.templateId === 'elite-navy';
  const effectiveMarginTB = design.spacing.marginTB * pxPerMm;

  // Calculate total bottom padding (matching ResumePage.tsx)
  const footerBufferPx = 20; // Fixed gap for bottom spacing
  const effectivePaddingBottom = effectiveMarginTB + footerBufferPx + 10; // Safety buffer reduced to 10px

  const { pages: mainPages, measuring: mainMeasuring, containerRef: mainContainerRef } = useResumePagination(mainBlocks, renderBlock, {
    width: pageDimensions.width,
    height: pageDimensions.height,
    marginTop: effectiveMarginTB,
    marginBottom: effectivePaddingBottom,
  });

  const { pages: sidebarPages, measuring: sidebarMeasuring, containerRef: sidebarContainerRef } = useResumePagination(sidebarBlocks, renderBlock, {
    width: pageDimensions.width,
    height: pageDimensions.height,
    marginTop: effectiveMarginTB,
    marginBottom: effectivePaddingBottom,
  });

  const measuring = mainMeasuring || (isTwoColumn && sidebarMeasuring);

  // Combine pages
  // If one column, sidebarPages is empty (or we ignore it).
  // If two column, we pair page i of main with page i of sidebar.
  const totalPages = Math.max(mainPages.length, sidebarPages.length);
  const displayPages = useMemo(() => {
    return Array.from({ length: totalPages }).map((_, i) => ({
      main: mainPages[i] || [],
      sidebar: sidebarPages[i] || []
    }));
  }, [totalPages, mainPages, sidebarPages]);


  // --- Render ---
  return (
    <div className={cn(!showControls ? "w-full h-full flex flex-col items-center justify-start overflow-hidden" : "flex flex-col items-center", className)}>
      {/* Toolbar */}
      {showControls && (
        <div className="w-full max-w-2xl mb-4 flex justify-between items-center bg-white p-2 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono">{Math.round(zoomLevel * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-100">
            <Button
              variant={viewMode === 'info' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                "h-8 px-3 rounded-sm text-[10px] font-bold uppercase tracking-tight gap-1.5 transition-all",
                viewMode === 'info' ? "bg-white shadow-sm ring-1 ring-slate-200 text-slate-900" : "text-slate-500"
              )}
              onClick={() => onViewModeChange?.('info')}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Content</span>
            </Button>
            <Button
              variant={viewMode === 'split' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                "h-8 px-3 rounded-sm text-[10px] font-bold uppercase tracking-tight gap-1.5 transition-all",
                viewMode === 'split' ? "bg-white shadow-sm ring-1 ring-slate-200 text-slate-900" : "text-slate-500"
              )}
              onClick={() => onViewModeChange?.('split')}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Split View</span>
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                "h-8 px-3 rounded-sm text-[10px] font-bold uppercase tracking-tight gap-1.5 transition-all",
                viewMode === 'preview' ? "bg-white shadow-sm ring-1 ring-slate-200 text-slate-900" : "text-slate-500"
              )}
              onClick={() => onViewModeChange?.('preview')}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Preview Area */}
      <div
        ref={previewRef}
        id="resume-preview"
        className="relative transition-all duration-300 ease-in-out print:p-0 print:m-0 flex flex-col gap-0 p-0 m-0"
        style={{
          ...getDesignStyles(),
        }}
      >
        {!isClient || measuring ? (
          <div className="flex flex-col items-center justify-center h-[297mm] w-[210mm] bg-white shadow-sm border animate-pulse">
            <p className="mb-4 text-sm text-slate-400">Formatting Resume...</p>
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <style dangerouslySetInnerHTML={{
              __html: `
              @media print {
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .flex-col.items-center {
                  display: block !important;
                }
                .resume-page {
                  margin: 0 !important;
                  box-shadow: none !important;
                  page-break-after: always !important;
                  break-after: page !important;
                }
                .section {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                .header-container {
                  page-break-inside: avoid !important;
                }
              }
            ` }} />
            {displayPages.map((page, index) => {
              // Determine content for left/right based on header position
              const leftContent = sidebarFirst ? page.sidebar : page.main;
              const rightContent = sidebarFirst ? page.main : page.sidebar;

              return (
                <ResumePage
                  key={index}
                  pageNumber={index + 1}
                  totalNumbers={displayPages.length}
                  scale={zoomLevel}
                  width="794px"
                  height="1123px"
                  style={{
                    marginBottom: !showControls ? '0' : (zoomLevel < 1 ? `calc(${(zoomLevel - 1) * 1123}px + 2rem)` : '2rem'),
                    boxShadow: !showControls ? 'none' : undefined,
                    border: !showControls ? 'none' : undefined,
                    marginRight: !showControls ? '0' : undefined,
                    marginLeft: !showControls ? '0' : undefined,
                  }}
                >
                  {isTwoColumn ? (
                    <div
                      className="grid w-full gap-x-6 min-h-0"
                      style={{
                        gridTemplateColumns: `${leftPct}% ${rightPct}%`
                      }}
                    >
                      <div className="flex flex-col min-w-0">
                        {leftContent.map((block, index) => (
                          <div key={block.id} data-id={block.id} className={cn(
                            block.type === 'header' ? 'header-container' :
                              (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                          )}>
                            {renderBlock(block, index === 0)}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col min-w-0">
                        {rightContent.map((block, index) => (
                          <div key={block.id} data-id={block.id} className={cn(
                            block.type === 'header' ? 'header-container' :
                              (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                          )}>
                            {renderBlock(block, index === 0)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col min-w-0">
                      {page.main.map((block, index) => (
                        <div key={block.id} data-id={block.id} className={cn(
                          block.type === 'header' ? 'header-container' :
                            (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                        )}>
                          {renderBlock(block, index === 0)}
                        </div>
                      ))}
                    </div>
                  )}
                </ResumePage>
              );
            })}
          </>
        )}
      </div>

      {/* Hidden Measurement Container - Mirrored Layout for Accurate Measurement */}
      <div
        className="fixed top-0 left-[-10000px] pointer-events-none select-none invisible overflow-hidden"
        style={{
          width: `${pageDimensions.width}px`,
          paddingLeft: 'var(--resume-margin-lr)',
          paddingRight: 'var(--resume-margin-lr)',
          paddingTop: 'var(--resume-margin-tb)',
          paddingBottom: 'calc(var(--resume-margin-tb) + 20px + 10px)', // Match the display/pagination buffer exactly
          boxSizing: 'border-box',
          display: 'block',
          ...getDesignStyles()
        }}
      >
        {isTwoColumn ? (
          <div className="grid w-full gap-x-6" style={{ gridTemplateColumns: `${leftPct}% ${rightPct}%` }}>
            {sidebarFirst ? (
              <>
                <div ref={sidebarContainerRef} className="width-constraint">
                  {sidebarBlocks.map(block => (
                    <div key={block.id} data-id={block.id} className={cn(
                      block.type === 'header' ? 'header-container' :
                        (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                    )}>
                      {renderBlock(block)}
                    </div>
                  ))}
                </div>
                <div ref={mainContainerRef} className="width-constraint">
                  {mainBlocks.map(block => (
                    <div key={block.id} data-id={block.id} className={cn(
                      block.type === 'header' ? 'header-container' :
                        (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                    )}>
                      {renderBlock(block)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div ref={mainContainerRef} className="width-constraint">
                  {mainBlocks.map(block => (
                    <div key={block.id} data-id={block.id} className={cn(
                      block.type === 'header' ? 'header-container' :
                        (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                    )}>
                      {renderBlock(block)}
                    </div>
                  ))}
                </div>
                <div ref={sidebarContainerRef} className="width-constraint">
                  {sidebarBlocks.map(block => (
                    <div key={block.id} data-id={block.id} className={cn(
                      block.type === 'header' ? 'header-container' :
                        (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                    )}>
                      {renderBlock(block)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div ref={mainContainerRef} className="w-full">
            {mainBlocks.map(block => (
              <div key={block.id} data-id={block.id} className={cn(
                block.type === 'header' ? 'header-container' :
                  (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
              )}>
                {renderBlock(block)}
              </div>
            ))}
          </div>
        )}
        {/* We need sidebarContainerRef to be mounted even if not isTwoColumn to keep hook happy, or we can just conditionally render and accept that hook might be weird, but hook depends on ref.current. Only if ref is present it measures. */}
        {!isTwoColumn && (
          <div ref={sidebarContainerRef} style={{ display: 'none' }} />
        )}
      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';

// --- Personal Info Component (Reusable) ---
const PersonalInfoModule = ({ data, design, isSaved }: { data: ResumeData, design: any, isSaved: boolean }) => { // Keeping design:any for now to avoid strict type refactor of design object if needed, but fixing the other any
  const { personalInfo, jobTitle } = data;
  const personalDetails = {
    ...design.personalDetails,
    ...(design.templateId === 'elite-navy' ? { banner: true } : {})
  };
  if (!personalInfo.fullName) return null;

  const iconStyle = personalDetails.iconStyle;

  const renderIcon = (IconComponent: React.ElementType) => {
    if (!iconStyle || iconStyle === 'none') return null;
    const isJaganraj = design.templateId === 'jaganraj' && isSaved;
    const safeIconStyle = isJaganraj ? 'circle-filled' : String(iconStyle || 'none');
    const isFilled = safeIconStyle.includes('filled');
    const isCircle = safeIconStyle.includes('circle');
    const isRounded = safeIconStyle.includes('rounded');
    const isOutline = safeIconStyle.includes('outline');

    return (
      <div className={cn(
        "flex items-center justify-center transition-all",
        isFilled ? "text-white" : "",
        isOutline ? "border" : "",
        (isCircle || isJaganraj) ? "rounded-full" : isRounded ? "rounded-md" : "rounded-none"
      )} style={{
        backgroundColor: (isFilled || isJaganraj) ? design.colors.accent : 'transparent',
        borderColor: (isOutline && !isJaganraj) ? design.colors.accent : 'transparent',
        color: (isFilled || isJaganraj) ? 'white' : design.colors.accent,
        padding: '2px'
      }}>
        <IconComponent className="w-3 h-3" />
      </div>
    );
  };

  const renderPhoto = () => {
    if (!personalDetails.showPhoto || !personalInfo.photo) return null;
    return (
      <div
        className={cn(
          "shrink-0 overflow-hidden border-2 border-white/20",
          personalDetails.photoFormat === 'circle' ? "rounded-full" :
            personalDetails.photoFormat === 'rounded' ? "rounded-xl" : "rounded-none"
        )}
        style={{
          width: `${personalDetails.photoSize}px`,
          height: `${personalDetails.photoSize}px`,
        }}
      >
        <img
          src={personalInfo.photo}
          alt={personalInfo.fullName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  return (
    <>
      {/* Banner Header Style */}
      {personalDetails.banner ? (
        <header className={cn(
          "mb-4 pb-6 px-10 -mx-10 bg-[var(--resume-accent-color)] text-white flex gap-8 items-center relative overflow-hidden",
          personalDetails.align === 'center' && "flex-col text-center",
          personalDetails.align === 'right' && "flex-row-reverse text-right"
        )} style={{
          marginLeft: 'calc(var(--resume-margin-lr) * -1)',
          marginRight: 'calc(var(--resume-margin-lr) * -1)',
          paddingLeft: 'var(--resume-margin-lr)',
          paddingRight: 'var(--resume-margin-lr)',
          marginTop: 'calc(var(--resume-margin-tb) * -1)',
          paddingTop: '2.75rem',
        }}>
          {/* Subtle pattern or gradient for premium feel */}
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />

          <div className="relative z-10">
            {renderPhoto()}
          </div>

          <div className="flex-1 min-w-0 relative z-10">
            <h1 className="tracking-tight mb-2 font-bold " style={{
              fontSize: 'calc(var(--resume-name-size) * 0.75)',
              fontWeight: '800',
              color: 'white',
              lineHeight: 1
            }}>
              {personalInfo.fullName}
            </h1>
            {jobTitle && jobTitle.trim() && (
              <div className={cn(
                "text-xl font-bold tracking-wider opacity-95 mb-2",
                (design.templateId === 'jaganraj' && isSaved) ? "mt-1" : ""
              )}>
                <span dangerouslySetInnerHTML={{ __html: decodeHtml(jobTitle.trim()) }} />
              </div>
            )}

            <div className={cn(
              "flex flex-wrap gap-x-8 gap-y-3 mt-4",
              personalDetails.align === 'center' && "justify-center",
              personalDetails.align === 'right' && "justify-end"
            )} style={{ fontSize: 'var(--resume-font-size)' }}>
              {[
                { value: personalInfo.email, icon: Mail },
                { value: personalInfo.phone, icon: Phone },
                { value: personalInfo.location, icon: MapPin },
                { value: personalInfo.linkedIn, icon: Linkedin, isLink: true, label: 'LinkedIn' },
                { value: personalInfo.github, icon: Github, isLink: true, label: 'GitHub' },
                { value: personalInfo.website, icon: Globe, isLink: true, label: 'Portfolio' },
                { value: personalInfo.nationality, icon: Globe, label: 'Nationality' },
                { value: personalInfo.dateOfBirth, icon: Calendar, label: 'DOB' },
                { value: personalInfo.visa, icon: Shield, label: 'Visa' },
                { value: personalInfo.passport, icon: Shield, label: 'Passport' },
                { value: personalInfo.gender, icon: User, label: 'Gender' }
              ].map((item, i) => item.value && (
                <div key={i} className="flex items-center gap-2 group cursor-default">
                  <div className="bg-white/20 p-1.5 rounded-full transition-colors group-hover:bg-white/30">
                    <item.icon size={12} strokeWidth={2.5} className="text-white" />
                  </div>
                  {item.isLink ? (
                    <a href={item.value} target="_blank" rel="noreferrer" className="underline underline-offset-4 decoration-white/30 hover:decoration-white/80 transition-all">
                      {item.label}
                    </a>
                  ) : (
                    <span className="opacity-90">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </header>
      ) : (
        /* Classic Header Style */
        <header className={cn(
          "mb-6 pb-2 flex gap-6 items-start",
          personalDetails.align === 'center' && "flex-col items-center text-center",
          personalDetails.align === 'right' && "flex-row-reverse items-start text-right"
        )}>
          {renderPhoto()}
          <div className="flex-1 min-w-0">
            <h1 className="tracking-tight mb-2" style={{
              fontSize: 'var(--resume-name-size)',
              fontWeight: 'var(--resume-name-font-weight)',
              color: 'var(--resume-text-color)',
              textTransform: (design.templateId === 'jaganraj' && isSaved) ? 'lowercase' : 'none'
            }}>
              {personalInfo.fullName}
            </h1>
            {jobTitle && jobTitle.trim() && (
              <div className={cn(
                "text-xl font-semibold tracking-wide flex items-center gap-2",
                (design.templateId === 'jaganraj' && isSaved) ? "mb-6 mt-2" : "mb-3",
                personalDetails.align === 'center' && "justify-center",
                personalDetails.align === 'right' && "justify-end"
              )} style={{ color: (design.templateId === 'jaganraj' && isSaved) ? design.colors.accent : 'var(--resume-text-color)' }}>
                <span dangerouslySetInnerHTML={{ __html: decodeHtml(jobTitle.trim()) }} />
                <div className={cn(
                  "h-px grow max-w-[200px] bg-current",
                  (design.templateId === 'jaganraj' && isSaved) ? "opacity-60" : "opacity-20"
                )} />
              </div>
            )}

            <div className={cn(
              "flex flex-wrap gap-x-5 gap-y-2 mt-1",
              personalDetails.align === 'center' && "justify-center",
              personalDetails.align === 'right' && "justify-end"
            )} style={{ color: 'var(--resume-text-color)', opacity: design.advanced?.dateLocationOpacity ?? 0.8, fontSize: 'var(--resume-font-size)' }}>
              {[
                { value: personalInfo.email, icon: Mail },
                { value: personalInfo.phone, icon: Phone },
                { value: personalInfo.location, icon: MapPin },
                { value: personalInfo.linkedIn, icon: Linkedin, isLink: true, label: 'LinkedIn' },
                { value: personalInfo.github, icon: Github, isLink: true, label: 'GitHub' },
                { value: personalInfo.website, icon: Globe, isLink: true, label: 'Portfolio' },
                { value: personalInfo.nationality, icon: Globe, label: 'Nationality' },
                { value: personalInfo.dateOfBirth, icon: Calendar, label: 'DOB' },
                { value: personalInfo.visa, icon: Shield, label: 'Visa' },
                { value: personalInfo.passport, icon: Shield, label: 'Passport' },
                { value: personalInfo.gender, icon: User, label: 'Gender' }
              ].map((item, i) => item.value && (
                <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
                  {renderIcon(item.icon)}
                  {item.isLink ? (
                    <a href={item.value.startsWith('http') ? item.value : `https://${item.value}`} target="_blank" rel="noreferrer" className="underline underline-offset-2 decoration-[var(--resume-accent-color)]/30">{item.label}</a>
                  ) : (
                    <span>{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </header>
      )}
    </>
  );
};

export default ResumePreview;
