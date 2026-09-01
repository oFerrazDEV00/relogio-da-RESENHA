import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Configuração global do site (uma única linha com id = "global").
 * Guarda todos os textos editáveis da página + a imagem/áudio globais.
 */
export const siteConfig = pgTable("site_config", {
  id: varchar("id", { length: 20 }).primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  note: text("note").notNull(),
  footerLeft: text("footer_left").notNull(),
  footerRight: text("footer_right").notNull(),
  backgroundUrl: text("background_url"),
  backgroundVideoUrl: text("background_video_url"),
  backgroundAudioUrl: text("background_audio_url"),
  timeMode: varchar("time_mode", { length: 10 }).notNull().default("real"),
  customTime: text("custom_time"),
  customTimeBase: text("custom_time_base"),
  clockFrozen: boolean("clock_frozen").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Elementos soltos que o "Painel Resenha" pode colocar em qualquer
 * lugar da tela: texto, imagem ou áudio.
 */
export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 10 }).notNull(),
  content: text("content").notNull().default(""),
  x: real("x").notNull().default(50),
  y: real("y").notNull().default(50),
  width: integer("width").notNull().default(220),
  fontSize: integer("font_size").notNull().default(22),
  color: varchar("color", { length: 24 }).notNull().default("#222222"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SiteConfigRow = typeof siteConfig.$inferSelect;
export type BlockRow = typeof blocks.$inferSelect;
