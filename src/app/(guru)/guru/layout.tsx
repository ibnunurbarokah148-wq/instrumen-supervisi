"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  FileEdit,
  Award,
  History,
  UserCircle,
  FolderCheck,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { SenseiMascot } from "@/components/SenseiMascot";
import { RoleSwitcher } from "@/components/RoleSwitcher";

interface CurrentUser {
  id: string;
  nama: string;
  role: string;
  jabatan?: string | null;
  unitKerja?: string | null;
}

const NAV_ITEMS = [
  { href: "/guru", label: "Beranda", icon: Home },
  { href: "/guru/perangkat", label: "Perangkat", icon: FolderCheck },
  { href: "/guru/isi", label: "Instrumen", icon: FileEdit },
  { href: "/guru/hasil", label: "Hasil", icon: Award },
  { href: "/guru/riwayat", label: "Riwayat", icon: History },
  { href: "/guru/profil", label: "Profil", icon: UserCircle },
];

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
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
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-8">
      {/* Header Utama Portal Pendidik SIPENA */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <Link href="/guru" className="flex items-center gap-2.5 group">
            <SenseiMascot size="sm" mood="happy" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-sm sm:text-base text-slate-900">
                  SIPENA — Portal Pendidik
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  Resmi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {user
                  ? `${user.nama} • ${user.jabatan || "Guru Mata Pelajaran"}`
                  : "Sistem Informasi Supervisi & Evaluasi Akademik"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <RoleSwitcher currentRole={user?.role || "guru"} />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-bold text-slate-600 hover:text-rose-700 transition"
              title="Keluar dari akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Role Switcher Bar untuk layar mobile / tablet */}
        <div className="md:hidden border-t border-slate-100 px-3 py-1.5 bg-slate-50/80 flex justify-center">
          <RoleSwitcher currentRole={user?.role || "guru"} />
        </div>

        {/* Desktop Sub-Navbar */}
        <nav className="hidden sm:block border-t border-slate-100 bg-white">
          <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 py-1.5 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/guru"
                  ? pathname === "/guru"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

      {/* Bottom Tab Navigation (Mobile) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/guru"
              ? pathname === "/guru"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition ${
                active
                  ? "text-blue-700 bg-blue-50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-blue-600" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
