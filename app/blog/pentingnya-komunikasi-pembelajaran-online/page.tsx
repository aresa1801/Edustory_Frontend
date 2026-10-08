'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BlogArticlePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10">
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground mb-6 -ml-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold mb-5 text-foreground tracking-tight leading-tight">
            Pentingnya Komunikasi dalam Pembelajaran Online
          </h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Rina Lestari, S.Pd</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>10 Maret 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>4 menit baca</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-10 shadow-soft">
          <div className="prose max-w-none dark:prose-invert">
            {/* Category Badge */}
            <div className="mb-8">
              <span className="inline-block bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-medium">
                Edukasi
              </span>
            </div>

            {/* Introduction */}
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Pembelajaran online telah menjadi bagian integral dari landscape pendidikan modern. Namun, banyak siswa yang merasa terisolasi atau kesulitan memahami materi tanpa interaksi langsung. Sebagai pendidik Bahasa Indonesia dengan pengalaman 7 tahun, saya telah menyaksikan transformasi pendidikan dan pentingnya komunikasi yang efektif dalam pembelajaran jarak jauh.
            </p>

            {/* Section 1 */}
            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4 text-foreground">1. Komunikasi adalah Fondasi Pembelajaran Efektif</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Dalam pembelajaran online, komunikasi yang baik antara guru dan siswa menjadi semakin penting. Tanpa kemampuan untuk bertanya secara langsung, siswa rentan merasa bingung atau tertinggal. Guru harus memastikan bahwa pesan mereka jelas dan mudah dipahami.
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
              <li>Gunakan bahasa yang jelas dan sederhana</li>
              <li>Berikan penjelasan step-by-step untuk konsep kompleks</li>
              <li>Tanyakan apakah siswa memahami sebelum melanjutkan</li>
              <li>Buka saluran komunikasi dua arah</li>
            </ul>

            {/* Section 2 */}
            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4 text-foreground">2. Bangun Hubungan yang Kuat dengan Siswa</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Hubungan personal antara guru dan siswa sangat mempengaruhi motivasi belajar. Dalam pembelajaran online, bangun koneksi melalui komunikasi yang konsisten dan personal, bukan hanya transaksional.
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
              <li>Kenal siswa secara personal, bukan hanya sebagai nomor</li>
              <li>Berikan feedback yang konstruktif dan mendorong</li>
              <li>Tunjukkan kepedulian terhadap progress siswa</li>
              <li>Ciptakan lingkungan yang aman untuk bertanya</li>
            </ul>

            {/* Section 3 */}
            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4 text-foreground">3. Gunakan Berbagai Saluran Komunikasi</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Tidak semua siswa nyaman dengan satu saluran komunikasi saja. Tawarkan berbagai pilihan seperti forum diskusi, email, video call, atau chat untuk mengakomodasi preferensi yang berbeda.
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
              <li>Sediakan forum diskusi untuk pertanyaan umum</li>
              <li>Gunakan email untuk komunikasi formal</li>
              <li>Live chat untuk bantuan real-time</li>
              <li>Video call untuk diskusi mendalam</li>
            </ul>

            {/* Section 4 */}
            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4 text-foreground">4. Libatkan Orang Tua dalam Proses Pembelajaran</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Orang tua adalah mitra penting dalam pendidikan anak. Komunikasi reguler dengan orang tua membantu mereka mendukung pembelajaran anaknya di rumah dan mengidentifikasi masalah lebih awal.
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
              <li>Kirim laporan progress secara berkala kepada orang tua</li>
              <li>Adakan orang tua-guru conference online</li>
              <li>Bagikan tips bagaimana orang tua bisa mendukung belajar anak</li>
              <li>Dengarkan feedback dari orang tua</li>
            </ul>

            {/* Section 5 */}
            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4 text-foreground">5. Ciptakan Komunitas Belajar yang Positif</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Siswa belajar tidak hanya dari guru tetapi juga dari sesama siswa. Fasilitasi diskusi peer-to-peer untuk menciptakan komunitas belajar yang supportif dan kolaboratif.
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
              <li>Buat kelompok diskusi untuk topik tertentu</li>
              <li>Dorong siswa untuk saling membantu</li>
              <li>Rayakan keberhasilan siswa secara bersama-sama</li>
              <li>Ciptakan aturan komunitas yang positif dan inklusif</li>
            </ul>

            {/* Section 6 */}
            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4 text-foreground">6. Jadilah Responsif dan Konsisten</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Respons time yang cepat dan konsisten menunjukkan kepada siswa bahwa Anda peduli. Tetapkan ekspektasi yang jelas tentang kapan Anda akan merespons pertanyaan dan usahakan untuk memenuhi komitmen tersebut.
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
              <li>Balas pertanyaan dalam 24 jam</li>
              <li>Tetapkan jam kantor online yang konsisten</li>
              <li>Manfaatkan tools otomasi untuk respons awal</li>
              <li>Berkomitmen untuk timeframe yang realistis</li>
            </ul>

            {/* Conclusion */}
            <h2 className="text-2xl md:text-3xl font-bold mt-8 mb-4 text-foreground">Kesimpulan</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Pembelajaran online tidak harus terasa impersonal atau terisolasi. Dengan prioritas pada komunikasi yang efektif, kita dapat menciptakan pengalaman belajar yang bermakna dan mendukung untuk semua siswa. Investasi dalam hubungan dan komunikasi yang baik adalah investasi dalam kesuksesan akademik dan kesejahteraan emosional siswa Anda.
            </p>

            {/* CTA */}
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-muted-foreground mb-4">
                Ingin mengoptimalkan pengalaman belajar online Anda? Tim tutor profesional kami siap membantu dengan komunikasi yang personal dan efektif.
              </p>
              <Link href="/">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Hubungi Kami Hari Ini
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
