import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ResumeData } from './types'
import { apiClient } from './apiClient'

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to readable string
 */
export function formatDate(date: string): string {
  if (!date) return '';

  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  } catch {
    return date;
  }
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download content as file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Local storage helpers
 */
export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};

/**
 * Resume data storage functions
 */
const RESUME_DATA_KEY = 'resume-ai-data';
const CURRENT_RESUME_ID_KEY = 'current-resume-id';

/**
 * Get current resume ID from localStorage
 */
function getCurrentResumeId(templateId?: string): string | null {
  if (typeof window === 'undefined') return null;
  const key = templateId ? `${CURRENT_RESUME_ID_KEY}-${templateId}` : CURRENT_RESUME_ID_KEY;
  return localStorage.getItem(key);
}

/**
 * Set current resume ID in localStorage
 */
function setCurrentResumeId(id: string | null, templateId?: string): void {
  if (typeof window === 'undefined') return;
  const key = templateId ? `${CURRENT_RESUME_ID_KEY}-${templateId}` : CURRENT_RESUME_ID_KEY;
  if (id) {
    localStorage.setItem(key, id);
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Load resume data from MongoDB API
 */
export async function loadResumeDataFromDB(templateId?: string, explicitId?: string): Promise<ResumeData | null> {
  try {
    const resumeId = explicitId || getCurrentResumeId(templateId);

    if (!resumeId) {
      // Try to get the most recent resume
      const response = await apiClient('/api/resumes');
      if (!response.ok) {
        return null;
      }
      const resumes = await response.json();
      if (resumes && resumes.length > 0) {
        // Find if any resume matches the templateId in its design
        const matchingResume = templateId
          ? resumes.find((r: any) => r.design?.templateId === templateId)
          : resumes[0];

        if (matchingResume) {
          setCurrentResumeId(matchingResume.id, templateId);
          return matchingResume as ResumeData;
        }
      }
      return null;
    }

    const response = await apiClient(`/api/resumes?id=${resumeId}`);
    if (!response.ok) {
      // Resume not found (404) or other error - clear stale ID
      setCurrentResumeId(null, templateId);
      return null;
    }
    const data = await response.json();
    return data as ResumeData;
  } catch (error) {
    console.error('Failed to load resume data from DB:', error);
    return null;
  }
}

/**
 * Variable to track if a save is in progress to prevent duplication
 */
let saveLock: Promise<any> | null = null;

/**
 * Save resume data to MongoDB API
 */
export async function saveResumeDataToDB(data: ResumeData): Promise<string | null> {
  // If a save is already in progress, wait for it to complete
  if (saveLock) {
    await saveLock;
  }

  // Stable ref so the async `finally` can compare to this save without TDZ on a const/let self-reference
  const saveRef: { promise: Promise<string | null> | null } = { promise: null };
  saveRef.promise = (async () => {
    try {
      const templateId = data.design?.templateId;
      const resumeId = getCurrentResumeId(templateId);

      if (resumeId) {
        // Update existing resume
        const response = await apiClient('/api/resumes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: resumeId, ...data }),
        });

        if (response.status === 404) {
          setCurrentResumeId(null, templateId);
        } else if (!response.ok) {
          throw new Error('Failed to update resume');
        } else {
          return resumeId;
        }
      }

      // Create new resume
      const response = await apiClient('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create resume');

      const result = await response.json();
      setCurrentResumeId(result.id, templateId);
      return result.id;
    } catch (error) {
      console.error('Failed to save resume data to DB:', error);
      return null;
    } finally {
      if (saveLock === saveRef.promise) {
        saveLock = null;
      }
    }
  })();

  saveLock = saveRef.promise;
  return saveRef.promise;
}

/**
 * Delete resume from MongoDB API
 */
export async function deleteResumeFromDB(resumeId: string, templateId?: string): Promise<boolean> {
  try {
    const response = await apiClient(`/api/resumes?id=${resumeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete resume');
    }

    // If deleted resume was current, clear the ID
    if (getCurrentResumeId(templateId) === resumeId) {
      setCurrentResumeId(null, templateId);
    }

    return true;
  } catch (error) {
    console.error('Failed to delete resume from DB:', error);
    return false;
  }
}

/**
 * Load resume data (localStorage fallback for backward compatibility)
 */
export function loadResumeData(templateId?: string): ResumeData | null {
  try {
    const key = templateId ? `${RESUME_DATA_KEY}-${templateId}` : RESUME_DATA_KEY;
    const data = storage.get<ResumeData | null>(key, null);
    return data;
  } catch (error) {
    console.error('Failed to load resume data:', error);
    return null;
  }
}

/**
 * Save resume data (localStorage fallback for backward compatibility)
 * Also saves to MongoDB if available
 */
export function saveResumeData(data: ResumeData): void {
  try {
    const templateId = data.design?.templateId;
    // Save to localStorage for backward compatibility
    const key = templateId ? `${RESUME_DATA_KEY}-${templateId}` : RESUME_DATA_KEY;
    storage.set(key, data);

    // Also save to MongoDB (fire and forget)
    saveResumeDataToDB(data).catch((error) => {
      console.error('Failed to save to MongoDB:', error);
    });
  } catch (error) {
    console.error('Failed to save resume data:', error);
  }
}

/**
 * Clear resume data (localStorage)
 */
export function clearResumeData(templateId?: string): void {
  try {
    const key = templateId ? `${RESUME_DATA_KEY}-${templateId}` : RESUME_DATA_KEY;
    storage.remove(key);
    setCurrentResumeId(null, templateId);
  } catch (error) {
    console.error('Failed to clear resume data:', error);
  }
}

/**
 * Remove AI boilerplate phrases from generated summaries
 */
export function sanitizeSummary(text: string): string {
  if (!text) return text;
  let cleaned = text.trim();
  const patterns = [
    /here['']s\s+(a|an)\s+\d+%?\s*ats[-\s]?compatible resume that incorporates.+?brand:?/i,
    /here['']s\s+(a|an)\s+professional summary that.+?:/i,
    /this\s+professional summary highlights.+?:/i
  ];
  patterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '').trim();
  });
  return cleaned.replace(/^\:+/, '').trim();
}

/**
 * Font utilities for Google Fonts
 */
const GOOGLE_FONTS: Record<string, string> = {
  'Inter': 'Inter',
  'Roboto': 'Roboto',
  'Open Sans': 'Open+Sans',
  'Lato': 'Lato',
  'Poppins': 'Poppins',
  'Montserrat': 'Montserrat',
  'EB Garamond': 'EB+Garamond',
  'Playfair Display': 'Playfair+Display',
  'Merriweather': 'Merriweather',
  'Source Sans Pro': 'Source+Sans+Pro',
  'Raleway': 'Raleway',
  'Crimson Text': 'Crimson+Text',
  'Libre Baskerville': 'Libre+Baskerville',
  'Lora': 'Lora',
  'PT Serif': 'PT+Serif',
  'Roboto Slab': 'Roboto+Slab',
  'Work Sans': 'Work+Sans',
  'Nunito': 'Nunito',
  'Ubuntu': 'Ubuntu',
  'Oswald': 'Oswald',
};

const SYSTEM_FONTS: string[] = ['Georgia', 'Times New Roman', 'Arial', 'Calibri'];

/**
 * Get Google Fonts URL for a font family
 */
export function getGoogleFontUrl(fontFamily: string): string | null {
  if (SYSTEM_FONTS.includes(fontFamily)) {
    return null; // System fonts don't need loading
  }
  const fontKey = GOOGLE_FONTS[fontFamily];
  if (!fontKey) return null;
  return `https://fonts.googleapis.com/css2?family=${fontKey}:wght@400;500;600;700;800&display=swap`;
}

/**
 * Load a Google Font dynamically
 */
export function loadGoogleFont(fontFamily: string): void {
  if (typeof window === 'undefined') return;
  if (SYSTEM_FONTS.includes(fontFamily)) return;

  const fontUrl = getGoogleFontUrl(fontFamily);
  if (!fontUrl) return;

  // Check if font is already loaded
  const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontUrl;
  document.head.appendChild(link);
}

/**
 * Load all available Google Fonts
 */
export function loadAllGoogleFonts(): void {
  if (typeof window === 'undefined') return;
  Object.keys(GOOGLE_FONTS).forEach(font => loadGoogleFont(font));
}

/**
 * Decode HTML entities to safe string
 */
// Decode HTML entities to safe string
export function decodeHtml(html: string): string {
  if (!html) return html;

  if (typeof window === 'undefined') {
    // Basic server-side fallback
    return html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  // Recursively decode entities (up to a limit to prevent infinite loops)
  // This fixes the issue where content appears as "coded" HTML text (e.g. &lt;div... -> <div...)
  // We do NOT strip styles or classes to preserve the original formatting/template.
  const txt = document.createElement("textarea");
  let value = html;
  let limit = 0;

  while (limit < 5 && (value.includes('&lt;') || value.includes('&amp;') || value.includes('&#') || value.includes('&quot;'))) {
    txt.innerHTML = value;
    if (txt.value === value) break;
    value = txt.value;
    limit++;
  }

  return value;
}
