import Link from 'next/link'
import type { Metadata } from 'next'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { CONTACT_INFO, WHATSAPP_MESSAGES } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Kontak — EduStory',
  description:
    'Hubungi EduStory untuk konsultasi les privat: WhatsApp, telepon, email, dan alamat di Yogyakarta.',
}

const whatsappLink = `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(
  WHATSAPP_MESSAGES.consultation,
)}`

export default function KontakPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="border-b border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Kontak</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight tracking-tight md:text-5xl">
              Mari bicarakan kebutuhan belajar siswa.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Konsultasi tidak berbayar dan tidak mengikat. Kami akan mendengar dulu, baru menyarankan program yang
              sesuai — termasuk bila kesimpulannya belum perlu les.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-primary/30 bg-primary/5 p-6 transition hover:border-primary/50"
            >
              <MessageCircle className="h-5 w-5 text-primary" />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Paling cepat
              </p>
              <h2 className="mt-1 font-display text-xl">Chat WhatsApp</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Balasan pada jam kerja, biasanya dalam hitungan menit.
              </p>
              <p className="mt-3 font-mono text-[13px] font-medium">{CONTACT_INFO.phoneFormatted}</p>
            </a>

            <div className="rounded-2xl border border-border bg-card p-6">
              <Phone className="h-5 w-5 text-primary" />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Telepon
              </p>
              <h2 className="mt-1 font-display text-xl">Hubungi langsung</h2>
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="mt-3 block font-mono text-[13px] font-medium text-foreground hover:text-primary"
              >
                {CONTACT_INFO.phoneFormatted}
              </a>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <Mail className="h-5 w-5 text-primary" />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Email
              </p>
              <h2 className="mt-1 font-display text-xl">Untuk kerja sama</h2>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="mt-3 block break-all text-[13px] font-medium hover:text-primary"
              >
                {CONTACT_INFO.email}
              </a>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">Alamat</h2>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
                    {CONTACT_INFO.address}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(CONTACT_INFO.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[12px] font-medium text-primary hover:underline"
                  >
                    Buka di Google Maps →
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">Jam layanan</h2>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
                    {CONTACT_INFO.businessHours}
                  </p>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    Pesan di luar jam kerja tetap kami balas pada hari kerja berikutnya.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card/60 p-6">
            <h2 className="font-display text-xl tracking-tight">Agar konsultasi lebih cepat</h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Sertakan empat informasi ini saat menghubungi kami:
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                'Jenjang dan kelas siswa',
                'Mata pelajaran yang ingin diperbaiki',
                'Target yang diinginkan (nilai, ujian, atau pemahaman)',
                'Jadwal yang memungkinkan untuk keluarga',
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-2 text-[12.5px] text-foreground/80">
                  <span className="font-mono text-[11px] font-bold text-primary">0{index + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/program"
              className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold transition hover:border-primary/40"
            >
              Lihat program
            </Link>
            <Link
              href="/faq"
              className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold transition hover:border-primary/40"
            >
              Baca FAQ
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
