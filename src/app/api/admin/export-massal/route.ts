import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";
import { generatePdfBuffer } from "@/lib/export-doc";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const format = req.nextUrl.searchParams.get("format") || "csv";

  const hasilList = await prisma.hasil.findMany({
    where: { status: "selesai" },
    include: {
      penugasan: {
        include: {
          guru: true,
          instrumen: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (format === "zip") {
    const settings = await getAllSettingsDecrypted();
    const zip = new JSZip();

    for (const h of hasilList) {
      let skorPerAspek: { aspek: string; skor: number; alasan: string }[] = [];
      let kekuatan: string[] = [];
      let saran: string[] = [];
      try {
        skorPerAspek = JSON.parse(h.skorPerAspekJSON || "[]");
        kekuatan = JSON.parse(h.kekuatanJSON || "[]");
        saran = JSON.parse(h.sarannyaJSON || "[]");
      } catch {
        // ignore
      }

      const pdfBuf = generatePdfBuffer(
        {
          id: h.id,
          namaGuru: h.penugasan.guru.nama,
          nipGuru: h.penugasan.guru.nip || "-",
          emailGuru: h.penugasan.guru.email,
          mapelGuru: h.penugasan.guru.mapel || "Umum",
          judulInstrumen: h.penugasan.instrumen.judul,
          versiInstrumen: h.penugasan.instrumen.versi,
          tanggalEvaluasi: new Date(h.createdAt).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          skorTotal: h.skorTotal,
          skorAsliAI: h.skorAsliAI,
          predikat: h.predikat,
          kesimpulan: h.kesimpulan,
          kekuatan,
          saran,
          skorPerAspek,
          catatanAdmin: h.catatanAdmin,
          diubahAdminOleh: h.diubahAdminOleh,
        },
        settings.dokumen_template_json
      );

      const safeName = h.penugasan.guru.nama
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 35);
      zip.file(`Laporan_Supervisi_${safeName}_${h.id.slice(-5)}.pdf`, pdfBuf);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "EXPORT_MASSAL_ZIP",
      detail: `Mengunduh arsip ZIP laporan PDF massal (${hasilList.length} dokumen)`,
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="Rekap_Supervisi_Massal_SenseiAI.zip"`,
      },
    });
  }

  // Default: Rekap CSV / Excel
  const headers = [
    "No",
    "Nama Guru",
    "NIP",
    "Email",
    "Mata Pelajaran",
    "Instrumen",
    "Versi",
    "Tanggal Evaluasi",
    "Skor Total",
    "Predikat",
    "Kesimpulan AI",
    "Catatan Admin",
  ];

  const rows = hasilList.map((h, idx) => [
    String(idx + 1),
    `"${h.penugasan.guru.nama.replace(/"/g, '""')}"`,
    `"${(h.penugasan.guru.nip || "-").replace(/"/g, '""')}"`,
    `"${h.penugasan.guru.email}"`,
    `"${(h.penugasan.guru.mapel || "Umum").replace(/"/g, '""')}"`,
    `"${h.penugasan.instrumen.judul.replace(/"/g, '""')}"`,
    `v${h.penugasan.instrumen.versi}`,
    `"${new Date(h.createdAt).toLocaleDateString("id-ID")}"`,
    String(h.skorTotal),
    `"${h.predikat}"`,
    `"${h.kesimpulan.replace(/"/g, '""')}"`,
    `"${(h.catatanAdmin || "-").replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  await logActivity({
    userId: session.userId,
    namaUser: session.nama,
    role: "admin",
    aksi: "EXPORT_REKAP_CSV",
    detail: `Mengunduh rekapitulasi CSV hasil supervisi (${hasilList.length} baris)`,
  });

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Rekap_Supervisi_SenseiAI.csv"`,
    },
  });
}
