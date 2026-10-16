"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FolderArchive,
  Eye,
  Edit3,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import { PodcastPlayer } from "@/components/PodcastPlayer";

interface HasilRow {
  id: string;
  penugasanId: string;
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
  createdAt: string;
  penugasan: {
    guru: { id: string; nama: string; email: string; nip: string | null; mapel: string | null };
    instrumen: {
      id: string;
      judul: string;
      versi: number;
      pertanyaan: { id: string; urutan: number; aspek: string; teks: string; tipe: string }[];
    };
    jawaban: { pertanyaanId: string; nilaiJSON: string }[];
  };
  podcast?: {
    id: string;
    naskah: string;
    transkripSegmenJSON: string;
    status: string;
    durasi: number;
  } | null;
}

export default function AdminHasilGrafikPage() {
  const [hasilList, setHasilList] = useState<HasilRow[]>([]);
  const [charts, setCharts] = useState<{
    barPerbandinganGuru: { guruId: string; nama: string; rataSkor: number; skorTerakhir: number }[];
    distribusiSkor: { rentang: string; jumlah: number }[];
    trenWaktu: { tanggal: string; guru: string; skor: number }[];
  }>({
    barPerbandinganGuru: [],
    distribusiSkor: [],
    trenWaktu: [],
  });

  // Filter
  const [searchGuru, setSearchGuru] = useState("");
  const [filterInstrumen, setFilterInstrumen] = useState("ALL");
  const [minSkor, setMinSkor] = useState<number>(0);

  // Detail & Koreksi Modal
  const [selectedHasil, setSelectedHasil] = useState<HasilRow | null>(null);
  const [catatanInput, setCatatanInput] = useState("");
  const [skorOverride, setSkorOverride] = useState<number>(0);
  const [savingNote, setSavingNote] = useState(false);
  const [toast, setToast] = useState("");

  const fetchHasil = async () => {
    const res = await fetch("/api/admin/hasil");
    if (res.ok) {
      const data = await res.json();
      setHasilList(data.hasil || []);
      if (data.charts) setCharts(data.charts);
    }
  };

  useEffect(() => {
    fetchHasil();
  }, []);

  const filtered = hasilList.filter((h) => {
    const matchGuru =
      h.penugasan.guru.nama.toLowerCase().includes(searchGuru.toLowerCase()) ||
      (h.penugasan.guru.mapel || "")
        .toLowerCase()
        .includes(searchGuru.toLowerCase());
    const matchIns =
      filterInstrumen === "ALL" ||
      h.penugasan.instrumen.id === filterInstrumen;
    const matchSkor = h.skorTotal >= minSkor;
    return matchGuru && matchIns && matchSkor;
  });

  const uniqueInstrumen = Array.from(
    new Map(
      hasilList.map((h) => [
        h.penugasan.instrumen.id,
        h.penugasan.instrumen.judul,
      ])
    ).entries()
  );

  // Hitung Radar Perbandingan: Rata-rata Keseluruhan vs Guru Pertama Terfilter
  const radarComparisonData = React.useMemo(() => {
    const allAvgMap = new Map<string, { sum: number; count: number }>();
    for (const h of hasilList) {
      try {
        const arr: { aspek: string; skor: number }[] = JSON.parse(
          h.skorPerAspekJSON || "[]"
        );
        for (const a of arr) {
          const cur = allAvgMap.get(a.aspek) || { sum: 0, count: 0 };
          cur.sum += a.skor;
          cur.count += 1;
          allAvgMap.set(a.aspek, cur);
        }
      } catch {
        // ignore
      }
    }

    const focusHasil = selectedHasil || filtered[0] || hasilList[0];
    const focusMap = new Map<string, number>();
    if (focusHasil) {
      try {
        const arr: { aspek: string; skor: number }[] = JSON.parse(
          focusHasil.skorPerAspekJSON || "[]"
        );
        for (const a of arr) focusMap.set(a.aspek, a.skor);
      } catch {
        // ignore
      }
    }

    return Array.from(allAvgMap.entries()).map(([aspek, d]) => ({
      aspek,
      rataSekolah: d.count > 0 ? Math.round(d.sum / d.count) : 0,
      skorGuru: focusMap.get(aspek) || 0,
    }));
  }, [hasilList, filtered, selectedHasil]);

  const openDetailModal = (h: HasilRow) => {
    setSelectedHasil(h);
    setCatatanInput(h.catatanAdmin || "");
    setSkorOverride(h.skorTotal);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHasil) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/admin/hasil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasilId: selectedHasil.id,
          catatanAdmin: catatanInput,
          skorTotalBaru: skorOverride,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast(data.message);
        setTimeout(() => setToast(""), 4500);
        await fetchHasil();
        setSelectedHasil((prev) =>
          prev
            ? {
                ...prev,
                catatanAdmin: catatanInput,
                skorTotal: skorOverride,
                predikat: data.hasil?.predikat || prev.predikat,
                diubahAdminOleh: data.hasil?.diubahAdminOleh || "Admin",
                diubahAdminPada: new Date().toISOString(),
              }
            : null
        );
      }
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {toast}
        </div>
      )}

      {/* Baris Filter & Tombol Export Massal (PRD Bagian 5.5 & 9) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <input
            type="text"
            value={searchGuru}
            onChange={(e) => setSearchGuru(e.target.value)}
            placeholder="Cari nama guru atau mapel..."
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
          />
          <select
            value={filterInstrumen}
            onChange={(e) => setFilterInstrumen(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
          >
            <option value="ALL">Semua Instrumen Supervisi</option>
            {uniqueInstrumen.map(([id, j]) => (
              <option key={id} value={id}>
                {j}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-slate-600 shrink-0">
              Skor Min: {minSkor}
            </span>
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={minSkor}
              onChange={(e) => setMinSkor(Number(e.target.value))}
              className="w-full accent-sora-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href="/api/admin/export-massal?format=csv"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Rekap CSV/Excel
          </a>
          <a
            href="/api/admin/export-massal?format=zip"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
          >
            <FolderArchive className="w-4 h-4" />
            Export Massal PDF (ZIP)
          </a>
        </div>
      </div>

      {/* 4 Grafik Analitik Lengkap (PRD Bagian 5.5) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Radar Per Aspek (Per Guru vs Rata-rata Keseluruhan) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-display font-bold text-base text-slate-900">
            1. Radar Capaian Aspek (Guru vs Rata-Rata Sekolah)
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Menampilkan perbandingan{" "}
            <strong>
              {(selectedHasil || filtered[0])?.penugasan.guru.nama || "Guru"}
            </strong>{" "}
            dengan rata-rata sekolah.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarComparisonData}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="aspek" tick={{ fontSize: 11, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Skor Guru Terpilih"
                  dataKey="skorGuru"
                  stroke="#f43f80"
                  fill="#fb71a1"
                  fillOpacity={0.45}
                />
                <Radar
                  name="Rata-Rata Keseluruhan"
                  dataKey="rataSekolah"
                  stroke="#0e9ce8"
                  fill="#38b5f7"
                  fillOpacity={0.25}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Grafik Batang Perbandingan Antar Guru */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-display font-bold text-base text-slate-900">
            2. Batang Perbandingan Skor Antar Guru
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Perbandingan rata-rata skor dan capaian supervisi terakhir tiap guru.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.barPerbandinganGuru}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="skorTerakhir"
                  name="Skor Terakhir"
                  fill="#0e9ce8"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="rataSkor"
                  name="Rata-Rata"
                  fill="#f43f80"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Garis Tren Dari Waktu ke Waktu */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-display font-bold text-base text-slate-900">
            3. Garis Tren Nilai Supervisi dari Waktu ke Waktu
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Perkembangan skor hasil evaluasi yang masuk secara kronologis.
          </p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.trenWaktu}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="skor"
                  name="Skor Evaluasi"
                  stroke="#0e9ce8"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Distribusi Skor / Predikat */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-display font-bold text-base text-slate-900">
            4. Distribusi Kategori Predikat Skor
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Sebaran hasil supervisi berdasarkan ambang batas predikat rubrik.
          </p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.distribusiSkor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="rentang"
                  type="category"
                  width={135}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar
                  dataKey="jumlah"
                  name="Jumlah Hasil"
                  fill="#38b5f7"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabel Semua Hasil Supervisi */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-slate-900">
            Daftar Hasil Evaluasi Supervisi ({filtered.length} Data)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="p-4">Guru & Mapel</th>
                <th className="p-4">Instrumen</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Skor & Predikat</th>
                <th className="p-4">Podcast</th>
                <th className="p-4">Catatan Admin</th>
                <th className="p-4 text-right">Detail & Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((h) => (
                <tr key={h.id} className="hover:bg-sora-50/30 transition">
                  <td className="p-4">
                    <p className="font-bold text-slate-900">
                      {h.penugasan.guru.nama}
                    </p>
                    <p className="text-xs text-slate-500">
                      {h.penugasan.guru.mapel || "Umum"}
                    </p>
                  </td>
                  <td className="p-4 text-xs font-medium text-slate-700">
                    {h.penugasan.instrumen.judul} (v{h.penugasan.instrumen.versi})
                  </td>
                  <td className="p-4 text-xs text-slate-500">
                    {new Date(h.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-sora-100 text-sora-800 font-extrabold text-sm">
                        {h.skorTotal}
                      </span>
                      <span className="text-xs font-bold text-sakura-600">
                        {h.predikat}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        h.podcast?.status === "selesai"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {h.podcast?.status || "selesai"}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-600 max-w-xs truncate">
                    {h.catatanAdmin ? (
                      <span className="text-sakura-700 font-medium">
                        &ldquo;{h.catatanAdmin}&rdquo;
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Belum ada</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDetailModal(h)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sora-500 hover:bg-sora-600 text-white text-xs font-bold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Buka & Koreksi
                      </button>
                      <a
                        href={`/api/export/${h.id}?format=pdf`}
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                        title="Export PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
                      <a
                        href={`/api/export/${h.id}?format=docx`}
                        className="p-1.5 rounded-xl border border-slate-200 text-sora-600 hover:bg-sora-50"
                        title="Export Word (.docx)"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Hasil + Pemutar Podcast + Koreksi Nilai/Catatan Admin (PRD 5.5) */}
      {selectedHasil && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-sora-100 text-sora-700 text-xs font-bold">
                  Detail Evaluasi Guru
                </span>
                <h3 className="font-display font-bold text-xl text-slate-900 mt-1">
                  {selectedHasil.penugasan.guru.nama} •{" "}
                  {selectedHasil.penugasan.guru.mapel}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedHasil.penugasan.instrumen.judul} (v
                  {selectedHasil.penugasan.instrumen.versi})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHasil(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rincian Skor per Aspek */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                let arr: { aspek: string; skor: number; alasan: string }[] = [];
                try {
                  arr = JSON.parse(selectedHasil.skorPerAspekJSON || "[]");
                } catch {
                  arr = [];
                }
                return arr.map((a, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-800">
                        Aspek {a.aspek}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-sora-100 text-sora-800 font-extrabold text-xs">
                        {a.skor} / 100
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {a.alasan}
                    </p>
                  </div>
                ));
              })()}
            </div>

            {/* Kesimpulan & Saran AI */}
            <div className="p-4 rounded-2xl bg-sora-50/60 border border-sora-200/80 space-y-2">
              <h4 className="font-display font-bold text-sm text-sora-900">
                Kesimpulan Sensei-AI:
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {selectedHasil.kesimpulan}
              </p>
            </div>

            {/* Pemutar Podcast */}
            {selectedHasil.podcast && (
              <PodcastPlayer
                podcastId={selectedHasil.podcast.id}
                hasilId={selectedHasil.id}
                naskah={selectedHasil.podcast.naskah}
                transkripSegmenJSON={selectedHasil.podcast.transkripSegmenJSON}
                status={selectedHasil.podcast.status}
                durasi={selectedHasil.podcast.durasi}
              />
            )}

            {/* Daftar Jawaban Mentah Guru */}
            <div className="border border-slate-200 rounded-2xl p-4">
              <h4 className="font-display font-bold text-sm text-slate-900 mb-3">
                Rekaman Jawaban Instrumen Guru
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedHasil.penugasan.instrumen.pertanyaan.map((q) => {
                  const j = selectedHasil.penugasan.jawaban.find(
                    (ans) => ans.pertanyaanId === q.id
                  );
                  let val = "-";
                  if (j) {
                    try {
                      val = String(JSON.parse(j.nilaiJSON));
                    } catch {
                      val = j.nilaiJSON;
                    }
                  }
                  return (
                    <div
                      key={q.id}
                      className="p-2.5 rounded-xl bg-slate-50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <span className="text-slate-700 font-medium">
                        <strong>#{q.urutan} ({q.aspek}):</strong> {q.teks}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-sora-700 shrink-0">
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Catatan Tambahan & Override Nilai oleh Admin (PRD Bagian 5.5) */}
            <form
              onSubmit={handleSaveCorrection}
              className="p-5 rounded-2xl bg-sakura-50/60 border border-sakura-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-sm text-sakura-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-sakura-600" />
                  Catatan Supervisor & Koreksi Nilai Manual (Admin Override)
                </h4>
                {selectedHasil.diubahAdminOleh && (
                  <span className="text-[11px] text-sakura-700 font-semibold">
                    Terakhir diubah oleh {selectedHasil.diubahAdminOleh}{" "}
                    {selectedHasil.diubahAdminPada
                      ? `(${new Date(
                          selectedHasil.diubahAdminPada
                        ).toLocaleString("id-ID")})`
                      : ""}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Skor Akhir (AI: {selectedHasil.skorAsliAI ?? selectedHasil.skorTotal})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={skorOverride}
                    onChange={(e) => setSkorOverride(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sakura-200 bg-white text-sm font-bold"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Tambahan Supervisor / Kepala Sekolah (Tampil di Guru & Dokumen Export)
                  </label>
                  <input
                    type="text"
                    value={catatanInput}
                    onChange={(e) => setCatatanInput(e.target.value)}
                    placeholder="Tulis apresiasi atau arahan khusus kepala sekolah/supervisor..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sakura-200 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/export/${selectedHasil.id}?format=pdf`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    Unduh PDF
                  </a>
                  <a
                    href={`/api/export/${selectedHasil.id}?format=docx`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5 text-sora-600" />
                    Unduh Word (.docx)
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={savingNote}
                  className="px-5 py-2.5 rounded-xl bg-sakura-600 hover:bg-sakura-700 text-white text-xs font-bold shadow-sm transition"
                >
                  {savingNote ? "Menyimpan..." : "Simpan Catatan & Nilai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
