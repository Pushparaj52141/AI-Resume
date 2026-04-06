'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TEMPLATES, type Template } from '@/lib/templates';
import { TEMPLATE_SPECS } from '@/lib/template-design-spec';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { Eye, X } from 'lucide-react';
import ResumePreview from '@/components/ResumePreview';
import atsOptimizedResume from '@/lib/seed/atsOptimizedResume';
import creativeShowcaseResume from '@/lib/seed/creativeShowcaseResume';

const ALL_SECTIONS = [
  'personalInfo',
  'summary',
  'experience',
  'education',
  'skills',
  'softSkills',
  'projects',
  'certificates',
  'languages',
  'interests',
  'awards',
  'organisations',
  'publications',
  'references',
  'declaration'
];

/** A4 page at 96dpi — must match ResumePreview / ResumePage */
const PAGE_W = 794;
const PAGE_H = 1123;

const TemplateThumbnail = memo(function TemplateThumbnail({ template }: { template: Template }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);
  const [inView, setInView] = useState(false);

  const isCreative =
    TEMPLATE_SPECS.find((s) => s.id === template.id)?.persona === 'creative';
  const previewData = {
    ...(isCreative ? creativeShowcaseResume : atsOptimizedResume),
    design: template.design
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!inView) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / PAGE_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [inView]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[210/297] overflow-hidden rounded-lg bg-white shadow-[0_2px_14px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.05)] ring-1 ring-slate-900/[0.04] transition-shadow group-hover:shadow-[0_6px_24px_rgba(15,23,42,0.12)] pointer-events-none select-none"
      title="A4 (210 × 297 mm) preview"
    >
      {!inView ? (
        <div className="absolute inset-0 bg-slate-100 animate-pulse" aria-hidden />
      ) : (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            transform: `scale(${scale})`,
          }}
        >
          <div className="overflow-hidden" style={{ width: PAGE_W, height: PAGE_H }}>
            <ResumePreview
              data={previewData}
              selectedSections={
                isCreative
                  ? ALL_SECTIONS
                  : ['personalInfo', 'summary', 'experience', 'education', 'skills']
              }
              isSaved={true}
              showControls={false}
              thumbnailMode
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [previewTemplate, setPreviewTemplate] = React.useState<Template | null>(null);
  const [userResumes, setUserResumes] = React.useState<Record<string, any>>({});

  useEffect(() => {
    // Fetch user's resumes to show actual content in previews if available
    const fetchUserResumes = async () => {
      try {
        const response = await apiClient('/api/resumes');
        if (response.ok) {
          const resumes = await response.json();
          const map: Record<string, any> = {};
          resumes.forEach((r: any) => {
            if (r.design?.templateId) {
              map[r.design.templateId] = r;
            }
          });
          setUserResumes(map);
        }
      } catch (error) {
        console.error('Failed to fetch user resumes:', error);
      }
    };

    if (user) {
      fetchUserResumes();
    }
  }, [user]);

  const handleSelectTemplate = (templateId: string) => {
    router.push(`/builder?template=${templateId}`);
  };

  const backHref = user ? '/dashboard' : '/';
  const backLabel = user ? 'Back to dashboard' : 'Back to home';

  return (
    <div className="min-h-screen px-4 py-12 bg-gradient-to-b from-slate-100 via-background to-slate-100/80">
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        <div className="mb-6">
          <Button variant="outline" size="sm" asChild className="rounded-xl border-slate-200 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 shadow-sm">
            <Link href={backHref} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span>Back</span>
              <span className="sr-only">{` — ${backLabel}`}</span>
            </Link>
          </Button>
        </div>

        <Link
          href="/"
          className="flex items-center gap-3 justify-center mb-8 hover:opacity-90"
        >
          <div className="gradient-primary p-2.5 rounded-xl shadow-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">
            MyDream<span className="gradient-text">Resume</span>
          </span>
        </Link>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose a template</h1>
          <p className="text-muted-foreground">
            Select a design to start building your resume. You can switch templates later in the builder.
          </p>
        </div>

        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))] gap-6 items-stretch">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="glass-card min-w-0 rounded-2xl border border-orange-200/30 shadow-xl overflow-hidden hover:shadow-2xl hover:border-orange-300/50 transition-shadow duration-200 group flex flex-col h-full min-h-0"
            >
              <div className="shrink-0 border-b border-slate-300/40 bg-[#d8dce3] p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                <TemplateThumbnail template={template} />
              </div>
              <div className="p-5 flex flex-col flex-1 min-h-0">
                <h2 className="text-lg font-bold text-foreground mb-1 line-clamp-2">{template.name}</h2>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1 min-h-[2.75rem]">
                  {template.description}
                </p>
                <div className="flex gap-2 mt-auto shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1 border-orange-200/50 hover:bg-orange-50 hover:text-orange-600 transition-all font-semibold glass-button"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    onClick={() => handleSelectTemplate(template.id)}
                    className="flex-[2] gradient-primary text-white font-semibold group-hover:opacity-95 transition-opacity"
                  >
                    Use Template
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user?.email}</span>
        </p>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewTemplate(null)}>
          <div
            className="bg-slate-100 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10">
              <div className="flex flex-col">
                <h3 className="font-bold text-lg">{previewTemplate.name}</h3>
                <p className="text-xs text-muted-foreground">{previewTemplate.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleSelectTemplate(previewTemplate.id)}
                  className="gradient-primary text-white font-semibold shadow-sm"
                >
                  Use This Template
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewTemplate(null)}
                  className="rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-1 justify-center overflow-y-auto bg-transparent px-3 py-6 sm:px-6 sm:py-8">
              <div className="pointer-events-none flex w-full max-w-4xl origin-top scale-[0.52] select-none transition-transform sm:scale-[0.62] md:scale-[0.72] lg:scale-[0.8]">
                <ResumePreview
                  data={userResumes[previewTemplate.id] || {
                    ...(TEMPLATE_SPECS.find((s) => s.id === previewTemplate.id)?.persona === 'creative'
                      ? creativeShowcaseResume
                      : atsOptimizedResume),
                    jobTitle: `${previewTemplate.name} Template`,
                    design: previewTemplate.design
                  }}
                  selectedSections={
                    TEMPLATE_SPECS.find((s) => s.id === previewTemplate.id)?.persona === 'creative'
                      ? ALL_SECTIONS
                      : ['personalInfo', 'summary', 'experience', 'education', 'skills']
                  }
                  isSaved={!!userResumes[previewTemplate.id]}
                  showControls={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
