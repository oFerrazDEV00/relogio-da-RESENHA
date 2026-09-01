import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks, siteConfig, type BlockRow, type SiteConfigRow } from "@/db/schema";
import { DEFAULT_CONFIG, type BlockType, type SiteState } from "@/lib/types";

export type { SiteState };

async function ensureConfig(): Promise<SiteConfigRow> {
  const [row] = await db
    .select()
    .from(siteConfig)
    .where(eq(siteConfig.id, "global"));

  if (row) return row;

  const [created] = await db
    .insert(siteConfig)
    .values(DEFAULT_CONFIG)
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  // race condition: outra request criou entre o SELECT e o INSERT
  const [existing] = await db
    .select()
    .from(siteConfig)
    .where(eq(siteConfig.id, "global"));

  if (existing) return existing;

  // fallback (nunca deveria chegar aqui)
  return { ...DEFAULT_CONFIG, updatedAt: new Date() } as SiteConfigRow;
}

export async function getState(): Promise<SiteState> {
  const config = await ensureConfig();
  const items = await db.select().from(blocks).orderBy(asc(blocks.id));
  return {
    config: {
      id: config.id,
      title: config.title,
      subtitle: config.subtitle,
      note: config.note,
      footerLeft: config.footerLeft,
      footerRight: config.footerRight,
      backgroundUrl: config.backgroundUrl,
      backgroundVideoUrl: config.backgroundVideoUrl,
      backgroundAudioUrl: config.backgroundAudioUrl,
      timeMode: (config.timeMode as "real" | "custom") ?? "real",
      customTime: config.customTime,
      customTimeBase: config.customTimeBase,
      clockFrozen: config.clockFrozen ?? false,
    },
    blocks: items
      .filter((b) => b.active)
      .map((b) => ({ ...b, type: b.type as BlockType })),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export type ConfigPatch = Partial<
  Pick<
    SiteConfigRow,
    | "title"
    | "subtitle"
    | "note"
    | "footerLeft"
    | "footerRight"
    | "backgroundUrl"
    | "backgroundVideoUrl"
    | "backgroundAudioUrl"
    | "timeMode"
    | "customTime"
    | "customTimeBase"
    | "clockFrozen"
  >
>;

export async function updateConfig(patch: ConfigPatch) {
  await ensureConfig();
  const [row] = await db
    .update(siteConfig)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(siteConfig.id, "global"))
    .returning();
  return row;
}

export async function resetConfig() {
  await ensureConfig();
  await db
    .update(siteConfig)
    .set({ ...DEFAULT_CONFIG, updatedAt: new Date() })
    .where(eq(siteConfig.id, "global"));
  await db.delete(blocks);
}

export async function createBlock(values: {
  type: string;
  content: string;
  x?: number;
  y?: number;
  width?: number;
  fontSize?: number;
  color?: string;
}) {
  const [row] = await db
    .insert(blocks)
    .values({
      type: values.type,
      content: values.content,
      x: values.x ?? 50,
      y: values.y ?? 60,
      width: values.width ?? 220,
      fontSize: values.fontSize ?? 22,
      color: values.color ?? "#222222",
    })
    .returning();
  return row;
}

export async function updateBlock(
  id: number,
  values: Partial<{
    type: string;
    content: string;
    x: number;
    y: number;
    width: number;
    fontSize: number;
    color: string;
  }>,
): Promise<BlockRow | null> {
  const [row] = await db
    .update(blocks)
    .set(values)
    .where(eq(blocks.id, id))
    .returning();
  return row ?? null;
}

export async function deleteBlock(id: number): Promise<boolean> {
  const [existing] = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(eq(blocks.id, id))
    .limit(1);
  if (!existing) return false;
  await db.delete(blocks).where(eq(blocks.id, id));
  return true;
}
