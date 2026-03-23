'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BlogArticlePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Pentingnya Komunikasi dalam Pembelajaran Online
          </h1>
          <div className="flex flex-wrap gap-4 text-slate-400 text-sm">
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
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
        <div className="prose prose-invert max-w-none">
          {/* Category Badge */}
          <div className="mb-8">
            <span className="inline-block bg-amber-900/50 text-amber-300 px-3 py-1 rounded-full text-sm font-medium">
              Edukasi
            </span>
          </div>

          {/* Introduction */}
          <p className="text-lg text-slate-300 mb-6 leading-relaxed">
            Pembelajaran online telah menjadi bagian integral dari landscape pendidikan modern. Namun, banyak siswa yang merasa terisolasi atau kesulitan memahami materi tanpa interaksi langsung. Sebagai pendidik Bahasa Indonesia dengan pengalaman 7 tahun, saya telah menyaksikan transformasi pendidikan dan pentingnya komunikasi yang efektif dalam pembelajaran jarak jauh.
          </p>

          {/* Section 1 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">1. Komunikasi adalah Fondasi Pembelajaran Efektif</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Dalam pembelajaran online, komunikasi yang baik antara guru dan siswa menjadi semakin penting. Tanpa kemampuan untuk bertanya secara langsung, siswa rentan merasa bingung atau tertinggal. Guru harus memastikan bahwa pesan mereka jelas dan mudah dipahami.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Gunakan bahasa yang jelas dan sederhana</li>
            <li>Berikan penjelasan step-by-step untuk konsep kompleks</li>
            <li>Tanyakan apakah siswa memahami sebelum melanjutkan</li>
            <li>Buka saluran komunikasi dua arah</li>
          </ul>

          {/* Section 2 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">2. Bangun Hubungan yang Kuat dengan Siswa</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Hubungan personal antara guru dan siswa sangat mempengaruhi motivasi belajar. Dalam pembelajaran online, bangun koneksi melalui komunikasi yang konsisten dan personal, bukan hanya transaksional.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Kenal siswa secara personal, bukan hanya sebagai nomor</li>
            <li>Berikan feedback yang konstruktif dan mendorong</li>
            <li>Tunjukkan kepedulian terhadap progress siswa</li>
            <li>Ciptakan lingkungan yang aman untuk bertanya</li>
          </ul>

          {/* Section 3 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">3. Gunakan Berbagai Saluran Komunikasi</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Tidak semua siswa nyaman dengan satu saluran komunikasi saja. Tawarkan berbagai pilihan seperti forum diskusi, email, video call, atau chat untuk mengakomodasi preferensi yang berbeda.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Sediakan forum diskusi untuk pertanyaan umum</li>
            <li>Gunakan email untuk komunikasi formal</li>
            <li>Live chat untuk bantuan real-time</li>
            <li>Video call untuk diskusi mendalam</li>
          </ul>

          {/* Section 4 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">4. Libatkan Orang Tua dalam Proses Pembelajaran</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Orang tua adalah mitra penting dalam pendidikan anak. Komunikasi reguler dengan orang tua membantu mereka mendukung pembelajaran anaknya di rumah dan mengidentifikasi masalah lebih awal.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Kirim laporan progress secara berkala kepada orang tua</li>
            <li>Adakan orang tua-guru conference online</li>
            <li>Bagikan tips bagaimana orang tua bisa mendukung belajar anak</li>
            <li>Dengarkan feedback dari orang tua</li>
          </ul>

          {/* Section 5 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">5. Ciptakan Komunitas Belajar yang Positif</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Siswa belajar tidak hanya dari guru tetapi juga dari sesama siswa. Fasilitasi diskusi peer-to-peer untuk menciptakan komunitas belajar yang supportif dan kolaboratif.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Buat kelompok diskusi untuk topik tertentu</li>
            <li>Dorong siswa untuk saling membantu</li>
            <li>Rayakan keberhasilan siswa secara bersama-sama</li>
            <li>Ciptakan aturan komunitas yang positif dan inklusif</li>
          </ul>

          {/* Section 6 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">6. Jadilah Responsif dan Konsisten</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Respons time yang cepat dan konsisten menunjukkan kepada siswa bahwa Anda peduli. Tetapkan ekspektasi yang jelas tentang kapan Anda akan merespons pertanyaan dan usahakan untuk memenuhi komitmen tersebut.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Balas pertanyaan dalam 24 jam</li>
            <li>Tetapkan jam kantor online yang konsisten</li>
            <li>Manfaatkan tools otomasi untuk respons awal</li>
            <li>Berkomitmen untuk timeframe yang realistis</li>
          </ul>

          {/* Conclusion */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">Kesimpulan</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Pembelajaran online tidak harus terasa impersonal atau terisolasi. Dengan prioritas pada komunikasi yang efektif, kita dapat menciptakan pengalaman belajar yang bermakna dan mendukung untuk semua siswa. Investasi dalam hubungan dan komunikasi yang baik adalah investasi dalam kesuksesan akademik dan kesejahteraan emosional siswa Anda.
          </p>

          {/* CTA */}
          <div className="mt-12 pt-8 border-t border-slate-700">
            <p className="text-slate-300 mb-4">
              Ingin mengoptimalkan pengalaman belajar online Anda? Tim tutor profesional kami siap membantu dengan komunikasi yang personal dan efektif.
            </p>
            <Link href="/">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Hubungi Kami Hari Ini
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
