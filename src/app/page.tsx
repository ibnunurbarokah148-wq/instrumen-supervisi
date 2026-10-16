import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Headphones,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/guru");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sora-50 via-white to-sakura-50 flex flex-col justify-between p-6 sm:p-10">
      {/* Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SenseiMascot size="sm" mood="happy" />
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-sakura-600 block">
              Instrumen Supervisi Pendidikan v2.0
            </span>
            <h1 className="font-display font-bold text-lg text-slate-900">
              Sensei-AI • Web Agent Supervisor
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-sm font-bold text-sora-700 hover:bg-sora-100/70 transition"
          >
            Masuk Guru
          </Link>
          <Link
            href="/admin/login"
            className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Panel Admin
          </Link>
        </div>
      </header>

      {/* Hero & Pemisahan Portal */}
      <main className="max-w-5xl w-full mx-auto my-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-sora-200 shadow-sm text-xs font-bold text-sora-700 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-sakura-500" />
            Evaluasi AI Terstruktur • Podcast Fish Audio TTS • Export PDF & Word
          </div>
          <div className="flex justify-center mb-4">
            <SenseiMascot size="xl" mood="cheer" />
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Supervisi Akademik Lebih Hangat Bersama{" "}
            <span className="bg-gradient-to-r from-sora-600 to-sakura-500 bg-clip-text text-transparent">
              Sensei-AI
            </span>
          </h2>
          <p className="text-slate-600 mt-3 text-base leading-relaxed">
            Pilih portal akses sesuai peran Anda. Sistem ini memisahkan secara
            penuh area kerja <strong>Guru</strong> dan ruang kendali{" "}
            <strong>Administrator</strong> demi keamanan serta kenyamanan evaluasi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kartu Portal Guru */}
          <div className="rounded-3xl bg-white/90 backdrop-blur border-2 border-sora-200 p-7 shadow-pastel flex flex-col justify-between hover:border-sora-400 transition">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sora-400 to-sora-600 text-white flex items-center justify-center shadow-md mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-sora-100 text-sora-700 text-xs font-bold">
                Portal Guru (/guru)
              </span>
              <h3 className="font-display font-bold text-2xl text-slate-900 mt-3">
                Dashboard Guru & Refleksi Diri
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Isi instrumen supervisi bertahap dengan simpan draft otomatis,
                dapatkan evaluasi & saran dari Sensei-AI, dengarkan podcast
                suara reflektif, dan unduh laporan PDF/Word milik Anda.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-sakura-500" />
                  Pemutar Podcast Fish Audio dengan transkrip tersorot otomatis
                </li>
                <li className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-sora-500" />
                  Grafik radar capaian per aspek & riwayat lintas periode
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white font-bold text-sm shadow-md hover:opacity-95 transition"
              >
                Masuk ke Portal Guru
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                Akun Demo Guru: <code className="text-slate-600 font-semibold">aulia@sekolah.sch.id</code> / <code className="text-slate-600 font-semibold">guru123</code>
              </p>
            </div>
          </div>

          {/* Kartu Portal Admin */}
          <div className="rounded-3xl bg-slate-900 text-white border-2 border-slate-800 p-7 shadow-xl flex flex-col justify-between hover:border-sora-500/60 transition">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sakura-500 to-sora-500 text-white flex items-center justify-center shadow-md mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-sora-300 text-xs font-bold border border-slate-700">
                Control Room Admin (/admin)
              </span>
              <h3 className="font-display font-bold text-2xl text-white mt-3">
                Panel Administrator & Supervisor
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Kelola konfigurasi API (OpenAI-compatible, Fish Audio TTS, Bot
                Shiroko), susun instrumen pertanyaan dengan bantuan AI, tugaskan
                guru, pantau grafik seluruh sekolah, dan atur template dokumen.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sakura-400" />
                  Enkripsi API Key AES-256, Editor System Prompt & Rubrik AI
                </li>
                <li className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-sora-400" />
                  Rekapitulasi grafik radar/batang, koreksi nilai & export ZIP massal
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <Link
                href="/admin/login"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-sm shadow-md hover:bg-sora-50 transition"
              >
                Masuk ke Control Room Admin
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                Akun Demo Admin: <code className="text-sora-300 font-semibold">admin@sekolah.sch.id</code> / <code className="text-sora-300 font-semibold">admin123</code>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-400">
        Web Agent Supervisor Pendidikan v2 • Pemisahan Penuh Role Admin & Guru • Sensei-AI
      </footer>
    </div>
  );
}
