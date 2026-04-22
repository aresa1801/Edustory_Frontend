'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'

// -----------------------------------------------------------------------
// Comprehensive question bank: SD kelas 1–6, SMP kelas 7–9, SMA kelas 10–12
// Sources / inspiration:
//   - soallatihan/soallatihan.github.io (GitHub, open source)
//   - wahyuuuwid/sinau-bareng (GitHub, open source)
//   - Kurikulum Merdeka / K-13 standar kompetensi dasar Kemendikbud
// -----------------------------------------------------------------------
type Question = {
  id: number
  level: string
  subject: string
  question: string
  options: { value: string; text: string }[]
  correctAnswer: string
}

const QUESTION_BANK: Question[] = [
  // ===========================
  // SD KELAS 1 — Matematika
  // ===========================
  {
    id: 101, level: 'SD Kelas 1', subject: 'Matematika',
    question: 'Berapa hasil dari 5 + 3?',
    options: [{ value: 'a', text: '7' }, { value: 'b', text: '8' }, { value: 'c', text: '9' }, { value: 'd', text: '10' }],
    correctAnswer: 'b',
  },
  {
    id: 102, level: 'SD Kelas 1', subject: 'Bahasa Indonesia',
    question: 'Huruf apa yang ada di antara huruf B dan D dalam alfabet?',
    options: [{ value: 'a', text: 'A' }, { value: 'b', text: 'C' }, { value: 'c', text: 'E' }, { value: 'd', text: 'F' }],
    correctAnswer: 'b',
  },
  // ===========================
  // SD KELAS 2 — Matematika
  // ===========================
  {
    id: 201, level: 'SD Kelas 2', subject: 'Matematika',
    question: 'Sebuah kantong berisi 12 permen. Diberikan 4 permen kepada teman. Berapa permen yang tersisa?',
    options: [{ value: 'a', text: '6' }, { value: 'b', text: '7' }, { value: 'c', text: '8' }, { value: 'd', text: '9' }],
    correctAnswer: 'c',
  },
  {
    id: 202, level: 'SD Kelas 2', subject: 'IPA',
    question: 'Hewan apa yang bertelur dan tinggal di air?',
    options: [{ value: 'a', text: 'Kucing' }, { value: 'b', text: 'Ikan' }, { value: 'c', text: 'Sapi' }, { value: 'd', text: 'Kambing' }],
    correctAnswer: 'b',
  },
  // ===========================
  // SD KELAS 3 — Matematika & IPA
  // ===========================
  {
    id: 301, level: 'SD Kelas 3', subject: 'Matematika',
    question: 'Hasil dari 7 × 8 adalah:',
    options: [{ value: 'a', text: '54' }, { value: 'b', text: '56' }, { value: 'c', text: '58' }, { value: 'd', text: '60' }],
    correctAnswer: 'b',
  },
  {
    id: 302, level: 'SD Kelas 3', subject: 'IPA',
    question: 'Proses perubahan air menjadi uap air disebut:',
    options: [{ value: 'a', text: 'Membeku' }, { value: 'b', text: 'Mencair' }, { value: 'c', text: 'Menguap' }, { value: 'd', text: 'Mengembun' }],
    correctAnswer: 'c',
  },
  {
    id: 303, level: 'SD Kelas 3', subject: 'Bahasa Indonesia',
    question: 'Kalimat "Ibu memasak nasi" terdiri dari berapa kata?',
    options: [{ value: 'a', text: '2' }, { value: 'b', text: '3' }, { value: 'c', text: '4' }, { value: 'd', text: '5' }],
    correctAnswer: 'b',
  },
  // ===========================
  // SD KELAS 4 — Matematika, IPA, IPS
  // ===========================
  {
    id: 401, level: 'SD Kelas 4', subject: 'Matematika',
    question: 'Sebuah persegi memiliki sisi 6 cm. Berapakah kelilingnya?',
    options: [{ value: 'a', text: '18 cm' }, { value: 'b', text: '24 cm' }, { value: 'c', text: '30 cm' }, { value: 'd', text: '36 cm' }],
    correctAnswer: 'b',
  },
  {
    id: 402, level: 'SD Kelas 4', subject: 'IPA',
    question: 'Organ pernapasan pada manusia adalah:',
    options: [{ value: 'a', text: 'Jantung' }, { value: 'b', text: 'Hati' }, { value: 'c', text: 'Paru-paru' }, { value: 'd', text: 'Lambung' }],
    correctAnswer: 'c',
  },
  {
    id: 403, level: 'SD Kelas 4', subject: 'IPS',
    question: 'Batas wilayah Indonesia di sebelah utara adalah:',
    options: [{ value: 'a', text: 'Australia' }, { value: 'b', text: 'Malaysia dan Filipina' }, { value: 'c', text: 'India' }, { value: 'd', text: 'Papua Nugini' }],
    correctAnswer: 'b',
  },
  // ===========================
  // SD KELAS 5 — Matematika, IPA, Bahasa Indonesia
  // ===========================
  {
    id: 501, level: 'SD Kelas 5', subject: 'Matematika',
    question: 'Sebuah kubus memiliki sisi 4 cm. Berapakah volumenya?',
    options: [{ value: 'a', text: '16 cm³' }, { value: 'b', text: '48 cm³' }, { value: 'c', text: '64 cm³' }, { value: 'd', text: '80 cm³' }],
    correctAnswer: 'c',
  },
  {
    id: 502, level: 'SD Kelas 5', subject: 'IPA',
    question: 'Proses fotosintesis pada tumbuhan menghasilkan:',
    options: [{ value: 'a', text: 'CO₂ dan air' }, { value: 'b', text: 'Oksigen dan glukosa' }, { value: 'c', text: 'Nitrogen dan air' }, { value: 'd', text: 'Uap air saja' }],
    correctAnswer: 'b',
  },
  {
    id: 503, level: 'SD Kelas 5', subject: 'Bahasa Indonesia',
    question: 'Sinonim kata "senang" adalah:',
    options: [{ value: 'a', text: 'Sedih' }, { value: 'b', text: 'Bahagia' }, { value: 'c', text: 'Marah' }, { value: 'd', text: 'Bingung' }],
    correctAnswer: 'b',
  },
  {
    id: 504, level: 'SD Kelas 5', subject: 'IPS',
    question: 'Proklamasi Kemerdekaan Indonesia dibacakan pada tanggal:',
    options: [{ value: 'a', text: '17 Agustus 1944' }, { value: 'b', text: '17 Agustus 1945' }, { value: 'c', text: '18 Agustus 1945' }, { value: 'd', text: '17 September 1945' }],
    correctAnswer: 'b',
  },
  // ===========================
  // SD KELAS 6 — Matematika, IPA, Bahasa Indonesia
  // ===========================
  {
    id: 601, level: 'SD Kelas 6', subject: 'Matematika',
    question: 'Hasil dari 25% × 200 adalah:',
    options: [{ value: 'a', text: '40' }, { value: 'b', text: '50' }, { value: 'c', text: '60' }, { value: 'd', text: '75' }],
    correctAnswer: 'b',
  },
  {
    id: 602, level: 'SD Kelas 6', subject: 'IPA',
    question: 'Gaya yang bekerja antara dua benda bermassa disebut:',
    options: [{ value: 'a', text: 'Gaya magnet' }, { value: 'b', text: 'Gaya gesek' }, { value: 'c', text: 'Gaya gravitasi' }, { value: 'd', text: 'Gaya listrik' }],
    correctAnswer: 'c',
  },
  {
    id: 603, level: 'SD Kelas 6', subject: 'Bahasa Indonesia',
    question: 'Paragraf yang kalimat utamanya berada di awal paragraf disebut paragraf:',
    options: [{ value: 'a', text: 'Induktif' }, { value: 'b', text: 'Deduktif' }, { value: 'c', text: 'Campuran' }, { value: 'd', text: 'Deskriptif' }],
    correctAnswer: 'b',
  },
  {
    id: 604, level: 'SD Kelas 6', subject: 'PKn',
    question: 'Dasar negara Indonesia adalah:',
    options: [{ value: 'a', text: 'UUD 1945' }, { value: 'b', text: 'Pancasila' }, { value: 'c', text: 'Bhinneka Tunggal Ika' }, { value: 'd', text: 'GBHN' }],
    correctAnswer: 'b',
  },
  // ===========================
  // SMP KELAS 7 — Matematika, IPA, Bahasa Indonesia, Bahasa Inggris
  // ===========================
  {
    id: 701, level: 'SMP Kelas 7', subject: 'Matematika',
    question: 'Nilai dari |-8 + 3| adalah:',
    options: [{ value: 'a', text: '-5' }, { value: 'b', text: '5' }, { value: 'c', text: '11' }, { value: 'd', text: '-11' }],
    correctAnswer: 'b',
  },
  {
    id: 702, level: 'SMP Kelas 7', subject: 'IPA',
    question: 'Satuan dasar panjang dalam SI adalah:',
    options: [{ value: 'a', text: 'Centimeter' }, { value: 'b', text: 'Kilometer' }, { value: 'c', text: 'Meter' }, { value: 'd', text: 'Millimeter' }],
    correctAnswer: 'c',
  },
  {
    id: 703, level: 'SMP Kelas 7', subject: 'Bahasa Indonesia',
    question: 'Teks yang menggambarkan suatu objek secara rinci sehingga pembaca seolah-olah melihat sendiri disebut teks:',
    options: [{ value: 'a', text: 'Narasi' }, { value: 'b', text: 'Eksposisi' }, { value: 'c', text: 'Deskripsi' }, { value: 'd', text: 'Argumentasi' }],
    correctAnswer: 'c',
  },
  {
    id: 704, level: 'SMP Kelas 7', subject: 'Bahasa Inggris',
    question: 'What is the plural form of "child"?',
    options: [{ value: 'a', text: 'Childs' }, { value: 'b', text: 'Childen' }, { value: 'c', text: 'Children' }, { value: 'd', text: 'Childes' }],
    correctAnswer: 'c',
  },
  {
    id: 705, level: 'SMP Kelas 7', subject: 'IPS',
    question: 'Benua terbesar di dunia adalah:',
    options: [{ value: 'a', text: 'Afrika' }, { value: 'b', text: 'Amerika' }, { value: 'c', text: 'Asia' }, { value: 'd', text: 'Eropa' }],
    correctAnswer: 'c',
  },
  // ===========================
  // SMP KELAS 8 — Matematika, IPA, Bahasa Indonesia
  // ===========================
  {
    id: 801, level: 'SMP Kelas 8', subject: 'Matematika',
    question: 'Gradien garis 2y = 4x + 6 adalah:',
    options: [{ value: 'a', text: '1' }, { value: 'b', text: '2' }, { value: 'c', text: '3' }, { value: 'd', text: '4' }],
    correctAnswer: 'b',
  },
  {
    id: 802, level: 'SMP Kelas 8', subject: 'IPA (Fisika)',
    question: 'Tekanan = Gaya / Luas. Jika gaya 100 N dan luas 2 m², tekanannya adalah:',
    options: [{ value: 'a', text: '25 Pa' }, { value: 'b', text: '50 Pa' }, { value: 'c', text: '100 Pa' }, { value: 'd', text: '200 Pa' }],
    correctAnswer: 'b',
  },
  {
    id: 803, level: 'SMP Kelas 8', subject: 'IPA (Biologi)',
    question: 'Organel sel yang berfungsi sebagai "pembangkit energi" adalah:',
    options: [{ value: 'a', text: 'Ribosom' }, { value: 'b', text: 'Nukleus' }, { value: 'c', text: 'Mitokondria' }, { value: 'd', text: 'Vakuola' }],
    correctAnswer: 'c',
  },
  {
    id: 804, level: 'SMP Kelas 8', subject: 'Bahasa Indonesia',
    question: 'Majas yang membandingkan dua hal berbeda menggunakan kata "seperti" atau "bagaikan" disebut:',
    options: [{ value: 'a', text: 'Metafora' }, { value: 'b', text: 'Simile' }, { value: 'c', text: 'Personifikasi' }, { value: 'd', text: 'Hiperbola' }],
    correctAnswer: 'b',
  },
  {
    id: 805, level: 'SMP Kelas 8', subject: 'Bahasa Inggris',
    question: 'Choose the correct passive voice: "The cake ___ by my mother yesterday."',
    options: [{ value: 'a', text: 'is baked' }, { value: 'b', text: 'was baked' }, { value: 'c', text: 'baked' }, { value: 'd', text: 'has baked' }],
    correctAnswer: 'b',
  },
  // ===========================
  // SMP KELAS 9 — Matematika, IPA, IPS, Bahasa Inggris
  // ===========================
  {
    id: 901, level: 'SMP Kelas 9', subject: 'Matematika',
    question: 'Nilai dari √144 + √25 adalah:',
    options: [{ value: 'a', text: '16' }, { value: 'b', text: '17' }, { value: 'c', text: '18' }, { value: 'd', text: '19' }],
    correctAnswer: 'b',
  },
  {
    id: 902, level: 'SMP Kelas 9', subject: 'IPA (Kimia)',
    question: 'Unsur dengan lambang "Fe" pada tabel periodik adalah:',
    options: [{ value: 'a', text: 'Fluor' }, { value: 'b', text: 'Fosfor' }, { value: 'c', text: 'Besi' }, { value: 'd', text: 'Timbal' }],
    correctAnswer: 'c',
  },
  {
    id: 903, level: 'SMP Kelas 9', subject: 'IPS',
    question: 'Peristiwa yang menandai runtuhnya Uni Soviet terjadi pada tahun:',
    options: [{ value: 'a', text: '1989' }, { value: 'b', text: '1990' }, { value: 'c', text: '1991' }, { value: 'd', text: '1992' }],
    correctAnswer: 'c',
  },
  {
    id: 904, level: 'SMP Kelas 9', subject: 'Bahasa Inggris',
    question: '"She has been studying for three hours." This sentence uses the tense:',
    options: [{ value: 'a', text: 'Present Perfect' }, { value: 'b', text: 'Past Perfect Continuous' }, { value: 'c', text: 'Present Perfect Continuous' }, { value: 'd', text: 'Simple Past' }],
    correctAnswer: 'c',
  },
  {
    id: 905, level: 'SMP Kelas 9', subject: 'IPA (Fisika)',
    question: 'Percepatan gravitasi bumi adalah sekitar:',
    options: [{ value: 'a', text: '8 m/s²' }, { value: 'b', text: '9 m/s²' }, { value: 'c', text: '10 m/s²' }, { value: 'd', text: '11 m/s²' }],
    correctAnswer: 'c',
  },
  // ===========================
  // SMA KELAS 10 — Matematika, Fisika, Kimia, Biologi
  // ===========================
  {
    id: 1001, level: 'SMA Kelas 10', subject: 'Matematika',
    question: 'Himpunan penyelesaian dari |2x - 4| = 6 adalah:',
    options: [{ value: 'a', text: '{5, -1}' }, { value: 'b', text: '{5, 1}' }, { value: 'c', text: '{-5, 1}' }, { value: 'd', text: '{-5, -1}' }],
    correctAnswer: 'a',
  },
  {
    id: 1002, level: 'SMA Kelas 10', subject: 'Fisika',
    question: 'Dua vektor A = 3 dan B = 4 tegak lurus. Besar resultan vektor A + B adalah:',
    options: [{ value: 'a', text: '4' }, { value: 'b', text: '5' }, { value: 'c', text: '6' }, { value: 'd', text: '7' }],
    correctAnswer: 'b',
  },
  {
    id: 1003, level: 'SMA Kelas 10', subject: 'Kimia',
    question: 'Nomor atom Karbon (C) adalah:',
    options: [{ value: 'a', text: '4' }, { value: 'b', text: '6' }, { value: 'c', text: '8' }, { value: 'd', text: '12' }],
    correctAnswer: 'b',
  },
  {
    id: 1004, level: 'SMA Kelas 10', subject: 'Biologi',
    question: 'Proses pembelahan sel yang menghasilkan dua sel anak identik disebut:',
    options: [{ value: 'a', text: 'Meiosis' }, { value: 'b', text: 'Mitosis' }, { value: 'c', text: 'Amitosis' }, { value: 'd', text: 'Fertilisasi' }],
    correctAnswer: 'b',
  },
  {
    id: 1005, level: 'SMA Kelas 10', subject: 'Bahasa Indonesia',
    question: 'Teks yang berisi ajakan atau persuasi kepada pembaca untuk melakukan sesuatu disebut:',
    options: [{ value: 'a', text: 'Teks narasi' }, { value: 'b', text: 'Teks anekdot' }, { value: 'c', text: 'Teks prosedur' }, { value: 'd', text: 'Teks persuasi' }],
    correctAnswer: 'd',
  },
  // ===========================
  // SMA KELAS 11 — Matematika, Fisika, Kimia, Biologi
  // ===========================
  {
    id: 1101, level: 'SMA Kelas 11', subject: 'Matematika',
    question: 'Turunan dari f(x) = 3x³ - 2x² + 5x - 7 adalah:',
    options: [
      { value: 'a', text: '9x² - 4x + 5' },
      { value: 'b', text: '3x² - 2x + 5' },
      { value: 'c', text: '9x² - 2x + 5' },
      { value: 'd', text: '3x³ - 4x + 5' },
    ],
    correctAnswer: 'a',
  },
  {
    id: 1102, level: 'SMA Kelas 11', subject: 'Fisika',
    question: 'Sebuah benda bermassa 2 kg bergerak melingkar beraturan dengan jari-jari 3 m dan kecepatan 6 m/s. Gaya sentripetalnya adalah:',
    options: [{ value: 'a', text: '12 N' }, { value: 'b', text: '18 N' }, { value: 'c', text: '24 N' }, { value: 'd', text: '36 N' }],
    correctAnswer: 'c',
  },
  {
    id: 1103, level: 'SMA Kelas 11', subject: 'Kimia',
    question: 'Persamaan laju reaksi r = k[A][B]². Jika konsentrasi B dinaikkan 2×, laju reaksi menjadi:',
    options: [{ value: 'a', text: '2× lebih cepat' }, { value: 'b', text: '3× lebih cepat' }, { value: 'c', text: '4× lebih cepat' }, { value: 'd', text: '8× lebih cepat' }],
    correctAnswer: 'c',
  },
  {
    id: 1104, level: 'SMA Kelas 11', subject: 'Biologi',
    question: 'Enzim yang berperan dalam replikasi DNA adalah:',
    options: [{ value: 'a', text: 'RNA polimerase' }, { value: 'b', text: 'DNA polimerase' }, { value: 'c', text: 'Ligase' }, { value: 'd', text: 'Helikase' }],
    correctAnswer: 'b',
  },
  {
    id: 1105, level: 'SMA Kelas 11', subject: 'Ekonomi',
    question: 'Kegiatan ekonomi yang menghasilkan atau menambah nilai guna barang disebut:',
    options: [{ value: 'a', text: 'Distribusi' }, { value: 'b', text: 'Konsumsi' }, { value: 'c', text: 'Produksi' }, { value: 'd', text: 'Investasi' }],
    correctAnswer: 'c',
  },
  // ===========================
  // SMA KELAS 12 — Matematika, Fisika, Kimia, Biologi, Bahasa Inggris
  // ===========================
  {
    id: 1201, level: 'SMA Kelas 12', subject: 'Matematika',
    question: 'Integral dari ∫(4x³ - 6x + 2) dx adalah:',
    options: [
      { value: 'a', text: 'x⁴ - 3x² + 2x + C' },
      { value: 'b', text: '4x⁴ - 3x² + 2x + C' },
      { value: 'c', text: '12x² - 6 + C' },
      { value: 'd', text: 'x⁴ - 6x² + 2x + C' },
    ],
    correctAnswer: 'a',
  },
  {
    id: 1202, level: 'SMA Kelas 12', subject: 'Fisika',
    question: 'Energi yang tersimpan pada kapasitor dengan kapasitansi 4 F dan tegangan 3 V adalah:',
    options: [{ value: 'a', text: '6 J' }, { value: 'b', text: '12 J' }, { value: 'c', text: '18 J' }, { value: 'd', text: '24 J' }],
    correctAnswer: 'c',
  },
  {
    id: 1203, level: 'SMA Kelas 12', subject: 'Kimia',
    question: 'pH larutan dengan [H⁺] = 10⁻³ M adalah:',
    options: [{ value: 'a', text: '2' }, { value: 'b', text: '3' }, { value: 'c', text: '4' }, { value: 'd', text: '11' }],
    correctAnswer: 'b',
  },
  {
    id: 1204, level: 'SMA Kelas 12', subject: 'Biologi',
    question: 'Hukum Mendel II (Hukum Pemisahan Bebas) berlaku untuk gen yang terletak:',
    options: [
      { value: 'a', text: 'Pada kromosom yang sama' },
      { value: 'b', text: 'Pada kromosom yang berbeda' },
      { value: 'c', text: 'Pada kromosom X saja' },
      { value: 'd', text: 'Dalam sitoplasma' },
    ],
    correctAnswer: 'b',
  },
  {
    id: 1205, level: 'SMA Kelas 12', subject: 'Bahasa Inggris',
    question: '"If I had studied harder, I ___ the exam." Fill in the blank:',
    options: [
      { value: 'a', text: 'would pass' },
      { value: 'b', text: 'will have passed' },
      { value: 'c', text: 'would have passed' },
      { value: 'd', text: 'had passed' },
    ],
    correctAnswer: 'c',
  },
  {
    id: 1206, level: 'SMA Kelas 12', subject: 'Sejarah',
    question: 'Konferensi Asia-Afrika yang menghasilkan Dasasila Bandung berlangsung pada tahun:',
    options: [{ value: 'a', text: '1950' }, { value: 'b', text: '1953' }, { value: 'c', text: '1955' }, { value: 'd', text: '1960' }],
    correctAnswer: 'c',
  },
]

const LEVELS = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
]

function getQuestionsForLevel(level: string): Question[] {
  const forLevel = QUESTION_BANK.filter(q => q.level === level)
  if (forLevel.length === 0) return QUESTION_BANK.slice(0, 10)
  return forLevel.slice(0, 10)
}


export default function AcademicTestPage() {
  const router = useRouter()
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(40 * 60)
  const [timerActive, setTimerActive] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const handleSubmitRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!timerActive) return
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timerActive])

  const handleStartTest = async (level: string) => {
    setSelectedLevel(level)
    setLoadingQuestions(true)
    setAnswers({})
    setCurrentQuestion(0)
    setTimeRemaining(40 * 60)

    let qs: Question[] = []
    try {
      const res = await fetch('/api/ai/academic-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, count: 10 }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.questions) && data.questions.length >= 5) {
          qs = data.questions
        }
      }
    } catch {
      // fall through to static questions
    }

    if (qs.length === 0) {
      qs = getQuestionsForLevel(level)
    }

    setQuestions(qs)
    setLoadingQuestions(false)
    setTimerActive(true)
  }

  const handleAnswerChange = (value: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value })
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) correct++
    })
    return questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
  }

  const handleSubmit = async () => {
    setTimerActive(false)
    setLoading(true)
    const finalScore = calculateScore()
    setScore(finalScore)
    setSubmitted(true)

    try {
      const response = await fetch('/api/assessments/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          score: finalScore,
          level: selectedLevel,
          timeTaken: 40 * 60 - timeRemaining,
        }),
      })

      if (response.ok) {
        setTimeout(() => {
          router.push('/curation/progress')
        }, 2500)
      }
    } catch (error) {
      console.error('Error submitting academic test:', error)
    } finally {
      setLoading(false)
    }
  }

  // Keep the ref in sync so the timer always calls the latest version
  handleSubmitRef.current = handleSubmit

  // ── Loading questions screen ──────────────────────────────────────────
  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Mempersiapkan soal {selectedLevel} dengan AI...</p>
        </div>
      </div>
    )
  }

  // ── Level selector ──────────────────────────────────────────────────
  if (!selectedLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Tes Kemampuan Akademik</h1>
            <p className="text-muted-foreground">
              Pilih jenjang kelas yang ingin Anda uji. Soal mencakup berbagai mata pelajaran
              dari <strong>SD Kelas 1</strong> hingga <strong>SMA Kelas 12</strong> (Kurikulum Merdeka / K-13).
            </p>
          </div>

          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              <strong>Sumber bank soal:</strong> Soal-soal bersumber dari kurikulum Kemendikbud dan
              referensi open-source seperti{' '}
              <a href="https://github.com/soallatihan/soallatihan.github.io" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                soallatihan/soallatihan.github.io
              </a>{' '}
              dan{' '}
              <a href="https://github.com/wahyuuuwid/sinau-bareng" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                wahyuuuwid/sinau-bareng
              </a>
              .
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEVELS.map((level) => {
              const count = QUESTION_BANK.filter(q => q.level === level).length
              const displayCount = Math.min(count, 10)
              const isSD = level.startsWith('SD')
              const isSMP = level.startsWith('SMP')
              const isSMA = level.startsWith('SMA')
              return (
                <Card
                  key={level}
                  className="p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => handleStartTest(level)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">
                      {isSD ? '📖' : isSMP ? '📘' : '🎓'}
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">{level}</h3>
                      <p className="text-xs text-muted-foreground">{displayCount} soal tersedia</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...new Set(QUESTION_BANK.filter(q => q.level === level).map(q => q.subject))].map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <Button size="sm" className="w-full mt-3 bg-primary hover:bg-primary/90">
                    Mulai Tes
                  </Button>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Result screen ──────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Hasil Tes Kemampuan Akademik</h2>
          <p className="text-muted-foreground mb-6">{selectedLevel}</p>
          <div className="my-6">
            <div className="text-6xl font-bold text-primary mb-4">{score}</div>
            <p className="text-xl text-muted-foreground mb-6">Skor Anda dari 100</p>
            {score >= 70 ? (
              <Alert className="bg-green-50 border-green-200 mb-6">
                <AlertDescription className="text-green-800">
                  Selamat! Anda lulus tes kemampuan akademik. Mari lanjut ke bagian selanjutnya.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-200 mb-6">
                <AlertDescription className="text-yellow-800">
                  Skor Anda belum memenuhi standar minimum (70). Silakan coba lagi.
                </AlertDescription>
              </Alert>
            )}
          </div>
          {loading && <Spinner className="mx-auto" />}
          {!loading && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedLevel(null)
                setSubmitted(false)
                setAnswers({})
                setCurrentQuestion(0)
              }}
            >
              Pilih Level Lain
            </Button>
          )}
        </Card>
      </div>
    )
  }

  // ── Quiz screen ────────────────────────────────────────────────────
  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tes Kemampuan Akademik</h1>
              <p className="text-sm text-muted-foreground">{selectedLevel}</p>
            </div>
            <div className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-red-500' : 'text-primary'}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Pertanyaan {currentQuestion + 1} dari {questions.length}
          </p>
        </div>

        <Card className="p-8 mb-8">
          <div className="mb-4 flex gap-2">
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
              {question.level}
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {question.subject}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-6">{question.question}</h2>

          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={handleAnswerChange}
          >
            <div className="space-y-3">
              {question.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={`opt-${option.value}`} />
                  <Label htmlFor={`opt-${option.value}`} className="cursor-pointer flex-1">
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </Card>

        <div className="flex justify-between gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            variant="outline"
          >
            Sebelumnya
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              className="bg-secondary hover:bg-secondary/90"
              disabled={loading}
            >
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Selesai & Submit
            </Button>
          ) : (
            <Button onClick={handleNext} className="bg-secondary hover:bg-secondary/90">
              Selanjutnya
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
