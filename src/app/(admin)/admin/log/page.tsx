"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Cpu,
  Headphones,
  DollarSign,
  AlertTriangle,
  Search,
  RefreshCw,
} from "lucide-react";

interface LogRow {
  id: string;
  namaUser: string | null;
  role: string | null;
  aksi: string;
  detail: string;
  waktu: string;
}

export default function AdminLogKeamananPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [usage, setUsage] = useState<{
    totalTokenAI: number;
    totalEvaluasiAI: number;
    totalKarakterTTS: number;
    totalPodcast: number;
    totalDurasiDetik: number;
    failedLogsCount: number;
    estimasiBiayaUSD: number;
    pricingInfo?: {
      mode: "unorouter" | "standard";
      providerLabel: string;
      modelName: string;
      isFree: boolean;
      modelRatio?: number;
      completionRatio?: number;
      ratePer1MInputUSD?: number;
      ratePer1MOutputUSD?: number;
      aiCostUSD: number;
      ttsCostUSD: number;
    };
  }>({
    totalTokenAI: 0,
    totalEvaluasiAI: 0,
    totalKarakterTTS: 0,
    totalPodcast: 0,
    totalDurasiDetik: 0,
    failedLogsCount: 0,
    estimasiBiayaUSD: 0,
  });
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.usage) setUsage(data.usage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const matchQ =
      l.aksi.toLowerCase().includes(query.toLowerCase()) ||
      l.detail.toLowerCase().includes(query.toLowerCase()) ||
      (l.namaUser || "").toLowerCase().includes(query.toLowerCase());
    const matchRole = roleFilter === "ALL" || l.role === roleFilter;
    return matchQ && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Penghitung Pemakaian Token AI & Karakter TTS (PRD Bagian 5.8) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Token AI Evaluator
            </p>
            <p className="font-display font-extrabold text-2xl text-slate-900 mt-1">
              {usage.totalTokenAI.toLocaleString("id-ID")}
            </p>
            <span className="text-xs text-sora-600 font-semibold">
              {usage.totalEvaluasiAI} evaluasi selesai
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sora-100 text-sora-600 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Karakter TTS Fish Audio
            </p>
            <p className="font-display font-extrabold text-2xl text-slate-900 mt-1">
              {usage.totalKarakterTTS.toLocaleString("id-ID")}
            </p>
            <span className="text-xs text-sakura-600 font-semibold">
              {usage.totalPodcast} audio ({Math.round(usage.totalDurasiDetik / 60)} mnt)
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sakura-100 text-sakura-600 flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Estimasi Biaya API
              </p>
              {usage.pricingInfo?.mode &&
                usage.pricingInfo.mode !== "standard" && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                    {usage.pricingInfo.providerLabel}
                  </span>
                )}
            </div>
            <p className="font-display font-extrabold text-2xl text-slate-900 mt-1">
              ${usage.estimasiBiayaUSD}
            </p>
            {usage.pricingInfo?.mode &&
            usage.pricingInfo.mode !== "standard" ? (
              <span className="text-[11px] text-emerald-600 font-semibold block leading-tight mt-0.5">
                {usage.pricingInfo.isFree
                  ? `${usage.pricingInfo.modelName} (Gratis / $0 AI)`
                  : `${usage.pricingInfo.modelName} (AI: $${usage.pricingInfo.aiCostUSD} • In: $${usage.pricingInfo.ratePer1MInputUSD || 0}/1M)`}
              </span>
            ) : (
              <span className="text-xs text-emerald-600 font-semibold block">
                Mode Standar (AI + TTS Cache)
              </span>
            )}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Insiden / Retry Gagal
            </p>
            <p className="font-display font-extrabold text-2xl text-slate-900 mt-1">
              {usage.failedLogsCount}
            </p>
            <span className="text-xs text-slate-500 font-semibold">
              Log panggilan AI/TTS/Login
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabel Log Aktivitas */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-sora-600" />
            <h3 className="font-display font-bold text-base text-slate-900">
              Log Aktivitas & Audit Keamanan ({filtered.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari aksi, user, atau detail..."
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
            >
              <option value="ALL">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="guru">Guru</option>
              <option value="system">System / Bot</option>
            </select>

            <button
              type="button"
              onClick={fetchLogs}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Segarkan Log"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="p-4">Waktu</th>
                <th className="p-4">Pengguna</th>
                <th className="p-4">Role</th>
                <th className="p-4">Aksi</th>
                <th className="p-4">Detail Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80">
                  <td className="p-4 text-slate-500 font-mono whitespace-nowrap">
                    {new Date(l.waktu).toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 font-bold text-slate-800">
                    {l.namaUser || "Sistem"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        l.role === "admin"
                          ? "bg-slate-900 text-white"
                          : l.role === "guru"
                          ? "bg-sora-100 text-sora-700"
                          : "bg-sakura-100 text-sakura-700"
                      }`}
                    >
                      {l.role || "system"}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-sora-700">
                    {l.aksi}
                  </td>
                  <td className="p-4 text-slate-700">{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
