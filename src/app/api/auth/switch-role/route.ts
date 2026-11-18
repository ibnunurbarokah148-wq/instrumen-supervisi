import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_NAME,
  isSupervisorRole,
  signToken,
  UserRole,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed-data";
import { logActivity } from "@/lib/settings";

const SwitchSchema = z.object({
  role: z.enum(["guru", "kepala_sekolah", "pengawas", "admin"]),
  userId: z.string().optional(),
});

/**
 * Endpoint demo 1-klik untuk berpindah antar 4 peran SIPENA
 * (Guru, Kepala Sekolah, Pengawas Sekolah, Admin Sistem).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureSeeded(false);

    const body = await req.json();
    const parsed = SwitchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Peran tidak valid." },
        { status: 400 }
      );
    }

    const { role, userId } = parsed.data;

    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst({
          where: { role, aktif: true },
          orderBy: { createdAt: "asc" },
        });

    if (!user || !user.aktif) {
      return NextResponse.json(
        { error: `Akun contoh untuk peran "${role}" tidak ditemukan.` },
        { status: 404 }
      );
    }

    const resolvedRole = (user.role as UserRole) || role;
    const token = await signToken({
      userId: user.id,
      email: user.email,
      nama: user.nama,
      role: resolvedRole,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await logActivity({
      userId: user.id,
      namaUser: user.nama,
      role: resolvedRole,
      aksi: "SWITCH_ROLE_DEMO",
      detail: `Berpindah sesi cepat ke peran ${resolvedRole.toUpperCase()} (${user.nama})`,
    });

    const redirectTo = isSupervisorRole(resolvedRole) ? "/admin" : "/guru";

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: resolvedRole,
        jabatan: user.jabatan,
      },
      redirectTo,
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
            : "Gagal melakukan perpindahan peran.",
      },
      { status: 500 }
    );
  }
}
