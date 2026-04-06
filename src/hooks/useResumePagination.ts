
import { useState, useLayoutEffect, useRef, useEffect, useMemo } from 'react';

interface Dimensions {
    width: number;
    height: number;
    marginTop?: number;
    marginBottom?: number;
}

export interface ResumePaginationOptions {
    /** Single-page layout: skip DOM measurement and pagination (grids, template thumbnails). */
    thumbnail?: boolean;
}

function signatureForPages(pages: any[][]): string {
    return pages.map((p) => p.map((i) => i.id).join(',')).join('|');
}

export const useResumePagination = (
    items: any[],
    _renderItem: (item: any) => React.ReactNode,
    pageDimensions: Dimensions,
    opts?: ResumePaginationOptions
) => {
    const thumbnail = opts?.thumbnail === true;
    const { height: PAGE_HEIGHT, marginTop: PAGE_PADDING_TOP = 40, marginBottom: PAGE_PADDING_BOTTOM = 40 } = pageDimensions;
    const USABLE_PAGE_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM - 10;

    const itemsKey = useMemo(() => items.map((i) => i.id).join('|'), [items]);

    const [pages, setPages] = useState<any[][]>(() =>
        thumbnail && items.length ? [items] : []
    );
    const [measuring, setMeasuring] = useState(() => !thumbnail);
    const containerRef = useRef<HTMLDivElement>(null);
    const [itemHeights, setItemHeights] = useState<Record<string, number>>({});

    const heightsRef = useRef<Record<string, number>>({});
    const pagesSigRef = useRef<string>('');

    useLayoutEffect(() => {
        if (thumbnail) {
            const next = items.length ? [items] : [];
            const sig = signatureForPages(next);
            if (sig !== pagesSigRef.current) {
                pagesSigRef.current = sig;
                setPages(next);
            }
            setMeasuring(false);
            return;
        }

        if (items.length === 0) {
            heightsRef.current = {};
            pagesSigRef.current = '';
            setItemHeights({});
            setPages([]);
            setMeasuring(false);
            return;
        }

        if (!containerRef.current) return;

        heightsRef.current = {};
        pagesSigRef.current = '';
        setItemHeights({});
        setMeasuring(true);

        const measure = () => {
            if (!containerRef.current) return;

            const newHeights: Record<string, number> = {};
            const children = Array.from(containerRef.current.children) as HTMLElement[];
            let hasChanges = false;

            children.forEach((child) => {
                const id = child.getAttribute('data-id');
                if (id) {
                    const rect = child.getBoundingClientRect();
                    let height = rect.height;

                    const firstChild = child.firstElementChild;
                    if (firstChild) {
                        const style = window.getComputedStyle(firstChild);
                        const marginTop = parseFloat(style.marginTop) || 0;
                        const marginBottom = parseFloat(style.marginBottom) || 0;
                        height += marginTop + marginBottom;
                    }

                    newHeights[id] = height;

                    if (heightsRef.current[id] !== height) {
                        hasChanges = true;
                    }
                }
            });

            if (!hasChanges && Object.keys(newHeights).length !== Object.keys(heightsRef.current).length) {
                hasChanges = true;
            }

            if (hasChanges && Object.keys(newHeights).length > 0) {
                heightsRef.current = newHeights;
                setItemHeights(newHeights);
                setMeasuring(false);
            }
        };

        // Double rAF: first paint often reports 0 heights; second pass gets real layout for A4 breaks
        let raf1 = 0;
        let raf2 = 0;
        raf1 = requestAnimationFrame(() => {
            measure();
            raf2 = requestAnimationFrame(measure);
        });
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [thumbnail, itemsKey, items.length, pageDimensions.width, pageDimensions.height]);

    useEffect(() => {
        if (thumbnail) return;
        if (measuring || Object.keys(itemHeights).length === 0) return;

        const newPages: any[][] = [];
        let currentPage: any[] = [];
        let currentHeight = 0;
        let skipNext = false;

        const isSectionOrEntryHeading = (it: any) =>
            it.type === 'section-title' ||
            (it.type === 'section-item' && it.content?._renderType === 'header');

        for (let index = 0; index < items.length; index++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }

            const item = items[index];

            if (item.type === 'page-break') {
                if (currentPage.length > 0) {
                    newPages.push(currentPage);
                }
                currentPage = [];
                currentHeight = 0;
                continue;
            }

            const sectionHeight = itemHeights[item.id] || 0;

            let shouldBreak = false;

            if (currentPage.length > 0) {
                if (currentHeight + sectionHeight > USABLE_PAGE_HEIGHT) {
                    shouldBreak = true;
                } else if (isSectionOrEntryHeading(item) && index < items.length - 1) {
                    const nextItem = items[index + 1];
                    const nextHeight = itemHeights[nextItem.id] || 0;

                    if (currentHeight + sectionHeight + nextHeight > USABLE_PAGE_HEIGHT) {
                        shouldBreak = true;
                    }
                }
            }

            if (shouldBreak) {
                newPages.push(currentPage);
                currentPage = [item];
                currentHeight = sectionHeight;

                /**
                 * Avoid “widow” headings: after a page break, a section title (or job entry header)
                 * was sometimes the only block on a page while the next block wrapped to the
                 * following page (title + next measured taller than one page). If heading + next
                 * still fit on an empty page, keep them together.
                 */
                const nextItem = items[index + 1];
                const nextH = nextItem ? itemHeights[nextItem.id] || 0 : 0;
                if (
                    isSectionOrEntryHeading(item) &&
                    nextItem &&
                    nextItem.type !== 'page-break' &&
                    sectionHeight + nextH <= USABLE_PAGE_HEIGHT
                ) {
                    currentPage.push(nextItem);
                    currentHeight += nextH;
                    skipNext = true;
                }
            } else {
                currentPage.push(item);
                currentHeight += sectionHeight;
            }
        }

        if (currentPage.length > 0) {
            newPages.push(currentPage);
        }

        const sig = signatureForPages(newPages);
        if (sig !== pagesSigRef.current) {
            pagesSigRef.current = sig;
            setPages(newPages);
        }
    }, [thumbnail, items, itemsKey, itemHeights, measuring, USABLE_PAGE_HEIGHT]);

    return {
        pages,
        measuring,
        containerRef
    };
};
