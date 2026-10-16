"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  History,
  ArrowRight,
  FileText,
  Download,
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
} from "recharts";

interface RiwayatItem {
  periode: string;
  tanggal: string;
  judul: string;
  skorTotal: number;
  predikat: string;
  hasilId: string;
  penugasanId: string;
}

export default function GuruRiwayatPage() {
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [narasi, setNarasi] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/guru/dashboard");
      if (res.ok) {
        const data = await res.json();
        setRiwayat(data.riwayatTren || []);
        setNarasi(data.narasiPerkembangan || "");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <SenseiMascot size="md" mood="thinking" className="mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-500">
          Memuat riwayat supervisi lintas periode...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Narasi Perbandingan Antar Periode oleh Sensei-AI (PRD Bagian 6.4 & 13) */}
      <div className="bg-white rounded-3xl border border-sora-200 p-5 sm:p-6 shadow-pastel flex flex-col sm:flex-row items-center gap-4">
        <SenseiMascot size="md" mood="cheer" />
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sakura-100 text-sakura-700 text-xs font-bold">
            <Sparkles className="w-3 h-3" />
            Analisis Lintas Periode Sensei-AI
          </span>
          <h2 className="font-display font-bold text-lg text-slate-900 mt-1">
            Perjalanan Perkembangan Supervisi Anda
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            {narasi}
          </p>
        </div>
      </div>

      {/* Grafik Garis Perbandingan Skor Antar Periode (PRD Bagian 6.4) */}
      {riwayat.length > 0 && (
        <div className="bg-white rounded-3xl border border-sora-200 p-5 sm:p-6 shadow-card">
          <h3 className="font-display font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
            <History className="w-4 h-4 text-sora-600" />
            Grafik Tren Skor Antar Periode
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Perbandingan nilai akhir supervisi dari periode ke periode.
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riwayat}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="periode" tick={{ fontSize: 12 }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="skorTotal"
                  name="Skor Supervisi"
                  stroke="#0e9ce8"
                  strokeWidth={3}
                  dot={{ r: 6, fill: "#f43f80" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daftar Riwayat Supervisi Sebelumnya */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-base text-slate-900 px-1">
          Arsip Hasil Supervisi ({riwayat.length})
        </h3>
        {[...riwayat].reverse().map((item) => (
          <div
            key={item.hasilId}
            className="bg-white rounded-3xl border border-sora-200/80 p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-sora-600">
                <span>{item.periode}</span>
                <span>•</span>
                <span className="text-slate-400">{item.tanggal}</span>
              </div>
              <h4 className="font-display font-bold text-base text-slate-900 mt-0.5">
                {item.judul}
              </h4>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-lg bg-sakura-50 text-sakura-700 text-xs font-extrabold">
                Skor: {item.skorTotal} / 100 ({item.predikat})
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/api/export/${item.hasilId}?format=pdf`}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Unduh PDF"
              >
                <FileText className="w-4 h-4" />
              </a>
              <a
                href={`/api/export/${item.hasilId}?format=docx`}
                className="p-2.5 rounded-xl border border-slate-200 text-sora-600 hover:bg-sora-50"
                title="Unduh Word"
              >
                <Download className="w-4 h-4" />
              </a>
              <Link
                href={`/guru/hasil/${item.penugasanId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-sora-500 hover:bg-sora-600 text-white text-xs font-bold transition"
              >
                Buka Detail & Podcast
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
