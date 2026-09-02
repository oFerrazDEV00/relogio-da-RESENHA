"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock,
  Image as ImageIcon,
  Link2,
  Move,
  Music,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Type,
  Upload,
  Video as VideoIcon,
  X,
} from "lucide-react";
import {
  audioToDataUrl,
  imageToDataUrl,
  videoToDataUrl,
} from "@/lib/media";
import type { Block, BlockType, SiteConfig, TimeMode } from "@/lib/types";

type Tab = "textos" | "midia" | "audio" | "relogio" | "tela";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "textos", label: "Textos", icon: <Type size={15} /> },
  { id: "midia", label: "Mídia", icon: <ImageIcon size={15} /> },
  { id: "audio", label: "Áudio", icon: <Music size={15} /> },
  { id: "relogio", label: "Relógio", icon: <Clock size={15} /> },
  { id: "tela", label: "Tela", icon: <Move size={15} /> },
];

export default function AdminPanel({
  config,
  blocks,
  editMode,
  onToggleEditMode,
  onClose,
  onSaveConfig,
  onCreateBlock,
  onPatchBlock,
  onDeleteBlock,
  onReset,
}: {
  config: SiteConfig;
  blocks: Block[];
  editMode: boolean;
  onToggleEditMode: () => void;
  onClose: () => void;
  onSaveConfig: (patch: Partial<SiteConfig>) => Promise<void>;
  onCreateBlock: (type: BlockType, content: string) => Promise<void>;
  onPatchBlock: (id: number, patch: Partial<Block>) => void;
  onDeleteBlock: (id: number) => void;
  onReset: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("textos");
  const [draft, setDraft] = useState<SiteConfig>(config);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [composer, setComposer] = useState<BlockType | null>(null);
  const [composerUrl, setComposerUrl] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const composerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2600);
    return () => window.clearTimeout(timer);
  }, [status]);

  // Sincroniza o draft com o config quando ele muda externamente (via sync),
  // mas nunca sobrescreve alterações locais ainda não salvas.
  useEffect(() => {
    if (!isDraftDirty) {
      setDraft(config);
    }
  }, [config, isDraftDirty]);

  function updateDraft(patch: Partial<SiteConfig>) {
    setDraft((current) => ({ ...current, ...patch }));
    setIsDraftDirty(true);
  }

  function flash(type: "ok" | "err", msg: string) {
    setStatus({ type, msg });
  }

  async function saveTexts() {
    setBusy(true);
    try {
      await onSaveConfig({
        title: draft.title,
        subtitle: draft.subtitle,
        note: draft.note,
        footerLeft: draft.footerLeft,
        footerRight: draft.footerRight,
      });
      setIsDraftDirty(false);
      flash("ok", "Textos salvos em todos os dispositivos!");
    } catch {
      // Mantém o draft intacto para permitir nova tentativa.
      flash("err", "Erro ao salvar os textos.");
    }
    setBusy(false);
  }

  async function setBackground(url: string | null) {
    setBusy(true);
    try {
      await onSaveConfig({ backgroundUrl: url });
      setIsDraftDirty(false);
      flash("ok", url ? "Imagem global aplicada!" : "Imagem global removida.");
    } catch {
      flash("err", "Erro ao salvar a imagem.");
    }
    setBusy(false);
  }

  async function setBackgroundVideo(url: string | null) {
    setBusy(true);
    try {
      await onSaveConfig({ backgroundVideoUrl: url });
      setIsDraftDirty(false);
      flash("ok", url ? "Vídeo global aplicado!" : "Vídeo global removido.");
    } catch {
      flash("err", "Erro ao salvar o vídeo.");
    }
    setBusy(false);
  }

  async function setAudio(url: string | null) {
    setBusy(true);
    try {
      await onSaveConfig({ backgroundAudioUrl: url });
      setIsDraftDirty(false);
      flash("ok", url ? "Áudio global aplicado!" : "Áudio global removido.");
    } catch (error) {
      flash("err", (error as Error).message);
    }
    setBusy(false);
  }

  async function handleImageFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await imageToDataUrl(file);
      await setBackground(dataUrl);
    } catch (error) {
      flash("err", (error as Error).message);
      setBusy(false);
    }
  }

  async function handleVideoFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await videoToDataUrl(file);
      await setBackgroundVideo(dataUrl);
    } catch (error) {
      flash("err", (error as Error).message);
      setBusy(false);
    }
  }

  async function handleAudioFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await audioToDataUrl(file);
      await setAudio(dataUrl);
    } catch (error) {
      flash("err", (error as Error).message);
      setBusy(false);
    }
  }

  async function addComposerBlock() {
    if (!composer) return;
    if (composer === "text") {
      await onCreateBlock("text", composerUrl.trim() || "Sua resenha aqui");
      setComposer(null);
      setComposerUrl("");
      flash("ok", "Texto adicionado. Arraste para posicionar!");
      return;
    }
    if (!composerUrl.trim()) {
      flash("err", "Cole uma URL ou envie um arquivo.");
      return;
    }
    try {
      await onCreateBlock(composer, composerUrl.trim());
      setComposer(null);
      setComposerUrl("");
      flash("ok", "Elemento adicionado. Arraste para posicionar!");
    } catch (error) {
      flash("err", (error as Error).message);
    }
  }

  async function handleComposerFile(file: File | undefined) {
    if (!file || !composer || composer === "text") return;
    setBusy(true);
    try {
      const dataUrl =
        composer === "image"
          ? await imageToDataUrl(file)
          : composer === "video"
            ? await videoToDataUrl(file)
            : await audioToDataUrl(file);
      await onCreateBlock(composer, dataUrl);
      setComposer(null);
      setComposerUrl("");
      flash("ok", "Elemento adicionado. Arraste para posicionar!");
    } catch (error) {
      flash("err", (error as Error).message);
    }
    setBusy(false);
  }

  /* ===== Relógio customizado ===== */
  const [customDateTime, setCustomDateTime] = useState<string>("");
  const [isCustomTimeDirty, setIsCustomTimeDirty] = useState(false);

  function toLocalInput(iso: string | null | undefined): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  useEffect(() => {
    if (isCustomTimeDirty) return;
    if (config.timeMode === "custom" && config.customTime) {
      setCustomDateTime(toLocalInput(config.customTime));
    } else {
      setCustomDateTime("");
    }
  }, [config.timeMode, config.customTime, isCustomTimeDirty]);

  async function applyCustomTime() {
    if (!customDateTime) {
      flash("err", "Escolha uma data e hora.");
      return;
    }
    setBusy(true);
    try {
      const iso = new Date(customDateTime).toISOString();
      if (Number.isNaN(new Date(iso).getTime())) throw new Error("Data inválida.");
      await onSaveConfig({
        timeMode: "custom" as TimeMode,
        customTime: iso,
        clockFrozen: false,
      });
      setIsCustomTimeDirty(false);
      flash("ok", "Relógio personalizado aplicado em todos os dispositivos!");
    } catch (error) {
      flash("err", (error as Error).message);
    }
    setBusy(false);
  }

  async function toggleFrozen(checked: boolean) {
    setBusy(true);
    try {
      await onSaveConfig({ clockFrozen: checked });
      flash("ok", checked ? "Relógio congelado!" : "Relógio avançando normalmente.");
    } catch {
      flash("err", "Erro ao salvar.");
    }
    setBusy(false);
  }

  async function backToRealClock() {
    setBusy(true);
    try {
      await onSaveConfig({
        timeMode: "real",
        customTime: null,
        customTimeBase: null,
        clockFrozen: false,
      });
      setCustomDateTime("");
      setIsCustomTimeDirty(false);
      flash("ok", "Relógio voltou ao horário real de Brasília.");
    } catch {
      flash("err", "Erro ao salvar.");
    }
    setBusy(false);
  }

  const label = "mb-1 block text-[12px] font-bold uppercase tracking-wide text-[#555]";
  const input =
    "w-full rounded-[6px] border border-[#bbb] bg-white px-3 py-2 text-[14px] text-[#222] outline-none transition focus:border-[#222] focus:ring-2 focus:ring-[#222]/15";
  const btn =
    "inline-flex items-center justify-center gap-2 rounded-[6px] px-3 py-2 text-[13px] font-bold transition disabled:opacity-60";

  return (
    <aside className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[84vh] flex-col rounded-t-[16px] bg-white shadow-[0_-10px_45px_rgba(0,0,0,0.25)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-[16px] md:shadow-[-10px_0_45px_rgba(0,0,0,0.25)]">
      {/* header */}
      <div className="flex items-center justify-between border-b border-[#e2e2e2] bg-[#1c1c1c] px-4 py-3 text-white">
        <div>
          <p className="text-[15px] font-black leading-tight">Painel Resenha</p>
          <p className="text-[11px] text-white/60">Vale para todos os dispositivos</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          aria-label="Fechar painel"
        >
          <X size={17} />
        </button>
      </div>

      {/* tabs */}
      <div className="grid grid-cols-5 border-b border-[#e2e2e2] bg-[#fafafa]">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-col items-center gap-[3px] border-b-2 px-1 py-[9px] text-[10.5px] font-bold transition ${
              tab === item.id
                ? "border-[#1c1c1c] bg-white text-[#111]"
                : "border-transparent text-[#888] hover:text-[#333]"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "textos" ? (
          <div className="space-y-4">
            <p className="rounded-[8px] bg-[#f1f6ff] px-3 py-2 text-[12px] leading-[17px] text-[#2a4a7a]">
              Edite qualquer texto da página. Ao salvar, todos os dispositivos abertos
              mudam na hora.
            </p>

            <div>
              <label className={label}>Título principal (H1)</label>
              <input
                className={input}
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
              />
            </div>

            <div>
              <label className={label}>Subtítulo (H2)</label>
              <textarea
                className={`${input} min-h-[58px] resize-y`}
                value={draft.subtitle}
                onChange={(event) => updateDraft({ subtitle: event.target.value })}
              />
            </div>

            <div>
              <label className={label}>Aviso abaixo do relógio</label>
              <textarea
                className={`${input} min-h-[58px] resize-y`}
                value={draft.note}
                onChange={(event) => updateDraft({ note: event.target.value })}
              />
            </div>

            <div>
              <label className={label}>Rodapé — linha 1</label>
              <input
                className={input}
                value={draft.footerLeft}
                onChange={(event) => updateDraft({ footerLeft: event.target.value })}
              />
            </div>

            <div>
              <label className={label}>Rodapé — linha 2</label>
              <textarea
                className={`${input} min-h-[58px] resize-y`}
                value={draft.footerRight}
                onChange={(event) => updateDraft({ footerRight: event.target.value })}
              />
            </div>

            <button
              onClick={saveTexts}
              disabled={busy}
              className={`${btn} w-full bg-[#1c1c1c] py-[11px] text-[14px] text-white hover:bg-black`}
            >
              <Check size={16} /> Salvar textos
            </button>
          </div>
        ) : null}

        {tab === "midia" ? (
          <div className="space-y-6">
            {/* IMAGEM */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-[13px] font-black uppercase tracking-wide text-[#333]">
                <ImageIcon size={15} /> Imagem global (fundo)
              </h3>
              <p className="text-[12px] leading-[16px] text-[#666]">
                Aparece no fundo do site inteiro em todos os dispositivos.
              </p>
              <div className="flex gap-2">
                <input
                  className={input}
                  placeholder="https://... ou data:image/..."
                  value={
                    draft.backgroundUrl?.startsWith("data:")
                      ? ""
                      : draft.backgroundUrl ?? ""
                  }
                  onChange={(event) => updateDraft({ backgroundUrl: event.target.value })}
                />
                <button
                  onClick={() => void setBackground(draft.backgroundUrl || null)}
                  disabled={busy}
                  className={`${btn} shrink-0 bg-[#1c1c1c] text-white hover:bg-black`}
                >
                  <Link2 size={15} />
                </button>
              </div>
              <input
                ref={imageInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleImageFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                onClick={() => imageInput.current?.click()}
                disabled={busy}
                className={`${btn} w-full border border-dashed border-[#999] bg-[#fafafa] py-3 text-[#333] hover:bg-[#f0f0f0]`}
              >
                <Upload size={16} /> Escolher imagem
              </button>
              {config.backgroundUrl ? (
                <div className="space-y-2">
                  <img
                    src={config.backgroundUrl}
                    alt="pré-visualização"
                    className="max-h-[150px] w-full rounded-[8px] border border-[#ddd] object-cover"
                  />
                  <button
                    onClick={() => void setBackground(null)}
                    disabled={busy}
                    className={`${btn} w-full bg-[#c62828] text-white hover:bg-[#a31f1f]`}
                  >
                    <Trash2 size={15} /> Remover imagem
                  </button>
                </div>
              ) : null}
            </div>

            {/* VÍDEO */}
            <div className="space-y-3 border-t border-[#e0e0e0] pt-4">
              <h3 className="flex items-center gap-2 text-[13px] font-black uppercase tracking-wide text-[#333]">
                <VideoIcon size={15} /> Vídeo global (fundo)
              </h3>
              <p className="text-[12px] leading-[16px] text-[#666]">
                Toca em loop sem áudio, atrás de todo o conteúdo (substitui a imagem).
              </p>
              <div className="flex gap-2">
                <input
                  className={input}
                  placeholder="https://...mp4 ou data:video/..."
                  value={
                    draft.backgroundVideoUrl?.startsWith("data:")
                      ? ""
                      : draft.backgroundVideoUrl ?? ""
                  }
                  onChange={(event) =>
                    updateDraft({ backgroundVideoUrl: event.target.value })
                  }
                />
                <button
                  onClick={() => void setBackgroundVideo(draft.backgroundVideoUrl || null)}
                  disabled={busy}
                  className={`${btn} shrink-0 bg-[#1c1c1c] text-white hover:bg-black`}
                >
                  <Link2 size={15} />
                </button>
              </div>
              <input
                ref={videoInput}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  void handleVideoFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                onClick={() => videoInput.current?.click()}
                disabled={busy}
                className={`${btn} w-full border border-dashed border-[#999] bg-[#fafafa] py-3 text-[#333] hover:bg-[#f0f0f0]`}
              >
                <Upload size={16} /> Escolher vídeo (máx. 40 MB)
              </button>
              {config.backgroundVideoUrl ? (
                <div className="space-y-2">
                  <video
                    src={config.backgroundVideoUrl}
                    controls
                    muted
                    className="max-h-[150px] w-full rounded-[8px] border border-[#ddd] object-cover"
                  />
                  <button
                    onClick={() => void setBackgroundVideo(null)}
                    disabled={busy}
                    className={`${btn} w-full bg-[#c62828] text-white hover:bg-[#a31f1f]`}
                  >
                    <Trash2 size={15} /> Remover vídeo
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "audio" ? (
          <div className="space-y-4">
            <p className="rounded-[8px] bg-[#f1f6ff] px-3 py-2 text-[12px] leading-[17px] text-[#2a4a7a]">
              Este áudio toca em loop no site inteiro, para todo mundo que abrir.
            </p>

            <div>
              <label className={label}>URL do áudio (mp3, ogg, wav)</label>
              <div className="flex gap-2">
                <input
                  className={input}
                  placeholder="https://.../musica.mp3"
                  value={
                    draft.backgroundAudioUrl?.startsWith("data:")
                      ? ""
                      : draft.backgroundAudioUrl ?? ""
                  }
                  onChange={(event) =>
                    updateDraft({ backgroundAudioUrl: event.target.value })
                  }
                />
                <button
                  onClick={() => void setAudio(draft.backgroundAudioUrl || null)}
                  disabled={busy}
                  className={`${btn} shrink-0 bg-[#1c1c1c] text-white hover:bg-black`}
                >
                  <Link2 size={15} />
                </button>
              </div>
            </div>

            <div>
              <label className={label}>Ou envie do aparelho</label>
              <input
                ref={audioInput}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(event) => {
                  void handleAudioFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                onClick={() => audioInput.current?.click()}
                disabled={busy}
                className={`${btn} w-full border border-dashed border-[#999] bg-[#fafafa] py-3 text-[#333] hover:bg-[#f0f0f0]`}
              >
                <Upload size={16} /> Escolher áudio (máx. 12 MB)
              </button>
            </div>

            {config.backgroundAudioUrl ? (
              <div className="space-y-2">
                <p className={label}>Testar</p>
                <audio src={config.backgroundAudioUrl} controls className="w-full" />
                <button
                  onClick={() => void setAudio(null)}
                  disabled={busy}
                  className={`${btn} w-full bg-[#c62828] text-white hover:bg-[#a31f1f]`}
                >
                  <Trash2 size={15} /> Remover áudio global
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "relogio" ? (
          <div className="space-y-4">
            <div className="rounded-[8px] border border-[#d9c88a] bg-[#fff8e1] px-3 py-3">
              <p className="text-[13px] leading-[18px] text-[#5d4b00]">
                <b>Modo atual:</b>{" "}
                {config.timeMode === "real"
                  ? "Horário real de Brasília (padrão)"
                  : config.clockFrozen
                    ? "Congelado em uma data/hora"
                    : "Personalizado (avançando)"}
              </p>
            </div>

            {config.timeMode === "custom" && config.customTime ? (
              <div className="rounded-[8px] bg-[#f1f6ff] px-3 py-3">
                <p className="text-[12px] leading-[17px] text-[#2a4a7a]">
                  Mostrando agora:{" "}
                  <b>
                    {new Date(config.customTime).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </b>
                </p>
              </div>
            ) : null}

            <div>
              <label className={label}>Escolher data e hora</label>
              <input
                type="datetime-local"
                step="1"
                className={input}
                value={customDateTime}
                onChange={(event) => {
                  setCustomDateTime(event.target.value);
                  setIsCustomTimeDirty(true);
                }}
              />
              <p className="mt-1 text-[11px] leading-[15px] text-[#888]">
                O relógio vai mostrar essa data/hora e continuar avançando em tempo real.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={applyCustomTime}
                disabled={busy}
                className={`${btn} bg-[#1c1c1c] py-[11px] text-[13px] text-white hover:bg-black`}
              >
                <Clock size={15} /> Definir
              </button>
              <button
                onClick={backToRealClock}
                disabled={busy}
                className={`${btn} border border-[#ccc] bg-white py-[11px] text-[13px] text-[#555] hover:bg-[#f0f0f0]`}
              >
                <RotateCcw size={15} /> Voltar ao real
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-3 py-3">
              <div className="flex items-center gap-2 text-[13px] text-[#333]">
                <Play size={15} />
                <b>Congelar relógio</b>
              </div>
              <button
                onClick={() => void toggleFrozen(!config.clockFrozen)}
                disabled={busy || config.timeMode !== "custom"}
                className={`relative h-6 w-11 rounded-full transition ${
                  config.clockFrozen ? "bg-[#1c1c1c]" : "bg-[#ccc]"
                } ${config.timeMode !== "custom" ? "cursor-not-allowed opacity-40" : ""}`}
                aria-label="Congelar relógio"
              >
                <span
                  className={`absolute top-[2px] h-5 w-5 rounded-full bg-white shadow transition-all ${
                    config.clockFrozen ? "left-[22px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] leading-[15px] text-[#999]">
              Dica: ative "Congelar" para travar o relógio em uma data/hora específica
              (ótimo para contagens regressivas, vídeos, simulações).
            </p>
          </div>
        ) : null}

        {tab === "tela" ? (
          <div className="space-y-4">
            <button
              onClick={onToggleEditMode}
              className={`${btn} w-full py-[11px] text-[13px] ${
                editMode
                  ? "bg-[#1b5e20] text-white hover:bg-[#134a18]"
                  : "border border-[#222] bg-white text-[#222] hover:bg-[#f2f2f2]"
              }`}
            >
              <Move size={16} />
              {editMode ? "Modo arrastar ATIVO" : "Ativar modo arrastar"}
            </button>

            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setComposer("text");
                  setComposerUrl("");
                }}
                className={`${btn} flex-col gap-1 border border-[#ddd] bg-[#fafafa] py-3 text-[#333] hover:bg-[#f0f0f0]`}
              >
                <Type size={17} /> Texto
              </button>
              <button
                onClick={() => {
                  setComposer("image");
                  setComposerUrl("");
                }}
                className={`${btn} flex-col gap-1 border border-[#ddd] bg-[#fafafa] py-3 text-[#333] hover:bg-[#f0f0f0]`}
              >
                <ImageIcon size={17} /> Imagem
              </button>
              <button
                onClick={() => {
                  setComposer("video");
                  setComposerUrl("");
                }}
                className={`${btn} flex-col gap-1 border border-[#ddd] bg-[#fafafa] py-3 text-[#333] hover:bg-[#f0f0f0]`}
              >
                <VideoIcon size={17} /> Vídeo
              </button>
              <button
                onClick={() => {
                  setComposer("audio");
                  setComposerUrl("");
                }}
                className={`${btn} flex-col gap-1 border border-[#ddd] bg-[#fafafa] py-3 text-[#333] hover:bg-[#f0f0f0]`}
              >
                <Music size={17} /> Áudio
              </button>
            </div>

            {composer ? (
              <div className="space-y-2 rounded-[8px] border border-[#222] bg-[#fbfbfb] p-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#555]">
                  Novo{" "}
                  {composer === "text"
                    ? "texto"
                    : composer === "image"
                      ? "imagem"
                      : composer === "video"
                        ? "vídeo"
                        : "áudio"}
                </p>

                <textarea
                  className={`${input} min-h-[62px] resize-y`}
                  placeholder={
                    composer === "text" ? "Escreva o texto..." : "Cole a URL aqui..."
                  }
                  value={composerUrl}
                  onChange={(event) => setComposerUrl(event.target.value)}
                />

                {composer !== "text" ? (
                  <>
                    <input
                      ref={composerInput}
                      type="file"
                      accept={
                        composer === "image"
                          ? "image/*"
                          : composer === "video"
                            ? "video/*"
                            : "audio/*"
                      }
                      className="hidden"
                      onChange={(event) => {
                        void handleComposerFile(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => composerInput.current?.click()}
                      disabled={busy}
                      className={`${btn} w-full border border-dashed border-[#999] bg-white py-2 text-[#333] hover:bg-[#f0f0f0]`}
                    >
                      <Upload size={15} /> Enviar arquivo
                    </button>
                  </>
                ) : null}

                <div className="flex gap-2">
                  <button
                    onClick={addComposerBlock}
                    disabled={busy}
                    className={`${btn} flex-1 bg-[#1c1c1c] text-white hover:bg-black`}
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                  <button
                    onClick={() => setComposer(null)}
                    className={`${btn} border border-[#ccc] bg-white text-[#555] hover:bg-[#f2f2f2]`}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#555]">
                Elementos na tela ({blocks.length})
              </p>

              {blocks.length === 0 ? (
                <p className="rounded-[8px] bg-[#f7f7f7] px-3 py-4 text-center text-[13px] text-[#888]">
                  Nenhum elemento ainda. Use os botões acima.
                </p>
              ) : null}

              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="space-y-2 rounded-[8px] border border-[#e0e0e0] bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-[6px] text-[12px] font-bold uppercase tracking-wide text-[#666]">
                      {block.type === "text" ? <Type size={13} /> : null}
                      {block.type === "image" ? <ImageIcon size={13} /> : null}
                      {block.type === "video" ? <VideoIcon size={13} /> : null}
                      {block.type === "audio" ? <Music size={13} /> : null}
                      #{block.id} · {Math.round(block.x)}% / {Math.round(block.y)}%
                    </span>
                    <button
                      onClick={() => onDeleteBlock(block.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#fdeaea] text-[#c62828] transition hover:bg-[#f9d4d4]"
                      aria-label="Excluir elemento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {block.type === "text" ? (
                    <textarea
                      className={`${input} min-h-[52px] resize-y`}
                      value={block.content}
                      onChange={(event) =>
                        onPatchBlock(block.id, { content: event.target.value })
                      }
                    />
                  ) : null}

                  {block.type === "image" ? (
                    <img
                      src={block.content}
                      alt="elemento"
                      className="max-h-[90px] w-full rounded-[6px] border border-[#eee] object-contain"
                    />
                  ) : null}

                  {block.type === "video" ? (
                    <video
                      src={block.content}
                      controls
                      muted
                      className="max-h-[120px] w-full rounded-[6px] border border-[#eee] object-contain"
                    />
                  ) : null}

                  {block.type === "audio" ? (
                    <audio src={block.content} controls className="w-full" />
                  ) : null}

                  {block.type === "text" ? (
                    <label className="block text-[12px] text-[#666]">
                      Tamanho da fonte: {block.fontSize}px
                      <input
                        type="range"
                        min={10}
                        max={90}
                        value={block.fontSize}
                        onChange={(event) =>
                          onPatchBlock(block.id, {
                            fontSize: Number(event.target.value),
                          })
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                  ) : (
                    <label className="block text-[12px] text-[#666]">
                      Largura: {block.width}px
                      <input
                        type="range"
                        min={60}
                        max={700}
                        value={block.width}
                        onChange={(event) =>
                          onPatchBlock(block.id, { width: Number(event.target.value) })
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between gap-2 border-t border-[#e2e2e2] bg-[#fafafa] px-4 py-3">
        <button
          onClick={() => void onReset()}
          disabled={busy}
          className={`${btn} border border-[#ccc] bg-white text-[12px] text-[#777] hover:bg-[#f0f0f0]`}
        >
          <RotateCcw size={14} /> Restaurar
        </button>
        <button
          onClick={onClose}
          className={`${btn} bg-[#1c1c1c] px-4 text-[12px] text-white hover:bg-black`}
        >
          Fechar
        </button>
      </div>

      {status ? (
        <div
          className={`mx-4 mb-3 rounded-[8px] px-3 py-2 text-[12px] font-bold ${
            status.type === "ok"
              ? "bg-[#e8f5e9] text-[#1b5e20]"
              : "bg-[#fdeaea] text-[#c62828]"
          }`}
        >
          {status.msg}
        </div>
      ) : null}
    </aside>
  );
}
