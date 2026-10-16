"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SenseiMascot } from "@/components/SenseiMascot";
import { PodcastPlayer } from "@/components/PodcastPlayer";
import {
  FileText,
  Download,
  Headphones,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  MessageSquareHeart,
  Send,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";

interface HasilPenugasanDetail {
  id: string;
  instrumen: { judul: string; versi: number };
  hasil: {
    id: string;
    skorPerAspekJSON: string;
    skorTotal: number;
    skorAsliAI: number | null;
    predikat: string;
    kesimpulan: string;
    kekuatanJSON: string;
    sarannyaJSON: string;
    catatanAdmin: string | null;
    diubahAdminOleh: string | null;
    diubahAdminPada: string | null;
    status: string;
    errorMessage: string | null;
    createdAt: string;
    podcast?: {
      id: string;
      naskah: string;
      transkripSegmenJSON: string;
      status: string;
      durasi: number;
      errorMessage?: string | null;
    } | null;
  } | null;
}

export default function GuruHasilDetailPage() {
  const params = useParams<{ id: string }>();
  const penugasanId = params.id;

  const [detail, setDetail] = useState<HasilPenugasanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  // Tanya Sensei-AI Chat (PRD Bagian 13)
  const [chatHistory, setChatHistory] = useState<
    { sender: "sensei" | "guru"; text: string }[]
  >([
    {
      sender: "sensei",
      text: "Otsukare-sama desu, Sensei! 🌸 Ada bagian dari hasil evaluasi atau saran perbaikan ini yang ingin kita diskusikan bersama?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const fetchDetail = async () => {
    const res = await fetch(`/api/guru/penugasan/${penugasanId}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data.penugasan);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [penugasanId]);

  // Polling otomatis bila podcast masih "menunggu" atau "memproses" (PRD Bagian 8)
  useEffect(() => {
    const podStatus = detail?.hasil?.podcast?.status;
    if (podStatus === "menunggu" || podStatus === "memproses") {
      const timer = setInterval(() => {
        fetchDetail();
      }, 3000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.hasil?.podcast?.status]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await fetch(`/api/guru/penugasan/${penugasanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      await fetchDetail();
    } finally {
      setRetrying(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    setChatHistory((prev) => [...prev, { sender: "guru", text: msg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/guru/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penugasanId, message: msg }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "sensei",
          text:
            data.reply ||
            "Tetap semangat mengajar di kelas ya, Sensei! Ganbatte kudasai! ✨",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <SenseiMascot size="lg" mood="thinking" className="mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">
          Memuat hasil evaluasi & podcast Sensei-AI...
        </p>
      </div>
    );
  }

  if (!detail || !detail.hasil) {
    return (
      <div className="bg-white rounded-3xl border border-sora-200 p-8 text-center">
        <p className="font-bold text-slate-800">
          Data hasil belum tersedia untuk penugasan ini.
        </p>
      </div>
    );
  }

  const h = detail.hasil;
  let skorAspek: { aspek: string; skor: number; alasan: string }[] = [];
  let kekuatan: string[] = [];
  let saran: string[] = [];

  try {
    skorAspek = JSON.parse(h.skorPerAspekJSON || "[]");
    kekuatan = JSON.parse(h.kekuatanJSON || "[]");
    saran = JSON.parse(h.sarannyaJSON || "[]");
  } catch {
    // ignore
  }

  const audioDownloadUrl = `/api/podcast/audio/${
    h.podcast?.id || h.id
  }?download=1`;

  return (
    <div className="space-y-6">
      {/*Jika status evaluasi gagal, tampilkan tombol coba lagi (PRD Bagian 7.3)*/}
      {h.status === "gagal" && (
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-rose-800">
              Evaluasi AI Mengalami Kendala
            </h3>
            <p className="text-xs text-rose-600 mt-0.5">
              {h.errorMessage || "Gagal memvalidasi respons AI."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 text-white text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Mencoba Ulang..." : "Coba Evaluasi Lagi"}
          </button>
        </div>
      )}

      {/* 1. Kartu Hero Skor Total, Predikat & Tombol Export (PRD Bagian 6.3) */}
      <div className="rounded-3xl bg-white border-2 border-sora-200 p-6 shadow-pastel space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <SenseiMascot size="lg" mood="cheer" />
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sora-100 text-sora-700 text-xs font-bold">
                <Sparkles className="w-3 h-3 text-sakura-500" />
                Hasil Evaluasi Supervisi
              </span>
              <h2 className="font-display font-extrabold text-xl text-slate-900 mt-1">
                {detail.instrumen.judul}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dievaluasi pada{" "}
                {new Date(h.createdAt).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-sora-500 to-sakura-500 text-white rounded-3xl px-6 py-4 text-center shadow-md shrink-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sora-100 block">
              Skor Akhir
            </span>
            <p className="font-display font-extrabold text-4xl leading-none mt-1">
              {h.skorTotal}
            </p>
            <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-white text-sakura-600 text-xs font-extrabold">
              {h.predikat}
            </span>
          </div>
        </div>

        {/* Tombol Export PDF, Export Word, Unduh Podcast (PRD Bagian 6.3) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-slate-100">
          <a
            href={`/api/export/${h.id}?format=pdf`}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition"
          >
            <FileText className="w-4 h-4" />
            Export Laporan PDF
          </a>
          <a
            href={`/api/export/${h.id}?format=docx`}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-sora-50 border border-sora-200 text-sora-700 hover:bg-sora-100 text-xs font-bold transition"
          >
            <Download className="w-4 h-4" />
            Export Word (.docx)
          </a>
          <a
            href={audioDownloadUrl}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-sakura-50 border border-sakura-200 text-sakura-700 hover:bg-sakura-100 text-xs font-bold transition"
          >
            <Headphones className="w-4 h-4" />
            Unduh Audio Podcast
          </a>
        </div>
      </div>

      {/* 2. Catatan dari Admin / Supervisor ditampilkan terpisah dan jelas (PRD Bagian 6.3) */}
      {h.catatanAdmin && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-50 via-white to-sakura-50 border-2 border-sakura-300 p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-sakura-700 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-sakura-600" />
              Catatan Khusus Supervisor / Kepala Sekolah
            </span>
            {h.diubahAdminOleh && (
              <span className="text-[11px] text-slate-500 font-semibold">
                Oleh: {h.diubahAdminOleh}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-800 italic leading-relaxed">
            &ldquo;{h.catatanAdmin}&rdquo;
          </p>
        </div>
      )}

      {/* 3. Pemutar Podcast dengan Transkrip Tersorot (PRD Bagian 6.3 & 8) */}
      {h.podcast && (
        <PodcastPlayer
          podcastId={h.podcast.id}
          hasilId={h.id}
          naskah={h.podcast.naskah}
          transkripSegmenJSON={h.podcast.transkripSegmenJSON}
          status={h.podcast.status}
          durasi={h.podcast.durasi}
          errorMessage={h.podcast.errorMessage}
          onRetry={handleRetry}
        />
      )}

      {/* 4. Grafik Radar Per Aspek & Rincian Skor (PRD Bagian 6.3) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-5 bg-white rounded-3xl border border-sora-200 p-5 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900">
              Grafik Radar Capaian Aspek
            </h3>
            <p className="text-xs text-slate-500">
              Peta kekuatan kompetensi mengajar Anda.
            </p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skorAspek}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis
                  dataKey="aspek"
                  tick={{ fontSize: 11, fontWeight: 700 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 9 }}
                />
                <Radar
                  name="Skor Anda"
                  dataKey="skor"
                  stroke="#0e9ce8"
                  fill="#38b5f7"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md:col-span-7 bg-white rounded-3xl border border-sora-200 p-5 shadow-card space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900">
            Analisis Sensei-AI per Aspek
          </h3>
          {skorAspek.map((item, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-slate-900">
                  {item.aspek}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-sora-100 text-sora-800 font-extrabold text-xs">
                  {item.skor} / 100
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.alasan}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Kesimpulan AI, Kekuatan & Saran Perbaikan */}
      <div className="bg-white rounded-3xl border border-sora-200 p-6 shadow-card space-y-5">
        <div>
          <h3 className="font-display font-bold text-base text-slate-900 mb-1.5">
            Kesimpulan Evaluasi Sensei-AI
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed bg-sora-50/60 p-4 rounded-2xl border border-sora-100">
            {h.kesimpulan}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
            <h4 className="font-display font-bold text-sm text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Kekuatan Utama Anda
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {kekuatan.map((k, idx) => (
                <li key={idx} className="leading-relaxed">
                  • {k}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-sakura-50/60 border border-sakura-200/80 space-y-2">
            <h4 className="font-display font-bold text-sm text-sakura-900 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-sakura-600" />
              Saran Pengembangan Diri
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {saran.map((s, idx) => (
                <li key={idx} className="leading-relaxed">
                  • {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 6. Mode Tanya Sensei-AI (Chat Singkat tentang Hasil Supervisi - PRD Bagian 13) */}
      <div className="bg-white rounded-3xl border-2 border-sora-200 p-5 sm:p-6 shadow-pastel space-y-4">
        <div className="flex items-center gap-3">
          <SenseiMascot size="sm" mood="happy" />
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-1.5">
              <MessageSquareHeart className="w-4 h-4 text-sakura-500" />
              Tanya Sensei-AI tentang Hasil Ini
            </h3>
            <p className="text-xs text-slate-500">
              Diskusikan tips praktis menindaklanjuti saran supervisi di kelas Anda.
            </p>
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          {chatHistory.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${
                m.sender === "guru" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === "guru"
                    ? "bg-sora-500 text-white font-semibold"
                    : "bg-white border border-sora-200 text-slate-800"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <p className="text-xs text-sora-600 italic px-2">
              Sensei-AI sedang mengetik balasan...
            </p>
          )}
        </div>

        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Tanyakan tips perbaikan aspek evaluasi atau ide media IT..."
            className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sora-400"
          />
          <button
            type="submit"
            disabled={chatLoading}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Tanya
          </button>
        </form>
      </div>
    </div>
  );
}
