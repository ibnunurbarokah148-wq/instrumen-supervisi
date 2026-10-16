import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAllSettingsDecrypted } from "@/lib/settings";

export interface ProviderModelInfo {
  id: string;
  name?: string;
  description?: string;
  contextLength?: number;
  isFree?: boolean;
  pricingSummary?: string;
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const saved = await getAllSettingsDecrypted();

    const baseURL = (
      body.baseUrl ||
      saved.openai_base_url ||
      "https://api.openai.com/v1"
    ).trim();
    const isOllama =
      baseURL.includes("localhost:11434") ||
      baseURL.includes("127.0.0.1:11434");
    const isUnoRouter = baseURL.toLowerCase().includes("unorouter.com");
    const isOpenRouter = baseURL.toLowerCase().includes("openrouter.ai");
    const isXKiro = baseURL.toLowerCase().includes("xkiro.com");

    const rawKeyInput =
      typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    let apiKey =
      rawKeyInput && !rawKeyInput.includes("••••")
        ? rawKeyInput
        : (saved.openai_api_key || "").trim();

    if (!apiKey && isUnoRouter && process.env.UNOROUTER_API_KEY) {
      apiKey = process.env.UNOROUTER_API_KEY.trim();
    }
    if (!apiKey && isOllama) {
      apiKey = "ollama";
    }

    let models: ProviderModelInfo[] = [];

    // 1. OpenRouter (Filter KHUSUS model generate teks saja & sertakan harga)
    if (isOpenRouter) {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        throw new Error(`OpenRouter API error (${res.status})`);
      }
      const data = await res.json();
      const rawList = Array.isArray(data?.data) ? data.data : [];

      models = rawList
        .filter((m: any) => {
          const mod = String(m?.architecture?.modality || "").toLowerCase();
          const id = String(m?.id || "").toLowerCase();
          // Filter hanya model yang menghasilkan teks (generate text)
          const isTextOut =
            mod.includes("->text") ||
            mod.includes("->text+") ||
            (!mod &&
              !id.includes("flux") &&
              !id.includes("stable-diffusion") &&
              !id.includes("midjourney") &&
              !id.includes("dall-e") &&
              !id.includes("embedding") &&
              !id.includes("rerank"));
          return isTextOut;
        })
        .map((m: any) => {
          const promptRate = Number(m.pricing?.prompt || 0) * 1_000_000;
          const complRate = Number(m.pricing?.completion || 0) * 1_000_000;
          const isFree = promptRate === 0 && complRate === 0;
          let pricingSummary = isFree
            ? "Gratis (Free)"
            : `$${promptRate.toFixed(2)} in / $${complRate.toFixed(2)} out per 1M`;

          return {
            id: m.id,
            name: m.name || m.id,
            description: m.description?.slice(0, 100),
            contextLength: m.context_length,
            isFree,
            pricingSummary,
          };
        });
    }

    // 2. UnoRouter (Filter KHUSUS model generate teks saja & sertakan harga dari /api/pricing)
    else if (isUnoRouter) {
      const parsedUrl = new URL(baseURL);
      const origin = parsedUrl.origin;
      const headers: Record<string, string> = apiKey
        ? { Authorization: `Bearer ${apiKey}` }
        : {};

      // Ambil daftar model standar dan data rasio harga
      const [modelsRes, pricingRes] = await Promise.allSettled([
        fetch(`${origin}/v1/models`, {
          headers,
          signal: AbortSignal.timeout(8000),
        }),
        fetch(`${origin}/api/pricing`, {
          headers,
          signal: AbortSignal.timeout(8000),
        }),
      ]);

      let pricingMap = new Map<string, any>();
      if (
        pricingRes.status === "fulfilled" &&
        pricingRes.value.ok
      ) {
        const pJson = await pricingRes.value.json();
        if (Array.isArray(pJson?.data)) {
          for (const item of pJson.data) {
            pricingMap.set(String(item.model_name).toLowerCase(), item);
          }
        }
      }

      if (
        modelsRes.status === "fulfilled" &&
        modelsRes.value.ok
      ) {
        const mJson = await modelsRes.value.json();
        const rawList = Array.isArray(mJson?.data) ? mJson.data : [];

        // Filter KHUSUS model generate teks saja (gunakan tag 'Text' dari metadata & exclude image/embedding)
        const nonTextPatterns = [
          "embedding",
          "reranker",
          "diffusion",
          "absolutereality",
          "albedobase",
          "pony",
          "deliberate",
          "dreamshaper",
          "anything-v5",
          "anything-xl",
          "sdxl",
          "cyberrealistic",
          "autismmix",
        ];

        models = rawList
          .filter((m: any) => {
            const id = String(m?.id || "").toLowerCase();
            const types = Array.isArray(m?.supported_endpoint_types)
              ? m.supported_endpoint_types
              : [];
            if (
              types.includes("embedding") ||
              types.includes("aihorde")
            )
              return false;

            if (nonTextPatterns.some((pattern) => id.includes(pattern))) {
              return false;
            }

            const p = pricingMap.get(id);
            if (p?.tags) {
              const tagList = p.tags.split(",").map((t: string) => t.trim());
              return tagList.includes("Text");
            }
            return true;
          })
          .map((m: any) => {
            const p = pricingMap.get(m.id.toLowerCase());
            const isFree =
              m.id.toLowerCase().endsWith(":free") ||
              Boolean(p?.is_free) ||
              Number(p?.model_ratio ?? 1) === 0;
            const modelRatio = Number(p?.model_ratio ?? 0);
            const completionRatio = Number(p?.completion_ratio ?? 1);

            let pricingSummary = isFree
              ? "Gratis (:free)"
              : p
              ? `Rasio ${modelRatio}x ($${(modelRatio * 2).toFixed(2)} in / $${(
                  modelRatio *
                  completionRatio *
                  2
                ).toFixed(2)} out per 1M)`
              : "Berbayar (Kuota UnoRouter)";

            return {
              id: m.id,
              name: m.id,
              contextLength: m.context_length,
              isFree,
              pricingSummary,
            };
          });
      }
    }

    // 3. xKiro
    else if (isXKiro) {
      const res = await fetch("https://api.xkiro.com/v1/models", {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data?.data) ? data.data : [];
        models = rawList.map((m: any) => {
          const isFree = m.access_tier === "free";
          const inP = Number(m.pricing?.input || 0);
          const outP = Number(m.pricing?.output || 0);
          return {
            id: m.id,
            name: m.display_name || m.id,
            contextLength: m.context_length,
            isFree,
            pricingSummary: isFree
              ? "Gratis (Tier Free)"
              : `$${inP.toFixed(2)} in / $${outP.toFixed(2)} out per 1M`,
          };
        });
      }
    }

    // 4. Ollama (Lokal)
    else if (isOllama) {
      try {
        const res = await fetch("http://localhost:11434/v1/models", {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          const rawList = Array.isArray(data?.data) ? data.data : [];
          models = rawList.map((m: any) => ({
            id: m.id,
            name: m.id,
            isFree: true,
            pricingSummary: "Gratis (Lokal PC)",
          }));
        }
      } catch {
        // Fallback jika port 11434 belum aktif
      }
    }

    // 5. Provider Standar (OpenAI, Claude, Gemini, Grok, dll.)
    else {
      const endpoint = `${baseURL.replace(/\/+$/, "")}/models`;
      const res = await fetch(endpoint, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        models = rawList.map((m: any) => ({
          id: m.id || m.name,
          name: m.name || m.id,
          isFree: false,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      total: models.length,
      provider: isUnoRouter
        ? "unorouter"
        : isOpenRouter
        ? "openrouter"
        : isXKiro
        ? "xkiro"
        : isOllama
        ? "ollama"
        : "standard",
      models,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: `Gagal menarik daftar model: ${msg}`,
        models: [],
      },
      { status: 500 }
    );
  }
}
