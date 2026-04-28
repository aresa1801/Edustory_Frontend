'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle, Phone } from 'lucide-react'
import { CONTACT_INFO, WHATSAPP_MESSAGES } from '@/lib/constants'

const CTA = () => {
  const whatsappNumber = CONTACT_INFO.whatsapp
  const phoneNumber = CONTACT_INFO.phoneFormatted

  const openWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber}`, '_blank')
  }

  return (
    <section id="kontak" className="w-full py-16 md:py-20 lg:py-24 bg-gradient-to-r from-blue-600 via-blue-700 to-slate-800 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mb-48"></div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Siap Meningkatkan Prestasi Belajar?
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Konsultasi gratis dengan tim kami sekarang juga dan temukan solusi pembelajaran terbaik untuk Anda
          </p>
        </div>

        {/* Contact Methods */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 mb-8 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Phone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Telepon</h3>
              <a
                href={`tel:${phoneNumber}`}
                className="text-white/80 hover:text-white transition-colors font-medium"
              >
                {phoneNumber}
              </a>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">WhatsApp</h3>
              <button
                onClick={openWhatsApp}
                className="text-white/80 hover:text-white transition-colors font-medium"
              >
                Chat dengan kami
              </button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={openWhatsApp}
              className="bg-success hover:bg-success/90 text-white h-12 px-8 text-base font-semibold flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Sekarang
            </Button>
            <Button
              className="bg-white hover:bg-white/90 text-primary h-12 px-8 text-base font-semibold"
            >
              Hubungi Kami
            </Button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center text-sm text-white/80">
          <p>Kami siap melayani setiap hari pukul 08:00 - 20:00 WIB</p>
          <p>Respons cepat dan konsultasi gratis untuk semua pertanyaan Anda</p>
        </div>
      </div>
    </section>
  )
}

export default CTA
