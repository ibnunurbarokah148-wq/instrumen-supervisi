"use client";

import React, { useRef, useState } from "react";
import {
  Download,
  Headphones,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { SenseiMascot } from "./SenseiMascot";

export interface TranscriptSegmentItem {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

interface PodcastPlayerProps {
  podcastId: string;
  hasilId: string;
  naskah: string;
  transkripSegmenJSON?: string;
  status: string; // "menunggu" | "memproses" | "selesai" | "gagal"
  durasi?: number;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function PodcastPlayer({
  podcastId,
  hasilId,
  naskah,
  transkripSegmenJSON,
  status,
  durasi = 36,
  errorMessage,
  onRetry,
}: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durasi || 36);
  const [speed, setSpeed] = useState<number>(1.0);
  const [audioLoadError, setAudioLoadError] = useState(false);

  const rawSegments: TranscriptSegmentItem[] = React.useMemo(() => {
    try {
      const parsed = JSON.parse(transkripSegmenJSON || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
    const lines = (naskah || "")
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    let t = 0;
    return lines.map((line) => {
      const d = Math.max(4, Math.round(line.split(/\s+/).length / 2.4));
      const seg = {
        start: t,
        end: t + d,
        speaker: "Sensei-AI",
        text: line.replace(/^Sensei-AI:\s*/i, ""),
      };
      t += d;
      return seg;
    });
  }, [transkripSegmenJSON, naskah]);

  // Skala waktu segmen transkrip mengikuti durasi riil file audio dari Fish Audio
  const segments: TranscriptSegmentItem[] = React.useMemo(() => {
    if (rawSegments.length === 0) return [];
    const rawTotal = rawSegments[rawSegments.length - 1].end || 1;
    const ratio = totalDuration > 0 ? totalDuration / rawTotal : 1;
    return rawSegments.map((seg) => ({
      ...seg,
      start: Number((seg.start * ratio).toFixed(1)),
      end: Number((seg.end * ratio).toFixed(1)),
    }));
  }, [rawSegments, totalDuration]);

  const activeIndex = segments.findIndex(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setAudioLoadError(false);
      audio.play().catch(() => {
        setAudioLoadError(true);
        setIsPlaying(false);
      });
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleSeek = (val: number) => {
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  };

  const audioUrl = `/api/podcast/audio/${podcastId || hasilId}`;

  if (status === "menunggu" || status === "memproses") {
    return (
      <div className="rounded-2xl border border-sora-200 bg-gradient-to-r from-sora-50 via-white to-sakura-50 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <SenseiMascot size="sm" mood="thinking" />
          <div className="flex-1">
            <h4 className="font-display font-semibold text-slate-800 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-sora-500 animate-spin" />
              Fish Audio TTS sedang merender suara podcast...
            </h4>
            <p className="text-sm text-slate-600 mt-0.5">
              Status job:{" "}
              <span className="font-semibold uppercase text-sora-600">
                {status}
              </span>
              . Halaman ini akan memperbarui otomatis saat file audio selesai dibuat.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "gagal" || audioLoadError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-display font-bold text-rose-800">
                Audio Podcast Fish Audio Belum Tersedia
              </h4>
              <p className="text-xs sm:text-sm text-rose-700 mt-0.5">
                {errorMessage ||
                  "File audio Fish Audio belum terbentuk. Pastikan Admin telah mengisi API Key Fish Audio & Reference Voice ID di menu Pengaturan API, lalu klik tombol di samping."}
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={() => {
                setAudioLoadError(false);
                onRetry();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Generate via Fish Audio
            </button>
          )}
        </div>

        {/* Tetap tampilkan transkrip naskah meskipun audio gagal */}
        {segments.length > 0 && (
          <div className="rounded-2xl bg-white/90 border border-rose-100 p-4 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-bold text-slate-500 uppercase">
              Transkrip Naskah Podcast AI:
            </p>
            {segments.map((seg, i) => (
              <p key={i} className="text-xs text-slate-700 leading-relaxed">
                <strong className="text-sora-700">{seg.speaker}:</strong>{" "}
                {seg.text}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-sora-200/80 bg-gradient-to-br from-sora-50/90 via-white to-sakura-50/80 p-5 sm:p-6 shadow-pastel">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (d && isFinite(d) && d > 0.5) setTotalDuration(d);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setAudioLoadError(true);
        }}
      />

      {/* Header Podcast */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <SenseiMascot size="sm" mood={isPlaying ? "cheer" : "happy"} />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sakura-100 text-sakura-700 text-xs font-bold">
              <Headphones className="w-3.5 h-3.5" />
              Podcast Evaluasi Sensei-AI • Fish Audio TTS
            </div>
            <h3 className="font-display font-bold text-slate-800 text-base sm:text-lg mt-0.5">
              Suara Refleksi & Saran Pengembangan Diri
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${audioUrl}?download=1`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-sora-200 text-sora-700 hover:bg-sora-50 text-xs font-bold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Audio Fish TTS
          </a>
        </div>
      </div>

      {/* Kontrol Pemutar Utama */}
      <div className="bg-white/90 backdrop-blur rounded-2xl p-4 border border-sora-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sora-500 to-sakura-500 text-white flex items-center justify-center shadow-md hover:opacity-95 active:scale-95 transition shrink-0"
            aria-label={isPlaying ? "Pause Podcast" : "Play Podcast"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span className="text-sora-700 font-bold">
                {formatTime(currentTime)}
              </span>
              <span className="truncate px-2 text-slate-600">
                {isPlaying
                  ? "🎵 Memutar audio Fish Audio TTS..."
                  : "Klik Putar untuk mendengarkan hasil suara Fish Audio"}
              </span>
              <span>{formatTime(totalDuration)}</span>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(1, totalDuration)}
              step={0.1}
              value={Math.min(currentTime, totalDuration)}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full accent-sakura-500 h-2 bg-sora-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Pilihan Kecepatan Putar */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[0.75, 1, 1.25, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSpeedChange(s)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                  speed === s
                    ? "bg-white text-sora-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Pilihan Kecepatan Mobile */}
        <div className="flex sm:hidden items-center justify-between mt-3 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            Kecepatan Putar:
          </span>
          <div className="flex items-center gap-1">
            {[0.75, 1, 1.25, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSpeedChange(s)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                  speed === s
                    ? "bg-sora-500 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transkrip Interaktif yang Tersorot Sesuai Waktu Putar (PRD Bagian 6.3) */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sakura-500" />
            Transkrip Tersinkronisasi Waktu (Klik kalimat untuk melompat)
          </span>
          <span className="text-xs text-slate-400">
            {segments.length} segmen suara
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-2xl bg-white/80 border border-sora-100 p-3 space-y-2">
          {segments.map((seg, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={idx}
                onClick={() => {
                  handleSeek(seg.start);
                  if (!isPlaying && audioRef.current) {
                    audioRef.current.play().catch(() => {
                      setAudioLoadError(true);
                    });
                  }
                }}
                className={`p-2.5 rounded-xl text-sm cursor-pointer transition-all border ${
                  isActive
                    ? "bg-gradient-to-r from-sora-100/90 to-sakura-100/70 border-sora-300 text-slate-900 font-semibold shadow-sm scale-[1.01]"
                    : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span
                    className={`font-bold ${
                      isActive ? "text-sakura-600" : "text-sora-600"
                    }`}
                  >
                    {seg.speaker}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {formatTime(seg.start)} - {formatTime(seg.end)}
                  </span>
                </div>
                <p className="leading-relaxed">{seg.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
