import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  COOKIE_NAME,
  isSupervisorRole,
  signToken,
  UserRole,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed-data";
import { logActivity } from "@/lib/settings";

const LoginSchema = z.object({
  identifier: z.string().min(1, "Email atau NIP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
  expectedRole: z.enum(["admin", "guru"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rl = checkRateLimit(`login:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${rl.retryAfterSec} detik.`,
        },
        { status: 429 }
      );
    }

    await ensureSeeded(false);

    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const { identifier, password, expectedRole } = parsed.data;
    const cleanId = identifier.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanId }, { nip: cleanId }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan. Periksa kembali Email/NIP Anda." },
        { status: 401 }
      );
    }

    if (!user.aktif) {
      return NextResponse.json(
        {
          error:
            "Akun Anda sedang dinonaktifkan atau menunggu persetujuan Admin.",
        },
        { status: 403 }
      );
    }

    const userIsSupervisor = isSupervisorRole(user.role);

    if (expectedRole === "admin" && !userIsSupervisor) {
      return NextResponse.json(
        {
          error:
            "Akses ditolak: Akun Guru tidak dapat masuk melalui Portal Pimpinan/Supervisor. Silakan gunakan halaman Login Guru (/login).",
        },
        { status: 403 }
      );
    }
    if (expectedRole === "guru" && userIsSupervisor) {
      return NextResponse.json(
        {
          error:
            "Akun ini adalah akun Kepala Sekolah / Pengawas / Admin. Silakan masuk melalui Portal Pimpinan (/admin/login).",
        },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await logActivity({
        userId: user.id,
        namaUser: user.nama,
        role: user.role,
        aksi: "LOGIN_GAGAL",
        detail: "Percobaan login gagal karena password salah",
      });
      return NextResponse.json(
        { error: "Password yang Anda masukkan salah." },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const resolvedRole: UserRole =
      user.role === "kepala_sekolah" ||
      user.role === "pengawas" ||
      user.role === "admin"
        ? (user.role as UserRole)
        : "guru";

    const token = await signToken({
      userId: user.id,
      email: user.email,
      nama: user.nama,
      role: resolvedRole,
    });

    await logActivity({
      userId: user.id,
      namaUser: user.nama,
      role: resolvedRole,
      aksi: "LOGIN_BERHASIL",
      detail: `${user.nama} (${resolvedRole}) berhasil masuk ke sistem`,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: resolvedRole,
        jabatan: user.jabatan,
      },
      redirectTo: userIsSupervisor ? "/admin" : "/guru",
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memproses login.",
      },
      { status: 500 }
    );
  }
}
