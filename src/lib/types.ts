export type TimeMode = "real" | "custom";

export type SiteConfig = {
  id: string;
  title: string;
  subtitle: string;
  note: string;
  footerLeft: string;
  footerRight: string;
  backgroundUrl: string | null;
  backgroundVideoUrl: string | null;
  backgroundAudioUrl: string | null;
  timeMode: TimeMode;
  customTime: string | null;
  customTimeBase: string | null;
  clockFrozen: boolean;
};

export type BlockType = "text" | "image" | "audio" | "video";

export type Block = {
  id: number;
  type: BlockType;
  content: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color: string;
  active: boolean;
  createdAt: string | Date;
};

export type SiteState = {
  config: SiteConfig;
  blocks: Block[];
  updatedAt: string | null;
};

export const DEFAULT_CONFIG: SiteConfig = {
  id: "global",
  title: "Horário de Brasília",
  subtitle:
    "Acerte seu relógio com o horário de Brasília, a hora oficial do Brasil",
  note: "A hora certa é sincronizada automaticamente. Não é necessário recarregar a página.",
  footerLeft: "Brasil (UTC-3) - Horario de Brasília, a hora oficial do Brasil",
  footerRight:
    "© 2003 (v1.0) – 2026 (v5.4) HorarioDeBrasilia.org • GMT • ON • US Time • Contato",
  backgroundUrl: null,
  backgroundVideoUrl: null,
  backgroundAudioUrl: null,
  timeMode: "real",
  customTime: null,
  customTimeBase: null,
  clockFrozen: false,
};
