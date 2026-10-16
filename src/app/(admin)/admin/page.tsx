"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  Award,
  Headphones,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  Radio,
  Sparkles,
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
    totalPodcast: number;
  };
  statusKoneksi: {
    openai: { configured: boolean; baseUrl: string; model: string; label: string };
    fishAudio: { configured: boolean; voiceId: string; model: string; label: string };
    shiroko: { enabled: boolean; url: string; label: string };
  };
  radarAspek: { aspek: string; rataRata: number; target: number }[];
  trenMingguan: { minggu: string; jumlahSupervisi: number; rataSkor: number }[];
  recentHasil: {
    id: string;
    skorTotal: number;
    predikat: string;
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
        "Muat ulang data contoh (Demo Mode)? Ini akan mengembalikan data contoh guru, instrumen, dan podcast untuk keperluan presentasi."
      )
    )
      return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/dashboard", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setToast(json.message || "Data demo berhasil dimuat ulang!");
        await fetchDashboard();
        setTimeout(() => setToast(""), 4000);
      }
    } finally {
      setResetting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 text-sora-500 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">
          Memuat Control Room Administrator...
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

      {/* Baris Aksi Cepat & Mode Demo (PRD Bagian 13) */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-sora-900 to-slate-900 text-white p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sora-500/20 border border-sora-400/30 text-sora-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-sakura-400" />
            Beranda Control Room Sensei-AI
          </span>
          <h3 className="font-display font-bold text-xl mt-1">
            Ringkasan Eksekutif Supervisi Akademik
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Pantau seluruh guru, evaluasi AI, podcast Fish Audio, dan kesiapan integrasi dalam satu layar.
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
            {resetting ? "Memuat Data Demo..." : "Reset / Muat Data Demo"}
          </button>
          <Link
            href="/admin/hasil"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sakura-500 hover:bg-sakura-600 text-xs font-bold text-white shadow-sm transition"
          >
            Buka Semua Hasil
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 4 Kartu Statistik Utama (PRD Bagian 5.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Guru Terdaftar
            </p>
            <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">
              {data.stats.totalGuru}
            </p>
            <Link
              href="/admin/guru"
              className="text-xs font-bold text-sora-600 hover:underline mt-1 inline-block"
            >
              Kelola akun guru →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sora-100 text-sora-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Supervisi Masuk
            </p>
            <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">
              {data.stats.totalSupervisi}
            </p>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
              Terevaluasi AI 100%
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
            <span className="text-xs text-sora-600 font-semibold mt-1 inline-block">
              Predikat Mayoritas: Sangat Baik
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Podcast Terbuat
            </p>
            <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">
              {data.stats.totalPodcast}
            </p>
            <span className="text-xs text-sakura-600 font-semibold mt-1 inline-block">
              Audio evaluasi siap putar
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sakura-100 text-sakura-600 flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Indikator Status Koneksi API (PRD Bagian 5.1) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-sora-500" />
            Indikator Status Koneksi API & Layanan Eksternal
          </h3>
          <Link
            href="/admin/pengaturan-api"
            className="text-xs font-bold text-sora-600 hover:underline"
          >
            Ubah Pengaturan API →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">
                1. OpenAI-Compatible Evaluator
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
            <p className="text-xs font-semibold text-sora-700">
              {data.statusKoneksi.openai.label}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              Model: {data.statusKoneksi.openai.model} • {data.statusKoneksi.openai.baseUrl}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">
                2. Fish Audio Podcast TTS
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  data.statusKoneksi.fishAudio.configured
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {data.statusKoneksi.fishAudio.configured
                  ? "AKTIF"
                  : "BELUM DIATUR"}
              </span>
            </div>
            <p className="text-xs font-semibold text-sakura-600">
              {data.statusKoneksi.fishAudio.label}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              Voice ID: {data.statusKoneksi.fishAudio.voiceId || "-"} ({data.statusKoneksi.fishAudio.model})
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">
                3. Integrasi Bot WhatsApp Shiroko
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  data.statusKoneksi.shiroko.enabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {data.statusKoneksi.shiroko.enabled ? "AKTIF" : "STANDBY"}
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

      {/* Grafik Tren Supervisi per Minggu & Grafik Radar Rata-rata Skor per Aspek (PRD 5.1) */}
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
                  stroke="#0e9ce8"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="jumlahSupervisi"
                  name="Supervisi Masuk"
                  stroke="#f43f80"
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
                <PolarAngleAxis dataKey="aspek" tick={{ fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Rata-Rata Guru"
                  dataKey="rataRata"
                  stroke="#0e9ce8"
                  fill="#38b5f7"
                  fillOpacity={0.45}
                />
                <Radar
                  name="Target Standar"
                  dataKey="target"
                  stroke="#f43f80"
                  fill="#fb71a1"
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
              className="text-xs font-bold text-sora-600 hover:underline"
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
                  <p className="font-bold text-sm text-slate-900 truncate">
                    {h.penugasan.guru.nama}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {h.penugasan.guru.mapel} • {h.penugasan.instrumen.judul}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-xl bg-sora-100 text-sora-800 font-extrabold text-sm">
                    {h.skorTotal}
                  </span>
                  <p className="text-[11px] font-bold text-sakura-600 mt-0.5">
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
              className="text-xs font-bold text-sora-600 hover:underline"
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
                  <span className="font-bold text-sora-700 mr-1.5">
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
