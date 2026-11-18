"use client";

import React from "react";
import {
  FileEdit,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  ShieldCheck,
  Target,
  CheckCircle2,
} from "lucide-react";

export function getStatusBadgeInfo(status: string, disahkan?: boolean) {
  switch (status) {
    case "tindak_lanjut":
      return {
        label: "RTL Pengawas Aktif",
        cls: "bg-indigo-100 text-indigo-800 border-indigo-200",
        stepIndex: 5,
      };
    case "selesai":
      return disahkan
        ? {
            label: "Disahkan Kepsek (Immutable)",
            cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
            stepIndex: 4,
          }
        : {
            label: "Selesai (Menunggu Pengesahan)",
            cls: "bg-teal-100 text-teal-800 border-teal-200",
            stepIndex: 3,
          };
    case "dalam_penilaian":
      return {
        label: "Dalam Penilaian Kepsek",
        cls: "bg-blue-100 text-blue-800 border-blue-200",
        stepIndex: 3,
      };
    case "perlu_revisi":
      return {
        label: "Perlu Revisi Berkas",
        cls: "bg-rose-100 text-rose-800 border-rose-200",
        stepIndex: 2,
      };
    case "menunggu_verifikasi":
      return {
        label: "Menunggu Verifikasi",
        cls: "bg-amber-100 text-amber-800 border-amber-200",
        stepIndex: 1,
      };
    case "draft":
      return {
        label: "Draf Evaluasi Diri",
        cls: "bg-slate-100 text-slate-700 border-slate-200",
        stepIndex: 0,
      };
    default:
      return {
        label: "Belum Dikerjakan",
        cls: "bg-slate-100 text-slate-600 border-slate-200",
        stepIndex: 0,
      };
  }
}

export function WorkflowStepper({
  status,
  disahkan,
  hasRtl,
}: {
  status: string;
  disahkan?: boolean;
  hasRtl?: boolean;
}) {
  const isRevisi = status === "perlu_revisi";
  const activeStep =
    status === "tindak_lanjut" || hasRtl
      ? 4
      : status === "selesai" && disahkan
      ? 3
      : status === "dalam_penilaian" || (status === "selesai" && !disahkan)
      ? 2
      : status === "menunggu_verifikasi" || isRevisi
      ? 1
      : 0;

  const steps = [
    {
      title: "1. Evaluasi Diri & Perangkat",
      sub: "Guru mengisi instrumen & 6 bukti ajar",
      icon: FileEdit,
    },
    {
      title: isRevisi ? "2. Perlu Revisi" : "2. Verifikasi Berkas",
      sub: isRevisi
        ? "Dikembalikan oleh Kepala Sekolah"
        : "Pemeriksaan perangkat oleh Kepsek",
      icon: isRevisi ? AlertTriangle : Clock,
    },
    {
      title: "3. Penilaian & AI Co-Eval",
      sub: "Observasi kelas + draf analisis AI",
      icon: ClipboardCheck,
    },
    {
      title: "4. Disahkan (Immutable)",
      sub: "Dikunci Kepsek & masuk ke Pengawas",
      icon: ShieldCheck,
    },
    {
      title: "5. RTL Pengawas",
      sub: "Rencana Tindak Lanjut & Pembinaan",
      icon: Target,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
        {steps.map((st, idx) => {
          const Icon = st.icon;
          const isCompleted = idx < activeStep;
          const isCurrent = idx === activeStep;
          const isErrorStep = isRevisi && idx === 1;

          return (
            <div
              key={st.title}
              className={`rounded-xl p-3 border transition flex items-start gap-2.5 ${
                isErrorStep
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : isCurrent
                  ? "bg-blue-50 border-blue-400 text-blue-900 shadow-xs"
                  : isCompleted
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                  : "bg-slate-50/60 border-slate-200 text-slate-400"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isErrorStep
                    ? "bg-rose-600 text-white"
                    : isCurrent
                    ? "bg-blue-600 text-white"
                    : isCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold leading-tight">
                  {st.title}
                </p>
                <p className="text-[10px] leading-snug mt-0.5 opacity-85">
                  {st.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
