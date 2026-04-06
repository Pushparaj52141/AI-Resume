/**
 * Root Layout for MyDreamResume
 * Next.js 14 App Router with dark mode support and metadata
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

/** Subset of weights — full range + mega Google Fonts link was duplicating downloads and blocking first paint */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'MyDreamResume - Professional Resume Creation Tool',
    template: '%s | MyDreamResume'
  },
  description: 'Create professional, ATS-optimized resumes with AI assistance. Advanced resume builder with real-time ATS scoring, multiple templates, and export options.',
  keywords: [
    'resume builder',
    'AI resume',
    'ATS optimization',
    'professional resume',
    'job application',
    'CV builder',
    'resume templates',
    'career tools'
  ],
  authors: [{ name: 'MyDreamResume' }],
  creator: 'MyDreamResume',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'MyDreamResume - Professional Resume Creation Tool',
    description: 'Create professional, ATS-optimized resumes with AI assistance. Advanced resume builder with real-time ATS scoring.',
    siteName: 'MyDreamResume',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyDreamResume - Professional Resume Creation Tool',
    description: 'Create professional, ATS-optimized resumes with AI assistance.',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//api.groq.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body 
        className={`${inter.variable} font-sans antialiased overflow-x-hidden`}
        suppressHydrationWarning
      >
        {/* Global accessibility skip link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 glass-button text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          Skip to main content
        </a>
        
        {/* Premium background — fixed gradient */}
        <div className="fixed inset-0 -z-10">
          {/* Primary gradient background - much more subtle */}
          <div className="absolute inset-0 gradient-animated opacity-60" />
          
          {/* Floating orbs for visual depth - Toned Down */}
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-10"
               style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)' }} />
          <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full blur-3xl opacity-15"
               style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fdba74 100%)' }} />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-8"
               style={{ background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #fb923c 100%)' }} />
          
          {/* Mesh gradient overlay - Very Subtle */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              background: `
                radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(234, 88, 12, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(100, 116, 139, 0.05) 0%, transparent 50%)
              `
            }} />
          </div>
        </div>
        
        {/* Main content wrapper with glass morphism */}
        <div className="relative z-0 min-h-screen">
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
        
        {/* Development indicator with glass effect */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 z-50 glass-card px-3 py-1.5 rounded-lg text-xs font-mono text-foreground">
            <span className="gradient-text font-semibold">DEV</span>
          </div>
        )}
      </body>
    </html>
  );
}
