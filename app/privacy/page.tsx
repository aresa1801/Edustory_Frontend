import { LegalPage } from '@/components/legal-page'

export const metadata = {
  title: 'Kebijakan Privasi — EduStory',
  description:
    'Kebijakan Privasi EduStory: data apa yang kami kumpulkan, cara kami memakainya, dan hak kamu atas data pribadimu.',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Kebijakan Privasi" updated="20 Oktober 2026">
      <section>
        <h2>1. Pendahuluan</h2>
        <p>
          Kebijakan Privasi ini menjelaskan bagaimana EduStory (“kami”) mengumpulkan, menggunakan,
          menyimpan, dan melindungi data pribadi pengguna aplikasi dan situs EduStory. Kami mengacu pada
          Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) serta ketentuan
          Google Play yang berlaku.
        </p>
        <p>
          Dengan membuat akun atau menggunakan layanan, kamu menyatakan telah membaca dan memahami
          kebijakan ini. Jika kamu tidak setuju, mohon tidak menggunakan layanan.
        </p>
      </section>

      <section>
        <h2>2. Data yang kami kumpulkan</h2>
        <ul>
          <li>
            <strong>Data akun:</strong> nama, alamat email, foto profil, dan ID unik dari login Google.
          </li>
          <li>
            <strong>Data profil siswa:</strong> jenjang pendidikan, mata pelajaran, jadwal belajar,
            anggaran les, dan catatan kebutuhan belajar yang kamu isi sendiri.
          </li>
          <li>
            <strong>Data orang tua/wali:</strong> nama dan nomor telepon yang diberikan saat pendaftaran.
          </li>
          <li>
            <strong>Data tutor:</strong> riwayat pendidikan, pengalaman mengajar, mata pelajaran yang
            diampu, tarif, serta dokumen verifikasi bila diminta.
          </li>
          <li>
            <strong>Konten layanan:</strong> pesan, permintaan les, jadwal sesi, berkas yang kamu unggah,
            dan penilaian yang kamu berikan.
          </li>
          <li>
            <strong>Data transaksi:</strong> riwayat pembayaran, saldo kredit, dan status pencairan dana.
            Kami tidak menyimpan nomor kartu atau kredensial pembayaran; data tersebut diproses oleh
            penyedia pembayaran resmi.
          </li>
          <li>
            <strong>Data lokasi:</strong> hanya jika kamu menekan “Setujui &amp; Simpan” pada dialog izin.
            Lokasi dipakai untuk mencocokkan tutor terdekat dan tidak ditampilkan ke publik.
          </li>
          <li>
            <strong>Data teknis:</strong> jenis perangkat, sistem operasi, versi aplikasi, alamat IP,
            dan catatan kesalahan (error log) untuk keperluan keamanan dan perbaikan.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Dasar pemrosesan</h2>
        <ul>
          <li>Pelaksanaan perjanjian layanan saat kamu mendaftar dan memakai fitur.</li>
          <li>Persetujuanmu, khususnya untuk lokasi dan notifikasi.</li>
          <li>Kewajiban hukum, misalnya pencatatan transaksi.</li>
          <li>Kepentingan sah kami yang wajar, seperti mencegah penyalahgunaan dan menjaga keamanan platform.</li>
        </ul>
      </section>

      <section>
        <h2>4. Cara kami memakai data</h2>
        <ul>
          <li>Mencocokkan siswa dengan tutor yang sesuai jenjang, mata pelajaran, dan lokasi.</li>
          <li>Menyusun rencana belajar, jadwal sesi, dan laporan perkembangan belajar.</li>
          <li>Memproses pembayaran, kredit sesi, dan pencairan dana tutor.</li>
          <li>Mengirim notifikasi operasional terkait jadwal dan status pesanan.</li>
          <li>Menjaga keamanan platform, mendeteksi penipuan, dan menegakkan ketentuan layanan.</li>
          <li>Meningkatkan kualitas layanan melalui analisis agregat yang tidak mengidentifikasi individu.</li>
        </ul>
      </section>

      <section>
        <h2>5. Berbagi data</h2>
        <p>
          Kami tidak menjual data pribadi. Data hanya dibagikan kepada pihak yang diperlukan untuk
          menjalankan layanan:
        </p>
        <ul>
          <li>Tutor atau siswa yang terlibat dalam sesi yang sama (terbatas pada data yang relevan).</li>
          <li>Penyedia infrastruktur: Supabase (basis data dan autentikasi) dan Vercel (hosting).</li>
          <li>Penyedia pembayaran resmi untuk memproses transaksi dan pencairan dana.</li>
          <li>Aparat penegak hukum atau regulator, apabila diwajibkan oleh peraturan perundang-undangan.</li>
        </ul>
        <p>
          Setiap pihak ketiga terikat kewajiban kerahasiaan dan hanya boleh memproses data sesuai
          instruksi kami.
        </p>
      </section>

      <section>
        <h2>6. Lokasi penyimpanan dan transfer</h2>
        <p>
          Data disimpan pada infrastruktur cloud yang kami gunakan. Apabila terjadi transfer data ke luar
          Indonesia, kami memastikan adanya perlindungan yang setara sesuai ketentuan UU PDP.
        </p>
      </section>

      <section>
        <h2>7. Retensi data</h2>
        <p>
          Data akun disimpan selama akun aktif. Setelah akun dihapus, data pribadi dihapus atau
          dianonimkan dalam waktu paling lama 30 hari, kecuali data tertentu yang wajib kami simpan
          untuk keperluan hukum, pajak, atau penyelesaian sengketa.
        </p>
      </section>

      <section>
        <h2>8. Keamanan</h2>
        <p>
          Akses data dibatasi berdasarkan peran. Setiap endpoint API memerlukan sesi login dan
          memverifikasi kepemilikan data. Kami menerapkan enkripsi saat transit, pencatatan aktivitas
          administratif, dan pemantauan berkala. Meski demikian, tidak ada sistem yang sepenuhnya bebas
          risiko; laporkan dugaan insiden ke support@edustory.id.
        </p>
      </section>

      <section>
        <h2>9. Hak kamu</h2>
        <ul>
          <li>Mengakses dan memperoleh salinan data pribadimu.</li>
          <li>Meminta koreksi atas data yang tidak akurat atau tidak lengkap.</li>
          <li>Meminta penghapusan data dan penutupan akun.</li>
          <li>Menarik kembali persetujuan, misalnya untuk lokasi atau notifikasi.</li>
          <li>Mengajukan keberatan atas pemrosesan tertentu dan meminta pembatasan pemrosesan.</li>
          <li>Meminta data dalam format yang dapat dibaca mesin (portabilitas).</li>
        </ul>
        <p>
          Permintaan dapat dikirim ke support@edustory.id. Kami menanggapi paling lambat 14 hari kerja.
          Kami dapat meminta verifikasi identitas sebelum memproses permintaan.
        </p>
      </section>

      <section>
        <h2>10. Anak dan siswa di bawah umur</h2>
        <p>
          Layanan ditujukan untuk pengguna berusia 13 tahun ke atas. Pengguna di bawah 18 tahun wajib
          menggunakan layanan dengan izin dan pendampingan orang tua atau wali. Akun siswa di bawah umur
          didaftarkan dan dikelola oleh orang tua/wali, yang bertanggung jawab atas data yang diberikan.
          Kami tidak dengan sengaja mengumpulkan data anak di bawah 13 tahun; jika hal itu terjadi,
          hubungi kami agar data dihapus.
        </p>
      </section>

      <section>
        <h2>11. Cookie dan teknologi serupa</h2>
        <p>
          Kami memakai cookie dan penyimpanan lokal yang diperlukan untuk menjaga sesi login dan
          preferensi tampilan. Kami tidak memakai cookie iklan pihak ketiga. Kamu dapat menghapus cookie
          melalui pengaturan browser, namun sebagian fitur mungkin tidak berfungsi.
        </p>
      </section>

      <section>
        <h2>12. Perubahan kebijakan</h2>
        <p>
          Kebijakan ini dapat diperbarui seiring perubahan layanan atau peraturan. Perubahan material
          akan kami informasikan melalui aplikasi atau email sebelum berlaku. Tanggal pembaruan terakhir
          selalu tercantum di bagian atas halaman ini.
        </p>
      </section>

      <section>
        <h2>13. Kontak dan pengaduan</h2>
        <p>
          Pertanyaan, permintaan hak subjek data, atau keluhan dapat disampaikan ke support@edustory.id.
          Jika kamu tidak puas dengan tanggapan kami, kamu berhak mengajukan pengaduan kepada lembaga
          pengawas pelindungan data pribadi sesuai UU PDP.
        </p>
      </section>
    </LegalPage>
  )
}
