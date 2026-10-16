import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, requireGuru } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateSupervisi, generatePodcastAudio } from "@/lib/ai-evaluator";
import { logActivity } from "@/lib/settings";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireGuru();
  if (error) return error;

  const { id } = await context.params;
  const penugasan = await prisma.penugasan.findUnique({
    where: { id },
    include: {
      instrumen: {
        include: {
          pertanyaan: { orderBy: { urutan: "asc" } },
        },
      },
      jawaban: true,
      hasil: {
        include: {
          podcast: true,
        },
      },
    },
  });

  if (!penugasan) {
    return NextResponse.json(
      { error: "Tugas supervisi tidak ditemukan." },
      { status: 404 }
    );
  }

  // Pastikan guru hanya bisa melihat miliknya sendiri (PRD Bagian 2)
  if (penugasan.guruId !== session.userId) {
    return NextResponse.json(
      { error: "Akses ditolak (403): Anda hanya dapat melihat data milik sendiri." },
      { status: 403 }
    );
  }

  return NextResponse.json({ penugasan });
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
        hasil: { include: { podcast: true } },
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

    // Simpan jawaban jika dikirim dalam payload
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

    // 1. Simpan Draft Otomatis (PRD Bagian 6.2)
    if (action === "draft") {
      if (penugasan.status === "belum") {
        await prisma.penugasan.update({
          where: { id },
          data: { status: "draft" },
        });
      }
      return NextResponse.json({
        success: true,
        savedAt: new Date().toISOString(),
        message: "Draft berhasil disimpan otomatis.",
      });
    }

    // 2. Retry Evaluasi AI atau Podcast bila gagal (PRD Bagian 7.3 & 8)
    if (action === "retry") {
      const rl = checkRateLimit(`ai:${session.userId}`, 10, 60_000);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            error: `Mohon tunggu ${rl.retryAfterSec} detik sebelum mencoba evaluasi ulang.`,
          },
          { status: 429 }
        );
      }

      if (
        penugasan.hasil &&
        penugasan.hasil.status === "selesai" &&
        penugasan.hasil.podcast?.status === "gagal"
      ) {
        const podRes = await generatePodcastAudio(penugasan.hasil.id);
        return NextResponse.json({
          success: podRes.success,
          error: podRes.error,
        });
      }

      const evalRes = await evaluateSupervisi(id);
      if (!evalRes.success) {
        return NextResponse.json(
          { error: evalRes.error || "Evaluasi ulang gagal" },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        hasilId: evalRes.hasilId,
      });
    }

    // 3. Submit Penuh & Jalankan Evaluasi AI + Podcast (PRD Bagian 6.2, 7, 8)
    if (action === "submit") {
      const rl = checkRateLimit(`ai:${session.userId}`, 10, 60_000);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            error: `Terlalu banyak permintaan evaluasi AI. Silakan tunggu ${rl.retryAfterSec} detik.`,
          },
          { status: 429 }
        );
      }

      const savedJawaban = await prisma.jawaban.findMany({
        where: { penugasanId: id },
      });
      const ansMap = new Map(
        savedJawaban.map((j) => {
          try {
            return [j.pertanyaanId, JSON.parse(j.nilaiJSON)];
          } catch {
            return [j.pertanyaanId, j.nilaiJSON];
          }
        })
      );

      // Validasi pertanyaan wajib sebelum submit
      for (const q of penugasan.instrumen.pertanyaan) {
        if (q.wajib) {
          const val = ansMap.get(q.id);
          if (
            val === undefined ||
            val === null ||
            String(val).trim() === ""
          ) {
            return NextResponse.json(
              {
                error: `Pertanyaan wajib nomor ${q.urutan} pada aspek "${q.aspek}" belum diisi.`,
              },
              { status: 400 }
            );
          }
        }
      }

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "guru",
        aksi: "SUBMIT_INSTRUMEN",
        detail: `${session.nama} mengirim jawaban instrumen "${penugasan.instrumen.judul}"`,
      });

      const evalRes = await evaluateSupervisi(id);
      if (!evalRes.success) {
        return NextResponse.json(
          {
            error:
              evalRes.error ||
              "Terjadi kendala saat mengevaluasi dengan AI. Anda dapat menekan tombol Coba Lagi.",
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
