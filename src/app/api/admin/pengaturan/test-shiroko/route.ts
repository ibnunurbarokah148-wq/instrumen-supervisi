import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const saved = await getAllSettingsDecrypted();

    const url = (body.url || saved.shiroko_url || "").trim();
    const rawSecret = typeof body.secret === "string" ? body.secret.trim() : "";
    const secret =
      rawSecret && !rawSecret.includes("••••")
        ? rawSecret
        : (saved.shiroko_secret || "").trim();
    const nomorTujuan = (body.nomorTujuan || "6281234567801").trim();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL Endpoint Bot Shiroko belum diisi." },
        { status: 400 }
      );
    }

    const payload = {
      event: "test_message",
      nomorTujuan,
      pesan:
        "🌸 [Sensei-AI Supervisor] Halo Sensei! Ini adalah pesan uji coba integrasi dari Dashboard Admin Web Agent Supervisor ke Bot Shiroko.",
      timestamp: new Date().toISOString(),
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": secret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "admin",
        aksi: "TES_BOT_SHIROKO",
        detail: `Mengirim uji webhook ke ${url} (HTTP ${res.status})`,
      });

      return NextResponse.json({
        success: true,
        mode: "live_webhook",
        message: `Berhasil menghubungi Bot Shiroko di ${url} (HTTP ${res.status})!`,
        payloadSent: payload,
      });
    } catch {
      // Jika bot lokal belum menyala di port 4000, tampilkan simulasi payload yang siap diterima bot
      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: "admin",
        aksi: "TES_BOT_SHIROKO_SIMULASI",
        detail: `Simulasi uji kirim pesan ke ${url} (server bot lokal belum aktif)`,
      });

      return NextResponse.json({
        success: true,
        mode: "simulated",
        message: `Payload webhook Shiroko valid dan siap dikirim ke ${url} (catatan: server bot tujuan belum merespons, menampilkan simulasi payload).`,
        payloadSent: payload,
      });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Gagal menguji Bot Shiroko",
      },
      { status: 400 }
    );
  }
}
