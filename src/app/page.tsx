"use client";

/**
 * Landing Page for Resume AI Builder
 * Above-the-fold stays static; below-the-fold is code-split for faster first paint.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { LandingHeader, Hero } from '@/features/landing';

const TrustBar = dynamic(() => import('@/features/landing/TrustBar'), { ssr: true });
const StatsBanner = dynamic(() => import('@/features/landing/StatsBanner'), { ssr: true });
const Features = dynamic(() => import('@/features/landing/Features'), { ssr: true });
const Testimonials = dynamic(() => import('@/features/landing/Testimonials'), { ssr: true });
const HowItWorks = dynamic(() => import('@/features/landing/HowItWorks'), { ssr: true });
const FAQ = dynamic(() => import('@/features/landing/FAQ'), { ssr: true });
const CTABanner = dynamic(() => import('@/features/landing/CTABanner'), { ssr: true });
const Footer = dynamic(() => import('@/features/landing/Footer'), { ssr: true });

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main id="main-content">
        <Hero />
        <TrustBar />
        <StatsBanner />
        <Features />
        <Testimonials />
        <HowItWorks />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
