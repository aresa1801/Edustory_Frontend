'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'
import Header from '@/components/header'
import HeroWithAuth from '@/components/hero-with-auth'
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
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // User sudah login, cek apakah sudah punya role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role) {
          // Sudah punya role, langsung ke dashboard
          const dashboardPath = profile.role === 'siswa' 
            ? '/dashboard/student' 
            : profile.role === 'tutor'
            ? '/dashboard/tutor'
            : '/dashboard/admin'
          
          router.replace(dashboardPath)
        }
        // Jika belum punya role, biarkan di landing page dulu
        // Nanti kalau klik tombol "Dashboard" baru redirect ke select-role
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="w-full">
      <Header />
      <HeroWithAuth />
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