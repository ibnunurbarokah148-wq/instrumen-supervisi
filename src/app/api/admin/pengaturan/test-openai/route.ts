import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAdmin } from "@/lib/auth";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const saved = await getAllSettingsDecrypted();

    const baseURL = (
      body.baseUrl ||
      saved.openai_base_url ||
      "https://api.openai.com/v1"
    ).trim();
    const isOllama =
      baseURL.includes("localhost:11434") ||
      baseURL.includes("127.0.0.1:11434");
    const isUnoRouter = baseURL.toLowerCase().includes("unorouter.com");

    const rawKeyInput =
      typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    let apiKey =
      rawKeyInput && !rawKeyInput.includes("••••")
        ? rawKeyInput
        : (saved.openai_api_key || "").trim();

    if (!apiKey && isUnoRouter && process.env.UNOROUTER_API_KEY) {
      apiKey = process.env.UNOROUTER_API_KEY.trim();
    }
    if (!apiKey && isOllama) {
      apiKey = "ollama";
    }

    const model = (body.model || saved.openai_model || "gpt-4o-mini").trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "API Key masih kosong. Masukkan API Key terlebih dahulu sebelum menekan Tes Koneksi.",
        },
        { status: 400 }
      );
    }

    const isStream = Boolean(body.stream);
    const start = Date.now();
    const client = new OpenAI({ apiKey, baseURL });

    if (isStream) {
      const responseStream = await client.chat.completions.create({
        model,
        max_tokens: 120,
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah Sensei-AI, asisten supervisi cerdas. Balas tes koneksi ini secara ramah, sopan, dan hangat dalam 1-2 kalimat anime supervisor.",
          },
          {
            role: "user",
            content: "Halo Sensei-AI, tes koneksi streaming sistem supervisi!",
          },
        ],
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              const text = chunk.choices[0]?.delta?.content || "";
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        },
      });
    }

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah Sensei-AI. Balas singkat dalam 1 kalimat ramah.",
        },
        {
          role: "user",
          content: "Tes koneksi sistem supervisi.",
        },
      ],
    });

    const latencyMs = Date.now() - start;
    const reply = completion.choices[0]?.message?.content || "OK";

    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "TES_KONEKSI_OPENAI",
      detail: `Berhasil terhubung ke ${baseURL} (${model}) dalam ${latencyMs}ms`,
    });

    return NextResponse.json({
      success: true,
      mode: "live_api",
      latencyMs,
      message: `Berhasil terhubung ke ${model} (${latencyMs} ms)!`,
      reply,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "TES_KONEKSI_OPENAI_GAGAL",
      detail: `Gagal tes koneksi OpenAI: ${msg}`,
    });
    return NextResponse.json(
      {
        success: false,
        error: `Koneksi gagal: ${msg}`,
      },
      { status: 400 }
    );
  }
}

