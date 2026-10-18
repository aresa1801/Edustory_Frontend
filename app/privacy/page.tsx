import { LegalPage } from '@/components/legal-page'

export const metadata = { title: 'Kebijakan Privasi — Edustory' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Kebijakan Privasi" updated="18 Oktober 2026">
      <section>
        <h2>1. Data yang kami kumpulkan</h2>
        <p>Data akun Google (nama, email, foto profil), profil belajar (jenjang, mata pelajaran, jadwal, anggaran), data sekolah dan orang tua/wali, serta lokasi rumah bila kamu menyetujui penyimpanan titik lokasi.</p>
      </section>
      <section>
        <h2>2. Cara kami memakai data</h2>
        <ul>
          <li>Mencocokkan siswa dengan tutor yang sesuai jenjang, mapel, dan lokasi.</li>
          <li>Menyusun rencana belajar, jadwal sesi, dan laporan progres.</li>
          <li>Memproses pembayaran dan penarikan dana melalui penyedia pembayaran resmi.</li>
          <li>Menjaga keamanan platform dan mencegah penyalahgunaan.</li>
        </ul>
      </section>
      <section>
        <h2>3. Lokasi</h2>
        <p>Titik lokasi hanya disimpan jika kamu menekan “Setujui &amp; Simpan” pada dialog izin. Lokasi dipakai untuk pencocokan tutor terdekat dan tidak ditampilkan ke publik.</p>
      </section>
      <section>
        <h2>4. Berbagi data</h2>
        <p>Kami tidak menjual data. Data hanya dibagikan kepada tutor yang terlibat, penyedia infrastruktur (Supabase, Vercel), dan penyedia pembayaran sesuai kebutuhan layanan.</p>
      </section>
      <section>
        <h2>5. Retensi &amp; hak kamu</h2>
        <p>Data disimpan selama akun aktif. Kamu dapat meminta akses, koreksi, atau penghapusan akun melalui support@edustory.id.</p>
      </section>
      <section>
        <h2>6. Keamanan</h2>
        <p>Akses data dibatasi berdasarkan peran. Setiap endpoint API memerlukan sesi login dan memverifikasi kepemilikan data.</p>
      </section>
    </LegalPage>
  )
}
