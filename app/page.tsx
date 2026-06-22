'use client'

import { useState, useEffect } from 'react'
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
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Cek login status (TANPA blocking)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setIsLoggedIn(true)
          // Cek role tapi JANGAN redirect otomatis
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle()
          
          if (profile?.role) {
            setUserRole(profile.role)
          }
        }
      } catch (err) {
        console.error('Auth check error:', err)
      }
    }

    checkAuth()
  }, [])

  // Handler untuk tombol Dashboard
  const handleDashboardClick = () => {
    if (isLoggedIn && userRole) {
      // Sudah login, langsung ke dashboard sesuai role
      const dashboardPath = userRole === 'siswa' 
        ? '/dashboard/student' 
        : userRole === 'tutor'
        ? '/dashboard/tutor'
        : userRole === 'admin'
        ? '/dashboard/admin'
        : '/dashboard'
      
      router.push(dashboardPath)
    } else {
      // Belum login, ke login page
      router.push('/auth/login')
    }
  }

  return (
    <div className="w-full">
      <Header onDashboardClick={handleDashboardClick} />
      <HeroWithAuth onDashboardClick={handleDashboardClick} />
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