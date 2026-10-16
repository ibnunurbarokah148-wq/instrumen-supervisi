"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Sparkles,
  AlertCircle,
  Send,
} from "lucide-react";

interface Question {
  id: string;
  teks: string;
  tipe: "skala" | "pilihan_ganda" | "ya_tidak" | "isian_singkat" | "esai";
  aspek: string;
  bobot: number;
  urutan: number;
  wajib: boolean;
  opsiJSON: string;
}

export default function GuruIsiFormPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const penugasanId = params.id;

  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const [stepIdx, setStepIdx] = useState(0);
  const [confirmScreen, setConfirmScreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSaveText, setAutoSaveText] = useState("Draft siap disimpan otomatis");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.penugasan;
        // Jika supervisi sudah berstatus selesai, langsung arahkan ke halaman hasil
        if (p.status === "selesai") {
          router.replace(`/guru/hasil/${penugasanId}`);
          return;
        }

        setJudul(p.instrumen.judul);
        setDeskripsi(p.instrumen.deskripsi);
        setQuestions(p.instrumen.pertanyaan || []);

        const initialAns: Record<string, unknown> = {};
        for (const j of p.jawaban || []) {
          try {
            initialAns[j.pertanyaanId] = JSON.parse(j.nilaiJSON);
          } catch {
            initialAns[j.pertanyaanId] = j.nilaiJSON;
          }
        }
        setAnswers(initialAns);
      }
      setLoading(false);
    })();
  }, [penugasanId, router]);

  // Kelompokkan pertanyaan per aspek (PRD Bagian 6.2: satu aspek per langkah)
  const aspectGroups = React.useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of questions) {
      const a = q.aspek || "Umum";
      if (!map.has(a)) map.set(a, []);
      map.get(a)!.push(q);
    }
    return Array.from(map.entries()).map(([aspek, items]) => ({
      aspek,
      items,
    }));
  }, [questions]);

  const saveDraft = async (nextAnswers: Record<string, unknown>) => {
    try {
      setAutoSaveText("Menyimpan draft...");
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          answers: nextAnswers,
        }),
      });
      if (res.ok) {
        const nowStr = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setAutoSaveText(`Draft tersimpan otomatis pukul ${nowStr}`);
      }
    } catch {
      setAutoSaveText("Draft tersimpan secara lokal");
    }
  };

  const handleAnswerChange = (qId: string, val: unknown) => {
    setErrorMsg("");
    const next = { ...answers, [qId]: val };
    setAnswers(next);
    saveDraft(next);
  };

  const validateCurrentStep = (): boolean => {
    const currentGroup = aspectGroups[stepIdx];
    if (!currentGroup) return true;
    for (const q of currentGroup.items) {
      if (q.wajib) {
        const v = answers[q.id];
        if (v === undefined || v === null || String(v).trim() === "") {
          setErrorMsg(
            `Mohon lengkapi pertanyaan wajib nomor #${q.urutan} pada aspek ${q.aspek} sebelum melanjutkan.`
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    if (stepIdx < aspectGroups.length - 1) {
      setStepIdx((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setConfirmScreen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Fallback Polling jika submit sedang berjalan agar jika koneksi browser terputus tetap otomatis redirect saat selesai
  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(async () => {
      try {
        const checkRes = await fetch(`/api/guru/penugasan/${penugasanId}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.penugasan?.status === "selesai") {
            clearInterval(interval);
            router.push(`/guru/hasil/${penugasanId}`);
          }
        }
      } catch {
        // ignore network hiccup during polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [submitting, penugasanId, router]);

  const handleFinalSubmit = async () => {
    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mengevaluasi jawaban.");
        setSubmitting(false);
        return;
      }
      router.push(`/guru/hasil/${penugasanId}`);
    } catch {
      // Periksa apakah di database evaluasi sebenarnya sudah berhasil disimpan
      try {
        const checkRes = await fetch(`/api/guru/penugasan/${penugasanId}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.penugasan?.status === "selesai") {
            router.push(`/guru/hasil/${penugasanId}`);
            return;
          }
        }
      } catch {
        // ignore
      }
      setErrorMsg("Koneksi ke server terputus. Silakan muat ulang halaman untuk melihat status terbaru.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <SenseiMascot size="lg" mood="thinking" className="mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">
          Menyiapkan lembar instrumen supervisi...
        </p>
      </div>
    );
  }

  // Animasi Penuh "Sensei-AI sedang menganalisis" saat Submit (PRD Bagian 6.2)
  if (submitting) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-sora-50 via-white to-sakura-50 flex flex-col items-center justify-center p-6 text-center">
        <SenseiMascot size="xl" mood="thinking" className="mb-5" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sakura-100 text-sakura-700 text-xs font-extrabold mb-3">
          <Sparkles className="w-4 h-4 animate-spin" />
          Evaluator AI & Fish Audio TTS Aktif
        </div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900">
          Sensei-AI Sedang Menganalisis Jawaban Anda...
        </h2>
        <p className="text-sm text-slate-600 max-w-md mt-2 leading-relaxed">
          Mohon tunggu sebentar ya, Sensei! Sensei-AI sedang menghitung skor per
          aspek, menyusun saran pengembangan diri, dan meracik audio podcast
          khusus untuk Anda. 🌸
        </p>
        <div className="w-64 h-2.5 bg-sora-100 rounded-full overflow-hidden mt-6">
          <div className="h-full bg-gradient-to-r from-sora-500 to-sakura-500 animate-pulse w-4/5 rounded-full" />
        </div>
      </div>
    );
  }

  const totalSteps = aspectGroups.length;
  const progressPercent = confirmScreen
    ? 100
    : totalSteps > 0
    ? Math.round(((stepIdx + 1) / totalSteps) * 100)
    : 100;

  return (
    <div className="space-y-5">
      {/* Header Progress Bar & Status Auto-save */}
      <div className="bg-white rounded-3xl border border-sora-200 p-5 shadow-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-sora-600">
              {confirmScreen
                ? "Konfirmasi Akhir Sebelum Evaluasi AI"
                : `Langkah ${stepIdx + 1} dari ${totalSteps} • Aspek ${
                    aspectGroups[stepIdx]?.aspek || ""
                  }`}
            </span>
            <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
              {judul}
            </h2>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
            <CloudUpload className="w-3.5 h-3.5" />
            {autoSaveText}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-sora-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sora-500 to-sakura-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Tab Langkah Aspek */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {aspectGroups.map((g, i) => (
            <button
              key={g.aspek}
              type="button"
              onClick={() => {
                setConfirmScreen(false);
                setStepIdx(i);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                !confirmScreen && stepIdx === i
                  ? "bg-sora-500 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-sora-50"
              }`}
            >
              {i + 1}. {g.aspek}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Layar Konfirmasi Sebelum Submit (PRD Bagian 6.2) */}
      {confirmScreen ? (
        <div className="bg-white rounded-3xl border-2 border-sora-300 p-6 shadow-pastel space-y-5">
          <div className="flex items-center gap-4">
            <SenseiMascot size="md" mood="cheer" />
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                Layar Konfirmasi Jawaban Supervisi
              </h3>
              <p className="text-xs text-slate-600">
                Periksa kembali ringkasan jawaban Anda. Setelah dikirim, Sensei-AI akan mengevaluasi dan membuatkan podcast suara untuk Anda.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {questions.map((q) => {
              const val = answers[q.id];
              return (
                <div
                  key={q.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-sora-600">
                      Soal #{q.urutan} • {q.aspek}
                    </span>
                    <p className="text-xs font-bold text-slate-800">{q.teks}</p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-white border border-sora-200 text-xs font-extrabold text-sora-700 shrink-0">
                    {val !== undefined && val !== ""
                      ? String(val)
                      : "Belum diisi"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmScreen(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali Ubah Jawaban
            </button>

            <button
              type="button"
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white text-xs sm:text-sm font-extrabold shadow-lg hover:opacity-95 transition"
            >
              <Send className="w-4 h-4" />
              Kirim & Analisis dengan Sensei-AI ✨
            </button>
          </div>
        </div>
      ) : (
        /* Daftar Pertanyaan pada Aspek Aktif */
        <div className="space-y-4">
          {aspectGroups[stepIdx]?.items.map((q) => {
            const currentVal = answers[q.id];
            let opsiList: string[] = [];
            try {
              opsiList = JSON.parse(q.opsiJSON || "[]");
            } catch {
              opsiList = [];
            }

            return (
              <div
                key={q.id}
                className="bg-white rounded-3xl border border-sora-200/80 p-5 sm:p-6 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-sora-600">
                  <span>
                    Pertanyaan #{q.urutan} • Aspek {q.aspek}
                  </span>
                  <span className="text-slate-400">Bobot {q.bobot}x</span>
                </div>

                <p className="font-display font-bold text-slate-900 text-sm sm:text-base leading-relaxed">
                  {q.teks}
                  {q.wajib && (
                    <span className="text-rose-500 ml-1" title="Wajib diisi">
                      *
                    </span>
                  )}
                </p>

                {/* Input sesuai Tipe Pertanyaan (PRD Bagian 5.3 & 6.2) */}
                {q.tipe === "skala" && (
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const active = Number(currentVal) === num;
                      const labelText =
                        opsiList[num - 1] ||
                        ["Kurang", "Cukup", "Baik", "Sangat Baik", "Istimewa"][
                          num - 1
                        ];
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, num)}
                          className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                            active
                              ? "bg-gradient-to-br from-sora-500 to-sakura-500 border-sora-500 text-white shadow-md scale-[1.02]"
                              : "bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-sora-50"
                          }`}
                        >
                          <span className="font-display font-extrabold text-lg">
                            {num}
                          </span>
                          <span
                            className={`text-[10px] line-clamp-1 font-semibold ${
                              active ? "text-white" : "text-slate-400"
                            }`}
                          >
                            {labelText.replace(/^\d\s*-\s*/, "")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.tipe === "ya_tidak" && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {["Ya", "Tidak"].map((opt) => {
                      const active = String(currentVal) === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, opt)}
                          className={`py-3 px-4 rounded-2xl border font-bold text-sm transition flex items-center justify-center gap-2 ${
                            active
                              ? "bg-sora-500 border-sora-500 text-white shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-sora-50"
                          }`}
                        >
                          {active && <CheckCircle2 className="w-4 h-4" />}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.tipe === "pilihan_ganda" && (
                  <div className="space-y-2 pt-1">
                    {opsiList.map((opt, idx) => {
                      const active = String(currentVal) === opt;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, opt)}
                          className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold transition flex items-center justify-between gap-3 ${
                            active
                              ? "bg-sora-50 border-sora-400 text-sora-900 shadow-xs"
                              : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-white"
                          }`}
                        >
                          <span>{opt}</span>
                          {active && (
                            <CheckCircle2 className="w-4 h-4 text-sora-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.tipe === "isian_singkat" && (
                  <input
                    type="text"
                    value={String(currentVal || "")}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Ketik jawaban singkat Anda..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm"
                  />
                )}

                {q.tipe === "esai" && (
                  <textarea
                    rows={4}
                    value={String(currentVal || "")}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Tuliskan cerita refleksi dan rencana tindak lanjut Anda secara leluasa..."
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm leading-relaxed"
                  />
                )}
              </div>
            );
          })}

          {/* Tombol Navigasi Langkah */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={stepIdx === 0}
              onClick={() => {
                setStepIdx((s) => Math.max(0, s - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              Aspek Sebelumnya
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white text-xs sm:text-sm font-bold shadow-md hover:opacity-95 transition"
            >
              {stepIdx < totalSteps - 1
                ? "Lanjut ke Aspek Berikutnya"
                : "Lanjut ke Konfirmasi Akhir"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
