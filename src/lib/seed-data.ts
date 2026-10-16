import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { buildTranscriptSegments } from "@/lib/ai-evaluator";

export async function ensureSeeded(forceReset: boolean = false) {
  if (!forceReset) {
    const userCount = await prisma.user.count();
    if (userCount > 0) return { seeded: false };
  } else {
    await prisma.podcast.deleteMany();
    await prisma.hasil.deleteMany();
    await prisma.jawaban.deleteMany();
    await prisma.penugasan.deleteMany();
    await prisma.pertanyaan.deleteMany();
    await prisma.instrumen.deleteMany();
    await prisma.logAktivitas.deleteMany();
    await prisma.user.deleteMany();
  }

  // 1. Seed Pengaturan Default
  for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await prisma.pengaturan.findUnique({ where: { key } });
    if (!existing) {
      await prisma.pengaturan.create({
        data: {
          key,
          value: val,
          isSecret: key.includes("api_key") || key.includes("secret"),
        },
      });
    }
  }

  const adminPass = await bcrypt.hash(
    process.env.ADMIN_DEFAULT_PASSWORD || "admin123",
    10
  );
  const guruPass = await bcrypt.hash("guru123", 10);

  // 2. Buat Akun Admin
  const admin = await prisma.user.create({
    data: {
      nama: "Sensei Administrator",
      email: process.env.ADMIN_DEFAULT_EMAIL || "admin@sekolah.sch.id",
      nip: "198501012010011001",
      passwordHash: adminPass,
      role: "admin",
      nomorWA: "6281200000001",
      mapel: "Manajemen Mutu & Supervisi",
      aktif: true,
      lastLoginAt: new Date(),
    },
  });

  // 3. Buat 4 Akun Guru Contoh
  const guru1 = await prisma.user.create({
    data: {
      nama: "Aulia Rahmawati, S.Pd., Gr.",
      email: "aulia@sekolah.sch.id",
      nip: "199203142019032008",
      passwordHash: guruPass,
      role: "guru",
      nomorWA: "6281234567801",
      mapel: "Informatika & Pemrograman Web",
      aktif: true,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 35),
      badgesJSON: JSON.stringify([
        "Supervisi Pertama Selesai 🌸",
        "Sensei Teladan (Sangat Baik) 🌟",
        "Disiplin Tepat Waktu ⚡",
      ]),
    },
  });

  const guru2 = await prisma.user.create({
    data: {
      nama: "Rizky Pratama Putra, M.Pd.",
      email: "rizky@sekolah.sch.id",
      nip: "199007212018011004",
      passwordHash: guruPass,
      role: "guru",
      nomorWA: "6281234567802",
      mapel: "Matematika Lanjut",
      aktif: true,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      badgesJSON: JSON.stringify([
        "Supervisi Pertama Selesai 🌸",
        "Disiplin Tepat Waktu ⚡",
      ]),
    },
  });

  const guru3 = await prisma.user.create({
    data: {
      nama: "Nadia Kusuma Dewi, S.Pd.",
      email: "nadia@sekolah.sch.id",
      nip: "199511092020122011",
      passwordHash: guruPass,
      role: "guru",
      nomorWA: "6281234567803",
      mapel: "Bahasa Jepang & Sastra",
      aktif: true,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      badgesJSON: JSON.stringify(["Supervisi Pertama Selesai 🌸"]),
    },
  });

  const guru4 = await prisma.user.create({
    data: {
      nama: "Bagas Adi Nugroho, S.Si.",
      email: "bagas@sekolah.sch.id",
      nip: "199305182019031006",
      passwordHash: guruPass,
      role: "guru",
      nomorWA: "6281234567804",
      mapel: "Fisika Eksperimen",
      aktif: true,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      badgesJSON: JSON.stringify(["Supervisi Pertama Selesai 🌸"]),
    },
  });

  // 4. Buat Instrumen 1: Supervisi Akademik Semester Ganjil (Aktif)
  const instrumen1 = await prisma.instrumen.create({
    data: {
      judul: "Instrumen Supervisi Akademik & Pembelajaran Digital 2026",
      deskripsi:
        "Evaluasi komprehensif kesiapan perencanaan modul ajar, pelaksanaan pembelajaran berpusat pada siswa, asesmen autentik, dan integrasi teknologi informasi (IT).",
      versi: 1,
      status: "aktif",
      pertanyaan: {
        create: [
          {
            urutan: 1,
            aspek: "Perencanaan",
            tipe: "skala",
            bobot: 1.5,
            wajib: true,
            teks: "Kelengkapan Modul Ajar / RPP yang memuat tujuan pembelajaran terukur, langkah kegiatan diferensiasi, dan profil pelajar.",
            opsiJSON: JSON.stringify([
              "1 - Belum Tersedia",
              "2 - Kurang Lengkap",
              "3 - Cukup Lengkap",
              "4 - Lengkap & Rapi",
              "5 - Sangat Lengkap, Kontekstual & Inovatif",
            ]),
          },
          {
            urutan: 2,
            aspek: "Perencanaan",
            tipe: "ya_tidak",
            bobot: 1.0,
            wajib: true,
            teks: "Apakah Anda telah menyiapkan bahan ajar digital/lembar kerja (LKPD) sebelum jam pelajaran dimulai?",
            opsiJSON: JSON.stringify(["Ya", "Tidak"]),
          },
          {
            urutan: 3,
            aspek: "Pelaksanaan",
            tipe: "skala",
            bobot: 1.5,
            wajib: true,
            teks: "Kemampuan memantik rasa ingin tahu siswa melalui apersepsi kontekstual dan pertanyaan pemantik di awal kelas.",
            opsiJSON: JSON.stringify([
              "1 - Tidak Dilakukan",
              "2 - Kurang Menarik",
              "3 - Cukup Menarik",
              "4 - Menarik & Interaktif",
              "5 - Sangat Inspiratif & Antusias",
            ]),
          },
          {
            urutan: 4,
            aspek: "Pelaksanaan",
            tipe: "pilihan_ganda",
            bobot: 1.3,
            wajib: true,
            teks: "Model interaksi pembelajaran apa yang paling dominan Anda terapkan selama kegiatan inti berlangsung?",
            opsiJSON: JSON.stringify([
              "Project/Problem-Based Learning kolaboratif dengan diskusi aktif kelompok",
              "Diskusi terarah disertai tanya jawab dan demonstrasi",
              "Ceramah interaktif dengan latihan soal mandiri",
              "Ceramah satu arah dan pencatatan materi",
            ]),
          },
          {
            urutan: 5,
            aspek: "Penguasaan IT",
            tipe: "skala",
            bobot: 1.5,
            wajib: true,
            teks: "Pemanfaatan media pembelajaran berbasis IT (LMS, simulasi interaktif, kuis digital, atau AI edukasi) secara efektif di kelas.",
            opsiJSON: JSON.stringify([
              "1 - Tidak Menggunakan IT",
              "2 - Hanya Slide Teks Statis",
              "3 - Multimedia & Video",
              "4 - Kuis Digital & LMS Aktif",
              "5 - Ekosistem IT Interaktif, Simulasi & Adaptif",
            ]),
          },
          {
            urutan: 6,
            aspek: "Penguasaan IT",
            tipe: "isian_singkat",
            bobot: 1.0,
            wajib: true,
            teks: "Sebutkan aplikasi/platform teknologi utama yang Anda gunakan dalam pembelajaran minggu ini!",
            opsiJSON: JSON.stringify([]),
          },
          {
            urutan: 7,
            aspek: "Evaluasi",
            tipe: "skala",
            bobot: 1.4,
            wajib: true,
            teks: "Pelaksanaan asesmen formatif dan pemberian umpan balik (feedback) konstruktif secara berkala kepada siswa.",
            opsiJSON: JSON.stringify([
              "1 - Belum Ada Asesmen",
              "2 - Jarang Diberi Umpan Balik",
              "3 - Cukup Berkala",
              "4 - Terstruktur & Jelas",
              "5 - Real-time, Personal & Menindaklanjuti Remedial/Pengayaan",
            ]),
          },
          {
            urutan: 8,
            aspek: "Evaluasi",
            tipe: "esai",
            bobot: 1.5,
            wajib: true,
            teks: "Ceritakan refleksi singkat Anda mengenai keberhasilan utama di kelas serta rencana perbaikan untuk pertemuan berikutnya!",
            opsiJSON: JSON.stringify([]),
          },
        ],
      },
    },
    include: { pertanyaan: { orderBy: { urutan: "asc" } } },
  });

  // 5. Buat Instrumen 2: Supervisi Klinis & Inovasi Media IT
  const instrumen2 = await prisma.instrumen.create({
    data: {
      judul: "Instrumen Supervisi Inovasi Media & Kelas Kolaboratif",
      deskripsi:
        "Instrumen evaluasi berkala untuk memantau kreativitas bahan ajar interaktif, manajemen kelas kolaboratif, dan refleksi pasca-mengajar.",
      versi: 1,
      status: "aktif",
      pertanyaan: {
        create: [
          {
            urutan: 1,
            aspek: "Perencanaan",
            tipe: "skala",
            bobot: 1.2,
            wajib: true,
            teks: "Kesesuaian pemilihan media interaktif dengan karakteristik gaya belajar siswa (visual, auditori, kinestetik).",
            opsiJSON: JSON.stringify(["1", "2", "3", "4", "5"]),
          },
          {
            urutan: 2,
            aspek: "Pelaksanaan",
            tipe: "skala",
            bobot: 1.5,
            wajib: true,
            teks: "Pengelolaan manajemen waktu dan antusiasme diskusi siswa selama kerja kelompok.",
            opsiJSON: JSON.stringify(["1", "2", "3", "4", "5"]),
          },
          {
            urutan: 3,
            aspek: "Penguasaan IT",
            tipe: "pilihan_ganda",
            bobot: 1.3,
            wajib: true,
            teks: "Bagaimana cara siswa mengumpulkan dan mempresentasikan karya/tugas di kelas Anda?",
            opsiJSON: JSON.stringify([
              "Portofolio digital terintegrasi & showcase interaktif di kelas",
              "Pengumpulan via Google Classroom / LMS sekolah",
              "Pengumpulan file lewat grup pesan",
              "Pengumpulan kertas manual",
            ]),
          },
          {
            urutan: 4,
            aspek: "Evaluasi",
            tipe: "esai",
            bobot: 1.5,
            wajib: true,
            teks: "Tuliskan inovasi asesmen yang ingin Anda uji cobakan pada bulan depan beserta target peningkatannya.",
            opsiJSON: JSON.stringify([]),
          },
        ],
      },
    },
    include: { pertanyaan: { orderBy: { urutan: "asc" } } },
  });

  // Helper untuk membuat hasil supervisi contoh
  async function createCompletedSupervisi(opts: {
    guru: typeof guru1;
    instrumen: typeof instrumen1;
    daysAgo: number;
    skorAspek: { aspek: string; skor: number; alasan: string }[];
    skorTotal: number;
    predikat: string;
    kesimpulan: string;
    kekuatan: string[];
    saran: string[];
    naskahPodcast: string;
    catatanAdmin?: string;
    sampleAnswers: Record<number, unknown>;
  }) {
    const createdAt = new Date(Date.now() - opts.daysAgo * 24 * 60 * 60 * 1000);
    const tenggat = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);

    const penugasan = await prisma.penugasan.create({
      data: {
        instrumenId: opts.instrumen.id,
        guruId: opts.guru.id,
        tenggat,
        status: "selesai",
        createdAt,
        updatedAt: createdAt,
      },
    });

    for (const q of opts.instrumen.pertanyaan) {
      const val = opts.sampleAnswers[q.urutan] ?? (q.tipe === "skala" ? 5 : "Ya");
      await prisma.jawaban.create({
        data: {
          penugasanId: penugasan.id,
          pertanyaanId: q.id,
          nilaiJSON: JSON.stringify(val),
        },
      });
    }

    const hasil = await prisma.hasil.create({
      data: {
        penugasanId: penugasan.id,
        skorPerAspekJSON: JSON.stringify(opts.skorAspek),
        skorTotal: opts.skorTotal,
        skorAsliAI: opts.skorTotal,
        predikat: opts.predikat,
        kesimpulan: opts.kesimpulan,
        kekuatanJSON: JSON.stringify(opts.kekuatan),
        sarannyaJSON: JSON.stringify(opts.saran),
        catatanAdmin: opts.catatanAdmin || null,
        diubahAdminOleh: opts.catatanAdmin ? "Sensei Administrator" : null,
        diubahAdminPada: opts.catatanAdmin ? createdAt : null,
        status: "selesai",
        tokenUsage: 640,
        createdAt,
        updatedAt: createdAt,
      },
    });

    const { segments, totalDuration } = buildTranscriptSegments(
      opts.naskahPodcast,
      1.0
    );
    await prisma.podcast.create({
      data: {
        hasilId: hasil.id,
        naskah: opts.naskahPodcast,
        transkripSegmenJSON: JSON.stringify(segments),
        durasi: totalDuration,
        karakterTts: opts.naskahPodcast.length,
        status: "gagal",
        errorMessage:
          "Audio belum digenerate via Fish Audio. Silakan isi API Key Fish Audio & Reference Voice ID di Panel Admin, lalu klik tombol Generate via Fish Audio.",
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  // 6. Seed Riwayat & Hasil Supervisi Guru 1 (Aulia) - 2 periode + 1 tugas baru siap diisi
  await createCompletedSupervisi({
    guru: guru1,
    instrumen: instrumen2,
    daysAgo: 21,
    skorTotal: 84,
    predikat: "Baik",
    skorAspek: [
      {
        aspek: "Perencanaan",
        skor: 85,
        alasan: "Pemetaan gaya belajar visual dan kinestetik siswa sudah tertuang rapi dalam rencana kegiatan.",
      },
      {
        aspek: "Pelaksanaan",
        skor: 82,
        alasan: "Diskusi kelompok berjalan kondusif, alokasi waktu presentasi akhir dapat diperketat.",
      },
      {
        aspek: "Penguasaan IT",
        skor: 88,
        alasan: "Penggunaan LMS dan repositori kode interaktif sangat membantu siswa.",
      },
      {
        aspek: "Evaluasi",
        skor: 81,
        alasan: "Rencana asesmen proyek sudah jelas dan terukur.",
      },
    ],
    kesimpulan:
      "Otsukare-sama desu, Aulia-sensei! Pada periode supervisi awal ini, Sensei memperoleh skor 84 (Baik). Penguasaan media IT sudah menonjol dan siap ditingkatkan menuju kolaborasi proyek yang lebih terintegrasi.",
    kekuatan: [
      "Pemanfaatan platform digital yang familier bagi siswa.",
      "Perencanaan diferensiasi media visual dan praktik langsung.",
    ],
    saran: [
      "Tambahkan rubrik penilaian sebaya (peer-assessment) saat sesi presentasi kelompok.",
      "Gunakan timer visual di layar agar transisi diskusi lebih tepat waktu.",
    ],
    naskahPodcast: [
      "Sensei-AI: Ohayou gozaimasu, Aulia-sensei! Selamat datang di rekaman evaluasi supervisi periode pertama bersama Sensei-AI.",
      "Sensei-AI: Pada instrumen Inovasi Media dan Kelas Kolaboratif ini, Sensei berhasil meraih skor 84 dengan predikat Baik. Aspek Penguasaan IT mencapai skor tertinggi yaitu 88 dari 100!",
      "Sensei-AI: Untuk langkah peningkatan berikutnya, mari kita tambahkan fitur peer-assessment dan pengaturan waktu presentasi agar diskusi siswa semakin tajam. Ganbatte kudasai, Sensei!",
    ].join("\n\n"),
    sampleAnswers: {
      1: 4,
      2: 4,
      3: "Portofolio digital terintegrasi & showcase interaktif di kelas",
      4: "Menerapkan live coding review dan peer-assessment berbasis rubrik digital agar siswa saling memberi masukan konstruktif.",
    },
  });

  await createCompletedSupervisi({
    guru: guru1,
    instrumen: instrumen1,
    daysAgo: 3,
    skorTotal: 92,
    predikat: "Sangat Baik",
    skorAspek: [
      {
        aspek: "Perencanaan",
        skor: 94,
        alasan: "Modul ajar disusun sangat komprehensif dengan LKPD interaktif yang siap diakses sebelum kelas.",
      },
      {
        aspek: "Pelaksanaan",
        skor: 90,
        alasan: "Model Project-Based Learning berhasil memicu kolaborasi aktif dan antusiasme tinggi di kelas Informatika.",
      },
      {
        aspek: "Penguasaan IT",
        skor: 96,
        alasan: "Integrasi sandbox koding interaktif, LMS, dan kuis real-time berjalan sangat mulus.",
      },
      {
        aspek: "Evaluasi",
        skor: 88,
        alasan: "Refleksi pembelajaran dan asesmen formatif dilakukan secara real-time dengan tindak lanjut yang jelas.",
      },
    ],
    kesimpulan:
      "Subarashii, Aulia-sensei! ✨ Capaian supervisi akademik Sensei meningkat pesat menjadi 92 (Sangat Baik). Integrasi ekosistem pembelajaran berbasis IT dan metode Project-Based Learning yang Sensei terapkan menjadi teladan praktik baik di sekolah.",
    kekuatan: [
      "Integrasi teknologi pembelajaran interaktif memperoleh skor luar biasa (96/100).",
      "Perencanaan modul ajar dan LKPD digital sangat rapi serta berpusat pada siswa.",
      "Refleksi pasca-mengajar sangat tajam dan berorientasi solusi.",
    ],
    saran: [
      "Bagikan praktik baik penggunaan sandbox interaktif ini dalam forum komunitas belajar guru (MGMP/Kombel).",
      "Kembangkan bank studi kasus bertingkat untuk memfasilitasi siswa yang selesai lebih cepat (fast learners).",
    ],
    catatanAdmin:
      "Apresiasi tinggi untuk Ibu Aulia atas peningkatan skor dari 84 ke 92. Mohon kesediaannya menjadi narasumber berbagi praktik baik IT pada rapat dewan guru bulan depan.",
    naskahPodcast: [
      "Sensei-AI: Ohayou gozaimasu, Aulia-sensei! Senang sekali rasanya Sensei-AI kembali menyapa Anda di ruang podcast supervisi akademik hari ini.",
      "Sensei-AI: Hasil evaluasi terbaru Sensei sungguh membanggakan! Sensei meraih skor total 92 dari 100 dengan predikat Sangat Baik, meningkat 8 poin dibandingkan periode sebelumnya.",
      "Sensei-AI: Keunggulan paling bersinar terlihat pada aspek Penguasaan IT dengan skor 96 dan Perencanaan dengan skor 94. Penggunaan sandbox interaktif dan Project-Based Learning di kelas Informatika berhasil membuat siswa sangat antusias.",
      "Sensei-AI: Sebagai langkah pengayaan, Sensei-AI menyarankan agar inovasi ini dibagikan kepada rekan-rekan guru lainnya, sembari menyiapkan tantangan ekstra bagi siswa fast-learners. Otsukare-sama desu, teruslah bersinar ya, Aulia-sensei!",
    ].join("\n\n"),
    sampleAnswers: {
      1: 5,
      2: "Ya",
      3: 5,
      4: "Project/Problem-Based Learning kolaboratif dengan diskusi aktif kelompok",
      5: 5,
      6: "Google Classroom, GitHub Classroom, Quizizz Interactive, dan Live Sandbox Web",
      7: 4,
      8: "Siswa sangat antusias membangun proyek mini secara berkelompok. Pertemuan berikutnya saya akan menambahkan tantangan bonus bagi kelompok yang selesai lebih cepat.",
    },
  });

  // Berikan 1 Penugasan Aktif (Draft) untuk Guru 1 agar bisa langsung diuji coba klik "Isi Instrumen" & "Submit"
  const activePenugasanGuru1 = await prisma.penugasan.create({
    data: {
      instrumenId: instrumen2.id,
      guruId: guru1.id,
      tenggat: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "draft",
    },
  });

  // Isi sebagian jawaban draft untuk Guru 1
  if (instrumen2.pertanyaan[0]) {
    await prisma.jawaban.create({
      data: {
        penugasanId: activePenugasanGuru1.id,
        pertanyaanId: instrumen2.pertanyaan[0].id,
        nilaiJSON: JSON.stringify(5),
      },
    });
  }

  // 7. Seed Hasil Supervisi Guru 2 (Rizky), Guru 3 (Nadia), Guru 4 (Bagas) untuk Grafik Perbandingan Admin
  await createCompletedSupervisi({
    guru: guru2,
    instrumen: instrumen1,
    daysAgo: 12,
    skorTotal: 85,
    predikat: "Sangat Baik",
    skorAspek: [
      { aspek: "Perencanaan", skor: 88, alasan: "RPP Matematika Lanjut terstruktur dengan pemetaan soal bertingkat." },
      { aspek: "Pelaksanaan", skor: 84, alasan: "Penjelasan konsep sangat jernih dan melibatkan siswa di papan interaktif." },
      { aspek: "Penguasaan IT", skor: 86, alasan: "Visualisasi grafik fungsi dengan GeoGebra sangat membantu pemahaman abstrak." },
      { aspek: "Evaluasi", skor: 82, alasan: "Kuis diagnostik awal dan akhir berjalan tertib." },
    ],
    kesimpulan:
      "Otsukare-sama desu, Rizky-sensei! Pemanfaatan GeoGebra dan struktur latihan bertingkat menghasilkan capaian Sangat Baik (85/100).",
    kekuatan: [
      "Visualisasi konsep matematika abstrak menjadi konkret dengan GeoGebra.",
      "Struktur perencanaan pembelajaran sangat sistematis.",
    ],
    saran: [
      "Perbanyak studi kasus matematika terapan dalam kehidupan sehari-hari.",
    ],
    naskahPodcast: [
      "Sensei-AI: Halo Rizky-sensei! Selamat atas capaian skor 85 dengan predikat Sangat Baik pada supervisi Matematika Lanjut.",
      "Sensei-AI: Penggunaan GeoGebra untuk memvisualisasikan grafik sangat efektif membantu siswa. Mari terus kembangkan soal kontekstual sehari-hari ya, Sensei!",
    ].join("\n\n"),
    sampleAnswers: { 1: 4, 2: "Ya", 3: 4, 4: "Diskusi terarah disertai tanya jawab dan demonstrasi", 5: 4, 6: "GeoGebra & Desmos Classroom", 7: 4, 8: "Visualisasi grafik sangat membantu siswa memahami limit fungsi." },
  });

  await createCompletedSupervisi({
    guru: guru3,
    instrumen: instrumen1,
    daysAgo: 7,
    skorTotal: 89,
    predikat: "Sangat Baik",
    skorAspek: [
      { aspek: "Perencanaan", skor: 90, alasan: "Modul ajar Bahasa Jepang dilengkapi kartu kanji digital dan audio pelafalan." },
      { aspek: "Pelaksanaan", skor: 92, alasan: "Roleplay percakapan siswa berlangsung sangat hidup dan menyenangkan." },
      { aspek: "Penguasaan IT", skor: 87, alasan: "Penggunaan flashcard digital interaktif dan audio native sangat efektif." },
      { aspek: "Evaluasi", skor: 87, alasan: "Asesmen lisan dan tertulis terdokumentasi dengan baik." },
    ],
    kesimpulan:
      "Subarashii, Nadia-sensei! Kelas Bahasa Jepang berlangsung sangat interaktif dengan skor 89 (Sangat Baik).",
    kekuatan: [
      "Metode roleplay membuat seluruh siswa berani berbicara aktif.",
      "Media audio-visual memperkaya pengalaman belajar bahasa asing.",
    ],
    saran: [
      "Integrasikan rekaman suara mandiri siswa sebagai portofolio pelafalan bulanan.",
    ],
    naskahPodcast: [
      "Sensei-AI: Konnichiwa, Nadia-sensei! Evaluasi supervisi kelas Bahasa Jepang Anda meraih skor 89 dengan predikat Sangat Baik.",
      "Sensei-AI: Aspek Pelaksanaan mencapai skor 92 berkat metode roleplay yang seru. Terus pertahankan semangat kreatif ini ya, Sensei!",
    ].join("\n\n"),
    sampleAnswers: { 1: 5, 2: "Ya", 3: 5, 4: "Project/Problem-Based Learning kolaboratif dengan diskusi aktif kelompok", 5: 4, 6: "Anki Deck, Padlet, dan Kahoot", 7: 4, 8: "Roleplay percakapan membuat kelas sangat hidup." },
  });

  await createCompletedSupervisi({
    guru: guru4,
    instrumen: instrumen1,
    daysAgo: 2,
    skorTotal: 77,
    predikat: "Baik",
    skorAspek: [
      { aspek: "Perencanaan", skor: 80, alasan: "Modul praktikum Fisika sudah lengkap dengan prosedur keselamatan kerja." },
      { aspek: "Pelaksanaan", skor: 78, alasan: "Demonstrasi eksperimen menarik, namun waktu diskusi kesimpulan agak singkat." },
      { aspek: "Penguasaan IT", skor: 74, alasan: "Sudah menggunakan simulasi PhET, dapat ditingkatkan dengan pengumpulan data kolaboratif." },
      { aspek: "Evaluasi", skor: 76, alasan: "Laporan praktikum perlu umpan balik tertulis yang lebih cepat." },
    ],
    kesimpulan:
      "Otsukare-sama desu, Bagas-sensei! Capaian supervisi berada pada kategori Baik (77/100) dengan potensi penguatan pada manajemen waktu diskusi dan asesmen digital.",
    kekuatan: [
      "Demonstrasi eksperimen fisika memancing rasa ingin tahu siswa.",
      "Kesiapan prosedur praktikum sudah baik.",
    ],
    saran: [
      "Gunakan spreadsheet kolaboratif saat siswa mencatat data eksperimen agar analisis grafik lebih cepat.",
      "Alokasikan 15 menit terakhir khusus untuk refleksi dan umpan balik hasil praktikum.",
    ],
    naskahPodcast: [
      "Sensei-AI: Ohayou gozaimasu, Bagas-sensei! Terima kasih atas dedikasi Anda di kelas Fisika Eksperimen. Sensei meraih skor 77 dengan predikat Baik.",
      "Sensei-AI: Eksperimen yang Anda bawakan sangat menarik. Untuk pertemuan selanjutnya, mari manfaatkan lembar data kolaboratif agar waktu kesimpulan di akhir kelas lebih optimal. Ganbatte kudasai!",
    ].join("\n\n"),
    sampleAnswers: { 1: 4, 2: "Ya", 3: 4, 4: "Diskusi terarah disertai tanya jawab dan demonstrasi", 5: 3, 6: "Simulasi PhET Colorado", 7: 3, 8: "Praktikum berjalan lancar namun waktu menyimpulkan di akhir kelas perlu ditambah." },
  });

  // 8. Seed Log Aktivitas Awal
  await prisma.logAktivitas.createMany({
    data: [
      {
        userId: admin.id,
        namaUser: admin.nama,
        role: "admin",
        aksi: "INIT_SYSTEM",
        detail: "Inisialisasi sistem Web Agent Supervisor v2 & konfigurasi awal instrumen",
      },
      {
        userId: guru1.id,
        namaUser: guru1.nama,
        role: "guru",
        aksi: "SUBMIT_SUPERVISI",
        detail: "Mengirim jawaban Instrumen Supervisi Akademik & Pembelajaran Digital 2026",
      },
      {
        userId: guru1.id,
        namaUser: guru1.nama,
        role: "guru",
        aksi: "PODCAST_GENERATED",
        detail: "Podcast evaluasi suara Sensei-AI berhasil dibuat (Skor: 92 - Sangat Baik)",
      },
      {
        userId: admin.id,
        namaUser: admin.nama,
        role: "admin",
        aksi: "CATATAN_ADMIN",
        detail: "Memberikan catatan apresiasi supervisor pada hasil evaluasi Aulia Rahmawati, S.Pd., Gr.",
      },
    ],
  });

  return { seeded: true };
}
