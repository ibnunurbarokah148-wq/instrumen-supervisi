import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";
import { ensureSeeded } from "@/lib/seed-data";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  await ensureSeeded(false);

  const [totalGuru, hasilList, totalPodcast, settings, recentLogs] =
    await Promise.all([
      prisma.user.count({ where: { role: "guru" } }),
      prisma.hasil.findMany({
        where: { status: "selesai" },
        include: {
          penugasan: {
            include: {
              guru: { select: { nama: true, mapel: true } },
              instrumen: { select: { judul: true } },
            },
          },
          podcast: { select: { id: true, status: true, durasi: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.podcast.count({ where: { status: "selesai" } }),
      getAllSettingsDecrypted(),
      prisma.logAktivitas.findMany({
        orderBy: { waktu: "desc" },
        take: 8,
      }),
    ]);

  const totalSupervisi = hasilList.length;
  const rataRataSkor =
    totalSupervisi > 0
      ? Number(
          (
            hasilList.reduce((acc, h) => acc + h.skorTotal, 0) / totalSupervisi
          ).toFixed(1)
        )
      : 0;

  // Hitung rata-rata skor per aspek untuk Grafik Radar Admin
  const aspectTotals = new Map<string, { sum: number; count: number }>();
  for (const h of hasilList) {
    try {
      const parsed: { aspek: string; skor: number }[] = JSON.parse(
        h.skorPerAspekJSON || "[]"
      );
      for (const item of parsed) {
        const cur = aspectTotals.get(item.aspek) || { sum: 0, count: 0 };
        cur.sum += Number(item.skor) || 0;
        cur.count += 1;
        aspectTotals.set(item.aspek, cur);
      }
    } catch {
      // ignore
    }
  }

  const radarAspek = Array.from(aspectTotals.entries()).map(([aspek, d]) => ({
    aspek,
    rataRata: d.count > 0 ? Math.round(d.sum / d.count) : 0,
    target: 85,
  }));

  // Tren Supervisi per Minggu (4 minggu terakhir)
  const now = Date.now();
  const weeklyBuckets = [
    { minggu: "Minggu -3", jumlah: 0, sumSkor: 0 },
    { minggu: "Minggu -2", jumlah: 0, sumSkor: 0 },
    { minggu: "Minggu Lalu", jumlah: 0, sumSkor: 0 },
    { minggu: "Minggu Ini", jumlah: 0, sumSkor: 0 },
  ];

  for (const h of hasilList) {
    const diffDays = Math.floor(
      (now - new Date(h.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    let idx = 3;
    if (diffDays > 21) idx = 0;
    else if (diffDays > 14) idx = 1;
    else if (diffDays > 7) idx = 2;
    weeklyBuckets[idx].jumlah += 1;
    weeklyBuckets[idx].sumSkor += h.skorTotal;
  }

  const trenMingguan = weeklyBuckets.map((b) => ({
    minggu: b.minggu,
    jumlahSupervisi: b.jumlah,
    rataSkor: b.jumlah > 0 ? Math.round(b.sumSkor / b.jumlah) : 0,
  }));

  const statusKoneksi = {
    openai: {
      configured: Boolean(settings.openai_api_key?.trim()),
      baseUrl: settings.openai_base_url,
      model: settings.openai_model,
      label: settings.openai_api_key?.trim()
        ? "Terhubung (API Key Tersimpan)"
        : "Belum Diatur (API Key Kosong)",
    },
    fishAudio: {
      configured: Boolean(settings.fish_api_key?.trim()),
      voiceId: settings.fish_voice_id,
      model: settings.fish_model,
      label: settings.fish_api_key?.trim()
        ? "Terhubung (Fish Audio TTS)"
        : "Belum Diatur (API Key Kosong)",
    },
    shiroko: {
      enabled: settings.shiroko_enabled === "true",
      url: settings.shiroko_url,
      label:
        settings.shiroko_enabled === "true"
          ? "Aktif (Webhook Siap)"
          : "Nonaktif",
    },
  };

  return NextResponse.json({
    stats: {
      totalGuru,
      totalSupervisi,
      rataRataSkor,
      totalPodcast,
    },
    statusKoneksi,
    radarAspek,
    trenMingguan,
    recentHasil: [...hasilList].reverse().slice(0, 5),
    recentLogs,
  });
}

// POST untuk mereset / memuat ulang data demo saat presentasi ke dosen (PRD Bagian 13)
export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  await ensureSeeded(true);
  await logActivity({
    userId: session.userId,
    namaUser: session.nama,
    role: "admin",
    aksi: "RESET_DATA_DEMO",
    detail: "Admin memuat ulang data contoh (Demo Mode) untuk presentasi",
  });

  return NextResponse.json({
    success: true,
    message: "Data contoh (Demo Mode) berhasil dimuat ulang!",
  });
}
