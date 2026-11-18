"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ShieldCheck,
  Eye,
  Settings,
  Repeat,
} from "lucide-react";

type RoleKey = "guru" | "kepala_sekolah" | "pengawas" | "admin";

const ROLES: {
  key: RoleKey;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "guru", label: "Guru", short: "Guru", icon: GraduationCap },
  {
    key: "kepala_sekolah",
    label: "Kepala Sekolah",
    short: "Kepsek",
    icon: ShieldCheck,
  },
  {
    key: "pengawas",
    label: "Pengawas Sekolah",
    short: "Pengawas",
    icon: Eye,
  },
  { key: "admin", label: "Admin Sistem", short: "Admin", icon: Settings },
];

export function RoleSwitcher({
  currentRole,
  dark = false,
}: {
  currentRole?: string;
  dark?: boolean;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitch = async (role: RoleKey) => {
    setSwitching(role);
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok && data.redirectTo) {
        router.push(data.redirectTo);
        router.refresh();
      }
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border text-[11px] font-bold ${
        dark
          ? "bg-slate-800/90 border-slate-700 text-slate-300"
          : "bg-slate-100 border-slate-200 text-slate-600"
      }`}
      title="Peralihan Cepat 4 Peran (Mode Presentasi & Demo SIPENA)"
    >
      <span className="hidden xl:inline-flex items-center gap-1 px-2 text-[10px] uppercase tracking-wider opacity-75">
        <Repeat className="w-3 h-3" />
        Demo Peran:
      </span>
      {ROLES.map((r) => {
        const Icon = r.icon;
        const active = currentRole === r.key;
        const isBusy = switching === r.key;
        return (
          <button
            key={r.key}
            type="button"
            disabled={switching !== null}
            onClick={() => handleSwitch(r.key)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
              active
                ? "bg-blue-600 text-white shadow-xs"
                : dark
                ? "hover:bg-slate-700 text-slate-300"
                : "hover:bg-white text-slate-600 hover:text-slate-900"
            } disabled:opacity-60`}
          >
            <Icon className="w-3 h-3" />
            <span>{isBusy ? "..." : r.short}</span>
          </button>
        );
      })}
    </div>
  );
}
