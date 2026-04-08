'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Plus,
    MoreVertical,
    Trash2,
    Edit3,
    Eye,
    Search,
    LayoutGrid,
    List,
    Clock,
    ChevronRight,
    X,
    Loader2,
    Briefcase,
    Zap,
    Sparkles,
    Upload,
    PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import type { ResumeData } from '@/lib/types';
import { TEMPLATES, type Template } from '@/lib/templates';
import { saveResumeData } from '@/lib/utils';
import { DEFAULT_DESIGN } from '@/lib/defaults';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
const ResumePreview = dynamic(() => import('@/components/ResumePreview'), {
    ssr: false,
    // Dashboard thumbnails should not block first paint.
    loading: () => null,
});
import { TEMPLATE_SPECS } from '@/lib/template-design-spec';

interface Resume {
    id: string;
    personalInfo: {
        fullName: string;
    };
    jobTitle: string;
    updatedAt: string;
    createdAt: string;
    design?: {
        templateId?: string;
    };
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, logout, loading: authLoading, initialized } = useAuth();
    const importInputRef = useRef<HTMLInputElement>(null);
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedPersona, setSelectedPersona] = useState<string>('all');

    useEffect(() => {
        // Avoid triggering a duplicate token refresh inside `apiClient` while AuthProvider is still initializing.
        if (!initialized || authLoading) return;
        if (!user) return;
        fetchResumes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialized, authLoading, user]);

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

    const fetchResumes = async () => {
        try {
            setLoading(true);
            const response = await apiClient('/api/resumes');
            if (response.ok) {
                const data = await response.json();
                // API already returns newest-first (updatedAt desc); skip redundant client sort.
                setResumes(data);
            }
        } catch (error) {
            console.error('Failed to fetch resumes:', error);
            toast.error('Failed to load resumes');
        } finally {
            setLoading(false);
        }
    };

    const normalizeImportedResume = (raw: unknown): ResumeData | null => {
        const base = (raw && typeof raw === 'object')
            ? (
                (raw as any).resumeData
                ?? (raw as any).data
                ?? raw
            )
            : null;

        if (!base || typeof base !== 'object') return null;

        const record = base as Record<string, any>;
        const personalInfo = record.personalInfo ?? {};
        const selectedSections = Array.isArray(record.selectedSections)
            ? record.selectedSections
            : ['personalInfo', 'summary', 'experience', 'education', 'skills'];

        return {
            ...record,
            personalInfo: {
                fullName: typeof personalInfo.fullName === 'string' ? personalInfo.fullName : '',
                email: typeof personalInfo.email === 'string' ? personalInfo.email : '',
                phone: typeof personalInfo.phone === 'string' ? personalInfo.phone : '',
                location: typeof personalInfo.location === 'string' ? personalInfo.location : '',
                linkedIn: typeof personalInfo.linkedIn === 'string' ? personalInfo.linkedIn : '',
                website: typeof personalInfo.website === 'string' ? personalInfo.website : '',
                summary: typeof personalInfo.summary === 'string' ? personalInfo.summary : '',
                yearsOfExperience: typeof personalInfo.yearsOfExperience === 'number' ? personalInfo.yearsOfExperience : 0,
            },
            experience: Array.isArray(record.experience) ? record.experience : [],
            education: Array.isArray(record.education) ? record.education : [],
            skills: Array.isArray(record.skills) ? record.skills : [],
            jobTitle: typeof record.jobTitle === 'string' ? record.jobTitle : '',
            jobDescription: typeof record.jobDescription === 'string' ? record.jobDescription : '',
            jobTarget: (record.jobTarget && typeof record.jobTarget === 'object')
                ? {
                    position: typeof record.jobTarget.position === 'string' ? record.jobTarget.position : '',
                    company: typeof record.jobTarget.company === 'string' ? record.jobTarget.company : '',
                    description: typeof record.jobTarget.description === 'string' ? record.jobTarget.description : '',
                }
                : { position: '', company: '', description: '' },
            design: (record.design && typeof record.design === 'object') ? record.design : DEFAULT_DESIGN,
            selectedSections,
        } as ResumeData;
    };

    const parseResumeTextToData = (text: string): ResumeData => {
        const lines = text
            .split(/\r?\n/)
            .map((line) => line.replace(/\s+/g, ' ').trim())
            .filter(Boolean);

        const isHeading = (line: string) => (
            /^(professional summary|summary|profile|work experience|experience|education|technical skills|skills|projects|certifications?)$/i.test(line)
            || /^[A-Z][A-Z\s&]{4,}$/.test(line)
        );

        const sectionAliases: Record<string, 'summary' | 'experience' | 'education' | 'skills' | 'other'> = {
            'professional summary': 'summary',
            summary: 'summary',
            profile: 'summary',
            'work experience': 'experience',
            experience: 'experience',
            education: 'education',
            'technical skills': 'skills',
            skills: 'skills',
            projects: 'other',
            certifications: 'other',
            certification: 'other',
        };

        let currentSection: 'summary' | 'experience' | 'education' | 'skills' | 'other' = 'other';
        const sections = {
            summary: [] as string[],
            experience: [] as string[],
            education: [] as string[],
            skills: [] as string[],
            other: [] as string[],
        };

        for (const line of lines) {
            const normalized = line.toLowerCase().replace(/[:\-]+$/, '').trim();
            const mapped = sectionAliases[normalized];
            if (mapped || isHeading(line)) {
                currentSection = mapped ?? 'other';
                continue;
            }
            sections[currentSection].push(line);
        }

        const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
        const phone = text.match(/(?:\+?\d[\d\s\-()]{7,}\d)/)?.[0] ?? '';
        const linkedIn = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0] ?? '';
        const website = text.match(/https?:\/\/(?!www\.linkedin\.com)[^\s]+/i)?.[0] ?? '';
        const location = text.match(/\b(?:chennai|bangalore|bengaluru|hyderabad|mumbai|pune|delhi|noida|coimbatore|kochi)\b/i)?.[0] ?? '';

        const possibleName = lines.find((line) =>
            line.length >= 3
            && line.length <= 60
            && !line.includes('@')
            && !/\d{6,}/.test(line)
            && !isHeading(line)
        ) ?? '';

        const summarySource = sections.summary.length > 0
            ? sections.summary.join(' ')
            : sections.other.slice(0, 12).join(' ');
        const summary = summarySource.slice(0, 700).trim();

        const skillTokens = (sections.skills.join(',') || sections.other.join(','))
            .split(/[,\u2022|/]/)
            .map((token) => token.trim())
            .filter((token) => token.length >= 2 && token.length <= 40)
            .slice(0, 20);

        const uniqueSkills = [...new Set(skillTokens)].map((name, index) => ({
            id: `skill-${index + 1}`,
            name,
            level: 'intermediate' as const,
            visible: true,
        }));

        const experienceText = sections.experience.join('\n').trim();
        const educationText = sections.education.join('\n').trim();
        const educationLines = sections.education;
        const detectedJobTitle = lines.find((line) =>
            /(developer|engineer|manager|analyst|designer|consultant|specialist|lead|intern)/i.test(line)
            && line.length <= 70
        ) ?? '';

        return {
            personalInfo: {
                fullName: possibleName,
                email,
                phone,
                location,
                linkedIn,
                website,
                summary,
                yearsOfExperience: 0,
            },
            experience: experienceText ? [{
                id: 'exp-1',
                company: '',
                position: detectedJobTitle || 'Professional Experience',
                startDate: '',
                endDate: '',
                current: false,
                description: experienceText.slice(0, 1800),
                achievements: [],
                visible: true,
            }] : [],
            education: educationText ? [{
                id: 'edu-1',
                institution: educationLines[0] || '',
                degree: educationLines[1] || '',
                field: educationLines[2] || '',
                startYear: '',
                endYear: '',
                gpa: '',
                visible: true,
            }] : [],
            skills: uniqueSkills,
            jobTitle: detectedJobTitle,
            jobDescription: '',
            jobTarget: { position: '', company: '', description: '' },
            design: DEFAULT_DESIGN,
            selectedSections: ['personalInfo', 'summary', 'experience', 'education', 'skills'],
        };
    };

    const createFallbackImportedResume = (fileName: string): ResumeData => {
        const cleanedName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
        return {
            personalInfo: {
                fullName: cleanedName,
                email: '',
                phone: '',
                location: '',
                linkedIn: '',
                website: '',
                summary: 'Imported file could not be auto-read completely. Please edit and fill your details.',
                yearsOfExperience: 0,
            },
            experience: [],
            education: [],
            skills: [],
            jobTitle: '',
            jobDescription: '',
            jobTarget: { position: '', company: '', description: '' },
            design: DEFAULT_DESIGN,
            selectedSections: ['personalInfo', 'summary', 'experience', 'education', 'skills'],
        };
    };

    const extractResumeTextFromFile = async (file: File): Promise<string> => {
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.pdf') || fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileName.endsWith('.txt')) {
            const formData = new FormData();
            formData.append('file', file);
            const response = await apiClient('/api/import-resume', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                return '';
            }

            const data = await response.json();
            return typeof data.text === 'string' ? data.text.trim() : '';
        }

        throw new Error('Unsupported file type');
    };

    const handleImportResumeClick = () => {
        importInputRef.current?.click();
    };

    const handleImportResumeFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Allow re-selecting the same file after an error.
        event.target.value = '';
        if (!file) return;

        try {
            const lowerName = file.name.toLowerCase();
            let normalizedResume: ResumeData | null = null;

            if (lowerName.endsWith('.json')) {
                const fileText = await file.text();
                const parsed = JSON.parse(fileText);
                normalizedResume = normalizeImportedResume(parsed);
            } else {
                const extractedText = await extractResumeTextFromFile(file);
                normalizedResume = extractedText
                    ? parseResumeTextToData(extractedText)
                    : createFallbackImportedResume(file.name);
            }

            if (!normalizedResume) {
                throw new Error('Invalid resume file format');
            }

            saveResumeData(normalizedResume);
            setShowTemplateModal(false);
            if (normalizedResume.personalInfo.summary.includes('could not be auto-read')) {
                toast.warning('Imported with limited parsing. Please review and edit details.');
            } else {
                toast.success('Resume imported successfully');
            }
            router.push(`/builder?imported=1&t=${Date.now()}`);
        } catch (error) {
            console.error('Import resume failed:', error);
            toast.error('Could not import file. Use JSON, PDF, DOCX, DOC, or TXT.');
        }
    };

    const handleDeleteResume = async (id: string) => {
        if (!confirm('Are you sure you want to delete this resume?')) return;

        try {
            const response = await apiClient(`/api/resumes?id=${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setResumes(resumes.filter(r => r.id !== id));
                toast.success('Resume deleted successfully');
            } else {
                toast.error('Failed to delete resume');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('An error occurred');
        }
    };

    // Filter and deduplicate resumes
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredResumes = resumes
        .filter((r) => {
            if (!normalizedQuery) return true;
            const fullName = r.personalInfo?.fullName?.toLowerCase() || '';
            const jobTitle = r.jobTitle?.toLowerCase() || '';
            return fullName.includes(normalizedQuery) || jobTitle.includes(normalizedQuery);
        })
        .filter((resume, index, self) =>
            index === self.findIndex((r) => r.id === resume.id)
        );

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-slate-900">
            {/* Dashboard Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="gradient-primary p-2 rounded-lg shadow-md group-hover:shadow-lg transition-all">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight hidden sm:block text-slate-900">
                                MyDream<span className="gradient-text">Resume</span>
                            </span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold text-orange-600 bg-orange-50 rounded-lg">
                                Resumes
                            </Link>
                            <Link href="/templates" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                                Templates
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                            <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[10px] text-white font-bold">
                                {user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">
                                {user?.email}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">My Resumes</h1>
                        <p className="text-slate-500">Create, manage and track your job applications</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search resumes..."
                                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                        <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Loading your resumes...</p>
                    </div>
                ) : (
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        : "flex flex-col gap-4"
                    }>
                        {/* New Resume Card */}
                        <button
                            type="button"
                            onClick={() => setShowTemplateModal(true)}
                            className={viewMode === 'grid'
                                ? "group relative aspect-[210/297] bg-[#f8f9fa] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-5 hover:border-slate-300 hover:bg-slate-100 active:scale-[0.99] transition-all overflow-hidden"
                                : "group bg-white border-2 border-dashed border-slate-200 rounded-xl p-6 flex items-center justify-center gap-3 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] transition-all font-semibold"
                            }
                        >
                            <div className="p-4 bg-white rounded-2xl group-hover:scale-110 transition-transform shadow-sm flex items-center justify-center">
                                <Plus className="h-10 w-10 text-slate-300 group-hover:text-slate-400 transition-colors" strokeWidth={1} />
                            </div>
                            <span className="text-[#64748b] font-bold text-lg group-hover:text-slate-900 transition-colors">
                                New Resume
                            </span>
                        </button>

                        {/* Resume List */}
                        {filteredResumes.map((resume) => (
                            <ResumeCard
                                key={resume.id}
                                resume={resume}
                                viewMode={viewMode}
                                onDelete={() => handleDeleteResume(resume.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Empty State when no resumes match search */}
                {!loading && filteredResumes.length === 0 && searchQuery && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm mt-6">
                        <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-1">No resumes found</h3>
                        <p className="text-slate-500">Try adjusting your search query</p>
                    </div>
                )}
            </main>

            {/* Template Modal */}
            <AnimatePresence>
                {showTemplateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTemplateModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 10 }}
                            className="relative w-full max-w-7xl max-h-[95vh] bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden"
                        >
                            <div className="pt-12 px-12 pb-6 flex flex-col gap-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[34px] font-extrabold text-[#2d2e2e] tracking-[-0.02em]">Create new resume</h2>
                                    <button
                                        onClick={() => setShowTemplateModal(false)}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-full transition-all"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* Persona Filters matching screenshot perfectly */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedPersona('all')}
                                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-[13px] transition-all border ${selectedPersona === 'all' ? 'bg-[#3b3c3c] text-white border-[#3b3c3c] shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                                    >
                                        All Templates
                                    </button>
                                    <button
                                        onClick={() => setSelectedPersona('corporate')}
                                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-extrabold text-[13px] transition-all border ${selectedPersona === 'corporate' ? 'bg-[#3b3c3c] text-white border-[#3b3c3c] shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                                    >
                                        <Briefcase size={16} strokeWidth={2.5} /> Simple
                                    </button>
                                    <button
                                        onClick={() => setSelectedPersona('modern')}
                                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-extrabold text-[13px] transition-all border ${selectedPersona === 'modern' ? 'bg-[#3b3c3c] text-white border-[#3b3c3c] shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                                    >
                                        <Zap size={16} strokeWidth={2.5} /> Modern
                                    </button>
                                    <button
                                        onClick={() => setSelectedPersona('creative')}
                                        className={`flex items-center gap-2 px-5 py-2 rounded-lg font-extrabold text-[13px] transition-all border ${selectedPersona === 'creative' ? 'bg-[#3b3c3c] text-white border-[#3b3c3c] shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                                    >
                                        <Sparkles size={16} strokeWidth={2.5} /> Creative
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-12 pb-12">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-x-8 gap-y-10">
                                    {/* Action items stacked in the first slots like the image */}
                                    <div className="flex flex-col gap-4">
                                        <input
                                            ref={importInputRef}
                                            type="file"
                                            // Keep extension-only filter for better Windows file picker compatibility.
                                            accept=".pdf,.doc,.docx,.txt,.json"
                                            className="hidden"
                                            onChange={handleImportResumeFile}
                                        />
                                        <ActionOption
                                            title="New blank"
                                            icon={<Plus size={28} className="text-slate-400 group-hover:text-slate-600" />}
                                            onClick={() => router.push('/builder')}
                                        />
                                        <ActionOption
                                            title="Import Resume"
                                            icon={<Upload size={24} className="text-slate-400 group-hover:text-slate-600" />}
                                            onClick={handleImportResumeClick}
                                        />
                                    </div>

                                    {TEMPLATES
                                        .filter(t => selectedPersona === 'all' || (t as any).persona === selectedPersona)
                                        .map((template) => (
                                            <TemplateOption
                                                key={template.id}
                                                template={template}
                                                onSelect={(tid) => {
                                                    router.push(`/builder?template=${tid}`);
                                                    setShowTemplateModal(false);
                                                }}
                                            />
                                        ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ResumeCard({ resume, viewMode, onDelete }: { resume: Resume, viewMode: 'grid' | 'list', onDelete: () => void }) {
    const router = useRouter();
    const thumbRef = useRef<HTMLDivElement>(null);
    const [thumbVisible, setThumbVisible] = useState(false);

    useEffect(() => {
        if (viewMode !== 'grid') return;
        const el = thumbRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setThumbVisible(true);
                    io.disconnect();
                }
            },
            { rootMargin: '200px', threshold: 0 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [viewMode, resume.id]);

    const formattedDate = new Date(resume.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    if (viewMode === 'list') {
        return (
            <div
                className="group bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-lg hover:border-slate-300 transition-shadow duration-200"
            >
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-16 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors border border-slate-100">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 truncate">
                            {resume.personalInfo?.fullName || 'Untitled Resume'}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-medium text-slate-700">{resume.jobTitle || 'No Title'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <Clock className="h-3 w-3" />
                            Edited {formattedDate}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                        onClick={() => router.push(`/builder?id=${resume.id}`)}
                    >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl border-slate-100">
                            <DropdownMenuItem className="gap-2 cursor-pointer py-2" onClick={() => router.push(`/builder?id=${resume.id}`)}>
                                <Edit3 className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600 cursor-pointer py-2" onClick={onDelete}>
                                <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    }

    return (
        <div className="group flex flex-col gap-3">
            <div
                ref={thumbRef}
                className="relative aspect-[210/297] bg-[#f8f9fa] border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center"
                onClick={() => router.push(`/builder?id=${resume.id}`)}
            >
                {thumbVisible ? (
                    <div className="absolute inset-0 pointer-events-none select-none flex justify-center">
                        <div className="origin-top mt-4 shadow-2xl" style={{
                            width: '794px',
                            height: '1123px',
                            transform: 'scale(0.3)',
                        }}>
                            <ResumePreview
                                data={resume as any}
                                selectedSections={['personalInfo', 'summary', 'experience', 'education', 'skills', 'projects', 'languages']}
                                isSaved={true}
                                showControls={false}
                                thumbnailMode
                            />
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-slate-200/50 animate-pulse" aria-hidden />
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button className="gradient-primary text-white font-bold px-8 py-2.5 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all text-sm">
                        Open in Builder
                    </Button>
                </div>
            </div>

            <div className="flex items-start justify-between px-1">
                <div className="min-w-0">
                    <h3 className="font-extrabold text-[#2d2e2e] text-[15px] truncate">
                        {resume.personalInfo?.fullName || 'Untitled Resume'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-[0.05em] mt-0.5">
                        Edited {formattedDate} • A4
                    </p>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1.5 hover:bg-slate-100 rounded-full transition-colors mt-0.5">
                            <MoreVertical className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-slate-100 w-40">
                        <DropdownMenuItem className="gap-2 cursor-pointer py-2" onClick={() => router.push(`/builder?id=${resume.id}`)}>
                            <Edit3 className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600 cursor-pointer py-2" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

function ActionOption({ title, icon, onClick }: { title: string, icon: React.ReactNode, onClick: () => void }) {
    return (
        <div
            className="flex-1 min-h-[140px] flex flex-col gap-3 group cursor-pointer hover:opacity-95 transition-opacity"
            onClick={onClick}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            role="button"
            tabIndex={0}
        >
            <div
                className="flex-1 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 transition-colors group-hover:bg-slate-100 group-hover:border-slate-300"
            >
                <div>{icon}</div>
                <h4 className="font-bold text-[#64748b] text-[15px] group-hover:text-slate-900 transition-colors">{title}</h4>
            </div>
        </div>
    );
}

function TemplateOption({ template, onSelect }: { template: Template, onSelect: (id: string) => void }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    const isCreative = TEMPLATE_SPECS.find((s) => s.id === template.id)?.persona === 'creative';
    const [previewBase, setPreviewBase] = useState<any | null>(null);

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setInView(true);
                    io.disconnect();
                }
            },
            { rootMargin: '240px', threshold: 0 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [template.id]);

    // Lazy-load heavy preview seed data only when the card is about to become visible.
    useEffect(() => {
        if (!inView) return;
        let cancelled = false;

        (async () => {
            const mod = isCreative
                ? await import('@/lib/seed/creativeShowcaseResume')
                : await import('@/lib/seed/atsOptimizedResume');

            if (cancelled) return;
            setPreviewBase(mod.default);
        })();

        return () => {
            cancelled = true;
        };
    }, [inView, isCreative, template.id]);

    return (
        <div className="group flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-200">
            <div
                ref={cardRef}
                className="relative aspect-[210/297] bg-[#f8f9fa] rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer group/card flex justify-center"
                onClick={() => onSelect(template.id)}
            >
                {inView && previewBase ? (
                    <div className="absolute inset-0 pointer-events-none select-none flex justify-center">
                        <div className="origin-top mt-4 shadow-2xl" style={{
                            width: '794px',
                            height: '1123px',
                            transform: 'scale(0.3)',
                        }}>
                            <ResumePreview
                                data={{ ...previewBase, design: template.design }}
                                selectedSections={isCreative ? ['personalInfo', 'summary', 'experience', 'education', 'skills', 'projects', 'languages'] : ['personalInfo', 'summary', 'experience', 'education', 'skills']}
                                isSaved={true}
                                showControls={false}
                                thumbnailMode
                            />
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-slate-200/50 animate-pulse" aria-hidden />
                )}

                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/5 transition-all flex items-center justify-center opacity-0 group-hover/card:opacity-100">
                    <Button className="gradient-primary text-white font-bold px-8 py-2.5 rounded-full shadow-lg transform translate-y-4 group-hover/card:translate-y-0 transition-all text-sm">
                        Use Template
                    </Button>
                </div>
            </div>

            <div className="px-1 text-center mt-1">
                <h4 className="font-extrabold text-[#2d2e2e] text-[11px] uppercase tracking-[0.12em]">{template.name}</h4>
            </div>
        </div>
    );
}
