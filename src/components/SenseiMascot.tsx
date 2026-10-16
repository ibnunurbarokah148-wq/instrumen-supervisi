"use client";

import React from "react";

interface SenseiMascotProps {
  size?: "sm" | "md" | "lg" | "xl";
  mood?: "happy" | "thinking" | "cheer" | "control";
  className?: string;
}

export function SenseiMascot({
  size = "md",
  mood = "happy",
  className = "",
}: SenseiMascotProps) {
  const dimensions = {
    sm: "w-11 h-11",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${dimensions} ${className}`}
      title="Sensei-AI • Agent Supervisor Pendidikan"
    >
      {/* Halo Sakura Pastel */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm animate-float"
      >
        {/* Lingkaran latar belakang pastel */}
        <circle cx="60" cy="62" r="52" fill="url(#bgGrad)" stroke="#bae3fd" strokeWidth="3" />

        {/* Halo Digital di atas kepala (gaya anime akademik) */}
        <ellipse
          cx="60"
          cy="11"
          rx="24"
          ry="5"
          stroke="#38b5f7"
          strokeWidth="2.5"
          strokeDasharray="6 3"
          fill="none"
        />
        <circle cx="84" cy="11" r="3" fill="#f43f80" />

        {/* Rambut Belakang Biru Langit (Sora) */}
        <path
          d="M24 58C24 32 39 20 60 20C81 20 96 32 96 58C96 76 91 92 84 99H36C29 92 24 76 24 58Z"
          fill="#38b5f7"
        />

        {/* Bahu / Jas Supervisor Putih-Biru */}
        <path
          d="M30 105C34 90 45 86 60 86C75 86 86 90 90 105"
          fill="#ffffff"
          stroke="#027cc6"
          strokeWidth="2.5"
        />
        {/* Pita / Dasi Sakura */}
        <path d="M54 88L60 95L66 88L60 103Z" fill="#f43f80" />

        {/* Wajah */}
        <path
          d="M36 56C36 41 46 33 60 33C74 33 84 41 84 56C84 72 73 83 60 83C47 83 36 72 36 56Z"
          fill="#fff5f0"
        />

        {/* Pipi Merona Sakura */}
        <ellipse cx="44" cy="64" rx="4.5" ry="2.5" fill="#fda4c2" opacity="0.75" />
        <ellipse cx="76" cy="64" rx="4.5" ry="2.5" fill="#fda4c2" opacity="0.75" />

        {/* Mata sesuai mood */}
        {mood === "thinking" ? (
          <>
            <circle cx="48" cy="56" r="4.2" fill="#0c466e" />
            <circle cx="49.5" cy="54.5" r="1.5" fill="#ffffff" />
            <path
              d="M67 56C69 53 74 53 76 56"
              stroke="#0c466e"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </>
        ) : mood === "cheer" ? (
          <>
            <path
              d="M43 56C45 52 50 52 52 56"
              stroke="#0c466e"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path
              d="M68 56C70 52 75 52 77 56"
              stroke="#0c466e"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <ellipse cx="48" cy="56" rx="4.2" ry="5" fill="#0c466e" />
            <circle cx="49.5" cy="54" r="1.7" fill="#ffffff" />
            <circle cx="47" cy="58" r="0.9" fill="#38b5f7" />

            <ellipse cx="72" cy="56" rx="4.2" ry="5" fill="#0c466e" />
            <circle cx="73.5" cy="54" r="1.7" fill="#ffffff" />
            <circle cx="71" cy="58" r="0.9" fill="#38b5f7" />
          </>
        )}

        {/* Kacamata Sensei Tipis */}
        <rect
          x="40"
          y="50"
          width="16"
          height="11"
          rx="4"
          stroke="#027cc6"
          strokeWidth="1.6"
          fill="none"
          opacity="0.75"
        />
        <rect
          x="64"
          y="50"
          width="16"
          height="11"
          rx="4"
          stroke="#027cc6"
          strokeWidth="1.6"
          fill="none"
          opacity="0.75"
        />
        <line x1="56" y1="55" x2="64" y2="55" stroke="#027cc6" strokeWidth="1.6" />

        {/* Senyum */}
        {mood === "thinking" ? (
          <circle cx="60" cy="69" r="2.3" fill="#e11d67" />
        ) : (
          <path
            d="M55 67C57 71 63 71 65 67"
            stroke="#e11d67"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        )}

        {/* Poni Rambut Depan */}
        <path
          d="M32 50C34 32 46 24 60 24C74 24 86 32 88 50C82 40 76 37 70 44C66 36 56 35 51 44C45 37 37 40 32 50Z"
          fill="#7dcefb"
          stroke="#0e9ce8"
          strokeWidth="1.5"
        />

        {/* Jepit Bunga Sakura di Rambut */}
        <circle cx="81" cy="38" r="6" fill="#fb71a1" />
        <circle cx="81" cy="38" r="2.2" fill="#fff1f5" />

        <defs>
          <linearGradient id="bgGrad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e0f1fe" />
            <stop offset="0.6" stopColor="#ffffff" />
            <stop offset="1" stopColor="#ffe4ec" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
