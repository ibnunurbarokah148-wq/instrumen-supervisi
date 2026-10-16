import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/settings";
import { triggerShirokoWebhook } from "@/lib/ai-evaluator";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [guruList, instrumenList] = await Promise.all([
    prisma.user.findMany({
      where: { role: "guru" },
      select: {
        id: true,
        nama: true,
        email: true,
        nip: true,
        nomorWA: true,
        mapel: true,
        aktif: true,
        lastLoginAt: true,
        createdAt: true,
        penugasan: {
          include: {
            instrumen: { select: { id: true, judul: true, versi: true } },
            hasil: { select: { id: true, skorTotal: true, predikat: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.instrumen.findMany({
      where: { status: "aktif" },
      select: { id: true, judul: true, versi: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ guru: guruList, instrumenAktif: instrumenList });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();

    // 1. Impor CSV Guru (PRD 5.4)
    if (body.action === "import_csv") {
      const rows: {
        nama: string;
        email: string;
        nip?: string;
        mapel?: string;
        nomorWA?: string;
        password?: string;
      }[] = Array.isArray(body.rows) ? body.rows : [];

      if (rows.length === 0) {
        return NextResponse.json(
          { error: "Data CSV kosong atau format tidak sesuai." },
          { status: 400 }
        );
      }

      let importedCount = 0;
      const defaultHash = await bcrypt.hash("guru123", 10);

      for (const r of rows) {
        if (!r.nama || !r.email) continue;
        const exists = await prisma.user.findUnique({
          where: { email: r.email.trim() },
        });
        if (exists) continue;

        const hash = r.password
          ? await bcrypt.hash(r.password, 10)
          : defaultHash;

        await prisma.user.create({
          data: {
            nama: r.nama.trim(),
            email: r.email.trim(),
            nip: r.nip?.trim() || null,
            mapel: r.mapel?.trim() || "Umum",
            nomorWA: r.nomorWA?.trim() || null,
            passwordHash: hash,
            role: "guru",
            aktif: true,
          },
        });
        importedCount++;
      }

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "admin",
        aksi: "IMPOR_CSV_GURU",
        detail: `Mengimpor ${importedCount} akun guru baru melalui CSV`,
      });

      return NextResponse.json({
        success: true,
        importedCount,
        message: `Berhasil mengimpor ${importedCount} data guru baru!`,
      });
    }

    // 2. Penugasan Instrumen ke Guru / Kelompok Guru (PRD 5.4)
    if (body.action === "assign_instrumen") {
      const instrumenId = String(body.instrumenId || "");
      const guruIds: string[] = Array.isArray(body.guruIds) ? body.guruIds : [];
      const tenggatStr = String(body.tenggat || "");
      const kirimNotifikasiWA = Boolean(body.kirimNotifikasiWA);

      if (!instrumenId || guruIds.length === 0 || !tenggatStr) {
        return NextResponse.json(
          { error: "Pilih instrumen, minimal 1 guru, dan tanggal tenggat." },
          { status: 400 }
        );
      }

      const instrumen = await prisma.instrumen.findUnique({
        where: { id: instrumenId },
      });
      if (!instrumen) {
        return NextResponse.json(
          { error: "Instrumen tidak ditemukan." },
          { status: 404 }
        );
      }

      let assignedCount = 0;
      for (const gId of guruIds) {
        await prisma.penugasan.create({
          data: {
            instrumenId,
            guruId: gId,
            tenggat: new Date(tenggatStr),
            status: "belum",
          },
        });
        assignedCount++;
      }

      if (kirimNotifikasiWA) {
        triggerShirokoWebhook({
          event: "penugasan_supervisi_baru",
          instrumen: instrumen.judul,
          tenggat: tenggatStr,
          jumlahGuru: assignedCount,
        }).catch(() => {});
      }

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "admin",
        aksi: "PENUGASAN_INSTRUMEN",
        detail: `Menugaskan "${instrumen.judul}" kepada ${assignedCount} guru (tenggat: ${tenggatStr})`,
      });

      return NextResponse.json({
        success: true,
        message: `Instrumen "${instrumen.judul}" berhasil ditugaskan kepada ${assignedCount} guru!`,
      });
    }

    // 3. Tambah Guru Tunggal
    const { nama, email, nip, mapel, nomorWA, password } = body;
    if (!nama || !email) {
      return NextResponse.json(
        { error: "Nama dan Email guru wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: String(email).trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email tersebut sudah digunakan oleh akun lain." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password || "guru123", 10);
    const created = await prisma.user.create({
      data: {
        nama: String(nama).trim(),
        email: String(email).trim(),
        nip: nip ? String(nip).trim() : null,
        mapel: mapel ? String(mapel).trim() : "Umum",
        nomorWA: nomorWA ? String(nomorWA).trim() : null,
        passwordHash,
        role: "guru",
        aktif: true,
      },
    });

    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "TAMBAH_GURU",
      detail: `Menambahkan akun guru: ${created.nama} (${created.email})`,
    });

    return NextResponse.json({
      success: true,
      message: `Akun guru ${created.nama} berhasil dibuat!`,
      guru: created,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal memproses data guru.",
      },
      { status: 500 }
    );
  }
}
