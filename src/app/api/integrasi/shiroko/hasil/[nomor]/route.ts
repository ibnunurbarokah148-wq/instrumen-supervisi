import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ nomor: string }> }
) {
  try {
    const settings = await getAllSettingsDecrypted();
    const apiKeyHeader = req.headers.get("x-api-key") || "";

    if (
      settings.shiroko_secret &&
      apiKeyHeader !== settings.shiroko_secret
    ) {
      return NextResponse.json(
        { error: "Unauthorized: x-api-key tidak valid." },
        { status: 401 }
      );
    }

    const { nomor } = await context.params;
    const cleanNomor = nomor.replace(/[^0-9]/g, "");
    const coreNumber = cleanNomor.startsWith("62")
      ? cleanNomor.slice(2)
      : cleanNomor.startsWith("0")
      ? cleanNomor.slice(1)
      : cleanNomor;

    const guru = await prisma.user.findFirst({
      where: {
        role: "guru",
        OR: [
          { nomorWA: { contains: cleanNomor } },
          { nomorWA: { contains: coreNumber } },
        ],
      },
      include: {
        penugasan: {
          include: {
            instrumen: { select: { judul: true, versi: true } },
            hasil: {
              include: { podcast: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!guru) {
      return NextResponse.json(
        { error: "Guru dengan nomor WhatsApp tersebut tidak ditemukan." },
        { status: 404 }
      );
    }

    const selesaiList = guru.penugasan.filter(
      (p) => p.hasil && p.hasil.status === "selesai"
    );
    const terakhir = selesaiList[0];

    await logActivity({
      userId: guru.id,
      namaUser: "Bot Shiroko",
      role: "system",
      aksi: "SHIROKO_GET_HASIL",
      detail: `Bot Shiroko mengambil ringkasan hasil guru ${guru.nama} (${cleanNomor})`,
    });

    return NextResponse.json({
      guru: {
        nama: guru.nama,
        mapel: guru.mapel,
        nomorWA: guru.nomorWA,
      },
      hasilTerakhir: terakhir
        ? {
            instrumen: terakhir.instrumen.judul,
            tanggal: terakhir.hasil!.createdAt,
            skorTotal: terakhir.hasil!.skorTotal,
            predikat: terakhir.hasil!.predikat,
            kesimpulan: terakhir.hasil!.kesimpulan,
            saran: JSON.parse(terakhir.hasil!.sarannyaJSON || "[]"),
            podcastReady: terakhir.hasil!.podcast?.status === "selesai",
            podcastId: terakhir.hasil!.podcast?.id || null,
          }
        : null,
      tugasBelumSelesai: guru.penugasan
        .filter((p) => p.status !== "selesai")
        .map((p) => ({
          judul: p.instrumen.judul,
          tenggat: p.tenggat,
          status: p.status,
        })),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
