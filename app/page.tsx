'use client'

import Header from '@/components/header'
import Hero from '@/components/hero'
import Features from '@/components/features'
import Programs from '@/components/programs'
import HowItWorks from '@/components/how-it-works'
import Testimonials from '@/components/testimonials'
import Tutors from '@/components/tutors'
import Stats from '@/components/stats'
import Blog from '@/components/blog'
import CTA from '@/components/cta'
import Footer from '@/components/footer'
import ScrollToTop from '@/components/scroll-to-top'
import WhatsAppButton from '@/components/whatsapp-button'

export default function Home() {
  return (
    <div className="w-full">
      <Header />
      <Hero />
      <Features />
      <Programs />
      <HowItWorks />
      <Testimonials />
      <Tutors />
      <Stats />
      <Blog />
      <CTA />
      <Footer />
      <ScrollToTop />
      <WhatsAppButton />
    </div>
  )
}
