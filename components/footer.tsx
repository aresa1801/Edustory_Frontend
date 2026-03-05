'use client'

import Link from 'next/link'
import { BookOpen, MapPin, Phone, Mail, MessageCircle, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-foreground text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Logo & Tagline */}
          <div>
            <div className="flex items-center gap-2 font-bold text-2xl mb-4">
              <BookOpen className="w-8 h-8" />
              <span>EduStory</span>
            </div>
            <p className="text-white/70 mb-6">
              Platform pembelajaran privat terpercaya dengan pengajar profesional dan personalized.
            </p>
            {/* Social Media Icons */}
            <div className="flex gap-3">
              <a href="#" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-6">Menu Utama</h4>
            <ul className="space-y-3">
              <li>
                <a href="#home" className="text-white/70 hover:text-white transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#layanan" className="text-white/70 hover:text-white transition-colors">
                  Layanan
                </a>
              </li>
              <li>
                <a href="#program" className="text-white/70 hover:text-white transition-colors">
                  Program
                </a>
              </li>
              <li>
                <a href="#tentang" className="text-white/70 hover:text-white transition-colors">
                  Tentang Kami
                </a>
              </li>
              <li>
                <a href="#blog" className="text-white/70 hover:text-white transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h4 className="font-semibold text-lg mb-6">Layanan Kami</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  Les Privat
                </a>
              </li>
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  Les Online
                </a>
              </li>
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  Homeschooling
                </a>
              </li>
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  Corporate Training
                </a>
              </li>
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">
                  Kelas Semi-Privat
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-6">Hubungi Kami</h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0 text-primary" />
                <p className="text-white/70">
                  Jl. Pendidikan No. 123<br />
                  Jakarta, Indonesia 12345
                </p>
              </div>
              <div className="flex gap-3">
                <Phone className="w-5 h-5 flex-shrink-0 text-primary" />
                <a href="tel:+6281234567890" className="text-white/70 hover:text-white transition-colors">
                  +62 812-3456-7890
                </a>
              </div>
              <div className="flex gap-3">
                <Mail className="w-5 h-5 flex-shrink-0 text-primary" />
                <a href="mailto:info@edustory.com" className="text-white/70 hover:text-white transition-colors">
                  info@edustory.com
                </a>
              </div>
              <div className="flex gap-3">
                <MessageCircle className="w-5 h-5 flex-shrink-0 text-primary" />
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Chat WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/60 text-sm">
              &copy; {currentYear} EduStory. Semua hak cipta dilindungi.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                Kebijakan Privasi
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                Syarat & Ketentuan
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                FAQ
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
