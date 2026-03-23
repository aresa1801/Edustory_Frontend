'use client'

import Image from 'next/image'
import { X, Star, MapPin, Phone, Mail, Award, Users, BookOpen, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TutorProfileModalProps {
  tutor: {
    id: number
    name: string
    qualification: string
    subjects: string
    experience: string
    rating: string
    image: string
    bio: string
    location: string
    phone: string
    email: string
    certifications: string[]
    specializations: string[]
    studentCount: number
    successRate: string
    hourlyRate: string
    availableDays: string[]
    methodology: string[]
  }
  isOpen: boolean
  onClose: () => void
}

export function TutorProfileModal({ tutor, isOpen, onClose }: TutorProfileModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl border border-border/50 max-w-2xl w-full my-8 shadow-2xl">
        {/* Header with Close Button */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border/30 bg-card/80 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-foreground">Profil Pengajar</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors duration-300"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Photo */}
            <div className="flex-shrink-0">
              <div className="relative w-40 h-52 rounded-xl overflow-hidden border border-border/50">
                <Image
                  src={tutor.image}
                  alt={tutor.name}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="mb-4">
                <h3 className="text-3xl font-bold text-foreground mb-2">{tutor.name}</h3>
                <p className="text-lg text-primary font-semibold mb-1">{tutor.qualification}</p>
                <p className="text-muted-foreground mb-4">{tutor.bio}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-primary/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Rating</span>
                  </div>
                  <p className="text-lg font-bold text-primary">{tutor.rating}</p>
                </div>
                <div className="bg-secondary/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Pengalaman</span>
                  </div>
                  <p className="text-lg font-bold text-secondary">{tutor.experience}</p>
                </div>
                <div className="bg-accent/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="text-sm text-muted-foreground">Murid</span>
                  </div>
                  <p className="text-lg font-bold text-accent">{tutor.studentCount}+</p>
                </div>
                <div className="bg-cyan-500/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-muted-foreground">Tingkat Sukses</span>
                  </div>
                  <p className="text-lg font-bold text-cyan-400">{tutor.successRate}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{tutor.location}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <a href={`tel:${tutor.phone}`} className="hover:text-primary transition-colors">
                    {tutor.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <a href={`mailto:${tutor.email}`} className="hover:text-primary transition-colors">
                    {tutor.email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/30"></div>

          {/* Subjects & Specializations */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Mata Pelajaran
              </h4>
              <div className="space-y-2">
                {tutor.subjects.split(', ').map((subject, idx) => (
                  <div
                    key={idx}
                    className="bg-primary/10 rounded-lg px-4 py-2 text-primary font-medium"
                  >
                    {subject}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-secondary" />
                Keahlian Khusus
              </h4>
              <div className="space-y-2">
                {tutor.specializations.map((spec, idx) => (
                  <div
                    key={idx}
                    className="bg-secondary/10 rounded-lg px-4 py-2 text-secondary font-medium"
                  >
                    {spec}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Methodology */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">Metodologi Pengajaran</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {tutor.methodology.map((method, idx) => (
                <div
                  key={idx}
                  className="bg-slate-700/30 rounded-lg p-4 text-foreground text-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <span>{method}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">Sertifikasi</h4>
            <div className="space-y-2">
              {tutor.certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-accent/10 rounded-lg p-3"
                >
                  <Award className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-foreground text-sm">{cert}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">Ketersediaan</h4>
            <div className="flex flex-wrap gap-2">
              {tutor.availableDays.map((day, idx) => (
                <div
                  key={idx}
                  className="bg-primary/20 border border-primary/50 rounded-full px-4 py-2 text-primary text-sm font-medium"
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/20 rounded-xl p-6 border border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Tarif Perjam</p>
                <p className="text-3xl font-bold text-primary">{tutor.hourlyRate}</p>
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-white px-8 h-12 text-base font-semibold">
                Hubungi Sekarang
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
