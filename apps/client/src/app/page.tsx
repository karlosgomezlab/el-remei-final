'use client';

import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { About } from '@/components/landing/About';
import { Location } from '@/components/landing/Location';
import { BookingSystem } from '@/components/landing/BookingSystem';
import { Footer } from '@/components/landing/Footer';
import { Toaster } from 'sonner';

export default function Home() {
  return (
    <main className="min-h-screen bg-white selection:bg-orange-500 selection:text-white">
      <Toaster position="top-center" richColors />
      <Navbar />
      <Hero />
      <About />
      <BookingSystem />
      <Location />
      <Footer />
    </main>
  );
}
