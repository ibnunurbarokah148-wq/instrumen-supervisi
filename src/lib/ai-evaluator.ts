import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";

// Skema Zod sesuai PRD Bagian 7
export const EvaluatorOutputSchema = z.object({
  skor_per_aspek: z
    .array(
      z.object({
        aspek: z.string(),
        skor: z.number().min(0).max(100),
        alasan: z.string(),
      })
    )
    .min(1),
  skor_total: z.number().min(0).max(100),
  predikat: z.string(),
  kesimpulan: z.string(),
  kekuatan: z.array(z.string()).min(1),
  saran: z.array(z.string()).min(1),
  naskah_podcast: z.string().min(20),
});

export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;

export interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export function buildTranscriptSegments(
  naskah: string,
  speed: number = 1.0
): {
  segments: TranscriptSegment[];
  totalDuration: number;
} {
  const paragraphs = naskah
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const sentences: { speaker: string; text: string }[] = [];
  for (const para of paragraphs) {
    let speaker = "Sensei-AI";
    let cleanPara = para;
    const matchSpeaker = para.match(/^([A-Za-z0-9\-_ ]{2,20}):\s*(.+)$/);
    if (matchSpeaker) {
      speaker = matchSpeaker[1].trim();
      cleanPara = matchSpeaker[2].trim();
    }

    const parts = cleanPara
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const part of parts) {
      sentences.push({ speaker, text: part });
    }
  }

  let currentTime = 0;
  const segments: TranscriptSegment[] = [];

  for (const item of sentences) {
    const wordCount = item.text.split(/\s+/).length;
    const rawSec = Math.max(
      2,
      Math.round(wordCount / (2.4 * Math.max(0.6, speed)))
    );
    const start = currentTime;
    const end = currentTime + rawSec;
    segments.push({
      start,
      end,
      speaker: item.speaker,
      text: item.text,
    });
    currentTime = end;
  }

  return {
    segments,
    totalDuration: Math.max(5, currentTime),
  };
}

export async function evaluateSupervisi(penugasanId: string): Promise<{
  success: boolean;
  hasilId?: string;
  error?: string;
}> {
  const penugasan = await prisma.penugasan.findUnique({
    where: { id: penugasanId },
    include: {
      guru: true,
      instrumen: {
        include: {
          pertanyaan: { orderBy: { urutan: "asc" } },
        },
      },
      jawaban: true,
    },
  });

  if (!penugasan) {
    return { success: false, error: "Data penugasan tidak ditemukan." };
  }

  const settings = await getAllSettingsDecrypted();
  const jawabanMap = new Map(
    penugasan.jawaban.map((j) => [j.pertanyaanId, j.nilaiJSON])
  );

  const itemsPayload = penugasan.instrumen.pertanyaan.map((p) => {
    let parsedAns: unknown = "";
    const raw = jawabanMap.get(p.id);
    if (raw !== undefined) {
      try {
        parsedAns = JSON.parse(raw);
      } catch {
        parsedAns = raw;
      }
    }
    return {
      pertanyaanId: p.id,
      urutan: p.urutan,
      aspek: p.aspek,
      teks: p.teks,
      tipe: p.tipe,
      bobot: p.bobot,
      opsiJSON: p.opsiJSON,
      jawabanRaw: parsedAns,
    };
  });

  const existingHasil = await prisma.hasil.findUnique({
    where: { penugasanId },
  });

  const hasilRecord = existingHasil
    ? await prisma.hasil.update({
        where: { id: existingHasil.id },
        data: { status: "memproses", errorMessage: null },
      })
    : await prisma.hasil.create({
        data: {
          penugasanId,
          status: "memproses",
        },
      });

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

  const modelName = (settings.openai_model || "gpt-4o-mini").trim();
  const temperature = Number(settings.openai_temperature ?? 0.4);
  const maxTokens = Number(settings.openai_max_tokens ?? 2000);

  if (!apiKey) {
    const errMsg =
      "API Key OpenAI-compatible belum diatur oleh Admin di menu Pengaturan API (/admin/pengaturan-api).";
    await prisma.hasil.update({
      where: { id: hasilRecord.id },
      data: {
        status: "gagal",
        errorMessage: errMsg,
      },
    });
    await logActivity({
      userId: penugasan.guruId,
      namaUser: penugasan.guru.nama,
      role: "guru",
      aksi: "AI_EVALUATOR_GAGAL",
      detail: errMsg,
    });
    return {
      success: false,
      hasilId: hasilRecord.id,
      error: errMsg,
    };
  }

  let finalEvaluation: EvaluatorOutput | null = null;
  let tokenUsage = 0;
  let lastError = "";

  const client = new OpenAI({ apiKey, baseURL });
  const userPrompt = JSON.stringify(
    {
      guru: {
        nama: penugasan.guru.nama,
        mapel: penugasan.guru.mapel || "Umum",
      },
      instrumen: {
        judul: penugasan.instrumen.judul,
        deskripsi: penugasan.instrumen.deskripsi,
      },
      rubrik: settings.ai_rubrik_json,
      template_podcast: settings.podcast_template_json,
      daftar_jawaban: itemsPayload.map((it) => ({
        aspek: it.aspek,
        bobot: it.bobot,
        tipe: it.tipe,
        pertanyaan: it.teks,
        jawaban_guru: it.jawabanRaw,
      })),
    },
    null,
    2
  );

  // Maksimal 3 percobaan (1 utama + 2 retry sesuai PRD 7.3)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const useJsonObjectFormat =
        attempt === 1 && !baseURL.toLowerCase().includes("anthropic.com");
      const completion = await client.chat.completions.create({
        model: modelName,
        temperature: isNaN(temperature) ? 0.4 : temperature,
        max_tokens: isNaN(maxTokens) ? 2000 : maxTokens,
        ...(useJsonObjectFormat
          ? { response_format: { type: "json_object" as const } }
          : {}),
        messages: [
          {
            role: "system",
            content: settings.ai_system_prompt,
          },
          {
            role: "user",
            content: `Evaluasi jawaban supervisi guru berikut dan kembalikan JSON terstruktur sesuai instruksi:\n${userPrompt}`,
          },
        ],
      });

      tokenUsage += completion.usage?.total_tokens || 0;
      const content = completion.choices[0]?.message?.content || "";
      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const parsedJson = JSON.parse(cleaned);
      const validated = EvaluatorOutputSchema.parse(parsedJson);
      finalEvaluation = validated;
      break;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      await logActivity({
        userId: penugasan.guruId,
        namaUser: penugasan.guru.nama,
        role: "guru",
        aksi: "AI_EVALUATOR_RETRY",
        detail: `Percobaan ke-${attempt} gagal: ${lastError}`,
      });
    }
  }

  if (!finalEvaluation) {
    await prisma.hasil.update({
      where: { id: hasilRecord.id },
      data: {
        status: "gagal",
        errorMessage: `Gagal memvalidasi respons AI setelah 3 percobaan: ${lastError}`,
      },
    });
    return {
      success: false,
      hasilId: hasilRecord.id,
      error: `Evaluasi AI gagal: ${lastError}. Silakan tekan tombol Coba Lagi atau periksa Pengaturan API.`,
    };
  }

  const updatedHasil = await prisma.hasil.update({
    where: { id: hasilRecord.id },
    data: {
      skorPerAspekJSON: JSON.stringify(finalEvaluation.skor_per_aspek),
      skorTotal: finalEvaluation.skor_total,
      skorAsliAI: finalEvaluation.skor_total,
      predikat: finalEvaluation.predikat,
      kesimpulan: finalEvaluation.kesimpulan,
      kekuatanJSON: JSON.stringify(finalEvaluation.kekuatan),
      sarannyaJSON: JSON.stringify(finalEvaluation.saran),
      status: "selesai",
      errorMessage: null,
      tokenUsage,
    },
  });

  await prisma.penugasan.update({
    where: { id: penugasanId },
    data: { status: "selesai" },
  });

  // Lencana Pencapaian (Gamifikasi sesuai PRD Bagian 13)
  try {
    const currentBadges: string[] = JSON.parse(
      penugasan.guru.badgesJSON || "[]"
    );
    const badgeSet = new Set(currentBadges);
    badgeSet.add("Supervisi Pertama Selesai 🌸");
    if (finalEvaluation.skor_total >= 85) {
      badgeSet.add("Sensei Teladan (Sangat Baik) 🌟");
    }
    if (new Date() <= new Date(penugasan.tenggat)) {
      badgeSet.add("Disiplin Tepat Waktu ⚡");
    }
    await prisma.user.update({
      where: { id: penugasan.guruId },
      data: { badgesJSON: JSON.stringify(Array.from(badgeSet)) },
    });
  } catch {
    // ignore badge error
  }

  const speed = Number(settings.fish_speed || "1.0") || 1.0;
  const { segments, totalDuration } = buildTranscriptSegments(
    finalEvaluation.naskah_podcast,
    speed
  );

  await prisma.podcast.upsert({
    where: { hasilId: updatedHasil.id },
    update: {
      naskah: finalEvaluation.naskah_podcast,
      transkripSegmenJSON: JSON.stringify(segments),
      durasi: totalDuration,
      karakterTts: finalEvaluation.naskah_podcast.length,
      status: "menunggu",
      errorMessage: null,
    },
    create: {
      hasilId: updatedHasil.id,
      naskah: finalEvaluation.naskah_podcast,
      transkripSegmenJSON: JSON.stringify(segments),
      durasi: totalDuration,
      karakterTts: finalEvaluation.naskah_podcast.length,
      status: "menunggu",
    },
  });

  await logActivity({
    userId: penugasan.guruId,
    namaUser: penugasan.guru.nama,
    role: "guru",
    aksi: "EVALUASI_AI_SELESAI",
    detail: `Supervisi "${penugasan.instrumen.judul}" dievaluasi dengan skor ${finalEvaluation.skor_total} (${finalEvaluation.predikat})`,
  });

  // Jalankan pipeline podcast Fish Audio di latar belakang (asynchronous) agar respons submit cepat dan tidak membuat UI guru stuck
  generatePodcastAudio(updatedHasil.id).catch(async (err) => {
    console.error("Gagal generate podcast di background:", err);
    await prisma.podcast
      .update({
        where: { hasilId: updatedHasil.id },
        data: {
          status: "gagal",
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      })
      .catch(() => {});
  });

  // Kirim notifikasi ke Bot Shiroko bila integrasi aktif (PRD Bagian 7.5 & 10)
  if (settings.shiroko_enabled === "true" && settings.shiroko_url) {
    triggerShirokoWebhook({
      event: "hasil_supervisi_selesai",
      guru: {
        nama: penugasan.guru.nama,
        nomorWA: penugasan.guru.nomorWA,
        mapel: penugasan.guru.mapel,
      },
      instrumen: penugasan.instrumen.judul,
      skorTotal: finalEvaluation.skor_total,
      predikat: finalEvaluation.predikat,
      kesimpulan: finalEvaluation.kesimpulan,
      hasilId: updatedHasil.id,
    }).catch(() => {});
  }

  return { success: true, hasilId: updatedHasil.id };
}

// Pipeline Podcast Murni Fish Audio TTS dengan pemecahan paragraf & sistem Cache (PRD Bagian 8)
export async function generatePodcastAudio(hasilId: string): Promise<{
  success: boolean;
  audioPath?: string;
  error?: string;
}> {
  const podcast = await prisma.podcast.findUnique({
    where: { hasilId },
  });
  if (!podcast) {
    return { success: false, error: "Data podcast tidak ditemukan." };
  }

  const settings = await getAllSettingsDecrypted();
  const fishKey = (settings.fish_api_key || "").trim();
  const voiceId = (settings.fish_voice_id || "").trim();
  const format = settings.fish_format === "wav" ? "wav" : "mp3";
  const speed = Number(settings.fish_speed || "1.0") || 1.0;
  const temperature = Number(settings.fish_temperature || "0.7") || 0.7;
  const topP = Number(settings.fish_top_p || "0.7") || 0.7;
  const normalize = settings.fish_normalize !== "false";
  const chunkLength = Number(settings.fish_chunk_length || "200") || 200;

  if (!fishKey) {
    const errMsg =
      "API Key Fish Audio belum diatur oleh Admin di menu Pengaturan API (/admin/pengaturan-api).";
    await prisma.podcast.update({
      where: { id: podcast.id },
      data: {
        status: "gagal",
        errorMessage: errMsg,
      },
    });
    await logActivity({
      aksi: "FISH_AUDIO_GAGAL",
      detail: errMsg,
    });
    return { success: false, error: errMsg };
  }

  // Hitung hash untuk cache: naskah yang sama + suara & parameter sama tidak digenerate ulang (PRD Bagian 8)
  const cacheHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        naskah: podcast.naskah,
        voiceId,
        format,
        speed,
        temperature,
        topP,
      })
    )
    .digest("hex");

  await prisma.podcast.update({
    where: { id: podcast.id },
    data: { status: "memproses", cacheHash, errorMessage: null },
  });

  const storageDir = path.join(process.cwd(), "storage", "podcast");
  await fs.mkdir(storageDir, { recursive: true });

  // Cek apakah sudah ada cache audio dengan cacheHash yang sama
  const cachedPodcast = await prisma.podcast.findFirst({
    where: {
      cacheHash,
      status: "selesai",
      audioPath: { not: null },
    },
  });

  if (cachedPodcast?.audioPath) {
    const existingFullPath = path.join(storageDir, cachedPodcast.audioPath);
    try {
      await fs.access(existingFullPath);
      await prisma.podcast.update({
        where: { id: podcast.id },
        data: {
          audioPath: cachedPodcast.audioPath,
          status: "selesai",
          durasi: cachedPodcast.durasi || podcast.durasi,
        },
      });
      return { success: true, audioPath: cachedPodcast.audioPath };
    } catch {
      // File cache tidak ditemukan di disk, lanjut generate ke Fish Audio
    }
  }

  // Pecah naskah per paragraf agar aman dari batas panjang teks (PRD Bagian 8)
  const paragraphs = podcast.naskah
    .split(/\n\s*\n/)
    .map((p) => p.replace(/^Sensei-AI:\s*/i, "").trim())
    .filter((p) => p.length > 0);

  try {
    const audioBuffers: Buffer[] = [];
    for (const paragraph of paragraphs) {
      const res = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${fishKey}`,
          "Content-Type": "application/json",
          model: settings.fish_model || "s2.1-pro-free",
        },
        body: JSON.stringify({
          text: paragraph,
          reference_id: voiceId || undefined,
          format,
          mp3_bitrate: 128,
          normalize,
          chunk_length: chunkLength,
          temperature,
          top_p: topP,
          prosody: {
            speed,
            volume: 0,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(
          `Fish Audio API (${res.status}): ${errText.slice(0, 180)}`
        );
      }

      const arrBuf = await res.arrayBuffer();
      audioBuffers.push(Buffer.from(arrBuf));
    }

    const combined = Buffer.concat(audioBuffers);
    const fileName = `podcast-${podcast.id}.${format}`;
    const fullPath = path.join(storageDir, fileName);
    await fs.writeFile(fullPath, combined);

    await prisma.podcast.update({
      where: { id: podcast.id },
      data: {
        audioPath: fileName,
        status: "selesai",
        errorMessage: null,
      },
    });

    await logActivity({
      aksi: "FISH_AUDIO_SUKSES",
      detail: `Berhasil membuat audio podcast Fish Audio (${fileName}, ${combined.length} bytes)`,
    });

    return { success: true, audioPath: fileName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await logActivity({
      aksi: "FISH_AUDIO_ERROR",
      detail: `Gagal memanggil Fish Audio TTS untuk hasil ${hasilId}: ${msg}`,
    });
    await prisma.podcast.update({
      where: { id: podcast.id },
      data: {
        status: "gagal",
        errorMessage: msg,
      },
    });
    return { success: false, error: msg };
  }
}

export async function triggerShirokoWebhook(payload: Record<string, unknown>) {
  const settings = await getAllSettingsDecrypted();
  if (!settings.shiroko_url) return { ok: false, status: 0 };

  const res = await fetch(settings.shiroko_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.shiroko_secret || "",
    },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status };
}

// Fitur Buat Pertanyaan dengan AI untuk Admin (PRD Bagian 5.3) - Murni OpenAI-Compatible API
export async function generateQuestionsWithAI(params: {
  topik: string;
  jumlah: number;
}): Promise<
  {
    teks: string;
    tipe: "skala" | "pilihan_ganda" | "ya_tidak" | "isian_singkat" | "esai";
    aspek: string;
    bobot: number;
    wajib: boolean;
    opsi: string[];
  }[]
> {
  const settings = await getAllSettingsDecrypted();
  const apiKey = (settings.openai_api_key || "").trim();
  const baseURL = (
    settings.openai_base_url || "https://api.openai.com/v1"
  ).trim();
  const modelName = (settings.openai_model || "gpt-4o-mini").trim();

  if (!apiKey) {
    throw new Error(
      "API Key OpenAI-compatible belum diisi di menu Pengaturan API (/admin/pengaturan-api)."
    );
  }

  const client = new OpenAI({ apiKey, baseURL });
  const res = await client.chat.completions.create({
    model: modelName,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Kamu adalah pakar instrumen supervisi pendidikan. Buat daftar pertanyaan supervisi guru dalam format JSON {"pertanyaan": [{"teks": "...", "tipe": "skala|pilihan_ganda|ya_tidak|isian_singkat|esai", "aspek": "Perencanaan|Pelaksanaan|Evaluasi|Penguasaan IT", "bobot": 1.0, "wajib": true, "opsi": []}]}',
      },
      {
        role: "user",
        content: `Buatkan ${params.jumlah} pertanyaan instrumen supervisi dengan topik: "${params.topik}". Pastikan mencakup aspek Perencanaan, Pelaksanaan, Evaluasi, dan Penguasaan IT.`,
      },
    ],
  });

  const content = res.choices[0]?.message?.content || "{}";
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.pertanyaan) || parsed.pertanyaan.length === 0) {
    throw new Error("Respons AI tidak memuat daftar pertanyaan yang valid.");
  }

  return parsed.pertanyaan;
}
