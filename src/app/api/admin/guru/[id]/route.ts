import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== "guru") {
      return NextResponse.json(
        { error: "Data guru tidak ditemukan." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.nama === "string") updateData.nama = body.nama.trim();
    if (typeof body.email === "string") updateData.email = body.email.trim();
    if (typeof body.nip === "string") updateData.nip = body.nip.trim() || null;
    if (typeof body.mapel === "string") updateData.mapel = body.mapel.trim();
    if (typeof body.nomorWA === "string")
      updateData.nomorWA = body.nomorWA.trim() || null;
    if (typeof body.aktif === "boolean") updateData.aktif = body.aktif;

    if (typeof body.newPassword === "string" && body.newPassword.length >= 4) {
      updateData.passwordHash = await bcrypt.hash(body.newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: body.newPassword ? "RESET_PASSWORD_GURU" : "UPDATE_GURU",
      detail: body.newPassword
        ? `Reset password untuk guru ${updated.nama}`
        : `Memperbarui data/status guru ${updated.nama} (Aktif: ${updated.aktif})`,
    });

    return NextResponse.json({
      success: true,
      message: body.newPassword
        ? `Password untuk ${updated.nama} berhasil direset!`
        : `Data ${updated.nama} berhasil diperbarui!`,
      guru: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal memperbarui data guru.",
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
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== "guru") {
      return NextResponse.json(
        { error: "Data guru tidak ditemukan." },
        { status: 404 }
      );
    }

    await prisma.user.delete({ where: { id } });
    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "HAPUS_GURU",
      detail: `Menghapus akun guru ${user.nama} (${user.email})`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus guru." },
      { status: 500 }
    );
  }
}
