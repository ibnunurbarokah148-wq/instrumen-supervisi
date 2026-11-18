import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireGuru } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateSupervisi, parseStructuredJawaban } from "@/lib/ai-evaluator";
import { logActivity } from "@/lib/settings";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireGuru();
  if (error) return error;

  const { id } = await context.params;
  const [penugasan, perangkatTerbaru] = await Promise.all([
    prisma.penugasan.findUnique({
      where: { id },
      include: {
        guru: {
          select: {
            id: true,
            nama: true,
            nip: true,
            mapel: true,
            unitKerja: true,
            nomorWA: true,
          },
        },
        instrumen: {
          include: {
            pertanyaan: { orderBy: { urutan: "asc" } },
          },
        },
        jawaban: true,
        hasil: true,
      },
    }),
    prisma.perangkatSupervisi.findFirst({
      where: { guruId: session.userId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!penugasan) {
    return NextResponse.json(
      { error: "Tugas supervisi tidak ditemukan." },
      { status: 404 }
    );
  }

  if (penugasan.guruId !== session.userId) {
    return NextResponse.json(
      {
        error:
          "Akses ditolak (403): Anda hanya dapat mengakses data supervisi milik sendiri.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ penugasan, perangkatTerbaru });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireGuru();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const action = String(body.action || "draft");

    const penugasan = await prisma.penugasan.findUnique({
      where: { id },
      include: {
        instrumen: {
          include: {
            pertanyaan: { orderBy: { urutan: "asc" } },
          },
        },
        hasil: true,
      },
    });

    if (!penugasan) {
      return NextResponse.json(
        { error: "Tugas supervisi tidak ditemukan." },
        { status: 404 }
      );
    }

    if (penugasan.guruId !== session.userId) {
      return NextResponse.json(
        { error: "Akses ditolak (403): Bukan penugasan milik Anda." },
        { status: 403 }
      );
    }

    // Update progres RTL oleh Guru (pada laporan yang sudah memiliki RTL Pengawas)
    if (action === "update_rtl_progres") {
      if (!penugasan.hasil) {
        return NextResponse.json(
          { error: "Hasil supervisi tidak ditemukan." },
          { status: 404 }
        );
      }
      const rtlProgres = String(body.rtlProgres || "Sedang Berjalan");
      const updatedHasil = await prisma.hasil.update({
        where: { id: penugasan.hasil.id },
        data: { rtlProgres },
      });
      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "guru",
        aksi: "UPDATE_PROGRES_RTL",
        detail: `${session.nama} memperbarui progres RTL menjadi "${rtlProgres}"`,
      });
      return NextResponse.json({
        success: true,
        hasil: updatedHasil,
        message: `Progres Rencana Tindak Lanjut diperbarui menjadi: ${rtlProgres}`,
      });
    }

    // Cegah perubahan instrumen jika laporan sudah disahkan (Immutable)
    if (penugasan.hasil?.disahkan) {
      return NextResponse.json(
        {
          error:
            "Instrumen tidak dapat diubah karena laporan telah disahkan permanen (Immutable) oleh Kepala Sekolah.",
        },
        { status: 403 }
      );
    }

    // Simpan jawaban terstruktur ({ nilai, catatan, buktiUrl }) atau nilai sederhana
    const answers: Record<string, unknown> =
      body.answers && typeof body.answers === "object" ? body.answers : {};

    for (const [pertanyaanId, val] of Object.entries(answers)) {
      if (val === undefined) continue;
      await prisma.jawaban.upsert({
        where: {
          penugasanId_pertanyaanId: {
            penugasanId: id,
            pertanyaanId,
          },
        },
        update: { nilaiJSON: JSON.stringify(val) },
        create: {
          penugasanId: id,
          pertanyaanId,
          nilaiJSON: JSON.stringify(val),
        },
      });
    }

    // 1. Simpan Draft Otomatis
    if (action === "draft") {
      if (penugasan.status === "belum" || penugasan.status === "perlu_revisi") {
        await prisma.penugasan.update({
          where: { id },
          data: { status: "draft" },
        });
      }
      return NextResponse.json({
        success: true,
        savedAt: new Date().toISOString(),
        message: "Draf evaluasi diri tersimpan otomatis.",
      });
    }

    // Validasi pertanyaan wajib untuk submit_verifikasi maupun submit (evaluasi AI)
    if (action === "submit_verifikasi" || action === "submit") {
      const savedJawaban = await prisma.jawaban.findMany({
        where: { penugasanId: id },
      });
      const ansMap = new Map(
        savedJawaban.map((j) => [j.pertanyaanId, parseStructuredJawaban(j.nilaiJSON)])
      );

      for (const q of penugasan.instrumen.pertanyaan) {
        if (q.wajib) {
          const parsed = ansMap.get(q.id);
          if (
            !parsed ||
            parsed.nilai === undefined ||
            parsed.nilai === null ||
            String(parsed.nilai).trim() === ""
          ) {
            return NextResponse.json(
              {
                error: `Indikator wajib nomor ${q.urutan} pada aspek "${q.aspek}" belum diisi.`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // 2. Ajukan Verifikasi ke Kepala Sekolah (tanpa wajib AI terlebih dahulu)
    if (action === "submit_verifikasi") {
      const latestPerangkat = await prisma.perangkatSupervisi.findFirst({
        where: { guruId: session.userId },
        orderBy: { updatedAt: "desc" },
      });
      const nextStatus =
        latestPerangkat?.statusVerifikasi === "lengkap"
          ? "dalam_penilaian"
          : "menunggu_verifikasi";

      await prisma.penugasan.update({
        where: { id },
        data: {
          status: nextStatus,
          catatanVerifikasi: null,
        },
      });

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "guru",
        aksi: "AJUKAN_VERIFIKASI_SUPERVISI",
        detail: `${session.nama} mengajukan evaluasi diri & bukti instrumen "${penugasan.instrumen.judul}" (Status: ${nextStatus})`,
      });

      return NextResponse.json({
        success: true,
        status: nextStatus,
        penugasanId: id,
        message:
          nextStatus === "dalam_penilaian"
            ? "Perangkat ajar sudah lengkap. Evaluasi diri diteruskan ke tahap Penilaian Kepala Sekolah."
            : "Evaluasi diri berhasil diajukan untuk Verifikasi Kepala Sekolah.",
      });
    }

    // 3. Retry Evaluasi AI Co-Evaluator
    if (action === "retry") {
      const rl = checkRateLimit(`ai:${session.userId}`, 10, 60_000);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            error: `Mohon tunggu ${rl.retryAfterSec} detik sebelum mencoba analisis ulang.`,
          },
          { status: 429 }
        );
      }

      const evalRes = await evaluateSupervisi(id, {
        triggeredBy: "guru",
        evaluatorName: session.nama,
      });
      if (!evalRes.success) {
        return NextResponse.json(
          { error: evalRes.error || "Analisis AI Co-Evaluator gagal." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        hasilId: evalRes.hasilId,
      });
    }

    // 4. Submit & Susun Draf Analisis via AI Co-Evaluator untuk Kepala Sekolah
    if (action === "submit") {
      const rl = checkRateLimit(`ai:${session.userId}`, 10, 60_000);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            error: `Terlalu banyak permintaan analisis AI. Silakan tunggu ${rl.retryAfterSec} detik.`,
          },
          { status: 429 }
        );
      }

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "guru",
        aksi: "SUBMIT_INSTRUMEN",
        detail: `${session.nama} mengirim evaluasi diri instrumen "${penugasan.instrumen.judul}" untuk analisis AI Co-Evaluator & penilaian Kepala Sekolah`,
      });

      const evalRes = await evaluateSupervisi(id, {
        triggeredBy: "guru",
        evaluatorName: session.nama,
      });
      if (!evalRes.success) {
        return NextResponse.json(
          {
            error:
              evalRes.error ||
              "Kendala menyusun draf analisis AI. Jawaban tetap tersimpan — Anda dapat langsung menekan 'Ajukan Verifikasi ke Kepala Sekolah' tanpa AI.",
            hasilId: evalRes.hasilId,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        hasilId: evalRes.hasilId,
        penugasanId: id,
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memproses jawaban.",
      },
      { status: 500 }
    );
  }
}
