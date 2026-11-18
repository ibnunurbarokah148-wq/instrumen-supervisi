import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";

export type SettingKey =
  | "openai_base_url"
  | "openai_api_key"
  | "openai_model"
  | "openai_temperature"
  | "openai_max_tokens"
  | "shiroko_url"
  | "shiroko_secret"
  | "shiroko_enabled"
  | "ai_system_prompt"
  | "ai_rubrik_json"
  | "dokumen_template_json";

export const SECRET_KEYS = new Set(["openai_api_key", "shiroko_secret"]);

export const DEFAULT_SYSTEM_PROMPT = `Anda adalah "Asisten AI Supervisi Akademik (SIPENA)", mitra analisis objektif bagi Kepala Sekolah dan Guru dalam Sistem Informasi Supervisi & Evaluasi Akademik berbasis Kurikulum Merdeka dan Standar Proses (Permendikbudristek No. 16 Tahun 2022).

Tugas Anda:
1. Menganalisis kesesuaian antara Evaluasi Diri Guru, catatan keterlaksanaan/bukti pembelajaran, kelengkapan Perangkat Pembelajaran (Modul Ajar, LKPD, Asesmen, Refleksi), dan skor observasi Kepala Sekolah (jika tersedia).
2. Menyusun draf penilaian per aspek, temuan substantif objektif, poin kekuatan pembelajaran, dan rekomendasi pembinaan konkret.
3. Gunakan Bahasa Indonesia akademik yang baku, santun, konstruktif, dan sesuai kaidah penulisan laporan dinas pendidikan.

Keluaran WAJIB berupa HANYA objek JSON valid sesuai skema berikut tanpa teks/markdown lain di luar JSON:
{
  "skor_per_aspek": [
    { "aspek": "Nama Aspek", "skor": 88, "alasan": "Analisis substantif berbasis bukti keterlaksanaan & observasi pada aspek ini." }
  ],
  "skor_total": 88,
  "predikat": "Baik",
  "kesimpulan": "Paragraf temuan substantif dan kesimpulan menyeluruh capaian supervisi akademik guru.",
  "kekuatan": ["Poin kekuatan spesifik 1", "Poin kekuatan spesifik 2", "Poin kekuatan spesifik 3"],
  "saran": ["Rekomendasi pembinaan dan tindak lanjut konkret 1", "Rekomendasi pembinaan dan tindak lanjut konkret 2", "Rekomendasi pembinaan dan tindak lanjut konkret 3"]
}`;

export const DEFAULT_RUBRIK_JSON = JSON.stringify(
  {
    skalaMaksimal: 100,
    predikat: [
      {
        label: "Amat Baik",
        minSkor: 91,
        deskripsi:
          "Melampaui standar proses supervisi akademik, inovatif, berdiferensiasi optimal, dan menjadi rujukan praktik baik (Kemendikbudristek).",
      },
      {
        label: "Baik",
        minSkor: 81,
        deskripsi:
          "Memenuhi standar proses supervisi akademik dengan baik, terstruktur, dan konsisten.",
      },
      {
        label: "Cukup",
        minSkor: 71,
        deskripsi:
          "Memenuhi standar dasar namun memerlukan pendampingan dan tindak lanjut terfokus pada beberapa aspek.",
      },
      {
        label: "Kurang",
        minSkor: 0,
        deskripsi:
          "Memerlukan supervisi klinis lanjutan dan pembinaan intensif oleh Kepala Sekolah serta Pengawas Pembina.",
      },
    ],
    isiNilaiDokumenOtomatis: true,
  },
  null,
  2
);

export const DEFAULT_TEMPLATE_DOKUMEN_JSON = JSON.stringify(
  {
    namaInstansi: "DINAS PENDIDIKAN PROVINSI DKI JAKARTA • SDN 01 MENTENG",
    subJudulInstansi:
      "SISTEM INFORMASI SUPERVISI & EVALUASI AKADEMIK BERBASIS AI (SIPENA)",
    alamatInstansi:
      "Jl. Besuki No. 4, Menteng, Jakarta Pusat • Telp (021) 3192-4510 • Email: tatausaha@sdn01menteng.sch.id",
    logoUrl: "",
    warnaUtama: "#1d4ed8",
    warnaAksen: "#0f766e",
    kotaTandaTangan: "Jakarta",
    namaSupervisor: "Dr. Hj. Ratna Kusuma, M.Pd.",
    nipSupervisor: "19720415 199802 2 001",
    jabatanSupervisor: "Kepala Sekolah / Supervisor Akademik",
    namaPengawas: "Drs. H. Bambang Sudibyo, M.Pd.",
    nipPengawas: "19680512 199303 1 004",
    jabatanPengawas: "Pengawas Sekolah Pembina",
    isiTemplate: `Berdasarkan pelaksanaan supervisi akademik pada tanggal {{tanggal}}, berikut disampaikan berita acara & laporan hasil evaluasi bagi {{nama_guru}}:\n\nSkor Akhir Tervalidasi: {{skor_total}} ({{predikat}})\n\nRingkasan Temuan Substantif:\n{{kesimpulan}}\n\nTabel Capaian Per Aspek:\n{{tabel_aspek}}\n\nRekomendasi Pembinaan & Tindak Lanjut:\n{{saran}}`,
  },
  null,
  2
);

export const DEFAULT_SETTINGS: Record<string, string> = {
  // OpenAI-compatible AI Co-Evaluator
  openai_base_url: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  openai_api_key:
    process.env.OPENAI_API_KEY || process.env.UNOROUTER_API_KEY || "",
  openai_model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openai_temperature: "0.3",
  openai_max_tokens: "2000",

  // WhatsApp Gateway / Bot Shiroko Integration
  shiroko_url: process.env.SHIROKO_BOT_URL || "http://localhost:4000/api/webhook",
  shiroko_secret: process.env.SHIROKO_BOT_SECRET || "shiroko-secret-key-2026",
  shiroko_enabled: "false",

  // AI Assessment & Templates
  ai_system_prompt: DEFAULT_SYSTEM_PROMPT,
  ai_rubrik_json: DEFAULT_RUBRIK_JSON,
  dokumen_template_json: DEFAULT_TEMPLATE_DOKUMEN_JSON,
};

export async function getAllSettingsDecrypted(): Promise<
  Record<string, string>
> {
  const rows = await prisma.pengaturan.findMany();
  const result: Record<string, string> = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    if (row.key.startsWith("fish_") || row.key === "podcast_template_json") {
      continue;
    }
    if (row.isSecret || SECRET_KEYS.has(row.key)) {
      const dec = decryptSecret(row.value);
      if (dec) result[row.key] = dec;
    } else {
      result[row.key] = row.value;
    }
  }

  if (
    !result.openai_api_key &&
    process.env.UNOROUTER_API_KEY &&
    (result.openai_base_url || "").toLowerCase().includes("unorouter.com")
  ) {
    result.openai_api_key = process.env.UNOROUTER_API_KEY;
  }

  return result;
}

export async function getAllSettingsMaskedForAdmin(): Promise<{
  settings: Record<string, string>;
  hasSecret: Record<string, boolean>;
}> {
  const full = await getAllSettingsDecrypted();
  const settings: Record<string, string> = {};
  const hasSecret: Record<string, boolean> = {};

  for (const [k, v] of Object.entries(full)) {
    if (SECRET_KEYS.has(k)) {
      hasSecret[k] = Boolean(v && v.trim().length > 0);
      settings[k] = v ? maskSecret(v) : "";
    } else {
      settings[k] = v;
    }
  }

  return { settings, hasSecret };
}

export async function saveSettings(
  updates: Record<string, string>
): Promise<void> {
  for (const [key, rawValue] of Object.entries(updates)) {
    if (key.startsWith("fish_") || key === "podcast_template_json") continue;
    const isSecret = SECRET_KEYS.has(key);
    if (isSecret && rawValue.includes("••••")) {
      continue;
    }
    const storedValue = isSecret
      ? rawValue
        ? encryptSecret(rawValue)
        : ""
      : rawValue;
    await prisma.pengaturan.upsert({
      where: { key },
      update: { value: storedValue, isSecret },
      create: { key, value: storedValue, isSecret },
    });
  }
}

export function getPredikatFromSkor(
  skor: number,
  rubrikJsonStr?: string
): string {
  try {
    const parsed = JSON.parse(rubrikJsonStr || DEFAULT_RUBRIK_JSON);
    if (Array.isArray(parsed.predikat)) {
      const sorted = [...parsed.predikat].sort((a, b) => b.minSkor - a.minSkor);
      for (const p of sorted) {
        if (skor >= Number(p.minSkor)) return p.label;
      }
    }
  } catch {
    // fallback
  }
  if (skor >= 91) return "Amat Baik";
  if (skor >= 81) return "Baik";
  if (skor >= 71) return "Cukup";
  return "Kurang";
}

export async function logActivity(params: {
  userId?: string | null;
  namaUser?: string | null;
  role?: string | null;
  aksi: string;
  detail: string;
}) {
  try {
    await prisma.logAktivitas.create({
      data: {
        userId: params.userId || null,
        namaUser: params.namaUser || "Sistem",
        role: params.role || "system",
        aksi: params.aksi,
        detail: params.detail,
      },
    });
  } catch {
    // Non-blocking log
  }
}
