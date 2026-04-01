"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
    LayoutGrid,
    Layout,
    Maximize,
    Type,
    Palette,
    User,
    ChevronDown,
    Check,
    RotateCcw,
    Sliders,
    Settings2,
    GripVertical,
    Undo2,
    Redo2,
    Plus,
    Minus,
    Lock,
    ListOrdered,
    Layers,
    FileText,
    Scissors,
    Trash2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link2,
    ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResumeDesign } from '@/lib/types';
import { DEFAULT_DESIGN } from '@/lib/defaults';
import { TEMPLATES, type Template } from '@/lib/templates';
import { getSectionCatalogEntry } from '@/lib/resume-section-catalog';
import { createPageBreakId, isPageBreakToken } from '@/lib/page-break-utils';
import {
    FONT_STACK,
    COLOR_PRESETS_FLOW,
    HEADING_STYLE_OPTIONS,
    ENTRY_LAYOUT_PRESETS,
} from '@/lib/flow-customize-options';

import { useResumeStore } from '@/store/useResumeStore';

function cloneDesign(d: ResumeDesign): ResumeDesign {
    return structuredClone(d);
}

function CustomizePanelCard({
    title,
    subtitle,
    icon,
    children,
    className,
    action,
}: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className={cn('rounded-xl border border-slate-200/90 bg-white shadow-sm', className)}>
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
                <div className="flex items-start gap-2 min-w-0">
                    {icon && <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>}
                    <div className="min-w-0">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{title}</h4>
                        {subtitle && <p className="text-[10px] text-slate-500 leading-snug">{subtitle}</p>}
                    </div>
                </div>
                {action}
            </div>
            <div className="p-3">{children}</div>
        </div>
    );
}

function FlowSliderRow({
    label,
    valueLabel,
    min,
    max,
    step,
    value,
    onCommit,
}: {
    label: string;
    valueLabel: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onCommit: (next: number) => void;
}) {
    const dec = () => {
        const next = Math.min(max, Math.max(min, +(value - step).toFixed(4)));
        onCommit(next);
    };
    const inc = () => {
        const next = Math.min(max, Math.max(min, +(value + step).toFixed(4)));
        onCommit(next);
    };
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</Label>
                <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded tabular-nums">{valueLabel}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-lg border-slate-200" onClick={dec} aria-label={`Decrease ${label}`}>
                    <Minus className="h-4 w-4" />
                </Button>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onCommit(parseFloat(e.target.value))}
                    className="flex-1 min-w-0 customize-flow-range"
                />
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-lg border-slate-200" onClick={inc} aria-label={`Increase ${label}`}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

interface CustomizeFormProps {
    onAddSections?: () => void;
}

const CustomizeForm: React.FC<CustomizeFormProps> = ({ onAddSections }) => {
    const { data, setResumeData, updateDesign: storeUpdateDesign, setSelectedSections } = useResumeStore();
    const design = data.design || DEFAULT_DESIGN;
    const [activeTab, setActiveTab] = useState('layout');
    const [pastDesign, setPastDesign] = useState<ResumeDesign[]>([]);
    const [futureDesign, setFutureDesign] = useState<ResumeDesign[]>([]);

    const selectedSections = data.selectedSections || ['personalInfo', 'summary', 'experience', 'education', 'skills'];

    const pushDesignHistory = useCallback(() => {
        const snap = cloneDesign(useResumeStore.getState().data.design ?? DEFAULT_DESIGN);
        setPastDesign((p) => [...p.slice(-49), snap]);
        setFutureDesign([]);
    }, []);

    const updateDesign = (section: keyof ResumeDesign, subField: string, value: any) => {
        pushDesignHistory();
        const newDesign = {
            ...design,
            [section]: {
                ...(design[section] as any),
                [subField]: value
            }
        };
        storeUpdateDesign(newDesign);
    };

    const updateSubDesign = (section: keyof ResumeDesign, subSection: string, field: string, value: any) => {
        pushDesignHistory();
        const newDesign = {
            ...design,
            [section]: {
                ...(design[section] as any),
                [subSection]: {
                    ...(design[section] as any)[subSection],
                    [field]: value
                }
            }
        };
        storeUpdateDesign(newDesign);
    };

    const resetToDefault = () => {
        if (confirm('Reset all design customizations to default?')) {
            pushDesignHistory();
            storeUpdateDesign(DEFAULT_DESIGN);
        }
    };

    const applyTemplate = (template: Template) => {
        pushDesignHistory();
        storeUpdateDesign(template.design);
    };

    const handleUndoDesign = () => {
        if (pastDesign.length === 0) return;
        const prev = pastDesign[pastDesign.length - 1];
        setPastDesign((p) => p.slice(0, -1));
        setFutureDesign((f) => [cloneDesign(design), ...f]);
        setResumeData({ ...data, design: prev });
    };

    const handleRedoDesign = () => {
        if (futureDesign.length === 0) return;
        const next = futureDesign[0];
        setFutureDesign((f) => f.slice(1));
        setPastDesign((p) => [...p.slice(-49), cloneDesign(design)]);
        setResumeData({ ...data, design: next });
    };

    const handleSectionDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination || source.droppableId !== 'customize-sections') return;
        const sections = Array.from(selectedSections);
        const mustBeFirst = ['personalInfo'].filter((id) => selectedSections.includes(id));
        const draggableSections = sections.filter((id) => !mustBeFirst.includes(id));
        const [removed] = draggableSections.splice(source.index, 1);
        draggableSections.splice(destination.index, 0, removed);
        setSelectedSections([...mustBeFirst, ...draggableSections]);
    };

    const sectionLabel = (sectionId: string) => {
        if (isPageBreakToken(sectionId)) return 'Page break';
        if (sectionId === 'summary') {
            return data.sectionLabels?.summary || 'Professional Summary';
        }
        const cat = getSectionCatalogEntry(sectionId);
        return (data.sectionLabels?.[sectionId] as string | undefined) || cat?.label || sectionId;
    };

    const sectionIcon = (sectionId: string) => {
        if (isPageBreakToken(sectionId)) return Scissors;
        if (sectionId === 'summary') return FileText;
        return getSectionCatalogEntry(sectionId)?.icon || LayoutGrid;
    };

    const TemplateThumbnail = ({ template, isActive }: { template: Template; isActive: boolean }) => {
        const d = template.design;
        const isTwoCol = d.layout.columns === 'two' || d.layout.columns === 'mix';
        return (
            <div
                className={cn(
                    "flex-shrink-0 w-20 h-24 rounded-lg border-2 overflow-hidden cursor-pointer transition-all flex flex-col",
                    isActive ? "border-primary ring-2 ring-primary/30" : "border-slate-200 hover:border-slate-300"
                )}
                onClick={() => applyTemplate(template)}
            >
                <div className="h-1 shrink-0" style={{ backgroundColor: d.colors.accent }} />
                <div className="flex-1 p-1 flex flex-col gap-0.5" style={{ fontFamily: d.typography.fontFamily }}>
                    <div className="text-[8px] font-bold truncate" style={{ color: d.colors.text }}>{template.name}</div>
                    {isTwoCol ? (
                        <div className="flex gap-0.5 flex-1 min-h-0">
                            <div className="w-1/3 rounded-sm shrink-0" style={{ backgroundColor: `${d.colors.accent}25` }} />
                            <div className="flex-1 space-y-0.5">
                                <div className="h-0.5 rounded bg-slate-200 w-full" />
                                <div className="h-0.5 rounded bg-slate-200 w-4/5" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0.5 flex-1">
                            <div className="h-0.5 rounded bg-slate-200 w-full" />
                            <div className="h-0.5 rounded bg-slate-200 w-4/5" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const currentTemplateId = TEMPLATES.find((t) =>
        JSON.stringify(t.design) === JSON.stringify(design)
    )?.id;

    const columnOptions = [
        { id: 'one' as const, label: 'One', icon: <div className="w-4 h-3 bg-current opacity-20 rounded-sm" /> },
        { id: 'two' as const, label: 'Two', icon: <div className="w-4 h-3 flex gap-0.5"><div className="w-1.5 h-full bg-current opacity-20 rounded-[1px]" /><div className="flex-1 h-full bg-current opacity-20 rounded-[1px]" /></div> },
        { id: 'mix' as const, label: 'Mix', icon: <div className="w-4 h-3 flex flex-col gap-0.5"><div className="w-full h-1 bg-current opacity-20 rounded-[1px]" /><div className="flex gap-0.5 w-full h-1.5"><div className="w-1/2 h-full bg-current opacity-20 rounded-[1px]" /><div className="w-1/2 h-full bg-current opacity-20 rounded-[1px]" /></div></div> },
    ];

    return (
        <div className="space-y-4 pb-20">
            <div className="rounded-2xl border border-slate-200/90 bg-slate-100/60 p-3 space-y-3 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-800 tracking-tight">Customize</h3>
                        <p className="text-[11px] text-slate-500">Columns, section order, and document styling</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-slate-200 bg-white"
                            onClick={handleUndoDesign}
                            disabled={pastDesign.length === 0}
                            title="Undo design change"
                        >
                            <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-slate-200 bg-white"
                            onClick={handleRedoDesign}
                            disabled={futureDesign.length === 0}
                            title="Redo design change"
                        >
                            <Redo2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetToDefault}
                            className="h-8 rounded-lg text-xs gap-1 border-slate-200 bg-white"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </Button>
                    </div>
                </div>

                <CustomizePanelCard title="Columns" subtitle="Page structure: one column, two columns, or mixed" icon={<Layers className="h-4 w-4" />}>
                    <div className="grid grid-cols-3 gap-2">
                        {columnOptions.map((col) => (
                            <button
                                key={col.id}
                                type="button"
                                onClick={() => updateDesign('layout', 'columns', col.id)}
                                className={cn(
                                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                                    design.layout.columns === col.id
                                        ? 'border-primary bg-primary/5 text-primary shadow-sm font-bold'
                                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                )}
                            >
                                {col.icon}
                                <span className="text-[10px] font-bold uppercase">{col.label}</span>
                            </button>
                        ))}
                    </div>
                </CustomizePanelCard>

                <CustomizePanelCard
                    title="Section order"
                    subtitle="Drag to reorder; page breaks start the next sheet in the preview"
                    icon={<ListOrdered className="h-4 w-4" />}
                    action={
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] font-bold uppercase border-dashed"
                                onClick={() => setSelectedSections([...selectedSections, createPageBreakId()])}
                            >
                                Break
                            </Button>
                            {onAddSections ? (
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase text-primary" onClick={onAddSections}>
                                    + Add
                                </Button>
                            ) : null}
                        </div>
                    }
                >
                    <DragDropContext onDragEnd={handleSectionDragEnd}>
                        <div className="space-y-1">
                            {selectedSections
                                .filter((id) => id === 'personalInfo')
                                .map((sectionId) => {
                                    const Icon = sectionIcon(sectionId);
                                    return (
                                        <div
                                            key={sectionId}
                                            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/90 px-2 py-2"
                                        >
                                            <Lock className="h-4 w-4 text-slate-300 shrink-0" aria-hidden />
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 border border-slate-100 shrink-0">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700 truncate">
                                                {sectionLabel(sectionId)}
                                            </span>
                                        </div>
                                    );
                                })}
                            <Droppable droppableId="customize-sections">
                                {(provided) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                                        {selectedSections
                                            .filter((id) => id !== 'personalInfo')
                                            .map((sectionId, index) => {
                                                const Icon = sectionIcon(sectionId);
                                                const isBreak = isPageBreakToken(sectionId);
                                                return (
                                                    <Draggable key={sectionId} draggableId={sectionId} index={index}>
                                                        {(dragProvided, snapshot) => (
                                                            <div
                                                                ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                className={cn(
                                                                    'flex items-center gap-2 rounded-lg border px-2 py-2 transition-shadow',
                                                                    isBreak ? 'border-dashed border-slate-300 bg-amber-50/40' : 'bg-white border-slate-100',
                                                                    snapshot.isDragging ? 'border-primary/40 shadow-md ring-1 ring-primary/15 z-10' : ''
                                                                )}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    {...dragProvided.dragHandleProps}
                                                                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-0.5 rounded shrink-0"
                                                                    aria-label="Drag to reorder"
                                                                >
                                                                    <GripVertical className="h-4 w-4" />
                                                                </button>
                                                                <div
                                                                    className={cn(
                                                                        'flex h-8 w-8 items-center justify-center rounded-lg shrink-0 border',
                                                                        isBreak ? 'bg-white text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-100'
                                                                    )}
                                                                >
                                                                    <Icon className="h-4 w-4" />
                                                                </div>
                                                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700 truncate flex-1 min-w-0">
                                                                    {sectionLabel(sectionId)}
                                                                </span>
                                                                {isBreak ? (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 shrink-0 text-slate-400 hover:text-destructive"
                                                                        onClick={() => setSelectedSections(selectedSections.filter((s) => s !== sectionId))}
                                                                        aria-label="Remove page break"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                ) : null}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    </DragDropContext>
                </CustomizePanelCard>

                <CustomizePanelCard title="Templates" subtitle="Quickly apply a full design preset" icon={<LayoutGrid className="h-4 w-4" />}>
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin -mx-0.5 px-0.5">
                        {TEMPLATES.map((template) => (
                            <TemplateThumbnail
                                key={template.id}
                                template={template}
                                isActive={currentTemplateId === template.id}
                            />
                        ))}
                    </div>
                </CustomizePanelCard>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto min-h-11 p-1 bg-slate-100/80 rounded-xl mb-4 border border-slate-200/80 gap-1">
                    {[
                        { id: 'layout', label: 'Layout', icon: <Layout className="w-3.5 h-3.5" /> },
                        { id: 'spacing', label: 'Spacing', icon: <Maximize className="w-3.5 h-3.5" /> },
                        { id: 'typeface', label: 'Type', icon: <Type className="w-3.5 h-3.5" /> },
                        { id: 'colors', label: 'Colors', icon: <Palette className="w-3.5 h-3.5" /> },
                        { id: 'footer', label: 'Footer', icon: <Settings2 className="w-3.5 h-3.5" /> },
                        { id: 'global', label: 'Global', icon: <Sliders className="w-3.5 h-3.5" /> }
                    ].map((t) => (
                        <TabsTrigger
                            key={t.id}
                            value={t.id}
                            className="rounded-lg text-[9px] sm:text-[10px] font-bold uppercase transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-primary/20 flex flex-col items-center justify-center gap-0.5 py-2 px-1"
                        >
                            {t.icon}
                            <span>{t.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {activeTab === 'layout' && (
                            <TabsContent key="layout" value="layout" className="space-y-4 mt-0 outline-none">
                                <CustomizePanelCard title="Page format" subtitle="Paper size for preview and PDF export" icon={<Maximize className="h-4 w-4" />} className="shadow-none">
                                    <div className="grid grid-cols-2 gap-2">
                                        {['A4', 'Letter'].map((format) => (
                                            <button
                                                key={format}
                                                type="button"
                                                onClick={() => updateDesign('languageRegion', 'pageFormat', format)}
                                                className={cn(
                                                    'px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all',
                                                    design.languageRegion.pageFormat === format
                                                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                )}
                                            >
                                                {format}
                                            </button>
                                        ))}
                                    </div>
                                </CustomizePanelCard>

                                <CustomizePanelCard title="Header position" subtitle="Name block placement when using two columns or mixed layout" icon={<Layout className="h-4 w-4" />} className="shadow-none">
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'top', label: 'Top' },
                                            { id: 'left', label: 'Left' },
                                            { id: 'right', label: 'Right' },
                                        ].map((pos) => (
                                            <motion.button
                                                key={pos.id}
                                                type="button"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => updateDesign('layout', 'headerPosition', pos.id)}
                                                className={cn(
                                                    'px-3 py-2.5 rounded-xl border-2 text-[10px] font-bold uppercase transition-all',
                                                    design.layout.headerPosition === pos.id
                                                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                )}
                                            >
                                                {pos.label}
                                            </motion.button>
                                        ))}
                                    </div>
                                </CustomizePanelCard>

                                {(design.layout.columns === 'two' || design.layout.columns === 'mix') && (
                                    <CustomizePanelCard title="Column width" subtitle="Balance between sidebar and main column" icon={<Layers className="h-4 w-4" />} className="shadow-none">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Left width</span>
                                            <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded tabular-nums">{design.layout.columnWidths.left}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={20}
                                            max={60}
                                            step={1}
                                            value={design.layout.columnWidths.left}
                                            onChange={(e) => {
                                                const left = parseInt(e.target.value, 10);
                                                updateDesign('layout', 'columnWidths', { left, right: 100 - left });
                                            }}
                                            className="w-full accent-primary h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </CustomizePanelCard>
                                )}
                            </TabsContent>
                        )}

                        {/* Spacing Section */}
                        {activeTab === 'spacing' && (
                            <TabsContent value="spacing" forceMount className="space-y-6 mt-0 outline-none">
                                <div className="space-y-6">
                                    <CustomizePanelCard title="Typography spacing" subtitle="FlowCV-style stepped sliders" className="shadow-none">
                                        <div className="space-y-5">
                                            <FlowSliderRow
                                                label="Font size"
                                                valueLabel={`${design.spacing.fontSize}pt`}
                                                min={8}
                                                max={14}
                                                step={0.5}
                                                value={design.spacing.fontSize}
                                                onCommit={(v) => updateDesign('spacing', 'fontSize', v)}
                                            />
                                            <div className="pt-4 border-t border-slate-100">
                                                <FlowSliderRow
                                                    label="Line height"
                                                    valueLabel={String(design.spacing.lineHeight)}
                                                    min={1}
                                                    max={2}
                                                    step={0.05}
                                                    value={design.spacing.lineHeight}
                                                    onCommit={(v) => updateDesign('spacing', 'lineHeight', Math.round(v * 100) / 100)}
                                                />
                                            </div>
                                        </div>
                                    </CustomizePanelCard>

                                    <CustomizePanelCard title="Page & entries" subtitle="Left/right, top/bottom, space between entries" icon={<Sliders className="h-4 w-4" />} className="shadow-none">
                                        <div className="space-y-5">
                                            <FlowSliderRow
                                                label="Left & right margin"
                                                valueLabel={`${design.spacing.marginLR}mm`}
                                                min={5}
                                                max={30}
                                                step={1}
                                                value={design.spacing.marginLR}
                                                onCommit={(v) => updateDesign('spacing', 'marginLR', Math.round(v))}
                                            />
                                            <div className="pt-4 border-t border-slate-100">
                                                <FlowSliderRow
                                                    label="Top & bottom margin"
                                                    valueLabel={`${design.spacing.marginTB}mm`}
                                                    min={5}
                                                    max={30}
                                                    step={1}
                                                    value={design.spacing.marginTB}
                                                    onCommit={(v) => updateDesign('spacing', 'marginTB', Math.round(v))}
                                                />
                                            </div>
                                            <div className="pt-4 border-t border-slate-100">
                                                <div className="flex items-center justify-end mb-1">
                                                    <span className="text-[10px] text-slate-400 font-mono tracking-tighter" title="Spacing hint">[ ───── ]</span>
                                                </div>
                                                <FlowSliderRow
                                                    label="Space between entries"
                                                    valueLabel={`${design.spacing.entrySpacing}px`}
                                                    min={0}
                                                    max={20}
                                                    step={1}
                                                    value={design.spacing.entrySpacing}
                                                    onCommit={(v) => updateDesign('spacing', 'entrySpacing', Math.round(v))}
                                                />
                                            </div>
                                        </div>
                                    </CustomizePanelCard>
                                </div>
                            </TabsContent>
                        )}

                        {/* Typography Section — FlowCV-style Font / Headings / Entry layout */}
                        {activeTab === 'typeface' && (
                            <TabsContent value="typeface" forceMount className="space-y-4 mt-0 outline-none">
                                <div className="space-y-4">
                                    <CustomizePanelCard title="Font" subtitle="Serif, sans, or mono stacks" icon={<Type className="h-4 w-4" />} className="shadow-none">
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            {(['sans', 'serif', 'mono'] as const).map((cat) => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => updateDesign('typography', 'fontCategory', cat)}
                                                    className={cn(
                                                        'py-2.5 rounded-xl border-2 text-[10px] font-bold uppercase transition-all',
                                                        (design.typography.fontCategory ?? 'sans') === cat
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                                            {FONT_STACK[(design.typography.fontCategory ?? 'sans') as keyof typeof FONT_STACK].map((font) => (
                                                <button
                                                    key={font}
                                                    type="button"
                                                    onClick={() => updateDesign('typography', 'fontFamily', font)}
                                                    className={cn(
                                                        'px-2 py-2 rounded-xl border-2 text-xs transition-all text-left truncate',
                                                        design.typography.fontFamily === font
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm font-bold'
                                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                                    )}
                                                    style={{ fontFamily: font }}
                                                >
                                                    {font}
                                                </button>
                                            ))}
                                        </div>
                                    </CustomizePanelCard>

                                    <CustomizePanelCard title="Section headings" subtitle="Layout, caps, size, icons" icon={<Layout className="h-4 w-4" />} className="shadow-none">
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Style</Label>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                                            {HEADING_STYLE_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => updateSubDesign('typography', 'headings', 'style', opt.id)}
                                                    className={cn(
                                                        'h-14 rounded-xl border-2 text-[9px] font-bold uppercase transition-all flex items-center justify-center text-center px-1 leading-tight',
                                                        (design.typography.headings.style || 'classic') === opt.id
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Capitalization</Label>
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            {[
                                                { id: 'none' as const, label: 'As typed' },
                                                { id: 'capitalize' as const, label: 'Capitalize' },
                                                { id: 'uppercase' as const, label: 'Uppercase' },
                                            ].map((row) => (
                                                <button
                                                    key={row.id}
                                                    type="button"
                                                    onClick={() => updateSubDesign('typography', 'headings', 'capitalization', row.id)}
                                                    className={cn(
                                                        'py-2 rounded-xl border-2 text-[10px] font-bold transition-all',
                                                        design.typography.headings.capitalization === row.id
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {row.label}
                                                </button>
                                            ))}
                                        </div>
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Size</Label>
                                        <div className="grid grid-cols-4 gap-2 mb-4">
                                            {['s', 'm', 'l', 'xl'].map((sz) => (
                                                <button
                                                    key={sz}
                                                    type="button"
                                                    onClick={() => updateSubDesign('typography', 'headings', 'size', sz)}
                                                    className={cn(
                                                        'py-2 rounded-xl border-2 text-xs font-bold uppercase transition-all',
                                                        design.typography.headings.size === sz
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {sz}
                                                </button>
                                            ))}
                                        </div>
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Icons</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {['none', 'outline', 'filled'].map((st) => (
                                                <Button
                                                    key={st}
                                                    variant="outline"
                                                    size="sm"
                                                    type="button"
                                                    className={cn(
                                                        'h-8 text-[10px] capitalize px-3 border-2 transition-all',
                                                        design.typography.headings.icons === st
                                                            ? 'border-primary text-primary bg-primary/5 font-bold shadow-sm'
                                                            : 'text-slate-500'
                                                    )}
                                                    onClick={() => updateSubDesign('typography', 'headings', 'icons', st)}
                                                >
                                                    {st}
                                                </Button>
                                            ))}
                                        </div>
                                    </CustomizePanelCard>

                                    <CustomizePanelCard title="Entry layout" subtitle="Experience & education rows" icon={<Sliders className="h-4 w-4" />} className="shadow-none">
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Presets</Label>
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            {[
                                                { id: 'standard', label: 'Standard' },
                                                { id: 'compact', label: 'Compact line' },
                                                { id: 'airy', label: 'Airy' },
                                                { id: 'minimal', label: 'Minimal' },
                                            ].map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        pushDesignHistory();
                                                        storeUpdateDesign({
                                                            entryLayout: {
                                                                ...design.entryLayout,
                                                                ...ENTRY_LAYOUT_PRESETS[p.id],
                                                            },
                                                        });
                                                    }}
                                                    className="h-12 rounded-xl border-2 border-slate-200 bg-white text-[10px] font-bold uppercase text-slate-500 hover:border-primary/40 transition-all"
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            {[
                                                { id: 'auto' as const, label: 'Auto dates' },
                                                { id: 'manual' as const, label: 'Manual' },
                                            ].map((m) => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => updateDesign('entryLayout', 'dateColumnMode', m.id)}
                                                    className={cn(
                                                        'py-2 rounded-xl border-2 text-[10px] font-bold uppercase transition-all',
                                                        (design.entryLayout.dateColumnMode ?? 'auto') === m.id
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Title & subtitle size</Label>
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            {(['s', 'm', 'l'] as const).map((sz) => (
                                                <button
                                                    key={sz}
                                                    type="button"
                                                    onClick={() => updateDesign('entryLayout', 'titleSize', sz)}
                                                    className={cn(
                                                        'py-2 rounded-xl border-2 text-xs font-bold uppercase transition-all',
                                                        design.entryLayout.titleSize === sz
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {sz}
                                                </button>
                                            ))}
                                        </div>
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Subtitle style</Label>
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            {(['normal', 'bold', 'italic'] as const).map((st) => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => updateDesign('entryLayout', 'subtitleStyle', st)}
                                                    className={cn(
                                                        'py-2 rounded-xl border-2 text-[10px] font-bold capitalize transition-all',
                                                        design.entryLayout.subtitleStyle === st
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {st}
                                                </button>
                                            ))}
                                        </div>
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Subtitle placement</Label>
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            {[
                                                { id: 'same-line' as const, label: 'Same line' },
                                                { id: 'next-line' as const, label: 'Next line' },
                                            ].map((row) => (
                                                <button
                                                    key={row.id}
                                                    type="button"
                                                    onClick={() => updateDesign('entryLayout', 'subtitlePlacement', row.id)}
                                                    className={cn(
                                                        'py-2 rounded-xl border-2 text-[10px] font-bold transition-all',
                                                        design.entryLayout.subtitlePlacement === row.id
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {row.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Indent body</Label>
                                            <input
                                                type="checkbox"
                                                checked={design.entryLayout.indentBody}
                                                onChange={(e) => updateDesign('entryLayout', 'indentBody', e.target.checked)}
                                                className="w-4 h-4 accent-primary"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            {([
                                                { id: 'bullet' as const, label: '• Bullet' },
                                                { id: 'hyphen' as const, label: '- Hyphen' },
                                            ]).map((ls) => (
                                                <button
                                                    key={ls.id}
                                                    type="button"
                                                    onClick={() => updateDesign('entryLayout', 'listStyle', ls.id)}
                                                    className={cn(
                                                        'py-2 rounded-xl border-2 text-[10px] font-bold transition-all',
                                                        design.entryLayout.listStyle === ls.id
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {ls.label}
                                                </button>
                                            ))}
                                        </div>
                                    </CustomizePanelCard>
                                </div>
                            </TabsContent>
                        )}

                        {/* Colors — FlowCV-style modes, presets, pickers, accent targets */}
                        {activeTab === 'colors' && (
                            <TabsContent value="colors" forceMount className="space-y-4 mt-0 outline-none">
                                <div className="space-y-4">
                                    <CustomizePanelCard title="Color mode" subtitle="Basic, advanced controls, or bordered page" icon={<Palette className="h-4 w-4" />} className="shadow-none">
                                        <div className="flex gap-3 justify-center">
                                            {([
                                                { id: 'basic' as const, label: 'Basic', hint: 'Simple palette' },
                                                { id: 'advanced' as const, label: 'Advanced', hint: 'Per-element' },
                                                { id: 'border' as const, label: 'Border', hint: 'Page frame' },
                                            ]).map((m) => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    title={m.hint}
                                                    onClick={() => updateDesign('colors', 'mode', m.id)}
                                                    className={cn(
                                                        'flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 min-w-[4.5rem] transition-all',
                                                        design.colors.mode === m.id
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            'h-8 w-8 rounded-full border-2',
                                                            m.id === 'basic' && 'bg-white border-slate-300',
                                                            m.id === 'advanced' && 'border-slate-300 bg-gradient-to-b from-violet-500 to-white',
                                                            m.id === 'border' && 'border-4 border-slate-400 bg-white ring-2 ring-slate-200'
                                                        )}
                                                    />
                                                    <span className="text-[9px] font-bold uppercase">{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </CustomizePanelCard>

                                    <CustomizePanelCard title="Background style" subtitle="Accent, multi-tone sidebar, or full-page image" icon={<LayoutGrid className="h-4 w-4" />} className="shadow-none">
                                        <div className="grid grid-cols-3 gap-2">
                                            {([
                                                { id: 'accent' as const, label: 'Accent' },
                                                { id: 'multi' as const, label: 'Multi' },
                                                { id: 'image' as const, label: 'Image' },
                                            ]).map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => {
                                                        pushDesignHistory();
                                                        if (t.id === 'multi') {
                                                            storeUpdateDesign({
                                                                colors: {
                                                                    ...design.colors,
                                                                    themeVariant: 'multi',
                                                                    sidebarBackground:
                                                                        design.colors.sidebarBackground ||
                                                                        `${design.colors.accent}14`,
                                                                },
                                                            });
                                                        } else if (t.id === 'accent') {
                                                            storeUpdateDesign({
                                                                colors: { ...design.colors, themeVariant: 'accent' },
                                                            });
                                                        } else {
                                                            storeUpdateDesign({
                                                                colors: { ...design.colors, themeVariant: 'image' },
                                                            });
                                                        }
                                                    }}
                                                    className={cn(
                                                        'h-16 rounded-xl border-2 text-[10px] font-bold uppercase transition-all flex flex-col items-center justify-center gap-1',
                                                        (design.colors.themeVariant ?? 'accent') === t.id
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                    )}
                                                >
                                                    {t.id === 'image' && <ImageIcon className="h-4 w-4 opacity-70" />}
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                        {(design.colors.themeVariant ?? 'accent') === 'image' && (
                                            <div className="mt-3 space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">
                                                    Image URL
                                                </label>
                                                <input
                                                    type="url"
                                                    placeholder="https://… or data:image/…"
                                                    value={design.colors.backgroundImage ?? ''}
                                                    onChange={(e) => {
                                                        pushDesignHistory();
                                                        storeUpdateDesign({
                                                            colors: { ...design.colors, backgroundImage: e.target.value },
                                                        });
                                                    }}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                />
                                                <p className="text-[10px] text-slate-400 leading-snug">
                                                    Uses http(s) or data URLs only. Without a URL, a light accent texture is shown.
                                                </p>
                                            </div>
                                        )}
                                    </CustomizePanelCard>

                                    <CustomizePanelCard title="Presets" subtitle="One tap for accent, text, and paper" icon={<Check className="h-4 w-4" />} className="shadow-none">
                                        <div className="grid grid-cols-4 gap-2">
                                            {COLOR_PRESETS_FLOW.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        pushDesignHistory();
                                                        storeUpdateDesign({
                                                            colors: {
                                                                ...design.colors,
                                                                accent: p.accent,
                                                                text: p.text,
                                                                background: p.background,
                                                            },
                                                        });
                                                    }}
                                                    className="h-14 rounded-xl border-2 border-slate-200 hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-0.5 p-1"
                                                    title={p.id}
                                                >
                                                    <span className="flex gap-0.5">
                                                        <span className="h-4 w-4 rounded-sm border border-slate-200" style={{ background: p.text }} />
                                                        <span className="h-4 w-4 rounded-sm border border-slate-200" style={{ background: p.accent }} />
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </CustomizePanelCard>

                                    <CustomizePanelCard title="Core colors" subtitle="Text, paper, accent" icon={<Palette className="h-4 w-4" />} className="shadow-none">
                                        <div className="space-y-3">
                                            {([
                                                { field: 'text' as const, label: 'Text' },
                                                { field: 'background' as const, label: 'Background' },
                                                { field: 'accent' as const, label: 'Accent' },
                                            ]).map((row) => (
                                                <div key={row.field} className="flex items-center justify-between gap-3">
                                                    <Label className="text-[10px] font-bold text-slate-400 uppercase shrink-0 w-24">{row.label}</Label>
                                                    <div className="flex items-center gap-2 flex-1 justify-end">
                                                        <input
                                                            type="color"
                                                            value={design.colors[row.field]}
                                                            onChange={(e) => updateDesign('colors', row.field, e.target.value)}
                                                            className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
                                                        />
                                                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[5rem]">{design.colors[row.field]}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CustomizePanelCard>

                                    <CustomizePanelCard title="Apply accent color to" subtitle="Toggle which groups use the accent hue" icon={<Sliders className="h-4 w-4" />} className="shadow-none">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                            {(
                                                [
                                                    ['name', 'Name'],
                                                    ['jobTitle', 'Job title'],
                                                    ['headings', 'Headings'],
                                                    ['headerIcons', 'Header icons'],
                                                    ['dotsBarsBubbles', 'Dots / bars'],
                                                    ['dates', 'Dates'],
                                                    ['entries', 'Entries'],
                                                    ['links', 'Links'],
                                                ] as const
                                            ).map(([key, label]) => {
                                                const apply = design.colors.accentApply || {};
                                                const v = apply[key as keyof typeof apply];
                                                const checked =
                                                    v === true ? true : v === false ? false : key !== 'name' && key !== 'jobTitle';
                                                return (
                                                    <label key={key} className="flex items-center justify-between gap-2 text-xs text-slate-600 py-1.5 border-b border-slate-50 last:border-0">
                                                        <span>{label}</span>
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 accent-primary rounded border-slate-300"
                                                            checked={checked}
                                                            onChange={(e) =>
                                                                updateDesign('colors', 'accentApply', {
                                                                    ...apply,
                                                                    [key]: e.target.checked,
                                                                })
                                                            }
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </CustomizePanelCard>
                                </div>
                            </TabsContent>
                        )}
                        {/* Footer + link styling (FlowCV) */}
                        {activeTab === 'footer' && (
                            <TabsContent value="footer" forceMount className="space-y-4 mt-0 outline-none">
                                <CustomizePanelCard title="Footer" subtitle="What appears at the bottom of each page" icon={<Settings2 className="h-4 w-4" />} className="shadow-none">
                                    <div className="space-y-2">
                                        {[
                                            { id: 'showPageNumbers', label: 'Page numbers' },
                                            { id: 'showEmail', label: 'Email' },
                                            { id: 'showName', label: 'Name' },
                                        ].map((item) => (
                                            <label key={item.id} className="flex items-center justify-between gap-2 py-2.5 px-2 rounded-xl border border-slate-100 bg-slate-50/50">
                                                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={!!design.footer?.[item.id as keyof typeof design.footer]}
                                                    onChange={(e) => updateDesign('footer', item.id, e.target.checked)}
                                                    className="w-4 h-4 accent-primary rounded"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </CustomizePanelCard>

                                <CustomizePanelCard title="Link styling" subtitle="Header and contact links in the preview" icon={<Link2 className="h-4 w-4" />} className="shadow-none">
                                    <div className="space-y-2">
                                        <label className="flex items-center justify-between gap-2 py-2.5 px-2 rounded-xl border border-slate-100 bg-slate-50/50">
                                            <span className="text-xs font-medium text-slate-700">Underline</span>
                                            <input
                                                type="checkbox"
                                                checked={design.advanced?.linkUnderline !== false}
                                                onChange={(e) => updateDesign('advanced', 'linkUnderline', e.target.checked)}
                                                className="w-4 h-4 accent-primary rounded"
                                            />
                                        </label>
                                        <label className="flex items-center justify-between gap-2 py-2.5 px-2 rounded-xl border border-slate-100 bg-slate-50/50">
                                            <span className="text-xs font-medium text-slate-700">Accent / blue links</span>
                                            <input
                                                type="checkbox"
                                                checked={design.advanced?.linkUseAccentBlue !== false}
                                                onChange={(e) => updateDesign('advanced', 'linkUseAccentBlue', e.target.checked)}
                                                className="w-4 h-4 accent-primary rounded"
                                            />
                                        </label>
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase pt-2 block">Link icon</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {(['none', 'icon', 'external'] as const).map((ic) => (
                                                <Button
                                                    key={ic}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        'h-8 text-[10px] capitalize border-2',
                                                        design.advanced?.linkIcon === ic
                                                            ? 'border-primary text-primary bg-primary/5 font-bold'
                                                            : 'text-slate-500'
                                                    )}
                                                    onClick={() => updateDesign('advanced', 'linkIcon', ic)}
                                                >
                                                    {ic}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CustomizePanelCard>
                            </TabsContent>
                        )}

                        {/* Global Section */}
                        {activeTab === 'global' && (
                            <TabsContent value="global" forceMount className="space-y-6 mt-0 outline-none">
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Format</Label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['MM/YYYY', 'DD/MM/YYYY', 'MMM YYYY', 'Month YYYY'].map((fmt) => (
                                                <button
                                                    key={fmt}
                                                    onClick={() => updateDesign('languageRegion', 'dateFormat', fmt)}
                                                    className={`px-4 py-2 rounded-xl border-2 text-xs transition-all ${design.languageRegion.dateFormat === fmt
                                                        ? 'border-primary bg-primary/5 text-primary shadow-sm font-bold'
                                                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {fmt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utility Opacity</Label>
                                            <span className="text-xs font-bold text-primary">{design.advanced?.dateLocationOpacity ?? 0.8}</span>
                                        </div>
                                        <input
                                            type="range" min="0.3" max="1.0" step="0.1"
                                            value={design.advanced?.dateLocationOpacity ?? 0.8}
                                            onChange={(e) => updateDesign('advanced', 'dateLocationOpacity', parseFloat(e.target.value))}
                                            className="w-full accent-primary h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Tabs>

            {/* Entry Layout & Personal Details Accordion */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Details & Elements</h4>

                <DesignAccordionItem
                    icon={<User className="w-4 h-4" />}
                    title="Personal Details"
                    description="Align, arrangement, and icons"
                >
                    <div className="space-y-5 pt-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Align</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { id: 'left' as const, icon: AlignLeft },
                                    { id: 'center' as const, icon: AlignCenter },
                                    { id: 'right' as const, icon: AlignRight },
                                ]).map(({ id, icon: Ic }) => (
                                    <Button
                                        key={id}
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        className={cn(
                                            'h-10 rounded-xl border-2 transition-all',
                                            design.personalDetails.align === id
                                                ? 'border-primary text-primary bg-primary/5 shadow-sm'
                                                : 'text-slate-400 border-slate-200'
                                        )}
                                        onClick={() => updateDesign('personalDetails', 'align', id)}
                                    >
                                        <Ic className="h-4 w-4 mx-auto" />
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Arrangement</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { id: 'icon' as const, label: 'Icon' },
                                    { id: 'bullet' as const, label: 'Bullet' },
                                    { id: 'bar' as const, label: 'Bar' },
                                    { id: 'pipe' as const, label: 'Pipe' },
                                ]).map((row) => (
                                    <Button
                                        key={row.id}
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        className={cn(
                                            'h-8 text-[10px] font-bold rounded-xl border-2',
                                            design.personalDetails.arrangement === row.id
                                                ? 'border-primary text-primary bg-primary/5'
                                                : 'text-slate-400 border-slate-200'
                                        )}
                                        onClick={() => updateDesign('personalDetails', 'arrangement', row.id)}
                                    >
                                        {row.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Name size</Label>
                            <div className="grid grid-cols-5 gap-1.5">
                                {(['xs', 's', 'm', 'l', 'xl'] as const).map((sz) => (
                                    <Button
                                        key={sz}
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        className={cn(
                                            'uppercase h-8 text-[10px] rounded-lg border-2 px-0',
                                            design.personalDetails.nameSize === sz
                                                ? 'border-primary text-primary bg-primary/5 font-bold'
                                                : 'text-slate-400 font-medium border-slate-200'
                                        )}
                                        onClick={() => updateDesign('personalDetails', 'nameSize', sz)}
                                    >
                                        {sz}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Name font</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { id: 'body' as const, label: 'Body font' },
                                    { id: 'creative' as const, label: 'Creative' },
                                ]).map((row) => (
                                    <Button
                                        key={row.id}
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        className={cn(
                                            'h-9 text-[10px] font-bold rounded-xl border-2',
                                            (design.personalDetails.nameFont ?? 'body') === row.id
                                                ? 'border-primary text-primary bg-primary/5'
                                                : 'text-slate-400 border-slate-200'
                                        )}
                                        onClick={() => updateDesign('personalDetails', 'nameFont', row.id)}
                                    >
                                        {row.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Name bold</Label>
                            <input
                                type="checkbox"
                                checked={design.personalDetails.nameBold}
                                onChange={(e) => updateDesign('personalDetails', 'nameBold', e.target.checked)}
                                className="w-4 h-4 accent-primary rounded"
                            />
                        </div>

                        <div className="space-y-2 border-t border-slate-100 pt-3">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Professional title</Label>
                            <div className="grid grid-cols-3 gap-1.5 mb-2">
                                {(['s', 'm', 'l'] as const).map((sz) => (
                                    <Button
                                        key={sz}
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        className={cn(
                                            'h-8 text-[10px] font-bold uppercase rounded-lg border-2',
                                            (design.personalDetails.jobTitleSize ?? 'm') === sz
                                                ? 'border-primary text-primary bg-primary/5'
                                                : 'text-slate-400 border-slate-200'
                                        )}
                                        onClick={() => updateDesign('personalDetails', 'jobTitleSize', sz)}
                                    >
                                        {sz}
                                    </Button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                {([
                                    { id: 'same-line' as const, label: 'Same line' },
                                    { id: 'below' as const, label: 'Below' },
                                ]).map((row) => (
                                    <Button
                                        key={row.id}
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        className={cn(
                                            'h-8 text-[10px] font-bold rounded-lg border-2',
                                            (design.personalDetails.jobTitlePlacement ?? 'below') === row.id
                                                ? 'border-primary text-primary bg-primary/5'
                                                : 'text-slate-400 border-slate-200'
                                        )}
                                        onClick={() => updateDesign('personalDetails', 'jobTitlePlacement', row.id)}
                                    >
                                        {row.label}
                                    </Button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { id: 'normal' as const, label: 'Normal' },
                                    { id: 'italic' as const, label: 'Italic' },
                                ]).map((row) => (
                                    <Button
                                        key={row.id}
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        className={cn(
                                            'h-8 text-[10px] font-bold rounded-lg border-2',
                                            (design.personalDetails.jobTitleStyle ?? 'normal') === row.id
                                                ? 'border-primary text-primary bg-primary/5'
                                                : 'text-slate-400 border-slate-200'
                                        )}
                                        onClick={() => updateDesign('personalDetails', 'jobTitleStyle', row.id)}
                                    >
                                        {row.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 border-t border-slate-100 pt-3">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Contact icon style</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { id: 'none', label: 'None' },
                                    { id: 'circle-filled', label: '●' },
                                    { id: 'rounded-filled', label: '▢' },
                                    { id: 'square-filled', label: '■' },
                                    { id: 'circle-outline', label: '○' },
                                    { id: 'rounded-outline', label: '▢' },
                                    { id: 'square-outline', label: '□' },
                                ].map((st) => (
                                    <Button
                                        key={st.id}
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        className={cn(
                                            'h-8 w-8 p-0 text-xs rounded-lg border-2',
                                            design.personalDetails.iconStyle === st.id
                                                ? 'border-primary text-primary bg-primary/5 font-bold'
                                                : 'text-slate-400 border-slate-200'
                                        )}
                                        title={st.id}
                                        onClick={() => updateDesign('personalDetails', 'iconStyle', st.id)}
                                    >
                                        {st.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-center">
                            <ImageIcon className="h-6 w-6 mx-auto text-slate-300 mb-2" />
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                Photo options appear when you add a photo in Personal Information.
                            </p>
                            <label className="mt-2 flex items-center justify-center gap-2 text-[10px] text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={design.personalDetails.showPhoto}
                                    onChange={(e) => updateDesign('personalDetails', 'showPhoto', e.target.checked)}
                                    className="w-3.5 h-3.5 accent-primary rounded"
                                />
                                Show photo slot
                            </label>
                        </div>
                    </div>
                </DesignAccordionItem>

                <DesignAccordionItem
                    icon={<Sliders className="w-4 h-4" />}
                    title="Experience & Education"
                    description="Ordering and grouping"
                >
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Work Layout</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'title-employer', label: 'Title - Employer' },
                                    { id: 'employer-title', label: 'Employer - Title' }
                                ].map((item) => (
                                    <Button
                                        key={item.id}
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "justify-start h-8 text-[10px] transition-all border-2",
                                            design.sectionSettings.workExperience.order === item.id ? "border-primary text-primary bg-primary/5 shadow-sm font-bold" : "text-slate-400 font-medium"
                                        )}
                                        onClickCapture={() => updateSubDesign('sectionSettings', 'workExperience', 'order', item.id)}
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Group Promotions</Label>
                            <input
                                type="checkbox"
                                checked={design.sectionSettings.workExperience.groupPromotions}
                                onChange={(e) => updateSubDesign('sectionSettings', 'workExperience', 'groupPromotions', e.target.checked)}
                                className="w-4 h-4 accent-primary"
                            />
                        </div>
                    </div>
                </DesignAccordionItem>

                <DesignAccordionItem
                    icon={<Check className="w-4 h-4" />}
                    title="Skills & Sections"
                    description="Display styles for skills"
                >
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Skills Style</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {['grid', 'bubble', 'compact', 'level'].map((style) => (
                                    <Button
                                        key={style}
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "capitalize h-8 text-xs rounded-lg transition-all border-2",
                                            design.sectionSettings.skills === style ? "border-primary text-primary bg-primary/5 shadow-sm font-bold" : "text-slate-400 font-medium"
                                        )}
                                        onClickCapture={() => updateDesign('sectionSettings', 'skills', style)}
                                    >
                                        {style}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </DesignAccordionItem>
            </div>
        </div>
    );
};

interface DesignAccordionItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
}

const DesignAccordionItem: React.FC<DesignAccordionItemProps> = ({ icon, title, description, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl transition-colors",
                        isOpen ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                    )}>
                        {icon}
                    </div>
                    <div className="text-left">
                        <span className={cn(
                            "block text-sm font-bold transition-colors",
                            isOpen ? "text-primary" : "text-slate-800"
                        )}>{title}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{description}</span>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 border-t border-slate-100/50">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomizeForm;
