import { LegalPage } from '@/components/legal-page'

export const metadata = { title: 'Ketentuan Layanan — Edustory' }

export default function TermsPage() {
  return (
    <LegalPage title="Ketentuan Layanan" updated="18 Oktober 2026">
      <section>
        <h2>1. Akun</h2>
        <p>Akun dibuat melalui Google. Kamu bertanggung jawab menjaga akses akun dan memastikan data yang diberikan benar.</p>
      </section>
      <section>
        <h2>2. Layanan</h2>
        <p>Edustory mempertemukan siswa dengan tutor terkurasi dan menyediakan rencana belajar, penjadwalan, serta pelaporan progres. Hasil belajar bergantung pada partisipasi siswa dan tutor.</p>
      </section>
      <section>
        <h2>3. Pembayaran</h2>
        <p>Pembayaran dilakukan melalui halaman Pembayaran resmi. Dana sesi ditahan hingga sesi selesai sesuai ketentuan escrow. Penarikan saldo tutor diproses setelah validasi.</p>
      </section>
      <section>
        <h2>4. Perilaku pengguna</h2>
        <ul>
          <li>Tidak mengirim penawaran spam atau menyalahgunakan data pengguna lain.</li>
          <li>Tidak mencoba mengakses data di luar akun sendiri.</li>
          <li>Tidak menggunakan platform untuk kegiatan yang melanggar hukum.</li>
        </ul>
      </section>
      <section>
        <h2>5. Pembatalan &amp; sengketa</h2>
        <p>Pembatalan mengikuti kebijakan jadwal yang berlaku. Sengketa diselesaikan melalui admin Edustory dengan bukti yang relevan.</p>
      </section>
      <section>
        <h2>6. Perubahan</h2>
        <p>Ketentuan dapat diperbarui sewaktu-waktu. Versi terbaru selalu tersedia di halaman ini.</p>
      </section>
    </LegalPage>
  )
}
