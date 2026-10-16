import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuestionsWithAI } from "@/lib/ai-evaluator";
import { logActivity } from "@/lib/settings";

const PertanyaanSchema = z.object({
  id: z.string().optional(),
  teks: z.string().min(3),
  tipe: z.enum(["skala", "pilihan_ganda", "ya_tidak", "isian_singkat", "esai"]),
  aspek: z.string().min(2),
  bobot: z.number().min(0.1).max(10).default(1.0),
  urutan: z.number().int().min(1),
  wajib: z.boolean().default(true),
  opsi: z.array(z.string()).default([]),
});

const CreateInstrumenSchema = z.object({
  judul: z.string().min(3, "Judul instrumen minimal 3 karakter"),
  deskripsi: z.string().min(5, "Deskripsi minimal 5 karakter"),
  status: z.enum(["aktif", "draft", "arsip"]).default("aktif"),
  pertanyaan: z.array(PertanyaanSchema).default([]),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const instrumenList = await prisma.instrumen.findMany({
    include: {
      pertanyaan: { orderBy: { urutan: "asc" } },
      _count: {
        select: { penugasan: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ instrumen: instrumenList });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();

    // Jika request adalah "Buat pertanyaan dengan AI" (PRD 5.3)
    if (body.action === "generate_ai") {
      const topik = String(body.topik || "Supervisi Akademik & Penguasaan IT");
      const jumlah = Number(body.jumlah || 5);
      const questions = await generateQuestionsWithAI({ topik, jumlah });
      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "admin",
        aksi: "AI_GENERATE_PERTANYAAN",
        detail: `Sensei-AI menyusun ${questions.length} saran pertanyaan untuk topik "${topik}"`,
      });
      return NextResponse.json({ success: true, questions });
    }

    const parsed = CreateInstrumenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data instrumen tidak valid" },
        { status: 400 }
      );
    }

    const { judul, deskripsi, status, pertanyaan } = parsed.data;

    const created = await prisma.instrumen.create({
      data: {
        judul,
        deskripsi,
        status,
        versi: 1,
        pertanyaan: {
          create: pertanyaan.map((p, idx) => ({
            teks: p.teks,
            tipe: p.tipe,
            aspek: p.aspek,
            bobot: p.bobot,
            urutan: p.urutan || idx + 1,
            wajib: p.wajib,
            opsiJSON: JSON.stringify(p.opsi || []),
          })),
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
      aksi: "BUAT_INSTRUMEN",
      detail: `Membuat instrumen baru "${judul}" (${pertanyaan.length} pertanyaan)`,
    });

    return NextResponse.json({ success: true, instrumen: created });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menyimpan instrumen.",
      },
      { status: 500 }
    );
  }
}
