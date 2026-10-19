"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  GraduationCap,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function GuruLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form daftar mandiri
  const [regNama, setRegNama] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regNip, setRegNip] = useState("");
  const [regMapel, setRegMapel] = useState("");
  const [regWA, setRegWA] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          expectedRole: "guru",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk ke sistem.");
        setLoading(false);
        return;
      }
      router.push("/guru");
      router.refresh();
    } catch {
      setError("Gagal menghubungi server.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: regNama,
          email: regEmail,
          nip: regNip,
          mapel: regMapel,
          nomorWA: regWA,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mendaftar.");
        setLoading(false);
        return;
      }
      setSuccessMsg(data.message);
      setLoading(false);
      setRegNama("");
      setRegEmail("");
      setRegNip("");
      setRegMapel("");
      setRegWA("");
      setRegPassword("");
    } catch {
      setError("Gagal menghubungi server.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sora-50 via-white to-sakura-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Mascot Greeting Card */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-2">
            <SenseiMascot size="lg" mood="happy" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sora-100 text-sora-700 text-xs font-bold">
            <GraduationCap className="w-3.5 h-3.5" />
            Portal Khusus Guru (/login)
          </div>
          <h1 className="font-display font-extrabold text-2xl text-slate-900 mt-2">
            Okaerinasai, Sensei! 🌸
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Masuk untuk mengisi instrumen supervisi dan mendengarkan podcast evaluasi dari Sensei-AI.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur rounded-3xl border border-sora-200 shadow-pastel p-6 sm:p-7">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                tab === "login"
                  ? "bg-white text-sora-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Masuk Guru
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                tab === "register"
                  ? "bg-white text-sakura-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Daftar Mandiri
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email atau NIP Guru
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: aulia@sekolah.sch.id atau NIP"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-sm focus:outline-none focus:ring-2 focus:ring-sora-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-sm focus:outline-none focus:ring-2 focus:ring-sora-400 focus:bg-white transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white font-bold text-sm shadow-md hover:opacity-95 disabled:opacity-50 transition"
              >
                {loading ? "Sedang Memeriksa Sesi..." : "Masuk ke Dashboard Guru ✨"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={regNama}
                  onChange={(e) => setRegNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Sekolah
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="budi@sekolah.sch.id"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={regNip}
                    onChange={(e) => setRegNip(e.target.value)}
                    placeholder="1994..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={regMapel}
                    onChange={(e) => setRegMapel(e.target.value)}
                    placeholder="Contoh: Biologi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="text"
                    value={regWA}
                    onChange={(e) => setRegWA(e.target.value)}
                    placeholder="62812..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-sakura-500 hover:bg-sakura-600 text-white font-bold text-sm shadow-md transition"
              >
                {loading ? "Mengirim..." : "Ajukan Pendaftaran Guru"}
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                Sesuai ketentuan sistem, pendaftaran mandiri akan diverifikasi oleh Admin sebelum aktif.
              </p>
            </form>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-500 px-2">
          <Link href="/" className="hover:text-sora-600 font-semibold">
            ← Kembali ke Beranda
          </Link>
          <Link
            href="/admin/login"
            className="hover:text-slate-800 font-semibold"
          >
            Login sebagai Admin →
          </Link>
        </div>
      </div>
    </div>
  );
}
