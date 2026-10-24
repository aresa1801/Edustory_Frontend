import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { CONTACT_INFO } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Pertanyaan Umum (FAQ) — EduStory',
  description:
    'Jawaban atas pertanyaan yang paling sering muncul tentang les privat EduStory: biaya, jadwal, tutor, laporan progres, pembatalan, dan pembayaran.',
}

const groups = [
  {
    title: 'Memulai',
    items: [
      {
        q: 'Bagaimana cara mendaftar?',
        a: 'Mulai dari konsultasi lewat WhatsApp atau halaman kontak. Kami akan menanyakan kebutuhan belajar, lalu menyarankan program dan jadwal asesmen awal. Setelah itu keluarga menerima profil tutor dan jadwal sesi pertama.',
      },
      {
        q: 'Apakah harus asesmen dulu?',
        a: 'Ya, untuk kelas 4 SD ke atas. Asesmen singkat 30–45 menit membantu tutor memulai dari level yang tepat, bukan mengulang materi yang sudah dikuasai atau melewati prasyarat yang belum solid.',
      },
      {
        q: 'Berapa lama sampai sesi pertama?',
        a: 'Rata-rata 2 hari setelah konsultasi, tergantung ketersediaan jadwal tutor dan kesiapan keluarga.',
      },
    ],
  },
  {
    title: 'Biaya & pembayaran',
    items: [
      {
        q: 'Berapa biaya lesnya?',
        a: 'Biaya bergantung pada jenjang, jumlah sesi, dan format (online atau di rumah). Kami sampaikan rinciannya terbuka saat konsultasi, tanpa biaya tersembunyi.',
      },
      {
        q: 'Apakah ada paket per bulan?',
        a: 'Ada. Paket bulanan lebih hemat dibanding sesi satuan dan dipakai untuk program Reguler maupun Intensif.',
      },
      {
        q: 'Metode pembayaran apa saja yang tersedia?',
        a: 'Transfer bank dan pembayaran online melalui Midtrans (virtual account, e-wallet, kartu).',
      },
    ],
  },
  {
    title: 'Jadwal & pembatalan',
    items: [
      {
        q: 'Bisakah jadwal diubah?',
        a: 'Bisa. Perubahan jadwal dapat diajukan paling lambat 12 jam sebelum sesi agar tutor punya waktu menyesuaikan. Perubahan mendadak tetap kami usahakan bila kondisinya darurat.',
      },
      {
        q: 'Bagaimana bila siswa berhalangan hadir?',
        a: 'Sesi dapat digeser atau diganti sesuai kebijakan pembatalan. Sesi yang hangus tanpa pemberitahuan tidak dapat diklaim ulang.',
      },
      {
        q: 'Apakah bisa les di rumah?',
        a: 'Bisa untuk area Yogyakarta dan sekitarnya. Untuk luar area tersebut, sesi berjalan online dengan kualitas pendampingan yang sama.',
      },
    ],
  },
  {
    title: 'Tutor',
    items: [
      {
        q: 'Bagaimana tutor dipilih?',
        a: 'Kami mencocokkan mapel, jenjang, gaya komunikasi, dan jadwal. Setiap tutor sudah melewati lima tahap seleksi: akademik, psikologi, microteaching, tulisan tangan, dan wawancara.',
      },
      {
        q: 'Bisa minta ganti tutor?',
        a: 'Bisa, terutama bila sesi perdana tidak cocok. Penggantian tutor pertama tidak dikenakan biaya tambahan.',
      },
      {
        q: 'Apakah tutor bisa dipilih sendiri?',
        a: 'Pada program Privat, keluarga dapat memilih tutor dari profil yang tersedia selama jadwalnya cocok.',
      },
    ],
  },
  {
    title: 'Progres & laporan',
    items: [
      {
        q: 'Bagaimana saya tahu anak saya berkembang?',
        a: 'Setiap sesi punya catatan, dan laporan progres dikirim berkala: materi yang dikuasai, yang masih perlu latihan, serta rencana pekan berikutnya.',
      },
      {
        q: 'Apakah orang tua bisa ikut memantau?',
        a: 'Ya. Orang tua mendapat akses laporan dan dapat meminta sesi evaluasi dengan tutor kapan saja.',
      },
      {
        q: 'Bagaimana bila target tidak tercapai?',
        a: 'Target ditinjau bersama. Bila pendekatan yang dipakai belum efektif, kami ubah metode atau ganti tutor — bukan menambah sesi tanpa arah.',
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="border-b border-border/60 bg-card/40">
          <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">FAQ</p>
            <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
              Pertanyaan yang sering diajukan.
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Belum menemukan jawaban? Hubungi kami di {CONTACT_INFO.phoneFormatted} atau lewat WhatsApp — kami balas
              pada jam kerja.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-14 sm:px-8 md:py-16">
          <div className="space-y-10">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="font-display text-xl tracking-tight">{group.title}</h2>
                <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
                  {group.items.map((item) => (
                    <details key={item.q} className="group p-5">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[13.5px] font-semibold">
                        {item.q}
                        <span className="mt-0.5 text-primary transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
            <h2 className="font-display text-2xl tracking-tight">Masih ada yang ingin ditanyakan?</h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Tim kami siap menjelaskan tanpa harus memesan sesi lebih dulu.
            </p>
            <Link
              href="/kontak"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Hubungi EduStory
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
