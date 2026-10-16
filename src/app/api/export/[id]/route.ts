import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";
import {
  ExportHasilData,
  generatePdfBuffer,
  generateWordBuffer,
} from "@/lib/export-doc";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;
  const format = (req.nextUrl.searchParams.get("format") || "pdf").toLowerCase();

  // Cari berdasarkan hasil.id atau hasil.penugasanId
  const hasil = await prisma.hasil.findFirst({
    where: {
      OR: [{ id }, { penugasanId: id }],
    },
    include: {
      penugasan: {
        include: {
          guru: true,
          instrumen: true,
        },
      },
    },
  });

  if (!hasil) {
    return NextResponse.json(
      { error: "Data hasil supervisi tidak ditemukan." },
      { status: 404 }
    );
  }

  // Aturan wajib PRD Bagian 9: Guru hanya bisa export hasil miliknya sendiri
  if (
    session.role === "guru" &&
    hasil.penugasan.guruId !== session.userId
  ) {
    return NextResponse.json(
      { error: "Akses ditolak (403): Anda hanya diizinkan mengunduh dokumen hasil milik sendiri." },
      { status: 403 }
    );
  }

  const settings = await getAllSettingsDecrypted();
  let skorPerAspek: { aspek: string; skor: number; alasan: string }[] = [];
  let kekuatan: string[] = [];
  let saran: string[] = [];

  try {
    skorPerAspek = JSON.parse(hasil.skorPerAspekJSON || "[]");
    kekuatan = JSON.parse(hasil.kekuatanJSON || "[]");
    saran = JSON.parse(hasil.sarannyaJSON || "[]");
  } catch {
    // ignore
  }

  const exportData: ExportHasilData = {
    id: hasil.id,
    namaGuru: hasil.penugasan.guru.nama,
    nipGuru: hasil.penugasan.guru.nip || "-",
    emailGuru: hasil.penugasan.guru.email,
    mapelGuru: hasil.penugasan.guru.mapel || "Umum",
    judulInstrumen: hasil.penugasan.instrumen.judul,
    versiInstrumen: hasil.penugasan.instrumen.versi,
    tanggalEvaluasi: new Date(hasil.createdAt).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    skorTotal: hasil.skorTotal,
    skorAsliAI: hasil.skorAsliAI,
    predikat: hasil.predikat,
    kesimpulan: hasil.kesimpulan,
    kekuatan,
    saran,
    skorPerAspek,
    catatanAdmin: hasil.catatanAdmin,
    diubahAdminOleh: hasil.diubahAdminOleh,
  };

  const safeGuruName = exportData.namaGuru
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 30);

  if (format === "docx" || format === "word") {
    const wordBuf = await generateWordBuffer(
      exportData,
      settings.dokumen_template_json
    );
    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: session.role,
      aksi: "EXPORT_WORD",
      detail: `Export dokumen Word (.docx) hasil supervisi ${exportData.namaGuru}`,
    });

    return new NextResponse(new Uint8Array(wordBuf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Laporan_Supervisi_${safeGuruName}.docx"`,
      },
    });
  }

  const pdfBuf = generatePdfBuffer(exportData, settings.dokumen_template_json);
  await logActivity({
    userId: session.userId,
    namaUser: session.nama,
    role: session.role,
    aksi: "EXPORT_PDF",
    detail: `Export dokumen PDF hasil supervisi ${exportData.namaGuru}`,
  });

  return new NextResponse(new Uint8Array(pdfBuf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Laporan_Supervisi_${safeGuruName}.pdf"`,
    },
  });
}
