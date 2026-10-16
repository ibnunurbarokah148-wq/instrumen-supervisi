"use client";

import React, { useEffect, useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Play,
  Volume2,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Shield,
  Search,
  Sparkles,
  Radio,
  X,
} from "lucide-react";

const AI_PROVIDER_TEMPLATES = [
  {
    id: "gpt",
    label: "GPT (OpenAI)",
    badge: "Official",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "o3-mini"],
    keyPlaceholder: "sk-proj-...",
    desc: "Endpoint resmi OpenAI Platform.",
  },
  {
    id: "claude",
    label: "Claude (Anthropic)",
    badge: "Official",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-latest",
    models: [
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
      "claude-3-7-sonnet-latest",
    ],
    keyPlaceholder: "sk-ant-...",
    desc: "Endpoint OpenAI-compatible resmi Anthropic Claude.",
  },
  {
    id: "gemini",
    label: "Gemini (Google)",
    badge: "Official",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ],
    keyPlaceholder: "AIzaSy...",
    desc: "Endpoint OpenAI-compatible dari Google AI Studio (Gemini API).",
  },
  {
    id: "grok",
    label: "Grok (xAI)",
    badge: "Official",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    models: ["grok-2-latest", "grok-3-mini-beta", "grok-3-beta"],
    keyPlaceholder: "xai-...",
    desc: "Endpoint OpenAI-compatible resmi xAI Grok.",
  },
  {
    id: "ollama",
    label: "Ollama (Lokal)",
    badge: "Gratis / Lokal",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    models: ["llama3.2", "qwen2.5:7b", "deepseek-r1:8b", "mistral", "gemma2"],
    keyPlaceholder: "ollama (Bebas / Tidak butuh key berbayar)",
    desc: "Jalankan AI secara lokal di komputer/server sendiri via Ollama tanpa biaya API.",
  },
  {
    id: "custom",
    label: "Custom Provider",
    badge: "Multi-Aggregator",
    baseUrl: "https://api.unorouter.com/v1",
    defaultModel: "gemini-3.5-flash",
    models: [
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite:free",
      "gemini-3.6-flash:free",
      "gpt-4o-mini",
      "deepseek-chat",
    ],
    keyPlaceholder: "sk-... (API Key Provider Custom)",
    desc: "Gunakan UnoRouter (Auto-Sync Harga), OpenRouter, xKiro, Groq, DeepSeek, atau endpoint custom lainnya.",
  },
] as const;

const CUSTOM_SUB_PRESETS = [
  {
    name: "UnoRouter (Auto-Pricing)",
    baseUrl: "https://api.unorouter.com/v1",
    defaultModel: "gemini-3.5-flash",
    models: [
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite:free",
      "gemini-3.6-flash:free",
      "gemini-3.8-flash",
      "glm-5.3-flash:free",
    ],
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.5-flash",
    models: [
      "google/gemini-2.5-flash",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "deepseek/deepseek-chat:free",
    ],
  },
  {
    name: "xKiro",
    baseUrl: "https://api.xkiro.com/v1",
    defaultModel: "google/gemini-3.6-flash",
    models: [
      "google/gemini-3.6-flash",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
    ],
  },
  {
    name: "Groq Cloud",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen-qwq-32b",
    ],
  },
  {
    name: "DeepSeek Official",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
];

function detectProviderId(baseUrl: string): string {
  const url = (baseUrl || "").toLowerCase().trim();
  if (url.includes("api.openai.com")) return "gpt";
  if (url.includes("api.anthropic.com")) return "claude";
  if (url.includes("generativelanguage.googleapis.com")) return "gemini";
  if (url.includes("api.x.ai")) return "grok";
  if (url.includes("localhost:11434") || url.includes("127.0.0.1:11434"))
    return "ollama";
  return "custom";
}

export default function AdminPengaturanApiPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hasSecret, setHasSecret] = useState<Record<string, boolean>>({});
  const [selectedProvider, setSelectedProvider] = useState<string>("gpt");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  // Toggle visibilitas field rahasia
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showFishKey, setShowFishKey] = useState(false);
  const [showShirokoSecret, setShowShirokoSecret] = useState(false);

  // State pengujian & streaming
  const [testingOpenAi, setTestingOpenAi] = useState(false);
  const [isStreamingAi, setIsStreamingAi] = useState(false);
  const [openAiResult, setOpenAiResult] = useState<string>("");

  // State pencarian & penarikan semua model dari provider
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<
    {
      id: string;
      name?: string;
      description?: string;
      contextLength?: number;
      isFree?: boolean;
      pricingSummary?: string;
    }[]
  >([]);
  const [modelSearch, setModelSearch] = useState("");
  const [showModelModal, setShowModelModal] = useState(false);
  const [modelFetchMsg, setModelFetchMsg] = useState("");

  const [sampleText, setSampleText] = useState(
    "Ohayou gozaimasu, Sensei! Ini adalah uji suara podcast Sensei-AI melalui integrasi Fish Audio."
  );
  const [testingFish, setTestingFish] = useState(false);
  const [fishAudioUrl, setFishAudioUrl] = useState<string>("");
  const [fishResultMsg, setFishResultMsg] = useState<string>("");

  const [testingShiroko, setTestingShiroko] = useState(false);
  const [shirokoResult, setShirokoResult] = useState<string>("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pengaturan");
      if (res.ok) {
        const data = await res.json();
        const loaded = data.settings || {};
        setSettings(loaded);
        setHasSecret(data.hasSecret || {});
        setSelectedProvider(detectProviderId(loaded.openai_base_url || ""));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    if (key === "openai_base_url") {
      setSelectedProvider(detectProviderId(val));
    }
  };

  const handleSelectProviderTemplate = (
    template: (typeof AI_PROVIDER_TEMPLATES)[number]
  ) => {
    setSelectedProvider(template.id);
    setFetchedModels([]);
    setModelFetchMsg("");
    setSettings((prev) => {
      const next: Record<string, string> = {
        ...prev,
        openai_base_url: template.baseUrl,
        openai_model: template.defaultModel,
      };
      if (template.id === "ollama" && !prev.openai_api_key) {
        next.openai_api_key = "ollama";
      }
      return next;
    });
  };

  const handleSelectCustomSubPreset = (
    sub: (typeof CUSTOM_SUB_PRESETS)[number]
  ) => {
    setSelectedProvider("custom");
    setFetchedModels([]);
    setModelFetchMsg("");
    setSettings((prev) => ({
      ...prev,
      openai_base_url: sub.baseUrl,
      openai_model: sub.defaultModel,
    }));
  };

  const activeTemplate =
    AI_PROVIDER_TEMPLATES.find((t) => t.id === selectedProvider) ||
    AI_PROVIDER_TEMPLATES[5];

  const activeCustomSub = CUSTOM_SUB_PRESETS.find((s) =>
    (settings.openai_base_url || "")
      .toLowerCase()
      .includes(new URL(s.baseUrl).hostname.toLowerCase())
  );

  const recommendedModels =
    selectedProvider === "custom" && activeCustomSub
      ? activeCustomSub.models
      : activeTemplate.models;

  const isUnoRouterActive = (settings.openai_base_url || "")
    .toLowerCase()
    .includes("unorouter.com");

  // Handler untuk menarik SEMUA model dari provider (dengan auto-filter text-only untuk OpenRouter & UnoRouter)
  const handleFetchAllModels = async () => {
    setFetchingModels(true);
    setModelFetchMsg("");
    try {
      const res = await fetch("/api/admin/pengaturan/fetch-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: settings.openai_base_url,
          apiKey: settings.openai_api_key,
          providerId: selectedProvider,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.models)) {
        setFetchedModels(data.models);
        setShowModelModal(true);
        if (data.provider === "openrouter" || data.provider === "unorouter") {
          setModelFetchMsg(
            `✅ Berhasil menarik ${data.models.length} model (Khusus disaring AI Generate Text saja).`
          );
        } else {
          setModelFetchMsg(`✅ Ditemukan ${data.models.length} model dari provider.`);
        }
      } else {
        setModelFetchMsg(`❌ ${data.error || "Gagal menarik daftar model."}`);
      }
    } catch {
      setModelFetchMsg("❌ Gagal menghubungi server saat menarik model.");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setHasSecret(data.hasSecret);
        setToast({ type: "ok", msg: data.message });
      } else {
        setToast({ type: "err", msg: data.error || "Gagal menyimpan." });
      }
    } catch {
      setToast({ type: "err", msg: "Gagal menghubungi server." });
    } finally {
      setSaving(false);
    }
  };

  // Uji koneksi AI dengan dukungan STREAMING token-by-token
  const handleTestOpenAI = async () => {
    setTestingOpenAi(true);
    setIsStreamingAi(true);
    setOpenAiResult("");
    const startTime = Date.now();

    try {
      const res = await fetch("/api/admin/pengaturan/test-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: settings.openai_base_url,
          apiKey: settings.openai_api_key,
          model: settings.openai_model,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setOpenAiResult(`❌ ${errJson.error || "Koneksi ke AI gagal."}`);
        return;
      }

      if (!res.body) {
        setOpenAiResult("❌ Browser tidak mendukung streaming response.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setOpenAiResult(accumulated);
      }

      const elapsed = Date.now() - startTime;
      setOpenAiResult(
        (prev) => `⚡ [Streaming Selesai - ${elapsed}ms]\n${prev}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOpenAiResult(`❌ Gagal streaming: ${msg}`);
    } finally {
      setTestingOpenAi(false);
      setIsStreamingAi(false);
    }
  };

  const handleTestFish = async () => {
    setTestingFish(true);
    setFishResultMsg("");
    setFishAudioUrl("");
    try {
      const res = await fetch("/api/admin/pengaturan/test-fish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sampleText,
          apiKey: settings.fish_api_key,
          voiceId: settings.fish_voice_id,
          model: settings.fish_model,
          speed: settings.fish_speed,
          temperature: settings.fish_temperature,
          topP: settings.fish_top_p,
          normalize: settings.fish_normalize !== "false",
          chunkLength: settings.fish_chunk_length,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFishResultMsg(`✅ ${data.message}`);
        setFishAudioUrl(data.audioDataUrl || "");
      } else {
        setFishResultMsg(`❌ ${data.error}`);
      }
    } finally {
      setTestingFish(false);
    }
  };

  const handleTestShiroko = async () => {
    setTestingShiroko(true);
    setShirokoResult("");
    try {
      const res = await fetch("/api/admin/pengaturan/test-shiroko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: settings.shiroko_url,
          secret: settings.shiroko_secret,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShirokoResult(`✅ ${data.message}`);
      } else {
        setShirokoResult(`❌ ${data.error}`);
      }
    } finally {
      setTestingShiroko(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-7 h-7 text-sora-500 animate-spin mx-auto mb-2" />
        <p className="text-sm text-slate-500">Memuat pengaturan API...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl">
      {/* Banner Keamanan AES */}
      <div className="rounded-3xl bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sora-500/20 border border-sora-400/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-sora-300" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base">
              Brankas Konfigurasi API (Terenkripsi AES-256)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Semua API Key disimpan terenkripsi di database, disamarkan (masked), dan tidak pernah dikirim ke sisi frontend Guru.
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sora-500 to-sakura-500 text-white font-bold text-xs shadow-lg hover:opacity-95 transition shrink-0"
        >
          <Save className="w-4 h-4" />
          {saving ? "Menyimpan..." : "Simpan Semua Pengaturan"}
        </button>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
            toast.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          {toast.msg}
        </div>
      )}

      {/* 1. OpenAI-Compatible */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-sora-100 text-sora-700 text-xs font-bold">
              AI Evaluator
            </span>
            <h3 className="font-display font-bold text-lg text-slate-900 mt-1">
              1. Konfigurasi AI Provider & Endpoint
            </h3>
            <p className="text-xs text-slate-500">
              Pilih template siap pakai (GPT, Claude, Gemini, Grok, Ollama Lokal) atau gunakan Custom Provider seperti UnoRouter.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestOpenAI}
            disabled={testingOpenAi}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sora-50 border border-sora-200 text-sora-700 hover:bg-sora-100 text-xs font-bold transition shadow-sm"
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isStreamingAi ? "animate-pulse text-emerald-600" : ""
              }`}
            />
            {testingOpenAi
              ? isStreamingAi
                ? "Streaming Respons AI..."
                : "Menguji..."
              : "Tes Streaming AI"}
          </button>
        </div>

        {/* Pilihan Template Provider AI */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-700">
            Pilih Template Provider AI:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {AI_PROVIDER_TEMPLATES.map((tpl) => {
              const active = selectedProvider === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectProviderTemplate(tpl)}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 ${
                    active
                      ? "border-sora-500 bg-sora-50/70 ring-2 ring-sora-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        active
                          ? "bg-sora-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tpl.badge}
                    </span>
                  </div>
                  <p className="font-display font-bold text-xs text-slate-900">
                    {tpl.label}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">{activeTemplate.desc}</p>

          {/* Sub-Preset Khusus Custom Provider */}
          {selectedProvider === "custom" && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="block text-[11px] font-bold text-slate-700">
                Pintasan Custom Provider Populer:
              </span>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_SUB_PRESETS.map((sub) => {
                  const isSubActive = (settings.openai_base_url || "")
                    .toLowerCase()
                    .includes(new URL(sub.baseUrl).hostname.toLowerCase());
                  return (
                    <button
                      key={sub.name}
                      type="button"
                      onClick={() => handleSelectCustomSubPreset(sub)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        isSubActive
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info Status Harga Otomatis vs Standar */}
          {isUnoRouterActive ? (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2">
              <span>
                ⚡ <strong>Mode Harga UnoRouter Aktif:</strong> Estimasi biaya pada menu <em>Log & Keamanan</em> otomatis menarik rasio harga model langsung dari endpoint <code>https://api.unorouter.com/api/pricing</code>.
              </span>
            </div>
          ) : (settings.openai_base_url || "").toLowerCase().includes("openrouter.ai") ? (
            <div className="p-3 rounded-2xl bg-sora-50 border border-sora-200 text-xs text-sora-800">
              ⚡ <strong>Mode OpenRouter Aktif:</strong> Estimasi biaya ditarik langsung dari properti pricing prompt & completion per token.
            </div>
          ) : (settings.openai_base_url || "").toLowerCase().includes("xkiro.com") ? (
            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-800">
              ⚡ <strong>Mode xKiro Aktif:</strong> Estimasi biaya ditarik langsung dari pricing input & output token.
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              ℹ️ <strong>Mode Estimasi Standar:</strong> Menggunakan perhitungan tarif acuan model efisien ($0.60 per 1M token).
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Base URL Endpoint
            </label>
            <input
              type="text"
              value={settings.openai_base_url || ""}
              onChange={(e) => updateField("openai_base_url", e.target.value)}
              placeholder={activeTemplate.baseUrl}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              API Key Provider{" "}
              {hasSecret.openai_api_key && (
                <span className="text-emerald-600 font-semibold">(Tersimpan)</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showOpenAiKey ? "text" : "password"}
                value={settings.openai_api_key || ""}
                onChange={(e) => updateField("openai_api_key", e.target.value)}
                placeholder={activeTemplate.keyPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOpenAiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOpenAiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Nama Model
              </label>
              <button
                type="button"
                onClick={handleFetchAllModels}
                disabled={fetchingModels}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sora-100 hover:bg-sora-200 text-sora-800 text-[11px] font-bold transition"
                title="Tarik semua model dari provider dengan filter khusus teks"
              >
                <Sparkles
                  className={`w-3 h-3 ${fetchingModels ? "animate-spin" : ""}`}
                />
                {fetchingModels
                  ? "Menarik Model..."
                  : "Tarik Semua Model Provider"}
              </button>
            </div>
            <input
              type="text"
              value={settings.openai_model || ""}
              onChange={(e) => updateField("openai_model", e.target.value)}
              placeholder={activeTemplate.defaultModel}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
            />
            {/* Info penarikan model */}
            {modelFetchMsg && (
              <p className="text-[11px] font-semibold text-slate-600 mt-1">
                {modelFetchMsg}
              </p>
            )}
            {/* Chip Rekomendasi Model Sesuai Template */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Rekomendasi Cepat:
              </span>
              {recommendedModels.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateField("openai_model", m)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border transition ${
                    settings.openai_model === m
                      ? "bg-sora-600 text-white border-sora-600 font-bold"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {m}
                </button>
              ))}
              {fetchedModels.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowModelModal(true)}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                >
                  Lihat Semua ({fetchedModels.length} Model Teks)
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Temperature (0.0 - 1.5)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1.5"
                value={settings.openai_temperature || "0.4"}
                onChange={(e) =>
                  updateField("openai_temperature", e.target.value)
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                step="100"
                min="256"
                max="8000"
                value={settings.openai_max_tokens || "2000"}
                onChange={(e) =>
                  updateField("openai_max_tokens", e.target.value)
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
        </div>

        {openAiResult && (
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 font-sans">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-sora-400">
                <Radio className="w-3 h-3 animate-pulse" />
                Live Response Stream
              </span>
              <span>{isStreamingAi ? "Sedang Mengetik..." : "Selesai"}</span>
            </div>
            {openAiResult}
            {isStreamingAi && (
              <span className="inline-block w-2 h-4 bg-sora-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}

        {/* Modal / Dialog Pemilih Semua Model dari Provider */}
        {showModelModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-base text-slate-900">
                    Pilih Model AI dari Provider
                  </h4>
                  <p className="text-xs text-slate-500">
                    Total {fetchedModels.length} model tersedia (Khusus OpenRouter & UnoRouter disaring HANYA AI generate text).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModelModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Input Pencarian Model Real-time */}
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Cari model (misal: flash, mini, sonnet, free, llama)..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sora-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Daftar Model yang Difilter */}
              <div className="overflow-y-auto p-4 space-y-2 flex-1 divide-y divide-slate-100">
                {fetchedModels
                  .filter((m) => {
                    const q = modelSearch.toLowerCase();
                    return (
                      m.id.toLowerCase().includes(q) ||
                      (m.name || "").toLowerCase().includes(q) ||
                      (m.pricingSummary || "").toLowerCase().includes(q)
                    );
                  })
                  .map((m) => {
                    const isSelected = settings.openai_model === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`pt-2 first:pt-0 flex items-center justify-between gap-3 p-3 rounded-2xl transition ${
                          isSelected
                            ? "bg-sora-50 border border-sora-300"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-900 truncate">
                              {m.id}
                            </span>
                            {m.isFree && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                                Gratis :free
                              </span>
                            )}
                          </div>
                          {m.pricingSummary && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Tarif:{" "}
                              <span className="font-semibold text-slate-700">
                                {m.pricingSummary}
                              </span>
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            updateField("openai_model", m.id);
                            setShowModelModal(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                            isSelected
                              ? "bg-sora-600 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                          }`}
                        >
                          {isSelected ? "Terpilih" : "Gunakan"}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowModelModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Fish Audio TTS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-sakura-100 text-sakura-700 text-xs font-bold">
              Podcast Suara (TTS)
            </span>
            <h3 className="font-display font-bold text-lg text-slate-900 mt-1">
              2. Konfigurasi Fish Audio TTS (Kloning Suara Sensei-AI)
            </h3>
            <p className="text-xs text-slate-500">
              Atur API Key Fish Audio, ID Suara (Reference ID sample buatan sendiri), kecepatan bicara, dan parameter akustik.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fish Audio API Key{" "}
              {hasSecret.fish_api_key && (
                <span className="text-emerald-600 font-semibold">(Tersimpan)</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showFishKey ? "text" : "password"}
                value={settings.fish_api_key || ""}
                onChange={(e) => updateField("fish_api_key", e.target.value)}
                placeholder="Masukkan API Key Fish Audio..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowFishKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showFishKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reference ID / Voice ID Sample Suara
            </label>
            <input
              type="text"
              value={settings.fish_voice_id || ""}
              onChange={(e) => updateField("fish_voice_id", e.target.value)}
              placeholder="Contoh: 7f92f8afb8ec43bf81429cc1c9199cb1"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Model / Backend
              </label>
              <select
                value={settings.fish_model || "s2.1-pro-free"}
                onChange={(e) => updateField("fish_model", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="s2.1-pro-free">s2.1-pro-free (Free Tier Default)</option>
                <option value="s2.1-pro">s2.1-pro (Recommended Production)</option>
                <option value="drama-3">drama-3 (Expressive & Emotive)</option>
                <option value="s2-pro">s2-pro</option>
                <option value="speech-1.5">speech-1.5 (Legacy)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Format Output
              </label>
              <select
                value={settings.fish_format || "mp3"}
                onChange={(e) => updateField("fish_format", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="mp3">MP3 (128kbps)</option>
                <option value="wav">WAV (Lossless)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kecepatan Bicara
              </label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="2.0"
                value={settings.fish_speed || "1.0"}
                onChange={(e) => updateField("fish_speed", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Temperature
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="1.0"
                value={settings.fish_temperature || "0.7"}
                onChange={(e) =>
                  updateField("fish_temperature", e.target.value)
                }
                className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Top_P
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="1.0"
                value={settings.fish_top_p || "0.7"}
                onChange={(e) => updateField("fish_top_p", e.target.value)}
                className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chunk Len
              </label>
              <input
                type="number"
                step="10"
                min="100"
                max="300"
                value={settings.fish_chunk_length || "200"}
                onChange={(e) =>
                  updateField("fish_chunk_length", e.target.value)
                }
                className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Normalisasi
              </label>
              <select
                value={settings.fish_normalize || "true"}
                onChange={(e) => updateField("fish_normalize", e.target.value)}
                className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="true">Aktif</option>
                <option value="false">Mati</option>
              </select>
            </div>
          </div>
        </div>

        {/* Box Tes Suara */}
        <div className="p-4 rounded-2xl bg-sakura-50/50 border border-sakura-200/70 space-y-3">
          <label className="block text-xs font-bold text-sakura-800">
            Uji Suara Fish Audio (Teks Contoh)
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-sakura-200 bg-white text-sm"
            />
            <button
              type="button"
              onClick={handleTestFish}
              disabled={testingFish}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sakura-500 hover:bg-sakura-600 text-white text-xs font-bold transition shrink-0"
            >
              <Volume2 className="w-4 h-4" />
              {testingFish ? "Menghasilkan Suara..." : "Tes Suara"}
            </button>
          </div>
          {fishResultMsg && (
            <p className="text-xs font-medium text-slate-700">{fishResultMsg}</p>
          )}
          {fishAudioUrl && (
            <audio controls src={fishAudioUrl} className="w-full h-10 mt-2" />
          )}
        </div>
      </div>

      {/* 3. Integrasi Bot Shiroko */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              WhatsApp Gateway
            </span>
            <h3 className="font-display font-bold text-lg text-slate-900 mt-1">
              3. Integrasi Bot Shiroko (Notifikasi & Pengiriman Podcast WA)
            </h3>
            <p className="text-xs text-slate-500">
              Kirim pengingat tenggat dan rekaman podcast hasil supervisi ke WhatsApp guru melalui Bot Shiroko.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestShiroko}
            disabled={testingShiroko}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition"
          >
            <Send className="w-3.5 h-3.5" />
            {testingShiroko ? "Mengirim..." : "Uji Kirim Pesan"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              URL Endpoint Bot Shiroko
            </label>
            <input
              type="text"
              value={settings.shiroko_url || ""}
              onChange={(e) => updateField("shiroko_url", e.target.value)}
              placeholder="http://localhost:4000/api/webhook"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Secret / Token (Header x-api-key)
            </label>
            <div className="relative">
              <input
                type={showShirokoSecret ? "text" : "password"}
                value={settings.shiroko_secret || ""}
                onChange={(e) => updateField("shiroko_secret", e.target.value)}
                placeholder="shiroko-secret-key"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowShirokoSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showShirokoSecret ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Status Integrasi
            </label>
            <select
              value={settings.shiroko_enabled || "false"}
              onChange={(e) => updateField("shiroko_enabled", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold"
            >
              <option value="true">Aktif (Kirim Otomatis)</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-sora-600" />
            Endpoint Penghubung Bot Shiroko yang Tersedia:
          </p>
          <p className="font-mono text-[11px]">
            • POST /api/integrasi/shiroko/notify — Kirim notifikasi hasil / pengingat tenggat
          </p>
          <p className="font-mono text-[11px]">
            • GET /api/integrasi/shiroko/hasil/:nomor — Bot mengambil ringkasan hasil guru via nomor WA
          </p>
          <p className="font-mono text-[11px]">
            • POST /api/integrasi/shiroko/kirim-podcast — Bot meminta audio podcast untuk dikirim ke WA guru
          </p>
        </div>

        {shirokoResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs font-medium text-slate-800">
            {shirokoResult}
          </div>
        )}
      </div>
    </form>
  );
}
