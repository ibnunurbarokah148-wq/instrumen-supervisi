"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  FileSpreadsheet,
  ClipboardList,
  Camera,
  Film,
  MessageSquareHeart,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  ExternalLink,
  ShieldCheck,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

interface FotoItem {
  judul: string;
  url: string;
  keterangan: string;
}

interface AdminPerangkatRow {
  id: string;
  guruId: string;
  judulPembelajaran: string;
  mataPelajaran: string;
  kelasFase: string;
  semester: string;
  tanggalPelaksanaan: string;

  modulAjarJudul: string;
  modulAjarTujuan: string;
  modulAjarUrl: string;
  modulAjarFileNama: string;
  modulAjarStatus: boolean;

  lkpdJudul: string;
  lkpdDeskripsi: string;
  lkpdUrl: string;
  lkpdFileNama: string;
  lkpdStatus: boolean;

  asesmenJenis: string;
  asesmenKriteria: string;
  asesmenUrl: string;
  asesmenFileNama: string;
  asesmenStatus: boolean;

  fotoBuktiJSON: string;
  fotoBuktiCatatan: string;
  fotoBuktiStatus: boolean;

  mediaJenis: string;
  mediaPlatform: string;
  mediaUrl: string;
  mediaDeskripsi: string;
  mediaStatus: boolean;

  refleksiKeberhasilan: string;
  refleksiKendala: string;
  refleksiTindakLanjut: string;
  refleksiStatus: boolean;

  statusVerifikasi: "menunggu" | "lengkap" | "revisi";
  catatanSupervisor: string | null;
  diverifikasiOleh: string | null;
  diverifikasiPada: string | null;
  updatedAt: string;

  guru: {
    id: string;
    nama: string;
    email: string;
    nip: string | null;
    mapel: string | null;
  };
}

export default function AdminPerangkatSupervisiPage() {
  const [rows, setRows] = useState<AdminPerangkatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [selected, setSelected] = useState<AdminPerangkatRow | null>(null);
  const [verifStatus, setVerifStatus] = useState<
    "menunggu" | "lengkap" | "revisi"
  >("lengkap");
  const [catatanInput, setCatatanInput] = useState("");
  const [savingVerif, setSavingVerif] = useState(false);
  const [toast, setToast] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/perangkat");
      if (res.ok) {
        const data = await res.json();
        setRows(data.perangkat || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (item: AdminPerangkatRow) => {
    setSelected(item);
    setVerifStatus(item.statusVerifikasi || "lengkap");
    setCatatanInput(item.catatanSupervisor || "");
  };

  const handleSaveVerifikasi = async () => {
    if (!selected) return;
    setSavingVerif(true);
    try {
      const res = await fetch("/api/admin/perangkat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verifikasi",
          id: selected.id,
          statusVerifikasi: verifStatus,
          catatanSupervisor: catatanInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast(data.message || "Verifikasi berhasil disimpan!");
        setSelected(null);
        await fetchData();
        setTimeout(() => setToast(""), 4500);
      }
    } finally {
      setSavingVerif(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus berkas administrasi perangkat ini?")) return;
    const res = await fetch(`/api/admin/perangkat?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const countKomponen = (r: AdminPerangkatRow) => {
    return [
      r.modulAjarStatus,
      r.lkpdStatus,
      r.asesmenStatus,
      r.fotoBuktiStatus,
      r.mediaStatus,
      r.refleksiStatus,
    ].filter(Boolean).length;
  };

  const filtered = rows.filter((r) => {
    const matchSearch =
      r.guru.nama.toLowerCase().includes(search.toLowerCase()) ||
      r.judulPembelajaran.toLowerCase().includes(search.toLowerCase()) ||
      r.mataPelajaran.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "ALL" || r.statusVerifikasi === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalBerkas = rows.length;
  const totalLengkap = rows.filter(
    (r) => r.statusVerifikasi === "lengkap"
  ).length;
  const totalMenunggu = rows.filter(
    (r) => r.statusVerifikasi !== "lengkap"
  ).length;
  const rataKelengkapan =
    totalBerkas > 0
      ? Math.round(
          (rows.reduce((acc, r) => acc + countKomponen(r) / 6, 0) /
            totalBerkas) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-sora-900 to-slate-900 text-white p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sora-500/20 border border-sora-400/30 text-sora-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-sakura-400" />
            Pemeriksaan Bukti Fisik & Administrasi Guru
          </span>
          <h3 className="font-display font-bold text-xl mt-1">
            Administrasi Modul Ajar & Perangkat Supervisi
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Verifikasi kelengkapan 6 komponen perangkat pembelajaran guru: Modul Ajar/RPP, LKPD, Rubrik Asesmen, Foto Bukti, Media Dokumentasi, dan Refleksi Mandiri.
          </p>
        </div>
      </div>

      {/* 4 Kartu Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Berkas Perangkat
          </p>
          <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">
            {totalBerkas}
          </p>
          <span className="text-xs text-sora-600 font-semibold mt-1 inline-block">
            Seluruh guru aktif
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Disetujui & Lengkap
          </p>
          <p className="font-display font-extrabold text-3xl text-emerald-600 mt-1">
            {totalLengkap}
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
            Terverifikasi Kepala Sekolah
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Menunggu / Perlu Revisi
          </p>
          <p className="font-display font-extrabold text-3xl text-amber-600 mt-1">
            {totalMenunggu}
          </p>
          <span className="text-xs text-amber-600 font-semibold mt-1 inline-block">
            Siap diperiksa supervisor
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Rata-Rata Kelengkapan
          </p>
          <p className="font-display font-extrabold text-3xl text-slate-900 mt-1">
            {rataKelengkapan}%
          </p>
          <span className="text-xs text-sakura-600 font-semibold mt-1 inline-block">
            Dari 6 komponen standar
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama guru, topik, atau mapel..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
          >
            <option value="ALL">Semua Status</option>
            <option value="lengkap">Lengkap & Disetujui</option>
            <option value="menunggu">Menunggu Verifikasi</option>
            <option value="revisi">Perlu Revisi</option>
          </select>
        </div>
      </div>

      {/* Daftar Berkas Perangkat Guru */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-bold text-slate-600">
            Memuat data administrasi modul ajar & perangkat supervisi...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const compCount = countKomponen(item);
            const pct = Math.round((compCount / 6) * 100);
            let fotos: FotoItem[] = [];
            try {
              fotos = JSON.parse(item.fotoBuktiJSON || "[]");
            } catch {
              fotos = [];
            }

            const badges6 = [
              {
                label: "Modul Ajar / RPP",
                ok: item.modulAjarStatus,
                icon: BookOpen,
              },
              {
                label: "LKPD",
                ok: item.lkpdStatus,
                icon: FileSpreadsheet,
              },
              {
                label: "Instrumen / Rubrik Asesmen",
                ok: item.asesmenStatus,
                icon: ClipboardList,
              },
              {
                label: `Foto Bukti (${fotos.length})`,
                ok: item.fotoBuktiStatus,
                icon: Camera,
              },
              {
                label: "Media Dokumentasi",
                ok: item.mediaStatus,
                icon: Film,
              },
              {
                label: "Catatan Refleksi Mandiri",
                ok: item.refleksiStatus,
                icon: MessageSquareHeart,
              },
            ];

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4 hover:border-sora-300 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                          item.statusVerifikasi === "lengkap"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.statusVerifikasi === "revisi"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-sora-100 text-sora-700"
                        }`}
                      >
                        {item.statusVerifikasi === "lengkap" ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : item.statusVerifikasi === "revisi" ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {item.statusVerifikasi === "lengkap"
                          ? "Lengkap & Disetujui"
                          : item.statusVerifikasi === "revisi"
                          ? "Perlu Revisi"
                          : "Menunggu Verifikasi"}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        {item.kelasFase} • {item.semester}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full bg-sakura-50 text-sakura-700 text-xs font-extrabold">
                        Kelengkapan: {compCount}/6 ({pct}%)
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-base text-slate-900">
                      {item.judulPembelajaran}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Guru: <strong className="text-slate-800">{item.guru.nama}</strong>{" "}
                      ({item.mataPelajaran}) • Pelaksanaan:{" "}
                      {new Date(item.tanggalPelaksanaan).toLocaleDateString(
                        "id-ID",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openModal(item)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
                    >
                      <Eye className="w-4 h-4" />
                      Periksa 6 Komponen & Verifikasi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grid Indikator 6 Komponen Perangkat Supervisi */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {badges6.map((b, idx) => {
                    const Icon = b.icon;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 ${
                          b.ok
                            ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                            : "bg-amber-50/50 border-amber-200 text-amber-900"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon
                            className={`w-4 h-4 ${
                              b.ok ? "text-emerald-600" : "text-amber-500"
                            }`}
                          />
                          <span className="text-[10px] font-extrabold uppercase">
                            {b.ok ? "Ada" : "Kosong"}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold leading-snug">
                          {b.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {item.catatanSupervisor && (
                  <div className="p-3 rounded-2xl bg-sora-50/70 border border-sora-200/80 text-xs text-slate-700">
                    <strong className="text-sora-800">
                      Catatan Supervisor ({item.diverifikasiOleh || "Admin"}):
                    </strong>{" "}
                    {item.catatanSupervisor}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail 6 Komponen & Verifikasi Kepala Sekolah */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sora-600">
                  Pemeriksaan Administrasi Modul Ajar & Perangkat Supervisi
                </span>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  {selected.judulPembelajaran}
                </h3>
                <p className="text-xs text-slate-500">
                  Guru: <strong>{selected.guru.nama}</strong> •{" "}
                  {selected.mataPelajaran} • {selected.kelasFase} (
                  {selected.semester})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 1. Modul Ajar / RPP */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sora-700 uppercase">
                    1. Modul Ajar / RPP
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    {selected.modulAjarStatus ? "Tersedia" : "Belum Diisi"}
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm">
                  {selected.modulAjarJudul || "-"}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {selected.modulAjarTujuan || "-"}
                </p>
                {selected.modulAjarFileNama && (
                  <p className="text-slate-500">
                    Berkas: <strong>{selected.modulAjarFileNama}</strong>
                  </p>
                )}
                {selected.modulAjarUrl && (
                  <a
                    href={selected.modulAjarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sora-600 font-bold hover:underline"
                  >
                    Buka Dokumen Modul Ajar <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* 2. LKPD */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sora-700 uppercase">
                    2. Lembar Kerja Peserta Didik (LKPD)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    {selected.lkpdStatus ? "Tersedia" : "Belum Diisi"}
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm">
                  {selected.lkpdJudul || "-"}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {selected.lkpdDeskripsi || "-"}
                </p>
                {selected.lkpdFileNama && (
                  <p className="text-slate-500">
                    Berkas: <strong>{selected.lkpdFileNama}</strong>
                  </p>
                )}
                {selected.lkpdUrl && (
                  <a
                    href={selected.lkpdUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sora-600 font-bold hover:underline"
                  >
                    Buka Dokumen LKPD <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* 3. Instrumen / Rubrik Asesmen */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sora-700 uppercase">
                    3. Instrumen / Rubrik Asesmen
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    {selected.asesmenStatus ? "Tersedia" : "Belum Diisi"}
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm">
                  {selected.asesmenJenis || "-"}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {selected.asesmenKriteria || "-"}
                </p>
                {selected.asesmenFileNama && (
                  <p className="text-slate-500">
                    Berkas: <strong>{selected.asesmenFileNama}</strong>
                  </p>
                )}
                {selected.asesmenUrl && (
                  <a
                    href={selected.asesmenUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sora-600 font-bold hover:underline"
                  >
                    Buka Rubrik Asesmen <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* 5. Media Dokumentasi Pembelajaran */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sora-700 uppercase">
                    5. Media Dokumentasi Pembelajaran
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    {selected.mediaStatus ? "Tersedia" : "Belum Diisi"}
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm">
                  {selected.mediaJenis} • {selected.mediaPlatform}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {selected.mediaDeskripsi || "-"}
                </p>
                {selected.mediaUrl && (
                  <a
                    href={selected.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sora-600 font-bold hover:underline"
                  >
                    Buka Media / Rekaman Pembelajaran{" "}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* 4. Foto / Bukti Pelaksanaan */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sakura-600 uppercase">
                  4. Foto / Bukti Pelaksanaan Pembelajaran
                </span>
                <span className="text-slate-500 font-semibold">
                  {selected.fotoBuktiCatatan}
                </span>
              </div>

              {(() => {
                let fotos: FotoItem[] = [];
                try {
                  fotos = JSON.parse(selected.fotoBuktiJSON || "[]");
                } catch {
                  fotos = [];
                }
                if (fotos.length === 0) {
                  return (
                    <p className="text-slate-400">
                      Belum ada foto bukti pelaksanaan yang diunggah.
                    </p>
                  );
                }
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {fotos.map((f, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl overflow-hidden border border-slate-200 bg-white"
                      >
                        <div className="h-32 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={f.url}
                            alt={f.judul}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2.5">
                          <p className="font-bold text-slate-800">{f.judul}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {f.keterangan}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 6. Catatan Refleksi Mandiri Guru */}
            <div className="p-4 rounded-2xl bg-sakura-50/50 border border-sakura-200 space-y-2 text-xs">
              <span className="font-extrabold text-sakura-700 uppercase block">
                6. Catatan Refleksi Mandiri Guru
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-sakura-100">
                  <strong className="text-slate-800 block mb-1">
                    Hal Baik & Keberhasilan:
                  </strong>
                  <p className="text-slate-600">
                    {selected.refleksiKeberhasilan || "-"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white border border-sakura-100">
                  <strong className="text-slate-800 block mb-1">
                    Kendala & Hal Perlu Diperbaiki:
                  </strong>
                  <p className="text-slate-600">
                    {selected.refleksiKendala || "-"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white border border-sakura-100">
                  <strong className="text-slate-800 block mb-1">
                    Rencana Tindak Lanjut:
                  </strong>
                  <p className="text-slate-600">
                    {selected.refleksiTindakLanjut || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Keputusan Verifikasi Supervisor */}
            <div className="p-4 rounded-2xl bg-sora-50 border border-sora-200 space-y-3">
              <h4 className="font-display font-bold text-sm text-slate-900">
                Keputusan Verifikasi & Umpan Balik Kepala Sekolah (Supervisor)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Verifikasi Berkas
                  </label>
                  <select
                    value={verifStatus}
                    onChange={(e) =>
                      setVerifStatus(
                        e.target.value as "menunggu" | "lengkap" | "revisi"
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-sora-300 bg-white text-xs font-bold"
                  >
                    <option value="lengkap">
                      ✅ Lengkap & Disetujui Supervisor
                    </option>
                    <option value="revisi">
                      ⚠️ Perlu Revisi / Tambahan Bukti
                    </option>
                    <option value="menunggu">⏳ Menunggu Pemeriksaan</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan & Rekomendasi Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    value={catatanInput}
                    onChange={(e) => setCatatanInput(e.target.value)}
                    placeholder="Berikan apresiasi atau saran perbaikan perangkat pembelajaran guru..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sora-300 bg-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveVerifikasi}
                  disabled={savingVerif}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  {savingVerif
                    ? "Menyimpan..."
                    : "Simpan Verifikasi Supervisor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
