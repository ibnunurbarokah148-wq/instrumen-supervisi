"use client";

import React, { useEffect, useState } from "react";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  BookOpen,
  FileSpreadsheet,
  ClipboardList,
  Camera,
  Film,
  MessageSquareHeart,
  CheckCircle2,
  Plus,
  Save,
  Trash2,
  ExternalLink,
  Upload,
  Sparkles,
  ShieldCheck,
  Clock,
  AlertCircle,
} from "lucide-react";

interface FotoItem {
  judul: string;
  url: string;
  keterangan: string;
}

interface PerangkatItem {
  id: string;
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
}

export default function GuruPerangkatSupervisiPage() {
  const [list, setList] = useState<PerangkatItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState<number>(0);

  // Form states
  const [judulPembelajaran, setJudulPembelajaran] = useState("");
  const [mataPelajaran, setMataPelajaran] = useState("");
  const [kelasFase, setKelasFase] = useState("Kelas 4 / Fase B");
  const [semester, setSemester] = useState("Ganjil 2026/2027");
  const [tanggalPelaksanaan, setTanggalPelaksanaan] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // 1. Modul Ajar / RPP
  const [modulAjarJudul, setModulAjarJudul] = useState("");
  const [modulAjarTujuan, setModulAjarTujuan] = useState("");
  const [modulAjarUrl, setModulAjarUrl] = useState("");
  const [modulAjarFileNama, setModulAjarFileNama] = useState("");

  // 2. LKPD
  const [lkpdJudul, setLkpdJudul] = useState("");
  const [lkpdDeskripsi, setLkpdDeskripsi] = useState("");
  const [lkpdUrl, setLkpdUrl] = useState("");
  const [lkpdFileNama, setLkpdFileNama] = useState("");

  // 3. Instrumen / Rubrik Asesmen
  const [asesmenJenis, setAsesmenJenis] = useState("Formatif & Sumatif");
  const [asesmenKriteria, setAsesmenKriteria] = useState("");
  const [asesmenUrl, setAsesmenUrl] = useState("");
  const [asesmenFileNama, setAsesmenFileNama] = useState("");

  // 4. Foto / Bukti Pelaksanaan
  const [fotoBukti, setFotoBukti] = useState<FotoItem[]>([]);
  const [fotoBuktiCatatan, setFotoBuktiCatatan] = useState("");
  const [newFotoJudul, setNewFotoJudul] = useState("");
  const [newFotoUrl, setNewFotoUrl] = useState("");
  const [newFotoKet, setNewFotoKet] = useState("");

  // 5. Media Dokumentasi Pembelajaran
  const [mediaJenis, setMediaJenis] = useState("Video & Slide Interaktif");
  const [mediaPlatform, setMediaPlatform] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaDeskripsi, setMediaDeskripsi] = useState("");

  // 6. Catatan Refleksi Mandiri Guru
  const [refleksiKeberhasilan, setRefleksiKeberhasilan] = useState("");
  const [refleksiKendala, setRefleksiKendala] = useState("");
  const [refleksiTindakLanjut, setRefleksiTindakLanjut] = useState("");

  // Metadata verifikasi
  const [statusVerifikasi, setStatusVerifikasi] = useState<
    "menunggu" | "lengkap" | "revisi"
  >("menunggu");
  const [catatanSupervisor, setCatatanSupervisor] = useState<string | null>(
    null
  );
  const [diverifikasiOleh, setDiverifikasiOleh] = useState<string | null>(null);

  const fetchPerangkat = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/guru/perangkat");
      if (res.ok) {
        const data = await res.json();
        const items: PerangkatItem[] = data.perangkat || [];
        setList(items);
        if (items.length > 0 && selectedId === "new") {
          loadItem(items[0]);
        } else if (items.length === 0) {
          initNewForm();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerangkat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadItem = (item: PerangkatItem) => {
    setSelectedId(item.id);
    setJudulPembelajaran(item.judulPembelajaran);
    setMataPelajaran(item.mataPelajaran);
    setKelasFase(item.kelasFase);
    setSemester(item.semester);
    setTanggalPelaksanaan(
      item.tanggalPelaksanaan
        ? new Date(item.tanggalPelaksanaan).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );

    setModulAjarJudul(item.modulAjarJudul || "");
    setModulAjarTujuan(item.modulAjarTujuan || "");
    setModulAjarUrl(item.modulAjarUrl || "");
    setModulAjarFileNama(item.modulAjarFileNama || "");

    setLkpdJudul(item.lkpdJudul || "");
    setLkpdDeskripsi(item.lkpdDeskripsi || "");
    setLkpdUrl(item.lkpdUrl || "");
    setLkpdFileNama(item.lkpdFileNama || "");

    setAsesmenJenis(item.asesmenJenis || "Formatif & Sumatif");
    setAsesmenKriteria(item.asesmenKriteria || "");
    setAsesmenUrl(item.asesmenUrl || "");
    setAsesmenFileNama(item.asesmenFileNama || "");

    try {
      setFotoBukti(JSON.parse(item.fotoBuktiJSON || "[]"));
    } catch {
      setFotoBukti([]);
    }
    setFotoBuktiCatatan(item.fotoBuktiCatatan || "");

    setMediaJenis(item.mediaJenis || "Video & Slide Interaktif");
    setMediaPlatform(item.mediaPlatform || "");
    setMediaUrl(item.mediaUrl || "");
    setMediaDeskripsi(item.mediaDeskripsi || "");

    setRefleksiKeberhasilan(item.refleksiKeberhasilan || "");
    setRefleksiKendala(item.refleksiKendala || "");
    setRefleksiTindakLanjut(item.refleksiTindakLanjut || "");

    setStatusVerifikasi(item.statusVerifikasi || "menunggu");
    setCatatanSupervisor(item.catatanSupervisor || null);
    setDiverifikasiOleh(item.diverifikasiOleh || null);
  };

  const initNewForm = () => {
    setSelectedId("new");
    setJudulPembelajaran("Pembelajaran Berdiferensiasi Berbasis Proyek Digital");
    setMataPelajaran("Informatika / Tematik Kurikulum Merdeka");
    setKelasFase("Kelas 4 / Fase B");
    setSemester("Ganjil 2026/2027");
    setTanggalPelaksanaan(new Date().toISOString().slice(0, 10));

    setModulAjarJudul("");
    setModulAjarTujuan("");
    setModulAjarUrl("");
    setModulAjarFileNama("");

    setLkpdJudul("");
    setLkpdDeskripsi("");
    setLkpdUrl("");
    setLkpdFileNama("");

    setAsesmenJenis("Formatif & Sumatif (Rubrik KKTP)");
    setAsesmenKriteria("");
    setAsesmenUrl("");
    setAsesmenFileNama("");

    setFotoBukti([]);
    setFotoBuktiCatatan("");

    setMediaJenis("Video Pembelajaran & Kuis Interaktif");
    setMediaPlatform("");
    setMediaUrl("");
    setMediaDeskripsi("");

    setRefleksiKeberhasilan("");
    setRefleksiKendala("");
    setRefleksiTindakLanjut("");

    setStatusVerifikasi("menunggu");
    setCatatanSupervisor(null);
    setDiverifikasiOleh(null);
  };

  // Hitung kelengkapan 6 komponen secara real-time
  const isModulReady = Boolean(
    modulAjarJudul.trim() || modulAjarUrl.trim() || modulAjarFileNama.trim()
  );
  const isLkpdReady = Boolean(
    lkpdJudul.trim() || lkpdUrl.trim() || lkpdFileNama.trim()
  );
  const isAsesmenReady = Boolean(
    asesmenKriteria.trim() || asesmenUrl.trim() || asesmenFileNama.trim()
  );
  const isFotoReady = Boolean(fotoBukti.length > 0 || fotoBuktiCatatan.trim());
  const isMediaReady = Boolean(
    mediaPlatform.trim() || mediaUrl.trim() || mediaDeskripsi.trim()
  );
  const isRefleksiReady = Boolean(
    refleksiKeberhasilan.trim() ||
      refleksiKendala.trim() ||
      refleksiTindakLanjut.trim()
  );

  const checklist6 = [
    {
      idx: 0,
      label: "Modul Ajar / RPP",
      short: "Modul Ajar",
      ready: isModulReady,
      icon: BookOpen,
    },
    {
      idx: 1,
      label: "Lembar Kerja Peserta Didik (LKPD)",
      short: "LKPD",
      ready: isLkpdReady,
      icon: FileSpreadsheet,
    },
    {
      idx: 2,
      label: "Instrumen / Rubrik Asesmen",
      short: "Rubrik Asesmen",
      ready: isAsesmenReady,
      icon: ClipboardList,
    },
    {
      idx: 3,
      label: "Foto / Bukti Pelaksanaan",
      short: "Foto Bukti",
      ready: isFotoReady,
      icon: Camera,
    },
    {
      idx: 4,
      label: "Media Dokumentasi Pembelajaran",
      short: "Media Dokumentasi",
      ready: isMediaReady,
      icon: Film,
    },
    {
      idx: 5,
      label: "Catatan Refleksi Mandiri Guru",
      short: "Refleksi Mandiri",
      ready: isRefleksiReady,
      icon: MessageSquareHeart,
    },
  ];

  const completedCount = checklist6.filter((c) => c.ready).length;
  const completionPct = Math.round((completedCount / 6) * 100);

  const handlePhotoUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFotoBukti((prev) => [
          ...prev,
          {
            judul: newFotoJudul.trim() || file.name.replace(/\.[^.]+$/, ""),
            url: reader.result as string,
            keterangan:
              newFotoKet.trim() ||
              "Dokumentasi kegiatan pembelajaran aktif di kelas",
          },
        ]);
        setNewFotoJudul("");
        setNewFotoKet("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddFotoByUrl = () => {
    if (!newFotoJudul.trim() && !newFotoUrl.trim()) return;
    setFotoBukti((prev) => [
      ...prev,
      {
        judul: newFotoJudul.trim() || `Bukti Kegiatan #${prev.length + 1}`,
        url:
          newFotoUrl.trim() ||
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
        keterangan:
          newFotoKet.trim() || "Observasi kegiatan inti & diskusi peserta didik",
      },
    ]);
    setNewFotoJudul("");
    setNewFotoUrl("");
    setNewFotoKet("");
  };

  const handleSave = async () => {
    if (!judulPembelajaran.trim()) {
      alert("Judul pembelajaran wajib diisi.");
      return;
    }
    setSaving(true);
    setToast("");
    try {
      const res = await fetch("/api/guru/perangkat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          judulPembelajaran,
          mataPelajaran,
          kelasFase,
          semester,
          tanggalPelaksanaan,
          modulAjarJudul,
          modulAjarTujuan,
          modulAjarUrl,
          modulAjarFileNama,
          modulAjarStatus: isModulReady,
          lkpdJudul,
          lkpdDeskripsi,
          lkpdUrl,
          lkpdFileNama,
          lkpdStatus: isLkpdReady,
          asesmenJenis,
          asesmenKriteria,
          asesmenUrl,
          asesmenFileNama,
          asesmenStatus: isAsesmenReady,
          fotoBukti,
          fotoBuktiCatatan,
          fotoBuktiStatus: isFotoReady,
          mediaJenis,
          mediaPlatform,
          mediaUrl,
          mediaDeskripsi,
          mediaStatus: isMediaReady,
          refleksiKeberhasilan,
          refleksiKendala,
          refleksiTindakLanjut,
          refleksiStatus: isRefleksiReady,
        }),
      });
      const data = await res.json();
      if (res.ok && data.perangkat) {
        setToast(
          data.message ||
            "Administrasi Modul Ajar & Perangkat Supervisi berhasil disimpan!"
        );
        await fetchPerangkat();
        loadItem(data.perangkat);
        setTimeout(() => setToast(""), 5000);
      } else {
        alert(data.error || "Gagal menyimpan berkas.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedId === "new") return;
    if (!window.confirm("Hapus berkas administrasi perangkat supervisi ini?"))
      return;
    const res = await fetch(`/api/guru/perangkat?id=${selectedId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSelectedId("new");
      await fetchPerangkat();
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <SenseiMascot size="lg" mood="thinking" className="mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">
          Sistem SIPENA sedang memuat ruang Administrasi Modul Ajar & Perangkat Supervisi...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-white border-2 border-sora-200 p-5 shadow-pastel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <SenseiMascot size="md" mood="happy" />
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sora-100 text-sora-700 text-[11px] font-extrabold">
                <Sparkles className="w-3 h-3 text-sakura-500" />
                Kelengkapan Bukti Supervisi Akademik
              </span>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-slate-900 mt-1">
                Administrasi Modul Ajar & Perangkat Supervisi
              </h2>
              <p className="text-xs text-slate-600">
                Lengkapi 6 perangkat pembelajaran Kurikulum Merdeka sebagai bukti autentik supervisi kelas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={initNewForm}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-sora-500 hover:bg-sora-600 text-white text-xs font-bold shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            Buat Berkas Baru
          </button>
        </div>

        {/* Pilihan Berkas Tersimpan */}
        {list.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Berkas Anda:
            </span>
            {list.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => loadItem(it)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  selectedId === it.id
                    ? "bg-sora-600 text-white border-sora-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-sora-50"
                }`}
              >
                {it.judulPembelajaran} ({it.kelasFase})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Verifikasi Kepala Sekolah / Supervisor */}
      {selectedId !== "new" && (
        <div
          className={`rounded-3xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            statusVerifikasi === "lengkap"
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : statusVerifikasi === "revisi"
              ? "bg-amber-50/90 border-amber-200 text-amber-900"
              : "bg-sora-50/80 border-sora-200 text-sora-900"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {statusVerifikasi === "lengkap" ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : statusVerifikasi === "revisi" ? (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              ) : (
                <Clock className="w-4 h-4 text-sora-600" />
              )}
              <span className="text-xs font-extrabold uppercase tracking-wider">
                Status Verifikasi Supervisor:{" "}
                {statusVerifikasi === "lengkap"
                  ? "LENGKAP & DISETUJUI KEPALA SEKOLAH"
                  : statusVerifikasi === "revisi"
                  ? "PERLU REVISI / KELENGKAPAN TAMBAHAN"
                  : "MENUNGGU PEMERIKSAAN KEPALA SEKOLAH"}
              </span>
            </div>
            {catatanSupervisor && (
              <p className="text-xs font-medium leading-relaxed">
                <strong>Catatan Supervisor ({diverifikasiOleh || "Kepala Sekolah"}):</strong>{" "}
                &ldquo;{catatanSupervisor}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar 6 Komponen Perangkat Supervisi */}
      <div className="bg-white rounded-3xl border border-sora-200 p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800">
            Kelengkapan 6 Perangkat Supervisi ({completedCount}/6 Komponen)
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-sora-100 text-sora-700 text-xs font-extrabold">
            {completionPct}% Lengkap
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sora-500 to-sakura-500 transition-all duration-300 rounded-full"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        {/* 6 Tab Navigasi Komponen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {checklist6.map((item) => {
            const Icon = item.icon;
            const isTabActive = activeTab === item.idx;
            return (
              <button
                key={item.idx}
                type="button"
                onClick={() => setActiveTab(item.idx)}
                className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${
                  isTabActive
                    ? "bg-sora-50 border-sora-400 shadow-2xs"
                    : "bg-slate-50/70 border-slate-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      item.ready
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                      Komponen #{item.idx + 1}
                    </span>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {item.short}
                    </p>
                  </div>
                </div>
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    item.ready ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Identitas Umum Pembelajaran */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card space-y-4">
        <h3 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5">
          Identitas Perangkat Pembelajaran & Jadwal Observasi
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Topik / Materi Pembelajaran
            </label>
            <input
              type="text"
              value={judulPembelajaran}
              onChange={(e) => setJudulPembelajaran(e.target.value)}
              placeholder="Contoh: Eksplorasi Ekosistem & Konservasi Lingkungan Berbasis Digital"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mata Pelajaran / Tema
            </label>
            <input
              type="text"
              value={mataPelajaran}
              onChange={(e) => setMataPelajaran(e.target.value)}
              placeholder="Contoh: IPAS / Informatika / Matematika"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kelas / Fase Kurikulum Merdeka
            </label>
            <select
              value={kelasFase}
              onChange={(e) => setKelasFase(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
            >
              <option value="Kelas 1 / Fase A">Kelas 1 / Fase A</option>
              <option value="Kelas 2 / Fase A">Kelas 2 / Fase A</option>
              <option value="Kelas 3 / Fase B">Kelas 3 / Fase B</option>
              <option value="Kelas 4 / Fase B">Kelas 4 / Fase B</option>
              <option value="Kelas 5 / Fase C">Kelas 5 / Fase C</option>
              <option value="Kelas 6 / Fase C">Kelas 6 / Fase C</option>
              <option value="SMP - SMA / Fase D-F">SMP - SMA / Fase D-F</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Semester & Tahun Ajaran
            </label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tanggal Pelaksanaan Observasi
            </label>
            <input
              type="date"
              value={tanggalPelaksanaan}
              onChange={(e) => setTanggalPelaksanaan(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Konten Komponen Aktif (1 s.d. 6) */}
      <div className="bg-white rounded-3xl border-2 border-sora-200 p-6 shadow-pastel space-y-4">
        {/* 1. MODUL AJAR / RPP */}
        {activeTab === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sora-100 text-sora-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sora-600">
                    Komponen 1 dari 6
                  </span>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Modul Ajar / RPP (Rencana Pelaksanaan Pembelajaran)
                  </h3>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isModulReady
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isModulReady ? "Sudah Terisi" : "Belum Lengkap"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Modul Ajar / RPP
              </label>
              <input
                type="text"
                value={modulAjarJudul}
                onChange={(e) => setModulAjarJudul(e.target.value)}
                placeholder="Contoh: Modul Ajar Kurikulum Merdeka - Pemrograman Web & Literasi Digital"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), & Langkah Diferensiasi
              </label>
              <textarea
                rows={3}
                value={modulAjarTujuan}
                onChange={(e) => setModulAjarTujuan(e.target.value)}
                placeholder="Tuliskan ringkasan tujuan pembelajaran, profil pelajar Pancasila yang dituju, serta skenario diferensiasi (konten/proses/produk)..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tautan Dokumen Modul Ajar (Google Drive / PMM / PDF)
                </label>
                <input
                  type="url"
                  value={modulAjarUrl}
                  onChange={(e) => setModulAjarUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unggah Berkas Modul Ajar (.pdf / .docx)
                </label>
                <label className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-sora-300 bg-sora-50/50 text-sora-700 text-xs font-bold cursor-pointer hover:bg-sora-100/60 transition">
                  <Upload className="w-4 h-4" />
                  <span>
                    {modulAjarFileNama || "Pilih File Modul Ajar / RPP"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setModulAjarFileNama(f.name);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 2. LEMBAR KERJA PESERTA DIDIK (LKPD) */}
        {activeTab === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sora-100 text-sora-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sora-600">
                    Komponen 2 dari 6
                  </span>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Lembar Kerja Peserta Didik (LKPD)
                  </h3>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isLkpdReady
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isLkpdReady ? "Sudah Terisi" : "Belum Lengkap"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Lembar Kerja Peserta Didik (LKPD)
              </label>
              <input
                type="text"
                value={lkpdJudul}
                onChange={(e) => setLkpdJudul(e.target.value)}
                placeholder="Contoh: LKPD Kolaboratif - Eksperimen dan Pemecahan Masalah Kelompok"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Aktivitas & Petunjuk Kerja Siswa pada LKPD
              </label>
              <textarea
                rows={3}
                value={lkpdDeskripsi}
                onChange={(e) => setLkpdDeskripsi(e.target.value)}
                placeholder="Jelaskan langkah kerja kelompok/individu yang dilakukan peserta didik pada LKPD ini..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tautan LKPD Digital (Canva / Google Docs / Liveworksheets)
                </label>
                <input
                  type="url"
                  value={lkpdUrl}
                  onChange={(e) => setLkpdUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unggah Berkas LKPD (.pdf / .docx)
                </label>
                <label className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-sora-300 bg-sora-50/50 text-sora-700 text-xs font-bold cursor-pointer hover:bg-sora-100/60 transition">
                  <Upload className="w-4 h-4" />
                  <span>{lkpdFileNama || "Pilih File LKPD"}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setLkpdFileNama(f.name);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 3. INSTRUMEN / RUBRIK ASESMEN */}
        {activeTab === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sora-100 text-sora-600 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sora-600">
                    Komponen 3 dari 6
                  </span>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Instrumen / Rubrik Asesmen
                  </h3>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isAsesmenReady
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isAsesmenReady ? "Sudah Terisi" : "Belum Lengkap"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jenis & Teknik Asesmen yang Digunakan
              </label>
              <select
                value={asesmenJenis}
                onChange={(e) => setAsesmenJenis(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="Formatif & Sumatif (Rubrik KKTP)">
                  Asesmen Formatif & Sumatif (Rubrik KKTP)
                </option>
                <option value="Asesmen Diagnostik, Formatif & Observasi Kinerja">
                  Asesmen Diagnostik, Formatif & Observasi Kinerja
                </option>
                <option value="Penilaian Proyek, Produk & Presentasi Kelompok">
                  Penilaian Proyek, Produk & Presentasi Kelompok
                </option>
                <option value="Kuis Digital Interaktif & Tes Tertulis">
                  Kuis Digital Interaktif & Tes Tertulis
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Indikator Penilaian & Rubrik Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)
              </label>
              <textarea
                rows={3}
                value={asesmenKriteria}
                onChange={(e) => setAsesmenKriteria(e.target.value)}
                placeholder="Contoh: Mahir (86-100): Mampu menyelesaikan proyek mandiri; Cakap (71-85): Mampu menyelesaikan sesuai instruksi; Layak (56-70): Butuh bimbingan..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tautan Instrumen / Kuis / Rubrik Asesmen
                </label>
                <input
                  type="url"
                  value={asesmenUrl}
                  onChange={(e) => setAsesmenUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unggah Berkas Rubrik Asesmen (.pdf / .docx / .xlsx)
                </label>
                <label className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-sora-300 bg-sora-50/50 text-sora-700 text-xs font-bold cursor-pointer hover:bg-sora-100/60 transition">
                  <Upload className="w-4 h-4" />
                  <span>{asesmenFileNama || "Pilih File Rubrik Asesmen"}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setAsesmenFileNama(f.name);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 4. FOTO / BUKTI PELAKSANAAN */}
        {activeTab === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sakura-100 text-sakura-600 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sakura-600">
                    Komponen 4 dari 6
                  </span>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Foto / Bukti Pelaksanaan Pembelajaran di Kelas
                  </h3>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isFotoReady
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {fotoBukti.length} Foto Bukti
              </span>
            </div>

            {/* Form Tambah Foto Bukti */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <p className="text-xs font-bold text-slate-700">
                Tambah Foto Kegiatan Pembelajaran (Dengan Memperhatikan Privasi Peserta Didik)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newFotoJudul}
                  onChange={(e) => setNewFotoJudul(e.target.value)}
                  placeholder="Judul momen (mis: Diskusi Kelompok Kegiatan Inti)"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
                <input
                  type="text"
                  value={newFotoKet}
                  onChange={(e) => setNewFotoKet(e.target.value)}
                  placeholder="Keterangan aktivitas guru & siswa..."
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sakura-500 hover:bg-sakura-600 text-white text-xs font-bold cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Foto dari Perangkat
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUploadFile}
                  />
                </label>

                <div className="flex-1 flex items-center gap-2 min-w-[220px]">
                  <input
                    type="url"
                    value={newFotoUrl}
                    onChange={(e) => setNewFotoUrl(e.target.value)}
                    placeholder="Atau tempel URL foto dokumentasi..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddFotoByUrl}
                    className="px-3 py-2 rounded-xl bg-sora-500 hover:bg-sora-600 text-white text-xs font-bold shrink-0"
                  >
                    + Tambah
                  </button>
                </div>
              </div>
            </div>

            {/* Galeri Foto Bukti */}
            {fotoBukti.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fotoBukti.map((f, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs flex flex-col justify-between"
                  >
                    <div className="h-40 bg-slate-100 relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.url}
                        alt={f.judul}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFotoBukti((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="absolute top-2 right-2 p-1.5 rounded-xl bg-rose-600/90 text-white hover:bg-rose-700"
                        title="Hapus Foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-xs text-slate-900">
                        {f.judul}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {f.keterangan}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Bukti Fisik & Keterlaksanaan Observasi Kelas
              </label>
              <textarea
                rows={2}
                value={fotoBuktiCatatan}
                onChange={(e) => setFotoBuktiCatatan(e.target.value)}
                placeholder="Catatan tambahan mengenai dokumentasi kehadiran, daftar hadir peserta didik, dan suasana kelas..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
        )}

        {/* 5. MEDIA DOKUMENTASI PEMBELAJARAN */}
        {activeTab === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sora-100 text-sora-600 flex items-center justify-center">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sora-600">
                    Komponen 5 dari 6
                  </span>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Media Dokumentasi Pembelajaran & Pemanfaatan TIK
                  </h3>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isMediaReady
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isMediaReady ? "Sudah Terisi" : "Belum Lengkap"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Media Dokumentasi & Sumber Belajar Digital
                </label>
                <select
                  value={mediaJenis}
                  onChange={(e) => setMediaJenis(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value="Video Pembelajaran & Slide Interaktif">
                    Video Pembelajaran & Slide Interaktif
                  </option>
                  <option value="Rekaman Observasi Kelas (YouTube / Google Drive)">
                    Rekaman Observasi Kelas (YouTube / Google Drive)
                  </option>
                  <option value="Simulasi Interaktif (PhET / GeoGebra / Sandbox)">
                    Simulasi Interaktif (PhET / GeoGebra / Sandbox)
                  </option>
                  <option value="Kuis Daring & Gamifikasi (Quizizz / Kahoot / Wordwall)">
                    Kuis Daring & Gamifikasi (Quizizz / Kahoot / Wordwall)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Perangkat TIK & Platform Digital yang Dipakai
                </label>
                <input
                  type="text"
                  value={mediaPlatform}
                  onChange={(e) => setMediaPlatform(e.target.value)}
                  placeholder="Contoh: Proyektor, Laptop, Google Classroom, PMM, Canva"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tautan Media / Rekaman Video / Slide Presentasi Pembelajaran
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Pemanfaatan Media & Bimbingan Literasi Digital Siswa
              </label>
              <textarea
                rows={3}
                value={mediaDeskripsi}
                onChange={(e) => setMediaDeskripsi(e.target.value)}
                placeholder="Jelaskan bagaimana media digital tersebut membantu pemahaman siswa dan bagaimana guru membimbing pemakaian teknologi secara aman & bertanggung jawab..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
        )}

        {/* 6. CATATAN REFLEKSI MANDIRI GURU */}
        {activeTab === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sakura-100 text-sakura-600 flex items-center justify-center">
                  <MessageSquareHeart className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sakura-600">
                    Komponen 6 dari 6
                  </span>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Catatan Refleksi Mandiri Guru
                  </h3>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isRefleksiReady
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isRefleksiReady ? "Sudah Terisi" : "Belum Lengkap"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1. Hal Baik & Keberhasilan yang Terlihat Selama Pembelajaran
              </label>
              <textarea
                rows={2}
                value={refleksiKeberhasilan}
                onChange={(e) => setRefleksiKeberhasilan(e.target.value)}
                placeholder="Apa praktik baik atau momen paling berhasil saat melaksanakan modul ajar ini di kelas?"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Hal yang Perlu Diperbaiki / Kendala yang Dihadapi Peserta Didik
              </label>
              <textarea
                rows={2}
                value={refleksiKendala}
                onChange={(e) => setRefleksiKendala(e.target.value)}
                placeholder="Apa tantangan manajemen waktu, diferensiasi, atau kendala siswa yang masih ditemukan?"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. Rencana Tindak Lanjut & Pengembangan Diri (PMM / Komunitas Belajar)
              </label>
              <textarea
                rows={2}
                value={refleksiTindakLanjut}
                onChange={(e) => setRefleksiTindakLanjut(e.target.value)}
                placeholder="Tuliskan langkah perbaikan pada pertemuan berikutnya atau topik pelatihan mandiri di Platform Merdeka Mengajar..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
        )}

        {/* Footer Navigasi Antar Komponen & Simpan */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {activeTab > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab((p) => p - 1)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ← Komponen Sebelumnya
              </button>
            )}
            {activeTab < 5 && (
              <button
                type="button"
                onClick={() => setActiveTab((p) => p + 1)}
                className="px-3.5 py-2 rounded-xl bg-sora-50 border border-sora-200 text-xs font-bold text-sora-700 hover:bg-sora-100"
              >
                Komponen Berikutnya →
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedId !== "new" && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                title="Hapus Berkas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white text-xs sm:text-sm font-extrabold shadow-md hover:opacity-95 transition"
            >
              <Save className="w-4 h-4" />
              {saving
                ? "Menyimpan..."
                : "Simpan Administrasi & Perangkat Supervisi"}
            </button>
          </div>
        </div>
      </div>

      {/* Ringkasan Utuh 6 Komponen dalam 1 Pandangan */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card space-y-3">
        <h3 className="font-display font-bold text-sm text-slate-900">
          Ringkasan Dokumen & Bukti Perangkat Terlampir
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-extrabold text-sora-700 block">
              1. Modul Ajar / RPP
            </span>
            <p className="font-bold text-slate-800">
              {modulAjarJudul || "-"}
            </p>
            <p className="text-slate-500 line-clamp-2">
              {modulAjarTujuan || "Belum ada deskripsi tujuan."}
            </p>
            {modulAjarUrl && (
              <a
                href={modulAjarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sora-600 font-bold hover:underline"
              >
                Buka Dokumen Modul Ajar <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-extrabold text-sora-700 block">
              2. Lembar Kerja Peserta Didik (LKPD)
            </span>
            <p className="font-bold text-slate-800">{lkpdJudul || "-"}</p>
            <p className="text-slate-500 line-clamp-2">
              {lkpdDeskripsi || "Belum ada deskripsi LKPD."}
            </p>
            {lkpdUrl && (
              <a
                href={lkpdUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sora-600 font-bold hover:underline"
              >
                Buka LKPD <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-extrabold text-sora-700 block">
              3. Instrumen / Rubrik Asesmen
            </span>
            <p className="font-bold text-slate-800">{asesmenJenis}</p>
            <p className="text-slate-500 line-clamp-2">
              {asesmenKriteria || "Belum ada rubrik KKTP."}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-extrabold text-sakura-600 block">
              4. Foto / Bukti Pelaksanaan
            </span>
            <p className="font-bold text-slate-800">
              {fotoBukti.length} Foto Kegiatan Terunggah
            </p>
            <p className="text-slate-500 line-clamp-2">
              {fotoBuktiCatatan || "Dokumentasi kegiatan pembelajaran kelas."}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-extrabold text-sora-700 block">
              5. Media Dokumentasi Pembelajaran
            </span>
            <p className="font-bold text-slate-800">
              {mediaJenis} ({mediaPlatform || "-"})
            </p>
            <p className="text-slate-500 line-clamp-2">
              {mediaDeskripsi || "Belum ada deskripsi media."}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-extrabold text-sakura-600 block">
              6. Catatan Refleksi Mandiri Guru
            </span>
            <p className="text-slate-700 line-clamp-2">
              <strong>Keberhasilan:</strong> {refleksiKeberhasilan || "-"}
            </p>
            <p className="text-slate-500 line-clamp-2">
              <strong>Tindak Lanjut:</strong> {refleksiTindakLanjut || "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
