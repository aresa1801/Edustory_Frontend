// Katalog konten untuk halaman SEO programmatic /les-privat/[mapel]/[kota]
// Semua data statis supaya bisa di-generate saat build (ISR/static).

export type Subject = {
  slug: string
  name: string
  jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK' | 'SMP & SMA' | 'Semua Jenjang'
  tagline: string
  intro: string
  topics: string[]
  outcome: string
  exam?: string
}

export type City = {
  slug: string
  name: string
  region: string
  blurb: string
  areas: string[]
}

export const SUBJECTS: Subject[] = [
  {
    slug: 'matematika',
    name: 'Matematika',
    jenjang: 'Semua Jenjang',
    tagline: 'Dari hitungan dasar sampai kalkulus',
    intro:
      'Matematika sering dianggap momok karena cara penyampaiannya yang terlalu cepat di sekolah. Tutor Edustory membangun ulang fondasi anak: mulai dari konsep, bukan hafalan rumus, lalu latihan bertingkat sampai anak benar-benar paham kapan rumus itu dipakai.',
    topics: [
      'Aritmetika dan operasi bilangan',
      'Pecahan, desimal, dan persentase',
      'Aljabar dasar dan persamaan linear',
      'Sistem persamaan dua variabel',
      'Fungsi kuadrat dan parabola',
      'Geometri bangun datar dan ruang',
      'Trigonometri dan identitas sudut',
      'Statistika dan peluang',
      'Barisan dan deret',
      'Limit, turunan, dan integral dasar',
    ],
    outcome: 'Nilai rapor naik dan anak berani mengerjakan soal cerita tanpa panik.',
    exam: 'Ujian sekolah, ANBK, dan UTBK',
  },
  {
    slug: 'ipa',
    name: 'IPA',
    jenjang: 'SD',
    tagline: 'Sains dasar yang menyenangkan',
    intro:
      'IPA di SD adalah tempat pertama anak bertemu sains. Kalau di tahap ini anak hanya menghafal, minat sainsnya mati sebelum berkembang. Tutor kami mengajarkan IPA lewat pengamatan sehari-hari supaya konsepnya menempel.',
    topics: [
      'Makhluk hidup dan lingkungannya',
      'Bagian tubuh manusia dan fungsinya',
      'Wujud benda dan perubahannya',
      'Energi, gaya, dan gerak',
      'Bumi, cuaca, dan Tata Surya',
      'Siklus air dan pelestarian lingkungan',
      'Percobaan sederhana di rumah',
      'Latihan soal IPA gaya ANBK',
    ],
    outcome: 'Anak bisa menjelaskan fenomena alam dengan bahasanya sendiri.',
  },
  {
    slug: 'fisika',
    name: 'Fisika',
    jenjang: 'SMA',
    tagline: 'Fisika dengan logika, bukan hafalan',
    intro:
      'Fisika terasa sulit karena siswa berhenti di rumus tanpa memahami situasinya. Tutor Edustory melatih kebiasaan menggambar diagram, menulis besaran yang diketahui, dan menalar arah penyelesaian sebelum menghitung.',
    topics: [
      'Kinematika gerak lurus',
      'Hukum Newton dan dinamika',
      'Usaha, energi, dan daya',
      'Momentum dan impuls',
      'Fluida statis dan dinamis',
      'Suhu, kalor, dan termodinamika',
      'Gelombang dan bunyi',
      'Optik dan alat optik',
      'Listrik statis dan dinamis',
      'Induksi elektromagnetik',
    ],
    outcome: 'Siswa mampu menyelesaikan soal fisika bertingkat tanpa bergantung kunci jawaban.',
    exam: 'Ujian sekolah dan UTBK',
  },
  {
    slug: 'kimia',
    name: 'Kimia',
    jenjang: 'SMA',
    tagline: 'Paham konsep, hafal otomatis',
    intro:
      'Kimia menuntut dua hal sekaligus: memahami model abstrak dan teliti menghitung. Tutor kami memisahkan keduanya, sehingga siswa tidak lagi tertukar antara konsep mol dan cara mengerjakan stoikiometri.',
    topics: [
      'Struktur atom dan konfigurasi elektron',
      'Sistem periodik unsur',
      'Ikatan kimia',
      'Stoikiometri dan konsep mol',
      'Larutan dan konsentrasi',
      'Termokimia',
      'Laju reaksi dan kesetimbangan',
      'Asam basa dan titrasi',
      'Redoks dan elektrokimia',
      'Kimia organik dasar',
    ],
    outcome: 'Siswa bisa membaca soal kimia panjang dan memilah informasi pentingnya.',
    exam: 'Ujian sekolah dan UTBK',
  },
  {
    slug: 'biologi',
    name: 'Biologi',
    jenjang: 'SMA',
    tagline: 'Dari sel sampai ekosistem',
    intro:
      'Biologi punya banyak istilah, tapi sebenarnya sangat logis. Tutor Edustory mengajarkan biologi sebagai rangkaian sebab-akibat, bukan daftar kata asing, sehingga materi bertahan lebih lama di ingatan.',
    topics: [
      'Sel dan jaringan',
      'Sistem organ manusia',
      'Genetika dan hereditas',
      'Sintesis protein',
      'Bioteknologi',
      'Evolusi',
      'Ekologi dan ekosistem',
      'Klasifikasi makhluk hidup',
      'Virus dan bakteri',
      'Latihan soal HOTS biologi',
    ],
    outcome: 'Siswa mampu menjawab soal analisis biologi, bukan hanya soal hafalan.',
    exam: 'Ujian sekolah dan UTBK',
  },
  {
    slug: 'ips',
    name: 'IPS',
    jenjang: 'SMP',
    tagline: 'Memahami dunia sosial di sekitar anak',
    intro:
      'IPS menggabungkan geografi, sejarah, ekonomi, dan sosiologi. Banyak siswa kesulitan karena harus berpindah cara berpikir. Tutor kami membantu anak membedakan pendekatan tiap cabang, lalu menyatukannya saat menjawab soal.',
    topics: [
      'Letak dan kondisi geografis Indonesia',
      'Interaksi sosial dan lembaga sosial',
      'Mobilitas sosial dan perubahan sosial',
      'Sejarah Indonesia masa Hindu-Buddha',
      'Kolonialisme dan pergerakan nasional',
      'Kegiatan ekonomi dan pasar',
      'Sumber daya alam dan pemanfaatannya',
      'Latihan soal IPS gaya ANBK',
    ],
    outcome: 'Nilai IPS naik karena anak paham cara membaca stimulus soal.',
  },
  {
    slug: 'sejarah',
    name: 'Sejarah',
    jenjang: 'SMA',
    tagline: 'Belajar sejarah dengan alur, bukan tahun',
    intro:
      'Menghafal tahun tidak cukup. Tutor Edustory mengajarkan sejarah sebagai cerita sebab-akibat: apa yang terjadi, kenapa terjadi, dan apa dampaknya bagi hari ini.',
    topics: [
      'Konsep dasar ilmu sejarah',
      'Peradaban dunia kuno',
      'Revolusi besar dunia',
      'Pergerakan nasional Indonesia',
      'Pendudukan Jepang dan proklamasi',
      'Demokrasi parlementer dan terpimpin',
      'Orde Baru dan Reformasi',
      'Sejarah kontemporer dunia',
      'Analisis sumber sejarah',
      'Latihan soal HOTS sejarah',
    ],
    outcome: 'Siswa bisa menulis esai sejarah dengan argumen yang runtut.',
    exam: 'Ujian sekolah dan UTBK',
  },
  {
    slug: 'geografi',
    name: 'Geografi',
    jenjang: 'SMA',
    tagline: 'Membaca bumi lewat peta dan data',
    intro:
      'Geografi bukan hanya hafal nama ibu kota. Tutor kami melatih siswa membaca peta, mengolah data spasial, dan memahami hubungan manusia dengan lingkungannya.',
    topics: [
      'Konsep, prinsip, dan pendekatan geografi',
      'Peta, penginderaan jauh, dan SIG',
      'Litosfer dan vulkanisme',
      'Atmosfer dan iklim',
      'Hidrosfer dan siklus air',
      'Tanah dan sumber daya alam',
      'Dinamika penduduk',
      'Desa, kota, dan urbanisasi',
      'Geografi regional Indonesia',
      'Latihan soal geografi UTBK',
    ],
    outcome: 'Siswa mampu menjawab soal berbasis data dan peta dengan tepat.',
    exam: 'Ujian sekolah dan UTBK',
  },
  {
    slug: 'ekonomi',
    name: 'Ekonomi',
    jenjang: 'SMA',
    tagline: 'Logika ekonomi yang berguna seumur hidup',
    intro:
      'Ekonomi menjelaskan keputusan sehari-hari: kenapa harga naik, kenapa orang menabung, kenapa negara berutang. Tutor Edustory membuat konsep ini terasa nyata dan mudah dihitung.',
    topics: [
      'Kebutuhan dan kelangkaan',
      'Permintaan, penawaran, dan harga pasar',
      'Elastisitas',
      'Teori produksi dan biaya',
      'Struktur pasar',
      'Pendapatan nasional dan inflasi',
      'Kebijakan fiskal dan moneter',
      'Perdagangan internasional',
      'Akuntansi dasar',
      'Latihan soal ekonomi UTBK',
    ],
    outcome: 'Siswa paham grafik ekonomi dan bisa mengerjakan soal hitungan dengan benar.',
    exam: 'Ujian sekolah dan UTBK',
  },
  {
    slug: 'sosiologi',
    name: 'Sosiologi',
    jenjang: 'SMA',
    tagline: 'Memahami masyarakat secara ilmiah',
    intro:
      'Sosiologi melatih siswa melihat masalah sosial dari banyak sudut. Tutor kami membantu mengubah opini menjadi analisis berbasis teori dan data.',
    topics: [
      'Sosiologi sebagai ilmu',
      'Nilai, norma, dan sosialisasi',
      'Interaksi dan kelompok sosial',
      'Stratifikasi sosial',
      'Konflik dan integrasi sosial',
      'Perubahan sosial',
      'Masalah sosial kontemporer',
      'Penelitian sosial sederhana',
      'Latihan soal sosiologi UTBK',
    ],
    outcome: 'Siswa mampu menulis analisis sosial dengan struktur argumen yang jelas.',
    exam: 'Ujian sekolah dan UTBK',
  },
  {
    slug: 'bahasa-indonesia',
    name: 'Bahasa Indonesia',
    jenjang: 'Semua Jenjang',
    tagline: 'Menulis dan membaca dengan presisi',
    intro:
      'Bahasa Indonesia sering diremehkan karena dianggap bahasa sehari-hari. Justru di sinilah banyak nilai hilang: struktur teks, ejaan, dan kemampuan menulis argumen. Tutor kami menguatkan keduanya sekaligus.',
    topics: [
      'Ejaan dan tata bahasa baku',
      'Struktur dan jenis teks',
      'Ide pokok dan simpulan bacaan',
      'Menulis paragraf argumentatif',
      'Teks editorial dan opini',
      'Karya sastra dan puisi',
      'Hikayat dan cerpen',
      'Surat resmi dan proposal',
      'Latihan soal literasi ANBK',
      'Latihan soal bahasa Indonesia UTBK',
    ],
    outcome: 'Nilai bahasa Indonesia naik dan anak berani menulis panjang tanpa takut salah.',
    exam: 'ANBK dan UTBK',
  },
  {
    slug: 'bahasa-inggris',
    name: 'Bahasa Inggris',
    jenjang: 'Semua Jenjang',
    tagline: 'Percaya diri bicara dan mengerjakan soal',
    intro:
      'Banyak siswa hafal grammar tapi tidak bisa memakainya. Tutor Edustory membalik urutannya: latihan pakai bahasa dulu, lalu grammar dijelaskan sebagai alat, bukan hafalan.',
    topics: [
      'Tenses dan struktur kalimat',
      'Listening dan pronunciation',
      'Speaking percakapan harian',
      'Reading comprehension',
      'Writing email dan esai',
      'Vocabulary tematik',
      'Descriptive dan recount text',
      'Argumentative essay',
      'TOEFL/IELTS preparation dasar',
      'Latihan soal bahasa Inggris UTBK',
    ],
    outcome: 'Siswa berani berbicara dan nilai reading-nya meningkat.',
    exam: 'Ujian sekolah, TOEFL, dan UTBK',
  },
  {
    slug: 'ppkn',
    name: 'PPKn',
    jenjang: 'Semua Jenjang',
    tagline: 'Kewarganegaraan yang masuk akal',
    intro:
      'PPKn sering dianggap hafalan pasal. Tutor kami menjelaskan konteks historis dan alasan di balik aturan, sehingga siswa bisa menjawab soal analisis kasus.',
    topics: [
      'Pancasila dan implementasinya',
      'UUD 1945 dan amandemen',
      'Hak dan kewajiban warga negara',
      'Bhinneka Tunggal Ika',
      'NKRI dan otonomi daerah',
      'Lembaga negara',
      'Demokrasi dan pemilu',
      'Kasus-kasus kewarganegaraan',
    ],
    outcome: 'Siswa bisa menganalisis kasus nyata memakai konsep kewarganegaraan.',
  },
  {
    slug: 'informatika',
    name: 'Informatika',
    jenjang: 'SMP & SMA',
    tagline: 'Berpikir komputasional dari nol',
    intro:
      'Informatika bukan hanya coding. Tutor Edustory mengajarkan logika berpikir, algoritma, dan dasar pemrograman dengan bahasa yang ramah untuk pemula.',
    topics: [
      'Berpikir komputasional',
      'Algoritma dan flowchart',
      'Pemrograman dasar (Python)',
      'Struktur data sederhana',
      'Basis data dan SQL dasar',
      'Jaringan komputer dan internet',
      'Keamanan digital',
      'Proyek mini aplikasi',
    ],
    outcome: 'Siswa punya portofolio proyek kecil dan paham logika di balik kode.',
  },
  {
    slug: 'seni-budaya',
    name: 'Seni Budaya',
    jenjang: 'Semua Jenjang',
    tagline: 'Apresiasi seni yang terarah',
    intro:
      'Pendampingan seni di rumah sering terbatas pada menggambar. Tutor Edustory membimbing anak memahami dasar visual dan musik, sekaligus menyiapkan tugas sekolah dengan rapi.',
    topics: [
      'Dasar menggambar dan komposisi',
      'Warna dan pencahayaan',
      'Seni rupa daerah Indonesia',
      'Musik dan notasi dasar',
      'Tari dan gerak dasar',
      'Teater sederhana',
      'Apresiasi karya seni',
      'Portofolio tugas sekolah',
    ],
    outcome: 'Anak percaya diri mengerjakan tugas seni dan presentasi karya.',
  },
  {
    slug: 'pjok',
    name: 'PJOK',
    jenjang: 'Semua Jenjang',
    tagline: 'Teori olahraga dan kebugaran',
    intro:
      'Nilai PJOK sering hilang karena bagian teori diabaikan. Tutor kami membantu siswa menguasai materi kebugaran, aturan permainan, dan kesehatan secara ringkas dan terstruktur.',
    topics: [
      'Kebugaran jasmani',
      'Aturan permainan bola besar',
      'Permainan bola kecil',
      'Atletik dasar',
      'Senam dan ritmik',
      'Kesehatan dan gizi',
      'Pencegahan cedera',
      'Latihan soal teori PJOK',
    ],
    outcome: 'Nilai teori PJOK aman dan pemahaman kebugaran anak lebih baik.',
  },
  {
    slug: 'pendidikan-agama',
    name: 'Pendidikan Agama',
    jenjang: 'Semua Jenjang',
    tagline: 'Pendampingan belajar yang sesuai keyakinan',
    intro:
      'Tutor agama di Edustory mendampingi hafalan, pemahaman kitab suci, dan akhlak dengan metode yang menyesuaikan kurikulum sekolah anak serta pembiasaan harian.',
    topics: [
      'Bacaan dan hafalan',
      'Pemahaman materi kurikulum',
      'Akhlak dan adab',
      'Sejarah dan kisah teladan',
      'Ibadah harian',
      'Latihan soal ujian sekolah',
      'Pembiasaan belajar rutin',
    ],
    outcome: 'Materi ujian dikuasai tanpa meninggalkan pembiasaan harian.',
  },
  {
    slug: 'bahasa-mandarin',
    name: 'Bahasa Mandarin',
    jenjang: 'Semua Jenjang',
    tagline: 'Pinyin, hanzi, dan percakapan',
    intro:
      'Mandarin menantang karena tiga sistem sekaligus: pinyin, hanzi, dan nada. Tutor Edustory menyusun urutan belajar supaya anak tidak kewalahan di awal.',
    topics: [
      'Pinyin dan nada',
      'Hanzi dasar dan urutan goresan',
      'Percakapan sehari-hari',
      'Kosakata tematik',
      'Tata bahasa dasar',
      'Membaca teks pendek',
      'Latihan HSK 1-2',
    ],
    outcome: 'Anak bisa memperkenalkan diri dan membaca teks pendek.',
  },
  {
    slug: 'bahasa-jepang',
    name: 'Bahasa Jepang',
    jenjang: 'SMA',
    tagline: 'Hiragana sampai percakapan',
    intro:
      'Belajar Jepang tanpa struktur mudah berhenti di hiragana. Tutor kami memandu sampai anak bisa membentuk kalimat dan memahami teks sederhana.',
    topics: [
      'Hiragana dan katakana',
      'Kanji dasar',
      'Pola kalimat dasar',
      'Partikel dan kata kerja',
      'Percakapan sehari-hari',
      'Membaca teks pendek',
      'Latihan JLPT N5',
    ],
    outcome: 'Siswa siap mengikuti ujian sekolah dan JLPT N5.',
  },
  {
    slug: 'bahasa-arab',
    name: 'Bahasa Arab',
    jenjang: 'Semua Jenjang',
    tagline: 'Membaca, kosakata, dan tata bahasa',
    intro:
      'Bahasa Arab di sekolah sering berhenti di membaca tanpa pemahaman. Tutor kami menyambungkan tiga keterampilan: membaca, kosakata, dan tata bahasa dasar.',
    topics: [
      'Huruf hijaiyah dan makhraj',
      'Membaca teks berharakat',
      'Kosakata tematik',
      'Isim, fiil, dan huruf',
      'Percakapan dasar',
      'Menerjemahkan teks pendek',
      'Latihan soal bahasa Arab',
    ],
    outcome: 'Siswa lancar membaca dan memahami teks pelajaran.',
  },
  {
    slug: 'akuntansi',
    name: 'Akuntansi',
    jenjang: 'SMK',
    tagline: 'Siklus akuntansi dari nol',
    intro:
      'Akuntansi butuh ketelitian dan urutan yang benar. Tutor Edustory memandu siswa mengerjakan siklus akuntansi langkah demi langkah sampai bisa mandiri.',
    topics: [
      'Persamaan dasar akuntansi',
      'Jurnal umum dan khusus',
      'Buku besar',
      'Neraca saldo',
      'Jurnal penyesuaian',
      'Laporan keuangan',
      'Akuntansi perusahaan dagang',
      'Latihan soal UKK akuntansi',
    ],
    outcome: 'Siswa mampu menyusun laporan keuangan sederhana sendiri.',
  },
  {
    slug: 'calistung',
    name: 'Calistung',
    jenjang: 'SD',
    tagline: 'Fondasi membaca, menulis, berhitung',
    intro:
      'Calistung adalah fondasi semua pelajaran berikutnya. Tutor Edustory memakai pendekatan bertahap dan menyenangkan supaya anak tidak tertekan, tanpa mengorbankan ketepatan.',
    topics: [
      'Mengenal huruf dan bunyi',
      'Membaca suku kata dan kata',
      'Membaca kalimat pendek',
      'Menulis huruf dan angka',
      'Berhitung 1-100',
      'Penjumlahan dan pengurangan dasar',
      'Latihan fokus dan konsentrasi',
    ],
    outcome: 'Anak siap mengikuti pelajaran kelas 1 dengan percaya diri.',
  },
  {
    slug: 'tpa',
    name: 'TPA',
    jenjang: 'Semua Jenjang',
    tagline: 'Latihan tes potensi akademik',
    intro:
      'TPA menguji kecepatan berpikir, bukan hafalan. Tutor kami melatih strategi mengerjakan soal dengan waktu terbatas, termasuk trik eliminasi jawaban.',
    topics: [
      'Tes verbal dan analogi',
      'Tes numerik',
      'Tes penalaran logis',
      'Tes figural',
      'Strategi manajemen waktu',
      'Latihan simulasi TPA',
      'Pembahasan soal sulit',
    ],
    outcome: 'Skor TPA meningkat signifikan dengan latihan terukur.',
  },
  {
    slug: 'utbk-snbt',
    name: 'Persiapan UTBK SNBT',
    jenjang: 'SMA',
    tagline: 'Strategi masuk PTN impian',
    intro:
      'UTBK bukan sekadar pintar, tapi juga tahu cara mengerjakan. Program ini menggabungkan penguatan materi, latihan timed, dan analisis kelemahan per subtes.',
    topics: [
      'Penalaran umum',
      'Pengetahuan dan pemahaman umum',
      'Pemahaman bacaan dan menulis',
      'Pengetahuan kuantitatif',
      'Literasi bahasa Indonesia',
      'Literasi bahasa Inggris',
      'Penalaran matematika',
      'Strategi pemilihan jurusan',
      'Simulasi UTBK penuh',
    ],
    outcome: 'Siswa punya target skor jelas dan rencana belajar hingga hari-H.',
    exam: 'UTBK SNBT',
  },
]

export const CITIES: City[] = [
  {
    slug: 'jakarta-selatan',
    name: 'Jakarta Selatan',
    region: 'Jabodetabek',
    blurb: 'Kawasan padat sekolah dan kampus, permintaan les privat tinggi',
    areas: ['Kebayoran Baru', 'Kemang', 'Pondok Indah', 'Tebet', 'Cilandak'],
  },
  {
    slug: 'jakarta-pusat',
    name: 'Jakarta Pusat',
    region: 'Jabodetabek',
    blurb: 'Banyak sekolah nasional dan internasional dengan jadwal padat',
    areas: ['Menteng', 'Tanah Abang', 'Kemayoran', 'Cempaka Putih', 'Senen'],
  },
  {
    slug: 'jakarta-barat',
    name: 'Jakarta Barat',
    region: 'Jabodetabek',
    blurb: 'Permintaan tinggi untuk pendampingan belajar sore hari',
    areas: ['Grogol', 'Kebon Jeruk', 'Puri Indah', 'Taman Sari', 'Cengkareng'],
  },
  {
    slug: 'jakarta-timur',
    name: 'Jakarta Timur',
    region: 'Jabodetabek',
    blurb: 'Banyak keluarga muda yang butuh tutor datang ke rumah',
    areas: ['Rawamangun', 'Cibubur', 'Duren Sawit', 'Pulogadung', 'Jatinegara'],
  },
  {
    slug: 'jakarta-utara',
    name: 'Jakarta Utara',
    region: 'Jabodetabek',
    blurb: 'Akses tutor online maupun tatap muka di kawasan pesisir',
    areas: ['Kelapa Gading', 'Sunter', 'Pantai Indah Kapuk', 'Tanjung Priok', 'Pluit'],
  },
  {
    slug: 'depok',
    name: 'Depok',
    region: 'Jabodetabek',
    blurb: 'Kota pelajar dengan kebutuhan persiapan UTBK yang tinggi',
    areas: ['Margonda', 'Cinere', 'Beji', 'Sawangan', 'Sukmajaya'],
  },
  {
    slug: 'tangerang',
    name: 'Tangerang',
    region: 'Jabodetabek',
    blurb: 'Banyak perumahan keluarga dengan anak usia sekolah',
    areas: ['Karawaci', 'Ciledug', 'Batuceper', 'Cipondoh', 'Bintaro'],
  },
  {
    slug: 'tangerang-selatan',
    name: 'Tangerang Selatan',
    region: 'Jabodetabek',
    blurb: 'Permintaan les intensif untuk sekolah favorit dan internasional',
    areas: ['BSD', 'Bintaro Jaya', 'Pamulang', 'Serpong', 'Ciputat'],
  },
  {
    slug: 'bekasi',
    name: 'Bekasi',
    region: 'Jabodetabek',
    blurb: 'Jarak ke sekolah jauh, tutor datang jadi solusi praktis',
    areas: ['Harapan Indah', 'Galaxy', 'Jatiasih', 'Pondok Gede', 'Cibitung'],
  },
  {
    slug: 'bogor',
    name: 'Bogor',
    region: 'Jabodetabek',
    blurb: 'Kota dengan ritme tenang, cocok untuk les sore yang konsisten',
    areas: ['Dramaga', 'Cibinong', 'Tanah Sareal', 'Bogor Barat', 'Sentul'],
  },
  {
    slug: 'bandung',
    name: 'Bandung',
    region: 'Jawa Barat',
    blurb: 'Kota pendidikan dengan banyak sekolah unggulan',
    areas: ['Dago', 'Setiabudi', 'Buah Batu', 'Cibiru', 'Antapani'],
  },
  {
    slug: 'semarang',
    name: 'Semarang',
    region: 'Jawa Tengah',
    blurb: 'Ibu kota Jawa Tengah dengan persaingan sekolah yang ketat',
    areas: ['Banyumanik', 'Tembalang', 'Gajahmungkur', 'Ngaliyan', 'Pedurungan'],
  },
  {
    slug: 'surakarta',
    name: 'Surakarta (Solo)',
    region: 'Jawa Tengah',
    blurb: 'Kota budaya dengan banyak sekolah dan pesantren',
    areas: ['Laweyan', 'Banjarsari', 'Sukoharjo', 'Karanganyar', 'Jebres'],
  },
  {
    slug: 'yogyakarta',
    name: 'Yogyakarta',
    region: 'DI Yogyakarta',
    blurb: 'Kota pelajar, kebutuhan bimbel dan les privat sangat tinggi',
    areas: ['Malioboro', 'Seturan', 'Kotabaru', 'Umbulharjo', 'Tugu'],
  },
  {
    slug: 'sleman',
    name: 'Sleman',
    region: 'DI Yogyakarta',
    blurb: 'Banyak keluarga akademisi, fokus pada kualitas belajar',
    areas: ['Depok', 'Gamping', 'Mlati', 'Godean', 'Kalasan'],
  },
  {
    slug: 'bantul',
    name: 'Bantul',
    region: 'DI Yogyakarta',
    blurb: 'Akses tutor tatap muka maupun online dengan biaya bersaing',
    areas: ['Kasihan', 'Sewon', 'Banguntapan', 'Piyungan', 'Pleret'],
  },
  {
    slug: 'magelang',
    name: 'Magelang',
    region: 'Jawa Tengah',
    blurb: 'Kota kecil dengan sekolah favorit dan disiplin tinggi',
    areas: ['Magelang Tengah', 'Magelang Utara', 'Mertoyudan', 'Muntilan', 'Salaman'],
  },
  {
    slug: 'klaten',
    name: 'Klaten',
    region: 'Jawa Tengah',
    blurb: 'Banyak siswa mempersiapkan sekolah unggulan di Solo dan Jogja',
    areas: ['Klaten Tengah', 'Delanggu', 'Pedan', 'Jogonalan', 'Wedi'],
  },
  {
    slug: 'purwokerto',
    name: 'Purwokerto',
    region: 'Jawa Tengah',
    blurb: 'Pusat pendidikan Banyumas dengan kebutuhan les intensif',
    areas: ['Purwokerto Barat', 'Purwokerto Timur', 'Baturraden', 'Sokaraja', 'Kembaran'],
  },
  {
    slug: 'surabaya',
    name: 'Surabaya',
    region: 'Jawa Timur',
    blurb: 'Kota besar dengan kompetisi masuk SMA dan PTN favorit',
    areas: ['Wonokromo', 'Rungkut', 'Darmo', 'Gubeng', 'Sukolilo'],
  },
  {
    slug: 'malang',
    name: 'Malang',
    region: 'Jawa Timur',
    blurb: 'Kota pendidikan dengan banyak kampus dan sekolah unggulan',
    areas: ['Lowokwaru', 'Klojen', 'Blimbing', 'Sukun', 'Batu'],
  },
  {
    slug: 'medan',
    name: 'Medan',
    region: 'Sumatera',
    blurb: 'Kebutuhan les privat tumbuh untuk persiapan UTBK dan olimpiade',
    areas: ['Medan Baru', 'Medan Polonia', 'Helvetia', 'Setiabudi', 'Johor'],
  },
  {
    slug: 'palembang',
    name: 'Palembang',
    region: 'Sumatera',
    blurb: 'Kota dengan sekolah favorit dan persiapan masuk PTN yang serius',
    areas: ['Ilir Barat', 'Kemuning', 'Sukarami', 'Bukit Besar', 'Plaju'],
  },
  {
    slug: 'makassar',
    name: 'Makassar',
    region: 'Sulawesi',
    blurb: 'Pusat pendidikan Indonesia Timur dengan permintaan terus naik',
    areas: ['Panakkukang', 'Rappocini', 'Biringkanaya', 'Tamalate', 'Gowa'],
  },
]

export function getSubject(slug: string) {
  return SUBJECTS.find((s) => s.slug === slug)
}

export function getCity(slug: string) {
  return CITIES.find((c) => c.slug === slug)
}

export function comboSlugs() {
  return SUBJECTS.flatMap((s) => CITIES.map((c) => ({ mapel: s.slug, kota: c.slug })))
}

export const SITE_URL = 'https://edustory.online'

export function abs(path: string) {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
