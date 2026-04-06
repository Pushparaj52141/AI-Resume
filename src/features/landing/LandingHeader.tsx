"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
    setMobileMenuOpen(false);
  };

  const userInitial =
    user?.name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    '?';

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-orange-200/30 transition-all duration-300 ${scrolled ? 'glass-card bg-white/80 backdrop-blur-md shadow-sm' : 'glass-card'
        }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="gradient-primary p-2.5 rounded-xl shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900">
                MyDream<span className="gradient-text">Resume</span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/#features"
              className="text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/#faq"
              className="text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              FAQ
            </Link>
            {!loading && (
              user ? (
                <>
                  <Button asChild variant="ghost" className="rounded-xl text-muted-foreground hover:text-foreground">
                    <Link href="/dashboard">My Resumes</Link>
                  </Button>
                  <Button asChild className="gradient-primary text-white font-semibold rounded-xl">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="rounded-xl"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-sm font-bold text-white shadow-md"
                    title={user.name}
                    aria-label={`Signed in as ${user.name}`}
                  >
                    {userInitial}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Button asChild className="gradient-primary text-white font-semibold rounded-xl">
                    <Link href="/signup">Sign up</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/login?redirect=/dashboard">Start Building</Link>
                  </Button>
                </>
              )
            )}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-orange-200/30 glass-card"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <Link
                href="/#features"
                className="text-muted-foreground hover:text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/#how-it-works"
                className="text-muted-foreground hover:text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </Link>
              <Link
                href="/#faq"
                className="text-muted-foreground hover:text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              {!loading && (
                user ? (
                  <>
                    <Button asChild className="gradient-primary text-white font-semibold rounded-xl w-full">
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        My Resumes
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full rounded-xl font-semibold">
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                    <div className="flex items-center justify-center gap-3 py-2 border-t border-orange-200/30 mt-1 pt-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-base font-bold text-white shadow-md"
                        title={user.name}
                        aria-label={`Signed in as ${user.name}`}
                      >
                        {userInitial}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-muted-foreground hover:text-foreground font-medium py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Button asChild className="gradient-primary text-white font-semibold rounded-xl w-full">
                      <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                        Sign up
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full rounded-xl">
                      <Link href="/login?redirect=/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        Start Building
                      </Link>
                    </Button>
                  </>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
