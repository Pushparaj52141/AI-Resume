"use client";

import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
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
import type { PersonalInfo, ResumeData } from '@/lib/types';
import { cn, formatDate, loadGoogleFont, getGoogleFontUrl, decodeHtml } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { extractProfessionalSummary } from '@/lib/resume-parser';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_DESIGN } from '@/lib/defaults';
import { flattenResumeData, distributeBlocksByLayout, ResumeBlock, getResumeSheetPixelSize } from '@/lib/resume-layout-utils';
import { resumeColorCssVars } from '@/lib/design-colors';
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
  /** Skip pagination + hidden measurement DOM (template grids, dashboard cards). Builder/export should stay false. */
  thumbnailMode?: boolean;
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
  showControls = true,
  thumbnailMode = false,
}, ref) => {
  /** When `propData` is provided, subscribe only to that reference so store edits don’t re-render this preview. */
  const data = useResumeStore(
    useCallback((s) => (propData !== undefined ? propData : s.data), [propData])
  );
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (design?.typography?.fontFamily) {
      loadGoogleFont(design.typography.fontFamily);
    }
  }, [design?.typography?.fontFamily]);

  // --- Design Helpers (memoized: same design → same object, fewer child reconciliations & PDF serialization work) ---
  const designStyles = useMemo(() => {
    const { spacing, colors, typography, personalDetails } = design;
    const nameFf =
      personalDetails.nameFont === 'creative'
        ? 'Georgia, "Times New Roman", "Libre Baskerville", serif'
        : typography.fontFamily;
    return {
      ...resumeColorCssVars(colors),
      '--resume-font-size': `${spacing.fontSize}pt`,
      '--resume-line-height': spacing.lineHeight,
      '--resume-margin-lr': `${spacing.marginLR}mm`,
      '--resume-margin-tb': `${spacing.marginTB}mm`,
      '--resume-entry-spacing': `${spacing.entrySpacing}px`,
      '--resume-font-family': typography.fontFamily,
      '--resume-name-font-family': nameFf,
      '--resume-heading-size': typography.headings.size === 's' ? '0.9rem' : typography.headings.size === 'm' ? '1.1rem' : typography.headings.size === 'l' ? '1.3rem' : '1.5rem',
      '--resume-name-size': personalDetails.nameSize === 'xs' ? '1.5rem' : personalDetails.nameSize === 's' ? '2rem' : personalDetails.nameSize === 'm' ? '2.5rem' : personalDetails.nameSize === 'l' ? '3rem' : '3.5rem',
      '--resume-name-font-weight': personalDetails.nameBold ? '800' : '400',
    } as React.CSSProperties;
  }, [design]);

  const pageDimensions = useMemo(() => {
    const format = design.languageRegion.pageFormat;
    const { width, height } = getResumeSheetPixelSize(format);
    return { width, height, name: format === 'Letter' ? 'Letter' as const : 'A4' as const };
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
      const designStylesRecord = designStyles as Record<string, string>;
      const cssVariables = Object.entries(designStylesRecord)
        .map(([key, value]) => `${key}: ${value}`)
        .join(';');

      // 4. Normalize export DOM: match on-screen `ResumePage` padding + full sheet size (zoom clip + symmetric PDF padding were shrinking / reflowing content).
      const { width: sheetW, height: sheetH } = getResumeSheetPixelSize(design.languageRegion.pageFormat);
      const pdfNormalizeCss = [
        `body{background:white;margin:0;padding:0;width:${sheetW}px;min-height:100vh}`,
        `#resume-preview{width:${sheetW}px !important;max-width:${sheetW}px !important;margin:0 !important;padding:0 !important;transform:none !important;box-shadow:none !important}`,
        `.resume-page-clip{margin:0 !important;width:${sheetW}px !important;height:${sheetH}px !important;max-width:${sheetW}px !important;overflow:visible !important;background:transparent !important;flex-shrink:0 !important}`,
        `.resume-page{transform:none !important;box-shadow:none !important;margin:0 !important;width:${sheetW}px !important;height:${sheetH}px !important;min-height:${sheetH}px !important;max-height:${sheetH}px !important;box-sizing:border-box !important;display:flex !important;flex-direction:column !important;padding-top:var(--resume-margin-tb) !important;padding-bottom:calc(var(--resume-margin-tb) + 20px + 10px) !important;padding-left:var(--resume-margin-lr) !important;padding-right:var(--resume-margin-lr) !important;page-break-after:always !important;break-after:page !important;background:white !important;overflow:hidden !important}`,
      ].join('');
      const rootVars = cssVariables ? `:root{${cssVariables}}` : '';
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${finalStyles}<style>${pdfNormalizeCss}${rootVars}</style></head><body>${content}</body></html>`.trim();

      // 5. Submit job to queue
      const exportFileName = `Resume_${data.personalInfo.fullName?.replace(/\s+/g, '_') || 'Draft'}.pdf`;
      const response = await apiClient('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          fileName: exportFileName,
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
      const contentType = response.headers.get('content-type') || '';
      // Synchronous fallback returns raw PDF bytes to avoid base64 overhead.
      if (contentType.includes('application/pdf')) {
        const pdfBlob = await response.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        // Browser download filename is best-effort; server also sends Content-Disposition.
        link.download = exportFileName || 'resume.pdf';
        link.click();
        window.URL.revokeObjectURL(url);
        return;
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

  const sidebarColumnShellStyle = useMemo((): React.CSSProperties | undefined => {
    const bg = design.colors.sidebarBackground;
    const bl = design.advanced?.sidebarBorderLeft;
    if (!bg && !bl) return undefined;
    return {
      boxSizing: 'border-box',
      ...(bg ? { backgroundColor: bg } : {}),
      ...(bl ? { borderLeft: bl } : {}),
      padding: bg || bl ? '8px 8px' : undefined,
      borderRadius: bg ? '0 6px 6px 0' : undefined,
    };
  }, [design.colors.sidebarBackground, design.advanced?.sidebarBorderLeft]);

  /** Percent + gap can exceed 100% and collapse columns; fr splits space after gap */
  const twoColumnGridTemplate = useMemo(
    () => `minmax(0,${leftPct}fr) minmax(0,${rightPct}fr)`,
    [leftPct, rightPct]
  );

  // --- Render Block Helper ---
  const renderBlock = (block: ResumeBlock, isFirstOnPage: boolean = false) => {
    const { sectionSettings } = design;
    const el = design.entryLayout ?? DEFAULT_DESIGN.entryLayout;
    const entryTitleFs =
      el.titleSize === 's'
        ? 'calc(var(--resume-font-size) - 0.5pt)'
        : el.titleSize === 'l'
          ? 'calc(var(--resume-font-size) + 1pt)'
          : 'var(--resume-font-size)';
    const listBulletChar = el.listStyle === 'hyphen' ? '–' : '●';
    const bodyIndentClass = el.indentBody ? 'ml-4 pl-1' : '';
    const subPlacement = el.subtitlePlacement ?? 'next-line';
    const dateColStyle: React.CSSProperties =
      el.dateColumnMode === 'manual'
        ? { minWidth: '7.75rem', flexShrink: 0, textAlign: 'right' }
        : { flexShrink: 0 };
    const subTitleClass = cn(
      'leading-tight',
      el.subtitleStyle === 'italic' && 'italic',
      el.subtitleStyle === 'bold' && 'font-bold',
      el.subtitleStyle === 'normal' && 'font-medium'
    );

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
        )}
        style={{
          backgroundColor: isFilled ? 'var(--resume-header-icon-color)' : 'transparent',
          borderColor: isOutline ? 'var(--resume-header-icon-color)' : 'transparent',
          color: isFilled ? 'white' : 'var(--resume-header-icon-color)',
          width: '1.5em', height: '1.5em'
        }}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: "w-3 h-3" })}
        </span>
      );
    };

    const headingGradientTextStyle: React.CSSProperties = {
      backgroundImage: 'var(--resume-heading-gradient)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent',
    };

    const SectionTitle = ({ children, icon }: { children: React.ReactNode, icon?: React.ReactNode }) => {
      const hs = design.typography.headings.style || 'classic';
      const cap = design.typography.headings.capitalization;
      return (
        <h2
          className={cn(
            'flex items-center group transition-colors',
            cap === 'none' && 'normal-case',
            cap === 'capitalize' && 'capitalize',
            cap === 'uppercase' && 'uppercase',
            hs === 'classic' && 'font-bold uppercase tracking-widest border-b pb-1',
            hs === 'underline' && 'font-bold uppercase tracking-widest border-b-2 pb-1',
            hs === 'minimal' && 'border-0 pb-0 text-base font-semibold tracking-tight',
            hs === 'pill' && 'border-0 w-fit max-w-full rounded-full px-4 py-1.5 text-sm font-bold tracking-wide',
            hs === 'bold' && 'border-0 pb-0 text-lg font-black tracking-wide uppercase',
          )}
          style={{
            borderColor: hs === 'classic' || hs === 'underline' ? `${design.colors.accent}55` : 'transparent',
            // Template-tuned spacing between sections.
            // Start slightly roomier than default, then scale gently with each template's `entrySpacing`.
            // (User feedback: reduce spacing if it feels too large.)
            marginTop: !isFirstOnPage ? 'calc(10px + (var(--resume-entry-spacing) * 0.06))' : '0px',
            marginBottom: 'calc(7px + (var(--resume-entry-spacing) * 0.04))',
            ...(hs === 'pill'
              ? { backgroundColor: `color-mix(in srgb, ${design.colors.accent} 14%, transparent)` }
              : {}),
          }}
        >
          {icon && renderSectionIcon(icon)}
          <span className="flex-1 min-w-0" style={headingGradientTextStyle}>
            {typeof children === 'string' ? (
              <span dangerouslySetInnerHTML={{ __html: decodeHtml(children) }} />
            ) : (
              children
            )}
          </span>
        </h2>
      );
    };

    const BannerSectionTitle = ({ children, icon }: { children: React.ReactNode, icon?: React.ReactNode }) => {
      const isEliteNavy = design.templateId === 'elite-navy';
      return (
        <h2 className={cn(
          "font-extrabold uppercase tracking-[0.2em] flex items-center justify-center group mb-0.5 px-4 py-1.5 transition-all rounded-sm",
          !isFirstOnPage ? "mt-1.5" : "mt-0",
          design.typography.headings.capitalization === 'none' && "normal-case",
          design.typography.headings.capitalization === 'capitalize' && "capitalize",
          design.typography.headings.capitalization === 'uppercase' && "uppercase",
          isEliteNavy ? "bg-[#f1f5f9]" : "bg-slate-50 border-y border-slate-100/50"
        )}
          style={{
            fontSize: 'var(--resume-heading-size)',
          }}>
          {icon && (
            <span className="mr-3 opacity-100 flex items-center" style={{ color: 'var(--resume-header-icon-color)' }}>
              {React.cloneElement(icon as React.ReactElement<any>, {
                size: 14,
                strokeWidth: 2.8,
                className: "shrink-0"
              })}
            </span>
          )}
          <span className="flex-none" style={headingGradientTextStyle}>
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
      case 'page-break':
        /** Zero-height marker; pagination hook flushes the page before the next block. */
        return <div className="h-0 w-full overflow-hidden" aria-hidden />;

      case 'header':
        return <PersonalInfoModule data={data} design={design} thumbnailMode={thumbnailMode} />;

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
              className={cn('text-justify relative prose prose-slate max-w-none [&_p]:m-0', bodyIndentClass)}
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
                <div className={cn('flex items-start', bodyIndentClass)}>
                  <div className="w-4 flex justify-center shrink-0 relative top-[0.3em] text-[10px]" style={{ color: 'var(--resume-dots-color)' }}>{listBulletChar}</div>
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
                    className={cn('prose prose-slate max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_p]:m-0', bodyIndentClass)}
                    style={{ fontSize: 'calc(var(--resume-font-size) - 1pt)', lineHeight: 1.4 }}
                    dangerouslySetInnerHTML={{ __html: decodeHtml(exp.description) }}
                  />
                )}
              </div>
            );
          }

          const primaryTitle = order === 'title-employer' ? exp.position : exp.company;
          const secondaryTitle = order === 'title-employer' ? exp.company : exp.position;

          // Header or Full Block
          return (
            <div className="resume-item" style={{ marginBottom: renderType === 'header' ? '1px' : 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-start gap-3 mb-0.5">
                <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                  {subPlacement === 'same-line' ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className="font-bold tracking-tight text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }}>
                        <span dangerouslySetInnerHTML={{ __html: decodeHtml(primaryTitle) }} />
                      </h3>
                      <span className="text-slate-300 select-none" aria-hidden>
                        ·
                      </span>
                      <div className={cn(subTitleClass, 'flex items-center gap-2')} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }}>
                        <span dangerouslySetInnerHTML={{ __html: decodeHtml(secondaryTitle) }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold tracking-tight text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }}>
                        <span dangerouslySetInnerHTML={{ __html: decodeHtml(primaryTitle) }} />
                      </h3>
                      <div className={cn(subTitleClass, 'flex items-center gap-2')} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }}>
                        <span dangerouslySetInnerHTML={{ __html: decodeHtml(secondaryTitle) }} />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-right" style={dateColStyle}>
                  <span className="font-bold uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)', color: 'var(--resume-date-color)' }}>
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
                  className={cn('mt-3 prose prose-slate max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_p]:leading-[1.6]', bodyIndentClass)}
                  style={{ fontSize: 'calc(var(--resume-font-size) - 0.5pt)', color: '#1e293b' }}
                  dangerouslySetInnerHTML={{ __html: decodeHtml(exp.description) }}
                />
              )}
            </div>
          );
        }
        if (block.sectionId === 'education') {
          const edu = block.content;
          const eduOrder = sectionSettings.education.order;
          const degreeLine = (
            <>
              {edu.degree && edu.field && (
                <span className="italic">
                  <span dangerouslySetInnerHTML={{ __html: decodeHtml(edu.degree) }} /> in{' '}
                  <span dangerouslySetInnerHTML={{ __html: decodeHtml(edu.field) }} />
                </span>
              )}
              {edu.degree && !edu.field && <span className="italic" dangerouslySetInnerHTML={{ __html: decodeHtml(edu.degree) }} />}
              {!edu.degree && edu.field && <span className="italic" dangerouslySetInnerHTML={{ __html: decodeHtml(edu.field) }} />}
            </>
          );
          const schoolLine = <span dangerouslySetInnerHTML={{ __html: decodeHtml(edu.institution) }} />;
          const primaryNode = eduOrder === 'degree-school' ? degreeLine : schoolLine;
          const secondaryNode = eduOrder === 'degree-school' ? schoolLine : degreeLine;

          return (
            <div className="resume-item" style={{ marginBottom: 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-start gap-3 mb-0.5">
                <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                  {subPlacement === 'same-line' ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className="font-bold text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }}>
                        {primaryNode}
                      </h3>
                      <span className="text-slate-300 select-none" aria-hidden>
                        ·
                      </span>
                      <div className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }}>
                        {secondaryNode}
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }}>
                        {primaryNode}
                      </h3>
                      <div className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }}>
                        {secondaryNode}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-right" style={dateColStyle}>
                  <span className="font-bold uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)', color: 'var(--resume-date-color)' }}>
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
                <div className={cn('flex items-start', bodyIndentClass)}>
                  <div className="w-4 flex justify-center shrink-0 relative top-[0.3em] text-[10px]" style={{ color: 'var(--resume-dots-color)' }}>{listBulletChar}</div>
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
                    className={cn('prose prose-slate max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_p]:m-0', bodyIndentClass)}
                    style={{ fontSize: 'var(--resume-font-size)', lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: decodeHtml(project.description) }}
                  />
                )}
              </div>
            )
          }

          return (
            <div className="resume-item" style={{ marginBottom: renderType === 'header' ? '1px' : 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-start gap-3 mb-0.5">
                <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                  {subPlacement === 'same-line' && project.role ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(project.title) }} />
                        {project.link && (
                          <a href={project.link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[var(--resume-accent-color)] transition-colors">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <span className="text-slate-300 select-none" aria-hidden>
                        ·
                      </span>
                      <div className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(project.role) }} />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(project.title) }} />
                        {project.link && (
                          <a href={project.link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[var(--resume-accent-color)] transition-colors">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      {project.role && (
                        <div className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(project.role) }} />
                      )}
                    </>
                  )}
                </div>
                {(project.startDate || project.endDate) && (
                  <div className="text-right shrink-0" style={dateColStyle}>
                    <span className="font-bold uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)', color: 'var(--resume-date-color)' }}>
                      {project.startDate ? formatDate(project.startDate) : ''} {project.startDate && project.endDate ? '–' : ''} {project.endDate ? formatDate(project.endDate) : ''}
                    </span>
                  </div>
                )}
              </div>

              {!renderType && project.description && (
                <div
                  className={cn('mt-2.5 prose prose-slate max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_p]:leading-relaxed', bodyIndentClass)}
                  style={{ fontSize: 'calc(var(--resume-font-size) - 0.5pt)', color: '#1e293b' }}
                  dangerouslySetInnerHTML={{ __html: decodeHtml(project.description) }}
                />
              )}
            </div>
          );
        }
        if (block.sectionId === 'certificates') {
          const cert = block.content;
          const orgStr = cert.organization ? String(cert.organization).trim() : '';
          return (
            <div className="resume-item break-inside-avoid" style={{ marginBottom: 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-start gap-3 mb-0.5">
                <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                  {subPlacement === 'same-line' && orgStr ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className="font-bold text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(cert.name) }} />
                      <span className="text-slate-300 select-none" aria-hidden>
                        ·
                      </span>
                      <div className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(orgStr) }} />
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(cert.name) }} />
                      {orgStr ? (
                        <div className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(orgStr) }} />
                      ) : null}
                    </>
                  )}
                </div>
                <div className="shrink-0 text-right" style={dateColStyle}>
                  <span className="font-bold uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)', color: 'var(--resume-date-color)' }}>
                    {formatDate(cert.issueDate)}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        if (block.sectionId === 'awards') {
          const award = block.content;
          const orgStr = award.organization ? String(award.organization).trim() : '';
          return (
            <div className="resume-item break-inside-avoid" style={{ marginBottom: 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-start gap-3 mb-0.5">
                <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                  {subPlacement === 'same-line' && orgStr ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-bold text-slate-900" style={{ fontSize: entryTitleFs }} dangerouslySetInnerHTML={{ __html: decodeHtml(award.title) }} />
                      <span className="text-slate-300 select-none" aria-hidden>
                        ·
                      </span>
                      <span className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(orgStr) }} />
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-slate-900" style={{ fontSize: entryTitleFs }} dangerouslySetInnerHTML={{ __html: decodeHtml(award.title) }} />
                      {orgStr ? (
                        <span className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(orgStr) }} />
                      ) : null}
                    </>
                  )}
                </div>
                <div className="shrink-0 text-right" style={dateColStyle}>
                  <span className="font-bold uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)', color: 'var(--resume-date-color)' }}>
                    {formatDate(award.date)}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        if (block.sectionId === 'courses') {
          const course = block.content;
          const providerStr = course.provider ? String(course.provider).trim() : '';
          return (
            <div className="resume-item break-inside-avoid" style={{ marginBottom: 'calc(var(--resume-entry-spacing) * 0.2)' }}>
              <div className="flex justify-between items-start gap-3 mb-1">
                <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                  {subPlacement === 'same-line' && providerStr ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className="font-bold text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(course.name) }} />
                      <span className="text-slate-300 select-none" aria-hidden>
                        ·
                      </span>
                      <div className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(providerStr) }} />
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(course.name) }} />
                      {providerStr ? (
                        <div className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(providerStr) }} />
                      ) : null}
                    </>
                  )}
                </div>
                <div className="shrink-0 text-right" style={dateColStyle}>
                  <span className="font-bold uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)', color: 'var(--resume-date-color)' }}>
                    {formatDate(course.completionDate)}
                  </span>
                </div>
              </div>
              {course.description && (
                <div
                  className={cn('prose prose-slate max-w-none text-slate-700 leading-relaxed [&_p]:m-0', bodyIndentClass)}
                  style={{ fontSize: 'calc(var(--resume-font-size) - 0.5pt)' }}
                  dangerouslySetInnerHTML={{ __html: decodeHtml(course.description) }}
                />
              )}
            </div>
          );
        }

        if (block.sectionId === 'organisations') {
          const org = block.content;
          const nameStr = org.name ? String(org.name).trim() : '';
          return (
            <div className="resume-item break-inside-avoid" style={{ marginBottom: 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-start gap-3 mb-0.5">
                <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                  {subPlacement === 'same-line' && nameStr ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-bold text-slate-900" style={{ fontSize: entryTitleFs }} dangerouslySetInnerHTML={{ __html: decodeHtml(org.role) }} />
                      <span className="text-slate-300 select-none" aria-hidden>
                        ·
                      </span>
                      <span className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(nameStr) }} />
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-slate-900" style={{ fontSize: entryTitleFs }} dangerouslySetInnerHTML={{ __html: decodeHtml(org.role) }} />
                      {nameStr ? (
                        <span className={subTitleClass} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(nameStr) }} />
                      ) : null}
                    </>
                  )}
                </div>
                <div className="shrink-0 text-right" style={dateColStyle}>
                  <span className="font-bold uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)', color: 'var(--resume-date-color)' }}>
                    {formatDate(org.startDate)} – {org.endDate ? formatDate(org.endDate) : 'Present'}
                  </span>
                </div>
              </div>
            </div>
          );
        }
        if (block.sectionId === 'publications') {
          const pub = block.content;
          const titleHtml = `"${pub.title}"`;
          const pubStr = pub.publisher ? String(pub.publisher).trim() : '';
          return (
            <div className="resume-item break-inside-avoid" style={{ marginBottom: 'calc(var(--resume-entry-spacing) * 0.15)' }}>
              <div className="flex justify-between items-start gap-3 mb-0.5">
                <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                  {subPlacement === 'same-line' && pubStr ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className="font-bold italic text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(titleHtml) }} />
                      <span className="text-slate-300 select-none" aria-hidden>
                        ·
                      </span>
                      <div className={cn(subTitleClass, 'italic')} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'calc(var(--resume-font-size) - 0.5pt)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(pubStr) }} />
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold italic text-slate-900" style={{ fontSize: entryTitleFs, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: decodeHtml(titleHtml) }} />
                      {pubStr ? (
                        <div className={cn(subTitleClass, 'italic')} style={{ color: 'var(--resume-entry-accent-color)', fontSize: 'calc(var(--resume-font-size) - 0.5pt)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(pubStr) }} />
                      ) : null}
                    </>
                  )}
                </div>
                <div className="shrink-0 text-right" style={dateColStyle}>
                  <span className="font-bold uppercase tracking-tight" style={{ fontSize: 'var(--resume-font-size)', color: 'var(--resume-date-color)' }}>
                    {formatDate(pub.date)}
                  </span>
                </div>
              </div>
              {pub.description && (
                <div
                  className={cn('mt-1 prose prose-slate max-w-none text-slate-700 [&_p]:m-0', bodyIndentClass)}
                  style={{ fontSize: 'calc(var(--resume-font-size) - 0.5pt)' }}
                  dangerouslySetInnerHTML={{ __html: decodeHtml(pub.description) }}
                />
              )}
            </div>
          );
        }

        // Fallback for simple list items or single items
        if (block.sectionId === 'custom') {
          return (
            <div
              className={cn('text-justify prose prose-slate max-w-none', bodyIndentClass)}
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
                  <span className="w-4 flex justify-center shrink-0 text-[10px] leading-none" style={{ color: 'var(--resume-dots-color)' }}>
                    {listBulletChar}
                  </span>
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
                    {idx < interestsList.length - 1 && (
                      <span aria-hidden>
                        {' '}
                        {listBulletChar}{' '}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              {interestsList.some((i: any) => i.description) && (
                <div className="space-y-1">
                  {interestsList.filter((i: any) => i.description).map((i: any) => (
                    <div
                      key={i.id}
                      className={cn('text-xs opacity-70 prose prose-slate max-w-none [&_p]:m-0', bodyIndentClass)}
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
                <div className={cn('italic', bodyIndentClass)} style={{ fontSize: 'var(--resume-font-size)' }} dangerouslySetInnerHTML={{ __html: decodeHtml(dec.statement) }} />
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

  const paginationOpts = thumbnailMode ? { thumbnail: true as const } : undefined;

  const { pages: mainPages, measuring: mainMeasuring, containerRef: mainContainerRef } = useResumePagination(mainBlocks, renderBlock, {
    width: pageDimensions.width,
    height: pageDimensions.height,
    marginTop: effectiveMarginTB,
    marginBottom: effectivePaddingBottom,
  }, paginationOpts);

  const { pages: sidebarPages, measuring: sidebarMeasuring, containerRef: sidebarContainerRef } = useResumePagination(sidebarBlocks, renderBlock, {
    width: pageDimensions.width,
    height: pageDimensions.height,
    marginTop: effectiveMarginTB,
    marginBottom: effectivePaddingBottom,
  }, paginationOpts);

  const measuring = thumbnailMode ? false : (mainMeasuring || (isTwoColumn && sidebarMeasuring));
  const previewReady = (thumbnailMode || mounted) && !measuring;

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
        className={cn(
          'relative flex flex-col gap-0 m-0 transition-all duration-300 ease-in-out print:!m-0 print:!bg-transparent print:!p-0',
          showControls &&
            'rounded-xl bg-transparent px-3 py-6 sm:px-5 sm:py-8'
        )}
        style={designStyles}
      >
        {!previewReady ? (
          <div
            className="mx-auto flex flex-col items-center justify-center border border-slate-200/80 bg-white shadow-sm"
            style={{
              width: pageDimensions.width,
              height: pageDimensions.height,
              maxWidth: '100%',
            }}
          >
            <p className="text-sm text-slate-500">
              Formatting resume into {pageDimensions.name} pages…
            </p>
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
                #resume-preview {
                  background: transparent !important;
                  padding: 0 !important;
                  border-radius: 0 !important;
                }
                .flex-col.items-center {
                  display: block !important;
                }
                .resume-page-clip {
                  margin: 0 !important;
                  margin-bottom: 0 !important;
                  break-after: page;
                  page-break-after: always;
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
                  key={`${pageDimensions.name}-${index}-${displayPages.length}`}
                  pageNumber={index + 1}
                  totalNumbers={displayPages.length}
                  scale={zoomLevel}
                  width={`${pageDimensions.width}px`}
                  height={`${pageDimensions.height}px`}
                  style={{
                    // Clip wrapper is already scaled to visual height; fixed gap between pages
                    marginBottom: !showControls ? '0' : '1.5rem',
                    boxShadow: !showControls ? 'none' : undefined,
                    border:
                      !showControls
                        ? 'none'
                        : design.colors.mode === 'border'
                          ? '2px solid #e2e8f0'
                          : undefined,
                    marginRight: !showControls ? '0' : undefined,
                    marginLeft: !showControls ? '0' : undefined,
                  }}
                >
                  {isTwoColumn ? (
                    <div
                      className="grid w-full min-h-0 gap-x-6"
                      style={{ gridTemplateColumns: twoColumnGridTemplate }}
                    >
                      <div
                        className="flex min-h-0 min-w-0 max-w-full flex-col overflow-visible"
                        style={sidebarFirst ? sidebarColumnShellStyle : undefined}
                      >
                        {leftContent.map((block, index) => (
                          <div key={block.id} data-id={block.id} className={cn(
                            'min-w-0 max-w-full',
                            block.type === 'header' ? 'header-container' :
                              (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                          )}>
                            {renderBlock(block, index === 0)}
                          </div>
                        ))}
                      </div>
                      <div
                        className="flex min-h-0 min-w-0 max-w-full flex-col overflow-visible"
                        style={!sidebarFirst ? sidebarColumnShellStyle : undefined}
                      >
                        {rightContent.map((block, index) => (
                          <div key={block.id} data-id={block.id} className={cn(
                            'min-w-0 max-w-full',
                            block.type === 'header' ? 'header-container' :
                              (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                          )}>
                            {renderBlock(block, index === 0)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-0 min-w-0 flex-col overflow-visible">
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

      {/* Hidden measurement: skipped in thumbnailMode (saves a full duplicate DOM tree per preview). */}
      {!thumbnailMode && (
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
          ...designStyles
        }}
      >
        {isTwoColumn ? (
          <div className="grid w-full gap-x-6" style={{ gridTemplateColumns: twoColumnGridTemplate }}>
            {sidebarFirst ? (
              <>
                <div ref={sidebarContainerRef} className="min-w-0 max-w-full width-constraint overflow-x-clip" style={sidebarColumnShellStyle}>
                  {sidebarBlocks.map(block => (
                    <div key={block.id} data-id={block.id} className={cn(
                      'min-w-0 max-w-full',
                      block.type === 'header' ? 'header-container' :
                        (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                    )}>
                      {renderBlock(block)}
                    </div>
                  ))}
                </div>
                <div ref={mainContainerRef} className="min-w-0 max-w-full width-constraint overflow-visible">
                  {mainBlocks.map(block => (
                    <div key={block.id} data-id={block.id} className={cn(
                      'min-w-0 max-w-full',
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
                <div ref={mainContainerRef} className="min-w-0 max-w-full width-constraint overflow-visible">
                  {mainBlocks.map(block => (
                    <div key={block.id} data-id={block.id} className={cn(
                      'min-w-0 max-w-full',
                      block.type === 'header' ? 'header-container' :
                        (block.content?._renderType && !block.content?._isLastChunk) ? '' : 'section'
                    )}>
                      {renderBlock(block)}
                    </div>
                  ))}
                </div>
                <div ref={sidebarContainerRef} className="min-w-0 max-w-full width-constraint overflow-x-clip" style={sidebarColumnShellStyle}>
                  {sidebarBlocks.map(block => (
                    <div key={block.id} data-id={block.id} className={cn(
                      'min-w-0 max-w-full',
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
      )}
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';

type HeaderContactRow = {
  key: string;
  value: string;
  icon: React.ElementType;
  isLink?: boolean;
  label?: string;
};

function headerContactRows(pi: PersonalInfo): HeaderContactRow[] {
  return [
    { key: 'email', value: pi.email, icon: Mail },
    { key: 'phone', value: pi.phone, icon: Phone },
    { key: 'location', value: pi.location, icon: MapPin },
    { key: 'linkedIn', value: pi.linkedIn ?? '', icon: Linkedin, isLink: true, label: 'LinkedIn' },
    { key: 'github', value: pi.github ?? '', icon: Github, isLink: true, label: 'GitHub' },
    { key: 'website', value: pi.website ?? '', icon: Globe, isLink: true, label: 'Portfolio' },
    { key: 'nationality', value: pi.nationality ?? '', icon: Globe, label: 'Nationality' },
    { key: 'dateOfBirth', value: pi.dateOfBirth ?? '', icon: Calendar, label: 'DOB' },
    { key: 'visa', value: pi.visa ?? '', icon: Shield, label: 'Visa' },
    { key: 'passport', value: pi.passport ?? '', icon: Shield, label: 'Passport' },
    { key: 'gender', value: pi.gender ?? '', icon: User, label: 'Gender' },
  ].filter((r) => Boolean(r.value && String(r.value).trim()));
}

// --- Personal Info Component (Reusable) ---
const PersonalInfoModule = ({
  data,
  design,
  thumbnailMode = false,
}: {
  data: ResumeData;
  design: any;
  thumbnailMode?: boolean;
}) => {
  const { personalInfo, jobTitle } = data;
  const personalDetails = {
    ...design.personalDetails,
    ...(design.templateId === 'elite-navy' ? { banner: true } : {})
  };
  if (!personalInfo.fullName) return null;

  const arrangement = personalDetails.arrangement ?? 'icon';
  const contactRows = headerContactRows(personalInfo);
  const contactSep =
    arrangement === 'bullet' ? '·' : arrangement === 'pipe' ? '｜' : '|';

  /** Full-bleed banner margins are for single-column pages only; in a sidebar they paint over the main column */
  const isBannerInSidebarColumn =
    !!personalDetails.banner &&
    (design.layout?.columns === 'two' || design.layout?.columns === 'mix') &&
    (design.layout?.headerPosition === 'left' || design.layout?.headerPosition === 'right');

  /** Narrow rail: stack photo + name + contacts vertically so the name uses full column width */
  const isClassicHeaderInSidebar =
    !personalDetails.banner &&
    (design.layout?.columns === 'two' || design.layout?.columns === 'mix') &&
    (design.layout?.headerPosition === 'left' || design.layout?.headerPosition === 'right');

  const iconStyle = personalDetails.iconStyle;

  const renderIcon = (IconComponent: React.ElementType) => {
    if (!iconStyle || iconStyle === 'none') return null;
    const safeIconStyle = String(iconStyle || 'none');
    const isFilled = safeIconStyle.includes('filled');
    const isCircle = safeIconStyle.includes('circle');
    const isRounded = safeIconStyle.includes('rounded');
    const isOutline = safeIconStyle.includes('outline');

    return (
      <div className={cn(
        "flex items-center justify-center transition-all",
        isFilled ? "text-white" : "",
        isOutline ? "border" : "",
        isCircle ? "rounded-full" : isRounded ? "rounded-md" : "rounded-none"
      )} style={{
        backgroundColor: isFilled ? 'var(--resume-header-icon-color)' : 'transparent',
        borderColor: isOutline ? 'var(--resume-header-icon-color)' : 'transparent',
        color: isFilled ? 'white' : 'var(--resume-header-icon-color)',
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
          "mb-4 pb-6 bg-[var(--resume-accent-color)] text-white flex gap-8 items-center relative overflow-hidden",
          !isBannerInSidebarColumn &&
            (thumbnailMode ? "w-full min-w-0 box-border" : "px-10 -mx-10"),
          isBannerInSidebarColumn && "w-full min-w-0 rounded-md px-3 py-4 box-border",
          personalDetails.align === 'center' && "flex-col text-center",
          personalDetails.align === 'right' && "flex-row-reverse text-right"
        )} style={{
          ...(isBannerInSidebarColumn
            ? {}
            : thumbnailMode
              ? {
                  paddingLeft: 'var(--resume-margin-lr)',
                  paddingRight: 'var(--resume-margin-lr)',
                }
              : {
                  marginLeft: 'calc(var(--resume-margin-lr) * -1)',
                  marginRight: 'calc(var(--resume-margin-lr) * -1)',
                  paddingLeft: 'var(--resume-margin-lr)',
                  paddingRight: 'var(--resume-margin-lr)',
                  marginTop: 'calc(var(--resume-margin-tb) * -1)',
                }),
          paddingTop: isBannerInSidebarColumn ? '1rem' : '2.75rem',
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
              <div className="text-xl font-bold tracking-wider opacity-95 mb-2">
                <span dangerouslySetInnerHTML={{ __html: decodeHtml(jobTitle.trim()) }} />
              </div>
            )}

            <div
              className={cn(
                'mt-4',
                arrangement === 'icon'
                  ? cn('flex flex-wrap gap-x-8 gap-y-3', personalDetails.align === 'center' && 'justify-center', personalDetails.align === 'right' && 'justify-end')
                  : cn(
                      'flex flex-wrap items-baseline gap-x-1 gap-y-2',
                      personalDetails.align === 'center' && 'justify-center',
                      personalDetails.align === 'right' && 'justify-end'
                    )
              )}
              style={{ fontSize: 'var(--resume-font-size)' }}
            >
              {arrangement === 'icon'
                ? contactRows.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 group cursor-default">
                      <div className="bg-white/20 p-1.5 rounded-full transition-colors group-hover:bg-white/30">
                        <item.icon size={12} strokeWidth={2.5} className="text-white" />
                      </div>
                      {item.isLink ? (
                        <a
                          href={item.value.startsWith('http') ? item.value : `https://${item.value}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4 decoration-white/30 hover:decoration-white/80 transition-all"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span className="opacity-90">{item.value}</span>
                      )}
                    </div>
                  ))
                : contactRows.map((item, i) => (
                    <React.Fragment key={item.key}>
                      {i > 0 && (
                        <span className="select-none px-1.5 text-white/45" aria-hidden>
                          {contactSep}
                        </span>
                      )}
                      {item.isLink ? (
                        <a
                          href={item.value.startsWith('http') ? item.value : `https://${item.value}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4 decoration-white/30 hover:decoration-white/80 transition-all opacity-95"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span className="opacity-90">{item.value}</span>
                      )}
                    </React.Fragment>
                  ))}
            </div>
          </div>
        </header>
      ) : (
        <header
          className={cn(
            // Reduce extra breathing room between top header and the first section.
            'mb-5 pb-1 flex gap-6 items-start',
            personalDetails.align === 'center' && 'flex-col items-center text-center',
            personalDetails.align === 'right' && 'flex-row-reverse items-start text-right',
            isClassicHeaderInSidebar && 'flex-col gap-3'
          )}
        >
          {renderPhoto()}
          <div className="flex-1 min-w-0">
            <h1
              className="tracking-tight mb-2"
              style={{
                fontSize: 'var(--resume-name-size)',
                fontWeight: 'var(--resume-name-font-weight)',
                color: 'var(--resume-name-color)',
                lineHeight: 1.1,
              }}
            >
              {personalInfo.fullName}
            </h1>
            {jobTitle && jobTitle.trim() && (
              <div
                className={cn(
                  (personalDetails.jobTitlePlacement ?? 'below') === 'same-line'
                    ? cn(
                        'mb-3 flex gap-3',
                        !isClassicHeaderInSidebar && 'items-center',
                        personalDetails.align === 'center' &&
                          (personalDetails.jobTitlePlacement ?? 'below') === 'same-line' &&
                          'justify-center',
                        personalDetails.align === 'right' &&
                          (personalDetails.jobTitlePlacement ?? 'below') === 'same-line' &&
                          'justify-end'
                      )
                    : 'mb-3 flex flex-col gap-1',
                  (personalDetails.jobTitleSize ?? 'm') === 's'
                    ? isClassicHeaderInSidebar
                      ? 'text-xs'
                      : 'text-base'
                    : (personalDetails.jobTitleSize ?? 'm') === 'l'
                      ? isClassicHeaderInSidebar
                        ? 'text-base'
                        : 'text-2xl'
                      : isClassicHeaderInSidebar
                        ? 'text-sm'
                        : 'text-xl',
                  personalDetails.align === 'center' &&
                    (personalDetails.jobTitlePlacement ?? 'below') === 'below' &&
                    'items-center text-center',
                  personalDetails.align === 'right' &&
                    (personalDetails.jobTitlePlacement ?? 'below') === 'below' &&
                    'items-end text-right'
                )}
                style={{
                  color: 'var(--resume-job-title-color)',
                  fontStyle: (personalDetails.jobTitleStyle ?? 'normal') === 'italic' ? 'italic' : 'normal',
                }}
              >
                <span
                  className="min-w-0 shrink break-words"
                  dangerouslySetInnerHTML={{ __html: decodeHtml(jobTitle.trim()) }}
                />
                {!isClassicHeaderInSidebar && (personalDetails.jobTitlePlacement ?? 'below') === 'same-line' && (
                  <div className="h-px max-w-[200px] grow bg-current opacity-20 min-w-[48px]" />
                )}
              </div>
            )}

            <div
              className={cn(
                // Slightly tighter spacing between job title and contact rows.
                'mt-0.5',
                arrangement === 'icon'
                  ? isClassicHeaderInSidebar
                    ? 'flex flex-col gap-y-2'
                    : cn(
                        'flex flex-wrap gap-x-5 gap-y-2',
                        personalDetails.align === 'center' && 'justify-center',
                        personalDetails.align === 'right' && 'justify-end'
                      )
                  : cn(
                      'flex flex-wrap items-baseline gap-x-1 gap-y-2',
                      personalDetails.align === 'center' && 'justify-center',
                      personalDetails.align === 'right' && 'justify-end'
                    )
              )}
              style={{
                color: 'var(--resume-text-color)',
                opacity: design.advanced?.dateLocationOpacity ?? 0.8,
                fontSize: 'var(--resume-font-size)',
              }}
            >
              {arrangement === 'icon'
                ? contactRows.map((item) => (
                    <div
                      key={item.key}
                      className={cn(
                        'flex min-w-0 max-w-full items-start gap-1.5',
                        !isClassicHeaderInSidebar && 'items-center'
                      )}
                    >
                      <span className={cn('shrink-0', isClassicHeaderInSidebar && 'mt-0.5')}>
                        {renderIcon(item.icon)}
                      </span>
                      {item.isLink ? (
                        <a
                          href={item.value.startsWith('http') ? item.value : `https://${item.value}`}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            'min-w-0',
                            design.advanced?.linkUnderline !== false && 'underline underline-offset-2',
                            isClassicHeaderInSidebar ? 'break-all leading-snug' : 'whitespace-nowrap'
                          )}
                          style={{
                            color:
                              design.advanced?.linkUseAccentBlue === false
                                ? 'var(--resume-text-color)'
                                : 'var(--resume-link-color)',
                            textDecorationColor:
                              design.advanced?.linkUseAccentBlue === false
                                ? 'color-mix(in srgb, var(--resume-text-color) 35%, transparent)'
                                : 'color-mix(in srgb, var(--resume-link-color) 35%, transparent)',
                          }}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span
                          className={cn(
                            'min-w-0 leading-snug',
                            isClassicHeaderInSidebar ? 'break-words' : 'whitespace-nowrap'
                          )}
                        >
                          {item.value}
                        </span>
                      )}
                    </div>
                  ))
                : contactRows.map((item, i) => (
                    <React.Fragment key={item.key}>
                      {i > 0 && (
                        <span
                          className="select-none px-1 text-slate-400"
                          style={{ opacity: (design.advanced?.dateLocationOpacity ?? 0.8) * 0.85 }}
                          aria-hidden
                        >
                          {contactSep}
                        </span>
                      )}
                      {item.isLink ? (
                        <a
                          href={item.value.startsWith('http') ? item.value : `https://${item.value}`}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            'min-w-0',
                            design.advanced?.linkUnderline !== false && 'underline underline-offset-2',
                            'break-all leading-snug'
                          )}
                          style={{
                            color:
                              design.advanced?.linkUseAccentBlue === false
                                ? 'var(--resume-text-color)'
                                : 'var(--resume-link-color)',
                            textDecorationColor:
                              design.advanced?.linkUseAccentBlue === false
                                ? 'color-mix(in srgb, var(--resume-text-color) 35%, transparent)'
                                : 'color-mix(in srgb, var(--resume-link-color) 35%, transparent)',
                          }}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span className="min-w-0 break-words leading-snug">{item.value}</span>
                      )}
                    </React.Fragment>
                  ))}
            </div>
          </div>
        </header>
      )}
    </>
  );
};

export default ResumePreview;