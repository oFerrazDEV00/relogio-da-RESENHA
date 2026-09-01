import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks, siteConfig, type BlockRow, type SiteConfigRow } from "@/db/schema";
import { DEFAULT_CONFIG, type BlockType, type SiteState } from "@/lib/types";

export type { SiteState };

type MemoryStore = {
  config: SiteConfigRow;
  blocks: BlockRow[];
  nextBlockId: number;
};

const globalForStore = globalThis as typeof globalThis & {
  __resenhaMemoryStore?: MemoryStore;
};

const memoryStore: MemoryStore = globalForStore.__resenhaMemoryStore ?? {
  config: { ...DEFAULT_CONFIG, updatedAt: new Date() } as SiteConfigRow,
  blocks: [],
  nextBlockId: 1,
};

globalForStore.__resenhaMemoryStore = memoryStore;

async function ensureConfig(): Promise<SiteConfigRow> {
  try {
    const [row] = await db
      .select()
      .from(siteConfig)
      .where(eq(siteConfig.id, "global"));

    if (row) {
      memoryStore.config = row;
      return row;
    }

    const [created] = await db
      .insert(siteConfig)
      .values(DEFAULT_CONFIG)
      .onConflictDoNothing()
      .returning();

    if (created) {
      memoryStore.config = created;
      return created;
    }

    const [existing] = await db
      .select()
      .from(siteConfig)
      .where(eq(siteConfig.id, "global"));

    if (existing) {
      memoryStore.config = existing;
      return existing;
    }
  } catch {
    // Banco não acessível, usa memória
  }

  return memoryStore.config;
}

export async function getState(): Promise<SiteState> {
  try {
    const config = await ensureConfig();
    const items = await db.select().from(blocks).orderBy(asc(blocks.id));
    memoryStore.blocks = items;
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
  } catch {
    // Fallback para memória em caso de banco offline
    const cfg = memoryStore.config;
    return {
      config: {
        id: cfg.id,
        title: cfg.title,
        subtitle: cfg.subtitle,
        note: cfg.note,
        footerLeft: cfg.footerLeft,
        footerRight: cfg.footerRight,
        backgroundUrl: cfg.backgroundUrl,
        backgroundVideoUrl: cfg.backgroundVideoUrl,
        backgroundAudioUrl: cfg.backgroundAudioUrl,
        timeMode: (cfg.timeMode as "real" | "custom") ?? "real",
        customTime: cfg.customTime,
        customTimeBase: cfg.customTimeBase,
        clockFrozen: cfg.clockFrozen ?? false,
      },
      blocks: memoryStore.blocks
        .filter((b) => b.active)
        .map((b) => ({ ...b, type: b.type as BlockType })),
      updatedAt: (cfg.updatedAt ?? new Date()).toISOString(),
    };
  }
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
  memoryStore.config = {
    ...memoryStore.config,
    ...patch,
    updatedAt: new Date(),
  };

  try {
    await ensureConfig();
    const [row] = await db
      .update(siteConfig)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(siteConfig.id, "global"))
      .returning();
    if (row) {
      memoryStore.config = row;
      return row;
    }
  } catch {
    // Continua com memoryStore
  }

  return memoryStore.config;
}

export async function resetConfig() {
  memoryStore.config = { ...DEFAULT_CONFIG, updatedAt: new Date() } as SiteConfigRow;
  memoryStore.blocks = [];

  try {
    await ensureConfig();
    await db
      .update(siteConfig)
      .set({ ...DEFAULT_CONFIG, updatedAt: new Date() })
      .where(eq(siteConfig.id, "global"));
    await db.delete(blocks);
  } catch {
    // Continua com memoryStore
  }
}

export async function getBlock(id: number): Promise<BlockRow | null> {
  try {
    const [row] = await db
      .select()
      .from(blocks)
      .where(eq(blocks.id, id))
      .limit(1);
    if (row) return row;
  } catch {
    // fallback memória
  }
  return memoryStore.blocks.find((b) => b.id === id) ?? null;
}

export async function createBlock(values: {
  type: string;
  content: string;
  x?: number;
  y?: number;
  width?: number;
  fontSize?: number;
  color?: string;
}): Promise<BlockRow> {
  const newMemoryBlock: BlockRow = {
    id: memoryStore.nextBlockId++,
    type: values.type,
    content: values.content,
    x: values.x ?? 50,
    y: values.y ?? 60,
    width: values.width ?? 220,
    fontSize: values.fontSize ?? 22,
    color: values.color ?? "#222222",
    active: true,
    createdAt: new Date(),
  };

  try {
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

    if (row) {
      memoryStore.blocks.push(row);
      return row;
    }
  } catch {
    // fallback para memória
  }

  memoryStore.blocks.push(newMemoryBlock);
  return newMemoryBlock;
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
  const idx = memoryStore.blocks.findIndex((b) => b.id === id);
  if (idx !== -1) {
    memoryStore.blocks[idx] = {
      ...memoryStore.blocks[idx],
      ...values,
    };
  }

  try {
    const [row] = await db
      .update(blocks)
      .set(values)
      .where(eq(blocks.id, id))
      .returning();

    if (row) {
      if (idx !== -1) memoryStore.blocks[idx] = row;
      return row;
    }
  } catch {
    // fallback memória
  }

  return idx !== -1 ? memoryStore.blocks[idx] : null;
}

export async function deleteBlock(id: number): Promise<boolean> {
  const prevLen = memoryStore.blocks.length;
  memoryStore.blocks = memoryStore.blocks.filter((b) => b.id !== id);

  try {
    const [existing] = await db
      .select({ id: blocks.id })
      .from(blocks)
      .where(eq(blocks.id, id))
      .limit(1);

    if (existing) {
      await db.delete(blocks).where(eq(blocks.id, id));
      return true;
    }
  } catch {
    // fallback memória
  }

  return memoryStore.blocks.length < prevLen;
}
