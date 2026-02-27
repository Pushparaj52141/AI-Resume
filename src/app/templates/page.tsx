'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TEMPLATES, type Template } from '@/lib/templates';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { loadAllGoogleFonts } from '@/lib/utils';
import { Eye, X } from 'lucide-react';
import ResumePreview from '@/components/ResumePreview';
import atsOptimizedResume from '@/lib/seed/atsOptimizedResume';
import jaganrajResume from '@/lib/seed/jaganrajResume';

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

function TemplateThumbnail({ template }: { template: Template }) {
  const isCreative = (template as any).persona === 'creative';
  const previewData = {
    ...(isCreative ? jaganrajResume : atsOptimizedResume),
    design: template.design
  };

  return (
    <div
      className="w-full aspect-[210/297] bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col transition-all group-hover:shadow-md pointer-events-none select-none relative"
    >
      <div className="absolute inset-0">
        <div className="origin-top-left" style={{
          width: '794px',
          height: '1123px',
          transform: 'scale(0.3)', // Adjust scale for gallery width
        }}>
          <ResumePreview
            data={previewData}
            selectedSections={isCreative ? ALL_SECTIONS : ['personalInfo', 'summary', 'experience', 'education', 'skills']}
            isSaved={true}
            showControls={false}
          />
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [previewTemplate, setPreviewTemplate] = React.useState<Template | null>(null);
  const [userResumes, setUserResumes] = React.useState<Record<string, any>>({});

  useEffect(() => {
    loadAllGoogleFonts();

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

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-gradient-to-b from-background to-orange-50/30">
      <motion.div
        className="w-full max-w-5xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          href="/"
          className="flex items-center gap-3 justify-center mb-8 hover:opacity-90"
        >
          <div className="gradient-primary p-2.5 rounded-xl shadow-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold gradient-text text-xl">Resume AI Builder</span>
        </Link>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose a template</h1>
          <p className="text-muted-foreground">
            Select a design to start building your resume. You can switch templates later in the builder.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="glass-card rounded-2xl border border-orange-200/30 shadow-xl overflow-hidden hover:shadow-2xl hover:border-orange-300/50 transition-all group"
            >
              <div className="p-4 bg-slate-50/50 border-b border-slate-200/50">
                <TemplateThumbnail template={template} />
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-foreground mb-1">{template.name}</h2>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.description}</p>
                <div className="flex gap-2">
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
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user?.email}</span>
        </p>
      </motion.div>

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

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/30 flex justify-center">
              <div className="pointer-events-none select-none transform origin-top scale-[0.6] sm:scale-75 lg:scale-90 transition-transform flex flex-col gap-8 pb-20">
                <ResumePreview
                  data={userResumes[previewTemplate.id] || {
                    ...(previewTemplate.persona === 'creative' ? jaganrajResume : atsOptimizedResume),
                    jobTitle: `${previewTemplate.name} Template`,
                    design: previewTemplate.design
                  }}
                  selectedSections={previewTemplate.persona === 'creative' ? ALL_SECTIONS : ['personalInfo', 'summary', 'experience', 'education', 'skills']}
                  isSaved={!!userResumes[previewTemplate.id] || previewTemplate.id === 'jaganraj'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
