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
            Tips Belajar Efektif untuk Siswa SMP
          </h1>
          <div className="flex flex-wrap gap-4 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Dr. Siti Nurhayati</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>15 Maret 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>5 menit baca</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
        <div className="prose prose-invert max-w-none">
          {/* Category Badge */}
          <div className="mb-8">
            <span className="inline-block bg-cyan-900/50 text-cyan-300 px-3 py-1 rounded-full text-sm font-medium">
              Belajar
            </span>
          </div>

          {/* Introduction */}
          <p className="text-lg text-slate-300 mb-6 leading-relaxed">
            Belajar efektif bukan hanya tentang lamanya waktu yang Anda habiskan, tetapi bagaimana Anda memanfaatkan waktu tersebut. Sebagai seorang pendidik berpengalaman 12 tahun, saya telah melihat siswa-siswa SMP berkembang pesat dengan menerapkan strategi pembelajaran yang tepat. Artikel ini akan membagikan tips-tips terbukti untuk meningkatkan efektivitas belajar Anda.
          </p>

          {/* Section 1 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">1. Buat Jadwal Belajar yang Konsisten</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Konsistensi adalah kunci kesuksesan belajar. Alih-alih belajar dalam mahlah panjang sebelum ujian, jadwalkan sesi belajar yang lebih singkat namun teratur setiap hari. Misalnya, belajar selama 30-45 menit setiap hari jauh lebih efektif daripada belajar 5 jam sekali seminggu.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Tentukan waktu belajar yang sama setiap hari</li>
            <li>Gunakan kalender atau planner untuk mencatat jadwal</li>
            <li>Mulai dengan target yang realistis</li>
            <li>Tingkatkan durasi secara bertahap</li>
          </ul>

          {/* Section 2 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">2. Ciptakan Lingkungan Belajar yang Ideal</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Lingkungan sekitar sangat mempengaruhi konsentrasi. Pastikan tempat belajar Anda jauh dari gangguan seperti TV, ponsel, atau suara bising. Ruangan yang rapi dan nyaman akan membantu Anda tetap fokus.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Pilih tempat yang tenang dan well-lit</li>
            <li>Matikan notifikasi ponsel</li>
            <li>Jangan menyimpan mainan atau hiburan di dekat area belajar</li>
            <li>Atur suhu ruangan agar nyaman</li>
          </ul>

          {/* Section 3 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">3. Gunakan Teknik Aktif Learning</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Membaca buku saja tidak cukup. Terlibat secara aktif dengan materi akan membantu pemahaman yang lebih mendalam. Cobalah berbagai teknik seperti membuat ringkasan, mengajar orang lain, atau menyelesaikan soal-soal latihan.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Buat catatan dengan tangan, bukan mengetik</li>
            <li>Ajari materi kepada teman atau keluarga</li>
            <li>Gunakan flashcard untuk memorisasi</li>
            <li>Kerjakan banyak soal latihan</li>
          </ul>

          {/* Section 4 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">4. Ambil Istirahat yang Cukup</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Istirahat bukan tanda kemalasan. Otak Anda membutuhkan waktu untuk memproses dan menyimpan informasi. Gunakan teknik Pomodoro: belajar 25 menit, istirahat 5 menit, dan setelah 4 siklus, istirahat lebih lama selama 15-30 menit.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Istirahat setiap 25-50 menit belajar</li>
            <li>Gunakan istirahat untuk bergerak atau minum air</li>
            <li>Tidur 7-9 jam setiap malam</li>
            <li>Jangan belajar sampai larut malam</li>
          </ul>

          {/* Section 5 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">5. Pahami, Jangan Hanya Menghafal</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Fokus pada pemahaman konsep daripada menghafal. Ketika Anda memahami konsep, Anda dapat menerapkannya dalam berbagai situasi berbeda. Bertanyalah "mengapa" dan "bagaimana" untuk setiap materi yang Anda pelajari.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Tanyakan kepada guru jika ada yang belum jelas</li>
            <li>Cari contoh real-world dari konsep yang dipelajari</li>
            <li>Hubungkan materi baru dengan pengetahuan lama</li>
            <li>Jelaskan konsep dengan kata-kata Anda sendiri</li>
          </ul>

          {/* Section 6 */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">6. Gunakan Berbagai Sumber Pembelajaran</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Jangan hanya bergantung pada buku teks dan catatan guru. Manfaatkan berbagai sumber seperti video pembelajaran, podcast, artikel online, atau aplikasi pembelajaran untuk perspektif yang berbeda.
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
            <li>Tonton video pembelajaran di YouTube</li>
            <li>Gunakan aplikasi pembelajaran seperti Khan Academy</li>
            <li>Baca artikel dari sumber terpercaya</li>
            <li>Dengarkan podcast edukatif</li>
          </ul>

          {/* Conclusion */}
          <h2 className="text-3xl font-bold mt-8 mb-4 text-white">Kesimpulan</h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            Belajar efektif adalah kombinasi dari kebiasaan yang baik, disiplin, dan strategi yang tepat. Mulailah dengan satu atau dua tips dan secara bertahap tambahkan yang lain. Setiap siswa berbeda, jadi eksperimenlah untuk menemukan apa yang paling cocok untuk Anda. Ingat, perjalanan menuju kesuksesan akademik adalah maraton, bukan sprint. Tetap konsisten, dan Anda akan melihat hasil yang luar biasa!
          </p>

          {/* CTA */}
          <div className="mt-12 pt-8 border-t border-slate-700">
            <p className="text-slate-300 mb-4">
              Apakah Anda membutuhkan bantuan lebih lanjut dalam belajar? Hubungi kami untuk sesi pembelajaran privat dengan tutor profesional.
            </p>
            <Link href="/">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Hubungi Kami Sekarang
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
