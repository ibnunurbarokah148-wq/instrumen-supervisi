"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  FileDown,
  Lock,
  Clock,
  MessageSquare,
  Send,
  Sparkles,
  Target,
  Printer,
  X,
  QrCode,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { SenseiMascot } from "@/components/SenseiMascot";
import { WorkflowStepper, getStatusBadgeInfo } from "@/components/WorkflowStepper";

interface SkorAspek {
  aspek: string;
  skor: number;
  alasan: string;
}

interface HasilDetail {
  id: string;
  penugasanId: string;
  skorTotal: number;
  skorAsliAI?: number | null;
  predikat: string;
  kesimpulan: string;
  skorPerAspekJSON: string;
  kekuatanJSON: string;
  sarannyaJSON: string;
  catatanAdmin?: string | null;
  diubahAdminOleh?: string | null;
  editedAt?: string | null;
  disahkan: boolean;
  disahkanOleh?: string | null;
  disahkanNip?: string | null;
  disahkanPada?: string | null;
  nomorRegistrasi?: string | null;
  rtlRekomendasi?: string | null;
  rtlTarget?: string | null;
  rtlTenggat?: string | null;
  rtlProgres?: string | null;
  pengawasNama?: string | null;
  pengawasNip?: string | null;
  ditinjauPengawasPada?: string | null;
  status: string;
  createdAt: string;
}

interface PenugasanResponse {
  id: string;
  status: string;
  guru: {
    nama: string;
    nip: string;
    mapel: string;
    unitKerja?: string | null;
    nomorWA: string;
  };
  instrumen: {
    judul: string;
    versi: number;
  };
  hasil: HasilDetail | null;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const RTL_PROGRESS_OPTIONS = [
  "Belum Dimulai",
  "Sedang Berjalan",
  "Selesai Dilaksanakan",
];

export default function GuruHasilDetailPage() {
  const params = useParams<{ id: string }>();
  const penugasanId = params.id;

  const [penugasan, setPenugasan] = useState<PenugasanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showA4Modal, setShowA4Modal] = useState(false);

  // RTL progres updater
  const [rtlProgres, setRtlProgres] = useState("Belum Dimulai");
  const [savingRtl, setSavingRtl] = useState(false);
  const [rtlNotif, setRtlNotif] = useState("");

  // WhatsApp delivery
  const [sendingWa, setSendingWa] = useState(false);
  const [waMsg, setWaMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  // Retry AI draft (hanya jika belum disahkan)
  const [retryingAi, setRetryingAi] = useState(false);

  // Chat Asisten AI
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Selamat datang di Asisten AI Supervisi Akademik SIPENA. Anda dapat menanyakan strategi menindaklanjuti catatan Kepala Sekolah, rencana implementasi RTL Pengawas, atau ide perbaikan perangkat ajar.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal memuat detail laporan.");
      setPenugasan(d.penugasan);
      if (d.penugasan?.hasil?.rtlProgres) {
        setRtlProgres(d.penugasan.hasil.rtlProgres);
      }
    } catch (e: unknown) {
      setErrorMsg(
        e instanceof Error ? e.message : "Gagal memuat laporan supervisi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [penugasanId]);

  const handleUpdateRtlProgres = async () => {
    setSavingRtl(true);
    setRtlNotif("");
    try {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_rtl_progres",
          rtlProgres,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui progres.");
      setRtlNotif(json.message || "Progres RTL berhasil diperbarui.");
      await loadData();
    } catch (e: unknown) {
      setRtlNotif(
        e instanceof Error ? e.message : "Gagal memperbarui progres RTL."
      );
    } finally {
      setSavingRtl(false);
    }
  };

  const handleKirimWA = async () => {
    if (!penugasan?.hasil) return;
    setSendingWa(true);
    setWaMsg(null);
    try {
      const res = await fetch("/api/integrasi/shiroko/kirim-podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasilId: penugasan.hasil.id,
          penugasanId: penugasan.id,
          nomorWA: penugasan.guru.nomorWA,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setWaMsg({
          type: "err",
          text: json.error || "Gagal mengirim PDF hasil ke WhatsApp.",
        });
      } else {
        setWaMsg({
          type: "ok",
          text:
            json.message ||
            "Ringkasan hasil & laporan PDF resmi telah dikirimkan ke Bot WhatsApp.",
        });
      }
    } catch {
      setWaMsg({
        type: "err",
        text: "Gagal terhubung ke endpoint Bot WhatsApp.",
      });
    } finally {
      setSendingWa(false);
    }
  };

  const handleRetryAi = async () => {
    setRetryingAi(true);
    try {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      if (res.ok) {
        await loadData();
      }
    } finally {
      setRetryingAi(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/guru/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penugasanId, message: msg }),
      });
      const json = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            json.reply ||
            json.error ||
            "Maaf, Asisten AI belum dapat merespons saat ini.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Terjadi gangguan jaringan saat menghubungi Asisten AI.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm font-bold text-slate-600">
          Memuat laporan resmi hasil supervisi...
        </p>
      </div>
    );
  }

  if (errorMsg || !penugasan) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        {errorMsg || "Data hasil tidak ditemukan."}
      </div>
    );
  }

  const hasil = penugasan.hasil;
  if (!hasil) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center space-y-4">
        <SenseiMascot size="md" mood="thinking" className="mx-auto" />
        <h2 className="font-display font-bold text-lg text-slate-900">
          Evaluasi Diri Belum Mempunyai Draf Penilaian
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Status penugasan saat ini:{" "}
          <strong>{getStatusBadgeInfo(penugasan.status).label}</strong>. Anda
          dapat kembali ke pengisian instrumen atau menyusun draf analisis AI
          terlebih dahulu.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href={`/guru/isi/${penugasan.id}`}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold"
          >
            Buka Instrumen
          </Link>
          <button
            type="button"
            onClick={handleRetryAi}
            disabled={retryingAi}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            {retryingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Susun Draf Analisis AI
          </button>
        </div>
      </div>
    );
  }

  let skorPerAspek: SkorAspek[] = [];
  let kekuatan: string[] = [];
  let saran: string[] = [];
  try {
    skorPerAspek = JSON.parse(hasil.skorPerAspekJSON || "[]");
    kekuatan = JSON.parse(hasil.kekuatanJSON || "[]");
    saran = JSON.parse(hasil.sarannyaJSON || "[]");
  } catch {
    // fallback kosong
  }

  const badge = getStatusBadgeInfo(penugasan.status, hasil.disahkan);
  const tanggalEval = new Date(hasil.createdAt).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/guru/hasil"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Hasil
        </Link>

        {!hasil.disahkan && (
          <button
            type="button"
            onClick={handleRetryAi}
            disabled={retryingAi}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${retryingAi ? "animate-spin" : ""}`}
            />
            Perbarui Draf AI
          </button>
        )}
      </div>

      {/* Ringkasan Skor, Pengesahan & Aksi Dokumen */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}
              >
                {badge.label}
              </span>
              {hasil.disahkan ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                  <Lock className="w-3 h-3" />
                  Disahkan Permanen (Immutable)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">
                  <Clock className="w-3 h-3" />
                  Menunggu Pengesahan Kepala Sekolah
                </span>
              )}
            </div>

            <h1 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900">
              {penugasan.instrumen.judul}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {penugasan.guru.nama} (NIP {penugasan.guru.nip}) •{" "}
              {penugasan.guru.mapel} • Dievaluasi {tanggalEval}
            </p>
            {hasil.nomorRegistrasi && (
              <p className="text-xs font-mono text-slate-500">
                Nomor Registrasi Dokumen:{" "}
                <strong className="text-slate-800">{hasil.nomorRegistrasi}</strong>
              </p>
            )}
          </div>

          <div className="px-6 py-4 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white text-center shrink-0 shadow-sm">
            <div className="text-[11px] uppercase tracking-wider font-bold text-blue-100">
              Skor Akhir
            </div>
            <div className="text-4xl font-display font-extrabold leading-none mt-1">
              {Math.round(hasil.skorTotal)}
            </div>
            <div className="text-xs font-bold text-sky-100 mt-1.5">
              Predikat: {hasil.predikat}
            </div>
          </div>
        </div>

        <WorkflowStepper
          status={penugasan.status}
          disahkan={hasil.disahkan}
          hasRtl={Boolean(hasil.rtlRekomendasi)}
        />

        {/* Bar Tombol Ekspor & Kirim WA */}
        <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100">
          <a
            href={`/api/export/${hasil.id}?format=pdf`}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            Unduh PDF Resmi
          </a>
          <a
            href={`/api/export/${hasil.id}?format=docx`}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            Unduh Word (.docx)
          </a>
          <button
            type="button"
            onClick={() => setShowA4Modal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Pratinjau Dokumen Resmi A4
          </button>
          <button
            type="button"
            disabled={sendingWa}
            onClick={handleKirimWA}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {sendingWa ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
            Kirim Laporan PDF ke WhatsApp Saya
          </button>
        </div>

        {waMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border ${
              waMsg.type === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            {waMsg.text}
          </div>
        )}
      </section>

      {/* Catatan Pengesahan & Catatan Kepala Sekolah */}
      {(hasil.disahkan || hasil.catatanAdmin) && (
        <section className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold text-sm sm:text-base text-emerald-950 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Validasi & Catatan Kepala Sekolah
            </h2>
            {hasil.disahkanPada && (
              <span className="text-[11px] font-semibold text-emerald-800">
                Disahkan {new Date(hasil.disahkanPada).toLocaleDateString("id-ID")} oleh{" "}
                {hasil.disahkanOleh || "Kepala Sekolah"}
              </span>
            )}
          </div>
          {hasil.catatanAdmin && (
            <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed bg-white/80 rounded-xl p-3.5 border border-emerald-100">
              {hasil.catatanAdmin}
            </p>
          )}
        </section>
      )}

      {/* Temuan Substantif, Kekuatan & Saran */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            Temuan Substantif & Kesimpulan Supervisi
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2">
            {hasil.kesimpulan}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
            <h3 className="font-bold text-xs uppercase tracking-wider text-teal-800 mb-2">
              Kekuatan Pembelajaran
            </h3>
            <ul className="space-y-1.5 text-xs text-teal-950 list-disc pl-4">
              {kekuatan.map((k, idx) => (
                <li key={idx}>{k}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-800 mb-2">
              Rekomendasi Penguatan
            </h3>
            <ul className="space-y-1.5 text-xs text-amber-950 list-disc pl-4">
              {saran.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Rincian Capaian Per Aspek */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
        <h2 className="font-display font-bold text-base text-slate-900">
          Capaian Evaluasi Per Aspek
        </h2>
        <div className="space-y-3">
          {skorPerAspek.map((a, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-slate-900">
                  {a.aspek}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
                  {Math.round(a.skor)}/100
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${Math.min(100, Math.max(0, a.skor))}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {a.alasan}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Kartu RTL Pengawas Sekolah + Update Progres oleh Guru */}
      <section className="rounded-2xl bg-indigo-50/70 border border-indigo-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-base text-indigo-950 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Rencana Tindak Lanjut (RTL) Pengawas Sekolah
            </h2>
            <p className="text-xs text-indigo-700 mt-0.5">
              Pembina: {hasil.pengawasNama || "Pengawas Sekolah Pembina"}{" "}
              {hasil.pengawasNip ? `(NIP ${hasil.pengawasNip})` : ""}
            </p>
          </div>
          {hasil.rtlTenggat && (
            <span className="px-3 py-1 rounded-full bg-white border border-indigo-200 text-xs font-bold text-indigo-800">
              Tenggat: {hasil.rtlTenggat}
            </span>
          )}
        </div>

        {hasil.rtlRekomendasi ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-indigo-100">
                <div className="font-bold text-indigo-700 uppercase text-[10px] mb-1">
                  Rekomendasi Pembinaan Pengawas
                </div>
                <p className="text-slate-800 leading-relaxed">
                  {hasil.rtlRekomendasi}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-indigo-100">
                <div className="font-bold text-indigo-700 uppercase text-[10px] mb-1">
                  Target Indikator Keberhasilan
                </div>
                <p className="text-slate-800 leading-relaxed">
                  {hasil.rtlTarget || "Melaksanakan perbaikan perangkat dan praktik kelas."}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-indigo-200/70">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-indigo-900">
                  Pembaruan Progres RTL Anda:
                </span>
                <select
                  value={rtlProgres}
                  onChange={(e) => setRtlProgres(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-indigo-300 bg-white text-xs font-bold text-slate-800"
                >
                  {RTL_PROGRESS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={savingRtl}
                  onClick={handleUpdateRtlProgres}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-60"
                >
                  {savingRtl ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Simpan Progres
                </button>
              </div>
              {rtlNotif && (
                <span className="text-xs font-bold text-emerald-700">
                  {rtlNotif}
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-indigo-800 bg-white/80 rounded-xl p-3 border border-indigo-100">
            Pengawas Sekolah belum menetapkan catatan RTL untuk laporan ini.
          </p>
        )}
      </section>

      {/* Asisten AI Supervisi Akademik Chat */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <SenseiMascot size="sm" mood="thinking" />
          <div>
            <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-1.5">
              Asisten AI Supervisi Akademik (SIPENA Advisor)
              <Sparkles className="w-4 h-4 text-blue-600" />
            </h2>
            <p className="text-xs text-slate-500">
              Konsultasikan langkah implementasi catatan Kepala Sekolah dan RTL
              Pengawas Anda.
            </p>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Menyusun rekomendasi tindak lanjut...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Contoh: Buatkan contoh aktivitas diferensiasi untuk aspek Kegiatan Inti..."
            className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Tanya AI
          </button>
        </form>
      </section>

      {/* Modal Pratinjau Dokumen Resmi A4 (3 Tanda Tangan) */}
      {showA4Modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <span className="font-bold text-xs sm:text-sm">
                Pratinjau Dokumen Resmi A4 — Berita Acara & Rapor Supervisi
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/export/${hasil.id}?format=pdf`}
                  className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold"
                >
                  Unduh PDF
                </a>
                <button
                  type="button"
                  onClick={() => setShowA4Modal(false)}
                  className="p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5 text-slate-900 text-xs max-h-[75vh] overflow-y-auto">
              {/* Kop Surat Formal */}
              <div className="border-b-4 border-double border-slate-800 pb-3 text-center space-y-0.5">
                <p className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wide">
                  PEMERINTAH PROVINSI / DINAS PENDIDIKAN • SATUAN PENDIDIKAN
                </p>
                <p className="font-bold text-xs text-blue-800">
                  SISTEM INFORMASI SUPERVISI & EVALUASI AKADEMIK (SIPENA)
                </p>
                <p className="text-[11px] text-slate-500">
                  Dokumen Berita Acara & Rapor Supervisi Akademik Terstandar
                </p>
              </div>

              {/* Nomor Registrasi & QR */}
              <div className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    LAPORAN HASIL SUPERVISI AKADEMIK
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                    No. Registrasi: {hasil.nomorRegistrasi || `SIPENA-${hasil.id.slice(0, 8).toUpperCase()}`}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                    Status: {hasil.disahkan ? "DISAHKAN PERMANEN (IMMUTABLE)" : "DRAF PENILAIAN"}
                  </div>
                </div>
                <div className="p-2 bg-white border border-slate-300 rounded-lg text-center shrink-0">
                  <QrCode className="w-8 h-8 text-slate-800 mx-auto" />
                  <span className="text-[9px] font-mono text-slate-500">
                    VERIFIED
                  </span>
                </div>
              </div>

              {/* Identitas Guru */}
              <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-xl p-3">
                <div>
                  <strong>Nama Pendidik:</strong> {penugasan.guru.nama}
                </div>
                <div>
                  <strong>NIP:</strong> {penugasan.guru.nip}
                </div>
                <div>
                  <strong>Mata Pelajaran:</strong> {penugasan.guru.mapel}
                </div>
                <div>
                  <strong>Skor Akhir / Predikat:</strong>{" "}
                  {Math.round(hasil.skorTotal)}/100 ({hasil.predikat})
                </div>
              </div>

              {/* Ringkasan & Aspek */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase text-[11px] text-slate-700">
                  Ringkasan Temuan & Skor Per Aspek
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  {hasil.kesimpulan}
                </p>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-2 text-left">
                        Aspek
                      </th>
                      <th className="border border-slate-300 p-2 text-center w-16">
                        Skor
                      </th>
                      <th className="border border-slate-300 p-2 text-left">
                        Analisis
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {skorPerAspek.map((a, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-2 font-bold">
                          {a.aspek}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {Math.round(a.skor)}
                        </td>
                        <td className="border border-slate-300 p-2">
                          {a.alasan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* RTL Pengawas */}
              {hasil.rtlRekomendasi && (
                <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                  <div className="font-bold text-[11px] uppercase">
                    Rencana Tindak Lanjut (RTL) Pengawas Sekolah
                  </div>
                  <p>{hasil.rtlRekomendasi}</p>
                  <p className="text-[11px] text-slate-600">
                    Target: {hasil.rtlTarget || "-"} • Tenggat:{" "}
                    {hasil.rtlTenggat || "-"} • Progres:{" "}
                    {hasil.rtlProgres || "Belum Dimulai"}
                  </p>
                </div>
              )}

              {/* Blok 3 Tanda Tangan Resmi */}
              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-[11px]">
                <div className="space-y-12">
                  <div>
                    <div>Mengetahui,</div>
                    <div className="font-bold">Pengawas Sekolah Pembina</div>
                  </div>
                  <div>
                    <div className="font-bold underline">
                      {hasil.pengawasNama || "Drs. H. Bambang Sudibyo, M.Pd."}
                    </div>
                    <div>NIP. {hasil.pengawasNip || "19680512 199303 1 004"}</div>
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <div>Yang Disupervisi,</div>
                    <div className="font-bold">Guru Mata Pelajaran</div>
                  </div>
                  <div>
                    <div className="font-bold underline">
                      {penugasan.guru.nama}
                    </div>
                    <div>NIP. {penugasan.guru.nip}</div>
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <div>Disahkan di Sekolah,</div>
                    <div className="font-bold">Kepala Sekolah / Supervisor</div>
                  </div>
                  <div>
                    <div className="font-bold underline">
                      {hasil.disahkanOleh || "Dr. Hj. Ratna Kusuma, M.Pd."}
                    </div>
                    <div>
                      NIP. {hasil.disahkanNip || "19720415 199802 2 001"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
