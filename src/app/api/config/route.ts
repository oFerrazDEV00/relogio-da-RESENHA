import { NextResponse } from "next/server";
import { resetConfig, updateConfig, type ConfigPatch } from "@/lib/state";
import { isSafeMediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

const ALLOWED = [
  "title",
  "subtitle",
  "note",
  "footerLeft",
  "footerRight",
  "backgroundUrl",
  "backgroundVideoUrl",
  "backgroundAudioUrl",
  "timeMode",
  "customTime",
  "customTimeBase",
  "clockFrozen",
] as const;

const MEDIA_KEYS = new Set(["backgroundUrl", "backgroundVideoUrl", "backgroundAudioUrl"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { patch?: ConfigPatch; reset?: boolean };

    if (body.reset) {
      await resetConfig();
    } else if (body.patch) {
      const patch: ConfigPatch = {};
      for (const key of ALLOWED) {
        const value = (body.patch as Record<string, unknown>)[key];

        if (key === "clockFrozen") {
          if (typeof value === "boolean") {
            patch[key] = value;
          }
          continue;
        }

        if (key === "timeMode") {
          if (value === "real" || value === "custom") {
            patch[key] = value;
          }
          continue;
        }

        if (typeof value === "string") {
          if (MEDIA_KEYS.has(key) && value.length > 0 && !isSafeMediaUrl(value)) {
            return NextResponse.json({ error: "invalid media url" }, { status: 400 });
          }
          // @ts-expect-error - chaves validadas dinamicamente
          patch[key] = value.length > 0 ? value : null;
        }
      }
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "empty patch" }, { status: 400 });
      }

      // Se está entrando em modo "custom", o servidor calcula a base do relógio
      // para evitar discrepância com o relógio do cliente.
      if (patch.timeMode === "custom" && patch.customTime) {
        patch.customTimeBase = new Date().toISOString();
      }
      // Se voltou ao modo "real", limpa os campos customizados.
      if (patch.timeMode === "real") {
        patch.customTime = null;
        patch.customTimeBase = null;
      }

      await updateConfig(patch);
    } else {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("config error", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Falha ao salvar configuração: ${msg}` },
      { status: 500 },
    );
  }
}
