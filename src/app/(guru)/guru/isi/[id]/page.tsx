"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Save,
  Send,
  Sparkles,
  AlertTriangle,
  Clock,
  Lock,
  ChevronDown,
  ChevronUp,
  FolderCheck,
} from "lucide-react";
import { SenseiMascot } from "@/components/SenseiMascot";
import { WorkflowStepper } from "@/components/WorkflowStepper";

interface PertanyaanItem {
  id: string;
  urutan: number;
  aspek: string;
  tipe: string;
  bobot: number;
  wajib: boolean;
  teks: string;
  opsiJSON: string;
}

interface AnswerEntry {
  nilai: string;
  catatan: string;
  buktiUrl: string;
}

interface PenugasanDetail {
  id: string;
  status: string;
  catatanVerifikasi?: string | null;
  diverifikasiOleh?: string | null;
  instrumen: {
    id: string;
    judul: string;
    deskripsi?: string | null;
    versi: number;
    pertanyaan: PertanyaanItem[];
  };
  jawaban: Array<{
    pertanyaanId: string;
    nilaiJSON: string;
  }>;
  hasil?: {
    id: string;
    disahkan: boolean;
    rtlRekomendasi?: string | null;
  } | null;
}

function normalizeAnswer(raw: string): AnswerEntry {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "nilai" in parsed
    ) {
      return {
        nilai: parsed.nilai === null || parsed.nilai === undefined ? "" : String(parsed.nilai),
        catatan: typeof parsed.catatan === "string" ? parsed.catatan : "",
        buktiUrl: typeof parsed.buktiUrl === "string" ? parsed.buktiUrl : "",
      };
    }
    if (Array.isArray(parsed)) {
      return { nilai: parsed.join(", "), catatan: "", buktiUrl: "" };
    }
    return {
      nilai: parsed === null || parsed === undefined ? "" : String(parsed),
      catatan: "",
      buktiUrl: "",
    };
  } catch {
    return { nilai: raw, catatan: "", buktiUrl: "" };
  }
}

export default function IsiInstrumenPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const penugasanId = params.id;

  const [detail, setDetail] = useState<PenugasanDetail | null>(null);
  const [perangkat, setPerangkat] = useState<{
    judulPembelajaran: string;
    statusVerifikasi: string;
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerEntry>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [activeAspectIdx, setActiveAspectIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [submittingMode, setSubmittingMode] = useState<"verifikasi" | "ai" | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/guru/penugasan/${penugasanId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal memuat instrumen.");
        return d;
      })
      .then((d) => {
        const p: PenugasanDetail = d.penugasan;
        setDetail(p);
        setPerangkat(d.perangkatTerbaru || null);

        if (p.hasil?.disahkan || p.status === "selesai" || p.status === "tindak_lanjut") {
          router.replace(`/guru/hasil/${penugasanId}`);
          return;
        }

        const initAnswers: Record<string, AnswerEntry> = {};
        const initExpanded: Record<string, boolean> = {};
        for (const j of p.jawaban || []) {
          const entry = normalizeAnswer(j.nilaiJSON);
          initAnswers[j.pertanyaanId] = entry;
          if (entry.catatan || entry.buktiUrl) {
            initExpanded[j.pertanyaanId] = true;
          }
        }
        setAnswers(initAnswers);
        setExpandedNotes(initExpanded);
      })
      .catch((e) => setErrorMsg(e.message))
      .finally(() => setLoading(false));
  }, [penugasanId, router]);

  const aspectGroups = useMemo(() => {
    if (!detail) return [];
    const groups: { aspek: string; items: PertanyaanItem[] }[] = [];
    for (const q of detail.instrumen.pertanyaan) {
      const existing = groups.find((g) => g.aspek === q.aspek);
      if (existing) existing.items.push(q);
      else groups.push({ aspek: q.aspek, items: [q] });
    }
    return groups;
  }, [detail]);

  const scheduleAutoSave = (nextAnswers: Record<string, AnswerEntry>) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setSavingDraft(true);
        const res = await fetch(`/api/guru/penugasan/${penugasanId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "draft", answers: nextAnswers }),
        });
        if (res.ok) {
          setLastSaved(
            new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      } finally {
        setSavingDraft(false);
      }
    }, 1000);
  };

  const updateAnswerField = (
    pertanyaanId: string,
    patch: Partial<AnswerEntry>
  ) => {
    setErrorMsg("");
    setAnswers((prev) => {
      const current = prev[pertanyaanId] || {
        nilai: "",
        catatan: "",
        buktiUrl: "",
      };
      const next = {
        ...prev,
        [pertanyaanId]: { ...current, ...patch },
      };
      scheduleAutoSave(next);
      return next;
    });
  };

  const handleSaveDraftManual = async () => {
    setSavingDraft(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan draf.");
      setLastSaved(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setSuccessMsg("Draf evaluasi diri berhasil disimpan.");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Gagal menyimpan draf.");
    } finally {
      setSavingDraft(false);
    }
  };

  const validateRequired = (): boolean => {
    if (!detail) return false;
    for (const q of detail.instrumen.pertanyaan) {
      if (q.wajib) {
        const val = answers[q.id]?.nilai?.trim();
        if (!val) {
          const idx = aspectGroups.findIndex((g) => g.aspek === q.aspek);
          if (idx >= 0) setActiveAspectIdx(idx);
          setErrorMsg(
            `Indikator wajib nomor ${q.urutan} pada aspek "${q.aspek}" belum diisi.`
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmitVerifikasi = async () => {
    if (!validateRequired()) return;
    setErrorMsg("");
    setSuccessMsg("");
    setSubmittingMode("verifikasi");
    try {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_verifikasi",
          answers,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengajukan verifikasi.");
      setSuccessMsg(
        json.message ||
          "Evaluasi diri berhasil diajukan ke Kepala Sekolah untuk tahap verifikasi & penilaian."
      );
      setDetail((prev) =>
        prev
          ? { ...prev, status: json.status || "menunggu_verifikasi", catatanVerifikasi: null }
          : prev
      );
    } catch (e: unknown) {
      setErrorMsg(
        e instanceof Error ? e.message : "Gagal mengirim pengajuan verifikasi."
      );
    } finally {
      setSubmittingMode(null);
    }
  };

  const handleSubmitWithAI = async () => {
    if (!validateRequired()) return;
    setErrorMsg("");
    setSuccessMsg("");
    setSubmittingMode("ai");
    try {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          answers,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error ||
            "Gagal menyusun draf analisis AI Co-Evaluator. Anda dapat menekan 'Ajukan Verifikasi Kepala Sekolah' tanpa AI."
        );
      }
      router.push(`/guru/hasil/${penugasanId}`);
    } catch (e: unknown) {
      setErrorMsg(
        e instanceof Error ? e.message : "Gagal menyusun draf AI Co-Evaluator."
      );
      setSubmittingMode(null);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm font-bold text-slate-600">
          Memuat instrumen supervisi akademik...
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        {errorMsg || "Instrumen tidak ditemukan."}
      </div>
    );
  }

  const currentGroup = aspectGroups[activeAspectIdx];
  const totalQ = detail.instrumen.pertanyaan.length;
  const filledCount = detail.instrumen.pertanyaan.filter(
    (q) => answers[q.id]?.nilai?.trim()
  ).length;
  const isLocked = Boolean(detail.hasil?.disahkan);

  return (
    <div className="space-y-5">
      {/* Overlay AI Co-Evaluator */}
      {submittingMode === "ai" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-white p-6 text-center space-y-4 shadow-2xl border border-blue-200">
            <SenseiMascot size="lg" mood="thinking" className="mx-auto" />
            <h3 className="font-display font-extrabold text-lg text-slate-900">
              Menyusun Draf Analisis Asisten AI...
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Asisten AI Supervisi sedang memetakan evaluasi diri, catatan
              keterlaksanaan, dan kelengkapan perangkat ajar Anda menjadi draf
              evaluasi awal untuk ditelaah oleh{" "}
              <strong>Kepala Sekolah</strong>.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memproses 4 aspek instrumen...
            </div>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/guru/isi"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Instrumen
        </Link>

        <div className="flex items-center gap-2 text-xs">
          {savingDraft ? (
            <span className="inline-flex items-center gap-1 text-blue-600 font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Menyimpan draf...
            </span>
          ) : lastSaved ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Draf tersimpan ({lastSaved})
            </span>
          ) : null}
        </div>
      </div>

      {/* Header Instrumen + Stepper */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-lg sm:text-xl text-slate-900">
              {detail.instrumen.judul}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Terisi {filledCount} dari {totalQ} indikator • Skala Rubrik 1–4
              Standar Proses
            </p>
          </div>
          {perangkat ? (
            <Link
              href="/guru/perangkat"
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 shrink-0 ${
                perangkat.statusVerifikasi === "lengkap"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : perangkat.statusVerifikasi === "perlu_revisi"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <FolderCheck className="w-3.5 h-3.5" />
              Perangkat:{" "}
              {perangkat.statusVerifikasi === "lengkap"
                ? "Lengkap"
                : perangkat.statusVerifikasi === "perlu_revisi"
                ? "Perlu Revisi"
                : "Menunggu Verifikasi"}
            </Link>
          ) : (
            <Link
              href="/guru/perangkat"
              className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Belum Ada Perangkat Ajar
            </Link>
          )}
        </div>

        <WorkflowStepper
          status={detail.status}
          disahkan={detail.hasil?.disahkan}
          hasRtl={Boolean(detail.hasil?.rtlRekomendasi)}
        />

        {detail.status === "perlu_revisi" && detail.catatanVerifikasi && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">
                Catatan Revisi ({detail.diverifikasiOleh || "Kepala Sekolah"}):
              </strong>{" "}
              {detail.catatanVerifikasi}
            </div>
          </div>
        )}

        {detail.status === "menunggu_verifikasi" && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              Berkas evaluasi diri Anda sedang{" "}
              <strong>Menunggu Verifikasi Kepala Sekolah</strong>. Anda tetap
              dapat menyempurnakan catatan sebelum Kepala Sekolah mengesahkan
              penilaian akhir.
            </div>
          </div>
        )}

        {isLocked && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs text-emerald-900">
            <span className="inline-flex items-center gap-2 font-bold">
              <Lock className="w-4 h-4 text-emerald-600" />
              Laporan ini telah disahkan permanen (Immutable).
            </span>
            <Link
              href={`/guru/hasil/${penugasanId}`}
              className="underline font-bold"
            >
              Buka Rapor Resmi
            </Link>
          </div>
        )}
      </div>

      {/* Navigasi Aspek */}
      <div className="flex flex-wrap gap-2">
        {aspectGroups.map((g, idx) => {
          const doneInGroup = g.items.filter((q) => answers[q.id]?.nilai?.trim()).length;
          const active = idx === activeAspectIdx;
          return (
            <button
              key={g.aspek}
              type="button"
              onClick={() => setActiveAspectIdx(idx)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                active
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>
                {idx + 1}. {g.aspek}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  active ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {doneInGroup}/{g.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Daftar Pertanyaan pada Aspek Aktif */}
      {currentGroup && (
        <div className="space-y-4">
          {currentGroup.items.map((q) => {
            const entry = answers[q.id] || { nilai: "", catatan: "", buktiUrl: "" };
            let opsi: string[] = [];
            try {
              opsi = JSON.parse(q.opsiJSON || "[]");
            } catch {
              opsi = [];
            }

            const showNotes = Boolean(expandedNotes[q.id]);

            return (
              <div
                key={q.id}
                className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      Indikator #{q.urutan} • {q.aspek}{" "}
                      {q.wajib ? "• Wajib" : "• Opsional"}
                    </span>
                    <h3 className="font-semibold text-sm sm:text-base text-slate-900 mt-1 leading-snug">
                      {q.teks}
                    </h3>
                  </div>
                </div>

                {/* Input sesuai Tipe Pertanyaan */}
                {q.tipe === "skala" && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {(opsi.length > 0
                        ? opsi
                        : [
                            "1 - Kurang",
                            "2 - Cukup",
                            "3 - Baik",
                            "4 - Amat Baik",
                          ]
                      ).map((label, idx) => {
                        const scoreVal = String(idx + 1);
                        const selected = entry.nilai === scoreVal;
                        const shortTitle = label.split(":")[0] || `Skala ${scoreVal}`;
                        const desc = label.includes(":")
                          ? label.split(":").slice(1).join(":").trim()
                          : "";
                        return (
                          <button
                            key={scoreVal}
                            type="button"
                            disabled={isLocked}
                            onClick={() =>
                              updateAnswerField(q.id, { nilai: scoreVal })
                            }
                            className={`p-3 rounded-xl border text-left transition ${
                              selected
                                ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                : "bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-800"
                            }`}
                          >
                            <div className="font-display font-bold text-xs sm:text-sm">
                              {shortTitle}
                            </div>
                            {desc && (
                              <div
                                className={`text-[11px] mt-1 leading-snug ${
                                  selected ? "text-blue-100" : "text-slate-500"
                                }`}
                              >
                                {desc}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {q.tipe === "ya_tidak" && (
                  <div className="flex gap-3">
                    {["Ya, Terlaksana", "Tidak Terlaksana"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={isLocked}
                        onClick={() => updateAnswerField(q.id, { nilai: opt })}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                          entry.nilai === opt
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.tipe === "pilihan_ganda" && (
                  <div className="space-y-2">
                    {opsi.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={isLocked}
                        onClick={() => updateAnswerField(q.id, { nilai: opt })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition ${
                          entry.nilai === opt
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {(q.tipe === "isian_singkat" || q.tipe === "esai") && (
                  <textarea
                    rows={q.tipe === "esai" ? 4 : 2}
                    disabled={isLocked}
                    value={entry.nilai}
                    onChange={(e) =>
                      updateAnswerField(q.id, { nilai: e.target.value })
                    }
                    placeholder="Tuliskan deskripsi keterlaksanaan dan refleksi objektif Anda..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {/* Drawer Catatan Keterlaksanaan & Link Bukti */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedNotes((prev) => ({
                        ...prev,
                        [q.id]: !prev[q.id],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
                  >
                    {showNotes ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    {showNotes
                      ? "Tutup Catatan & Tautan Bukti"
                      : "Tambah Catatan Refleksi & Tautan Bukti Pembelajaran"}
                  </button>

                  {showNotes && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Catatan Keterlaksanaan / Praktik Nyata
                        </label>
                        <textarea
                          rows={2}
                          disabled={isLocked}
                          value={entry.catatan}
                          onChange={(e) =>
                            updateAnswerField(q.id, { catatan: e.target.value })
                          }
                          placeholder="Contoh: Menggunakan media simulasi PhET di kelas VIII-B..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Tautan Bukti Pendukung (Drive / Foto / Video)
                        </label>
                        <input
                          type="url"
                          disabled={isLocked}
                          value={entry.buktiUrl}
                          onChange={(e) =>
                            updateAnswerField(q.id, { buktiUrl: e.target.value })
                          }
                          placeholder="https://drive.google.com/..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Navigasi & Aksi Submit */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={activeAspectIdx === 0}
            onClick={() => setActiveAspectIdx((i) => Math.max(0, i - 1))}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Aspek Sebelumnya
          </button>
          <button
            type="button"
            disabled={activeAspectIdx >= aspectGroups.length - 1}
            onClick={() =>
              setActiveAspectIdx((i) =>
                Math.min(aspectGroups.length - 1, i + 1)
              )
            }
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 inline-flex items-center gap-1"
          >
            Aspek Berikutnya
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={savingDraft || isLocked}
            onClick={handleSaveDraftManual}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Draf
          </button>

          <button
            type="button"
            disabled={submittingMode !== null || isLocked}
            onClick={handleSubmitVerifikasi}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {submittingMode === "verifikasi" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Ajukan Verifikasi Kepala Sekolah
          </button>

          <button
            type="button"
            disabled={submittingMode !== null || isLocked}
            onClick={handleSubmitWithAI}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Susun Draf AI & Ajukan Penilaian
          </button>
        </div>
      </div>
    </div>
  );
}
