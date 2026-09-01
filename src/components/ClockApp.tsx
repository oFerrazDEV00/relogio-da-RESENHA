"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Move, Play, Settings2, Volume2 } from "lucide-react";
import AdminPanel from "@/components/AdminPanel";
import LoginBox from "@/components/LoginBox";
import { isSafeMediaUrl } from "@/lib/media";
import type { Block, BlockType, SiteConfig, SiteState } from "@/lib/types";

const TZ = "America/Sao_Paulo";
const AUTH_KEY = "resenha_auth";

const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Áudio global com fallback para o bloqueio de autoplay dos navegadores. */
function GlobalAudio({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setBlocked(false);
    el.volume = 0.55;

    const tryPlay = () => {
      el.play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    };
    tryPlay();

    const onFirstInteraction = () => tryPlay();
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, [src]);

  return (
    <>
      <audio ref={ref} src={src} loop hidden />
      {blocked ? (
        <button
          onClick={() => ref.current?.play().catch(() => {})}
          className="fixed bottom-4 left-4 z-[85] flex items-center gap-2 rounded-full bg-[#1c1c1c] px-4 py-[10px] text-[13px] font-bold text-white shadow-lg"
        >
          <Volume2 size={16} /> Ativar áudio
        </button>
      ) : null}
    </>
  );
}

function GlobalVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setBlocked(false);

    const tryPlay = () => {
      el.volume = 0;
      el.muted = true;
      el
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    };
    tryPlay();

    const onFirstInteraction = () => tryPlay();
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, [src]);

  return (
    <>
      <video
        ref={ref}
        src={src}
        loop
        muted
        playsInline
        className="fixed inset-0 z-[1] h-full w-full object-cover"
      />
      {blocked ? (
        <button
          onClick={() => ref.current?.play().catch(() => {})}
          className="fixed bottom-4 left-4 z-[85] flex items-center gap-2 rounded-full bg-[#1c1c1c] px-4 py-[10px] text-[13px] font-bold text-white shadow-lg"
        >
          <Play size={16} /> Ativar vídeo
        </button>
      ) : null}
    </>
  );
}

/**
 * Calcula a data/hora efetiva a ser exibida, levando em conta o modo customizado.
 * - "real": horário real do fuso de Brasília.
 * - "custom" + frozen: sempre a data/hora customizada.
 * - "custom" + não frozen: customTime avança junto com o tempo real decorrido desde a base.
 */
function getEffectiveNow(config: SiteConfig, realNow: Date): Date {
  if (config.timeMode !== "custom" || !config.customTime) {
    return realNow;
  }
  const custom = new Date(config.customTime);
  if (Number.isNaN(custom.getTime())) return realNow;
  if (config.clockFrozen) return custom;
  const base = config.customTimeBase ? new Date(config.customTimeBase) : realNow;
  if (Number.isNaN(base.getTime())) return custom;
  const elapsedMs = realNow.getTime() - base.getTime();
  return new Date(custom.getTime() + elapsedMs);
}

export default function ClockApp({ initial }: { initial: SiteState }) {
  const [config, setConfig] = useState<SiteConfig>(initial.config);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  // inicializa com a data atual para evitar flash "--:--:--" no primeiro render
  const [now, setNow] = useState<Date>(new Date());

  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [focusedBlock, setFocusedBlock] = useState<number | null>(null);

  const blocksRef = useRef(blocks);
  const layerRef = useRef<HTMLDivElement>(null);
  const patchTimers = useRef<Record<number, number>>({});
  const focusedBlockRef = useRef<number | null>(null);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    focusedBlockRef.current = focusedBlock;
  }, [focusedBlock]);

  /* ---------- relógio ---------- */
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /* ---------- autenticação + detecção de mobile ---------- */
  useEffect(() => {
    try {
      setAuthed(window.localStorage.getItem(AUTH_KEY) === "1");
    } catch {
      /* storage indisponível */
    }
    setAuthChecked(true);

    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  /* ---------- sincronização global (todos os dispositivos) ---------- */
  const sync = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as SiteState;
      setConfig(data.config);
      setBlocks((previous) =>
        data.blocks.map((incoming) => {
          const current = previous.find((item) => item.id === incoming.id);
          if (current && current.id === focusedBlockRef.current) {
            // preserva tudo que o usuário está editando localmente
            return {
              ...incoming,
              content: current.content,
              x: current.x,
              y: current.y,
              width: current.width,
              fontSize: current.fontSize,
              color: current.color,
            };
          }
          return incoming;
        }),
      );
    } catch {
      /* silencioso: tenta de novo no próximo tick */
    }
  }, []);

  useEffect(() => {
    // sync imediato ao montar + refresh periódico
    void sync();
    const timer = window.setInterval(() => void sync(), 4000);
    return () => window.clearInterval(timer);
  }, [sync]);

  /* ---------- ações do painel ---------- */
  const saveConfig = useCallback(async (patch: Partial<SiteConfig>) => {
    const response = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patch }),
    });
    if (!response.ok) {
      let message = "Erro ao salvar.";
      try {
        const data = await response.json();
        if (typeof data.error === "string") message = data.error;
      } catch {
        /* ignora */
      }
      throw new Error(message);
    }
    setConfig((previous) => ({ ...previous, ...patch }));
    await sync();
  }, [sync]);

  const createBlock = useCallback(
    async (type: BlockType, content: string) => {
      const y = 24 + Math.round(Math.random() * 46);
      const x = 25 + Math.round(Math.random() * 50);
      const width =
        type === "text" ? 320 : type === "image" ? 260 : type === "video" ? 320 : 260;
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, x, y, width }),
      });
      if (!response.ok) {
        let message = "Erro ao criar elemento.";
        try {
          const errData = (await response.json()) as { error?: string };
          if (typeof errData.error === "string") message = errData.error;
        } catch {
          /* ignora */
        }
        throw new Error(message);
      }
      const data = (await response.json()) as { ok?: boolean; block?: Block };
      if (data.block) {
        setBlocks((previous) => [...previous.filter((b) => b.id !== data.block!.id), data.block!]);
      }
      await sync();
      setEditMode(true);
    },
    [sync],
  );

  const focusClearTimer = useRef<number>(0);

  const persistBlock = useCallback((id: number, patch: Partial<Block>) => {
    window.clearTimeout(patchTimers.current[id]);
    patchTimers.current[id] = window.setTimeout(async () => {
      try {
        await fetch("/api/blocks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...patch }),
        });
      } finally {
        // Adia a limpeza do focusedBlock para não competir com edições rápidas.
        // Se o usuário fizer outra edição antes do timer, ele é reiniciado.
        window.clearTimeout(focusClearTimer.current);
        focusClearTimer.current = window.setTimeout(() => {
          setFocusedBlock((current) => (current === id ? null : current));
        }, 2000);
      }
    }, 500);
  }, []);

  const patchBlock = useCallback(
    (id: number, patch: Partial<Block>) => {
      // Cancela qualquer timer de limpeza de foco — o usuário ainda está editando
      window.clearTimeout(focusClearTimer.current);
      setBlocks((previous) =>
        previous.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
      persistBlock(id, patch);
    },
    [persistBlock],
  );

  const removeBlock = useCallback(async (id: number) => {
    setBlocks((previous) => previous.filter((item) => item.id !== id));
    await fetch("/api/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }, []);

  const resetAll = useCallback(async () => {
    if (!window.confirm("Restaurar os textos padrão e apagar todos os elementos?")) {
      return;
    }
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    await sync();
  }, [sync]);

  const handleLoginSuccess = () => {
    try {
      window.localStorage.setItem(AUTH_KEY, "1");
    } catch {
      /* storage indisponível */
    }
    setAuthed(true);
    setShowLogin(false);
    setPanelOpen(true);
  };

  /* ---------- arrastar elementos ---------- */
  const startDrag = (event: React.PointerEvent, block: Block) => {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();

    // marca o bloco como "em edição" para o sync não sobrescrever durante o drag
    focusedBlockRef.current = block.id;

    const layer = layerRef.current;
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = block.x;
    const originY = block.y;

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
      const nextX = clamp(originX + deltaX, 3, 97);
      const nextY = clamp(originY + deltaY, 3, 97);
      setBlocks((previous) =>
        previous.map((item) =>
          item.id === block.id ? { ...item, x: nextX, y: nextY } : item,
        ),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const current = blocksRef.current.find((item) => item.id === block.id);
      if (current) {
        void fetch("/api/blocks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: current.id, x: current.x, y: current.y }),
        })
          .catch(() => {})
          .finally(() => {
            if (focusedBlockRef.current === current.id) {
              focusedBlockRef.current = null;
            }
          });
      } else {
        focusedBlockRef.current = null;
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  /* ---------- render ---------- */
  const effectiveNow = getEffectiveNow(config, now);
  const time = timeFmt.format(effectiveNow);
  const date = capitalize(dateFmt.format(effectiveNow));
  const shortDate = shortFmt.format(effectiveNow);

  const lockedOnMobile = authChecked && isMobile === true && !authed;

  return (
    <>
      <div
        className="hb-root"
        style={{
          fontSize: "62.5%",
          fontFamily: "Arial, Helvetica, FreeSans, sans-serif",
          backgroundColor: "#e6e6e6",
          color: "#666",
          minHeight: "100vh",
          padding: "3% 0",
          backgroundImage:
            config.backgroundVideoUrl ||
            !config.backgroundUrl ||
            !isSafeMediaUrl(config.backgroundUrl)
              ? undefined
              : `url(${JSON.stringify(config.backgroundUrl)})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          ...(config.backgroundVideoUrl && isSafeMediaUrl(config.backgroundVideoUrl)
            ? { backgroundColor: "#000" }
            : {}),
        }}
      >
        <div
          id="wrapper"
          style={{ width: "100%", maxWidth: "760px", margin: "0 auto" }}
        >
          <div
            id="main"
            style={{
              width: "90%",
              margin: "0 auto",
              textAlign: "center",
              border: "1px solid silver",
              borderRadius: "10px",
              backgroundColor:
                config.backgroundUrl || config.backgroundVideoUrl
                  ? "rgba(255,255,255,0.9)"
                  : "#ffffff",
              overflow: "hidden",
            }}
          >
            <div
              id="header"
              style={{ borderBottom: "1px solid silver", padding: "10px 0 6px" }}
            >
              <h1
                style={{
                  fontSize: "clamp(2.1em, 5vw, 4em)",
                  fontWeight: 700,
                  color: "#222",
                  letterSpacing: "-0.045em",
                  lineHeight: 1.15,
                  paddingBottom: "0.2em",
                  margin: 0,
                }}
              >
                {config.title}
              </h1>
              <h2
                style={{
                  fontSize: "1.4em",
                  lineHeight: "18px",
                  fontWeight: 400,
                  color: "#666",
                  margin: 0,
                }}
              >
                {config.subtitle}
              </h2>
            </div>

            <div id="content" style={{ padding: "0 10px" }}>
              <h3
                id="dia-topo"
                style={{
                  fontSize: "clamp(1.4em, 3.2vw, 2.5em)",
                  fontWeight: 700,
                  color: "#222",
                  letterSpacing: "-0.03em",
                  margin: "20px 0 0",
                }}
              >
                {date}
              </h3>

              <p
                id="relogio"
                style={{
                  fontSize: "clamp(3.4em, 17vw, 15.33em)",
                  fontWeight: 700,
                  lineHeight: "125%",
                  color: "#222",
                  backgroundColor: "#e6e6e6",
                  border: "1px solid silver",
                  textAlign: "center",
                  margin: "20px 0 0",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.03em",
                }}
              >
                {time}
              </p>

              <p
                id="automatico"
                style={{
                  fontSize: "1.4em",
                  lineHeight: "18px",
                  color: "#666",
                  margin: 0,
                  padding: "20px 0 50px",
                }}
              >
                {config.note}
              </p>
            </div>

            <div
              id="footer"
              style={{ borderTop: "1px solid silver", padding: "15px 0 25px" }}
            >
              <div
                id="footer2"
                style={{ borderTop: "1px solid silver", paddingTop: "15px" }}
              >
                <p style={{ fontSize: "1.4em", lineHeight: "18px", margin: "0 0 5px" }}>
                  {config.footerLeft}
                  <span> • </span>
                  <span id="dia-rodape">{shortDate}</span>
                </p>
                <p style={{ fontSize: "1.4em", lineHeight: "18px", margin: 0 }}>
                  {config.footerRight}
                </p>
                <p style={{ fontSize: "1.4em", lineHeight: "18px", margin: "12px 0 0" }}>
                  <a
                    href="https://www.rmg.co.uk/royal-observatory"
                    target="_blank"
                    rel="noopener"
                    style={{ color: "navy" }}
                  >
                    GMT
                  </a>
                  <span> • </span>
                  <a
                    href="https://www.gov.br/observatorio/pt-br"
                    target="_blank"
                    rel="noopener"
                    style={{ color: "navy" }}
                  >
                    ON
                  </a>
                  <span> • </span>
                  <a
                    href="https://www.time.gov/"
                    target="_blank"
                    rel="noopener"
                    style={{ color: "navy" }}
                  >
                    US Time
                  </a>
                  <span> • </span>
                  <button
                    onClick={() => setShowLogin(true)}
                    style={{
                      color: "navy",
                      background: "none",
                      border: "none",
                      padding: 0,
                      font: "inherit",
                      cursor: "pointer",
                      textDecoration: "none",
                    }}
                    title="Painel Resenha"
                  >
                    Resenha
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* elementos soltos na tela */}
      <div
        ref={layerRef}
        className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            onPointerDown={(event) => startDrag(event, block)}
            className="pointer-events-auto absolute"
            style={{
              left: `${block.x}%`,
              top: `${block.y}%`,
              transform: "translate(-50%, -50%)",
              maxWidth: "92vw",
              cursor: editMode ? "grab" : "default",
              outline: editMode ? "2px dashed #1c1c1c" : "none",
              outlineOffset: "6px",
              borderRadius: "6px",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            {block.type === "text" ? (
              <div
                style={{
                  fontSize: `${block.fontSize}px`,
                  color: block.color,
                  fontWeight: 700,
                  textAlign: "center",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.25,
                  textShadow: "0 2px 10px rgba(255,255,255,0.85)",
                  padding: "4px 8px",
                }}
              >
                {block.content}
              </div>
            ) : null}

            {block.type === "image" && isSafeMediaUrl(block.content) ? (
              <img
                src={block.content}
                alt=""
                draggable={false}
                style={{
                  width: `${block.width}px`,
                  maxWidth: "90vw",
                  borderRadius: "8px",
                  boxShadow: "0 8px 26px rgba(0,0,0,0.28)",
                }}
              />
            ) : null}

            {block.type === "video" && isSafeMediaUrl(block.content) ? (
              <video
                src={block.content}
                controls
                playsInline
                autoPlay
                loop
                muted
                draggable={false}
                style={{
                  width: `${block.width}px`,
                  maxWidth: "90vw",
                  borderRadius: "8px",
                  boxShadow: "0 8px 26px rgba(0,0,0,0.28)",
                  display: "block",
                }}
              />
            ) : null}

            {block.type === "audio" && isSafeMediaUrl(block.content) ? (
              <div
                style={{
                  width: `${block.width}px`,
                  maxWidth: "90vw",
                  background: "rgba(255,255,255,0.94)",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "8px",
                  boxShadow: "0 8px 26px rgba(0,0,0,0.22)",
                }}
              >
                <audio src={block.content} controls style={{ width: "100%" }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {config.backgroundVideoUrl && isSafeMediaUrl(config.backgroundVideoUrl) ? (
        <GlobalVideo src={config.backgroundVideoUrl} />
      ) : null}

      {config.backgroundAudioUrl && isSafeMediaUrl(config.backgroundAudioUrl) ? (
        <GlobalAudio src={config.backgroundAudioUrl} />
      ) : null}

      {/* botão para reabrir o painel */}
      {authed && !panelOpen && !editMode ? (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-4 right-4 z-[85] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1c1c1c] text-white shadow-[0_6px_22px_rgba(0,0,0,0.35)] transition hover:scale-105"
          aria-label="Abrir Painel Resenha"
        >
          <Settings2 size={22} />
        </button>
      ) : null}

      {/* modo arrastar ativo com painel fechado */}
      {authed && !panelOpen && editMode ? (
        <div className="fixed bottom-4 left-1/2 z-[85] flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#1b5e20] px-4 py-[10px] text-[13px] font-bold text-white shadow-[0_6px_22px_rgba(0,0,0,0.35)]">
          <Move size={16} />
          Arraste os elementos
          <button
            onClick={() => setEditMode(false)}
            className="rounded-full bg-white px-3 py-[5px] text-[12px] font-bold text-[#1b5e20]"
          >
            Concluir
          </button>
        </div>
      ) : null}

      {/* gate mobile */}
      {lockedOnMobile ? (
        <div className="fixed inset-0 z-[110]">
          <LoginBox variant="mobile" onSuccess={handleLoginSuccess} />
        </div>
      ) : null}

      {/* login via desktop */}
      {showLogin ? (
        <LoginBox
          variant="modal"
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLogin(false)}
        />
      ) : null}

      {panelOpen && authed ? (
        <AdminPanel
          config={config}
          blocks={blocks}
          editMode={editMode}
          onToggleEditMode={() => setEditMode((value) => !value)}
          onClose={() => setPanelOpen(false)}
          onSaveConfig={saveConfig}
          onCreateBlock={createBlock}
          onPatchBlock={(id, patch) => {
            // marca o bloco como "em edição" para qualquer mudança,
            // assim o sync não sobrescreve nada que o usuário esteja ajustando
            setFocusedBlock(id);
            patchBlock(id, patch);
          }}
          onDeleteBlock={(id) => void removeBlock(id)}
          onReset={resetAll}
        />
      ) : null}
    </>
  );
}
