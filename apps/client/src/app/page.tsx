'use client';

import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { About } from '@/components/landing/About';
import { Location } from '@/components/landing/Location';
import { Footer } from '@/components/landing/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-white selection:bg-orange-500 selection:text-white">
      <Navbar />
      <Hero />
      <About />
      <Location />
      <Footer />
    </main>
  );
}
