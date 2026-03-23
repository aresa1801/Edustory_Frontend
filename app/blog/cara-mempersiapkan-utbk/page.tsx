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
            Cara Mempersiapkan Diri untuk UTBK dengan Tepat
          </h1>
          <div className="flex flex-wrap gap-4 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Budi Santoso, M.Ed</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>12 Maret 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>7 menit baca</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
        <div className="prose prose-invert max-w-none">
          {/* Category Badge */}
          <div className="mb-8">
            <span className="inline-block bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
              Test Prep
            </span>
          </div>

          {/* Introduction */}
          <p className="text-lg text-slate-300 mb-6 leading-relaxed">
            UTBK (Ujian Tulis Berbasis Komputer) adalah pintu menuju pendidikan tinggi yang Anda impikan. Sebagai guru berpengalaman 10 tahun dalam persiapan test internasional, saya memahami tantangan yang dihadapi siswa. Panduan ini akan membantu Anda menyiapkan diri dengan strategi yang terbukti efektif.
          </p>

          {/* Section 1 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">1. Mulai Persiapan Jauh-jauh Hari</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Jangan menunggu semester akhir untuk mulai persiapan. Ideally, mulai persiapan 6-12 bulan sebelum ujian UTBK. Ini memberikan Anda cukup waktu untuk menguasai materi dan mengidentifikasi area yang memerlukan perbaikan.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Buat timeline persiapan yang terstruktur</li>
            <li>Identifikasi kekuatan dan kelemahan Anda</li>
            <li>Alokasikan lebih banyak waktu untuk topik sulit</li>
            <li>Pantau progres Anda secara berkala</li>
          </ul>

          {/* Section 2 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">2. Kuasai Materi UTBK secara Mendalam</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            UTBK menguji kemampuan berpikir dan penalaran, bukan hanya hafalan. Pahami konsep dasar dengan baik dan latih cara mengaplikasikannya dalam soal-soal yang kompleks.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Pelajari materi TPA (Tes Potensi Akademik)</li>
            <li>Kuasai soal-soal penalaran verbal dan numerik</li>
            <li>Pahami tipe-tipe soal yang sering keluar</li>
            <li>Jangan hanya menghafal rumus tanpa pemahaman</li>
          </ul>

          {/* Section 3 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">3. Latihan Soal Secara Intensif</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Latihan soal adalah kunci untuk memahami pola-pola pertanyaan UTBK. Kerjakan ribuan soal dari berbagai sumber untuk mengasah kecepatan dan akurasi Anda.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Gunakan buku soal UTBK resmi</li>
            <li>Manfaatkan aplikasi dan website latihan soal</li>
            <li>Kerjakan soal dari tahun-tahun sebelumnya</li>
            <li>Analisis setiap jawaban yang salah</li>
          </ul>

          {/* Section 4 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">4. Kelola Waktu dengan Efisien</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            UTBK dibatasi waktu, jadi kemampuan manajemen waktu sangat penting. Latih diri Anda untuk menyelesaikan soal dalam waktu yang ditentukan tanpa mengorbankan akurasi.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Latih dengan timer untuk simulasi ujian sebenarnya</li>
            <li>Identifikasi soal-soal yang menghabiskan terlalu banyak waktu</li>
            <li>Ajarkan diri Anda untuk melewati soal sulit dan kembali nanti</li>
            <li>Praktikkan strategi penyelesaian yang efisien</li>
          </ul>

          {/* Section 5 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">5. Bersiap Fisik dan Mental</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            UTBK adalah marathon mental. Pastikan Anda dalam kondisi fisik dan mental yang prima saat menghadapi ujian. Stress dan kecemasan adalah musuh nyata yang dapat menurunkan performa Anda.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Istirahat cukup setiap malam</li>
            <li>Lakukan olahraga secara teratur</li>
            <li>Jangan mengkonsumsi kafein berlebihan sebelum ujian</li>
            <li>Praktikkan teknik relaksasi seperti meditasi atau yoga</li>
          </ul>

          {/* Section 6 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">6. Ikuti Bimbingan Belajar atau Les Privat</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Les privat dengan tutor berpengalaman dapat memberikan bimbingan yang personal dan strategi yang telah terbukti. Seorang tutor dapat mengidentifikasi kelemahan spesifik Anda dan memberikan solusi yang tepat.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Pilih tutor yang berpengalaman dalam UTBK</li>
            <li>Ikuti les secara konsisten</li>
            <li>Diskusikan progress dan area yang perlu ditingkatkan</li>
            <li>Minta feedback secara berkala</li>
          </ul>

          {/* Section 7 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">7. Simulasi Ujian Sebelumnya</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Semakin dekat dengan tanggal ujian, intensifkan simulasi full-test untuk membiasakan diri dengan format dan ritme ujian sebenarnya.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Lakukan simulasi full-test minimal 1 bulan sebelum ujian</li>
            <li>Gunakan komputer untuk simulasi berbasis komputer</li>
            <li>Analisis hasil simulasi dan perbaiki kelemahan</li>
            <li>Simulasi sambil mempertahankan kondisi ujian sebenarnya</li>
          </ul>

          {/* Conclusion */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">Kesimpulan</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Persiapan UTBK memerlukan dedikasi, strategi yang tepat, dan konsistensi. Dengan mengikuti panduan ini dan bekerja keras, Anda dapat meraih skor yang Anda targetkan. Ingat, kesuksesan bukan hanya tentang hasil akhir tetapi juga proses pembelajaran yang Anda lalui. Percayalah pada diri Anda dan tetap fokus pada tujuan Anda!
          </p>

          {/* CTA */}
          <div className="mt-12 pt-8 border-t border-slate-700">
            <p className="text-slate-300 mb-4">
              Ingin bimbingan khusus untuk persiapan UTBK Anda? Hubungi kami untuk konsultasi gratis dengan tutor profesional kami.
            </p>
            <Link href="/">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Dapatkan Konsultasi Gratis
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
