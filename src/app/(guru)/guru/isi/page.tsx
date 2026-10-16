"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardEdit,
  Clock,
} from "lucide-react";

interface PenugasanItem {
  id: string;
  tenggat: string;
  status: "belum" | "draft" | "selesai";
  instrumen: {
    judul: string;
    deskripsi: string;
    versi: number;
    _count: { pertanyaan: number };
  };
  _count: { jawaban: number };
}

export default function GuruIsiListPage() {
  const [penugasan, setPenugasan] = useState<PenugasanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/guru/dashboard");
      if (res.ok) {
        const data = await res.json();
        setPenugasan(data.penugasan || []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <SenseiMascot size="md" mood="thinking" className="mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-500">
          Memuat daftar instrumen...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-sora-200 p-5 shadow-card flex items-center gap-4">
        <SenseiMascot size="md" mood="happy" />
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900">
            Pilih Instrumen Supervisi untuk Diisi
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Jawaban Anda tersimpan otomatis per aspek. Anda dapat melanjutkan kapan saja sebelum tenggat berakhir.
          </p>
        </div>
      </div>

      {penugasan.map((p) => {
        const isDone = p.status === "selesai";
        return (
          <div
            key={p.id}
            className="bg-white rounded-3xl border border-sora-200/80 p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isDone
                      ? "bg-emerald-100 text-emerald-700"
                      : p.status === "draft"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-sora-100 text-sora-700"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  {isDone
                    ? "Selesai"
                    : p.status === "draft"
                    ? `Draft (${p._count.jawaban}/${p.instrumen._count.pertanyaan})`
                    : "Belum Diisi"}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(p.tenggat).toLocaleDateString("id-ID")}
                </span>
              </div>
              <h3 className="font-display font-bold text-base text-slate-900">
                {p.instrumen.judul} (v{p.instrumen.versi})
              </h3>
              <p className="text-xs text-slate-500">{p.instrumen.deskripsi}</p>
            </div>

            <Link
              href={`/guru/isi/${p.id}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white text-xs font-bold shadow-md hover:opacity-95 shrink-0"
            >
              <ClipboardEdit className="w-4 h-4" />
              {isDone ? "Isi / Evaluasi Ulang" : "Buka Form Bertahap"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
