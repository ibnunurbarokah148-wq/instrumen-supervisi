"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SenseiMascot } from "@/components/SenseiMascot";
import {
  LayoutDashboard,
  KeyRound,
  FileEdit,
  Users,
  BarChart3,
  Bot,
  FileText,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Beranda", icon: LayoutDashboard },
  { href: "/admin/pengaturan-api", label: "Pengaturan API", icon: KeyRound },
  { href: "/admin/instrumen", label: "Editor Pertanyaan", icon: FileEdit },
  { href: "/admin/guru", label: "Manajemen Guru", icon: Users },
  { href: "/admin/hasil", label: "Hasil & Grafik", icon: BarChart3 },
  { href: "/admin/penilaian-ai", label: "Pengaturan Penilaian AI", icon: Bot },
  { href: "/admin/template-dokumen", label: "Template Dokumen", icon: FileText },
  { href: "/admin/log", label: "Log & Keamanan", icon: ShieldAlert },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex">
      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Sidebar Kiri Lebar (Control Room Pastel-Netral sesuai PRD 12) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SenseiMascot size="sm" mood="control" />
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sora-100 text-sora-700 text-[10px] font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5 text-sakura-500" />
                  Control Room
                </div>
                <h1 className="font-display font-bold text-base text-slate-900 leading-tight mt-0.5">
                  Agent Supervisor
                </h1>
                <p className="text-[11px] text-slate-500">Panel Administrator</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Navigasi */}
          <nav className="p-3.5 space-y-1">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-sora-500 to-sora-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-sora-50/80 hover:text-sora-700"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar dengan Maskot Kecil di Pojok (PRD Bagian 12) */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="rounded-2xl bg-gradient-to-r from-sora-50 via-white to-sakura-50 border border-sora-200/70 p-3 flex items-center gap-3">
            <SenseiMascot size="sm" mood="happy" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                Sensei-AI Core v2
              </p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Role: <span className="font-bold text-sakura-600">ADMIN</span> • Terisolasi dari Guru
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 text-xs font-bold transition"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Panel Admin
          </button>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Mobile/Tablet */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-display font-bold text-slate-900 text-base sm:text-lg">
                {ADMIN_NAV.find((n) =>
                  n.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(n.href)
                )?.label || "Dashboard Admin"}
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block">
                Sistem Manajemen Supervisi Akademik Berbasis AI & Fish Audio Podcast
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sora-50 border border-sora-200 text-sora-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sensei-AI Online
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-8 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
