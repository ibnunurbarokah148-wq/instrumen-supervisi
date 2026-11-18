"use client";

import React from "react";

interface SenseiMascotProps {
  size?: "sm" | "md" | "lg" | "xl";
  mood?: "happy" | "thinking" | "cheer" | "control";
  className?: string;
}

/**
 * Emblem Institusi Formal SIPENA — Sistem Informasi Supervisi & Evaluasi Akademik.
 * Menggantikan maskot anime sebelumnya dengan lencana akademik resmi Kemendikbudristek.
 */
export function SenseiMascot({
  size = "md",
  mood = "happy",
  className = "",
}: SenseiMascotProps) {
  const dimensions = {
    sm: "w-11 h-11",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-28 h-28",
  }[size];

  const badgeTitle =
    mood === "thinking"
      ? "Asisten AI Co-Evaluator • Analisis Instrumen Supervisi"
      : mood === "control"
      ? "Panel Kontrol Kepala Sekolah & Pengawas Pembina"
      : "SIPENA • Sistem Informasi Supervisi & Evaluasi Akademik";

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${dimensions} ${className}`}
      title={badgeTitle}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          <linearGradient id="sipenaShieldBg" x1="12" y1="8" x2="108" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f294a" />
            <stop offset="55%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="sipenaGold" x1="30" y1="20" x2="90" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Perisai Akademik Luar */}
        <path
          d="M60 8L102 22V56C102 82.5 84.5 103.5 60 112C35.5 103.5 18 82.5 18 56V22L60 8Z"
          fill="url(#sipenaShieldBg)"
          stroke="#e0f2fe"
          strokeWidth="3"
        />

        {/* Bingkai Dalam Halus */}
        <path
          d="M60 15L95 26.8V56C95 78.6 80.2 96.8 60 104.2C39.8 96.8 25 78.6 25 56V26.8L60 15Z"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
        />

        {/* Buku Terbuka (Simbol Akademik & Kurikulum) */}
        <path
          d="M36 47C36 44.8 37.8 43 40 43H58V78H41C38.2 78 36 75.8 36 73V47Z"
          fill="#ffffff"
          fillOpacity="0.95"
        />
        <path
          d="M84 47C84 44.8 82.2 43 80 43H62V78H79C81.8 78 84 75.8 84 73V47Z"
          fill="#e0f2fe"
        />
        <line x1="60" y1="43" x2="60" y2="79" stroke="#1e3a8a" strokeWidth="2.2" />

        {/* Garis Teks Simbolik pada Buku */}
        <line x1="42" y1="52" x2="53" y2="52" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="42" y1="59" x2="53" y2="59" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <line x1="42" y1="66" x2="51" y2="66" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />

        {/* Centang Verifikasi Supervisi */}
        <path
          d="M67 60L72 65L80 54"
          stroke="#059669"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bintang Kecerdasan Artifisial di Atas Buku */}
        <path
          d="M60 22L63.2 29.8L71 33L63.2 36.2L60 44L56.8 36.2L49 33L56.8 29.8L60 22Z"
          fill="url(#sipenaGold)"
        />

        {/* Pita Status */}
        <rect x="37" y="83" width="46" height="12" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="1" />
        <text
          x="60"
          y="91.5"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="7.5"
          fontWeight="bold"
          fontFamily="sans-serif"
          letterSpacing="0.8"
        >
          SIPENA
        </text>
      </svg>
    </div>
  );
}
