import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";

function formatTahapanLabel(status: string, disahkan?: boolean): string {
  switch (status) {
    case "tindak_lanjut":
      return "Tahap 7: Tindak Lanjut Pengawas (RTL Aktif)";
    case "selesai":
      return disahkan
        ? "Tahap 6: Disahkan Kepala Sekolah (Terkunci / Tersedia bagi Pengawas)"
        : "Tahap 6: Selesai Evaluasi";
    case "dalam_penilaian":
      return "Tahap 5: Dalam Penilaian Observasi Kepala Sekolah";
    case "perlu_revisi":
      return "Tahap 4: Dikembalikan (Perlu Revisi Berkas/Isian)";
    case "menunggu_verifikasi":
      return "Tahap 3: Menunggu Verifikasi Kepala Sekolah";
    case "draft":
      return "Tahap 2: Draf Evaluasi Diri Guru";
    default:
      return "Tahap 1: Penugasan Baru (Belum Dikerjakan)";
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ nomor: string }> }
) {
  try {
    const settings = await getAllSettingsDecrypted();
    const apiKeyHeader = req.headers.get("x-api-key") || "";

    if (
      settings.shiroko_secret &&
      apiKeyHeader &&
      apiKeyHeader !== settings.shiroko_secret
    ) {
      return NextResponse.json(
        { error: "Unauthorized: x-api-key tidak valid." },
        { status: 401 }
      );
    }
    if (settings.shiroko_secret && !apiKeyHeader) {
      return NextResponse.json(
        { error: "Unauthorized: Header x-api-key wajib disertakan." },
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
            hasil: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        perangkat: {
          orderBy: { updatedAt: "desc" },
          take: 1,
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

    let pesanWASiapKirim = `📋 *RINGKASAN SUPERVISI AKADEMIK SIPENA*\nNama: *${guru.nama}*\nNIP: ${guru.nip || "-"}\nMapel: ${guru.mapel || "Umum"}\n\n`;

    if (terakhir?.hasil) {
      const h = terakhir.hasil;
      const saranList: string[] = (() => {
        try {
          return JSON.parse(h.sarannyaJSON || "[]");
        } catch {
          return [];
        }
      })();
      pesanWASiapKirim +=
        `📌 *Instrumen:* ${terakhir.instrumen.judul}\n` +
        `🏷️ *Tahapan:* ${formatTahapanLabel(terakhir.status, h.disahkan)}\n` +
        `⭐ *Nilai Akhir:* *${h.skorTotal} / 100* (*${h.predikat}*)\n` +
        (h.nomorRegistrasi ? `📄 *No. Registrasi:* ${h.nomorRegistrasi}\n` : "") +
        `\n📝 *Temuan & Kesimpulan:*\n${h.kesimpulan}\n` +
        (h.catatanAdmin
          ? `\n👨‍🏫 *Catatan Kepala Sekolah:*\n${h.catatanAdmin}\n`
          : "") +
        (saranList.length > 0
          ? `\n💡 *Rekomendasi Pembinaan:*\n${saranList
              .map((s, i) => `${i + 1}. ${s}`)
              .join("\n")}\n`
          : "") +
        (h.rtlRekomendasi
          ? `\n🎯 *Rencana Tindak Lanjut (RTL) Pengawas:*\n• Rekomendasi: ${h.rtlRekomendasi}\n• Target: ${h.rtlTarget || "-"}\n• Tenggat: ${h.rtlTenggat || "-"}\n• Status Progres: *${h.rtlProgres}*\n`
          : "");
    } else {
      pesanWASiapKirim += `Saat ini belum ada hasil evaluasi supervisi yang selesai.`;
    }

    await logActivity({
      userId: guru.id,
      namaUser: "Bot WhatsApp Shiroko",
      role: "system",
      aksi: "WA_BOT_GET_HASIL",
      detail: `Bot WA mengambil ringkasan hasil supervisi ${guru.nama} (${cleanNomor})`,
    });

    const origin = req.nextUrl.origin;

    return NextResponse.json({
      guru: {
        nama: guru.nama,
        nip: guru.nip,
        mapel: guru.mapel,
        unitKerja: guru.unitKerja,
        nomorWA: guru.nomorWA,
      },
      statusPerangkatTerbaru: guru.perangkat[0]
        ? {
            judul: guru.perangkat[0].judulPembelajaran,
            statusVerifikasi: guru.perangkat[0].statusVerifikasi,
            catatanSupervisor: guru.perangkat[0].catatanSupervisor,
          }
        : null,
      ringkasanPenugasan: {
        total: guru.penugasan.length,
        menungguVerifikasi: guru.penugasan.filter(
          (p) => p.status === "menunggu_verifikasi"
        ).length,
        perluRevisi: guru.penugasan.filter((p) => p.status === "perlu_revisi")
          .length,
        dalamPenilaian: guru.penugasan.filter(
          (p) => p.status === "dalam_penilaian"
        ).length,
        disahkan: guru.penugasan.filter(
          (p) => p.status === "selesai" || p.status === "tindak_lanjut"
        ).length,
      },
      hasilTerakhir: terakhir?.hasil
        ? {
            id: terakhir.hasil.id,
            penugasanId: terakhir.id,
            instrumen: terakhir.instrumen.judul,
            tanggal: terakhir.hasil.createdAt,
            statusTahapan: terakhir.status,
            statusLabel: formatTahapanLabel(
              terakhir.status,
              terakhir.hasil.disahkan
            ),
            disahkan: terakhir.hasil.disahkan,
            disahkanOleh: terakhir.hasil.disahkanOleh,
            nomorRegistrasi: terakhir.hasil.nomorRegistrasi,
            skorTotal: terakhir.hasil.skorTotal,
            predikat: terakhir.hasil.predikat,
            kesimpulan: terakhir.hasil.kesimpulan,
            kekuatan: JSON.parse(terakhir.hasil.kekuatanJSON || "[]"),
            saran: JSON.parse(terakhir.hasil.sarannyaJSON || "[]"),
            skorPerAspek: JSON.parse(terakhir.hasil.skorPerAspekJSON || "[]"),
            catatanKepalaSekolah: terakhir.hasil.catatanAdmin,
            rencanaTindakLanjut: terakhir.hasil.rtlRekomendasi
              ? {
                  rekomendasi: terakhir.hasil.rtlRekomendasi,
                  target: terakhir.hasil.rtlTarget,
                  tenggat: terakhir.hasil.rtlTenggat,
                  progres: terakhir.hasil.rtlProgres,
                  pengawasNama: terakhir.hasil.pengawasNama,
                }
              : null,
            downloadPdfUrl: `${origin}/api/export/${terakhir.hasil.id}?format=pdf`,
            downloadDocxUrl: `${origin}/api/export/${terakhir.hasil.id}?format=docx`,
          }
        : null,
      tugasAktif: guru.penugasan
        .filter((p) => p.status !== "selesai" && p.status !== "tindak_lanjut")
        .map((p) => ({
          id: p.id,
          judul: p.instrumen.judul,
          tenggat: p.tenggat,
          status: p.status,
          statusLabel: formatTahapanLabel(p.status, false),
          catatanVerifikasi: p.catatanVerifikasi,
        })),
      pesanWASiapKirim,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
