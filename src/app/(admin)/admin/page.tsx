"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  Award,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  Radio,
  ShieldCheck,
  Target,
  Clock,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

interface DashboardData {
  stats: {
    totalGuru: number;
    totalSupervisi: number;
    rataRataSkor: number;
    totalDisahkan: number;
    totalTindakLanjut: number;
  };
  pipeline: {
    belum: number;
    menungguVerifikasi: number;
    perluRevisi: number;
    dalamPenilaian: number;
    disahkanKepsek: number;
    tindakLanjut: number;
  };
  statusKoneksi: {
    openai: { configured: boolean; baseUrl: string; model: string; label: string };
    shiroko: { enabled: boolean; url: string; label: string };
  };
  radarAspek: { aspek: string; rataRata: number; target: number }[];
  trenMingguan: { minggu: string; jumlahSupervisi: number; rataSkor: number }[];
  recentHasil: {
    id: string;
    skorTotal: number;
    predikat: string;
    disahkan: boolean;
    nomorRegistrasi?: string | null;
    createdAt: string;
    penugasan: {
      guru: { nama: string; mapel: string };
      instrumen: { judul: string };
    };
  }[];
  recentLogs: {
    id: string;
    namaUser: string;
    role: string;
    aksi: string;
    detail: string;
    waktu: string;
  }[];
}

export default function AdminBerandaPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState("");

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleResetDemo = async () => {
    if (
      !window.confirm(
        "Muat ulang data contoh (Demo Mode SIPENA)? Ini akan mengembalikan data 4 peran, perangkat ajar, instrumen, hasil disahkan, dan RTL Pengawas untuk keperluan presentasi."
      )
    )
      return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/dashboard", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setToast(json.message || "Data demo SIPENA berhasil dimuat ulang!");
        await fetchDashboard();
        setTimeout(() => setToast(""), 4500);
      }
    } finally {
      setResetting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">
          Memuat Dasbor Eksekutif SIPENA...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {toast}
        </div>
      )}

      {/* Banner Eksekutif */}
      <div className="rounded-3xl bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
            Panel Kendali Supervisi SIPENA
          </span>
          <h3 className="font-display font-bold text-xl mt-1">
            Ringkasan Eksekutif Supervisi & Evaluasi Akademik
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Pantau alur supervisi guru (verifikasi berkas, AI Co-Evaluator,
            pengesahan Kepala Sekolah, RTL Pengawas) serta kesiapan Bot
            WhatsApp dalam satu layar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDemo}
            disabled={resetting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
            {resetting ? "Memuat Data Demo..." : "Reset Data Demo"}
          </button>
          <Link
            href="/admin/hasil"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm transition"
          >
            Kelola Penilaian & RTL
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 4 Kartu Statistik Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Pendidik
            </p>
            <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">
              {data.stats.totalGuru}
            </p>
            <Link
              href="/admin/guru"
              className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
            >
              Kelola data pengguna →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Laporan Terbit
            </p>
            <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">
              {data.stats.totalSupervisi}
            </p>
            <span className="text-xs text-emerald-700 font-semibold mt-1 inline-block">
              {data.stats.totalDisahkan} Disahkan Kepsek
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rata-Rata Skor Sekolah
            </p>
            <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">
              {data.stats.rataRataSkor}
              <span className="text-sm font-normal text-slate-400"> / 100</span>
            </p>
            <span className="text-xs text-blue-600 font-semibold mt-1 inline-block">
              Standar Mutu Permendikbudristek
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              RTL Pengawas Aktif
            </p>
            <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">
              {data.stats.totalTindakLanjut}
            </p>
            <span className="text-xs text-indigo-600 font-semibold mt-1 inline-block">
              Pembinaan berkelanjutan
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pipeline Status Workflow 7 Tahap */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-slate-900 text-sm">
            Pipeline Tahapan Supervisi Akademik (Live)
          </h3>
          <Link
            href="/admin/hasil"
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Buka Antrean Kerja →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 font-bold">Belum / Draf</div>
            <div className="text-2xl font-display font-extrabold text-slate-900 mt-1">
              {data.pipeline.belum}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="text-amber-800 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Verifikasi
            </div>
            <div className="text-2xl font-display font-extrabold text-amber-900 mt-1">
              {data.pipeline.menungguVerifikasi}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
            <div className="text-rose-800 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Perlu Revisi
            </div>
            <div className="text-2xl font-display font-extrabold text-rose-900 mt-1">
              {data.pipeline.perluRevisi}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
            <div className="text-blue-800 font-bold">Dalam Penilaian</div>
            <div className="text-2xl font-display font-extrabold text-blue-900 mt-1">
              {data.pipeline.dalamPenilaian}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="text-emerald-800 font-bold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Disahkan
            </div>
            <div className="text-2xl font-display font-extrabold text-emerald-900 mt-1">
              {data.pipeline.disahkanKepsek}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200">
            <div className="text-indigo-800 font-bold flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> RTL Pengawas
            </div>
            <div className="text-2xl font-display font-extrabold text-indigo-900 mt-1">
              {data.pipeline.tindakLanjut}
            </div>
          </div>
        </div>
      </div>

      {/* Indikator Status Koneksi API */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600" />
            Status Layanan AI Co-Evaluator & Gateway Bot WhatsApp
          </h3>
          <Link
            href="/admin/pengaturan-api"
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Ubah Pengaturan API →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">
                1. Asisten AI Co-Evaluator (OpenAI-Compatible)
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  data.statusKoneksi.openai.configured
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {data.statusKoneksi.openai.configured ? "AKTIF" : "BELUM DIATUR"}
              </span>
            </div>
            <p className="text-xs font-semibold text-blue-700">
              {data.statusKoneksi.openai.label}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              Model: {data.statusKoneksi.openai.model} •{" "}
              {data.statusKoneksi.openai.baseUrl}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">
                2. Integrasi Bot WhatsApp Shiroko (Ambil Hasil & PDF WA)
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  data.statusKoneksi.shiroko.enabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {data.statusKoneksi.shiroko.enabled ? "PUSH AKTIF" : "PULL API SIAP"}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700">
              {data.statusKoneksi.shiroko.label}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              Endpoint: {data.statusKoneksi.shiroko.url}
            </p>
          </div>
        </div>
      </div>

      {/* Grafik Tren & Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card">
          <h3 className="font-display font-bold text-slate-900 text-base mb-1">
            Tren Supervisi & Rata-Rata Skor per Minggu
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Memantau jumlah instrumen selesai dan tren rata-rata skor mingguan.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trenMingguan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="minggu" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rataSkor"
                  name="Rata-rata Skor"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="jumlahSupervisi"
                  name="Supervisi Masuk"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card">
          <h3 className="font-display font-bold text-slate-900 text-base mb-1">
            Grafik Radar Rata-Rata Skor per Aspek
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Perbandingan capaian seluruh guru terhadap standar target sekolah (85).
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.radarAspek}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis
                  dataKey="aspek"
                  tick={{ fontSize: 12, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name="Rata-Rata Guru"
                  dataKey="rataRata"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.45}
                />
                <Radar
                  name="Target Standar"
                  dataKey="target"
                  stroke="#0f766e"
                  fill="#14b8a6"
                  fillOpacity={0.15}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ringkasan Hasil Terbaru & Log Aktivitas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-900 text-base">
              Hasil Supervisi Terbaru
            </h3>
            <Link
              href="/admin/hasil"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Lihat Semua →
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentHasil.map((h) => (
              <div
                key={h.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-slate-900 truncate">
                      {h.penugasan.guru.nama}
                    </p>
                    {h.disahkan && (
                      <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {h.penugasan.guru.mapel} • {h.penugasan.instrumen.judul}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 font-extrabold text-sm">
                    {Math.round(h.skorTotal)}
                  </span>
                  <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                    {h.predikat}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-900 text-base">
              Log Aktivitas Sistem Terbaru
            </h3>
            <Link
              href="/admin/log"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Buka Log Lengkap →
            </Link>
          </div>
          <div className="space-y-2.5">
            {data.recentLogs.map((l) => (
              <div
                key={l.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex items-start justify-between gap-3"
              >
                <div>
                  <span className="font-bold text-blue-700 mr-1.5">
                    [{l.aksi}]
                  </span>
                  <span className="text-slate-700">{l.detail}</span>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {new Date(l.waktu).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
