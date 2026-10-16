"use client";

import React, { useEffect, useState } from "react";
import {
  Bot,
  Save,
  CheckCircle2,
  Sliders,
  Headphones,
  RotateCcw,
} from "lucide-react";
import {
  DEFAULT_PODCAST_TEMPLATE_JSON,
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

  const [podcastGaya, setPodcastGaya] = useState("monolog_sensei");
  const [podcastDurasi, setPodcastDurasi] = useState(2);
  const [podcastPembawa, setPodcastPembawa] = useState(1);
  const [sapaanPembuka, setSapaanPembuka] = useState("");
  const [kalimatPenutup, setKalimatPenutup] = useState("");

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

        try {
          const pod = JSON.parse(
            s.podcast_template_json || DEFAULT_PODCAST_TEMPLATE_JSON
          );
          setPodcastGaya(pod.gaya || "monolog_sensei");
          setPodcastDurasi(pod.durasiTargetMenit || 2);
          setPodcastPembawa(pod.jumlahPembawa || 1);
          setSapaanPembuka(pod.sapaanPembuka || "");
          setKalimatPenutup(pod.kalimatPenutup || "");
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
      const podcast_template_json = JSON.stringify(
        {
          gaya: podcastGaya,
          durasiTargetMenit: podcastDurasi,
          jumlahPembawa: podcastPembawa,
          sapaanPembuka,
          kalimatPenutup,
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
            podcast_template_json,
          },
        }),
      });
      if (res.ok) {
        setToast(
          "Pengaturan System Prompt, Rubrik Penilaian, dan Template Podcast berhasil disimpan!"
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

      {/* 1. System Prompt Evaluator */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-sora-100 text-sora-700 text-xs font-bold">
              Persona & Output JSON
            </span>
            <h3 className="font-display font-bold text-lg text-slate-900 mt-1 flex items-center gap-2">
              <Bot className="w-5 h-5 text-sora-600" />
              1. Editor System Prompt Sensei-AI Evaluator
            </h3>
            <p className="text-xs text-slate-500">
              Atur persona wibu-profesional Sensei-AI, instruksi rubrik, dan kewajiban format JSON terstruktur.
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
          rows={11}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-sora-400"
        />
      </div>

      {/* 2. Editor Rubrik & Ambang Batas Predikat */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            Rubrik Penilaian
          </span>
          <h3 className="font-display font-bold text-lg text-slate-900 mt-1 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-600" />
            2. Skala Nilai, Predikat & Pengisian Otomatis Dokumen
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-sora-50/60 border border-sora-200/80">
          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isiOtomatis}
              onChange={(e) => setIsiOtomatis(e.target.checked)}
              className="rounded text-sora-600 w-4 h-4"
            />
            AI menentukan nilai akhir & mengisi otomatis ke template dokumen export (PDF/Word)
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
      </div>

      {/* 3. Template Naskah Podcast */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <span className="px-2.5 py-0.5 rounded-full bg-sakura-100 text-sakura-700 text-xs font-bold">
            Naskah Suara
          </span>
          <h3 className="font-display font-bold text-lg text-slate-900 mt-1 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-sakura-600" />
            3. Template Naskah Podcast Sensei-AI
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Gaya Bahasa Podcast
            </label>
            <select
              value={podcastGaya}
              onChange={(e) => {
                setPodcastGaya(e.target.value);
                setPodcastPembawa(
                  e.target.value === "dialog_dua_host" ? 2 : 1
                );
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold"
            >
              <option value="monolog_sensei">
                Monolog Hangat Sensei-AI (1 Pembawa)
              </option>
              <option value="dialog_dua_host">
                Dialog Interaktif Sensei & Co-Host (2 Pembawa)
              </option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Durasi Target (Menit)
            </label>
            <select
              value={podcastDurasi}
              onChange={(e) => setPodcastDurasi(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold"
            >
              <option value={1}>1 Menit (Ringkas)</option>
              <option value={2}>2 Menit (Ideal)</option>
              <option value={3}>3 Menit (Mendalam)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Jumlah Pembawa Suara
            </label>
            <input
              type="number"
              min={1}
              max={2}
              value={podcastPembawa}
              onChange={(e) => setPodcastPembawa(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kalimat Sapaan Pembuka (Mendukung {"{{nama_guru}}"})
            </label>
            <textarea
              rows={2}
              value={sapaanPembuka}
              onChange={(e) => setSapaanPembuka(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kalimat Penyemangat Penutup
            </label>
            <textarea
              rows={2}
              value={kalimatPenutup}
              onChange={(e) => setKalimatPenutup(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white font-bold text-xs shadow-md hover:opacity-95 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Pengaturan Penilaian AI"}
          </button>
        </div>
      </div>
    </form>
  );
}
