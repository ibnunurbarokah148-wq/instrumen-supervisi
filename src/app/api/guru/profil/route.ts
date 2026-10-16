import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireGuru } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/settings";

export async function PUT(req: NextRequest) {
  const { session, error } = await requireGuru();
  if (error) return error;

  try {
    const body = await req.json();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.nama === "string" && body.nama.trim().length >= 2) {
      updateData.nama = body.nama.trim();
    }
    if (typeof body.nip === "string") {
      updateData.nip = body.nip.trim() || null;
    }
    if (typeof body.mapel === "string") {
      updateData.mapel = body.mapel.trim();
    }
    if (typeof body.nomorWA === "string") {
      updateData.nomorWA = body.nomorWA.trim() || null;
    }
    if (typeof body.fotoUrl === "string") {
      updateData.fotoUrl = body.fotoUrl.trim() || null;
    }

    if (body.passwordBaru && String(body.passwordBaru).length >= 6) {
      if (body.passwordLama) {
        const match = await bcrypt.compare(
          String(body.passwordLama),
          user.passwordHash
        );
        if (!match) {
          return NextResponse.json(
            { error: "Password lama tidak sesuai." },
            { status: 400 }
          );
        }
      }
      updateData.passwordHash = await bcrypt.hash(
        String(body.passwordBaru),
        10
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        nama: true,
        email: true,
        nip: true,
        mapel: true,
        nomorWA: true,
        fotoUrl: true,
        badgesJSON: true,
      },
    });

    await logActivity({
      userId: session.userId,
      namaUser: updated.nama,
      role: "guru",
      aksi: "UPDATE_PROFIL_GURU",
      detail: `${updated.nama} memperbarui profil akun guru`,
    });

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui!",
      user: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal memperbarui profil.",
      },
      { status: 500 }
    );
  }
}
