import { NextRequest, NextResponse } from "next/server";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";
import { triggerShirokoWebhook } from "@/lib/ai-evaluator";

export async function POST(req: NextRequest) {
  try {
    const settings = await getAllSettingsDecrypted();
    const apiKeyHeader = req.headers.get("x-api-key") || "";

    if (
      settings.shiroko_secret &&
      apiKeyHeader !== settings.shiroko_secret
    ) {
      return NextResponse.json(
        { error: "Unauthorized: x-api-key tidak sesuai dengan secret Shiroko." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const res = await triggerShirokoWebhook({
      event: body.event || "notifikasi_supervisi",
      ...body,
      sentAt: new Date().toISOString(),
    });

    await logActivity({
      role: "system",
      namaUser: "Shiroko Integrasi",
      aksi: "SHIROKO_NOTIFY",
      detail: `Mengirim notifikasi (${body.event || "umum"}) ke Bot Shiroko`,
    });

    return NextResponse.json({
      success: true,
      webhookReached: res.ok,
      message: "Notifikasi Shiroko berhasil diproses.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal mengirim notifikasi Shiroko.",
      },
      { status: 500 }
    );
  }
}
