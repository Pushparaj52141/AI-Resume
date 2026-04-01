
import React from 'react';
import { cn } from '@/lib/utils';

function parseCssPx(val: string | number | undefined, fallback: number): number {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
        const n = parseFloat(val.replace(/px/gi, '').trim());
        return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
}

interface ResumePageProps {
    pageNumber: number;
    totalNumbers: number;
    children: React.ReactNode;
    width?: string | number;
    height?: string | number;
    scale?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const ResumePage = React.forwardRef<HTMLDivElement, ResumePageProps>(({
    pageNumber,
    totalNumbers,
    children,
    width = '210mm',
    height = '297mm',
    scale = 1,
    className,
    style,
    ...props
}, ref) => {
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const widthStr = typeof width === 'string' ? width : `${width}px`;
    const heightStr = typeof height === 'string' ? height : `${height}px`;
    const usesMm =
        widthStr.includes('mm') ||
        heightStr.includes('mm') ||
        widthStr.includes('%');

    const {
        marginBottom,
        marginLeft,
        marginRight,
        marginTop,
        ...innerVisualStyle
    } = style ?? {};

    /** mm / % sizing: keep legacy transform-on-one-box (print / PDF paths). */
    if (usesMm) {
        return (
            <div
                ref={ref}
                className={cn(
                    'resume-page shadow-xl relative transition-transform origin-top mx-auto bg-white overflow-hidden',
                    className
                )}
                style={{
                    width: widthStr,
                    height: heightStr,
                    minHeight: heightStr,
                    maxHeight: heightStr,
                    paddingTop: 'var(--resume-margin-tb)',
                    paddingBottom: 'calc(var(--resume-margin-tb) + 20px + 10px)',
                    paddingLeft: 'var(--resume-margin-lr)',
                    paddingRight: 'var(--resume-margin-lr)',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: `scale(${safeScale})`,
                    pageBreakAfter: 'always',
                    breakAfter: 'page',
                    background: 'white',
                    overflow: 'hidden',
                    ...style,
                }}
                {...props}
            >
                <div className="h-full w-full relative">
                    {children}
                    <div className="absolute bottom-4 right-8 text-[10px] text-slate-300 pointer-events-none hidden">
                        Page {pageNumber} of {totalNumbers}
                    </div>
                </div>
            </div>
        );
    }

    const wPx = parseCssPx(width, 794);
    const hPx = parseCssPx(height, 1123);

    /** Outer box matches scaled footprint so zoom below 1 does not leave a huge empty white frame */
    const clipStyle: React.CSSProperties = {
        width: `${wPx * safeScale}px`,
        height: `${hPx * safeScale}px`,
        marginLeft: marginLeft ?? 'auto',
        marginRight: marginRight ?? 'auto',
        marginBottom,
        marginTop,
        overflow: 'hidden',
        background: 'transparent',
        flexShrink: 0,
    };

    /** Fixed A4/Letter footprint — do not let flex/grid content stretch the sheet into one long page */
    const innerStyle: React.CSSProperties = {
        width: `${wPx}px`,
        height: `${hPx}px`,
        minHeight: `${hPx}px`,
        maxHeight: `${hPx}px`,
        paddingTop: 'var(--resume-margin-tb)',
        paddingBottom: 'calc(var(--resume-margin-tb) + 20px + 10px)', // Synced with pagination buffer (20px gap + 10px safety)
        paddingLeft: 'var(--resume-margin-lr)',
        paddingRight: 'var(--resume-margin-lr)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        transform: `scale(${safeScale})`,
        transformOrigin: 'top left',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        background: 'white',
        overflow: 'hidden',
        ...innerVisualStyle,
    };

    return (
        <div className="resume-page-clip" style={clipStyle}>
            <div
                ref={ref}
                className={cn(
                    'resume-page relative overflow-hidden',
                    safeScale < 1 ? 'shadow-md' : 'shadow-xl',
                    className
                )}
                style={innerStyle}
                {...props}
            >
                <div className="min-h-0 flex-1 w-full relative overflow-hidden">
                    {children}

                    <div className="absolute bottom-4 right-8 text-[10px] text-slate-300 pointer-events-none hidden">
                        Page {pageNumber} of {totalNumbers}
                    </div>
                </div>
            </div>
        </div>
    );
});

ResumePage.displayName = 'ResumePage';
