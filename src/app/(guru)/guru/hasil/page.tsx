"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SenseiMascot } from "@/components/SenseiMascot";
import { ArrowRight } from "lucide-react";

export default function GuruHasilIndexPage() {
  const router = useRouter();
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/guru/dashboard");
      if (res.ok) {
        const data = await res.json();
        if (data.hasilTerakhir?.penugasanId) {
          router.replace(`/guru/hasil/${data.hasilTerakhir.penugasanId}`);
        } else {
          setEmpty(true);
        }
      } else {
        setEmpty(true);
      }
    })();
  }, [router]);

  if (!empty) {
    return (
      <div className="p-12 text-center">
        <SenseiMascot size="lg" mood="thinking" className="mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">
          Membuka laporan hasil supervisi terbaru Anda...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-sora-200 p-8 text-center shadow-pastel space-y-4">
      <SenseiMascot size="xl" mood="happy" className="mx-auto" />
      <h2 className="font-display font-bold text-xl text-slate-900">
        Belum Ada Hasil Supervisi yang Selesai
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
        Silakan isi dan kirim instrumen supervisi terlebih dahulu agar Sensei-AI dapat mengevaluasi dan membuatkan podcast untuk Anda.
      </p>
      <Link
        href="/guru/isi"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white text-xs font-bold shadow-md"
      >
        Mulai Isi Instrumen
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
