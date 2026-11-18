import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit, requireGuru } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const { session, error } = await requireGuru();
  if (error) return error;

  const rl = checkRateLimit(`chat:${session.userId}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Mohon tunggu ${rl.retryAfterSec} detik sebelum mengirim pesan lagi.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { penugasanId, message } = body;
    const userMsg = String(message || "").trim();

    if (!userMsg) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const penugasan = await prisma.penugasan.findUnique({
      where: { id: String(penugasanId || "") },
      include: {
        instrumen: true,
        hasil: true,
      },
    });

    if (!penugasan || penugasan.guruId !== session.userId || !penugasan.hasil) {
      return NextResponse.json(
        { error: "Data hasil supervisi tidak ditemukan." },
        { status: 404 }
      );
    }

    const settings = await getAllSettingsDecrypted();
    const baseURL = (
      settings.openai_base_url || "https://api.openai.com/v1"
    ).trim();
    const isOllama =
      baseURL.includes("localhost:11434") ||
      baseURL.includes("127.0.0.1:11434");
    const isUnoRouter = baseURL.toLowerCase().includes("unorouter.com");
    let apiKey = (settings.openai_api_key || "").trim();
    if (!apiKey && isUnoRouter && process.env.UNOROUTER_API_KEY) {
      apiKey = process.env.UNOROUTER_API_KEY.trim();
    }
    if (!apiKey && isOllama) {
      apiKey = "ollama";
    }
    const model = (settings.openai_model || "gpt-4o-mini").trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "API Key OpenAI-compatible belum diatur oleh Admin di menu Pengaturan API.",
        },
        { status: 400 }
      );
    }

    const h = penugasan.hasil;
    const client = new OpenAI({ apiKey, baseURL });
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 450,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `Anda adalah "Asisten AI Supervisi Akademik (SIPENA)" yang profesional, santun, dan solutif. Bantu Bapak/Ibu Guru (${session.nama}) menyusun langkah konkret perbaikan pembelajaran berdasarkan data supervisi resmi:
- Instrumen: ${penugasan.instrumen.judul}
- Nilai Akhir: ${h.skorTotal}/100 (${h.predikat}) | Status Pengesahan: ${h.disahkan ? "Disahkan Kepala Sekolah" : "Draf"}
- Skor per Aspek: ${h.skorPerAspekJSON}
- Kesimpulan: ${h.kesimpulan}
- Saran Pembinaan: ${h.sarannyaJSON}
- Catatan Kepala Sekolah: ${h.catatanAdmin || "-"}
- Rencana Tindak Lanjut (RTL) Pengawas: ${h.rtlRekomendasi || "Belum ditetapkan"} (Target: ${h.rtlTarget || "-"}, Tenggat: ${h.rtlTenggat || "-"})
Jawab secara terstruktur dalam Bahasa Indonesia baku tanpa istilah anime atau slang.`,
        },
        {
          role: "user",
          content: userMsg,
        },
      ],
    });

    return NextResponse.json({
      reply:
        completion.choices[0]?.message?.content ||
        "Terima kasih. Silakan fokuskan tindak lanjut pada indikator prioritas sesuai catatan Kepala Sekolah dan Pengawas Pembina.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal menghubungi Asisten AI SIPENA.",
      },
      { status: 500 }
    );
  }
}
