"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FolderArchive,
  Eye,
  CheckCircle2,
  X,
  FileText,
  Lock,
  Unlock,
  Sparkles,
  Target,
  AlertTriangle,
  MessageSquare,
  Printer,
  QrCode,
  Loader2,
  ShieldCheck,
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
import { WorkflowStepper, getStatusBadgeInfo } from "@/components/WorkflowStepper";

interface JawabanItem {
  pertanyaanId: string;
  nilaiJSON: string;
}

interface PertanyaanItem {
  id: string;
  urutan: number;
  aspek: string;
  teks: string;
  tipe: string;
}

interface HasilItem {
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
  disahkan: boolean;
  disahkanOleh: string | null;
  disahkanNip: string | null;
  disahkanPada: string | null;
  nomorRegistrasi: string | null;
  rtlRekomendasi: string | null;
  rtlTarget: string | null;
  rtlTenggat: string | null;
  rtlProgres: string | null;
  pengawasNama: string | null;
  pengawasNip: string | null;
  ditinjauPengawasPada: string | null;
  status: string;
  createdAt: string;
}

interface PenugasanRow {
  id: string;
  status: string;
  catatanVerifikasi: string | null;
  diverifikasiOleh: string | null;
  updatedAt: string;
  guru: {
    id: string;
    nama: string;
    email: string;
    nip: string | null;
    mapel: string | null;
    nomorWA: string;
    unitKerja?: string | null;
  };
  instrumen: {
    id: string;
    judul: string;
    versi: number;
    pertanyaan: PertanyaanItem[];
  };
  jawaban: JawabanItem[];
  hasil: HasilItem | null;
}

function parseAnswerObj(raw: string): {
  nilai: string;
  catatan: string;
  buktiUrl: string;
  skorKepsek?: number;
  catatanKepsek?: string;
} {
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && !Array.isArray(p)) {
      return {
        nilai: p.nilai !== undefined && p.nilai !== null ? String(p.nilai) : "",
        catatan: typeof p.catatan === "string" ? p.catatan : "",
        buktiUrl: typeof p.buktiUrl === "string" ? p.buktiUrl : "",
        skorKepsek:
          typeof p.skorKepsek === "number" ? p.skorKepsek : undefined,
        catatanKepsek:
          typeof p.catatanKepsek === "string" ? p.catatanKepsek : "",
      };
    }
    return { nilai: String(p ?? ""), catatan: "", buktiUrl: "" };
  } catch {
    return { nilai: raw, catatan: "", buktiUrl: "" };
  }
}

export default function AdminHasilGrafikPage() {
  const [penugasanList, setPenugasanList] = useState<PenugasanRow[]>([]);
  const [charts, setCharts] = useState<{
    barPerbandinganGuru: {
      guruId: string;
      nama: string;
      rataSkor: number;
      skorTerakhir: number;
    }[];
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
  const [filterStage, setFilterStage] = useState("ALL");

  // Modal Detail & Workflow Actions
  const [selected, setSelected] = useState<PenugasanRow | null>(null);
  const [activeTab, setActiveTab] = useState<"kepsek" | "pengawas" | "dokumen">(
    "kepsek"
  );
  const [showA4Modal, setShowA4Modal] = useState(false);

  // State Kepala Sekolah (Verifikasi, Observasi, AI Co-Eval, Pengesahan)
  const [verifikasiNote, setVerifikasiNote] = useState("");
  const [observasiMap, setObservasiMap] = useState<
    Record<string, { skorKepsek?: number; catatanKepsek?: string }>
  >({});
  const [skorInput, setSkorInput] = useState<number>(85);
  const [kesimpulanInput, setKesimpulanInput] = useState("");
  const [catatanKepsekInput, setCatatanKepsekInput] = useState("");

  // State Pengawas Sekolah (RTL)
  const [rtlRekomendasi, setRtlRekomendasi] = useState("");
  const [rtlTarget, setRtlTarget] = useState("");
  const [rtlTenggat, setRtlTenggat] = useState("");
  const [rtlProgres, setRtlProgres] = useState("Belum Dimulai");

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchData = async (keepSelectedId?: string) => {
    const res = await fetch("/api/admin/hasil");
    if (res.ok) {
      const data = await res.json();
      const list: PenugasanRow[] = data.penugasan || [];
      setPenugasanList(list);
      if (data.charts) setCharts(data.charts);
      if (keepSelectedId) {
        const refreshed = list.find((p) => p.id === keepSelectedId);
        if (refreshed) hydrateModalFields(refreshed);
      }
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hydrateModalFields = (row: PenugasanRow) => {
    setSelected(row);
    setVerifikasiNote(row.catatanVerifikasi || "");
    const initObs: Record<
      string,
      { skorKepsek?: number; catatanKepsek?: string }
    > = {};
    for (const j of row.jawaban || []) {
      const parsed = parseAnswerObj(j.nilaiJSON);
      if (parsed.skorKepsek !== undefined || parsed.catatanKepsek) {
        initObs[j.pertanyaanId] = {
          skorKepsek: parsed.skorKepsek,
          catatanKepsek: parsed.catatanKepsek,
        };
      }
    }
    setObservasiMap(initObs);

    setSkorInput(row.hasil?.skorTotal ?? 85);
    setKesimpulanInput(row.hasil?.kesimpulan || "");
    setCatatanKepsekInput(row.hasil?.catatanAdmin || "");
    setRtlRekomendasi(row.hasil?.rtlRekomendasi || "");
    setRtlTarget(row.hasil?.rtlTarget || "");
    setRtlTenggat(row.hasil?.rtlTenggat || "");
    setRtlProgres(row.hasil?.rtlProgres || "Belum Dimulai");
  };

  const filtered = useMemo(() => {
    return penugasanList.filter((p) => {
      const matchGuru =
        p.guru.nama.toLowerCase().includes(searchGuru.toLowerCase()) ||
        (p.guru.mapel || "").toLowerCase().includes(searchGuru.toLowerCase());
      const matchIns =
        filterInstrumen === "ALL" || p.instrumen.id === filterInstrumen;
      const matchStage =
        filterStage === "ALL" || p.status === filterStage;
      return matchGuru && matchIns && matchStage;
    });
  }, [penugasanList, searchGuru, filterInstrumen, filterStage]);

  const uniqueInstrumen = useMemo(
    () =>
      Array.from(
        new Map(
          penugasanList.map((p) => [p.instrumen.id, p.instrumen.judul])
        ).entries()
      ),
    [penugasanList]
  );

  // Radar Comparison (Semua Hasil Selesai vs Guru Fokus)
  const radarComparisonData = useMemo(() => {
    const allAvgMap = new Map<string, { sum: number; count: number }>();
    const withHasil = penugasanList.filter((p) => p.hasil);
    for (const p of withHasil) {
      try {
        const arr: { aspek: string; skor: number }[] = JSON.parse(
          p.hasil!.skorPerAspekJSON || "[]"
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

    const focusRow =
      (selected?.hasil ? selected : null) ||
      filtered.find((p) => p.hasil) ||
      withHasil[0];
    const focusMap = new Map<string, number>();
    if (focusRow?.hasil) {
      try {
        const arr: { aspek: string; skor: number }[] = JSON.parse(
          focusRow.hasil.skorPerAspekJSON || "[]"
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
  }, [penugasanList, filtered, selected]);

  const callPutApi = async (
    actionName: string,
    payload: Record<string, unknown>
  ) => {
    if (!selected) return;
    setBusyAction(actionName);
    try {
      const res = await fetch("/api/admin/hasil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("err", json.error || "Gagal memproses aksi supervisi.");
      } else {
        showToast("ok", json.message || "Pembaruan berhasil disimpan.");
        await fetchData(selected.id);
      }
    } catch {
      showToast("err", "Terjadi kesalahan jaringan.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleKirimWaGuru = async (row: PenugasanRow) => {
    if (!row.hasil) return;
    setBusyAction("wa");
    try {
      const res = await fetch("/api/integrasi/shiroko/kirim-podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasilId: row.hasil.id,
          penugasanId: row.id,
          nomorWA: row.guru.nomorWA,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("err", json.error || "Gagal mengirim PDF ke Bot WhatsApp.");
      } else {
        showToast(
          "ok",
          json.message ||
            `Ringkasan & PDF resmi untuk ${row.guru.nama} telah dikirim ke WhatsApp.`
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
            toast.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Filter & Export Massal */}
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
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
          >
            <option value="ALL">Semua Tahap Workflow</option>
            <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
            <option value="perlu_revisi">Perlu Revisi</option>
            <option value="dalam_penilaian">Dalam Penilaian Kepsek</option>
            <option value="selesai">Disahkan Kepsek (Selesai)</option>
            <option value="tindak_lanjut">RTL Pengawas Aktif</option>
            <option value="draft">Draf Guru</option>
            <option value="belum">Belum Dikerjakan</option>
          </select>
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

      {/* 4 Grafik Analitik */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-display font-bold text-base text-slate-900">
            1. Radar Capaian Aspek (Guru vs Rata-Rata Sekolah)
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Perbandingan aspek antara{" "}
            <strong>
              {(selected?.hasil ? selected : penugasanList.find((p) => p.hasil))?.guru
                .nama || "Guru"}
            </strong>{" "}
            dan rata-rata sekolah.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarComparisonData}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis
                  dataKey="aspek"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name="Skor Guru Terpilih"
                  dataKey="skorGuru"
                  stroke="#0f766e"
                  fill="#14b8a6"
                  fillOpacity={0.45}
                />
                <Radar
                  name="Rata-Rata Sekolah"
                  dataKey="rataSekolah"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.25}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

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
                  fill="#2563eb"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="rataSkor"
                  name="Rata-Rata"
                  fill="#0f766e"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-display font-bold text-base text-slate-900">
            3. Tren Nilai Supervisi dari Waktu ke Waktu
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Perkembangan skor hasil evaluasi secara kronologis.
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
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
          <h3 className="font-display font-bold text-base text-slate-900">
            4. Distribusi Predikat Mutu (Permendikbudristek)
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Sebaran hasil supervisi: Amat Baik (≥91), Baik (≥81), Cukup (≥71), Kurang.
          </p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.distribusiSkor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  dataKey="rentang"
                  type="category"
                  width={145}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar
                  dataKey="jumlah"
                  name="Jumlah Guru"
                  fill="#2563eb"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabel Penugasan, Penilaian Kepsek, Pengesahan & RTL Pengawas */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900">
              Antrean Supervisi, Penilaian Kepala Sekolah & RTL Pengawas ({filtered.length})
            </h3>
            <p className="text-xs text-slate-500">
              Klik "Tinjau / Nilai / RTL" untuk verifikasi berkas, menjalankan AI Co-Evaluator, pengesahan permanen, atau mengisi RTL Pengawas.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="p-4">Pendidik & Mapel</th>
                <th className="p-4">Instrumen</th>
                <th className="p-4">Tahap Workflow</th>
                <th className="p-4">Skor & Predikat</th>
                <th className="p-4">Pengesahan & RTL</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const badge = getStatusBadgeInfo(row.status, row.hasil?.disahkan);
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {row.guru.nama}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {row.guru.mapel || "Umum"} • NIP {row.guru.nip || "-"}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="font-semibold text-slate-800 line-clamp-2">
                        {row.instrumen.judul}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {row.jawaban.length}/{row.instrumen.pertanyaan.length} Butir Terjawab
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-4">
                      {row.hasil ? (
                        <div>
                          <span className="font-display font-extrabold text-base text-blue-700">
                            {Math.round(row.hasil.skorTotal)}
                          </span>{" "}
                          <span className="text-slate-500 font-semibold">
                            ({row.hasil.predikat})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          Belum Dinilai
                        </span>
                      )}
                    </td>
                    <td className="p-4 space-y-1">
                      {row.hasil?.disahkan ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <Lock className="w-3 h-3" />
                          {row.hasil.nomorRegistrasi || "Disahkan"}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">
                          Belum disahkan
                        </div>
                      )}
                      {row.hasil?.rtlRekomendasi && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold ml-1">
                          <Target className="w-3 h-3" />
                          {row.hasil.rtlProgres || "RTL"}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          hydrateModalFields(row);
                          setActiveTab(
                            row.hasil?.disahkan && !row.hasil?.rtlRekomendasi
                              ? "pengawas"
                              : "kepsek"
                          );
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Tinjau / Nilai / RTL
                      </button>
                      {row.hasil && (
                        <a
                          href={`/api/export/${row.hasil.id}?format=pdf`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                          title="Unduh PDF Resmi"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Terpadu: Kepsek (Verifikasi, Observasi, AI Co-Eval, Pengesahan) + Pengawas (RTL) + Dokumen & WA */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[10px] font-bold">
                    {getStatusBadgeInfo(selected.status, selected.hasil?.disahkan).label}
                  </span>
                  {selected.hasil?.disahkan && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">
                      <Lock className="w-3 h-3" />
                      Immutable
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-base sm:text-lg mt-1">
                  {selected.guru.nama} — {selected.instrumen.judul}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("kepsek")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                  activeTab === "kepsek"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                1. Verifikasi, Observasi & Pengesahan Kepsek
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pengawas")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                  activeTab === "pengawas"
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700"
                }`}
              >
                <Target className="w-4 h-4" />
                2. Rencana Tindak Lanjut (RTL) Pengawas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dokumen")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                  activeTab === "dokumen"
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700"
                }`}
              >
                <FileText className="w-4 h-4" />
                3. Ekspor Resmi A4 & Kirim Bot WA
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              <WorkflowStepper
                status={selected.status}
                disahkan={selected.hasil?.disahkan}
                hasRtl={Boolean(selected.hasil?.rtlRekomendasi)}
              />

              {/* TAB 1: KEPALA SEKOLAH */}
              {activeTab === "kepsek" && (
                <div className="space-y-5">
                  {/* Blok Verifikasi & Pengembalian Berkas */}
                  {!selected.hasil?.disahkan && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                      <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wider">
                        Tahap Verifikasi Berkas & Evaluasi Diri Guru
                      </h4>
                      <textarea
                        rows={2}
                        value={verifikasiNote}
                        onChange={(e) => setVerifikasiNote(e.target.value)}
                        placeholder="Catatan verifikasi atau alasan pengembalian revisi untuk guru..."
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            callPutApi("verifikasi", {
                              action: "verifikasi_penugasan",
                              penugasanId: selected.id,
                              status: "dalam_penilaian",
                              catatanVerifikasi: verifikasiNote,
                            })
                          }
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-60"
                        >
                          Setujui ke Tahap Penilaian
                        </button>
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            callPutApi("revisi", {
                              action: "verifikasi_penugasan",
                              penugasanId: selected.id,
                              status: "perlu_revisi",
                              catatanVerifikasi: verifikasiNote,
                            })
                          }
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-60"
                        >
                          Kembalikan (Perlu Revisi)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tabel Indikator: Evaluasi Diri Guru vs Observasi Kepala Sekolah */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Instrumen Evaluasi Diri Guru & Skor Observasi Kepala Sekolah
                      </h4>
                      {!selected.hasil?.disahkan && (
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            callPutApi("ai", {
                              action: "evaluasi_ai_kepsek",
                              penugasanId: selected.id,
                              observasi: observasiMap,
                            })
                          }
                          className="px-3.5 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                        >
                          {busyAction === "ai" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          Susun / Perbarui Draf Analisis AI Co-Evaluator
                        </button>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {selected.instrumen.pertanyaan.map((q) => {
                        const j = selected.jawaban.find(
                          (item) => item.pertanyaanId === q.id
                        );
                        const parsed = j
                          ? parseAnswerObj(j.nilaiJSON)
                          : { nilai: "-", catatan: "", buktiUrl: "" };
                        const obs = observasiMap[q.id] || {};
                        return (
                          <div
                            key={q.id}
                            className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5 flex-1">
                              <div className="font-bold text-slate-900">
                                {q.urutan}. [{q.aspek}] {q.teks}
                              </div>
                              <div className="text-slate-600">
                                Jawaban Guru:{" "}
                                <strong className="text-blue-700">
                                  {parsed.nilai || "-"}
                                </strong>
                                {parsed.catatan && (
                                  <span> • Catatan: {parsed.catatan}</span>
                                )}
                                {parsed.buktiUrl && (
                                  <a
                                    href={parsed.buktiUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-2 text-blue-600 underline"
                                  >
                                    Lihat Bukti
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-bold text-slate-500">
                                Obs. Kepsek:
                              </span>
                              <select
                                disabled={Boolean(selected.hasil?.disahkan)}
                                value={obs.skorKepsek ?? ""}
                                onChange={(e) =>
                                  setObservasiMap((prev) => ({
                                    ...prev,
                                    [q.id]: {
                                      ...prev[q.id],
                                      skorKepsek: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    },
                                  }))
                                }
                                className="px-2 py-1 rounded-lg border border-slate-300 bg-slate-50 font-bold"
                              >
                                <option value="">-</option>
                                <option value="1">1 - Kurang</option>
                                <option value="2">2 - Cukup</option>
                                <option value="3">3 - Baik</option>
                                <option value="4">4 - Amat Baik</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Validasi Skor Akhir & Pengesahan Permanen */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Penilaian Akhir & Pengesahan Kepala Sekolah
                      </h4>
                      {selected.hasil?.disahkan && (
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            callPutApi("unlock", {
                              action: "buka_kunci_admin",
                              hasilId: selected.hasil!.id,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Buka Kunci Pengesahan (Admin)
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Skor Akhir (0–100)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={Boolean(selected.hasil?.disahkan)}
                          value={skorInput}
                          onChange={(e) => setSkorInput(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                        />
                        {selected.hasil?.skorAsliAI !== null &&
                          selected.hasil?.skorAsliAI !== undefined && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Draf AI awal: {selected.hasil.skorAsliAI}
                            </p>
                          )}
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Kesimpulan Temuan Substantif
                        </label>
                        <textarea
                          rows={2}
                          disabled={Boolean(selected.hasil?.disahkan)}
                          value={kesimpulanInput}
                          onChange={(e) => setKesimpulanInput(e.target.value)}
                          placeholder="Kesimpulan supervisi akademik (otomatis terisi oleh AI Co-Evaluator atau isi manual)..."
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Catatan Penguatan & Arahan Kepala Sekolah
                      </label>
                      <textarea
                        rows={2}
                        disabled={Boolean(selected.hasil?.disahkan)}
                        value={catatanKepsekInput}
                        onChange={(e) => setCatatanKepsekInput(e.target.value)}
                        placeholder="Arahan resmi Kepala Sekolah untuk guru..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                      />
                    </div>

                    {!selected.hasil?.disahkan ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            callPutApi("simpan", {
                              action: "simpan_penilaian",
                              hasilId: selected.hasil?.id,
                              penugasanId: selected.id,
                              skorTotalBaru: skorInput,
                              kesimpulanBaru: kesimpulanInput,
                              catatanAdmin: catatanKepsekInput,
                            })
                          }
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
                        >
                          Simpan Draf Penilaian
                        </button>
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() =>
                            callPutApi("sahkan", {
                              action: "sahkan_laporan",
                              hasilId: selected.hasil?.id,
                              penugasanId: selected.id,
                              skorTotalBaru: skorInput,
                              kesimpulanBaru: kesimpulanInput,
                              catatanAdmin: catatanKepsekInput,
                            })
                          }
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Sahkan & Kunci Permanen (Immutable)
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Laporan sudah disahkan oleh{" "}
                        {selected.hasil.disahkanOleh} ({selected.hasil.nomorRegistrasi}) dan siap untuk Rencana Tindak Lanjut Pengawas.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PENGAWAS SEKOLAH (RTL) */}
              {activeTab === "pengawas" && (
                <div className="space-y-4">
                  {!selected.hasil ? (
                    <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                      Laporan penilaian hasil belum dibuat. Kepala Sekolah perlu
                      menyusun draf atau mengesahkan penilaian pada Tab 1 terlebih
                      dahulu sebelum Pengawas menetapkan RTL.
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-4">
                      <div>
                        <h4 className="font-display font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-indigo-600" />
                          Penetapan Rencana Tindak Lanjut (RTL) Pengawas Sekolah
                        </h4>
                        <p className="text-xs text-indigo-800 mt-0.5">
                          Berikan rekomendasi pembinaan lanjutan, target indikator,
                          dan tenggat waktu berdasarkan nilai akhir{" "}
                          <strong>{Math.round(selected.hasil.skorTotal)}</strong> (
                          {selected.hasil.predikat}).
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-indigo-950 mb-1">
                          Rekomendasi Pembinaan Pengawas
                        </label>
                        <textarea
                          rows={3}
                          value={rtlRekomendasi}
                          onChange={(e) => setRtlRekomendasi(e.target.value)}
                          placeholder="Contoh: Melakukan diseminasi modul ajar berdiferensiasi pada forum KKG/MGMP sekolah..."
                          className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-indigo-950 mb-1">
                            Target Tindak Lanjut
                          </label>
                          <input
                            type="text"
                            value={rtlTarget}
                            onChange={(e) => setRtlTarget(e.target.value)}
                            placeholder="Contoh: 1 video praktik baik + LKPD terkurasi"
                            className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-indigo-950 mb-1">
                            Tenggat Waktu
                          </label>
                          <input
                            type="text"
                            value={rtlTenggat}
                            onChange={(e) => setRtlTenggat(e.target.value)}
                            placeholder="Contoh: 30 November 2026"
                            className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-indigo-950 mb-1">
                            Status Progres RTL
                          </label>
                          <select
                            value={rtlProgres}
                            onChange={(e) => setRtlProgres(e.target.value)}
                            className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold"
                          >
                            <option value="Belum Dimulai">Belum Dimulai</option>
                            <option value="Sedang Berjalan">Sedang Berjalan</option>
                            <option value="Selesai Dilaksanakan">
                              Selesai Dilaksanakan
                            </option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() =>
                          callPutApi("rtl", {
                            action: "simpan_rtl_pengawas",
                            hasilId: selected.hasil!.id,
                            rtlRekomendasi,
                            rtlTarget,
                            rtlTenggat,
                            rtlProgres,
                          })
                        }
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Simpan Rencana Tindak Lanjut (RTL)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DOKUMEN & KIRIM WA */}
              {activeTab === "dokumen" && (
                <div className="space-y-4">
                  {!selected.hasil ? (
                    <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                      Dokumen PDF/Word & pengiriman WhatsApp tersedia setelah
                      penilaian tersimpan.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <h4 className="font-bold text-slate-900 text-sm">
                          Dokumen Resmi Berita Acara & Rapor (3 Tanda Tangan)
                        </h4>
                        <p className="text-xs text-slate-600">
                          Mencakup Kop Surat resmi, Nomor Registrasi, tabel skor
                          per aspek, catatan Kepala Sekolah, tabel RTL Pengawas,
                          serta blok tanda tangan Guru, Pengawas Sekolah, dan
                          Kepala Sekolah.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/api/export/${selected.hasil.id}?format=pdf`}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Unduh PDF
                          </a>
                          <a
                            href={`/api/export/${selected.hasil.id}?format=docx`}
                            className="px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Unduh Word (.docx)
                          </a>
                          <button
                            type="button"
                            onClick={() => setShowA4Modal(true)}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Pratinjau A4
                          </button>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                        <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          Kirim Laporan & PDF via Bot WhatsApp Shiroko
                        </h4>
                        <p className="text-xs text-emerald-900">
                          Kirim ringkasan skor, status pengesahan, RTL, beserta
                          file PDF Base64 ke nomor WhatsApp guru:{" "}
                          <strong className="font-mono">
                            {selected.guru.nomorWA}
                          </strong>
                        </p>
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() => handleKirimWaGuru(selected)}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                        >
                          {busyAction === "wa" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                          Kirim Laporan PDF ke WA Guru
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Pratinjau A4 */}
      {showA4Modal && selected?.hasil && (
        <div className="fixed inset-0 z-[60] bg-slate-900/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-6">
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs">
                Pratinjau Resmi A4 — {selected.guru.nama}
              </span>
              <button
                type="button"
                onClick={() => setShowA4Modal(false)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="border-b-4 border-double border-slate-800 pb-3 text-center">
                <p className="font-display font-extrabold text-sm uppercase">
                  DINAS PENDIDIKAN • SATUAN PENDIDIKAN
                </p>
                <p className="font-bold text-blue-800">
                  SISTEM INFORMASI SUPERVISI & EVALUASI AKADEMIK (SIPENA)
                </p>
              </div>
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div>
                  <div className="font-bold">BERITA ACARA & RAPOR SUPERVISI</div>
                  <div className="font-mono text-[11px] text-slate-600">
                    No. Reg:{" "}
                    {selected.hasil.nomorRegistrasi ||
                      `SIPENA-${selected.hasil.id.slice(0, 8).toUpperCase()}`}
                  </div>
                </div>
                <QrCode className="w-8 h-8 text-slate-700" />
              </div>
              <p>
                <strong>Nama:</strong> {selected.guru.nama} •{" "}
                <strong>NIP:</strong> {selected.guru.nip || "-"} •{" "}
                <strong>Skor Akhir:</strong> {Math.round(selected.hasil.skorTotal)}{" "}
                ({selected.hasil.predikat})
              </p>
              <p className="text-slate-700 leading-relaxed">
                {selected.hasil.kesimpulan}
              </p>
              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-[11px]">
                <div className="space-y-10">
                  <div>Pengawas Sekolah Pembina</div>
                  <div className="font-bold underline">
                    {selected.hasil.pengawasNama ||
                      "Drs. H. Bambang Sudibyo, M.Pd."}
                  </div>
                </div>
                <div className="space-y-10">
                  <div>Guru Mata Pelajaran</div>
                  <div className="font-bold underline">{selected.guru.nama}</div>
                </div>
                <div className="space-y-10">
                  <div>Kepala Sekolah / Supervisor</div>
                  <div className="font-bold underline">
                    {selected.hasil.disahkanOleh ||
                      "Dr. Hj. Ratna Kusuma, M.Pd."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
