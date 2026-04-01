"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignJustify,
    Link as LinkIcon,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
    onAssist?: (mode: 'improve' | 'grammar' | 'shorter') => void;
}

function richTextPropsEqual(prev: RichTextEditorProps, next: RichTextEditorProps) {
    return (
        prev.value === next.value &&
        prev.placeholder === next.placeholder &&
        prev.className === next.className &&
        prev.minHeight === next.minHeight &&
        prev.onAssist === next.onAssist
    );
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder,
    className,
    minHeight = "150px",
    onAssist
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [formattingState, setFormattingState] = useState({
        bold: false,
        italic: false,
        underline: false,
        bullet: false,
        numbered: false,
    });
    const [alignment, setAlignment] = useState<'left' | 'center' | 'justify'>('left');

    const syncValue = useCallback(() => {
        if (!editorRef.current) return;
        const currentHtml = editorRef.current.innerHTML;
        if (currentHtml !== value) {
            onChange(currentHtml);
        }
    }, [onChange, value]);

    const refreshFormatting = useCallback(() => {
        if (!editorRef.current) return;
        const selection = document.getSelection();
        if (!selection || !editorRef.current.contains(selection.anchorNode)) {
            return;
        }

        setFormattingState({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            bullet: document.queryCommandState('insertUnorderedList'),
            numbered: document.queryCommandState('insertOrderedList'),
        });

        if (document.queryCommandState('justifyCenter')) {
            setAlignment('center');
        } else if (document.queryCommandState('justifyFull')) {
            setAlignment('justify');
        } else {
            setAlignment('left');
        }
    }, []);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    useEffect(() => {
        const handler = () => refreshFormatting();
        document.addEventListener('selectionchange', handler);
        return () => document.removeEventListener('selectionchange', handler);
    }, [refreshFormatting]);

    const execCommand = useCallback((command: string, val?: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(command, false, val);
        syncValue();
        refreshFormatting();
    }, [syncValue, refreshFormatting]);

    const toolbarButtonClass = (active?: boolean) =>
        cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold transition-all duration-200 border",
            active
                ? "text-white border-orange-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.22)] bg-[linear-gradient(to_right,#f59e0b,#f97316,#ea580c,#dc2626)]"
                : "border-transparent text-muted-foreground bg-transparent hover:bg-muted/50 hover:text-foreground"
        );

    const preventBlur = (e: React.MouseEvent) => e.preventDefault();

    return (
        <div className={cn(
            "rounded-2xl border transition-all duration-300 overflow-hidden",
            isFocused ? "border-primary/50 shadow-lg ring-1 ring-primary/20" : "border-border/70",
            className
        )}>
            {/* Toolbar - Sticky-ready or localized */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-glass-light/10 backdrop-blur-sm px-3 py-2">
                <div className="flex flex-wrap gap-1">
                    <button
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => execCommand('bold')}
                        className={toolbarButtonClass(formattingState.bold)}
                    >
                        <Bold className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => execCommand('italic')}
                        className={toolbarButtonClass(formattingState.italic)}
                    >
                        <Italic className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => execCommand('underline')}
                        className={toolbarButtonClass(formattingState.underline)}
                    >
                        <Underline className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => {
                            const url = window.prompt('Enter URL', 'https://');
                            if (url) execCommand('createLink', url);
                        }}
                        className={toolbarButtonClass()}
                    >
                        <LinkIcon className="h-4 w-4" />
                    </button>

                    <div className="h-5 w-px bg-border/70 mx-1 self-center" />

                    <button
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => execCommand('insertUnorderedList')}
                        className={toolbarButtonClass(formattingState.bullet)}
                    >
                        <List className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => execCommand('insertOrderedList')}
                        className={toolbarButtonClass(formattingState.numbered)}
                    >
                        <ListOrdered className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => execCommand('justifyLeft')}
                        className={toolbarButtonClass(alignment === 'left')}
                    >
                        <AlignLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => execCommand('justifyCenter')}
                        className={toolbarButtonClass(alignment === 'center')}
                    >
                        <AlignCenter className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => execCommand('justifyFull')}
                        className={toolbarButtonClass(alignment === 'justify')}
                    >
                        <AlignJustify className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Editable Content Area */}
            <div className="relative bg-background/40">
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={syncValue}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        syncValue();
                        setIsFocused(false);
                    }}
                    style={{ minHeight, textAlign: alignment === 'justify' ? 'justify' : alignment }}
                    className="px-4 py-3 text-base leading-relaxed focus:outline-none prose prose-slate max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5 selection:bg-primary/20"
                    suppressContentEditableWarning
                />
                {(!value || value === '<br>' || value.replace(/<[^>]+>/g, '').trim().length === 0) && (
                    <span className="pointer-events-none absolute left-4 top-3 text-sm text-muted-foreground opacity-60 italic">
                        {placeholder || "Start typing..."}
                    </span>
                )}
            </div>

            {onAssist && (
                <div className="flex flex-wrap gap-2 border-t border-border/70 bg-muted/20 px-3 py-2">
                    <button
                        onClick={() => onAssist('improve')}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white bg-[linear-gradient(to_right,#f59e0b,#f97316,#ea580c,#dc2626)] hover:shadow-md transition-all uppercase tracking-wider shadow-sm shadow-orange-200/50"
                    >
                        <Sparkles className="h-3 w-3" />
                        Improve Writing
                    </button>
                </div>
            )}
        </div>
    );
};

export default React.memo(RichTextEditor, richTextPropsEqual);
