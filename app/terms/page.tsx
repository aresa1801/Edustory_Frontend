import { LegalPage } from '@/components/legal-page'

export const metadata = {
  title: 'Ketentuan Layanan — EduStory',
  description:
    'Ketentuan Layanan EduStory: aturan penggunaan platform, kewajiban tutor dan siswa, pembayaran, pembatalan, dan penyelesaian sengketa.',
}

export default function TermsPage() {
  return (
    <LegalPage title="Ketentuan Layanan" updated="20 Oktober 2026">
      <section>
        <h2>1. Penerimaan ketentuan</h2>
        <p>
          Ketentuan Layanan ini merupakan perjanjian antara kamu dan EduStory yang mengatur penggunaan
          aplikasi, situs, dan layanan terkait. Dengan mendaftar, mengakses, atau memakai layanan, kamu
          menyetujui ketentuan ini beserta Kebijakan Privasi kami. Jika kamu tidak setuju, mohon tidak
          menggunakan layanan.
        </p>
      </section>

      <section>
        <h2>2. Definisi</h2>
        <ul>
          <li><strong>Platform</strong> berarti aplikasi dan situs EduStory.</li>
          <li><strong>Siswa</strong> berarti pengguna yang mencari dan mengikuti sesi belajar.</li>
          <li><strong>Orang tua/wali</strong> berarti pihak yang mendaftarkan atau mendampingi siswa.</li>
          <li><strong>Tutor</strong> berarti pengguna yang menawarkan jasa pengajaran melalui Platform.</li>
          <li><strong>Sesi</strong> berarti pertemuan belajar antara Siswa dan Tutor yang diatur melalui Platform.</li>
        </ul>
      </section>

      <section>
        <h2>3. Kelayakan dan akun</h2>
        <ul>
          <li>Pengguna minimal berusia 13 tahun. Pengguna di bawah 18 tahun wajib mendapat izin orang tua/wali.</li>
          <li>Akun dibuat melalui login Google. Kamu bertanggung jawab menjaga akses akun dan kerahasiaan perangkat.</li>
          <li>Data yang kamu berikan harus benar, lengkap, dan diperbarui bila berubah.</li>
          <li>Satu akun tidak boleh digunakan bersama oleh beberapa orang dengan identitas berbeda.</li>
        </ul>
      </section>

      <section>
        <h2>4. Peran EduStory</h2>
        <p>
          EduStory adalah penyedia platform yang mempertemukan Siswa dengan Tutor, serta menyediakan
          alat bantu penjadwalan, komunikasi, pembayaran, dan pelaporan progres. EduStory bukan lembaga
          pendidikan formal dan tidak memberikan jasa pengajaran secara langsung. Perjanjian jasa
          pengajaran terjadi antara Siswa (atau Orang tua/wali) dan Tutor.
        </p>
      </section>

      <section>
        <h2>5. Kewajiban tutor</h2>
        <ul>
          <li>Memberikan data profil dan kualifikasi yang benar serta dapat dimintai bukti.</li>
          <li>Mengajar sesuai jadwal yang disepakati dan memberi pemberitahuan wajar bila perlu mengubah jadwal.</li>
          <li>Menjaga kesopanan, kerahasiaan data siswa, dan tidak meminta pembayaran di luar Platform.</li>
          <li>Tidak melakukan tindakan yang merugikan, melecehkan, atau membahayakan siswa.</li>
        </ul>
      </section>

      <section>
        <h2>6. Kewajiban siswa dan orang tua/wali</h2>
        <ul>
          <li>Memberikan informasi kebutuhan belajar yang akurat agar pencocokan tutor tepat.</li>
          <li>Menghadiri sesi sesuai jadwal atau memberi pemberitahuan pembatalan.</li>
          <li>Memperlakukan Tutor dengan sopan dan tidak menyalahgunakan platform.</li>
          <li>Mengawasi penggunaan akun oleh siswa di bawah umur.</li>
        </ul>
      </section>

      <section>
        <h2>7. Pembayaran, kredit, dan pencairan dana</h2>
        <ul>
          <li>Pembayaran dilakukan melalui halaman Pembayaran resmi di Platform. Kami tidak memproses pembayaran di luar kanal resmi.</li>
          <li>Dana sesi dapat ditahan hingga sesi selesai (mekanisme escrow) sebelum diteruskan ke Tutor.</li>
          <li>Kredit yang sudah dibeli tidak dapat diuangkan kembali, kecuali diwajibkan oleh hukum atau ditentukan lain dalam kebijakan pengembalian dana.</li>
          <li>Pencairan saldo Tutor diproses setelah validasi data rekening dan kepatuhan terhadap ketentuan yang berlaku.</li>
          <li>Biaya layanan, bila ada, ditampilkan sebelum kamu menyelesaikan transaksi.</li>
        </ul>
      </section>

      <section>
        <h2>8. Pembatalan, penjadwalan ulang, dan pengembalian dana</h2>
        <ul>
          <li>Pembatalan oleh Siswa/Ong tua/wali dalam waktu kurang dari batas yang ditampilkan pada halaman jadwal dapat dikenakan potongan atau kehilangan kredit sesi.</li>
          <li>Pembatalan oleh Tutor tanpa alasan yang wajar dapat mengakibatkan pengembalian kredit kepada Siswa.</li>
          <li>Permintaan pengembalian dana diperiksa berdasarkan bukti dan riwayat sesi, dengan waktu tanggapan paling lama 14 hari kerja.</li>
          <li>Sesi yang tidak terlaksana karena kendala teknis di pihak kami akan dijadwalkan ulang atau dikembalikan kreditnya.</li>
        </ul>
      </section>

      <section>
        <h2>9. Perilaku terlarang</h2>
        <ul>
          <li>Mengirim spam, penipuan, atau penawaran yang tidak diminta kepada pengguna lain.</li>
          <li>Mengakses data pengguna lain tanpa izin atau mencoba menembus sistem.</li>
          <li>Mengunggah konten melanggar hukum, melecehkan, atau melanggar hak cipta pihak lain.</li>
          <li>Menggunakan Platform untuk kegiatan yang melanggar hukum, termasuk pencucian uang.</li>
          <li>Menyalahgunakan sistem penilaian atau membuat ulasan palsu.</li>
        </ul>
      </section>

      <section>
        <h2>10. Konten pengguna dan kekayaan intelektual</h2>
        <p>
          Kamu tetap memiliki hak atas konten yang kamu unggah. Dengan mengunggah konten, kamu memberi
          EduStory lisensi non-eksklusif untuk menyimpan, menampilkan, dan memproses konten tersebut
          sebatas keperluan layanan. Materi belajar yang dibagikan dalam sesi hanya boleh digunakan untuk
          keperluan belajar pribadi dan tidak boleh diperjualbelikan tanpa izin.
        </p>
        <p>
          Merek, logo, desain, dan kode Platform adalah milik EduStory dan dilindungi hukum.
        </p>
      </section>

      <section>
        <h2>11. Penafian dan batasan tanggung jawab</h2>
        <p>
          Platform disediakan “sebagaimana adanya”. Kami berupaya menjaga ketersediaan dan keamanan
          layanan, namun tidak menjamin layanan bebas gangguan. Hasil belajar bergantung pada
          partisipasi Siswa dan kualitas pengajaran Tutor.
        </p>
        <p>
          Sejauh diizinkan hukum, EduStory tidak bertanggung jawab atas kerugian tidak langsung, insidental,
          atau konsekuensial yang timbul dari penggunaan Platform. Tanggung jawab kami atas klaim yang
          timbul dari layanan dibatasi pada jumlah biaya layanan yang kamu bayarkan dalam 3 (tiga) bulan
          terakhir sebelum klaim.
        </p>
      </section>

      <section>
        <h2>12. Suspensi dan penghentian</h2>
        <p>
          Kami dapat menangguhkan atau menghentikan akun yang melanggar ketentuan ini, membahayakan
          pengguna lain, atau digunakan untuk kegiatan ilegal. Kamu dapat berhenti menggunakan layanan
          dan meminta penghapusan akun kapan saja melalui pengaturan atau dengan menghubungi
          support@edustory.id.
        </p>
      </section>

      <section>
        <h2>13. Sengketa dan hukum yang berlaku</h2>
        <p>
          Sengketa diselesaikan terlebih dahulu secara musyawarah melalui admin EduStory dalam waktu 30
          hari. Apabila tidak tercapai kesepakatan, sengketa diselesaikan sesuai hukum yang berlaku di
          Republik Indonesia.
        </p>
      </section>

      <section>
        <h2>14. Perubahan ketentuan</h2>
        <p>
          Ketentuan ini dapat diperbarui sewaktu-waktu. Perubahan material akan diinformasikan melalui
          aplikasi atau email sebelum berlaku. Versi terbaru selalu tersedia di halaman ini.
        </p>
      </section>

      <section>
        <h2>15. Kontak</h2>
        <p>
          Pertanyaan mengenai ketentuan ini dapat dikirim ke support@edustory.id.
        </p>
      </section>
    </LegalPage>
  )
}
