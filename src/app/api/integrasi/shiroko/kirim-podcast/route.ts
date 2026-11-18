import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";
import { generatePdfBuffer } from "@/lib/export-doc";
import { triggerShirokoWebhook } from "@/lib/ai-evaluator";

/**
 * Endpoint Bot WhatsApp (Shiroko) & Pengiriman Laporan Web-to-WA.
 * Mengirimkan Laporan Resmi PDF (Base64) beserta Ringkasan Hasil & RTL Pengawas ke Bot WhatsApp
 * agar guru/supervisor bisa mengambil hasil supervisi langsung dari WA tanpa membuka web.
 * (Path URL dipertahankan untuk kompatibilitas endpoint bot WA pengguna).
 */
export async function POST(req: NextRequest) {
  try {
    const settings = await getAllSettingsDecrypted();
    const apiKeyHeader = req.headers.get("x-api-key") || "";
    const session = await getSession();

    const authorizedByApiKey =
      !settings.shiroko_secret || apiKeyHeader === settings.shiroko_secret;

    if (!session && (!apiKeyHeader || !authorizedByApiKey)) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: Diperlukan sesi login atau header x-api-key Bot WA yang valid.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { nomorWA, hasilId, penugasanId } = body;

    let hasil = null;

    if (hasilId || penugasanId) {
      hasil = await prisma.hasil.findFirst({
        where: {
          OR: [
            hasilId ? { id: String(hasilId) } : undefined,
            penugasanId ? { penugasanId: String(penugasanId) } : undefined,
          ].filter(Boolean) as { id?: string; penugasanId?: string }[],
        },
        include: {
          penugasan: {
            include: { guru: true, instrumen: true },
          },
        },
      });
    } else if (nomorWA) {
      const cleanNomor = String(nomorWA).replace(/[^0-9]/g, "");
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
      });

      if (guru) {
        const lastPenugasan = await prisma.penugasan.findFirst({
          where: {
            guruId: guru.id,
            hasil: { isNot: null },
          },
          include: {
            guru: true,
            instrumen: true,
            hasil: true,
          },
          orderBy: { updatedAt: "desc" },
        });
        if (lastPenugasan?.hasil) {
          hasil = {
            ...lastPenugasan.hasil,
            penugasan: lastPenugasan,
          };
        }
      }
    }

    if (!hasil) {
      return NextResponse.json(
        {
          error:
            "Laporan hasil supervisi untuk guru tersebut belum tersedia.",
        },
        { status: 404 }
      );
    }

    const guru = hasil.penugasan.guru;
    const skorPerAspek = (() => {
      try {
        return JSON.parse(hasil.skorPerAspekJSON || "[]");
      } catch {
        return [];
      }
    })();
    const kekuatan = (() => {
      try {
        return JSON.parse(hasil.kekuatanJSON || "[]");
      } catch {
        return [];
      }
    })();
    const saran = (() => {
      try {
        return JSON.parse(hasil.sarannyaJSON || "[]");
      } catch {
        return [];
      }
    })();

    const pdfBuffer = generatePdfBuffer(
      {
        id: hasil.id,
        namaGuru: guru.nama,
        nipGuru: guru.nip || "-",
        emailGuru: guru.email,
        mapelGuru: guru.mapel || "Umum",
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
        disahkan: hasil.disahkan,
        disahkanOleh: hasil.disahkanOleh,
        disahkanNip: hasil.disahkanNip,
        disahkanPada: hasil.disahkanPada
          ? new Date(hasil.disahkanPada).toLocaleDateString("id-ID")
          : null,
        nomorRegistrasi: hasil.nomorRegistrasi,
        rtlRekomendasi: hasil.rtlRekomendasi,
        rtlTarget: hasil.rtlTarget,
        rtlTenggat: hasil.rtlTenggat,
        rtlProgres: hasil.rtlProgres,
        pengawasNama: hasil.pengawasNama,
        pengawasNip: hasil.pengawasNip,
      },
      settings.dokumen_template_json
    );

    const safeName = guru.nama.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const fileName = `Laporan_Supervisi_${safeName}.pdf`;
    const pdfBase64 = pdfBuffer.toString("base64");

    const caption =
      `📋 *LAPORAN RESMI SUPERVISI AKADEMIK (SIPENA)*\n\n` +
      `Guru: *${guru.nama}*\n` +
      `Instrumen: *${hasil.penugasan.instrumen.judul}*\n` +
      `Nilai Akhir: *${hasil.skorTotal} / 100 (${hasil.predikat})*\n` +
      `Status: *${hasil.disahkan ? "Disahkan Kepala Sekolah" : "Draf Review"}*\n` +
      (hasil.nomorRegistrasi ? `No. Reg: ${hasil.nomorRegistrasi}\n` : "") +
      `\n📝 *Kesimpulan & Temuan:*\n${hasil.kesimpulan}\n` +
      (hasil.catatanAdmin
        ? `\n👨‍🏫 *Catatan Kepala Sekolah:*\n${hasil.catatanAdmin}\n`
        : "") +
      (hasil.rtlRekomendasi
        ? `\n🎯 *RTL Pengawas:*\n${hasil.rtlRekomendasi} (Target: ${hasil.rtlTarget || "-"}, Progres: ${hasil.rtlProgres})\n`
        : "");

    let webhookSent = false;
    if (settings.shiroko_enabled === "true" && settings.shiroko_url) {
      const wh = await triggerShirokoWebhook({
        event: "kirim_laporan_supervisi_wa",
        nomorWA: guru.nomorWA,
        guru: {
          nama: guru.nama,
          nip: guru.nip,
          mapel: guru.mapel,
          nomorWA: guru.nomorWA,
        },
        hasilId: hasil.id,
        skorTotal: hasil.skorTotal,
        predikat: hasil.predikat,
        disahkan: hasil.disahkan,
        caption,
        fileName,
        mimeType: "application/pdf",
        pdfBase64,
      }).catch(() => ({ ok: false, status: 0 }));
      webhookSent = wh.ok;
    }

    await logActivity({
      userId: guru.id,
      namaUser: session?.nama || "Bot WhatsApp Shiroko",
      role: session?.role || "system",
      aksi: "WA_BOT_KIRIM_LAPORAN",
      detail: `Mengirim Laporan PDF & Ringkasan Supervisi ke WhatsApp ${guru.nama} (${guru.nomorWA || "-"})`,
    });

    return NextResponse.json({
      success: true,
      webhookSent,
      guru: {
        nama: guru.nama,
        nomorWA: guru.nomorWA,
      },
      instrumen: hasil.penugasan.instrumen.judul,
      skorTotal: hasil.skorTotal,
      predikat: hasil.predikat,
      disahkan: hasil.disahkan,
      mimeType: "application/pdf",
      fileName,
      pdfBase64,
      caption,
      message: webhookSent
        ? `Laporan PDF & ringkasan berhasil dikirim ke Bot WA (${guru.nomorWA || "-"})!`
        : `Paket laporan PDF & ringkasan WhatsApp siap diambil oleh Bot WA (Webhook aktifkan di Pengaturan API untuk push otomatis).`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
