import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, isSupervisorRole } from "@/lib/auth";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  ShieldCheck,
  GraduationCap,
  Sparkles,
  MessageSquareText,
  FileCheck2,
  Eye,
  ArrowRight,
  Lock,
} from "lucide-react";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect(isSupervisorRole(session.role) ? "/admin" : "/guru");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/30 flex flex-col justify-between p-6 sm:p-10">
      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SenseiMascot size="sm" mood="happy" />
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 block">
              Permendikbudristek No. 16 Tahun 2022
            </span>
            <h1 className="font-display font-bold text-lg text-slate-900">
              SIPENA • Supervisi & Evaluasi Akademik
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-sm font-bold text-blue-700 hover:bg-blue-100/70 transition"
          >
            Masuk Guru
          </Link>
          <Link
            href="/admin/login"
            className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Portal Pimpinan & Admin
          </Link>
        </div>
      </header>

      {/* Hero & Arsitektur 4 Peran */}
      <main className="max-w-6xl w-full mx-auto my-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-blue-200 shadow-xs text-xs font-bold text-blue-800 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Alur 4 Peran Resmi • AI Co-Evaluator • Berita Acara 3 Pihak • Bot WhatsApp
          </div>
          <div className="flex justify-center mb-4">
            <SenseiMascot size="lg" mood="cheer" />
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Supervisi Akademik Terstandar, Objektif, dan Terintegrasi{" "}
            <span className="bg-gradient-to-r from-blue-700 to-emerald-600 bg-clip-text text-transparent">
              Asisten AI & WhatsApp
            </span>
          </h2>
          <p className="text-slate-600 mt-3 text-base leading-relaxed">
            Mengelola siklus lengkap supervisi pendidikan: Pengajuan Perangkat
            Ajar & Evaluasi Diri Guru, Verifikasi & Penilaian Observasi Kepala
            Sekolah berbantuan AI, Pengesahan Permanen (Immutable), Rencana
            Tindak Lanjut (RTL) Pengawas Sekolah, hingga penarikan hasil via
            Bot WhatsApp.
          </p>
        </div>

        {/* 4 Tahap Ekosistem */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              1. Guru (Evaluasi Diri)
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Mengunggah 6 berkas perangkat pembelajaran & mengisi rubrik 1–4
              disertai bukti keterlaksanaan kelas.
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              2. Kepala Sekolah + AI
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Memverifikasi perangkat, menilai observasi dengan draf AI
              Co-Evaluator, lalu mengesahkan & mengunci laporan.
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              3. Pengawas Pembina
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Meninjau laporan disahkan, menetapkan Rencana Tindak Lanjut (RTL)
              & memantau target mutu.
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              4. Bot WhatsApp & PDF
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Guru & pimpinan dapat menarik nilai, temuan, RTL, dan Berita Acara
              PDF 3 tanda tangan langsung via WA.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kartu Portal Guru */}
          <div className="rounded-3xl bg-white border-2 border-blue-200 p-7 shadow-sm flex flex-col justify-between hover:border-blue-400 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  Portal Pendidik (/login)
                </span>
                <FileCheck2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-display font-bold text-2xl text-slate-900">
                Portal Guru & Perangkat Ajar
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Lengkapi 6 komponen Modul Ajar, isi instrumen berbasis rubrik
                1–4, pantau progres verifikasi Kepala Sekolah & RTL Pengawas,
                serta tarik PDF hasil via Bot WhatsApp.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-sm transition"
              >
                Masuk ke Portal Guru
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Kartu Portal Kepala Sekolah, Pengawas & Admin */}
          <div className="rounded-3xl bg-slate-900 text-white border-2 border-slate-800 p-7 shadow-xl flex flex-col justify-between hover:border-blue-500/60 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-slate-800 text-blue-300 text-xs font-bold border border-slate-700">
                  Portal Pimpinan & Admin (/admin/login)
                </span>
                <Lock className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-display font-bold text-2xl text-white">
                Kepala Sekolah, Pengawas & Admin
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Verifikasi perangkat guru, jalankan AI Co-Evaluator, sahkan &
                kunci berita acara (Immutable), tetapkan RTL Pengawas Sekolah,
                serta kelola API AI & Bot WhatsApp.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <Link
                href="/admin/login"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-sm shadow-md hover:bg-blue-50 transition"
              >
                Masuk Portal Pimpinan & Admin
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-slate-500">
        SIPENA • Sistem Informasi Supervisi & Evaluasi Akademik Berbasis AI • 4-Role & Integrasi Bot WhatsApp
      </footer>
    </div>
  );
}
