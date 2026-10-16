import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAllSettingsDecrypted,
  getPredikatFromSkor,
  logActivity,
} from "@/lib/settings";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const hasilList = await prisma.hasil.findMany({
    include: {
      penugasan: {
        include: {
          guru: {
            select: {
              id: true,
              nama: true,
              email: true,
              nip: true,
              mapel: true,
            },
          },
          instrumen: {
            include: {
              pertanyaan: { orderBy: { urutan: "asc" } },
            },
          },
          jawaban: true,
        },
      },
      podcast: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 1. Grafik Batang Perbandingan Antar Guru
  const guruMap = new Map<
    string,
    { nama: string; mapel: string; sum: number; count: number; skorTerakhir: number }
  >();
  for (const h of hasilList) {
    if (h.status !== "selesai") continue;
    const g = h.penugasan.guru;
    const entry = guruMap.get(g.id) || {
      nama: g.nama,
      mapel: g.mapel || "Umum",
      sum: 0,
      count: 0,
      skorTerakhir: h.skorTotal,
    };
    entry.sum += h.skorTotal;
    entry.count += 1;
    guruMap.set(g.id, entry);
  }

  const barPerbandinganGuru = Array.from(guruMap.entries()).map(([guruId, d]) => ({
    guruId,
    nama: d.nama.split(",")[0],
    namaLengkap: d.nama,
    mapel: d.mapel,
    rataSkor: d.count > 0 ? Math.round(d.sum / d.count) : 0,
    skorTerakhir: d.skorTerakhir,
  }));

  // 2. Grafik Distribusi Skor / Predikat
  const distBuckets = [
    { rentang: "Sangat Baik (85-100)", jumlah: 0 },
    { rentang: "Baik (75-84)", jumlah: 0 },
    { rentang: "Cukup (60-74)", jumlah: 0 },
    { rentang: "Kurang (<60)", jumlah: 0 },
  ];
  for (const h of hasilList) {
    if (h.status !== "selesai") continue;
    if (h.skorTotal >= 85) distBuckets[0].jumlah++;
    else if (h.skorTotal >= 75) distBuckets[1].jumlah++;
    else if (h.skorTotal >= 60) distBuckets[2].jumlah++;
    else distBuckets[3].jumlah++;
  }

  // 3. Grafik Garis Tren Dari Waktu ke Waktu
  const trenWaktu = [...hasilList]
    .filter((h) => h.status === "selesai")
    .reverse()
    .map((h) => ({
      tanggal: new Date(h.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
      guru: h.penugasan.guru.nama.split(",")[0],
      skor: h.skorTotal,
    }));

  return NextResponse.json({
    hasil: hasilList,
    charts: {
      barPerbandinganGuru,
      distribusiSkor: distBuckets,
      trenWaktu,
    },
  });
}

// PUT untuk memberi Catatan Admin atau menimpa nilai AI secara manual (PRD Bagian 5.5)
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const { hasilId, catatanAdmin, skorTotalBaru } = body;

    if (!hasilId) {
      return NextResponse.json(
        { error: "ID Hasil wajib disertakan." },
        { status: 400 }
      );
    }

    const existing = await prisma.hasil.findUnique({
      where: { id: String(hasilId) },
      include: {
        penugasan: { include: { guru: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Data hasil tidak ditemukan." },
        { status: 404 }
      );
    }

    const settings = await getAllSettingsDecrypted();
    const updateData: Record<string, unknown> = {
      catatanAdmin:
        typeof catatanAdmin === "string"
          ? catatanAdmin.trim() || null
          : existing.catatanAdmin,
      diubahAdminOleh: session.nama,
      diubahAdminPada: new Date(),
    };

    if (
      skorTotalBaru !== undefined &&
      skorTotalBaru !== null &&
      !isNaN(Number(skorTotalBaru))
    ) {
      const numSkor = Math.max(0, Math.min(100, Number(skorTotalBaru)));
      updateData.skorTotal = numSkor;
      updateData.predikat = getPredikatFromSkor(numSkor, settings.ai_rubrik_json);
      if (existing.skorAsliAI === null) {
        updateData.skorAsliAI = existing.skorTotal;
      }
    }

    const updated = await prisma.hasil.update({
      where: { id: existing.id },
      data: updateData,
    });

    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "KOREKSI_CATATAN_ADMIN",
      detail: `Admin ${session.nama} memperbarui catatan/nilai pada hasil supervisi ${existing.penugasan.guru.nama} (Skor: ${updated.skorTotal})`,
    });

    return NextResponse.json({
      success: true,
      message: `Catatan & nilai supervisi untuk ${existing.penugasan.guru.nama} berhasil disimpan (tercatat oleh ${session.nama})!`,
      hasil: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal memperbarui catatan/nilai.",
      },
      { status: 500 }
    );
  }
}
