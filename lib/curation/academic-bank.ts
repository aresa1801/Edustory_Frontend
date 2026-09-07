/**
 * lib/curation/academic-bank.ts
 * ---------------------------------------------------------------------------
 * Curated static question bank for SD (1–6) and SMP (7–9) grade levels.
 *
 * This is the SERVER-AUTHORITATIVE copy of the question bank. Item keys and
 * explanations live ONLY here / server-side; the client never receives the
 * `correctAnswer` field, so a candidate cannot compute their own score and it
 * cannot be tampered with.
 *
 * Sources / inspiration (open-source, Kurikulum Merdeka / K-13 Kemendikbud):
 *   - soallatihan/soallatihan.github.io
 *   - wahyuuuwid/sinau-bareng
 */

export interface AcademicQuestion {
  id: number
  level: string
  subject: string
  question: string
  options: { value: string; text: string }[]
  /** Server-only. Never leaked to the client. */
  correctAnswer: string
  /** Short explanation of the correct answer (shown AFTER submission). */
  explanation: string
}

/** The version of this bank. Bump when content changes so old sessions can be
 *  invalidated / re-graded consistently. */
export const ACADEMIC_BANK_VERSION = 'v1'

export const ACADEMIC_QUESTION_BANK: AcademicQuestion[] = [
  // ── SD KELAS 1 ──────────────────────────────────────────────────────
  {
    id: 101, level: 'SD Kelas 1', subject: 'Matematika',
    question: 'Berapa hasil dari 5 + 3?',
    options: [{ value: 'a', text: '7' }, { value: 'b', text: '8' }, { value: 'c', text: '9' }, { value: 'd', text: '10' }],
    correctAnswer: 'b',
    explanation: '5 + 3 = 8, jadi jawaban yang benar adalah 8.',
  },
  {
    id: 102, level: 'SD Kelas 1', subject: 'Bahasa Indonesia',
    question: 'Huruf apa yang ada di antara huruf B dan D dalam alfabet?',
    options: [{ value: 'a', text: 'A' }, { value: 'b', text: 'C' }, { value: 'c', text: 'E' }, { value: 'd', text: 'F' }],
    correctAnswer: 'b',
    explanation: 'Urutan alfabet: A, B, C, D. Huruf di antara B dan D adalah C.',
  },
  {
    id: 103, level: 'SD Kelas 1', subject: 'Matematika',
    question: 'Berapa hasil dari 10 − 4?',
    options: [{ value: 'a', text: '4' }, { value: 'b', text: '5' }, { value: 'c', text: '6' }, { value: 'd', text: '7' }],
    correctAnswer: 'c',
    explanation: '10 − 4 = 6.',
  },
  {
    id: 104, level: 'SD Kelas 1', subject: 'Bahasa Indonesia',
    question: 'Kata berikut yang diawali huruf vokal adalah:',
    options: [{ value: 'a', text: 'Meja' }, { value: 'b', text: 'Buku' }, { value: 'c', text: 'Ikan' }, { value: 'd', text: 'Kursi' }],
    correctAnswer: 'c',
    explanation: 'Huruf vokal: a, i, u, e, o. Kata "ikan" diawali huruf i (vokal).',
  },
  {
    id: 105, level: 'SD Kelas 1', subject: 'Matematika',
    question: 'Bilangan yang lebih besar dari 7 adalah:',
    options: [{ value: 'a', text: '5' }, { value: 'b', text: '6' }, { value: 'c', text: '7' }, { value: 'd', text: '9' }],
    correctAnswer: 'd',
    explanation: 'Dari pilihan tersebut, 9 lebih besar dari 7.',
  },

  // ── SD KELAS 2 ──────────────────────────────────────────────────────
  {
    id: 201, level: 'SD Kelas 2', subject: 'Matematika',
    question: 'Sebuah kantong berisi 12 permen. Diberikan 4 permen kepada teman. Berapa permen yang tersisa?',
    options: [{ value: 'a', text: '6' }, { value: 'b', text: '7' }, { value: 'c', text: '8' }, { value: 'd', text: '9' }],
    correctAnswer: 'c',
    explanation: '12 − 4 = 8 permen yang tersisa.',
  },
  {
    id: 202, level: 'SD Kelas 2', subject: 'IPA',
    question: 'Hewan apa yang bertelur dan tinggal di air?',
    options: [{ value: 'a', text: 'Kucing' }, { value: 'b', text: 'Ikan' }, { value: 'c', text: 'Sapi' }, { value: 'd', text: 'Kambing' }],
    correctAnswer: 'b',
    explanation: 'Ikan hidup di air dan berkembang biak dengan bertelur.',
  },
  {
    id: 203, level: 'SD Kelas 2', subject: 'Matematika',
    question: 'Hasil dari 6 × 3 adalah:',
    options: [{ value: 'a', text: '12' }, { value: 'b', text: '15' }, { value: 'c', text: '18' }, { value: 'd', text: '21' }],
    correctAnswer: 'c',
    explanation: '6 × 3 = 18.',
  },
  {
    id: 204, level: 'SD Kelas 2', subject: 'Bahasa Indonesia',
    question: 'Kalimat yang menyatakan pertanyaan menggunakan tanda baca:',
    options: [{ value: 'a', text: 'Titik (.)' }, { value: 'b', text: 'Tanda tanya (?)' }, { value: 'c', text: 'Koma (,)' }, { value: 'd', text: 'Tanda seru (!)' }],
    correctAnswer: 'b',
    explanation: 'Kalimat tanya diakhiri dengan tanda tanya (?).',
  },
  {
    id: 205, level: 'SD Kelas 2', subject: 'IPA',
    question: 'Bagian tubuh tumbuhan yang berfungsi menyerap air dari tanah adalah:',
    options: [{ value: 'a', text: 'Daun' }, { value: 'b', text: 'Bunga' }, { value: 'c', text: 'Akar' }, { value: 'd', text: 'Batang' }],
    correctAnswer: 'c',
    explanation: 'Akar menyerap air dan zat hara dari tanah.',
  },

  // ── SD KELAS 3 ──────────────────────────────────────────────────────
  {
    id: 301, level: 'SD Kelas 3', subject: 'Matematika',
    question: 'Hasil dari 7 × 8 adalah:',
    options: [{ value: 'a', text: '54' }, { value: 'b', text: '56' }, { value: 'c', text: '58' }, { value: 'd', text: '60' }],
    correctAnswer: 'b',
    explanation: '7 × 8 = 56.',
  },
  {
    id: 302, level: 'SD Kelas 3', subject: 'IPA',
    question: 'Proses perubahan air menjadi uap air disebut:',
    options: [{ value: 'a', text: 'Membeku' }, { value: 'b', text: 'Mencair' }, { value: 'c', text: 'Menguap' }, { value: 'd', text: 'Mengembun' }],
    correctAnswer: 'c',
    explanation: 'Perubahan zat cair menjadi gas disebut menguap (evaporasi).',
  },
  {
    id: 303, level: 'SD Kelas 3', subject: 'Bahasa Indonesia',
    question: 'Kalimat "Ibu memasak nasi" terdiri dari berapa kata?',
    options: [{ value: 'a', text: '2' }, { value: 'b', text: '3' }, { value: 'c', text: '4' }, { value: 'd', text: '5' }],
    correctAnswer: 'b',
    explanation: 'Ibu / memasak / nasi = 3 kata.',
  },
  {
    id: 304, level: 'SD Kelas 3', subject: 'Matematika',
    question: 'Hasil dari 48 : 6 adalah:',
    options: [{ value: 'a', text: '6' }, { value: 'b', text: '7' }, { value: 'c', text: '8' }, { value: 'd', text: '9' }],
    correctAnswer: 'c',
    explanation: '48 : 6 = 8.',
  },
  {
    id: 305, level: 'SD Kelas 3', subject: 'IPA',
    question: 'Sumber energi utama bagi tubuh manusia adalah:',
    options: [{ value: 'a', text: 'Vitamin' }, { value: 'b', text: 'Karbohidrat' }, { value: 'c', text: 'Protein' }, { value: 'd', text: 'Mineral' }],
    correctAnswer: 'b',
    explanation: 'Karbohidrat merupakan sumber energi utama tubuh.',
  },

  // ── SD KELAS 4 ──────────────────────────────────────────────────────
  {
    id: 401, level: 'SD Kelas 4', subject: 'Matematika',
    question: 'Sebuah persegi memiliki sisi 6 cm. Berapakah kelilingnya?',
    options: [{ value: 'a', text: '18 cm' }, { value: 'b', text: '24 cm' }, { value: 'c', text: '30 cm' }, { value: 'd', text: '36 cm' }],
    correctAnswer: 'b',
    explanation: 'Keliling persegi = 4 × sisi = 4 × 6 = 24 cm.',
  },
  {
    id: 402, level: 'SD Kelas 4', subject: 'IPA',
    question: 'Organ pernapasan pada manusia adalah:',
    options: [{ value: 'a', text: 'Jantung' }, { value: 'b', text: 'Hati' }, { value: 'c', text: 'Paru-paru' }, { value: 'd', text: 'Lambung' }],
    correctAnswer: 'c',
    explanation: 'Manusia bernapas menggunakan paru-paru.',
  },
  {
    id: 403, level: 'SD Kelas 4', subject: 'IPS',
    question: 'Batas wilayah Indonesia di sebelah utara adalah:',
    options: [{ value: 'a', text: 'Australia' }, { value: 'b', text: 'Malaysia dan Filipina' }, { value: 'c', text: 'India' }, { value: 'd', text: 'Papua Nugini' }],
    correctAnswer: 'b',
    explanation: 'Di utara, Indonesia berbatasan dengan Malaysia dan Filipina.',
  },
  {
    id: 404, level: 'SD Kelas 4', subject: 'Matematika',
    question: 'Hasil dari 15 + 28 adalah:',
    options: [{ value: 'a', text: '33' }, { value: 'b', text: '40' }, { value: 'c', text: '43' }, { value: 'd', text: '45' }],
    correctAnswer: 'c',
    explanation: '15 + 28 = 43.',
  },
  {
    id: 405, level: 'SD Kelas 4', subject: 'Bahasa Indonesia',
    question: 'Ide pokok dalam sebuah paragraf biasanya terdapat pada:',
    options: [{ value: 'a', text: 'Kalimat penjelas' }, { value: 'b', text: 'Kalimat utama' }, { value: 'c', text: 'Kata penghubung' }, { value: 'd', text: 'Tanda baca' }],
    correctAnswer: 'b',
    explanation: 'Ide pokok terkandung dalam kalimat utama paragraf.',
  },

  // ── SD KELAS 5 ──────────────────────────────────────────────────────
  {
    id: 501, level: 'SD Kelas 5', subject: 'Matematika',
    question: 'Sebuah kubus memiliki sisi 4 cm. Berapakah volumenya?',
    options: [{ value: 'a', text: '16 cm³' }, { value: 'b', text: '48 cm³' }, { value: 'c', text: '64 cm³' }, { value: 'd', text: '80 cm³' }],
    correctAnswer: 'c',
    explanation: 'Volume kubus = s³ = 4 × 4 × 4 = 64 cm³.',
  },
  {
    id: 502, level: 'SD Kelas 5', subject: 'IPA',
    question: 'Proses fotosintesis pada tumbuhan menghasilkan:',
    options: [{ value: 'a', text: 'CO₂ dan air' }, { value: 'b', text: 'Oksigen dan glukosa' }, { value: 'c', text: 'Nitrogen dan air' }, { value: 'd', text: 'Uap air saja' }],
    correctAnswer: 'b',
    explanation: 'Fotosintesis menghasilkan oksigen (O₂) dan glukosa.',
  },
  {
    id: 503, level: 'SD Kelas 5', subject: 'Bahasa Indonesia',
    question: 'Sinonim kata "senang" adalah:',
    options: [{ value: 'a', text: 'Sedih' }, { value: 'b', text: 'Bahagia' }, { value: 'c', text: 'Marah' }, { value: 'd', text: 'Bingung' }],
    correctAnswer: 'b',
    explanation: 'Sinonim senang adalah bahagia.',
  },
  {
    id: 504, level: 'SD Kelas 5', subject: 'IPS',
    question: 'Proklamasi Kemerdekaan Indonesia dibacakan pada tanggal:',
    options: [{ value: 'a', text: '17 Agustus 1944' }, { value: 'b', text: '17 Agustus 1945' }, { value: 'c', text: '18 Agustus 1945' }, { value: 'd', text: '17 September 1945' }],
    correctAnswer: 'b',
    explanation: 'Proklamasi dibacakan pada 17 Agustus 1945.',
  },
  {
    id: 505, level: 'SD Kelas 5', subject: 'Matematika',
    question: 'Hasil dari 3/4 + 1/4 adalah:',
    options: [{ value: 'a', text: '1/2' }, { value: 'b', text: '3/4' }, { value: 'c', text: '1' }, { value: 'd', text: '4/4' }],
    correctAnswer: 'c',
    explanation: '3/4 + 1/4 = 4/4 = 1.',
  },

  // ── SD KELAS 6 ──────────────────────────────────────────────────────
  {
    id: 601, level: 'SD Kelas 6', subject: 'Matematika',
    question: 'Hasil dari 25% × 200 adalah:',
    options: [{ value: 'a', text: '40' }, { value: 'b', text: '50' }, { value: 'c', text: '60' }, { value: 'd', text: '75' }],
    correctAnswer: 'b',
    explanation: '25% dari 200 = 0,25 × 200 = 50.',
  },
  {
    id: 602, level: 'SD Kelas 6', subject: 'IPA',
    question: 'Gaya yang bekerja antara dua benda bermassa disebut:',
    options: [{ value: 'a', text: 'Gaya magnet' }, { value: 'b', text: 'Gaya gesek' }, { value: 'c', text: 'Gaya gravitasi' }, { value: 'd', text: 'Gaya listrik' }],
    correctAnswer: 'c',
    explanation: 'Gaya gravitasi bekerja antara dua benda yang memiliki massa.',
  },
  {
    id: 603, level: 'SD Kelas 6', subject: 'Bahasa Indonesia',
    question: 'Paragraf yang kalimat utamanya berada di awal paragraf disebut paragraf:',
    options: [{ value: 'a', text: 'Induktif' }, { value: 'b', text: 'Deduktif' }, { value: 'c', text: 'Campuran' }, { value: 'd', text: 'Deskriptif' }],
    correctAnswer: 'b',
    explanation: 'Paragraf deduktif memiliki kalimat utama di awal.',
  },
  {
    id: 604, level: 'SD Kelas 6', subject: 'PKn',
    question: 'Dasar negara Indonesia adalah:',
    options: [{ value: 'a', text: 'UUD 1945' }, { value: 'b', text: 'Pancasila' }, { value: 'c', text: 'Bhinneka Tunggal Ika' }, { value: 'd', text: 'GBHN' }],
    correctAnswer: 'b',
    explanation: 'Dasar negara Indonesia adalah Pancasila.',
  },
  {
    id: 605, level: 'SD Kelas 6', subject: 'Matematika',
    question: 'Lingkaran dengan jari-jari 7 cm memiliki luas (π = 22/7):',
    options: [{ value: 'a', text: '154 cm²' }, { value: 'b', text: '144 cm²' }, { value: 'c', text: '44 cm²' }, { value: 'd', text: '22 cm²' }],
    correctAnswer: 'a',
    explanation: 'Luas lingkaran = πr² = 22/7 × 7 × 7 = 154 cm².',
  },

  // ── SMP KELAS 7 ─────────────────────────────────────────────────────
  {
    id: 701, level: 'SMP Kelas 7', subject: 'Matematika',
    question: 'Nilai dari |-8 + 3| adalah:',
    options: [{ value: 'a', text: '-5' }, { value: 'b', text: '5' }, { value: 'c', text: '11' }, { value: 'd', text: '-11' }],
    correctAnswer: 'b',
    explanation: '|-8 + 3| = |-5| = 5 (nilai mutlak selalu non-negatif).',
  },
  {
    id: 702, level: 'SMP Kelas 7', subject: 'IPA',
    question: 'Satuan dasar panjang dalam SI adalah:',
    options: [{ value: 'a', text: 'Centimeter' }, { value: 'b', text: 'Kilometer' }, { value: 'c', text: 'Meter' }, { value: 'd', text: 'Millimeter' }],
    correctAnswer: 'c',
    explanation: 'Satuan SI untuk panjang adalah meter (m).',
  },
  {
    id: 703, level: 'SMP Kelas 7', subject: 'Bahasa Indonesia',
    question: 'Teks yang menggambarkan suatu objek secara rinci sehingga pembaca seolah-olah melihat sendiri disebut teks:',
    options: [{ value: 'a', text: 'Narasi' }, { value: 'b', text: 'Eksposisi' }, { value: 'c', text: 'Deskripsi' }, { value: 'd', text: 'Argumentasi' }],
    correctAnswer: 'c',
    explanation: 'Teks deskripsi menggambarkan objek secara rinci.',
  },
  {
    id: 704, level: 'SMP Kelas 7', subject: 'Bahasa Inggris',
    question: 'What is the plural form of "child"?',
    options: [{ value: 'a', text: 'Childs' }, { value: 'b', text: 'Childen' }, { value: 'c', text: 'Children' }, { value: 'd', text: 'Childes' }],
    correctAnswer: 'c',
    explanation: 'The plural of "child" is an irregular form: "children".',
  },
  {
    id: 705, level: 'SMP Kelas 7', subject: 'IPS',
    question: 'Benua terbesar di dunia adalah:',
    options: [{ value: 'a', text: 'Afrika' }, { value: 'b', text: 'Amerika' }, { value: 'c', text: 'Asia' }, { value: 'd', text: 'Eropa' }],
    correctAnswer: 'c',
    explanation: 'Asia adalah benua terbesar di dunia.',
  },
  {
    id: 706, level: 'SMP Kelas 7', subject: 'Matematika',
    question: 'Hasil dari 2x + 3 = 11, maka nilai x adalah:',
    options: [{ value: 'a', text: '2' }, { value: 'b', text: '3' }, { value: 'c', text: '4' }, { value: 'd', text: '5' }],
    correctAnswer: 'c',
    explanation: '2x = 8, maka x = 4.',
  },

  // ── SMP KELAS 8 ─────────────────────────────────────────────────────
  {
    id: 801, level: 'SMP Kelas 8', subject: 'Matematika',
    question: 'Gradien garis 2y = 4x + 6 adalah:',
    options: [{ value: 'a', text: '1' }, { value: 'b', text: '2' }, { value: 'c', text: '3' }, { value: 'd', text: '4' }],
    correctAnswer: 'b',
    explanation: 'y = 2x + 3, sehingga gradiennya 2.',
  },
  {
    id: 802, level: 'SMP Kelas 8', subject: 'IPA (Fisika)',
    question: 'Tekanan = Gaya / Luas. Jika gaya 100 N dan luas 2 m², tekanannya adalah:',
    options: [{ value: 'a', text: '25 Pa' }, { value: 'b', text: '50 Pa' }, { value: 'c', text: '100 Pa' }, { value: 'd', text: '200 Pa' }],
    correctAnswer: 'b',
    explanation: 'P = F/A = 100/2 = 50 Pa.',
  },
  {
    id: 803, level: 'SMP Kelas 8', subject: 'IPA (Biologi)',
    question: 'Organel sel yang berfungsi sebagai "pembangkit energi" adalah:',
    options: [{ value: 'a', text: 'Ribosom' }, { value: 'b', text: 'Nukleus' }, { value: 'c', text: 'Mitokondria' }, { value: 'd', text: 'Vakuola' }],
    correctAnswer: 'c',
    explanation: 'Mitokondria adalah tempat respirasi sel dan pembangkit energi (ATP).',
  },
  {
    id: 804, level: 'SMP Kelas 8', subject: 'Bahasa Indonesia',
    question: 'Majas yang membandingkan dua hal berbeda menggunakan kata "seperti" atau "bagaikan" disebut:',
    options: [{ value: 'a', text: 'Metafora' }, { value: 'b', text: 'Simile' }, { value: 'c', text: 'Personifikasi' }, { value: 'd', text: 'Hiperbola' }],
    correctAnswer: 'b',
    explanation: 'Simile (perumpamaan) membandingkan dengan kata seperti/bagaikan.',
  },
  {
    id: 805, level: 'SMP Kelas 8', subject: 'Bahasa Inggris',
    question: 'Choose the correct passive voice: "The cake ___ by my mother yesterday."',
    options: [{ value: 'a', text: 'is baked' }, { value: 'b', text: 'was baked' }, { value: 'c', text: 'baked' }, { value: 'd', text: 'has baked' }],
    correctAnswer: 'b',
    explanation: '"Yesterday" menandakan lampau, sehingga digunakan "was baked".',
  },

  // ── SMP KELAS 9 ─────────────────────────────────────────────────────
  {
    id: 901, level: 'SMP Kelas 9', subject: 'Matematika',
    question: 'Nilai dari √144 + √25 adalah:',
    options: [{ value: 'a', text: '16' }, { value: 'b', text: '17' }, { value: 'c', text: '18' }, { value: 'd', text: '19' }],
    correctAnswer: 'b',
    explanation: '√144 = 12 dan √25 = 5, sehingga 12 + 5 = 17.',
  },
  {
    id: 902, level: 'SMP Kelas 9', subject: 'IPA (Kimia)',
    question: 'Unsur dengan lambang "Fe" pada tabel periodik adalah:',
    options: [{ value: 'a', text: 'Fluor' }, { value: 'b', text: 'Fosfor' }, { value: 'c', text: 'Besi' }, { value: 'd', text: 'Timbal' }],
    correctAnswer: 'c',
    explanation: 'Fe (ferrum) adalah lambang unsur besi.',
  },
  {
    id: 903, level: 'SMP Kelas 9', subject: 'IPS',
    question: 'Peristiwa yang menandai runtuhnya Uni Soviet terjadi pada tahun:',
    options: [{ value: 'a', text: '1989' }, { value: 'b', text: '1990' }, { value: 'c', text: '1991' }, { value: 'd', text: '1992' }],
    correctAnswer: 'c',
    explanation: 'Uni Soviet resmi bubar pada akhir tahun 1991.',
  },
  {
    id: 904, level: 'SMP Kelas 9', subject: 'Bahasa Inggris',
    question: '"She has been studying for three hours." This sentence uses the tense:',
    options: [{ value: 'a', text: 'Present Perfect' }, { value: 'b', text: 'Past Perfect Continuous' }, { value: 'c', text: 'Present Perfect Continuous' }, { value: 'd', text: 'Simple Past' }],
    correctAnswer: 'c',
    explanation: '"has been + V-ing" menandakan Present Perfect Continuous.',
  },
  {
    id: 905, level: 'SMP Kelas 9', subject: 'IPA (Fisika)',
    question: 'Percepatan gravitasi bumi adalah sekitar:',
    options: [{ value: 'a', text: '8 m/s²' }, { value: 'b', text: '9 m/s²' }, { value: 'c', text: '10 m/s²' }, { value: 'd', text: '11 m/s²' }],
    correctAnswer: 'c',
    explanation: 'Percepatan gravitasi bumi ≈ 9,8 ≈ 10 m/s².',
  },
  {
    id: 906, level: 'SMP Kelas 9', subject: 'Matematika',
    question: 'Hasil pemfaktoran dari x² − 9 adalah:',
    options: [{ value: 'a', text: '(x − 3)(x + 3)' }, { value: 'b', text: '(x − 3)(x − 3)' }, { value: 'c', text: '(x + 3)(x + 3)' }, { value: 'd', text: '(x − 9)(x + 1)' }],
    correctAnswer: 'a',
    explanation: 'x² − 9 = (x − 3)(x + 3) sebagai selisih kuadrat.',
  },
]
