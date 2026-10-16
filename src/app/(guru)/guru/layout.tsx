"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  Home,
  ClipboardEdit,
  Award,
  History,
  UserCircle,
  LogOut,
  Sparkles,
} from "lucide-react";

const GURU_NAV = [
  { href: "/guru", label: "Beranda", icon: Home },
  { href: "/guru/isi", label: "Isi", icon: ClipboardEdit },
  { href: "/guru/hasil", label: "Hasil", icon: Award },
  { href: "/guru/riwayat", label: "Riwayat", icon: History },
  { href: "/guru/profil", label: "Profil", icon: UserCircle },
];

export default function GuruDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sora-50/90 via-white to-sakura-50/80 pb-24">
      {/* Topbar Ramah Guru */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-sora-100 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/guru" className="flex items-center gap-2.5">
            <SenseiMascot size="sm" mood="happy" />
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-sakura-600">
                <Sparkles className="w-2.5 h-2.5" />
                Ruang Refleksi Guru
              </span>
              <h1 className="font-display font-bold text-sm sm:text-base text-slate-900 leading-none">
                Sensei-AI Supervisor
              </h1>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Konten Utama Mobile-First */}
      <main className="max-w-3xl mx-auto px-4 pt-5">{children}</main>

      {/* Navigasi Bawah Mobile-First (PRD Bagian 12: Beranda, Isi, Hasil, Riwayat, Profil) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-sora-200/80 shadow-pastel">
        <div className="max-w-lg mx-auto grid grid-cols-5 px-2 py-1.5">
          {GURU_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/guru"
                ? pathname === "/guru"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                  isActive
                    ? "text-sakura-600 font-extrabold bg-sakura-50/80"
                    : "text-slate-500 hover:text-sora-600 font-semibold"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-sakura-500 scale-110" : "text-slate-400"
                  } transition-transform`}
                />
                <span className="text-[11px] mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
