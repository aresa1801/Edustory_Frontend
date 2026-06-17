'use client'

import { useEffect, useState } from 'react'
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
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // User sudah login, cek role
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle()

          if (profile?.role) {
            // Sudah punya role, langsung ke dashboard
            const dashboardPath = profile.role === 'siswa' 
              ? '/dashboard/student' 
              : profile.role === 'tutor'
              ? '/dashboard/tutor'
              : profile.role === 'admin'
              ? '/dashboard/admin'
              : null
            
            if (dashboardPath) {
              router.replace(dashboardPath)
              return
            }
          }
          // Jika belum punya role, biarkan di landing page
        }
      } catch (err) {
        console.error('Auth check error:', err)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [router])

  // Tampilkan loading saat mengecek auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

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