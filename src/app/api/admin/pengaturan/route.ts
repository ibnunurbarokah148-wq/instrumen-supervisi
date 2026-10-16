import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getAllSettingsMaskedForAdmin,
  logActivity,
  saveSettings,
} from "@/lib/settings";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  // Sesuai PRD 5.2: semua key rahasia tidak pernah dikembalikan utuh lewat API (hanya masked)
  const { settings, hasSecret } = await getAllSettingsMaskedForAdmin();
  return NextResponse.json({ settings, hasSecret });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const updates: Record<string, string> = {};
    if (body && typeof body.settings === "object") {
      for (const [k, v] of Object.entries(body.settings)) {
        if (typeof v === "string") {
          updates[k] = v;
        }
      }
    }

    await saveSettings(updates);
    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "UPDATE_PENGATURAN",
      detail: `Memperbarui konfigurasi sistem (${Object.keys(updates).length} parameter)`,
    });

    const { settings, hasSecret } = await getAllSettingsMaskedForAdmin();
    return NextResponse.json({
      success: true,
      message: "Konfigurasi berhasil disimpan secara terenkripsi (AES-256)!",
      settings,
      hasSecret,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menyimpan pengaturan.",
      },
      { status: 500 }
    );
  }
}
