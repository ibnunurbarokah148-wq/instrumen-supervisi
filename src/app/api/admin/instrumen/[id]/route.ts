import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/settings";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.instrumen.findUnique({
      where: { id },
      include: {
        pertanyaan: true,
        penugasan: {
          include: {
            _count: { select: { jawaban: true } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Instrumen tidak ditemukan." },
        { status: 404 }
      );
    }

    const totalJawabanTersimpan = existing.penugasan.reduce(
      (acc, p) => acc + p._count.jawaban,
      0
    );

    const incomingQuestions = Array.isArray(body.pertanyaan)
      ? body.pertanyaan
      : [];

    // Sesuai PRD 5.3: jika instrumen sudah punya jawaban dan daftar pertanyaan diubah, buat versi baru agar jawaban lama tetap utuh
    if (totalJawabanTersimpan > 0 && body.createNewVersion !== false && incomingQuestions.length > 0) {
      const newVersionNum = existing.versi + 1;
      const newInstrumen = await prisma.instrumen.create({
        data: {
          judul: body.judul || existing.judul,
          deskripsi: body.deskripsi || existing.deskripsi,
          versi: newVersionNum,
          parentId: existing.parentId || existing.id,
          status: body.status || "aktif",
          pertanyaan: {
            create: incomingQuestions.map(
              (
                p: {
                  teks: string;
                  tipe: string;
                  aspek: string;
                  bobot: number;
                  urutan?: number;
                  wajib?: boolean;
                  opsi?: string[];
                  opsiJSON?: string;
                },
                idx: number
              ) => ({
                teks: p.teks,
                tipe: p.tipe || "skala",
                aspek: p.aspek || "Perencanaan",
                bobot: Number(p.bobot) || 1.0,
                urutan: idx + 1,
                wajib: p.wajib !== false,
                opsiJSON: Array.isArray(p.opsi)
                  ? JSON.stringify(p.opsi)
                  : p.opsiJSON || "[]",
              })
            ),
          },
        },
        include: {
          pertanyaan: { orderBy: { urutan: "asc" } },
        },
      });

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "admin",
        aksi: "VERSI_BARU_INSTRUMEN",
        detail: `Perubahan pada "${existing.judul}" membuat Versi v${newVersionNum} otomatis (jawaban pada v${existing.versi} tetap utuh)`,
      });

      return NextResponse.json({
        success: true,
        versionCreated: true,
        message: `Instrumen telah memiliki jawaban guru. Sistem otomatis membuat Versi Baru (v${newVersionNum}) agar jawaban lama pada v${existing.versi} tetap utuh!`,
        instrumen: newInstrumen,
      });
    }

    // Jika belum ada jawaban (atau hanya mengubah status/judul), perbarui langsung
    await prisma.pertanyaan.deleteMany({ where: { instrumenId: id } });

    const updated = await prisma.instrumen.update({
      where: { id },
      data: {
        judul: body.judul ?? existing.judul,
        deskripsi: body.deskripsi ?? existing.deskripsi,
        status: body.status ?? existing.status,
        pertanyaan: {
          create: incomingQuestions.map(
            (
              p: {
                teks: string;
                tipe: string;
                aspek: string;
                bobot: number;
                wajib?: boolean;
                opsi?: string[];
                opsiJSON?: string;
              },
              idx: number
            ) => ({
              teks: p.teks,
              tipe: p.tipe || "skala",
              aspek: p.aspek || "Perencanaan",
              bobot: Number(p.bobot) || 1.0,
              urutan: idx + 1,
              wajib: p.wajib !== false,
              opsiJSON: Array.isArray(p.opsi)
                ? JSON.stringify(p.opsi)
                : p.opsiJSON || "[]",
            })
          ),
        },
      },
      include: {
        pertanyaan: { orderBy: { urutan: "asc" } },
      },
    });

    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "EDIT_INSTRUMEN",
      detail: `Memperbarui instrumen "${updated.judul}" (v${updated.versi})`,
    });

    return NextResponse.json({
      success: true,
      versionCreated: false,
      message: "Instrumen berhasil diperbarui!",
      instrumen: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal memperbarui instrumen.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await context.params;
    const item = await prisma.instrumen.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json(
        { error: "Instrumen tidak ditemukan." },
        { status: 404 }
      );
    }

    await prisma.instrumen.delete({ where: { id } });
    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "HAPUS_INSTRUMEN",
      detail: `Menghapus instrumen "${item.judul}"`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menghapus instrumen.",
      },
      { status: 500 }
    );
  }
}
