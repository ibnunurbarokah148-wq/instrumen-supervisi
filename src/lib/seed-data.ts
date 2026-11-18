import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const SKALA_RUBRIK = [
  "1 - Kurang: indikator tidak terlaksana atau belum ada bukti pendukung",
  "2 - Cukup: indikator terlaksana sebagian atau belum konsisten",
  "3 - Baik: indikator terlaksana sesuai standar dengan sedikit catatan penguatan",
  "4 - Amat Baik: indikator terlaksana seluruhnya, konsisten, inovatif, dan terdokumentasi rapi",
];

export async function ensureSeeded(forceReset: boolean = false) {
  if (!forceReset) {
    const [userCount, kepsekCount, pengawasCount, perangkatCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "kepala_sekolah" } }),
        prisma.user.count({ where: { role: "pengawas" } }),
        prisma.perangkatSupervisi.count(),
      ]);

    // Jika sudah ada 4 role SIPENA dan perangkat sudah ada, tidak perlu re-seed
    if (
      userCount > 0 &&
      kepsekCount > 0 &&
      pengawasCount > 0 &&
      perangkatCount > 0
    ) {
      return { seeded: false };
    }
  }

  await prisma.perangkatSupervisi.deleteMany();
  await prisma.hasil.deleteMany();
  await prisma.jawaban.deleteMany();
  await prisma.penugasan.deleteMany();
  await prisma.pertanyaan.deleteMany();
  await prisma.instrumen.deleteMany();
  await prisma.logAktivitas.deleteMany();
  await prisma.user.deleteMany();

  // Bersihkan pengaturan lama (Fish Audio / Podcast) & isi pengaturan SIPENA default
  await prisma.pengaturan.deleteMany({
    where: {
      OR: [
        { key: { startsWith: "fish_" } },
        { key: "podcast_template_json" },
      ],
    },
  });

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
  const demoPass = await bcrypt.hash("guru123", 10);

  // 1. Admin Sistem
  const admin = await prisma.user.create({
    data: {
      nama: "Administrator Sistem SIPENA",
      email: process.env.ADMIN_DEFAULT_EMAIL || "admin@sekolah.sch.id",
      nip: "198501012010011001",
      passwordHash: adminPass,
      role: "admin",
      jabatan: "Operator & Administrator Sekolah",
      unitKerja: "SDN 01 Menteng",
      nomorWA: "6281200000001",
      mapel: "Tata Usaha & Manajemen Sistem",
      aktif: true,
      lastLoginAt: new Date(),
    },
  });

  // 2. Kepala Sekolah (Supervisor Penilai & Pengesah Laporan)
  const kepsek = await prisma.user.create({
    data: {
      nama: "Dr. Hj. Ratna Kusuma, M.Pd.",
      email: "kepsek@sekolah.sch.id",
      nip: "197204151998022001",
      passwordHash: adminPass,
      role: "kepala_sekolah",
      jabatan: "Kepala Sekolah / Supervisor Utama",
      unitKerja: "SDN 01 Menteng",
      nomorWA: "6281200000002",
      mapel: "Manajemen Supervisi Akademik",
      aktif: true,
      lastLoginAt: new Date(),
    },
  });

  // 3. Pengawas Sekolah Pembina (Peninjau Akhir & Pemberi RTL)
  const pengawas = await prisma.user.create({
    data: {
      nama: "Drs. H. Bambang Sudibyo, M.Pd.",
      email: "pengawas@sekolah.sch.id",
      nip: "196805121993031004",
      passwordHash: adminPass,
      role: "pengawas",
      jabatan: "Pengawas Sekolah Pembina",
      unitKerja: "Dinas Pendidikan Wilayah I",
      nomorWA: "6281200000003",
      mapel: "Pembinaan Mutu & Tindak Lanjut",
      aktif: true,
      lastLoginAt: new Date(),
    },
  });

  // 4. Empat Akun Guru dengan beragam tahap workflow SIPENA
  const guru1 = await prisma.user.create({
    data: {
      nama: "Budi Santoso, S.Pd., M.Pd.",
      email: "budi@sekolah.sch.id",
      nip: "198803142014031002",
      passwordHash: demoPass,
      role: "guru",
      jabatan: "Guru Madya",
      unitKerja: "SDN 01 Menteng",
      nomorWA: "6281234567890",
      mapel: "Matematika",
      aktif: true,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 25),
    },
  });

  const guru2 = await prisma.user.create({
    data: {
      nama: "Siti Aminah, S.Pd.",
      email: "siti@sekolah.sch.id",
      nip: "199107212018012004",
      passwordHash: demoPass,
      role: "guru",
      jabatan: "Guru Muda",
      unitKerja: "SDN 01 Menteng",
      nomorWA: "6281298765432",
      mapel: "Bahasa Indonesia",
      aktif: true,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    },
  });

  const guru3 = await prisma.user.create({
    data: {
      nama: "Ahmad Fauzi, S.Kom.",
      email: "ahmad@sekolah.sch.id",
      nip: "199411092020121011",
      passwordHash: demoPass,
      role: "guru",
      jabatan: "Guru Pertama",
      unitKerja: "SDN 01 Menteng",
      nomorWA: "6281311223344",
      mapel: "Informatika & Koding",
      aktif: true,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
  });

  const guru4 = await prisma.user.create({
    data: {
      nama: "Dewi Lestari, S.Pd.",
      email: "dewi@sekolah.sch.id",
      nip: "199305182019032006",
      passwordHash: demoPass,
      role: "guru",
      jabatan: "Guru Pertama",
      unitKerja: "SDN 01 Menteng",
      nomorWA: "6281355667788",
      mapel: "IPAS & Sains Terpadu",
      aktif: true,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
    },
  });

  // 5. Instrumen 1: 20 Indikator Standar Kurikulum Merdeka (4 Aspek)
  const instrumen1 = await prisma.instrumen.create({
    data: {
      judul:
        "Instrumen Supervisi Akademik Standar Proses (Kurikulum Merdeka)",
      deskripsi:
        "Instrumen observasi pembelajaran terstandar Permendikbudristek No. 16 Tahun 2022 mencakup 4 aspek: Pembukaan Pembelajaran, Kegiatan Inti Berdiferensiasi, Asesmen & Penutup, serta Pemanfaatan TIK.",
      versi: 1,
      status: "aktif",
      pertanyaan: {
        create: [
          {
            urutan: 1,
            aspek: "Pembukaan Pembelajaran",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru membuka pembelajaran dengan salam, doa, serta memeriksa kesiapan fisik dan psikis peserta didik.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 2,
            aspek: "Pembukaan Pembelajaran",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru melakukan apersepsi kontekstual dan memberikan pertanyaan pemantik sesuai pengalaman siswa.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 3,
            aspek: "Pembukaan Pembelajaran",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru menyampaikan tujuan pembelajaran, lingkup materi, dan rencana asesmen secara eksplisit.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 4,
            aspek: "Pembukaan Pembelajaran",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Pelaksanaan skenario awal pembelajaran selaras dengan Modul Ajar/RPP yang telah diverifikasi.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 5,
            aspek: "Kegiatan Inti",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru menguasai materi secara mendalam, terstruktur, dan bebas dari miskonsepsi keilmuan.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 6,
            aspek: "Kegiatan Inti",
            tipe: "skala",
            bobot: 1.2,
            wajib: true,
            teks: "Guru menerapkan pembelajaran berdiferensiasi (konten, proses, atau produk) sesuai kesiapan belajar siswa.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 7,
            aspek: "Kegiatan Inti",
            tipe: "skala",
            bobot: 1.2,
            wajib: true,
            teks: "Guru menggunakan model aktif (PBL, PjBL, Inkuiri) yang mendorong kolaborasi & berpikir kritis.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 8,
            aspek: "Kegiatan Inti",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru memanfaatkan LKPD dan sumber belajar kontekstual yang relevan dengan capaian fase.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 9,
            aspek: "Kegiatan Inti",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru mengajukan pertanyaan terbuka tingkat tinggi (HOTS) dan memberi kesempatan merata.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 10,
            aspek: "Kegiatan Inti",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru mengintegrasikan penguatan Profil Pelajar Pancasila dalam aktivitas pembelajaran.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 11,
            aspek: "Kegiatan Inti",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru mengelola waktu, dinamika kelompok, dan iklim kelas agar tetap kondusif dan aman.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 12,
            aspek: "Kegiatan Inti",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Interaksi guru dan peserta didik bersifat dialogis, empatik, dan menghargai keragaman pendapat.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 13,
            aspek: "Asesmen dan Penutup",
            tipe: "skala",
            bobot: 1.2,
            wajib: true,
            teks: "Guru melaksanakan asesmen formatif selama proses belajar (observasi, kuis, atau penilaian kinerja).",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 14,
            aspek: "Asesmen dan Penutup",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru memberikan umpan balik konstruktif dan spesifik terhadap hasil kerja peserta didik.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 15,
            aspek: "Asesmen dan Penutup",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru bersama peserta didik melakukan refleksi dan menyimpulkan poin kunci pembelajaran.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 16,
            aspek: "Asesmen dan Penutup",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru menyampaikan rencana tindak lanjut berupa pengayaan atau remedial untuk pertemuan berikutnya.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 17,
            aspek: "Pemanfaatan Teknologi Informasi",
            tipe: "skala",
            bobot: 1.2,
            wajib: true,
            teks: "Guru mengoperasikan perangkat TIK (proyektor, laptop, panel interaktif) secara lancar di kelas.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 18,
            aspek: "Pemanfaatan Teknologi Informasi",
            tipe: "skala",
            bobot: 1.2,
            wajib: true,
            teks: "Guru menggunakan media digital interaktif (Quizizz, GeoGebra, PhET, atau Canva Edu) sesuai topik.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 19,
            aspek: "Pemanfaatan Teknologi Informasi",
            tipe: "skala",
            bobot: 1.0,
            wajib: true,
            teks: "Guru mengarahkan literasi digital serta keamanan penggunaan internet peserta didik secara bertanggung jawab.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 20,
            aspek: "Pemanfaatan Teknologi Informasi",
            tipe: "skala",
            bobot: 1.2,
            wajib: true,
            teks: "Guru memanfaatkan LMS / Platform Merdeka Mengajar (PMM) untuk distribusi tugas & pengembangan kompetensi.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
        ],
      },
    },
    include: { pertanyaan: { orderBy: { urutan: "asc" } } },
  });

  // 6. Instrumen 2: Supervisi Klinis & Observasi Singkat (4 Aspek)
  const instrumen2 = await prisma.instrumen.create({
    data: {
      judul: "Instrumen Observasi Klinis & Refleksi Pembelajaran Digital",
      deskripsi:
        "Instrumen ringkas 4 aspek untuk supervisi klinis berkala yang memadukan evaluasi diri guru, catatan keterlaksanaan kelas, dan penilaian Kepala Sekolah.",
      versi: 1,
      status: "aktif",
      pertanyaan: {
        create: [
          {
            urutan: 1,
            aspek: "Pembukaan Pembelajaran",
            tipe: "skala",
            bobot: 1.2,
            wajib: true,
            teks: "Kesiapan modul ajar, apersepsi kontekstual, dan penyampaian tujuan pembelajaran kepada siswa.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 2,
            aspek: "Kegiatan Inti",
            tipe: "skala",
            bobot: 1.5,
            wajib: true,
            teks: "Penerapan pembelajaran berdiferensiasi dan keaktifan kolaborasi peserta didik dalam diskusi.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 3,
            aspek: "Asesmen dan Penutup",
            tipe: "skala",
            bobot: 1.3,
            wajib: true,
            teks: "Pelaksanaan asesmen formatif, umpan balik langsung, serta refleksi penutup bersama peserta didik.",
            opsiJSON: JSON.stringify(SKALA_RUBRIK),
          },
          {
            urutan: 4,
            aspek: "Pemanfaatan Teknologi Informasi",
            tipe: "esai",
            bobot: 1.5,
            wajib: true,
            teks: "Deskripsikan pemanfaatan perangkat TIK/platform digital di kelas beserta kendala dan rencana perbaikan.",
            opsiJSON: JSON.stringify([]),
          },
        ],
      },
    },
    include: { pertanyaan: { orderBy: { urutan: "asc" } } },
  });

  // Helper seed penugasan lengkap dengan tahapan SIPENA
  async function seedSupervisiRecord(opts: {
    guru: typeof guru1;
    instrumen: typeof instrumen1;
    daysAgo: number;
    statusPenugasan:
      | "tindak_lanjut"
      | "selesai"
      | "dalam_penilaian"
      | "perlu_revisi"
      | "menunggu_verifikasi"
      | "belum";
    catatanVerifikasi?: string;
    skorAspek?: { aspek: string; skor: number; alasan: string }[];
    skorTotal?: number;
    predikat?: string;
    kesimpulan?: string;
    kekuatan?: string[];
    saran?: string[];
    catatanAdmin?: string;
    disahkan?: boolean;
    nomorRegistrasi?: string;
    rtl?: {
      rekomendasi: string;
      target: string;
      tenggat: string;
      progres: string;
    };
    sampleAnswers: Record<
      number,
      { nilai: number | string; catatan: string; buktiUrl?: string }
    >;
  }) {
    const createdAt = new Date(
      Date.now() - opts.daysAgo * 24 * 60 * 60 * 1000
    );
    const tenggat = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const penugasan = await prisma.penugasan.create({
      data: {
        instrumenId: opts.instrumen.id,
        guruId: opts.guru.id,
        tenggat,
        status: opts.statusPenugasan,
        catatanVerifikasi: opts.catatanVerifikasi || null,
        diverifikasiOleh:
          opts.statusPenugasan !== "belum" &&
          opts.statusPenugasan !== "menunggu_verifikasi"
            ? kepsek.nama
            : null,
        diverifikasiPada:
          opts.statusPenugasan !== "belum" &&
          opts.statusPenugasan !== "menunggu_verifikasi"
            ? createdAt
            : null,
        createdAt,
        updatedAt: createdAt,
      },
    });

    for (const q of opts.instrumen.pertanyaan) {
      const ans = opts.sampleAnswers[q.urutan];
      if (!ans && opts.statusPenugasan === "belum") continue;
      const fallback = {
        nilai: q.tipe === "skala" ? 3 : "Terlaksana baik sesuai modul ajar.",
        catatan:
          "Bukti pelaksanaan terdokumentasi di jurnal mengajar & LKPD kelas.",
      };
      await prisma.jawaban.create({
        data: {
          penugasanId: penugasan.id,
          pertanyaanId: q.id,
          nilaiJSON: JSON.stringify(ans || fallback),
        },
      });
    }

    if (opts.skorAspek && opts.skorTotal !== undefined) {
      await prisma.hasil.create({
        data: {
          penugasanId: penugasan.id,
          skorPerAspekJSON: JSON.stringify(opts.skorAspek),
          skorTotal: opts.skorTotal,
          skorAsliAI: opts.skorTotal,
          predikat: opts.predikat || "Baik",
          kesimpulan: opts.kesimpulan || "",
          kekuatanJSON: JSON.stringify(opts.kekuatan || []),
          sarannyaJSON: JSON.stringify(opts.saran || []),
          catatanAdmin: opts.catatanAdmin || null,
          diubahAdminOleh: opts.disahkan ? kepsek.nama : null,
          diubahAdminPada: opts.disahkan ? createdAt : null,
          disahkan: Boolean(opts.disahkan),
          disahkanOleh: opts.disahkan ? kepsek.nama : null,
          disahkanNip: opts.disahkan ? kepsek.nip : null,
          disahkanPada: opts.disahkan ? createdAt : null,
          nomorRegistrasi: opts.nomorRegistrasi || null,
          rtlRekomendasi: opts.rtl?.rekomendasi || null,
          rtlTarget: opts.rtl?.target || null,
          rtlTenggat: opts.rtl?.tenggat || null,
          rtlProgres: opts.rtl?.progres || "Belum Dimulai",
          pengawasNama: opts.rtl ? pengawas.nama : null,
          pengawasNip: opts.rtl ? pengawas.nip : null,
          ditinjauPengawasPada: opts.rtl ? new Date() : null,
          status: "selesai",
          tokenUsage: 580,
          createdAt,
          updatedAt: createdAt,
        },
      });
    }
  }

  // Record 1: Budi Santoso -> Tahap Akhir "tindak_lanjut" (Disahkan Kepsek + Ada RTL Pengawas)
  await seedSupervisiRecord({
    guru: guru1,
    instrumen: instrumen1,
    daysAgo: 10,
    statusPenugasan: "tindak_lanjut",
    catatanVerifikasi:
      "Modul ajar, LKPD berdiferensiasi, dan instrumen asesmen sangat lengkap.",
    skorTotal: 92.5,
    predikat: "Amat Baik",
    disahkan: true,
    nomorRegistrasi: "REG-SUP/2026/001",
    skorAspek: [
      {
        aspek: "Pembukaan Pembelajaran",
        skor: 94,
        alasan:
          "Pembukaan kelas tertib, apersepsi mengaitkan fungsi linear dengan tarif ojek daring sangat efektif.",
      },
      {
        aspek: "Kegiatan Inti",
        skor: 91,
        alasan:
          "Pembelajaran berdiferensiasi pada 3 tingkat kesulitan LKPD berjalan kondusif dan aktif.",
      },
      {
        aspek: "Asesmen dan Penutup",
        skor: 90,
        alasan:
          "Asesmen formatif melalui kuis diagnostik singkat diikuti umpan balik individual yang jelas.",
      },
      {
        aspek: "Pemanfaatan Teknologi Informasi",
        skor: 95,
        alasan:
          "Visualisasi grafik dengan GeoGebra Classroom dan LMS membantu siswa memahami konsep abstrak.",
      },
    ],
    kesimpulan:
      "Pelaksanaan pembelajaran Matematika oleh Bapak Budi Santoso meraih nilai 92,5 (Amat Baik). Integrasi pembelajaran berdiferensiasi dan simulasi GeoGebra memenuhi standar proses Permendikbudristek No. 16 Tahun 2022 dan layak menjadi praktik baik sekolah.",
    kekuatan: [
      "Penerapan pembelajaran berdiferensiasi konten & produk terlaksana konsisten.",
      "Integrasi GeoGebra interaktif membuat pemahaman grafik fungsi meningkat signifikan.",
      "Manajemen waktu dan transisi antar fase kegiatan sangat terjaga.",
    ],
    saran: [
      "Dokumentasikan praktik baik ini dalam sesi berbagi Komunitas Belajar (Kombel) guru.",
      "Tambahkan instrumen peer-assessment pada akhir presentasi proyek kelompok.",
    ],
    catatanAdmin:
      "Disahkan oleh Kepala Sekolah. Apresiasi atas konsistensi penyusunan perangkat ajar dan inovasi pembelajaran Matematika berbasis GeoGebra.",
    rtl: {
      rekomendasi:
        "Guru ditunjuk menjadi narasumber diseminasi praktik baik pembelajaran berdiferensiasi & integrasi GeoGebra pada MGMP / Kombel tingkat kecamatan.",
      target:
        "Tersusunnya 1 modul ajar model + video praktik baik berdurasi 10 menit di Platform Merdeka Mengajar (PMM).",
      tenggat: "30 Desember 2026",
      progres: "Sedang Berjalan",
    },
    sampleAnswers: {
      1: {
        nilai: 4,
        catatan: "Salam, doa, dan cek presensi serta kesiapan belajar dilaksanakan.",
        buktiUrl: "https://drive.google.com/file/d/bukti-pembukaan-budi",
      },
      6: {
        nilai: 4,
        catatan: "LKPD dibagi menjadi level dasar, menengah, dan pengayaan.",
      },
      18: {
        nilai: 4,
        catatan: "Menggunakan GeoGebra Classroom & proyektor kelas.",
      },
    },
  });

  // Record 2: Siti Aminah -> Tahap "selesai" (Disahkan Kepsek, menunggu RTL Pengawas)
  await seedSupervisiRecord({
    guru: guru2,
    instrumen: instrumen1,
    daysAgo: 5,
    statusPenugasan: "selesai",
    catatanVerifikasi:
      "Perangkat Bahasa Indonesia telah terverifikasi lengkap dan selaras CP Fase C.",
    skorTotal: 86.0,
    predikat: "Baik",
    disahkan: true,
    nomorRegistrasi: "REG-SUP/2026/002",
    skorAspek: [
      {
        aspek: "Pembukaan Pembelajaran",
        skor: 88,
        alasan:
          "Apersepsi teks argumentasi menggunakan isu lingkungan sekolah memancing diskusi awal yang hidup.",
      },
      {
        aspek: "Kegiatan Inti",
        skor: 87,
        alasan:
          "Diskusi kelompok berjalan dinamis, mayoritas siswa aktif berpendapat dengan santun.",
      },
      {
        aspek: "Asesmen dan Penutup",
        skor: 83,
        alasan:
          "Umpan balik lisan sudah baik, namun rubrik penilaian tulisan perlu dibagikan lebih awal.",
      },
      {
        aspek: "Pemanfaatan Teknologi Informasi",
        skor: 86,
        alasan:
          "Menggunakan Padlet dan Quizizz sebagai media kurasi ide peserta didik.",
      },
    ],
    kesimpulan:
      "Pembelajaran Bahasa Indonesia oleh Ibu Siti Aminah memperoleh nilai akhir 86,0 (Baik). Kelas berlangsung interaktif dengan penguatan literasi kritis yang kuat.",
    kekuatan: [
      "Pertanyaan pemantik sangat relevan dengan konteks keseharian siswa.",
      "Pemanfaatan Padlet efektif menampung aspirasi siswa yang pendiam.",
    ],
    saran: [
      "Bagikan rubrik penilaian penulisan argumentasi sebelum siswa mulai menyusun draf.",
      "Sediakan bank kosakata pendamping bagi kelompok siswa yang membutuhkan scaffolding.",
    ],
    catatanAdmin:
      "Laporan telah disahkan Kepala Sekolah dan diteruskan ke Pengawas Sekolah untuk penetapan Rencana Tindak Lanjut (RTL).",
    sampleAnswers: {
      1: { nilai: 4, catatan: "Kelas dimulai tertib dengan ice breaking literasi." },
      13: { nilai: 3, catatan: "Asesmen formatif melalui Padlet & tanya jawab lisan." },
    },
  });

  // Record 3: Ahmad Fauzi -> Tahap "dalam_penilaian" (Draf AI Co-Evaluator siap dinilai & disahkan Kepsek)
  await seedSupervisiRecord({
    guru: guru3,
    instrumen: instrumen2,
    daysAgo: 2,
    statusPenugasan: "dalam_penilaian",
    catatanVerifikasi:
      "Berkas Modul Ajar Informatika dan LKPD proyek koding disetujui Kepala Sekolah. Siap dinilai & disahkan.",
    skorTotal: 84.5,
    predikat: "Baik",
    disahkan: false,
    skorAspek: [
      {
        aspek: "Pembukaan Pembelajaran",
        skor: 86,
        alasan:
          "Berdasarkan evaluasi diri & modul ajar, tujuan pembelajaran algoritma disampaikan runtut.",
      },
      {
        aspek: "Kegiatan Inti",
        skor: 85,
        alasan:
          "Siswa aktif menyusun alur logika berpasangan (pair programming) dengan bimbingan guru.",
      },
      {
        aspek: "Asesmen dan Penutup",
        skor: 80,
        alasan:
          "Asesmen unjuk kerja terlaksana, namun waktu refleksi penutup masih perlu ditambah 5 menit.",
      },
      {
        aspek: "Pemanfaatan Teknologi Informasi",
        skor: 87,
        alasan:
          "Penggunaan Scratch/Blockly dan simulator web berjalan sangat efektif.",
      },
    ],
    kesimpulan:
      "[DRAF AI CO-EVALUATOR] Evaluasi awal menunjukkan capaian baik (84,5). Menunggu validasi skor observasi kelas dan pengesahan resmi oleh Kepala Sekolah.",
    kekuatan: [
      "Pendekatan pair-programming melatih kolaborasi dan debugging mandiri.",
      "LKPD memuat panduan visual langkah demi langkah yang jelas.",
    ],
    saran: [
      "Sisihkan 10 menit khusus sebelum bel penutup untuk refleksi bersama peserta didik.",
    ],
    sampleAnswers: {
      1: {
        nilai: 4,
        catatan: "Membuka dengan review materi logika percabangan sebelumnya.",
      },
      2: {
        nilai: 3,
        catatan: "Siswa bekerja berpasangan pada proyek mini animasi interaktif.",
      },
      3: {
        nilai: 3,
        catatan: "Dilakukan kuis refleksi cepat 5 soal sebelum penutupan.",
      },
      4: {
        nilai:
          "Memanfaatkan Google Classroom, Scratch Edu, dan proyektor. Kendala pada stabilitas Wi-Fi saat unduh aset, disiasati dengan repositori lokal.",
        catatan: "Tersedia repositori aset offline di server lab komputer.",
      },
    },
  });

  // Record 4: Dewi Lestari -> Tahap "perlu_revisi" (Dikembalikan oleh Kepala Sekolah)
  await seedSupervisiRecord({
    guru: guru4,
    instrumen: instrumen2,
    daysAgo: 1,
    statusPenugasan: "perlu_revisi",
    catatanVerifikasi:
      "Mohon lengkapi tautan bukti foto/LKPD eksperimen IPAS dan rincian kriteria asesmen formatif pada instrumen sebelum observasi kelas dilanjutkan.",
    sampleAnswers: {
      1: {
        nilai: 3,
        catatan: "Modul ajar sudah disiapkan, menunggu kelengkapan lampiran asesmen.",
      },
      2: {
        nilai: 3,
        catatan: "Praktikum perubahan wujud benda dilaksanakan berkelompok.",
      },
    },
  });

  // Berikan 1 Penugasan "belum" untuk Guru 1 (Budi Santoso) untuk siklus semester berjalan
  await seedSupervisiRecord({
    guru: guru1,
    instrumen: instrumen2,
    daysAgo: 0,
    statusPenugasan: "belum",
    sampleAnswers: {},
  });

  // 7. Seed Perangkat Pembelajaran & Bukti Supervisi (6 Komponen)
  await prisma.perangkatSupervisi.create({
    data: {
      guruId: guru1.id,
      judulPembelajaran:
        "Pemodelan Fungsi Linear & Visualisasi Grafik Kontekstual",
      mataPelajaran: "Matematika",
      kelasFase: "Kelas 6 / Fase C",
      semester: "Ganjil 2026/2027",
      tanggalPelaksanaan: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      modulAjarJudul: "Modul Ajar Berdiferensiasi: Fungsi Linear & Gradien",
      modulAjarTujuan:
        "Peserta didik mampu memodelkan hubungan dua besaran kontekstual menjadi persamaan dan grafik linear dengan GeoGebra.",
      modulAjarUrl: "https://guru.kemdikbud.go.id/perangkat-ajar/matematika",
      modulAjarFileNama: "Modul_Ajar_Matematika_Budi_2026.pdf",
      modulAjarStatus: true,
      lkpdJudul: "LKPD Bertingkat 3 Level Kesiapan Belajar",
      lkpdDeskripsi:
        "Lembar kerja eksplorasi tarif transportasi daring menggunakan tabel nilai dan grafik GeoGebra.",
      lkpdUrl: "https://www.geogebra.org/classroom",
      lkpdFileNama: "LKPD_Berdiferensiasi_Budi.pdf",
      lkpdStatus: true,
      asesmenJenis: "Asesmen Diagnostik, Formatif & Rubrik KKTP",
      asesmenKriteria:
        "Ketepatan model matematika (40%), ketelitian grafik (30%), presentasi kelompok (30%).",
      asesmenUrl: "https://docs.google.com/spreadsheets/d/rubrik-budi",
      asesmenFileNama: "Rubrik_KKTP_Matematika_Budi.pdf",
      asesmenStatus: true,
      fotoBuktiJSON: JSON.stringify([
        {
          judul: "Apersepsi & Demonstrasi GeoGebra",
          url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80",
          keterangan: "Siswa mengamati perubahan gradien grafik di proyektor.",
        },
        {
          judul: "Diskusi Kelompok Berdiferensiasi",
          url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
          keterangan: "Setiap kelompok menyelesaikan LKPD sesuai level kesiapan.",
        },
      ]),
      fotoBuktiCatatan:
        "Dokumentasi telah mendapat izin sekolah dan menjaga privasi siswa.",
      fotoBuktiStatus: true,
      mediaJenis: "Simulasi Interaktif (GeoGebra Classroom)",
      mediaPlatform: "Proyektor, Laptop, GeoGebra, Google Classroom",
      mediaUrl: "https://www.geogebra.org/",
      mediaDeskripsi:
        "Visualisasi grafik secara real-time selama diskusi inti.",
      mediaStatus: true,
      refleksiKeberhasilan:
        "90% peserta didik berhasil menginterpretasikan kemiringan grafik dengan benar.",
      refleksiKendala:
        "Dua siswa masih memerlukan pendampingan tambahan saat menentukan titik potong sumbu.",
      refleksiTindakLanjut:
        "Menyediakan video tutorial singkat berdurasi 3 menit di Google Classroom.",
      refleksiStatus: true,
      statusVerifikasi: "lengkap",
      catatanSupervisor:
        "Keenam komponen perangkat pembelajaran Bapak Budi lengkap dan menjadi model rujukan di sekolah.",
      diverifikasiOleh: kepsek.nama,
      diverifikasiPada: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.perangkatSupervisi.create({
    data: {
      guruId: guru2.id,
      judulPembelajaran:
        "Menulis Teks Argumentasi Kritis Bertema Lingkungan Sekolah",
      mataPelajaran: "Bahasa Indonesia",
      kelasFase: "Kelas 5 / Fase C",
      semester: "Ganjil 2026/2027",
      tanggalPelaksanaan: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      modulAjarJudul: "Modul Ajar Bahasa Indonesia: Teks Argumentasi",
      modulAjarTujuan:
        "Peserta didik mampu menyusun gagasan argumentatif disertai bukti logis secara santun.",
      modulAjarUrl: "https://guru.kemdikbud.go.id/",
      modulAjarFileNama: "Modul_Ajar_BIndo_Siti.pdf",
      modulAjarStatus: true,
      lkpdJudul: "LKPD Peta Pikiran & Struktur Argumentasi",
      lkpdDeskripsi:
        "Panduan menyusun tesis, argumen pendukung, dan simpulan.",
      lkpdUrl: "https://docs.google.com/document/d/lkpd-siti",
      lkpdFileNama: "LKPD_Argumentasi_Siti.pdf",
      lkpdStatus: true,
      asesmenJenis: "Formatif & Rubrik Menulis",
      asesmenKriteria:
        "Kesesuaian struktur (35%), kekuatan bukti (35%), kaidah EYD (30%).",
      asesmenUrl: "https://docs.google.com/spreadsheets/d/rubrik-siti",
      asesmenFileNama: "Rubrik_Menulis_Siti.pdf",
      asesmenStatus: true,
      fotoBuktiJSON: JSON.stringify([
        {
          judul: "Kurasi Ide Melalui Padlet",
          url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80",
          keterangan: "Siswa menuliskan argumen awal secara kolaboratif.",
        },
      ]),
      fotoBuktiCatatan: "Foto pembelajaran sesi 1.",
      fotoBuktiStatus: true,
      mediaJenis: "Papan Kolaborasi Digital & Kuis",
      mediaPlatform: "Padlet, Quizizz, Proyektor",
      mediaUrl: "https://padlet.com/",
      mediaDeskripsi: "Mendorong partisipasi setara seluruh siswa.",
      mediaStatus: true,
      refleksiKeberhasilan:
        "Siswa bersemangat menyampaikan pendapat terkait pengelolaan sampah sekolah.",
      refleksiKendala: "Sebagian siswa masih tertukar antara fakta dan opini.",
      refleksiTindakLanjut:
        "Membuat kartu latihan pembedaan kalimat fakta dan opini.",
      refleksiStatus: true,
      statusVerifikasi: "lengkap",
      catatanSupervisor:
        "Perangkat pembelajaran Ibu Siti lengkap dan terverifikasi oleh Kepala Sekolah.",
      diverifikasiOleh: kepsek.nama,
      diverifikasiPada: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.perangkatSupervisi.create({
    data: {
      guruId: guru4.id,
      judulPembelajaran: "Eksperimen Energi & Perubahan Wujud Benda",
      mataPelajaran: "IPAS & Sains Terpadu",
      kelasFase: "Kelas 4 / Fase B",
      semester: "Ganjil 2026/2027",
      tanggalPelaksanaan: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      modulAjarJudul: "Modul Ajar IPAS: Perubahan Energi di Sekitar Kita",
      modulAjarTujuan:
        "Peserta didik mengidentifikasi bentuk dan perubahan energi melalui percobaan sederhana.",
      modulAjarUrl: "https://guru.kemdikbud.go.id/",
      modulAjarFileNama: "Modul_Ajar_IPAS_Dewi.pdf",
      modulAjarStatus: true,
      lkpdJudul: "LKPD Pengamatan Praktikum Kelompok",
      lkpdDeskripsi: "Tabel pengamatan hasil percobaan dan pertanyaan diskusi.",
      lkpdUrl: "",
      lkpdFileNama: "LKPD_IPAS_Dewi.docx",
      lkpdStatus: true,
      asesmenJenis: "Observasi Kinerja",
      asesmenKriteria: "Rubrik praktikum belum dilampirkan.",
      asesmenUrl: "",
      asesmenFileNama: "",
      asesmenStatus: false,
      fotoBuktiJSON: JSON.stringify([]),
      fotoBuktiCatatan: "",
      fotoBuktiStatus: false,
      mediaJenis: "Simulasi PhET Colorado",
      mediaPlatform: "PhET, Proyektor, Laptop",
      mediaUrl: "https://phet.colorado.edu/",
      mediaDeskripsi: "Simulasi perubahan energi sebelum praktik.",
      mediaStatus: true,
      refleksiKeberhasilan: "Siswa antusias mencoba alat peraga sederhana.",
      refleksiKendala: "Lampiran foto & rubrik penilaian belum diunggah.",
      refleksiTindakLanjut: "Melengkapi berkas asesmen dan foto pelaksanaan.",
      refleksiStatus: true,
      statusVerifikasi: "revisi",
      catatanSupervisor:
        "Mohon unggah file Rubrik Asesmen Kinerja dan minimal 1 Foto Bukti Pelaksanaan kelas.",
      diverifikasiOleh: kepsek.nama,
      diverifikasiPada: new Date(),
    },
  });

  // 8. Log Aktivitas Awal
  await prisma.logAktivitas.createMany({
    data: [
      {
        userId: admin.id,
        namaUser: admin.nama,
        role: "admin",
        aksi: "INIT_SIPENA",
        detail:
          "Inisialisasi sistem SIPENA v2 (4 Peran: Guru, Kepala Sekolah, Pengawas Sekolah, Admin Sistem + Bot WhatsApp)",
      },
      {
        userId: kepsek.id,
        namaUser: kepsek.nama,
        role: "kepala_sekolah",
        aksi: "SAHKAN_LAPORAN_SUPERVISI",
        detail:
          "Mengesahkan & mengunci permanen laporan supervisi Budi Santoso (REG-SUP/2026/001) dan Siti Aminah (REG-SUP/2026/002)",
      },
      {
        userId: pengawas.id,
        namaUser: pengawas.nama,
        role: "pengawas",
        aksi: "TETAPKAN_RTL_PENGAWAS",
        detail:
          "Menetapkan Rencana Tindak Lanjut (RTL) untuk Budi Santoso dengan status progres: Sedang Berjalan",
      },
      {
        userId: kepsek.id,
        namaUser: kepsek.nama,
        role: "kepala_sekolah",
        aksi: "KEMBALIKAN_REVISI",
        detail:
          "Mengembalikan berkas supervisi Dewi Lestari (status: Perlu Revisi) untuk melengkapi rubrik & foto bukti",
      },
    ],
  });

  return { seeded: true };
}
