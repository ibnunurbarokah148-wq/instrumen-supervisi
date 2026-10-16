"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Sparkles,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  Save,
  FileEdit,
  GripVertical,
  CheckCircle2,
  X,
} from "lucide-react";

interface QuestionItem {
  id?: string;
  teks: string;
  tipe: "skala" | "pilihan_ganda" | "ya_tidak" | "isian_singkat" | "esai";
  aspek: string;
  bobot: number;
  urutan: number;
  wajib: boolean;
  opsi: string[];
}

interface InstrumenItem {
  id: string;
  judul: string;
  deskripsi: string;
  versi: number;
  status: "aktif" | "draft" | "arsip";
  pertanyaan: {
    id: string;
    teks: string;
    tipe: "skala" | "pilihan_ganda" | "ya_tidak" | "isian_singkat" | "esai";
    aspek: string;
    bobot: number;
    urutan: number;
    wajib: boolean;
    opsiJSON: string;
  }[];
  _count?: { penugasan: number };
}

export default function AdminInstrumenPage() {
  const [list, setList] = useState<InstrumenItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [status, setStatus] = useState<"aktif" | "draft" | "arsip">("aktif");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [generatingAi, setGeneratingAi] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const fetchInstrumen = async () => {
    const res = await fetch("/api/admin/instrumen");
    if (res.ok) {
      const data = await res.json();
      setList(data.instrumen || []);
      if (!selectedId && data.instrumen?.length > 0) {
        selectInstrumen(data.instrumen[0]);
      }
    }
  };

  useEffect(() => {
    fetchInstrumen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectInstrumen = (item: InstrumenItem) => {
    setSelectedId(item.id);
    setJudul(item.judul);
    setDeskripsi(item.deskripsi);
    setStatus(item.status);
    setQuestions(
      item.pertanyaan.map((p, idx) => {
        let opsi: string[] = [];
        try {
          opsi = JSON.parse(p.opsiJSON || "[]");
        } catch {
          opsi = [];
        }
        return {
          id: p.id,
          teks: p.teks,
          tipe: p.tipe,
          aspek: p.aspek,
          bobot: p.bobot,
          urutan: idx + 1,
          wajib: p.wajib,
          opsi,
        };
      })
    );
  };

  const handleStartNew = () => {
    setSelectedId("new");
    setJudul("Instrumen Supervisi Baru");
    setDeskripsi("Deskripsi tujuan dan cakupan supervisi akademik...");
    setStatus("aktif");
    setQuestions([
      {
        teks: "Kelengkapan rencana pembelajaran dan pemetaan capaian siswa.",
        tipe: "skala",
        aspek: "Perencanaan",
        bobot: 1.5,
        urutan: 1,
        wajib: true,
        opsi: ["1", "2", "3", "4", "5"],
      },
    ]);
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        teks: "",
        tipe: "skala",
        aspek: "Pelaksanaan",
        bobot: 1.0,
        urutan: prev.length + 1,
        wajib: true,
        opsi: ["1", "2", "3", "4", "5"],
      },
    ]);
  };

  const duplicateQuestion = (idx: number) => {
    const target = questions[idx];
    const copy: QuestionItem = {
      ...target,
      id: undefined,
      teks: `${target.teks} (Salinan)`,
      opsi: [...target.opsi],
    };
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    setQuestions(next.map((q, i) => ({ ...q, urutan: i + 1 })));
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) =>
      prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, urutan: i + 1 }))
    );
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const next = [...questions];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setQuestions(next.map((q, i) => ({ ...q, urutan: i + 1 })));
  };

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...questions];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    setQuestions(next.map((q, i) => ({ ...q, urutan: i + 1 })));
    setDragIdx(null);
  };

  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim()) {
      alert("Masukkan topik supervisi terlebih dahulu.");
      return;
    }
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/admin/instrumen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_ai",
          topik: aiTopic,
          jumlah: aiCount,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.questions)) {
        setQuestions((prev) => {
          const combined = [
            ...prev,
            ...data.questions.map((q: QuestionItem, i: number) => ({
              ...q,
              urutan: prev.length + i + 1,
            })),
          ];
          return combined;
        });
        setToast(
          `✨ Sensei-AI berhasil menambahkan ${data.questions.length} pertanyaan untuk topik "${aiTopic}"!`
        );
        setTimeout(() => setToast(""), 4500);
      }
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSave = async () => {
    if (!judul.trim() || questions.length === 0) {
      alert("Judul dan minimal 1 pertanyaan wajib diisi.");
      return;
    }
    setSaving(true);
    setToast("");
    try {
      const isNew = selectedId === "new" || !selectedId;
      const url = isNew
        ? "/api/admin/instrumen"
        : `/api/admin/instrumen/${selectedId}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judul,
          deskripsi,
          status,
          pertanyaan: questions.map((q, i) => ({ ...q, urutan: i + 1 })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast(data.message || "Instrumen berhasil disimpan!");
        await fetchInstrumen();
        if (data.instrumen) {
          selectInstrumen(data.instrumen);
        }
        setTimeout(() => setToast(""), 5000);
      } else {
        alert(data.error || "Gagal menyimpan instrumen.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInstrumen = async (id: string) => {
    if (!window.confirm("Hapus instrumen ini beserta seluruh pertanyaannya?"))
      return;
    const res = await fetch(`/api/admin/instrumen/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedId(null);
      await fetchInstrumen();
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Daftar Instrumen */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-slate-900 text-base">
                Daftar Instrumen
              </h3>
              <button
                type="button"
                onClick={handleStartNew}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sora-500 hover:bg-sora-600 text-white text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Baru
              </button>
            </div>

            <div className="space-y-2.5">
              {list.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => selectInstrumen(item)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? "bg-sora-50/90 border-sora-400 shadow-sm"
                        : "bg-slate-50/70 border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          item.status === "aktif"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status} • v{item.versi}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {item.pertanyaan.length} soal
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                      {item.judul}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                      {item.deskripsi}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Box Buat Pertanyaan dengan AI (PRD Bagian 5.3) */}
          <div className="bg-gradient-to-br from-sora-50 via-white to-sakura-50 rounded-3xl border border-sora-200 p-5 shadow-pastel space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sakura-100 text-sakura-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Asisten Pembuat Soal AI
            </div>
            <h4 className="font-display font-bold text-slate-900 text-sm">
              Buat Pertanyaan dengan Sensei-AI
            </h4>
            <p className="text-xs text-slate-600">
              Masukkan topik supervisi, Sensei-AI akan menyarankan butir pertanyaan lengkap dengan aspek & bobotnya.
            </p>
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="Contoh: Pembelajaran Berdiferensiasi & AI"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sora-200 bg-white text-xs"
            />
            <div className="flex items-center gap-2">
              <select
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-sora-200 bg-white text-xs font-semibold"
              >
                <option value={3}>3 Pertanyaan</option>
                <option value={5}>5 Pertanyaan</option>
                <option value={6}>6 Pertanyaan</option>
              </select>
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={generatingAi}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white text-xs font-bold shadow-sm hover:opacity-95 transition"
              >
                {generatingAi ? "Menyusun..." : "✨ Sarankan Soal AI"}
              </button>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Editor Instrumen & Daftar Pertanyaan */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-sora-600" />
                <h3 className="font-display font-bold text-lg text-slate-900">
                  {selectedId === "new"
                    ? "Buat Instrumen Baru"
                    : "Editor Instrumen & Pertanyaan"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sora-200 bg-sora-50 text-sora-700 hover:bg-sora-100 text-xs font-bold transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Pratinjau Sisi Guru
                </button>
                {selectedId && selectedId !== "new" && (
                  <button
                    type="button"
                    onClick={() => handleDeleteInstrumen(selectedId)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Hapus Instrumen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Menyimpan..." : "Simpan Instrumen"}
                </button>
              </div>
            </div>

            {/* Metadata Instrumen */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Instrumen Supervisi
                </label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "aktif" | "draft" | "arsip")
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold"
                >
                  <option value="aktif">Aktif</option>
                  <option value="draft">Draft</option>
                  <option value="arsip">Arsip</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi & Petunjuk Pengisian
              </label>
              <textarea
                rows={2}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 font-medium">
              💡 <strong>Fitur Versi Otomatis (PRD 5.3):</strong> Apabila instrumen ini sudah pernah diisi oleh guru, menyimpan perubahan pertanyaan akan otomatis membuat <strong>Versi Baru (v+1)</strong> sehingga jawaban guru pada versi lama tetap utuh.
            </div>
          </div>

          {/* Daftar Pertanyaan (Drag & Drop + Reorder + Duplikasi) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm text-slate-800">
                Daftar Butir Pertanyaan ({questions.length} Soal)
              </h4>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sora-500 hover:bg-sora-600 text-white text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pertanyaan
              </button>
            </div>

            {questions.map((q, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-sora-300 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="cursor-grab text-slate-400 hover:text-slate-600">
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-sora-700">
                      Aspek: {q.aspek}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                      title="Geser Naik"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(idx, 1)}
                      disabled={idx === questions.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                      title="Geser Turun"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateQuestion(idx)}
                      className="p-1.5 rounded-lg text-sora-600 hover:bg-sora-50"
                      title="Duplikasi Pertanyaan"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                      title="Hapus Pertanyaan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={q.teks}
                    onChange={(e) => {
                      const next = [...questions];
                      next[idx].teks = e.target.value;
                      setQuestions(next);
                    }}
                    placeholder="Tulis teks pertanyaan instrumen supervisi..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Tipe Jawaban
                    </label>
                    <select
                      value={q.tipe}
                      onChange={(e) => {
                        const next = [...questions];
                        next[idx].tipe = e.target.value as QuestionItem["tipe"];
                        if (
                          next[idx].tipe === "pilihan_ganda" &&
                          next[idx].opsi.length === 0
                        ) {
                          next[idx].opsi = ["Opsi A", "Opsi B", "Opsi C"];
                        }
                        setQuestions(next);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                    >
                      <option value="skala">Skala 1 - 5</option>
                      <option value="pilihan_ganda">Pilihan Ganda</option>
                      <option value="ya_tidak">Ya / Tidak</option>
                      <option value="isian_singkat">Isian Singkat</option>
                      <option value="esai">Esai Reflektif</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Aspek Penilaian
                    </label>
                    <select
                      value={q.aspek}
                      onChange={(e) => {
                        const next = [...questions];
                        next[idx].aspek = e.target.value;
                        setQuestions(next);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                    >
                      <option value="Perencanaan">Perencanaan</option>
                      <option value="Pelaksanaan">Pelaksanaan</option>
                      <option value="Penguasaan IT">Penguasaan IT</option>
                      <option value="Evaluasi">Evaluasi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Bobot Nilai
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="5"
                      value={q.bobot}
                      onChange={(e) => {
                        const next = [...questions];
                        next[idx].bobot = Number(e.target.value) || 1.0;
                        setQuestions(next);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex items-end pb-1.5">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.wajib}
                        onChange={(e) => {
                          const next = [...questions];
                          next[idx].wajib = e.target.checked;
                          setQuestions(next);
                        }}
                        className="rounded text-sora-600"
                      />
                      Wajib Diisi
                    </label>
                  </div>
                </div>

                {q.tipe === "pilihan_ganda" && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Opsi Pilihan Ganda (Pisahkan dengan tanda titik koma `;`)
                    </label>
                    <input
                      type="text"
                      value={q.opsi.join("; ")}
                      onChange={(e) => {
                        const next = [...questions];
                        next[idx].opsi = e.target.value
                          .split(";")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setQuestions(next);
                      }}
                      placeholder="Opsi 1; Opsi 2; Opsi 3"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Pratinjau Sisi Guru (PRD Bagian 5.3) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-sora-50 via-white to-sakura-50 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-sora-200">
            <div className="flex items-center justify-between border-b border-sora-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sakura-600">
                  Pratinjau Mobile-First Guru
                </span>
                <h3 className="font-display font-bold text-base text-slate-900">
                  {judul}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-4 border border-sora-100 shadow-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-sora-600 font-bold mb-1">
                    <span>
                      Soal #{i + 1} • Aspek {q.aspek}
                    </span>
                    <span>Bobot {q.bobot}x</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-2">
                    {q.teks || "(Teks pertanyaan belum diisi)"}
                    {q.wajib && <span className="text-rose-500 ml-1">*</span>}
                  </p>
                  {q.tipe === "skala" && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className="py-2 rounded-xl border border-sora-200 text-center text-xs font-bold text-sora-700 bg-sora-50/50"
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.tipe === "ya_tidak" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="py-2 rounded-xl border border-sora-200 text-center text-xs font-bold">
                        Ya
                      </div>
                      <div className="py-2 rounded-xl border border-slate-200 text-center text-xs font-bold">
                        Tidak
                      </div>
                    </div>
                  )}
                  {q.tipe === "pilihan_ganda" && (
                    <div className="space-y-1.5">
                      {q.opsi.map((o, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        >
                          ○ {o}
                        </div>
                      ))}
                    </div>
                  )}
                  {(q.tipe === "isian_singkat" || q.tipe === "esai") && (
                    <div className="p-3 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                      Area jawaban teks guru ({q.tipe})...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
