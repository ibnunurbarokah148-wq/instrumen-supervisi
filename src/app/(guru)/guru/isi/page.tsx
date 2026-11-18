"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileEdit,
  Award,
  ArrowRight,
  AlertTriangle,
  FolderCheck,
} from "lucide-react";
import { getStatusBadgeInfo } from "@/components/WorkflowStepper";

interface PenugasanItem {
  id: string;
  status: string;
  tenggat?: string | null;
  catatanVerifikasi?: string | null;
  diverifikasiOleh?: string | null;
  instrumen: {
    id: string;
    judul: string;
    deskripsi?: string | null;
    versi: number;
    _count: { pertanyaan: number };
  };
  _count: { jawaban: number };
  hasil?: {
    id: string;
    skorTotal: number;
    predikat: string;
    disahkan: boolean;
  } | null;
}

export default function GuruIsiListPage() {
  const [penugasan, setPenugasan] = useState<PenugasanItem[]>([]);
  const [perangkatStatus, setPerangkatStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/guru/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setPenugasan(d.penugasan || []);
        setPerangkatStatus(d.perangkatTerbaru?.statusVerifikasi || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-slate-900">
            Instrumen Evaluasi Diri Guru
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Isi skor keterlaksanaan (skala 1–4), catatan refleksi, dan tautan
            bukti untuk diverifikasi dan dinilai oleh Kepala Sekolah.
          </p>
        </div>
        <Link
          href="/guru/perangkat"
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
        >
          <FolderCheck className="w-4 h-4 text-blue-600" />
          Status Perangkat:{" "}
          <span className="uppercase">
            {perangkatStatus === "lengkap"
              ? "Lengkap"
              : perangkatStatus === "perlu_revisi"
              ? "Revisi"
              : perangkatStatus
              ? "Menunggu"
              : "Belum Ada"}
          </span>
        </Link>
      </div>

      {penugasan.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white border border-slate-200">
          <FileEdit className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">
            Belum ada penugasan instrumen supervisi aktif.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {penugasan.map((p) => {
            const badge = getStatusBadgeInfo(p.status, p.hasil?.disahkan);
            const totalQ = p.instrumen._count.pertanyaan || 1;
            const answered = Math.min(p._count.jawaban, totalQ);
            const progress = Math.round((answered / totalQ) * 100);
            const isFinished =
              p.status === "selesai" ||
              p.status === "tindak_lanjut" ||
              p.hasil?.disahkan;

            return (
              <div
                key={p.id}
                className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Versi {p.instrumen.versi} • {totalQ} Indikator
                      </span>
                    </div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
                      {p.instrumen.judul}
                    </h2>
                    {p.instrumen.deskripsi && (
                      <p className="text-xs text-slate-600 max-w-2xl">
                        {p.instrumen.deskripsi}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isFinished ? (
                      <Link
                        href={`/guru/hasil/${p.id}`}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Award className="w-4 h-4" />
                        Lihat Rapor Resmi
                      </Link>
                    ) : (
                      <Link
                        href={`/guru/isi/${p.id}`}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                      >
                        {p.status === "perlu_revisi"
                          ? "Perbaiki Evaluasi Diri"
                          : p.status === "draft"
                          ? "Lanjutkan Pengisian"
                          : p.status === "dalam_penilaian"
                          ? "Tinjau Jawaban"
                          : "Mulai Isi Instrumen"}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>

                {p.status === "perlu_revisi" && p.catatanVerifikasi && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Catatan Pengembalian ({p.diverifikasiOleh || "Kepala Sekolah"}):</strong>{" "}
                      {p.catatanVerifikasi}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                    <span>Progres Pengisian Indikator</span>
                    <span>
                      {answered}/{totalQ} ({progress}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
