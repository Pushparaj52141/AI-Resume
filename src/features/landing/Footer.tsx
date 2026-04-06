"use client";

import React from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';

const links = [
  { href: '/builder', label: 'Builder' },
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#faq', label: 'FAQ' },
];

export default function Footer() {
  return (
    <footer className="border-t border-orange-200/40 bg-white/30 backdrop-blur-sm py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-90 transition-opacity">
            <div className="p-2 rounded-lg gradient-primary">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">
              MyDream<span className="gradient-text">Resume</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground font-medium transition-colors">{link.label}</Link>
            ))}
          </nav>

          <p className="text-sm text-muted-foreground">Professional • ATS-Optimized • AI-Powered</p>
        </div>

        <div className="mt-8 pt-8 border-t border-orange-200/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 MyDreamResume. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
