import { ResumeData } from './types';
import type { ResumeDesign } from './types';
import { isPageBreakToken } from './page-break-utils';

/** A4 / Letter at 96 DPI — must match preview pagination, `ResumePage`, and Puppeteer PDF. */
export function getResumeSheetPixelSize(
  pageFormat: 'A4' | 'Letter' | string | undefined
): { width: number; height: number } {
  return pageFormat === 'Letter'
    ? { width: 816, height: 1056 }
    : { width: 794, height: 1123 };
}

/** Sections that go in the sidebar for two-column / mix layouts */
const SIDEBAR_SECTIONS = ['skills', 'languages', 'interests', 'certificates'];

export interface DistributedBlocks {
    main: ResumeBlock[];
    sidebar: ResumeBlock[];
}

export type BlockType =
    | 'header'
    | 'section-title'
    | 'section-item'
    | 'section-group' // For grouped items like skills
    | 'spacer'
    | 'page-break'; // Zero-height marker; pagination flushes before next block

export interface ResumeBlock {
    id: string;
    type: BlockType;
    sectionId: string;
    content?: any; // The data needed to render this block
}

// Helper to generate a unique ID
const generateId = (prefix: string, index?: number) => `${prefix}-${index ?? Math.random().toString(36).substr(2, 9)}`;

// Helper to split HTML into chunks of paragraphs and list items for better pagination
const splitHtmlIntoChunks = (html: string): { content: string; type: 'bullet' | 'text' }[] => {
    if (!html) return [];

    // Naive but effective split that captures both <li> items and surrounding content
    const chunks: { content: string; type: 'bullet' | 'text' }[] = [];

    // Remove outer ul/ol tags but preserve content
    const cleanedHtml = html.replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '');

    // Split by <li> tags while capturing the tags themselves
    const parts = cleanedHtml.split(/(<li[^>]*>[\s\S]*?<\/li>)/g);

    parts.forEach(part => {
        if (!part) return;

        const trimmed = part.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('<li')) {
            // Extract content inside <li>
            const content = trimmed.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, '$1').trim();
            if (content) {
                chunks.push({ content, type: 'bullet' });
            }
        } else {
            chunks.push({ content: trimmed, type: 'text' });
        }
    });

    return chunks;
};

export const flattenResumeData = (data: ResumeData, selectedSections: string[]): ResumeBlock[] => {
    const blocks: ResumeBlock[] = [];
    const hiddenSections = data.hiddenSections || [];

    // 1. Personal Info (Header)
    if (selectedSections.includes('personalInfo') && !hiddenSections.includes('personalInfo')) {
        blocks.push({
            id: 'personal-info',
            type: 'header',
            sectionId: 'personalInfo',
            content: data.personalInfo
        });
    }

    // Helper to add standard sections
    const addSection = (sectionId: string) => {
        if (hiddenSections.includes(sectionId)) return;

        switch (sectionId) {
            case 'summary':
            case 'job':
                if (data.personalInfo.summary) {
                    blocks.push({
                        id: 'summary-title',
                        type: 'section-title',
                        sectionId: 'summary',
                        content: data.sectionLabels?.['summary'] || 'Professional Summary'
                    });
                    blocks.push({
                        id: 'summary-content',
                        type: 'section-item',
                        sectionId: 'summary',
                        content: data.personalInfo.summary
                    });
                }
                break;

            case 'experience':
                const visibleExp = (data.experience || []).filter(item => item.visible !== false);
                if (visibleExp.length) {
                    blocks.push({
                        id: 'experience-title',
                        type: 'section-title',
                        sectionId: 'experience',
                        content: data.sectionLabels?.['experience'] || 'Work Experience'
                    });
                    visibleExp.forEach((exp, idx) => {
                        const hasDescription = !!exp.description;
                        blocks.push({
                            id: `experience-header-${exp.id || idx}`,
                            type: 'section-item',
                            sectionId: 'experience',
                            content: { ...exp, _renderType: 'header', _isLastChunk: !hasDescription }
                        });

                        if (hasDescription) {
                            const chunks = splitHtmlIntoChunks(exp.description);
                            if (chunks.length > 0) {
                                chunks.forEach((chunk, cIdx) => {
                                    const isLast = cIdx === chunks.length - 1;
                                    blocks.push({
                                        id: `experience-chunk-${exp.id || idx}-${cIdx}`,
                                        type: 'section-item',
                                        sectionId: 'experience',
                                        content: {
                                            ...exp,
                                            description: chunk.content,
                                            _renderType: chunk.type === 'bullet' ? 'bullet' : 'description',
                                            _isLastChunk: isLast
                                        }
                                    });
                                });
                            } else {
                                blocks.push({
                                    id: `experience-desc-${exp.id || idx}`,
                                    type: 'section-item',
                                    sectionId: 'experience',
                                    content: { ...exp, _renderType: 'description', _isLastChunk: true }
                                });
                            }
                        }
                    });
                }
                break;

            case 'education':
                const visibleEdu = (data.education || []).filter(item => item.visible !== false);
                if (visibleEdu.length) {
                    blocks.push({
                        id: 'education-title',
                        type: 'section-title',
                        sectionId: 'education',
                        content: data.sectionLabels?.['education'] || 'Education'
                    });
                    visibleEdu.forEach((edu, idx) => {
                        blocks.push({
                            id: `education-header-${edu.id || idx}`,
                            type: 'section-item',
                            sectionId: 'education',
                            content: { ...edu, _renderType: 'header' }
                        });
                    });
                }
                break;

            case 'projects':
                const visibleProj = (data.projects || []).filter(item => item.visible !== false);
                if (visibleProj.length) {
                    blocks.push({
                        id: 'projects-title',
                        type: 'section-title',
                        sectionId: 'projects',
                        content: data.sectionLabels?.['projects'] || 'Projects'
                    });
                    visibleProj.forEach((proj, idx) => {
                        const hasDescription = !!proj.description;
                        blocks.push({
                            id: `projects-header-${proj.id || idx}`,
                            type: 'section-item',
                            sectionId: 'projects',
                            content: { ...proj, _renderType: 'header', _isLastChunk: !hasDescription }
                        });

                        if (hasDescription && proj.description) {
                            const chunks = splitHtmlIntoChunks(proj.description);
                            if (chunks.length > 0) {
                                chunks.forEach((chunk, cIdx) => {
                                    const isLast = cIdx === chunks.length - 1;
                                    blocks.push({
                                        id: `projects-chunk-${proj.id || idx}-${cIdx}`,
                                        type: 'section-item',
                                        sectionId: 'projects',
                                        content: {
                                            ...proj,
                                            description: chunk.content,
                                            _renderType: chunk.type === 'bullet' ? 'bullet' : 'description',
                                            _isLastChunk: isLast
                                        }
                                    });
                                });
                            } else {
                                blocks.push({
                                    id: `projects-desc-${proj.id || idx}`,
                                    type: 'section-item',
                                    sectionId: 'projects',
                                    content: { ...proj, _renderType: 'description', _isLastChunk: true }
                                });
                            }
                        }
                    });
                }
                break;

            case 'skills':
                const visibleSkills = (data.skills || []).filter(item => item.visible !== false);
                if (visibleSkills.length) {
                    blocks.push({
                        id: 'skills-title',
                        type: 'section-title',
                        sectionId: 'skills',
                        content: data.sectionLabels?.['skills'] || 'Technical Skills'
                    });
                    blocks.push({
                        id: 'skills-content',
                        type: 'section-group',
                        sectionId: 'skills',
                        content: visibleSkills
                    });
                }
                break;

            case 'softSkills':
                const visibleSoftSkills = (data.softSkills || []).filter(item => item.visible !== false);
                if (visibleSoftSkills.length) {
                    blocks.push({
                        id: 'softSkills-title',
                        type: 'section-title',
                        sectionId: 'softSkills',
                        content: data.sectionLabels?.['softSkills'] || 'Soft Skills'
                    });
                    blocks.push({
                        id: 'softSkills-content',
                        type: 'section-group',
                        sectionId: 'softSkills',
                        content: visibleSoftSkills
                    });
                }
                break;

            case 'certificates':
                const visibleCerts = (data.certificates || []).filter(item => item.visible !== false);
                if (visibleCerts.length) {
                    blocks.push({
                        id: 'certificates-title',
                        type: 'section-title',
                        sectionId: 'certificates',
                        content: data.sectionLabels?.['certificates'] || 'Certifications'
                    });
                    visibleCerts.forEach((cert, idx) => {
                        blocks.push({
                            id: `certificates-${cert.id || idx}`,
                            type: 'section-item',
                            sectionId: 'certificates',
                            content: cert
                        });
                    });
                }
                break;

            case 'languages':
                const visibleLangs = (data.languages || []).filter(item => item.visible !== false);
                if (visibleLangs.length) {
                    blocks.push({
                        id: 'languages-title',
                        type: 'section-title',
                        sectionId: 'languages',
                        content: data.sectionLabels?.['languages'] || 'Languages'
                    });
                    blocks.push({
                        id: 'languages-content',
                        type: 'section-group',
                        sectionId: 'languages',
                        content: visibleLangs
                    });
                }
                break;

            case 'interests':
                const visibleInterests = (data.interests || []).filter(item => item.visible !== false);
                if (visibleInterests.length) {
                    blocks.push({
                        id: 'interests-title',
                        type: 'section-title',
                        sectionId: 'interests',
                        content: data.sectionLabels?.['interests'] || 'Interests'
                    });
                    blocks.push({
                        id: 'interests-content',
                        type: 'section-group',
                        sectionId: 'interests',
                        content: visibleInterests
                    });
                }
                break;

            case 'awards':
                const visibleAwards = (data.awards || []).filter(item => item.visible !== false);
                if (visibleAwards.length) {
                    blocks.push({
                        id: 'awards-title',
                        type: 'section-title',
                        sectionId: 'awards',
                        content: data.sectionLabels?.['awards'] || 'Honors & Awards'
                    });
                    visibleAwards.forEach((award, idx) => {
                        blocks.push({
                            id: `awards-${award.id || idx}`,
                            type: 'section-item',
                            sectionId: 'awards',
                            content: award
                        });
                    });
                }
                break;

            case 'organisations':
                const visibleOrgs = (data.organisations || []).filter(item => item.visible !== false);
                if (visibleOrgs.length) {
                    blocks.push({
                        id: 'organisations-title',
                        type: 'section-title',
                        sectionId: 'organisations',
                        content: data.sectionLabels?.['organisations'] || 'Organizations'
                    });
                    visibleOrgs.forEach((org, idx) => {
                        blocks.push({
                            id: `organisations-${org.id || idx}`,
                            type: 'section-item',
                            sectionId: 'organisations',
                            content: org
                        });
                    });
                }
                break;

            case 'publications':
                const visiblePubs = (data.publications || []).filter(item => item.visible !== false);
                if (visiblePubs.length) {
                    blocks.push({
                        id: 'publications-title',
                        type: 'section-title',
                        sectionId: 'publications',
                        content: data.sectionLabels?.['publications'] || 'Publications'
                    });
                    visiblePubs.forEach((pub, idx) => {
                        blocks.push({
                            id: `publications-${pub.id || idx}`,
                            type: 'section-item',
                            sectionId: 'publications',
                            content: pub
                        });
                    });
                }
                break;

            case 'references':
                const visibleRefs = (data.references || []).filter(item => item.visible !== false);
                if (visibleRefs.length) {
                    blocks.push({
                        id: 'references-title',
                        type: 'section-title',
                        sectionId: 'references',
                        content: data.sectionLabels?.['references'] || 'References'
                    });
                    blocks.push({
                        id: 'references-content',
                        type: 'section-group',
                        sectionId: 'references',
                        content: visibleRefs
                    });
                }
                break;

            case 'declaration':
                if (data.declaration?.statement && data.declaration.visible !== false) {
                    blocks.push({
                        id: 'declaration-content',
                        type: 'section-group',
                        sectionId: 'declaration',
                        content: data.declaration
                    })
                }
                break;

            case 'custom':
                if (data.custom?.title && data.custom?.content) {
                    blocks.push({
                        id: 'custom-title',
                        type: 'section-title',
                        sectionId: 'custom',
                        content: data.sectionLabels?.['custom'] || data.custom.title
                    });
                    blocks.push({
                        id: 'custom-content',
                        type: 'section-item',
                        sectionId: 'custom',
                        content: data.custom.content
                    });
                }
                break;
        }
    };

    selectedSections.forEach((sectionId) => {
        if (sectionId === 'personalInfo') return;
        if (isPageBreakToken(sectionId)) {
            blocks.push({
                id: sectionId,
                type: 'page-break',
                sectionId,
            });
            return;
        }
        addSection(sectionId);
    });

    return blocks;
};

/**
 * Distribute blocks into main and sidebar columns based on layout.
 * - one column + top header: all blocks in main
 * - two/mix + left/right: header and SIDEBAR_SECTIONS in sidebar, rest in main
 */
export function distributeBlocksByLayout(
    blocks: ResumeBlock[],
    layout: ResumeDesign['layout']
): DistributedBlocks {
    if (layout.columns === 'one') {
        return { main: blocks, sidebar: [] };
    }

    const headerInSidebar = layout.headerPosition === 'left' || layout.headerPosition === 'right';
    const sidebar: ResumeBlock[] = [];
    const main: ResumeBlock[] = [];

    for (const block of blocks) {
        /** Manual page break: flush both columns so the next section starts on a new sheet (two-column resumes). */
        if (block.type === 'page-break') {
            main.push(block);
            sidebar.push({
                ...block,
                id: `${block.id}__col2`,
            });
            continue;
        }

        const isHeader = block.sectionId === 'personalInfo';
        const isSidebarSection = SIDEBAR_SECTIONS.includes(block.sectionId);

        if (isHeader && headerInSidebar) {
            sidebar.push(block);
        } else if (isSidebarSection) {
            sidebar.push(block);
        } else {
            main.push(block);
        }
    }

    return { main, sidebar };
}
