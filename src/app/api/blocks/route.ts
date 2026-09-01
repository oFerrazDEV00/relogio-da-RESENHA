import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks } from "@/db/schema";
import { createBlock, deleteBlock, updateBlock } from "@/lib/state";
import { isSafeMediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: string;
      content?: string;
      x?: number;
      y?: number;
      width?: number;
      fontSize?: number;
      color?: string;
    };

    if (!body.type || !["text", "image", "audio", "video"].includes(body.type)) {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }

    const content = body.content ?? "";
    if (body.type !== "text" && content.length > 0 && !isSafeMediaUrl(content)) {
      return NextResponse.json({ error: "invalid media url" }, { status: 400 });
    }

    const row = await createBlock({
      type: body.type,
      content,
      x: typeof body.x === "number" ? body.x : 50,
      y: typeof body.y === "number" ? body.y : 62,
      width: typeof body.width === "number" ? body.width : 220,
      fontSize: typeof body.fontSize === "number" ? body.fontSize : 22,
      color: typeof body.color === "string" ? body.color : "#222222",
    });

    return NextResponse.json({ ok: true, block: row });
  } catch (error) {
    console.error("create block error", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: number;
      content?: string;
      x?: number;
      y?: number;
      width?: number;
      fontSize?: number;
      color?: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    const [existing] = await db
      .select({ type: blocks.type })
      .from(blocks)
      .where(eq(blocks.id, body.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "block not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    for (const key of ["content", "x", "y", "width", "fontSize", "color"] as const) {
      const value = body[key];
      if (value !== undefined) patch[key] = value;
    }

    if (
      existing.type !== "text" &&
      typeof patch.content === "string" &&
      patch.content.length > 0 &&
      !isSafeMediaUrl(patch.content)
    ) {
      return NextResponse.json({ error: "invalid media url" }, { status: 400 });
    }

    const row = await updateBlock(body.id, patch);
    if (!row) {
      return NextResponse.json({ error: "block not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, block: row });
  } catch (error) {
    console.error("update block error", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: number };
    if (!body.id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }
    const deleted = await deleteBlock(body.id);
    if (!deleted) {
      return NextResponse.json({ error: "block not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("delete block error", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
