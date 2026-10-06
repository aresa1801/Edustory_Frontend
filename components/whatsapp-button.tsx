'use client'

import { MessageCircle } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'

const WhatsAppButton = () => {
  const whatsappNumber = CONTACT_INFO.whatsapp
  const message = 'Halo, saya ingin konsultasi tentang layanan pembelajaran EduStory.'

  const openWhatsApp = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <button
      onClick={openWhatsApp}
      className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lifted transition-transform duration-200 hover:scale-105 active:scale-95 animate-scale-in"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  )
}

export default WhatsAppButton
