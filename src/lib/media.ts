export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

/** Converte uma imagem em data URL já redimensionada (máx. 1400px) e comprimida. */
export async function imageToDataUrl(file: File, maxEdge = 1400): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Imagem muito grande (máx. 8MB).");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }

  // GIF animado: não comprimir para não perder a animação.
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return readAsDataUrl(file);
  }

  const dataUrl = await readAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Imagem inválida."));
    element.src = dataUrl;
  });

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);

  const jpeg = canvas.toDataURL("image/jpeg", 0.82);
  return jpeg.length < dataUrl.length ? jpeg : dataUrl;
}

/** Converte um áudio em data URL (base64). */
export async function audioToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error("Áudio muito grande (máx. 12MB).");
  }
  if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
    throw new Error("Selecione um arquivo de áudio.");
  }
  return readAsDataUrl(file);
}

const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

/** Converte um vídeo em data URL (base64). */
export async function videoToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Vídeo muito grande (máx. 40MB). Use uma URL externa.");
  }
  if (!file.type.startsWith("video/")) {
    throw new Error("Selecione um arquivo de vídeo.");
  }
  return readAsDataUrl(file);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Verifica se a URL é segura para usar como src de <img>, <audio>, <video>
 * (aceita http(s), blob: e data: para imagens/áudios/vídeos, bloqueia javascript: e outros).
 */
export function isSafeMediaUrl(url: string): boolean {
  if (!url) return false;
  try {
    if (url.startsWith("data:")) {
      // Permite apenas data: de tipo imagem, áudio ou vídeo.
      return /^data:(image|audio|video)\/[a-zA-Z0-9.+-]+(;[a-zA-Z0-9=;-]+)*,/.test(
        url,
      );
    }
    if (url.startsWith("blob:")) {
      // blob: URLs são geradas pelo navegador (seguras no contexto atual)
      return true;
    }
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
