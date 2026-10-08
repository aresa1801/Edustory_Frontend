'use client'

import Link from 'next/link'
import { BookOpen, MapPin, Phone, Mail, MessageCircle, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react'
import { CONTACT_INFO } from '@/lib/constants'

const socials = [
  { icon: Facebook, label: 'Facebook' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Twitter, label: 'Twitter' },
  { icon: Linkedin, label: 'LinkedIn' },
]

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border/70 bg-card">
      <div className="container-page py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpen className="h-4.5 w-4.5" />
              </span>
              <span className="font-display text-xl font-extrabold tracking-tight">
                Edu<span className="text-primary">Story</span>
              </span>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Platform pembelajaran privat terpercaya dengan pengajar profesional dan pendekatan yang personal.
            </p>
            <div className="flex gap-2.5">
              {socials.map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Menu */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-foreground">Menu Utama</h4>
            <ul className="space-y-3 text-sm">
              {[
                ['Home', '#home'],
                ['Layanan', '#layanan'],
                ['Program', '#program'],
                ['Blog', '#blog'],
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-muted-foreground transition-colors hover:text-primary">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-foreground">Layanan Kami</h4>
            <ul className="space-y-3 text-sm">
              {['Les Privat', 'Les Online', 'Homeschooling', 'Corporate Training', 'Kelas Semi-Privat'].map((label) => (
                <li key={label}>
                  <a href="#layanan" className="text-muted-foreground transition-colors hover:text-primary">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-foreground">Hubungi Kami</h4>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 flex-shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Jl. Pendidikan No. 123
                  <br />
                  Jakarta, Indonesia 12345
                </p>
              </div>
              <a href={`tel:${CONTACT_INFO.phone}`} className="flex gap-3 text-muted-foreground transition-colors hover:text-primary">
                <Phone className="h-5 w-5 flex-shrink-0 text-primary" />
                {CONTACT_INFO.phoneFormatted}
              </a>
              <a href={`mailto:${CONTACT_INFO.email}`} className="flex gap-3 text-muted-foreground transition-colors hover:text-primary">
                <Mail className="h-5 w-5 flex-shrink-0 text-primary" />
                {CONTACT_INFO.email}
              </a>
              <a
                href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 text-muted-foreground transition-colors hover:text-primary"
              >
                <MessageCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                Chat WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} EduStory. Semua hak cipta dilindungi.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="#" className="text-muted-foreground transition-colors hover:text-primary">
              Kebijakan Privasi
            </Link>
            <Link href="#" className="text-muted-foreground transition-colors hover:text-primary">
              Syarat &amp; Ketentuan
            </Link>
            <Link href="#" className="text-muted-foreground transition-colors hover:text-primary">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
