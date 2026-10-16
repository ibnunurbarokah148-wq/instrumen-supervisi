"use client";

import React, { useEffect, useState } from "react";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  UserCircle,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";

const AVATAR_PRESETS = [
  "🌸 Sensei Sakura",
  "⚡ Sensei Sora",
  "📚 Sensei Akademia",
  "✨ Sensei Inovator",
];

export default function GuruProfilPage() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [nip, setNip] = useState("");
  const [mapel, setMapel] = useState("");
  const [nomorWA, setNomorWA] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [badges, setBadges] = useState<string[]>([]);

  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        const u = data.user;
        if (u) {
          setNama(u.nama || "");
          setEmail(u.email || "");
          setNip(u.nip || "");
          setMapel(u.mapel || "");
          setNomorWA(u.nomorWA || "");
          setFotoUrl(u.fotoUrl || AVATAR_PRESETS[0]);
          try {
            setBadges(JSON.parse(u.badgesJSON || "[]"));
          } catch {
            setBadges([]);
          }
        }
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/guru/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          nip,
          mapel,
          nomorWA,
          fotoUrl,
          passwordLama: passwordLama || undefined,
          passwordBaru: passwordBaru || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: "ok", msg: data.message });
        setPasswordLama("");
        setPasswordBaru("");
      } else {
        setToast({ type: "err", msg: data.error || "Gagal menyimpan profil." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {toast && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 ${
            toast.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Kartu Identitas & Avatar Guru */}
      <div className="bg-white rounded-3xl border border-sora-200 p-6 shadow-pastel space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-100 pb-5">
          <SenseiMascot size="lg" mood="happy" />
          <div className="text-center sm:text-left">
            <span className="px-2.5 py-0.5 rounded-full bg-sora-100 text-sora-700 text-xs font-bold">
              Profil Akun Guru
            </span>
            <h2 className="font-display font-extrabold text-xl text-slate-900 mt-1">
              {nama || "Sensei"}
            </h2>
            <p className="text-xs text-slate-500">{email}</p>
            {badges.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
                {badges.map((b, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-lg bg-sakura-50 border border-sakura-200 text-sakura-700 text-[11px] font-bold"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pilihan Badge / Avatar Tampilan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Gaya Avatar / Gelar Tampilan Sensei
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AVATAR_PRESETS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => setFotoUrl(av)}
                className={`py-2 px-3 rounded-2xl border text-xs font-bold transition ${
                  fotoUrl === av
                    ? "bg-sora-500 border-sora-500 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-sora-50"
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <UserCircle className="w-3.5 h-3.5 text-sora-600" />
              Nama Tampilan & Gelar
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              NIP Guru
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mata Pelajaran Diampu
            </label>
            <input
              type="text"
              value={mapel}
              onChange={(e) => setMapel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nomor WhatsApp (Untuk Pengiriman Podcast Shiroko)
            </label>
            <input
              type="text"
              value={nomorWA}
              onChange={(e) => setNomorWA(e.target.value)}
              placeholder="62812..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Kartu Ubah Password */}
      <div className="bg-white rounded-3xl border border-sora-200 p-6 shadow-card space-y-4">
        <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-sakura-500" />
          Ubah Password Akun (Opsional)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password Lama
            </label>
            <input
              type="password"
              value={passwordLama}
              onChange={(e) => setPasswordLama(e.target.value)}
              placeholder="Kosongkan jika tidak mengubah password"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password Baru
            </label>
            <input
              type="password"
              value={passwordBaru}
              onChange={(e) => setPasswordBaru(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white text-xs sm:text-sm font-bold shadow-md hover:opacity-95 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Perubahan Profil"}
          </button>
        </div>
      </div>
    </form>
  );
}
