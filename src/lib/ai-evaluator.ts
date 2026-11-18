import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getAllSettingsDecrypted,
  getPredikatFromSkor,
  logActivity,
} from "@/lib/settings";

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
});

export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;

export interface ParsedJawabanItem {
  nilai: string | number;
  skorMandiri?: number;
  catatanGuru?: string;
  buktiUrl?: string;
  skorKepsek?: number;
  catatanKepsek?: string;
}

export function parseStructuredJawaban(rawJson?: string | null): ParsedJawabanItem {
  if (!rawJson) return { nilai: "" };
  try {
    const parsed = JSON.parse(rawJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const rawNilai = obj.nilai ?? obj.skor ?? "";
      return {
        nilai:
          typeof rawNilai === "number" || typeof rawNilai === "string"
            ? rawNilai
            : "",
        skorMandiri:
          typeof obj.skor === "number"
            ? obj.skor
            : typeof rawNilai === "number"
            ? rawNilai
            : undefined,
        catatanGuru: typeof obj.catatan === "string" ? obj.catatan : undefined,
        buktiUrl: typeof obj.buktiUrl === "string" ? obj.buktiUrl : undefined,
        skorKepsek:
          typeof obj.skorKepsek === "number" ? obj.skorKepsek : undefined,
        catatanKepsek:
          typeof obj.catatanKepsek === "string" ? obj.catatanKepsek : undefined,
      };
    }
    return {
      nilai:
        typeof parsed === "number" || typeof parsed === "string"
          ? parsed
          : String(parsed),
      skorMandiri: typeof parsed === "number" ? parsed : undefined,
    };
  } catch {
    return { nilai: rawJson };
  }
}

export async function evaluateSupervisi(
  penugasanId: string,
  options?: {
    triggeredBy?: "guru" | "kepala_sekolah" | "admin";
    evaluatorName?: string;
  }
): Promise<{
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

  const latestPerangkat = await prisma.perangkatSupervisi.findFirst({
    where: { guruId: penugasan.guruId },
    orderBy: { updatedAt: "desc" },
  });

  const settings = await getAllSettingsDecrypted();
  const jawabanMap = new Map(
    penugasan.jawaban.map((j) => [j.pertanyaanId, j.nilaiJSON])
  );

  const itemsPayload = penugasan.instrumen.pertanyaan.map((p) => {
    const raw = jawabanMap.get(p.id);
    const parsed = parseStructuredJawaban(raw);
    return {
      pertanyaanId: p.id,
      urutan: p.urutan,
      aspek: p.aspek,
      teks: p.teks,
      tipe: p.tipe,
      bobot: p.bobot,
      opsiJSON: p.opsiJSON,
      jawabanGuru: parsed.nilai,
      catatanKeterlaksanaan: parsed.catatanGuru || "",
      buktiPendukung: parsed.buktiUrl || "",
      skorObservasiKepsek: parsed.skorKepsek ?? null,
      catatanObservasiKepsek: parsed.catatanKepsek || "",
    };
  });

  const existingHasil = await prisma.hasil.findUnique({
    where: { penugasanId },
  });

  if (existingHasil?.disahkan) {
    return {
      success: false,
      hasilId: existingHasil.id,
      error:
        "Laporan ini sudah disahkan dan dikunci secara permanen oleh Kepala Sekolah.",
    };
  }

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
  const temperature = Number(settings.openai_temperature ?? 0.3);
  const maxTokens = Number(settings.openai_max_tokens ?? 2000);

  if (!apiKey) {
    const errMsg =
      "API Key OpenAI-compatible belum diatur di menu Pengaturan API (/admin/pengaturan-api).";
    await prisma.hasil.update({
      where: { id: hasilRecord.id },
      data: {
        status: "gagal",
        errorMessage: errMsg,
      },
    });
    await logActivity({
      userId: penugasan.guruId,
      namaUser: options?.evaluatorName || penugasan.guru.nama,
      role: options?.triggeredBy || "guru",
      aksi: "AI_CO_EVALUATOR_GAGAL",
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
        nip: penugasan.guru.nip || "-",
        mapel: penugasan.guru.mapel || "Umum",
      },
      instrumen: {
        judul: penugasan.instrumen.judul,
        deskripsi: penugasan.instrumen.deskripsi,
      },
      perangkat_pembelajaran: latestPerangkat
        ? {
            judul: latestPerangkat.judulPembelajaran,
            status_verifikasi: latestPerangkat.statusVerifikasi,
            modul_ajar: latestPerangkat.modulAjarJudul,
            tujuan: latestPerangkat.modulAjarTujuan,
            lkpd: latestPerangkat.lkpdJudul,
            asesmen: `${latestPerangkat.asesmenJenis} - ${latestPerangkat.asesmenKriteria}`,
            refleksi_kendala: latestPerangkat.refleksiKendala,
            refleksi_tindak_lanjut: latestPerangkat.refleksiTindakLanjut,
          }
        : null,
      rubrik: settings.ai_rubrik_json,
      daftar_indikator_dan_bukti: itemsPayload.map((it) => ({
        aspek: it.aspek,
        bobot: it.bobot,
        tipe: it.tipe,
        indikator: it.teks,
        evaluasi_diri_guru: it.jawabanGuru,
        catatan_keterlaksanaan_guru: it.catatanKeterlaksanaan,
        bukti_pendukung: it.buktiPendukung,
        skor_observasi_kepsek: it.skorObservasiKepsek,
        catatan_observasi_kepsek: it.catatanObservasiKepsek,
      })),
    },
    null,
    2
  );

  // Maksimal 3 percobaan (1 utama + 2 retry)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const useJsonObjectFormat =
        attempt === 1 && !baseURL.toLowerCase().includes("anthropic.com");
      const completion = await client.chat.completions.create({
        model: modelName,
        temperature: isNaN(temperature) ? 0.3 : temperature,
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
            content: `Analisis instrumen supervisi akademik berikut (mencakup evaluasi diri guru, catatan bukti keterlaksanaan, perangkat pembelajaran, dan skor observasi Kepala Sekolah bila tersedia), lalu kembalikan HANYA JSON terstruktur:\n${userPrompt}`,
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
        namaUser: options?.evaluatorName || penugasan.guru.nama,
        role: options?.triggeredBy || "guru",
        aksi: "AI_CO_EVALUATOR_RETRY",
        detail: `Percobaan ke-${attempt} gagal: ${lastError}`,
      });
    }
  }

  if (!finalEvaluation) {
    await prisma.hasil.update({
      where: { id: hasilRecord.id },
      data: {
        status: "gagal",
        errorMessage: `Gagal memvalidasi respons AI Co-Evaluator setelah 3 percobaan: ${lastError}`,
      },
    });
    return {
      success: false,
      hasilId: hasilRecord.id,
      error: `Analisis AI Co-Evaluator gagal: ${lastError}. Silakan periksa Pengaturan API atau coba lagi.`,
    };
  }

  const predikatResmi = getPredikatFromSkor(
    finalEvaluation.skor_total,
    settings.ai_rubrik_json
  );

  const updatedHasil = await prisma.hasil.update({
    where: { id: hasilRecord.id },
    data: {
      skorPerAspekJSON: JSON.stringify(finalEvaluation.skor_per_aspek),
      skorTotal: finalEvaluation.skor_total,
      skorAsliAI: finalEvaluation.skor_total,
      predikat: predikatResmi || finalEvaluation.predikat,
      kesimpulan: finalEvaluation.kesimpulan,
      kekuatanJSON: JSON.stringify(finalEvaluation.kekuatan),
      sarannyaJSON: JSON.stringify(finalEvaluation.saran),
      status: "selesai",
      errorMessage: null,
      tokenUsage,
    },
  });

  // Pindahkan penugasan ke "dalam_penilaian" agar Kepala Sekolah dapat meninjau, menilai, dan mengesahkan (Immutable)
  if (penugasan.status !== "selesai" && penugasan.status !== "tindak_lanjut") {
    await prisma.penugasan.update({
      where: { id: penugasanId },
      data: { status: "dalam_penilaian" },
    });
  }

  await logActivity({
    userId: penugasan.guruId,
    namaUser: options?.evaluatorName || penugasan.guru.nama,
    role: options?.triggeredBy || "guru",
    aksi: "AI_CO_EVALUATOR_SELESAI",
    detail: `Draf analisis AI Co-Evaluator untuk "${penugasan.instrumen.judul}" (${penugasan.guru.nama}) berhasil disusun dengan skor ${finalEvaluation.skor_total} (${predikatResmi})`,
  });

  // Kirim notifikasi awal ke Bot WhatsApp jika diaktifkan
  if (settings.shiroko_enabled === "true" && settings.shiroko_url) {
    triggerShirokoWebhook({
      event: "draf_supervisi_siap_review",
      guru: {
        nama: penugasan.guru.nama,
        nip: penugasan.guru.nip,
        nomorWA: penugasan.guru.nomorWA,
        mapel: penugasan.guru.mapel,
      },
      instrumen: penugasan.instrumen.judul,
      skorTotal: finalEvaluation.skor_total,
      predikat: predikatResmi,
      kesimpulan: finalEvaluation.kesimpulan,
      hasilId: updatedHasil.id,
      statusTahapan: "dalam_penilaian",
    }).catch(() => {});
  }

  return { success: true, hasilId: updatedHasil.id };
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

// Fitur Buat Pertanyaan dengan AI untuk Admin / Kepala Sekolah (OpenAI-Compatible API)
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
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Anda adalah pakar instrumen supervisi akademik Kurikulum Merdeka (Permendikbudristek No. 16 Tahun 2022). Buat daftar indikator supervisi guru dalam format JSON {"pertanyaan": [{"teks": "...", "tipe": "skala|pilihan_ganda|ya_tidak|isian_singkat|esai", "aspek": "Pembukaan Pembelajaran|Kegiatan Inti|Asesmen dan Penutup|Pemanfaatan Teknologi Informasi", "bobot": 1.0, "wajib": true, "opsi": []}]}',
      },
      {
        role: "user",
        content: `Buatkan ${params.jumlah} indikator instrumen supervisi akademik dengan topik: "${params.topik}". Pastikan mencakup aspek Pembukaan Pembelajaran, Kegiatan Inti, Asesmen dan Penutup, serta Pemanfaatan Teknologi Informasi.`,
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
