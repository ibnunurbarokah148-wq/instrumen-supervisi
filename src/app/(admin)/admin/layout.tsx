"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SenseiMascot } from "@/components/SenseiMascot";
import { RoleSwitcher } from "@/components/RoleSwitcher";
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
  ShieldCheck,
  BookOpen,
} from "lucide-react";

interface CurrentUser {
  id: string;
  nama: string;
  role: string;
  jabatan?: string | null;
}

const ADMIN_NAV = [
  { href: "/admin", label: "Beranda Eksekutif", icon: LayoutDashboard },
  { href: "/admin/hasil", label: "Penilaian, Pengesahan & RTL", icon: BarChart3 },
  {
    href: "/admin/perangkat",
    label: "Verifikasi Perangkat Ajar",
    icon: BookOpen,
  },
  { href: "/admin/instrumen", label: "Editor Instrumen", icon: FileEdit },
  { href: "/admin/guru", label: "Manajemen Pengguna", icon: Users },
  { href: "/admin/penilaian-ai", label: "Rubrik & Prompt AI", icon: Bot },
  { href: "/admin/template-dokumen", label: "Kop & Format Laporan", icon: FileText },
  { href: "/admin/pengaturan-api", label: "Pengaturan AI & Bot WA", icon: KeyRound },
  { href: "/admin/log", label: "Log & Audit Keamanan", icon: ShieldAlert },
];

function getRoleDisplay(role?: string) {
  if (role === "kepala_sekolah") return "Kepala Sekolah";
  if (role === "pengawas") return "Pengawas Sekolah";
  return "Administrator";
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {});
  }, [pathname]);

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

      {/* Sidebar Kiri */}
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
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase tracking-wider">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Panel Pimpinan
                </div>
                <h1 className="font-display font-bold text-base text-slate-900 leading-tight mt-0.5">
                  SIPENA Supervisor
                </h1>
                <p className="text-[11px] text-slate-500">
                  {getRoleDisplay(user?.role)}
                </p>
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
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
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

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center gap-3">
            <SenseiMascot size="sm" mood="happy" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user?.nama || "Pimpinan & Admin"}
              </p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Peran:{" "}
                <span className="font-bold text-blue-700">
                  {getRoleDisplay(user?.role).toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 text-xs font-bold transition"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Panel Kendali
          </button>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
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
                )?.label || "Panel Kendali Supervisi SIPENA"}
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block">
                SIPENA — Sistem Informasi Supervisi & Evaluasi Akademik (AI Co-Evaluator & Bot WA)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <RoleSwitcher currentRole={user?.role} />
            <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SIPENA Aktif
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-8 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
