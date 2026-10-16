import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted } from "@/lib/settings";

interface UnoRouterPricingItem {
  model_name: string;
  is_free?: boolean;
  quota_type?: number;
  model_ratio?: number;
  completion_ratio?: number;
  model_price?: number;
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [logs, hasilAgg, podcastAgg, failedLogsCount, settings] =
    await Promise.all([
      prisma.logAktivitas.findMany({
        orderBy: { waktu: "desc" },
        take: 150,
      }),
      prisma.hasil.aggregate({
        _sum: { tokenUsage: true },
        _count: { id: true },
      }),
      prisma.podcast.aggregate({
        _sum: { karakterTts: true, durasi: true },
        _count: { id: true },
      }),
      prisma.logAktivitas.count({
        where: {
          OR: [
            { aksi: { contains: "GAGAL" } },
            { aksi: { contains: "ERROR" } },
            { aksi: { contains: "RETRY" } },
          ],
        },
      }),
      getAllSettingsDecrypted(),
    ]);

  const totalTokenAI = hasilAgg._sum.tokenUsage || 0;
  const totalEvaluasiAI = hasilAgg._count.id || 0;
  const totalKarakterTTS = podcastAgg._sum.karakterTts || 0;
  const totalDurasiDetik = podcastAgg._sum.durasi || 0;

  const baseURL = (
    settings.openai_base_url || "https://api.openai.com/v1"
  ).trim();
  const modelName = (settings.openai_model || "gpt-4o-mini").trim();
  const isUnoRouter = baseURL.toLowerCase().includes("unorouter.com");
  const isOpenRouter = baseURL.toLowerCase().includes("openrouter.ai");
  const isXKiro = baseURL.toLowerCase().includes("xkiro.com");
  const isOllama =
    baseURL.includes("localhost:11434") ||
    baseURL.includes("127.0.0.1:11434");

  const ttsCostUSD = totalKarakterTTS * 0.000015;
  let aiCostUSD = totalTokenAI * 0.0000006;
  let pricingInfo: {
    mode: "unorouter" | "openrouter" | "xkiro" | "ollama" | "standard";
    providerLabel: string;
    modelName: string;
    isFree: boolean;
    modelRatio?: number;
    completionRatio?: number;
    ratePer1MInputUSD?: number;
    ratePer1MOutputUSD?: number;
    aiCostUSD: number;
    ttsCostUSD: number;
  } = {
    mode: "standard",
    providerLabel: "Estimasi Standar",
    modelName,
    isFree:
      modelName.toLowerCase().endsWith(":free") ||
      isOllama,
    aiCostUSD: Number(aiCostUSD.toFixed(4)),
    ttsCostUSD: Number(ttsCostUSD.toFixed(4)),
  };

  // 1. UnoRouter Live Pricing via /api/pricing
  if (isUnoRouter) {
    try {
      const parsedUrl = new URL(baseURL);
      const pricingEndpoint = `${parsedUrl.origin}/api/pricing`;
      const unoKey = (
        process.env.UNOROUTER_API_KEY ||
        settings.openai_api_key ||
        ""
      ).trim();

      const res = await fetch(pricingEndpoint, {
        headers: unoKey ? { Authorization: `Bearer ${unoKey}` } : {},
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const json = await res.json();
        const list: UnoRouterPricingItem[] = Array.isArray(json?.data)
          ? json.data
          : [];
        const matched = list.find(
          (item) =>
            item.model_name?.toLowerCase() === modelName.toLowerCase()
        );

        if (matched) {
          const isFree =
            Boolean(matched.is_free) ||
            Number(matched.model_ratio || 0) === 0 ||
            modelName.toLowerCase().endsWith(":free");
          const modelRatio = Number(matched.model_ratio ?? 0);
          const completionRatio = Number(matched.completion_ratio ?? 1);

          if (isFree) {
            aiCostUSD = 0;
          } else if (matched.quota_type === 1) {
            aiCostUSD = totalEvaluasiAI * Number(matched.model_price || 0) * 0.002;
          } else {
            const effectiveRatePerToken =
              0.000002 * modelRatio * (0.7 + 0.3 * (completionRatio || 1));
            aiCostUSD = totalTokenAI * effectiveRatePerToken;
          }

          pricingInfo = {
            mode: "unorouter",
            providerLabel: "UnoRouter Live API",
            modelName: matched.model_name,
            isFree,
            modelRatio,
            completionRatio,
            ratePer1MInputUSD: Number((modelRatio * 2).toFixed(3)),
            ratePer1MOutputUSD: Number(
              (modelRatio * (completionRatio || 1) * 2).toFixed(3)
            ),
            aiCostUSD: Number(aiCostUSD.toFixed(4)),
            ttsCostUSD: Number(ttsCostUSD.toFixed(4)),
          };
        } else {
          const isFreeFallback = modelName.toLowerCase().endsWith(":free");
          if (isFreeFallback) aiCostUSD = 0;
          pricingInfo = {
            mode: "unorouter",
            providerLabel: "UnoRouter API",
            modelName,
            isFree: isFreeFallback,
            aiCostUSD: Number(aiCostUSD.toFixed(4)),
            ttsCostUSD: Number(ttsCostUSD.toFixed(4)),
          };
        }
      }
    } catch {
      // Fallback aman jika offline
    }
  }

  // 2. OpenRouter Live Pricing via /api/v1/models (Langsung dari endpoint model)
  else if (isOpenRouter) {
    try {
      const openRouterKey = (settings.openai_api_key || "").trim();
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: openRouterKey ? { Authorization: `Bearer ${openRouterKey}` } : {},
        signal: AbortSignal.timeout(4500),
      });

      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : [];
        const matched = list.find(
          (m: any) =>
            m.id?.toLowerCase() === modelName.toLowerCase() ||
            m.name?.toLowerCase() === modelName.toLowerCase()
        );

        if (matched?.pricing) {
          const promptRate = Number(matched.pricing.prompt || 0);
          const complRate = Number(matched.pricing.completion || 0);
          const isFree =
            (promptRate === 0 && complRate === 0) ||
            modelName.toLowerCase().endsWith(":free");

          if (isFree) {
            aiCostUSD = 0;
          } else {
            const effectiveRate = promptRate * 0.7 + complRate * 0.3;
            aiCostUSD = totalTokenAI * effectiveRate;
          }

          pricingInfo = {
            mode: "openrouter",
            providerLabel: "OpenRouter Live API",
            modelName: matched.id,
            isFree,
            ratePer1MInputUSD: Number((promptRate * 1_000_000).toFixed(3)),
            ratePer1MOutputUSD: Number((complRate * 1_000_000).toFixed(3)),
            aiCostUSD: Number(aiCostUSD.toFixed(4)),
            ttsCostUSD: Number(ttsCostUSD.toFixed(4)),
          };
        }
      }
    } catch {
      // Fallback aman
    }
  }

  // 3. xKiro Live Pricing via /v1/models (Langsung dari endpoint model)
  else if (isXKiro) {
    try {
      const res = await fetch("https://api.xkiro.com/v1/models", {
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : [];
        const matched = list.find(
          (m: any) => m.id?.toLowerCase() === modelName.toLowerCase()
        );

        if (matched?.pricing) {
          const inP = Number(matched.pricing.input || 0);
          const outP = Number(matched.pricing.output || 0);
          const isFree =
            matched.access_tier === "free" || (inP === 0 && outP === 0);

          if (isFree) {
            aiCostUSD = 0;
          } else {
            const effectiveRate = (inP * 0.7 + outP * 0.3) / 1_000_000;
            aiCostUSD = totalTokenAI * effectiveRate;
          }

          pricingInfo = {
            mode: "xkiro",
            providerLabel: "xKiro Live API",
            modelName: matched.id,
            isFree,
            ratePer1MInputUSD: inP,
            ratePer1MOutputUSD: outP,
            aiCostUSD: Number(aiCostUSD.toFixed(4)),
            ttsCostUSD: Number(ttsCostUSD.toFixed(4)),
          };
        }
      }
    } catch {
      // Fallback aman
    }
  }

  // 4. Ollama (Gratis 100% Lokal)
  else if (isOllama) {
    aiCostUSD = 0;
    pricingInfo = {
      mode: "ollama",
      providerLabel: "Ollama (Lokal)",
      modelName,
      isFree: true,
      ratePer1MInputUSD: 0,
      ratePer1MOutputUSD: 0,
      aiCostUSD: 0,
      ttsCostUSD: Number(ttsCostUSD.toFixed(4)),
    };
  }

  const estimasiBiayaUSD = Number((aiCostUSD + ttsCostUSD).toFixed(4));

  return NextResponse.json({
    logs,
    usage: {
      totalTokenAI,
      totalEvaluasiAI,
      totalKarakterTTS,
      totalPodcast: podcastAgg._count.id,
      totalDurasiDetik,
      failedLogsCount,
      estimasiBiayaUSD,
      pricingInfo,
    },
  });
}

