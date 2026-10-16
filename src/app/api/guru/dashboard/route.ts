import { NextResponse } from "next/server";
import { requireGuru } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { session, error } = await requireGuru();
  if (error) return error;

  const [guru, penugasanList] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        nama: true,
        email: true,
        nip: true,
        nomorWA: true,
        mapel: true,
        fotoUrl: true,
        badgesJSON: true,
        lastLoginAt: true,
      },
    }),
    prisma.penugasan.findMany({
      where: { guruId: session.userId },
      include: {
        instrumen: {
          include: {
            _count: { select: { pertanyaan: true } },
          },
        },
        _count: { select: { jawaban: true } },
        hasil: {
          include: {
            podcast: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasilSelesai = penugasanList
    .filter((p) => p.hasil && p.hasil.status === "selesai")
    .map((p) => ({
      judulInstrumen: p.instrumen.judul,
      versiInstrumen: p.instrumen.versi,
      tenggat: p.tenggat,
      ...p.hasil!,
    }));

  const hasilTerakhir = hasilSelesai[0] || null;

  // Data perbandingan antar periode untuk Riwayat (PRD Bagian 6.4 & 13)
  const riwayatTren = [...hasilSelesai].reverse().map((h, i) => ({
    periode: `Periode ${i + 1}`,
    tanggal: new Date(h.createdAt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    judul: h.judulInstrumen,
    skorTotal: h.skorTotal,
    predikat: h.predikat,
    hasilId: h.id,
    penugasanId: h.penugasanId,
  }));

  let narasiPerkembangan =
    "Sensei-AI siap mendampingi perjalanan peningkatan kualitas pembelajaran Anda dari periode ke periode!";
  if (riwayatTren.length >= 2) {
    const prev = riwayatTren[riwayatTren.length - 2];
    const curr = riwayatTren[riwayatTren.length - 1];
    const diff = curr.skorTotal - prev.skorTotal;
    if (diff > 0) {
      narasiPerkembangan = `Subarashii, ${guru?.nama.split(",")[0]}-sensei! ✨ Skor supervisi Anda meningkat +${diff} poin dari ${prev.skorTotal} (${prev.predikat}) menjadi ${curr.skorTotal} (${curr.predikat}). Konsistensi refleksi dan integrasi IT Anda membuahkan hasil nyata!`;
    } else if (diff === 0) {
      narasiPerkembangan = `Otsukare-sama desu! Skor Anda stabil di angka ${curr.skorTotal} (${curr.predikat}). Mari coba satu eksperimen metode baru di periode berikutnya untuk melompat lebih tinggi!`;
    } else {
      narasiPerkembangan = `Tetap semangat, Sensei! Terdapat perubahan ${diff} poin dari periode sebelumnya (${prev.skorTotal} ke ${curr.skorTotal}). Mari fokus pada rekomendasi saran aspek terendah agar kembali meningkat di supervisi berikutnya!`;
    }
  }

  return NextResponse.json({
    guru,
    penugasan: penugasanList,
    hasilTerakhir,
    hasilSelesai,
    riwayatTren,
    narasiPerkembangan,
  });
}
