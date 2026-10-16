"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SenseiMascot } from "@/components/SenseiMascot";
import { PodcastPlayer } from "@/components/PodcastPlayer";
import {
  Calendar,
  ArrowRight,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  Headphones,
  FileEdit,
} from "lucide-react";

interface GuruDashboardData {
  guru: {
    id: string;
    nama: string;
    email: string;
    mapel: string | null;
    badgesJSON: string;
  } | null;
  penugasan: {
    id: string;
    tenggat: string;
    status: "belum" | "draft" | "selesai";
    instrumen: {
      id: string;
      judul: string;
      deskripsi: string;
      versi: number;
      _count: { pertanyaan: number };
    };
    _count: { jawaban: number };
    hasil?: {
      id: string;
      skorTotal: number;
      predikat: string;
      kesimpulan: string;
    } | null;
  }[];
  hasilTerakhir: {
    id: string;
    penugasanId: string;
    judulInstrumen: string;
    skorTotal: number;
    predikat: string;
    kesimpulan: string;
    catatanAdmin: string | null;
    podcast?: {
      id: string;
      naskah: string;
      transkripSegmenJSON: string;
      status: string;
      durasi: number;
    } | null;
  } | null;
}

export default function GuruBerandaPage() {
  const [data, setData] = useState<GuruDashboardData | null>(null);
  const [showInlinePodcast, setShowInlinePodcast] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/guru/dashboard");
      if (res.ok) {
        setData(await res.json());
      }
    })();
  }, []);

  if (!data) {
    return (
      <div className="p-12 text-center">
        <SenseiMascot size="lg" mood="thinking" className="mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">
          Sensei-AI sedang menyiapkan ruang kerja Anda...
        </p>
      </div>
    );
  }

  const sapaanNama = data.guru?.nama.split(",")[0] || "Sensei";
  let badges: string[] = [];
  try {
    badges = JSON.parse(data.guru?.badgesJSON || "[]");
  } catch {
    badges = [];
  }

  return (
    <div className="space-y-6">
      {/* 1. Kartu Sapaan Maskot Sensei-AI (PRD Bagian 6.1) */}
      <div className="rounded-3xl bg-white border-2 border-sora-200 p-6 shadow-pastel relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <SenseiMascot size="lg" mood="cheer" />
          <div className="text-center sm:text-left flex-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sakura-100 text-sakura-700 text-xs font-bold">
              <Sparkles className="w-3 h-3" />
              Sapaan Sensei-AI
            </span>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 mt-1">
              Ohayou gozaimasu, {sapaanNama}-sensei! 🌸
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Selamat datang di ruang supervisi{" "}
              <strong>{data.guru?.mapel || "Pembelajaran"}</strong>. Mari kita
              refleksikan kegiatan belajar mengajar hari ini dengan santai dan bermakna!
            </p>

            {/* Lencana Pencapaian Gamifikasi (PRD Bagian 13) */}
            {badges.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-3">
                {badges.map((b, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-sora-50 border border-sora-200 text-sora-800 text-[11px] font-bold"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Ringkasan Hasil Terakhir & Tombol Putar Podcast (PRD Bagian 6.1) */}
      {data.hasilTerakhir && (
        <div className="rounded-3xl bg-gradient-to-br from-sora-500 via-sora-600 to-sakura-500 text-white p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">
                Ringkasan Hasil Terakhir
              </span>
              <h3 className="font-display font-bold text-lg mt-1.5">
                {data.hasilTerakhir.judulInstrumen}
              </h3>
              <p className="text-xs text-sora-50 mt-1 line-clamp-2">
                {data.hasilTerakhir.kesimpulan}
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 text-center shrink-0 border border-white/20">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sora-100 block">
                Skor Total AI
              </span>
              <p className="font-display font-extrabold text-4xl leading-none mt-1">
                {data.hasilTerakhir.skorTotal}
              </p>
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-white text-sakura-600 text-xs font-extrabold">
                {data.hasilTerakhir.predikat}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/15">
            <button
              type="button"
              onClick={() => setShowInlinePodcast((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-sakura-600 font-bold text-xs shadow-sm hover:bg-sakura-50 transition"
            >
              <Headphones className="w-4 h-4" />
              {showInlinePodcast
                ? "Sembunyikan Pemutar Podcast"
                : "Putar Podcast Evaluasi Sensei-AI"}
            </button>

            <Link
              href={`/guru/hasil/${data.hasilTerakhir.penugasanId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition"
            >
              Lihat Detail & Grafik Radar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {showInlinePodcast && data.hasilTerakhir?.podcast && (
        <PodcastPlayer
          podcastId={data.hasilTerakhir.podcast.id}
          hasilId={data.hasilTerakhir.id}
          naskah={data.hasilTerakhir.podcast.naskah}
          transkripSegmenJSON={data.hasilTerakhir.podcast.transkripSegmenJSON}
          status={data.hasilTerakhir.podcast.status}
          durasi={data.hasilTerakhir.podcast.durasi}
        />
      )}

      {/* 3. Kartu Tugas Supervisi yang Harus Diisi (PRD Bagian 6.1) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-sora-600" />
            Daftar Tugas Instrumen Supervisi Anda
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {data.penugasan.length} Tugas
          </span>
        </div>

        {data.penugasan.map((p) => {
          const isDone = p.status === "selesai";
          const isDraft = p.status === "draft";

          return (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-sora-200/80 p-5 shadow-card hover:border-sora-400 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : isDraft
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
                      ? "Selesai Dievaluasi"
                      : isDraft
                      ? `Draft Tersimpan (${p._count.jawaban}/${p.instrumen._count.pertanyaan} Soal)`
                      : "Belum Diisi"}
                  </span>

                  <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    Tenggat:{" "}
                    {new Date(p.tenggat).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h4 className="font-display font-bold text-base text-slate-900">
                  {p.instrumen.judul}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    (v{p.instrumen.versi})
                  </span>
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {p.instrumen.deskripsi}
                </p>
              </div>

              <div className="shrink-0">
                {isDone ? (
                  <Link
                    href={`/guru/hasil/${p.id}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-sora-50 border border-sora-200 text-sora-700 hover:bg-sora-100 text-xs font-bold transition"
                  >
                    <Award className="w-4 h-4" />
                    Buka Hasil ({p.hasil?.skorTotal || "-"})
                  </Link>
                ) : (
                  <Link
                    href={`/guru/isi/${p.id}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white text-xs font-bold shadow-md hover:opacity-95 transition"
                  >
                    {isDraft ? "Lanjutkan Isi Draft" : "Mulai Isi Instrumen"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
