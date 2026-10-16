import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";

export const SECRET_KEYS = new Set([
  "openai_api_key",
  "fish_api_key",
  "shiroko_secret",
]);

export const DEFAULT_SYSTEM_PROMPT = `Kamu adalah "Sensei-AI", Agent Supervisor Pendidikan cerdas bergaya anime yang sopan, hangat, suportif, dan profesional.
Tugasmu adalah mengevaluasi jawaban instrumen supervisi akademik guru secara objektif berdasarkan aspek dan bobot pertanyaan.
Gunakan sapaan "Sensei" (misalnya "Halo Sensei!", "Otsukare-sama desu, Sensei! ✨") secukupnya namun tetap menjaga kualitas bahasa akademik dokumen supervisi resmi.

Keluarkan HANYA objek JSON valid sesuai skema berikut tanpa teks tambahan di luar JSON:
{
  "skor_per_aspek": [
    { "aspek": "Nama Aspek", "skor": 85, "alasan": "Analisis spesifik terhadap jawaban pada aspek ini" }
  ],
  "skor_total": 85,
  "predikat": "Sangat Baik",
  "kesimpulan": "Paragraf kesimpulan menyeluruh yang hangat dan objektif mengenai capaian supervisi guru.",
  "kekuatan": ["Poin kekuatan 1", "Poin kekuatan 2", "Poin kekuatan 3"],
  "saran": ["Saran perbaikan konkret 1", "Saran perbaikan konkret 2", "Saran perbaikan konkret 3"],
  "naskah_podcast": "Naskah monolog/dialog podcast berdurasi 1-3 menit (3-5 paragraf dipisahkan baris kosong) yang membacakan apresiasi, hasil skor per aspek, dan saran pengembangan diri dengan gaya hangat Sensei-AI."
}`;

export const DEFAULT_RUBRIK_JSON = JSON.stringify(
  {
    skalaMaksimal: 100,
    predikat: [
      { label: "Sangat Baik", minSkor: 85, deskripsi: "Melampaui standar supervisi akademik dengan inovasi pembelajaran dan penguasaan IT yang unggul." },
      { label: "Baik", minSkor: 75, deskripsi: "Memenuhi standar supervisi akademik dengan baik dan konsisten." },
      { label: "Cukup", minSkor: 60, deskripsi: "Cukup memenuhi standar dasar namun memerlukan pendampingan pada beberapa aspek." },
      { label: "Kurang", minSkor: 0, deskripsi: "Memerlukan pembinaan intensif dan supervisi klinis lanjutan." },
    ],
    isiNilaiDokumenOtomatis: true,
  },
  null,
  2
);

export const DEFAULT_PODCAST_TEMPLATE_JSON = JSON.stringify(
  {
    gaya: "monolog_sensei", // "monolog_sensei" | "dialog_dua_host"
    durasiTargetMenit: 2,
    jumlahPembawa: 1,
    sapaanPembuka: "Ohayou gozaimasu, {{nama_guru}}-sensei! Selamat datang di ruang evaluasi suara Sensei-AI.",
    kalimatPenutup: "Otsukare-sama desu! Teruslah menginspirasi para siswa di kelas ya, Sensei. Ganbatte kudasai!",
  },
  null,
  2
);

export const DEFAULT_TEMPLATE_DOKUMEN_JSON = JSON.stringify(
  {
    namaInstansi: "SMA NEGERI HARAPAN NUSANTARA & LABORATORIUM PENDIDIKAN",
    subJudulInstansi: "UNIT SUPERVISI AKADEMIK DIGITAL BERBASIS AI (SENSEI-AI)",
    alamatInstansi: "Jl. Pendidikan Raya No. 88, Gedung Sakura Lt. 2 • Telp (021) 555-0192",
    logoUrl: "",
    warnaUtama: "#0e9ce8",
    warnaAksen: "#f43f80",
    kotaTandaTangan: "Jakarta",
    namaSupervisor: "Dr. H. Aris Setiawan, M.Pd.",
    nipSupervisor: "19780412 200312 1 004",
    jabatanSupervisor: "Kepala Sekolah / Supervisor Utama",
    isiTemplate: `Berdasarkan pelaksanaan instrumen supervisi akademik pada tanggal {{tanggal}}, berikut disampaikan laporan hasil evaluasi bagi {{nama_guru}}:\n\nSkor Akhir Supervisi: {{skor_total}} ({{predikat}})\n\nRingkasan Evaluasi AI:\n{{kesimpulan}}\n\nTabel Capaian Per Aspek:\n{{tabel_aspek}}\n\nRekomendasi & Saran Pengembangan:\n{{saran}}`,
  },
  null,
  2
);

export const DEFAULT_SETTINGS: Record<string, string> = {
  // OpenAI-compatible
  openai_base_url: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  openai_api_key:
    process.env.OPENAI_API_KEY || process.env.UNOROUTER_API_KEY || "",
  openai_model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openai_temperature: "0.4",
  openai_max_tokens: "2000",

  // Fish Audio
  fish_api_key: process.env.FISH_AUDIO_API_KEY || "",
  fish_voice_id: process.env.FISH_AUDIO_VOICE_ID || "sensei-custom-voice-v1",
  fish_model: process.env.FISH_AUDIO_MODEL || "s2.1-pro-free",
  fish_format: "mp3",
  fish_speed: "1.0",
  fish_temperature: "0.7",
  fish_top_p: "0.7",
  fish_normalize: "true",
  fish_chunk_length: "200",

  // Shiroko Bot Integration
  shiroko_url: process.env.SHIROKO_BOT_URL || "http://localhost:4000/api/webhook",
  shiroko_secret: process.env.SHIROKO_BOT_SECRET || "shiroko-secret-key-2026",
  shiroko_enabled: "false",

  // AI Assessment & Templates
  ai_system_prompt: DEFAULT_SYSTEM_PROMPT,
  ai_rubrik_json: DEFAULT_RUBRIK_JSON,
  podcast_template_json: DEFAULT_PODCAST_TEMPLATE_JSON,
  dokumen_template_json: DEFAULT_TEMPLATE_DOKUMEN_JSON,
};

export async function getAllSettingsDecrypted(): Promise<Record<string, string>> {
  const rows = await prisma.pengaturan.findMany();
  const result: Record<string, string> = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    if (row.isSecret || SECRET_KEYS.has(row.key)) {
      const dec = decryptSecret(row.value);
      if (dec) result[row.key] = dec;
    } else {
      result[row.key] = row.value;
    }
  }

  // Fallback otomatis ke UNOROUTER_API_KEY jika endpoint menggunakan unorouter.com dan key kosong
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

export async function saveSettings(updates: Record<string, string>): Promise<void> {
  for (const [key, rawValue] of Object.entries(updates)) {
    const isSecret = SECRET_KEYS.has(key);
    // Jika secret berupa nilai masked (mengandung ••••), jangan timpa secret yang sudah tersimpan
    if (isSecret && rawValue.includes("••••")) {
      continue;
    }
    const storedValue = isSecret ? (rawValue ? encryptSecret(rawValue) : "") : rawValue;
    await prisma.pengaturan.upsert({
      where: { key },
      update: { value: storedValue, isSecret },
      create: { key, value: storedValue, isSecret },
    });
  }
}

export function getPredikatFromSkor(skor: number, rubrikJsonStr?: string): string {
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
  if (skor >= 85) return "Sangat Baik";
  if (skor >= 75) return "Baik";
  if (skor >= 60) return "Cukup";
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
