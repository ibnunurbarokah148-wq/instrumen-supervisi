"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Save,
  CheckCircle2,
  Palette,
  PenTool,
  Code2,
} from "lucide-react";
import { DEFAULT_TEMPLATE_DOKUMEN_JSON } from "@/lib/settings";
import { DokumenTemplateConfig } from "@/lib/export-doc";

const PLACEHOLDERS = [
  "{{nama_guru}}",
  "{{tanggal}}",
  "{{skor_total}}",
  "{{predikat}}",
  "{{kesimpulan}}",
  "{{saran}}",
  "{{tabel_aspek}}",
];

export default function AdminTemplateDokumenPage() {
  const [tpl, setTpl] = useState<DokumenTemplateConfig>(() =>
    JSON.parse(DEFAULT_TEMPLATE_DOKUMEN_JSON)
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/pengaturan");
      if (res.ok) {
        const data = await res.json();
        const raw = data.settings?.dokumen_template_json;
        if (raw) {
          try {
            setTpl(JSON.parse(raw));
          } catch {
            // ignore
          }
        }
      }
    })();
  }, []);

  const updateField = (key: keyof DokumenTemplateConfig, val: string) => {
    setTpl((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast("");
    try {
      const res = await fetch("/api/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            dokumen_template_json: JSON.stringify(tpl, null, 2),
          },
        }),
      });
      if (res.ok) {
        setToast(
          "Template Dokumen Export (PDF & Word) berhasil disimpan! Seluruh laporan yang diunduh akan mengikuti kop, warna, dan tanda tangan ini."
        );
        setTimeout(() => setToast(""), 4500);
      }
    } finally {
      setSaving(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Konfigurasi Template */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-sora-100 text-sora-700 text-xs font-bold">
                Kop, Warna & Tanda Tangan
              </span>
              <h3 className="font-display font-bold text-lg text-slate-900 mt-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sora-600" />
                Pengaturan Template Dokumen Export (PDF & Word)
              </h3>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              {saving ? "Menyimpan..." : "Simpan Template"}
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Instansi / Sekolah / Kampus (Baris Utama Kop)
              </label>
              <input
                type="text"
                value={tpl.namaInstansi}
                onChange={(e) => updateField("namaInstansi", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sub-Judul Unit Supervisi
              </label>
              <input
                type="text"
                value={tpl.subJudulInstansi}
                onChange={(e) =>
                  updateField("subJudulInstansi", e.target.value)
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Lengkap & Kontak Instansi
              </label>
              <input
                type="text"
                value={tpl.alamatInstansi}
                onChange={(e) => updateField("alamatInstansi", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-sora-600" />
                  Warna Utama Dokumen
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tpl.warnaUtama}
                    onChange={(e) => updateField("warnaUtama", e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tpl.warnaUtama}
                    onChange={(e) => updateField("warnaUtama", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-sakura-600" />
                  Warna Aksen Dokumen
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tpl.warnaAksen}
                    onChange={(e) => updateField("warnaAksen", e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tpl.warnaAksen}
                    onChange={(e) => updateField("warnaAksen", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <PenTool className="w-3.5 h-3.5 text-slate-500" />
                  Kota Tanda Tangan
                </label>
                <input
                  type="text"
                  value={tpl.kotaTandaTangan}
                  onChange={(e) =>
                    updateField("kotaTandaTangan", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Pejabat / Supervisor
                </label>
                <input
                  type="text"
                  value={tpl.namaSupervisor}
                  onChange={(e) =>
                    updateField("namaSupervisor", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP Supervisor
                </label>
                <input
                  type="text"
                  value={tpl.nipSupervisor}
                  onChange={(e) => updateField("nipSupervisor", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            {/* Placeholder & Isi Template (PRD Bagian 5.7) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-sora-600" />
                Placeholder yang Dikenali (Klik untuk menyisipkan)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {PLACEHOLDERS.map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() =>
                      updateField("isiTemplate", `${tpl.isiTemplate} ${ph}`)
                    }
                    className="px-2.5 py-1 rounded-lg bg-sora-50 border border-sora-200 text-sora-700 font-mono text-[11px] font-bold hover:bg-sora-100 transition"
                  >
                    {ph}
                  </button>
                ))}
              </div>
              <textarea
                rows={5}
                value={tpl.isiTemplate}
                onChange={(e) => updateField("isiTemplate", e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-mono leading-relaxed"
              />
            </div>
          </div>
        </form>

        {/* Pratinjau Visual Kertas A4 */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card sticky top-20">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-3">
              Pratinjau Kertas Laporan Supervisi
            </span>

            <div className="border border-slate-300 rounded-2xl p-5 bg-white shadow-inner text-xs space-y-3">
              <div
                className="h-2 rounded-full w-full"
                style={{ backgroundColor: tpl.warnaUtama }}
              />
              <div className="text-center border-b-2 pb-3" style={{ borderColor: tpl.warnaUtama }}>
                <p className="font-extrabold text-slate-900 text-xs uppercase">
                  {tpl.namaInstansi}
                </p>
                <p
                  className="font-bold text-[10px] mt-0.5"
                  style={{ color: tpl.warnaUtama }}
                >
                  {tpl.subJudulInstansi}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {tpl.alamatInstansi}
                </p>
              </div>

              <p className="text-center font-extrabold text-slate-900 text-xs pt-1">
                LAPORAN HASIL SUPERVISI AKADEMIK GURU
              </p>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Nama Guru:</span>
                  <strong>Aulia Rahmawati, S.Pd., Gr.</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Skor Akhir AI:</span>
                  <strong style={{ color: tpl.warnaAksen }}>
                    92 / 100 (Sangat Baik)
                  </strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-[11px] text-slate-700">
                  Grafik Capaian Aspek:
                </p>
                {[
                  { a: "Perencanaan", s: 94 },
                  { a: "Pelaksanaan", s: 90 },
                  { a: "Penguasaan IT", s: 96 },
                  { a: "Evaluasi", s: 88 },
                ].map((it) => (
                  <div key={it.a} className="flex items-center gap-2 text-[10px]">
                    <span className="w-24 text-slate-600 truncate">{it.a}</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${it.s}%`,
                          backgroundColor: tpl.warnaUtama,
                        }}
                      />
                    </div>
                    <span className="font-bold">{it.s}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between text-[10px] text-slate-700">
                <div>
                  <p>Guru yang Disupervisi,</p>
                  <p className="mt-8 font-bold underline">
                    Aulia Rahmawati, S.Pd., Gr.
                  </p>
                </div>
                <div className="text-right">
                  <p>
                    {tpl.kotaTandaTangan},{" "}
                    {new Date().toLocaleDateString("id-ID")}
                  </p>
                  <p>{tpl.jabatanSupervisor}</p>
                  <p className="mt-6 font-bold underline">
                    {tpl.namaSupervisor}
                  </p>
                  <p className="text-[9px] text-slate-500">
                    NIP. {tpl.nipSupervisor}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
