import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/settings";

const RegisterSchema = z.object({
  nama: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  nip: z.string().optional(),
  mapel: z.string().min(2, "Mata pelajaran wajib diisi"),
  nomorWA: z.string().optional(),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const { nama, email, nip, mapel, nomorWA, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email tersebut sudah terdaftar di sistem." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Pendaftaran mandiri guru baru menunggu persetujuan admin (aktif: false) sesuai PRD Bagian 2
    const user = await prisma.user.create({
      data: {
        nama,
        email,
        nip: nip || null,
        mapel,
        nomorWA: nomorWA || null,
        passwordHash,
        role: "guru",
        aktif: false,
      },
    });

    await logActivity({
      userId: user.id,
      namaUser: user.nama,
      role: "guru",
      aksi: "DAFTAR_MANDIRI",
      detail: `Guru baru (${nama} - ${mapel}) mendaftar mandiri dan menunggu persetujuan Admin`,
    });

    return NextResponse.json({
      success: true,
      message:
        "Pendaftaran berhasil dikirim! Akun Anda akan aktif setelah disetujui oleh Admin.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal mendaftarkan akun baru.",
      },
      { status: 500 }
    );
  }
}
