import { NextResponse } from "next/server";
import { requireGuru } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { session, error } = await requireGuru();
  if (error) return error;

  const [guru, penugasanList, perangkatTerbaru] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        nama: true,
        email: true,
        nip: true,
        jabatan: true,
        unitKerja: true,
        nomorWA: true,
        mapel: true,
        fotoUrl: true,
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
        hasil: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.perangkatSupervisi.findFirst({
      where: { guruId: session.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        judulPembelajaran: true,
        statusVerifikasi: true,
        catatanSupervisor: true,
        diverifikasiOleh: true,
        diverifikasiPada: true,
        updatedAt: true,
      },
    }),
  ]);

  const hasilSelesai = penugasanList
    .filter((p) => p.hasil && p.hasil.status === "selesai")
    .map((p) => ({
      judulInstrumen: p.instrumen.judul,
      versiInstrumen: p.instrumen.versi,
      tenggat: p.tenggat,
      statusPenugasan: p.status,
      ...p.hasil!,
    }));

  const hasilTerakhir = hasilSelesai[0] || null;

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
    disahkan: h.disahkan,
    hasilId: h.id,
    penugasanId: h.penugasanId,
  }));

  let narasiPerkembangan =
    "Asisten AI SIPENA siap mendampingi peningkatan mutu pembelajaran dan refleksi tindak lanjut supervisi Anda.";
  if (riwayatTren.length >= 2) {
    const prev = riwayatTren[riwayatTren.length - 2];
    const curr = riwayatTren[riwayatTren.length - 1];
    const diff = Number((curr.skorTotal - prev.skorTotal).toFixed(1));
    if (diff > 0) {
      narasiPerkembangan = `Capaian supervisi Bapak/Ibu ${guru?.nama.split(",")[0]} meningkat +${diff} poin dari ${prev.skorTotal} (${prev.predikat}) menjadi ${curr.skorTotal} (${curr.predikat}). Konsistensi pelaksanaan pembelajaran berdiferensiasi dan pemanfaatan TIK membuahkan hasil optimal.`;
    } else if (diff === 0) {
      narasiPerkembangan = `Capaian supervisi stabil pada skor ${curr.skorTotal} (${curr.predikat}). Pertahankan konsistensi praktik baik dan implementasikan rekomendasi tindak lanjut Pengawas Pembina.`;
    } else {
      narasiPerkembangan = `Terdapat selisih ${diff} poin dibandingkan periode sebelumnya (${prev.skorTotal} ke ${curr.skorTotal}). Prioritaskan aspek dengan skor terendah sesuai rekomendasi pembinaan Kepala Sekolah.`;
    }
  }

  return NextResponse.json({
    guru,
    perangkatTerbaru,
    penugasan: penugasanList,
    hasilTerakhir,
    hasilSelesai,
    riwayatTren,
    narasiPerkembangan,
  });
}
