"use client";

import React, { useEffect, useState } from "react";
import {
  Bot,
  Save,
  CheckCircle2,
  Sliders,
  RotateCcw,
} from "lucide-react";
import {
  DEFAULT_RUBRIK_JSON,
  DEFAULT_SYSTEM_PROMPT,
} from "@/lib/settings";

interface PredikatItem {
  label: string;
  minSkor: number;
  deskripsi: string;
}

export default function AdminPenilaianAiPage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [skalaMaksimal, setSkalaMaksimal] = useState(100);
  const [isiOtomatis, setIsiOtomatis] = useState(true);
  const [predikatList, setPredikatList] = useState<PredikatItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/pengaturan");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        if (s.ai_system_prompt) setSystemPrompt(s.ai_system_prompt);

        try {
          const rub = JSON.parse(s.ai_rubrik_json || DEFAULT_RUBRIK_JSON);
          setSkalaMaksimal(rub.skalaMaksimal || 100);
          setIsiOtomatis(rub.isiNilaiDokumenOtomatis !== false);
          if (Array.isArray(rub.predikat)) setPredikatList(rub.predikat);
        } catch {
          // ignore
        }
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast("");
    try {
      const ai_rubrik_json = JSON.stringify(
        {
          skalaMaksimal,
          isiNilaiDokumenOtomatis: isiOtomatis,
          predikat: predikatList,
        },
        null,
        2
      );

      const res = await fetch("/api/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ai_system_prompt: systemPrompt,
            ai_rubrik_json,
          },
        }),
      });
      if (res.ok) {
        setToast(
          "Pengaturan System Prompt AI Co-Evaluator & Rubrik Penilaian SIPENA berhasil disimpan!"
        );
        setTimeout(() => setToast(""), 4500);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl">
      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {toast}
        </div>
      )}

      {/* 1. System Prompt AI Co-Evaluator */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              Mitra Analisis & Format JSON
            </span>
            <h3 className="font-display font-bold text-lg text-slate-900 mt-1 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              1. Editor System Prompt Asisten AI Co-Evaluator (SIPENA)
            </h3>
            <p className="text-xs text-slate-500">
              AI berperan sebagai mitra penyusun draf analisis supervisi akademik berbasis Kurikulum Merdeka dan Permendikbudristek No. 16 Tahun 2022 untuk ditinjau & disahkan oleh Kepala Sekolah.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </button>
        </div>

        <textarea
          rows={12}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 2. Editor Rubrik & Ambang Batas Predikat */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            Rubrik Permendikbudristek
          </span>
          <h3 className="font-display font-bold text-lg text-slate-900 mt-1 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-600" />
            2. Skala Nilai, Predikat Mutu & Pengisian Otomatis Draf Laporan
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80">
          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isiOtomatis}
              onChange={(e) => setIsiOtomatis(e.target.checked)}
              className="rounded text-blue-600 w-4 h-4"
            />
            Isi otomatis skor awal & ringkasan temuan ke draf laporan PDF/Word (Kepala Sekolah tetap memegang hak edit & pengesahan akhir)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              Skala Maksimal:
            </span>
            <input
              type="number"
              value={skalaMaksimal}
              onChange={(e) => setSkalaMaksimal(Number(e.target.value) || 100)}
              className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
            />
          </div>
        </div>

        <div className="space-y-3">
          {predikatList.map((p, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 items-center"
            >
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                  Kategori Predikat
                </label>
                <input
                  type="text"
                  value={p.label}
                  onChange={(e) => {
                    const next = [...predikatList];
                    next[idx].label = e.target.value;
                    setPredikatList(next);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white mt-0.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                  Ambang Skor Min
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={p.minSkor}
                  onChange={(e) => {
                    const next = [...predikatList];
                    next[idx].minSkor = Number(e.target.value);
                    setPredikatList(next);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white mt-0.5"
                />
              </div>
              <div className="sm:col-span-7">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                  Deskripsi Rubrik
                </label>
                <input
                  type="text"
                  value={p.deskripsi}
                  onChange={(e) => {
                    const next = [...predikatList];
                    next[idx].deskripsi = e.target.value;
                    setPredikatList(next);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white mt-0.5"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
          >
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Pengaturan Rubrik & AI"}
          </button>
        </div>
      </div>
    </form>
  );
}
