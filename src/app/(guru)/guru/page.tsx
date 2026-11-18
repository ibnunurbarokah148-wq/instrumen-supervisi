"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileEdit,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FolderCheck,
  MessageSquare,
  FileDown,
  Lock,
  Target,
  Send,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { SenseiMascot } from "@/components/SenseiMascot";
import { WorkflowStepper, getStatusBadgeInfo } from "@/components/WorkflowStepper";

interface DashboardData {
  guru: {
    id: string;
    nama: string;
    email: string;
    nip: string;
    jabatan?: string | null;
    unitKerja?: string | null;
    nomorWA: string;
    mapel: string;
  };
  perangkatTerbaru: {
    id: string;
    judulPembelajaran: string;
    statusVerifikasi: string;
    catatanSupervisor?: string | null;
    diverifikasiOleh?: string | null;
    updatedAt: string;
  } | null;
  penugasan: Array<{
    id: string;
    status: string;
    tenggat?: string | null;
    catatanVerifikasi?: string | null;
    diverifikasiOleh?: string | null;
    instrumen: {
      id: string;
      judul: string;
      deskripsi?: string | null;
      _count: { pertanyaan: number };
    };
    _count: { jawaban: number };
    hasil?: {
      id: string;
      skorTotal: number;
      predikat: string;
      kesimpulan: string;
      disahkan: boolean;
      nomorRegistrasi?: string | null;
      rtlRekomendasi?: string | null;
      rtlProgres?: string | null;
    } | null;
  }>;
  hasilTerakhir: {
    id: string;
    penugasanId: string;
    skorTotal: number;
    predikat: string;
    kesimpulan: string;
    disahkan: boolean;
    disahkanOleh?: string | null;
    nomorRegistrasi?: string | null;
    rtlRekomendasi?: string | null;
    rtlTarget?: string | null;
    rtlTenggat?: string | null;
    rtlProgres?: string | null;
    pengawasNama?: string | null;
    createdAt: string;
    judulInstrumen: string;
  } | null;
  riwayatTren: Array<{
    periode: string;
    tanggal: string;
    judul: string;
    skorTotal: number;
    predikat: string;
    disahkan: boolean;
    penugasanId: string;
  }>;
  narasiPerkembangan: string;
}

export default function GuruBerandaPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingWa, setSendingWa] = useState(false);
  const [waNotif, setWaNotif] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/guru/dashboard")
      .then(async (r) => {
        if (!r.ok) throw new Error("Gagal memuat dasbor pendidik.");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleKirimHasilWA = async (hasilId: string) => {
    setSendingWa(true);
    setWaNotif(null);
    try {
      const res = await fetch("/api/integrasi/shiroko/kirim-podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasilId,
          nomorWA: data?.guru?.nomorWA,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setWaNotif({
          type: "err",
          text: json.error || "Gagal mengirim ringkasan PDF ke WhatsApp.",
        });
      } else {
        setWaNotif({
          type: "ok",
          text:
            json.message ||
            "Ringkasan hasil & laporan PDF resmi telah disiapkan untuk Bot WhatsApp.",
        });
      }
    } catch {
      setWaNotif({
        type: "err",
        text: "Terjadi kesalahan jaringan saat menghubungi gateway WhatsApp.",
      });
    } finally {
      setSendingWa(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-36 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
        {error || "Data beranda tidak tersedia."}
      </div>
    );
  }

  const perangkat = data.perangkatTerbaru;
  const activePenugasan =
    data.penugasan.find(
      (p) =>
        p.status === "perlu_revisi" ||
        p.status === "belum" ||
        p.status === "draft" ||
        p.status === "menunggu_verifikasi" ||
        p.status === "dalam_penilaian"
    ) || data.penugasan[0];

  const tugasAktifCount = data.penugasan.filter(
    (p) => p.status !== "selesai" && p.status !== "tindak_lanjut"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Sambutan Resmi */}
      <section className="rounded-3xl bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <SenseiMascot size="md" mood="happy" className="shrink-0" />
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold">
                <Sparkles className="w-3 h-3" />
                Sistem Informasi Supervisi & Evaluasi Akademik
              </span>
              <h1 className="font-display font-extrabold text-xl sm:text-2xl mt-1.5">
                Selamat Datang, {data.guru.nama}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                NIP {data.guru.nip} • {data.guru.jabatan || "Guru"} •{" "}
                {data.guru.mapel} • {data.guru.unitKerja || "Satuan Pendidikan"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/guru/perangkat"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <FolderCheck className="w-4 h-4 text-sky-300" />
              Kelola 6 Perangkat Ajar
            </Link>
            <Link
              href="/guru/isi"
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileEdit className="w-4 h-4" />
              Instrumen ({tugasAktifCount} Aktif)
            </Link>
          </div>
        </div>
      </section>

      {/* Banner Status Verifikasi Perangkat Pembelajaran */}
      {!perangkat ? (
        <section className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-amber-950">
                Perangkat Pembelajaran Belum Diunggah
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Lengkapi 6 dokumen bukti (RPP/Modul Ajar, LKPD, Instrumen
                Asesmen, Media, Materi, dan Refleksi) sebelum pengajuan
                verifikasi Kepala Sekolah.
              </p>
            </div>
          </div>
          <Link
            href="/guru/perangkat"
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0"
          >
            Unggah Perangkat
          </Link>
        </section>
      ) : perangkat.statusVerifikasi === "perlu_revisi" ? (
        <section className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-rose-950">
                Perangkat Ajar Memerlukan Revisi ({perangkat.judulPembelajaran})
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                Catatan Verifikator ({perangkat.diverifikasiOleh || "Kepala Sekolah"}):{" "}
                <span className="font-semibold">
                  {perangkat.catatanSupervisor ||
                    "Mohon perbaiki kelengkapan perangkat pembelajaran."}
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/guru/perangkat"
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0"
          >
            Perbaiki Perangkat
          </Link>
        </section>
      ) : perangkat.statusVerifikasi === "lengkap" ? (
        <section className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Perangkat ajar{" "}
              <strong className="font-bold">
                {perangkat.judulPembelajaran}
              </strong>{" "}
              telah diverifikasi{" "}
              <strong className="font-bold">Lengkap & Siap Supervisi</strong>{" "}
              oleh {perangkat.diverifikasiOleh || "Kepala Sekolah"}.
            </span>
          </div>
          <Link
            href="/guru/perangkat"
            className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
          >
            Lihat Berkas
          </Link>
        </section>
      ) : (
        <section className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-blue-900">
            <Clock className="w-5 h-5 text-blue-600 shrink-0" />
            <span>
              Perangkat{" "}
              <strong className="font-bold">
                {perangkat.judulPembelajaran}
              </strong>{" "}
              berstatus{" "}
              <strong className="font-bold">Menunggu Verifikasi</strong>{" "}
              Kepala Sekolah.
            </span>
          </div>
          <Link
            href="/guru/perangkat"
            className="text-xs font-bold text-blue-700 hover:underline shrink-0"
          >
            Kelola
          </Link>
        </section>
      )}

      {/* Workflow Stepper Alur Supervisi Terkini */}
      {activePenugasan && (
        <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Alur Siklus Supervisi Aktif
              </p>
              <h2 className="font-display font-bold text-sm sm:text-base text-slate-900">
                {activePenugasan.instrumen.judul}
              </h2>
            </div>
            <Link
              href={
                activePenugasan.status === "selesai" ||
                activePenugasan.status === "tindak_lanjut" ||
                activePenugasan.hasil
                  ? `/guru/hasil/${activePenugasan.id}`
                  : `/guru/isi/${activePenugasan.id}`
              }
              className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Buka Tahap Ini
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <WorkflowStepper
            status={activePenugasan.status}
            disahkan={activePenugasan.hasil?.disahkan}
            hasRtl={Boolean(activePenugasan.hasil?.rtlRekomendasi)}
          />
        </section>
      )}

      {/* Grid: Hasil Supervisi Terakhir + Bot WhatsApp & Tren Skor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kartu Hasil & WhatsApp Delivery */}
        <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          {data.hasilTerakhir ? (
            <>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                        <Award className="w-3 h-3" />
                        Hasil Supervisi Terbaru
                      </span>
                      {data.hasilTerakhir.disahkan ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <Lock className="w-3 h-3" />
                          Disahkan Kepsek
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                          <Clock className="w-3 h-3" />
                          Menunggu Pengesahan
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-base text-slate-900 mt-2">
                      {data.hasilTerakhir.judulInstrumen}
                    </h3>
                    {data.hasilTerakhir.nomorRegistrasi && (
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        No. Reg: {data.hasilTerakhir.nomorRegistrasi}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 px-3.5 py-2 rounded-2xl bg-blue-600 text-white">
                    <div className="text-2xl font-display font-extrabold leading-none">
                      {Math.round(data.hasilTerakhir.skorTotal)}
                    </div>
                    <div className="text-[10px] font-bold text-blue-100 mt-1">
                      {data.hasilTerakhir.predikat}
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {data.hasilTerakhir.kesimpulan}
                </p>

                {data.hasilTerakhir.rtlRekomendasi && (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-1">
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span className="inline-flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-indigo-600" />
                        RTL Pengawas ({data.hasilTerakhir.pengawasNama || "Pengawas Pembina"})
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[10px]">
                        {data.hasilTerakhir.rtlProgres || "Belum Dimulai"}
                      </span>
                    </div>
                    <p className="line-clamp-2">
                      {data.hasilTerakhir.rtlRekomendasi}
                    </p>
                  </div>
                )}

                {waNotif && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border ${
                      waNotif.type === "ok"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}
                  >
                    {waNotif.text}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <Link
                  href={`/guru/hasil/${data.hasilTerakhir.penugasanId}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  Lihat Rapor & Diskusi AI
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <a
                  href={`/api/export/${data.hasilTerakhir.id}?format=pdf`}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  Unduh PDF
                </a>
                <button
                  type="button"
                  disabled={sendingWa}
                  onClick={() => handleKirimHasilWA(data.hasilTerakhir!.id)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {sendingWa ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                  Kirim PDF ke WhatsApp
                </button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-2">
              <Award className="w-9 h-9 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                Belum Ada Laporan Supervisi
              </p>
              <p className="text-xs text-slate-500">
                Lengkapi perangkat pembelajaran dan isi instrumen evaluasi diri
                untuk memulai siklus supervisi.
              </p>
            </div>
          )}
        </section>

        {/* Grafik Tren Perkembangan Skor */}
        <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700">
                <TrendingUp className="w-3.5 h-3.5" />
                Grafik Tren Nilai Supervisi
              </span>
              <h3 className="font-display font-bold text-base text-slate-900">
                Perkembangan Kompetensi Mengajar
              </h3>
            </div>
            <Link
              href="/guru/riwayat"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Riwayat Lengkap
            </Link>
          </div>

          {data.riwayatTren.length > 0 ? (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.riwayatTren}>
                  <defs>
                    <linearGradient id="skorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="skorTotal"
                    name="Skor Supervisi"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#skorGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
              Grafik tren akan muncul setelah evaluasi supervisi pertama selesai.
            </div>
          )}

          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
            {data.narasiPerkembangan}
          </p>
        </section>
      </div>

      {/* Daftar Tugas Instrumen Supervisi */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-slate-900">
            Daftar Penugasan Supervisi Anda
          </h2>
          <Link
            href="/guru/isi"
            className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            Semua Instrumen
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.penugasan.map((p) => {
            const badge = getStatusBadgeInfo(p.status, p.hasil?.disahkan);
            const isResultView =
              p.status === "selesai" ||
              p.status === "tindak_lanjut" ||
              p.hasil?.disahkan;

            return (
              <div
                key={p.id}
                className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {p._count.jawaban}/{p.instrumen._count.pertanyaan} Butir
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-sm sm:text-base text-slate-900">
                    {p.instrumen.judul}
                  </h3>
                  {p.status === "perlu_revisi" && p.catatanVerifikasi && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <strong>Catatan Revisi Kepsek:</strong>{" "}
                      {p.catatanVerifikasi}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {p.hasil ? (
                    <span className="text-xs font-bold text-slate-700">
                      Skor:{" "}
                      <span className="text-blue-700">
                        {Math.round(p.hasil.skorTotal)}
                      </span>{" "}
                      ({p.hasil.predikat})
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {p.tenggat
                        ? `Tenggat: ${new Date(p.tenggat).toLocaleDateString("id-ID")}`
                        : "Penugasan Aktif"}
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    {p.hasil && !isResultView && (
                      <Link
                        href={`/guru/hasil/${p.id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                      >
                        Draf Hasil
                      </Link>
                    )}
                    <Link
                      href={isResultView ? `/guru/hasil/${p.id}` : `/guru/isi/${p.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1"
                    >
                      {isResultView ? (
                        "Buka Rapor"
                      ) : p.status === "perlu_revisi" ? (
                        "Revisi & Ajukan"
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          Isi Instrumen
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
