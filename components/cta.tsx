'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle, Phone, Clock } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'

const CTA = () => {
  const whatsappNumber = CONTACT_INFO.whatsapp
  const phoneNumber = CONTACT_INFO.phoneFormatted

  const openWhatsApp = () => {
    window.open(`https://wa.me/${whatsappNumber}`, '_blank')
  }

  return (
    <section id="kontak" className="section-pad">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-12 shadow-soft sm:px-12 md:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="eyebrow">Konsultasi Gratis</span>
              <h2 className="mt-4">Siap tingkatkan prestasi belajar?</h2>
              <p className="mt-4 max-w-lg text-lg text-muted-foreground">
                Ceritakan kebutuhanmu — tim EduStory akan merekomendasikan pengajar dan program yang paling tepat.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={openWhatsApp} size="lg" className="h-12 gap-2 bg-secondary px-7 text-base text-secondary-foreground hover:bg-secondary/90">
                  <MessageCircle className="h-5 w-5" />
                  Chat WhatsApp
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base">
                  <a href={`tel:${phoneNumber}`}>Telepon Kami</a>
                </Button>
              </div>
            </div>

            {/* Contact cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <a
                href={`tel:${phoneNumber}`}
                className="surface flex items-center gap-4 p-5 transition hover:border-primary/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Telepon</p>
                  <p className="font-semibold">{phoneNumber}</p>
                </div>
              </a>
              <button
                onClick={openWhatsApp}
                className="surface flex items-center gap-4 p-5 text-left transition hover:border-secondary/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/12 text-secondary">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="font-semibold">Chat dengan kami</p>
                </div>
              </button>
              <div className="surface flex items-center gap-4 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/16 text-accent-foreground">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Jam layanan</p>
                  <p className="font-semibold">Setiap hari · 08.00–20.00 WIB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTA
