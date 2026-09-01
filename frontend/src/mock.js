// Mock data for the AUTIGAZE e-course platform.
// All content here is MOCK data used to build a functional frontend teaser.

import makasihImage from "./assets/Makasih.png";
import logoImage from "./assets/logo.png";
import eyeVideo from "./assets/eye.mp4";
import bgsekolah from "./assets/bgschool.webp";
import balloonImage from "./assets/soorajh-balloon-9292407.png";
import papantulis from "./assets/papantulis.jpg";

export const ASSETS = {
  sticker: makasihImage,
  logo: logoImage,
  eyeVideo,
  balloon: balloonImage,
  bgsekolah,
  papantulis,
};

// Free-to-use Unsplash photos for the "Alat Tulis" (writing tools) visual novel quiz.
const ALAT_TULIS_IMAGES = {
  pensil: "https://images.unsplash.com/photo-1667687435942-4fdff73a3ed6?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  penghapus: "https://images.unsplash.com/photo-1667532447990-51c6704ef358?q=80&w=580&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  pulpen: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
};

// Learning streak (mock)
export const STREAK = {
  days: 23,
  week: [true, true, true, true, true, true, true],
};

// Learning module color cards on the Home page (link to course categories)
export const HOME_MODULES = [
  { id: "hm-1", title: "Visual", color: "#eb8f8f", desc: "Belajar dengan gambar", categoryId: "visual" },
  { id: "hm-2", title: "Emosi", color: "#f0dd93", desc: "Mengenal perasaan", categoryId: "emosi" },
  { id: "hm-3", title: "Motorik", color: "#8fce9a", desc: "Latihan gerak tubuh", categoryId: "motorik" },
  { id: "hm-4", title: "AI Companion", color: "#9b8fd1", desc: "Tanya AI tentang belajar", categoryId: null, route: "/companion" },
];

// Master list of courses (mock)
export const COURSES = [
  {
    id: "c-alfabet",
    title: "Ayo belajar Alfabet!",
    image:
      "https://images.unsplash.com/photo-1539632346654-dd4c3cffad8c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxraWRzJTIwYWxwaGFiZXR8ZW58MHx8fHwxNzg3MDcwNzU4fDA&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "c-berhitung",
    title: "Ayo Belajar Berhitung",
    image:
      "https://images.pexels.com/photos/1329297/pexels-photo-1329297.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    id: "c-hewan",
    title: "Mari Mengenal nama-nama Hewan",
    image:
      "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwxfHx6b298ZW58MHx8fHwxNzg3MDcwNzg2fDA&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "c-buah",
    title: "Mari Mengenal nama-nama Buah!",
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxjb2xvcmZ1bCUyMGZydWl0c3xlbnwwfHx8fDE3ODcwNzA4MTF8MA&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "c-alattulis",
    title: "Mari Mengenal nama-nama Alat Tulis!",
    image:
      "https://images.unsplash.com/photo-1501349800519-48093d60bde0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHw0fHxzY2hvb2wlMjBzdXBwbGllc3xlbnwwfHx8fDE3ODcwNzA3NTd8MA&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "c-keluarga",
    title: "Ayo mengenal nama-nama anggota keluarga",
    image:
      "https://images.unsplash.com/photo-1588979355313-6711a095465f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGZhbWlseXxlbnwwfHx8fDE3ODcwNzA4MzR8MA&ixlib=rb-4.1.0&q=85",
  },
  { id: "c-emosi", title: "Belajar Mengenal Emosi", image: null },
  { id: "e-sapa-perasaan", title: "Mengenal Perasaan Sehari-hari", image: null },
  { id: "e-ekspresi", title: "Mengenal Ekspresi Wajah", image: null },
  { id: "e-emosi-diri", title: "Memahami Perasaan Diri", image: null },
  { id: "e-emosi-teman", title: "Memahami Perasaan Teman", image: null },
  { id: "e-tenang", title: "Latihan Menenangkan Diri", image: null },
  { id: "c-motorik", title: "Latihan Motorik", image: null },
  { id: "m-koordinasi", title: "Latihan Koordinasi Tubuh", image: null },
  { id: "m-gerak-dasar", title: "Gerak Dasar", image: null },
  { id: "m-keseimbangan", title: "Latihan Keseimbangan", image: null },
  { id: "m-tangan", title: "Keterampilan Tangan", image: null },
  { id: "m-aktivitas", title: "Aktivitas Motorik Harian", image: null },
];

// Course categories shown on the Course page. Each references courses by id.
export const COURSE_CATEGORIES = [
  { id: "visual", title: "Pembelajaran Visual", courseIds: ["c-alfabet", "c-berhitung", "c-hewan", "c-buah", "c-alattulis", "c-keluarga"] },
  { id: "emosi", title: "Pembelajaran Emosi", courseIds: ["c-emosi", "e-sapa-perasaan", "e-ekspresi", "e-emosi-diri", "e-emosi-teman", "e-tenang"] },
  { id: "motorik", title: "Pembelajaran Motorik", courseIds: ["c-motorik", "m-koordinasi", "m-gerak-dasar", "m-keseimbangan", "m-tangan", "m-aktivitas"] },
];

export const getCoursesByIds = (ids) =>
  ids.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);

// Berita / news items (mock)
export const NEWS = [
  {
    id: "n-1",
    title: "Gejala dan Diagnosa anak Autism",
    tag: "Kesehatan",
    source: "AutiGaze Health",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders",
    image:
      "https://images.unsplash.com/photo-1776057441567-ac16f7b9dd6f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHxhdXRpc20lMjBhd2FyZW5lc3MlMjBjaGlsZHxlbnwwfHx8fDE3ODcwNjQ2Nzh8MA&ixlib=rb-4.1.0&q=85",
    excerpt:
      "Mengenali tanda-tanda awal autisme pada anak dan langkah diagnosa yang tepat bersama ahli.",
    content:
      "Autisme (Autism Spectrum Disorder) adalah kondisi perkembangan saraf yang memengaruhi cara seseorang berkomunikasi, berinteraksi, dan berperilaku. Tanda-tanda awal biasanya mulai terlihat sebelum usia tiga tahun, seperti keterlambatan bicara, minimnya kontak mata, serta pola bermain yang berulang.\n\nDiagnosa dini sangat penting karena membuka peluang intervensi lebih awal. Orang tua disarankan mengamati perkembangan anak dan berkonsultasi dengan dokter anak atau psikolog perkembangan bila menemukan tanda yang mengkhawatirkan. Dengan dukungan yang tepat, anak dapat berkembang sesuai potensinya.",
  },
  {
    id: "n-2",
    title: "Cara Berkomunikasi Dengan Anak Autism",
    tag: "Parenting",
    source: "AutiGaze Parenting",
    sourceUrl: "https://www.autismspeaks.org/communication",
    image:
      "https://images.pexels.com/photos/6297609/pexels-photo-6297609.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    excerpt:
      "Tips praktis membangun komunikasi hangat dan penuh empati dengan anak penyandang autisme.",
    content:
      "Berkomunikasi dengan anak autis membutuhkan kesabaran dan pendekatan yang konsisten. Gunakan kalimat singkat dan jelas, beri jeda waktu agar anak dapat memproses informasi, serta manfaatkan bantuan visual seperti gambar atau kartu.\n\nHindari kalimat yang terlalu abstrak dan fokuslah pada rutinitas yang dapat diprediksi. Pujilah setiap usaha komunikasi yang anak lakukan, sekecil apa pun, untuk membangun rasa percaya diri dan koneksi emosional yang kuat.",
  },
  {
    id: "n-3",
    title: "Tokoh Sukses Dunia yang memiliki Autism",
    tag: "Inspirasi",
    source: "AutiGaze Stories",
    sourceUrl: "https://www.autism.org.uk/",
    image:
      "https://images.pexels.com/photos/8385977/pexels-photo-8385977.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    excerpt:
      "Kisah inspiratif tokoh dunia yang membuktikan bahwa autisme bukan penghalang untuk sukses.",
    content:
      "Banyak tokoh dunia yang berada di spektrum autisme namun berhasil memberikan kontribusi luar biasa di bidangnya masing-masing. Mereka membuktikan bahwa cara berpikir yang berbeda justru bisa menjadi kekuatan besar.\n\nKisah-kisah ini mengingatkan kita bahwa setiap individu memiliki potensi unik. Dengan lingkungan yang mendukung dan penerimaan dari masyarakat, penyandang autisme dapat meraih pencapaian yang menginspirasi banyak orang.",
  },
  {
    id: "n-4",
    title: "Kisah Asho Pengidap Autisme Yang Menaklukan Marathon 42 Km",
    tag: "Olahraga",
    source: "AutiGaze Sports",
    sourceUrl: "https://www.autismspeaks.org/",
    image:
      "https://images.pexels.com/photos/29840338/pexels-photo-29840338.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    excerpt:
      "Perjuangan luar biasa Asho menyelesaikan lari marathon penuh 42 kilometer.",
    content:
      "Asho, seorang pemuda penyandang autisme, membuktikan bahwa keterbatasan bukanlah penghalang untuk mengejar mimpi. Melalui latihan yang tekun dan dukungan penuh dari keluarga, ia berhasil menyelesaikan lari marathon sejauh 42 kilometer.\n\nPerjalanan Asho menjadi simbol semangat pantang menyerah. Rutinitas latihan yang terstruktur ternyata sangat membantunya menjaga fokus dan disiplin, dua hal yang menjadi kunci keberhasilannya di garis finis.",
  },
  {
    id: "n-5",
    title: "Albert Einstein Ilmuan pengidap Autisme",
    tag: "Sains",
    source: "AutiGaze Science",
    sourceUrl: "https://www.autism.org.uk/",
    image:
      "https://images.pexels.com/photos/8439003/pexels-photo-8439003.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    excerpt:
      "Menelusuri jejak sang jenius fisika yang diyakini memiliki ciri-ciri spektrum autisme.",
    content:
      "Sejumlah peneliti meyakini bahwa Albert Einstein menunjukkan sejumlah karakteristik yang berkaitan dengan spektrum autisme, seperti fokus mendalam pada satu bidang dan cara bersosialisasi yang khas semasa kecil.\n\nTerlepas dari itu, kejeniusannya dalam fisika mengubah pemahaman manusia tentang alam semesta. Kisahnya menjadi pengingat bahwa cara berpikir yang berbeda dapat melahirkan penemuan yang mengubah dunia.",
  },
  {
    id: "n-6",
    title: "Bill Gates Miliarder dengan gejala Autisme",
    tag: "Teknologi",
    source: "AutiGaze Tech",
    sourceUrl: "https://www.autismspeaks.org/",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwyfHxidXNpbmVzc21hbiUyMHN1aXR8ZW58MHx8fHwxNzg3MDY0NzQwfDA&ixlib=rb-4.1.0&q=85",
    excerpt:
      "Sisi lain sang pendiri Microsoft dan kaitannya dengan karakteristik spektrum autisme.",
    content:
      "Pendiri Microsoft ini sering dikaitkan dengan sejumlah ciri spektrum autisme, termasuk kegemarannya pada detail, pola pikir analitis, dan konsentrasi yang sangat tinggi terhadap hal yang ia minati.\n\nKarakteristik tersebut justru menjadi pendorong inovasinya di dunia teknologi. Kisahnya menegaskan bahwa keunikan cara berpikir dapat menjadi fondasi kesuksesan besar di era modern.",
  },
];

export const USER = {
  name: "Royan",
};

// Each chapter contains modules. Selecting a module updates the main stage.
export const CHAPTERS = [
  {
    id: "ch-1",
    title: "Sapa Pagi!",
    modules: [
      {
        id: "m-1",
        name: "Menyapa",
        stageTitle: "Motorik: Menyapa Halo!",
        speech: "Haii!!",
        description:
          "Latihan gerak motorik untuk menyapa teman dengan melambaikan tangan dan berkata halo.",
        showBodyEstimation: true,
      },
      {
        id: "m-2",
        name: "Pembahasan pagi Hari",
        stageTitle: "Motorik: Pembahasan Pagi Hari",
        speech: "Selamat pagi!",
        description:
          "Belajar mengungkapkan salam pagi dan menceritakan kegiatan pagi dengan percaya diri.",
        showBodyEstimation: true,
      },
      {
        id: "m-3",
        name: "Sapa Pagi!",
        stageTitle: "Motorik: Sapa Pagi!",
        speech: "Ohayou~",
        description:
          "Mempraktikkan sapaan pagi dengan kontak mata dan senyuman yang ramah.",
        showBodyEstimation: true,
      },
      {
        id: "m-18",
        name: "Cerita Sapa Teman Baru",
        stageTitle: "Visual Novel: Sapa Teman Baru",
        description:
          "Ikuti percakapan interaktif dan ketuk untuk melanjutkan dialog.",
        contentType: "visual_novel",
        materialText: JSON.stringify([
          { speaker: "Luna", text: "Hai! Namaku Luna. Siapa namamu?", animationId: "greeting" },
          { speaker: "Luna", text: "Senang sekali bisa berkenalan denganmu hari ini.", animationId: "talking" },
          { speaker: "[Kamu]", text: "Ayo Sapa Luna dengan melambaikan Tanganmu!", animationId: "greeting", requiresWave: true },
          { speaker: "Luna", text: "Wah kamu hebat!", animationId: "peace", voiceUrl: "/sound/Wahkamuhebat.wav" },
          { speaker: "Luna", text: "Yuk, kita coba sapa teman lain dengan senyum dan kontak mata!", animationId: "peace" },
        ]),
      },
    ],
  },
  {
    id: "ch-2",
    title: "Sapa Pagi!",
    modules: [
      {
        id: "m-4",
        name: "Ekspresi Wajah",
        stageTitle: "Emosi: Ekspresi Wajah Bahagia",
        speech: "Senyum :)",
        description:
          "Mengenali dan meniru ekspresi wajah bahagia untuk komunikasi sosial.",
        showBodyEstimation: true,
      },
      {
        id: "m-5",
        name: "Kontak Mata",
        stageTitle: "Emosi: Melatih Kontak Mata",
        speech: "Lihat aku~",
        description:
          "Latihan menjaga kontak mata saat berbicara dengan teman.",
        showBodyEstimation: true,
      },
    ],
  },
  {
    id: "ch-3",
    title: "Sapa Pagi!",
    modules: [
      {
        id: "m-6",
        name: "Bertepuk Tangan",
        stageTitle: "Motorik: Bertepuk Tangan",
        speech: "Yeay!!",
        description:
          "Melatih koordinasi tangan dengan gerakan bertepuk tangan bersama.",
        showBodyEstimation: true,
      },
      {
        id: "m-7",
        name: "Menunjuk Objek",
        stageTitle: "Motorik: Menunjuk Objek",
        speech: "Itu apa?",
        description:
          "Belajar menunjuk objek untuk menyampaikan keinginan dan rasa ingin tahu.",
        showBodyEstimation: true,
      },
    ],
  },
  {
    id: "ch-4",
    title: "Sapa Pagi!",
    modules: [
      {
        id: "m-8",
        name: "Berpamitan",
        stageTitle: "Motorik: Berpamitan Dadah",
        speech: "Dadah~",
        description:
          "Latihan gerak melambaikan tangan untuk berpamitan dengan sopan.",
        showBodyEstimation: true,
      },
      {
        id: "m-9",
        name: "Mengangguk",
        stageTitle: "Motorik: Mengangguk Setuju",
        speech: "Iya, boleh!",
        description:
          "Mengenal gerakan mengangguk sebagai tanda setuju dalam percakapan.",
        showBodyEstimation: true,
      },
    ],
  },
  {
    id: "ch-12",
    title: "Mengenal Alat Tulis",
    modules: [
      {
        id: "m-19",
        name: "Mengenal Pensil",
        stageTitle: "Visual Novel: Mengenal Pensil",
        description: "Ikuti cerita Luna mengenalkan pensil, lalu jawab kuisnya!",
        contentType: "visual_novel",
        mediaUrl: ASSETS.papantulis,
        materialText: JSON.stringify([
          {
            speaker: "Luna",
            text: "Pensil",
            animationId: "greeting",
            voiceUrl: "/sound/Pensil.wav",
            image: ALAT_TULIS_IMAGES.pensil,
          },
          {
            speaker: "Luna",
            text: "Pensil digunakan untuk menulis dan menggambar. Coretannya bisa dihapus dengan penghapus jika ada yang salah.",
            animationId: "talking",
            image: ALAT_TULIS_IMAGES.pensil,
          },
          {
            speaker: "Luna",
            text: "Sekarang, coba tunjukkan mana gambar Pensil yang tadi kita pelajari!",
            animationId: "thinking",
            quiz: {
              options: [
                { id: "pensil", label: "Pensil", imageUrl: ALAT_TULIS_IMAGES.pensil, correct: true },
                { id: "penghapus", label: "Penghapus", imageUrl: ALAT_TULIS_IMAGES.penghapus, correct: false },
                { id: "pulpen", label: "Pulpen", imageUrl: ALAT_TULIS_IMAGES.pulpen, correct: false },
              ],
            },
          },
          {
            speaker: "Luna",
            text: "Betul sekali, itu Pensil! Kamu hebat mengenali alat tulis.",
            animationId: "peace",
            voiceUrl: "/sound/Wahkamuhebat.wav",
          },
        ]),
      },
    ],
  },
];

export const NAV_ITEMS = ["Home", "Course", "Berita", "Screening"];

// Autism screening data (mock, not a medical diagnosis)
export const GAZE_SCREENING = {
  videoId: "yb5B8f6MTv0", // calming animation for gaze/attention observation
  title: "Screening via Gaze Section",
  description:
    "Anak menonton video pendek sementara sistem mengamati arah pandangan (gaze) dan atensi. Hasil bersifat indikatif.",
};

export const MCHAT_QUESTIONS = [
  { id: 1, text: "Apakah anak menunjuk sesuatu untuk menunjukkan ketertarikan?", risk: "no" },
  { id: 2, text: "Apakah anak menoleh saat namanya dipanggil?", risk: "no" },
  { id: 3, text: "Apakah anak melakukan kontak mata saat berinteraksi?", risk: "no" },
  { id: 4, text: "Apakah anak tersenyum saat Anda tersenyum kepadanya?", risk: "no" },
  { id: 5, text: "Apakah anak menikmati permainan cilukba atau kejar-kejaran?", risk: "no" },
  { id: 6, text: "Apakah anak sering mengulang gerakan tertentu (mengepak, berputar)?", risk: "yes" },
  { id: 7, text: "Apakah anak terlihat sangat sensitif terhadap suara tertentu?", risk: "yes" },
  { id: 8, text: "Apakah anak meniru ekspresi atau tindakan Anda?", risk: "no" },
  { id: 9, text: "Apakah anak menunjukkan mainan kepada Anda untuk berbagi?", risk: "no" },
  { id: 10, text: "Apakah anak lebih suka bermain sendiri dibanding bersama teman?", risk: "yes" },
];

// Interactive learning quizzes per category (mock)
export const QUIZZES = {
  visual: {
    title: "Pembelajaran Visual",
    type: "letter",
    questions: [
      {
        id: "v-q1",
        prompt: "A",
        question: "Huruf Di Atas Merupakan?",
        options: ["A", "C", "B"],
        answer: "A",
      },
      {
        id: "v-q2",
        prompt: "B",
        question: "Huruf Di Atas Merupakan?",
        options: ["D", "B", "P"],
        answer: "B",
      },
      {
        id: "v-q3",
        prompt: "C",
        question: "Huruf Di Atas Merupakan?",
        options: ["G", "O", "C"],
        answer: "C",
      },
      {
        id: "v-q4",
        prompt: "D",
        question: "Huruf Di Atas Merupakan?",
        options: ["D", "B", "O"],
        answer: "D",
      },
    ],
  },
  emosi: {
    title: "Pembelajaran Emosi",
    type: "emotion",
    questions: [
      {
        id: "e-q1",
        prompt: "happy",
        question: "Ekspresi Di Atas Merupakan?",
        options: ["Senang", "Sedih", "Marah"],
        answer: "Senang",
      },
      {
        id: "e-q2",
        prompt: "sad",
        question: "Ekspresi Di Atas Merupakan?",
        options: ["Senang", "Sedih", "Terkejut"],
        answer: "Sedih",
      },
      {
        id: "e-q3",
        prompt: "angry",
        question: "Ekspresi Di Atas Merupakan?",
        options: ["Takut", "Marah", "Senang"],
        answer: "Marah",
      },
      {
        id: "e-q4",
        prompt: "surprised",
        question: "Ekspresi Di Atas Merupakan?",
        options: ["Terkejut", "Sedih", "Marah"],
        answer: "Terkejut",
      },
    ],
  },
};

// Sidebar chapters shown on the quiz page (decorative, matches reference)
export const QUIZ_SIDEBAR = [
  {
    id: "qs-1",
    title: "Sapa Pagi!",
    modules: [
      { id: "qm-1", name: "Menyapa" },
      { id: "qm-2", name: "Pembahasan pagi Hari" },
      { id: "qm-3", name: "Sapa Pagi!" },
    ],
  },
  { id: "qs-2", title: "Sapa Pagi!", modules: [{ id: "qm-4", name: "Latihan 1" }] },
  { id: "qs-3", title: "Sapa Pagi!", modules: [{ id: "qm-5", name: "Latihan 2" }] },
  { id: "qs-4", title: "Sapa Pagi!", modules: [{ id: "qm-6", name: "Latihan 3" }] },
];

// ---- Child profile & progress (mock) ----
export const CHILD = {
  fullName: "Muhammad Rayan Alfahri",
  nickname: "Royan",
  age: 8,
  dob: "12 Maret 2018",
  gender: "Laki-laki",
  bloodType: "O",
  diagnosis: "Autism Spectrum Disorder (Level 1)",
  diagnosisDate: "Januari 2022",
  school: "SLB Harapan Bunda",
  grade: "Kelas 2 SD",
  therapist: "Dr. Anindya Putri, M.Psi",
  hobbies: ["Menggambar", "Bermain puzzle", "Mendengar musik"],
  parentName: "Bapak Ahmad Fahri",
  parentContact: "+62 812-3456-7890",
  address: "Jl. Melati No. 24, Bandung",
  joinDate: "Agustus 2025",
  email: "royan.family@gmail.com",
};

export const PROGRESS = {
  stats: {
    totalMateri: 24,
    selesai: 18,
    rataNilai: 82,
    streak: 19,
  },
  // Weekly learning trend
  weekly: [
    { week: "Mgg 1", fokus: 58, penyelesaian: 30 },
    { week: "Mgg 2", fokus: 64, penyelesaian: 45 },
    { week: "Mgg 3", fokus: 61, penyelesaian: 52 },
    { week: "Mgg 4", fokus: 72, penyelesaian: 66 },
    { week: "Mgg 5", fokus: 75, penyelesaian: 74 },
    { week: "Mgg 6", fokus: 81, penyelesaian: 88 },
  ],
  categoryScores: [
    { name: "Visual", nilai: 88 },
    { name: "Emosi", nilai: 76 },
    { name: "Motorik", nilai: 82 },
    { name: "Sosial", nilai: 79 },
  ],
  focusLevel: 81,
  completedMaterials: [
    { id: "cm-1", title: "Ayo belajar Alfabet!", category: "Visual", score: 90, date: "10 Agu 2026" },
    { id: "cm-2", title: "Ayo Belajar Berhitung", category: "Visual", score: 85, date: "11 Agu 2026" },
    { id: "cm-3", title: "Mengenal Ekspresi Senang", category: "Emosi", score: 78, date: "12 Agu 2026" },
    { id: "cm-4", title: "Mengenal Ekspresi Sedih", category: "Emosi", score: 74, date: "13 Agu 2026" },
    { id: "cm-5", title: "Motorik: Menyapa Halo!", category: "Motorik", score: 88, date: "14 Agu 2026" },
    { id: "cm-6", title: "Mari Mengenal nama-nama Hewan", category: "Visual", score: 92, date: "15 Agu 2026" },
  ],
  ai: {
    focusScore: 81,
    focusLabel: "Fokus Baik & Meningkat",
    focusSummary:
      "Tingkat fokus Royan menunjukkan tren meningkat selama 6 minggu terakhir, dari 58% menjadi 81%. Durasi perhatian paling stabil pada sesi pagi hari dan saat mengerjakan materi visual.",
    developmentSummary:
      "Perkembangan Royan tergolong positif. Kemampuan pengenalan huruf dan angka berkembang pesat, sementara pengenalan emosi masih perlu penguatan bertahap melalui latihan berulang yang menyenangkan.",
    strengths: [
      "Sangat cepat mengenali huruf dan angka",
      "Konsisten menyelesaikan latihan harian (streak 19 hari)",
      "Respon positif terhadap materi visual bergambar",
    ],
    improvements: [
      "Perlu latihan tambahan pada pengenalan emosi",
      "Konsentrasi menurun pada sesi sore, disarankan sesi pagi",
      "Dorong interaksi sosial dua arah lebih sering",
    ],
    recommendations: [
      "Lanjutkan modul Emosi 2-3x per minggu dengan durasi pendek",
      "Beri jeda istirahat setiap 15 menit untuk menjaga fokus",
      "Rayakan setiap pencapaian kecil untuk membangun motivasi",
    ],
  },
};
