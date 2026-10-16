import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const saved = await getAllSettingsDecrypted();

    const sampleText =
      (body.text || "").trim() ||
      "Ohayou gozaimasu, Sensei! Ini adalah uji suara podcast Sensei-AI melalui integrasi Fish Audio.";
    const rawKeyInput =
      typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const apiKey =
      rawKeyInput && !rawKeyInput.includes("••••")
        ? rawKeyInput
        : (saved.fish_api_key || "").trim();
    const voiceId = (body.voiceId || saved.fish_voice_id || "").trim();
    const speed = Number(body.speed || saved.fish_speed || "1.0") || 1.0;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "API Key Fish Audio masih kosong. Masukkan API Key Fish Audio & Reference Voice ID terlebih dahulu sebelum menekan Tes Suara.",
        },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        model: body.model || saved.fish_model || "s2.1-pro-free",
      },
      body: JSON.stringify({
        text: sampleText,
        reference_id: voiceId || undefined,
        format: "mp3",
        mp3_bitrate: 128,
        normalize: body.normalize !== false,
        chunk_length: Number(
          body.chunkLength || saved.fish_chunk_length || 200
        ),
        temperature: Number(
          body.temperature || saved.fish_temperature || 0.7
        ),
        top_p: Number(body.topP || saved.fish_top_p || 0.7),
        prosody: { speed, volume: 0 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Fish Audio merespons ${res.status}: ${errText.slice(0, 150)}`
      );
    }

    const arrBuf = await res.arrayBuffer();
    const base64Audio = `data:audio/mpeg;base64,${Buffer.from(arrBuf).toString(
      "base64"
    )}`;

    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: "admin",
      aksi: "TES_SUARA_FISH_AUDIO",
      detail: `Berhasil menguji suara Fish Audio (Voice ID: ${
        voiceId || "default"
      })`,
    });

    return NextResponse.json({
      success: true,
      mode: "fish_audio",
      message: `Suara Fish Audio berhasil dibuat (Voice ID: ${
        voiceId || "default"
      })!`,
      audioDataUrl: base64Audio,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: `Gagal menguji Fish Audio: ${msg}`,
      },
      { status: 400 }
    );
  }
}
