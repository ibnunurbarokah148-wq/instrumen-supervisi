"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  ArrowRight,
  Lock,
  Clock,
  FileDown,
  Target,
} from "lucide-react";
import { getStatusBadgeInfo } from "@/components/WorkflowStepper";

interface HasilSummary {
  id: string;
  penugasanId: string;
  judulInstrumen: string;
  statusPenugasan: string;
  skorTotal: number;
  predikat: string;
  kesimpulan: string;
  disahkan: boolean;
  nomorRegistrasi?: string | null;
  rtlRekomendasi?: string | null;
  rtlProgres?: string | null;
  createdAt: string;
}

export default function GuruHasilIndexPage() {
  const [list, setList] = useState<HasilSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/guru/dashboard")
      .then((r) => r.json())
      .then((d) => setList(d.hasilSelesai || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="h-32 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
        <h1 className="font-display font-extrabold text-xl text-slate-900">
          Hasil Evaluasi & Rapor Supervisi Akademik
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Tinjau analisis capaian per aspek, catatan Kepala Sekolah, status
          pengesahan permanen, Rencana Tindak Lanjut (RTL) Pengawas, serta kirim
          atau unduh dokumen resmi PDF/Word.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white border border-slate-200">
          <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">
            Belum ada hasil supervisi yang diterbitkan.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Silakan isi instrumen evaluasi diri dan ajukan penilaian kepada
            Kepala Sekolah terlebih dahulu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((item) => {
            const badge = getStatusBadgeInfo(item.statusPenugasan, item.disahkan);
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {item.disahkan ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <Lock className="w-3 h-3" />
                          Immutable • {item.nomorRegistrasi || "Terdaftar"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                          <Clock className="w-3 h-3" />
                          Draf / Penilaian Berjalan
                        </span>
                      )}
                    </div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
                      {item.judulInstrumen}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Evaluasi tanggal{" "}
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="px-4 py-2 rounded-2xl bg-blue-600 text-white text-center shrink-0">
                    <div className="text-2xl font-display font-extrabold leading-none">
                      {Math.round(item.skorTotal)}
                    </div>
                    <div className="text-[11px] font-bold text-blue-100 mt-1">
                      {item.predikat}
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                  {item.kesimpulan}
                </p>

                {item.rtlRekomendasi && (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold line-clamp-1">
                      <Target className="w-4 h-4 text-indigo-600 shrink-0" />
                      RTL Pengawas: {item.rtlRekomendasi}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[10px] font-bold shrink-0">
                      {item.rtlProgres || "Belum Dimulai"}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/api/export/${item.id}?format=pdf`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5 text-blue-600" />
                      PDF Resmi
                    </a>
                    <a
                      href={`/api/export/${item.id}?format=docx`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5 text-teal-600" />
                      Word (.docx)
                    </a>
                  </div>
                  <Link
                    href={`/guru/hasil/${item.penugasanId}`}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    Buka Detail & Asisten AI
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
