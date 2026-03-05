'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const WhatsAppButton = () => {
  const whatsappNumber = '6281234567890'
  const message = 'Halo, saya ingin konsultasi tentang layanan pembelajaran EduStory.'

  const openWhatsApp = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <Button
      onClick={openWhatsApp}
      size="icon"
      className="fixed bottom-6 right-6 bg-success hover:bg-success/90 text-white shadow-lg rounded-full w-14 h-14 z-40 animate-scale-in"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
    </Button>
  )
}

export default WhatsAppButton
