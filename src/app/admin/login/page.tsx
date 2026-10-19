"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          expectedRole: "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login gagal.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Gagal menghubungi server.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dekorasi Cahaya Pastel di Latar Gelap Control Room */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sora-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sakura-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <SenseiMascot size="md" mood="control" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-sora-500/40 text-sora-300 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-sakura-400" />
            Control Room Administrator (/admin/login)
          </div>
          <h1 className="font-display font-bold text-2xl text-white mt-2">
            Panel Kendali Sensei-AI
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Akses khusus Administrator & Supervisor untuk mengelola API, instrumen, dan seluruh data guru.
          </p>
        </div>

        <div className="bg-slate-900/90 backdrop-blur rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-2xl">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-700/70 text-rose-200 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Email atau NIP Administrator
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@sekolah.sch.id"
                className="w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-950/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sora-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Password Rahasia
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-950/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sora-400 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white font-bold text-sm shadow-lg hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {loading ? "Mengautentikasi..." : "Masuk ke Control Room Admin"}
            </button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-400 px-2">
          <Link href="/" className="hover:text-white font-semibold">
            ← Kembali ke Beranda
          </Link>
          <Link href="/login" className="hover:text-sora-300 font-semibold">
            Bukan Admin? Masuk Portal Guru →
          </Link>
        </div>
      </div>
    </div>
  );
}
