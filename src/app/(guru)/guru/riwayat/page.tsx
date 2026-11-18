"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Lock,
  Clock,
  FileDown,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface RiwayatItem {
  id: string;
  penugasanId: string;
  judulInstrumen: string;
  versiInstrumen: number;
  skorTotal: number;
  predikat: string;
  disahkan: boolean;
  nomorRegistrasi?: string | null;
  rtlProgres?: string | null;
  createdAt: string;
}

export default function GuruRiwayatPage() {
  const [list, setList] = useState<RiwayatItem[]>([]);
  const [narasi, setNarasi] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/guru/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setList(d.hasilSelesai || []);
        setNarasi(d.narasiPerkembangan || "");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="h-44 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
          <History className="w-4 h-4" />
          Arsip Portofolio & Riwayat Supervisi
        </div>
        <h1 className="font-display font-extrabold text-xl text-slate-900">
          Riwayat Evaluasi & Pengesahan Supervisi Akademik
        </h1>
        {narasi && (
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>{narasi}</span>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-sm text-slate-500">
          Belum ada arsip riwayat supervisi akademik.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((h) => (
            <div
              key={h.id}
              className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {h.disahkan ? (
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
                  <span className="text-[11px] font-semibold text-slate-500">
                    Versi {h.versiInstrumen} •{" "}
                    {new Date(h.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="font-display font-bold text-sm sm:text-base text-slate-900">
                  {h.judulInstrumen}
                </h2>
                {h.nomorRegistrasi && (
                  <p className="text-[11px] font-mono text-slate-500">
                    No. Reg: {h.nomorRegistrasi}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-900 text-xs font-extrabold">
                  {Math.round(h.skorTotal)} • {h.predikat}
                </div>
                <a
                  href={`/api/export/${h.id}?format=pdf`}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  PDF
                </a>
                <Link
                  href={`/guru/hasil/${h.penugasanId}`}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  Buka Rapor & RTL
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
